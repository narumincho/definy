//! 動いている definy（Rust サーバー / Cloudflare Workers）から、システムアカウントが投稿した
//! ビルトインモジュールの最新コミットを取得して `seeds/*.json` に書き出します。
//!
//! UI / MCP でシステムアカウントとしてパーツを編集 → このコマンドで seed に書き出す → コミット、
//! という流れで seed を更新するためのものです。
//!
//! ```sh
//! DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY=... \
//!   cargo run -p definy-server -- --export-seeds-from http://localhost:8080 seeds
//! ```

use std::collections::HashMap;
use std::path::Path;

use definy_event::event::{Event, EventContent, Expression, ModuleCommitEvent, ModuleSeed};
use definy_event::rpc::{
    GetContentRequest, GetContentResponse, GetEventsRequest, GetEventsResponse,
};

/// 一度に取得するイベント数の上限
const PAGE_SIZE: u64 = 500;

async fn post_connect_json<Req: serde::Serialize, Res: serde::de::DeserializeOwned>(
    client: &reqwest::Client,
    base_url: &str,
    method: &str,
    request: &Req,
) -> Result<Res, anyhow::Error> {
    let url = format!(
        "{}/definy.v1.EventService/{method}",
        base_url.trim_end_matches('/')
    );
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Connect-Protocol-Version", "1")
        .body(serde_json::to_vec(request)?)
        .send()
        .await?;
    let status = response.status();
    let body = response.bytes().await?;
    if !status.is_success() {
        anyhow::bail!(
            "{url} returned {status}: {}",
            String::from_utf8_lossy(&body)
        );
    }
    Ok(serde_json::from_slice(&body)?)
}

/// システムアカウントのモジュールコミットのうち、モジュールごとに最新のものを返します。
async fn fetch_latest_system_module_commits(
    client: &reqwest::Client,
    base_url: &str,
) -> Result<HashMap<String, Event>, anyhow::Error> {
    let system_account = crate::system_account::system_account_id();
    let mut latest: HashMap<String, Event> = HashMap::new();
    let mut offset = 0;
    loop {
        let response: GetEventsResponse = post_connect_json(
            client,
            base_url,
            "GetEvents",
            &GetEventsRequest {
                event_type: Some("module_commit".to_string()),
                limit: Some(PAGE_SIZE),
                offset: Some(offset),
            },
        )
        .await?;
        let count = response.events.len() as u64;
        for item in response.events {
            let Ok((_signature, event)) =
                definy_event::verify_and_deserialize(&item.signed_event_bytes)
            else {
                continue;
            };
            if event.account_id != system_account {
                continue;
            }
            let EventContent::ModuleCommit(commit) = &event.content else {
                continue;
            };
            let name = commit.module_name.to_string();
            if latest
                .get(&name)
                .is_none_or(|current| current.time < event.time)
            {
                latest.insert(name, event);
            }
        }
        if count < PAGE_SIZE {
            break;
        }
        offset += count;
    }
    Ok(latest)
}

/// content hash だけを持つパーツの式を CAS から取得して埋めます。
async fn hydrate_commit_expressions(
    client: &reqwest::Client,
    base_url: &str,
    commit: &mut ModuleCommitEvent,
) -> Result<(), anyhow::Error> {
    for part in &mut commit.parts {
        if part.expression.is_some() {
            continue;
        }
        let Some(content_hash) = &part.content_hash else {
            continue;
        };
        let response: GetContentResponse = post_connect_json(
            client,
            base_url,
            "GetContent",
            &GetContentRequest {
                content_hash: content_hash.to_string(),
            },
        )
        .await?;
        let item = response.item.ok_or_else(|| {
            anyhow::anyhow!(
                "content {content_hash} for part '{}' was not found",
                part.name
            )
        })?;
        let expression: Expression = serde_cbor::from_slice(&item.content_bytes)?;
        part.expression = Some(expression);
        part.content_hash = None;
    }
    Ok(())
}

/// `base_url` の definy からビルトインモジュールを取得し、`out_dir` に seed として書き出します。
///
/// システムアカウントのコミットが見つからないモジュールは、現在の seed のまま残します。
/// 書き出したモジュール名を返します。
pub async fn export_seeds_from_server(
    base_url: &str,
    out_dir: &Path,
) -> Result<Vec<String>, anyhow::Error> {
    let client = reqwest::Client::new();
    let latest = fetch_latest_system_module_commits(&client, base_url).await?;
    let account_id = crate::system_account::system_account_id();

    let mut seeds: Vec<ModuleSeed> = crate::seed::get_builtin_module_seeds().to_vec();
    let mut exported = Vec::new();
    for seed in &mut seeds {
        let Some(event) = latest.get(&*seed.module_name) else {
            continue;
        };
        let EventContent::ModuleCommit(commit) = &event.content else {
            continue;
        };
        let mut commit = commit.clone();
        hydrate_commit_expressions(&client, base_url, &mut commit).await?;
        *seed = ModuleSeed::new(
            commit.module_name,
            commit.module_description,
            commit.message,
            commit.parts,
        );
        exported.push(seed.module_name.to_string());
    }

    for seed in &seeds {
        if !exported.iter().any(|name| name == &*seed.module_name) {
            continue;
        }
        let json = crate::seed::module_seed_to_json(seed, &account_id, &seeds)?;
        std::fs::create_dir_all(out_dir)?;
        std::fs::write(out_dir.join(format!("{}.json", seed.module_name)), json)?;
    }
    Ok(exported)
}
