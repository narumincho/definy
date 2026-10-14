use std::collections::HashSet;

use base64::Engine as _;
use sha2::Digest;
use surrealdb::Surreal;
use surrealdb::engine::any::Any;
use surrealdb::types::SurrealValue;

use crate::db::{EventRecord, get_event, save_event};

/// ブートストラップ用イベントの時刻（リポジトリの最初のコミット 2019-01-31T04:36:01Z）。
///
/// seed から生成するイベントはこの時刻から数ミリ秒以内に置く。UI などから
/// システムアカウントで投稿された編集イベント（現在時刻）とはこの時刻で区別する。
pub const BOOTSTRAP_TIMESTAMP_SECONDS: i64 = 1548909361;

/// ブートストラップ用イベントとみなす時刻の幅
const BOOTSTRAP_WINDOW: chrono::Duration = chrono::Duration::seconds(1);

fn bootstrap_time() -> chrono::DateTime<chrono::Utc> {
    chrono::DateTime::from_timestamp(BOOTSTRAP_TIMESTAMP_SECONDS, 0).unwrap()
}

/// seed から生成したブートストラップ用イベントの時刻か
#[must_use]
pub fn is_bootstrap_time(time: chrono::DateTime<chrono::Utc>) -> bool {
    let start = bootstrap_time();
    time >= start && time < start + BOOTSTRAP_WINDOW
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeedEventEntry {
    pub event_hash: String,
    pub signed_event_bytes: String,
    pub account_id: String,
    pub event_type: String,
    pub created_at_rfc3339: String,
    pub time_ms: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeedContentEntry {
    pub content_hash: String,
    pub content_bytes: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeedBundle {
    pub events: Vec<SeedEventEntry>,
    pub contents: Vec<SeedContentEntry>,
}

#[derive(serde::Deserialize, SurrealValue)]
struct EventHashRow {
    event_binary_hash: Vec<u8>,
    time: chrono::DateTime<chrono::Utc>,
}

/// seed からブートストラップ用イベント（署名前）を作ります。
fn build_builtin_events() -> (
    definy_event::event::AccountId,
    Vec<definy_event::event::Event>,
) {
    let account_id = crate::system_account::system_account_id();
    let first_commit_time = bootstrap_time();

    let seeds = crate::seed::get_builtin_module_seeds();
    let definy_seed = seeds.iter().find(|s| &*s.module_name == "definy").unwrap();
    let core_seed = seeds.iter().find(|s| &*s.module_name == "core").unwrap();
    let std_seed = seeds.iter().find(|s| &*s.module_name == "std").unwrap();
    let wasi_seed = seeds.iter().find(|s| &*s.module_name == "wasi").unwrap();
    let sample_seed = seeds.iter().find(|s| &*s.module_name == "sample").unwrap();

    let definy_module_commit = definy_event::event::Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(1),
        content: definy_event::event::EventContent::ModuleCommit(
            definy_seed.to_module_commit_event(),
        ),
    };

    let core_module_commit = definy_event::event::Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(5),
        content: definy_event::event::EventContent::ModuleCommit(
            core_seed.to_module_commit_event(),
        ),
    };

    let std_module_commit = definy_event::event::Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(15),
        content: definy_event::event::EventContent::ModuleCommit(std_seed.to_module_commit_event()),
    };

    let wasi_module_commit = definy_event::event::Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(20),
        content: definy_event::event::EventContent::ModuleCommit(
            wasi_seed.to_module_commit_event(),
        ),
    };

    let sample_module_commit = definy_event::event::Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(30),
        content: definy_event::event::EventContent::ModuleCommit(
            sample_seed.to_module_commit_event(),
        ),
    };

    let events = vec![
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time,
            content: definy_event::event::EventContent::CreateAccount(
                definy_event::event::CreateAccountEvent {
                    account_name: "definy".into(),
                },
            ),
        },
        definy_module_commit,
        core_module_commit,
        std_module_commit,
        sample_module_commit,
        wasi_module_commit,
    ];

    (account_id, events)
}

/// 組み込みシステムアカウントの公開鍵 16進文字列を返します。
#[must_use]
pub fn system_account_id_hex() -> String {
    hex::encode(crate::system_account::system_account_id().0.as_bytes())
}

/// 組み込みシードイベント群を評価用イベントリスト (`VerifiedCommitEvent`) として返します。
///
/// 評価器は署名を検証しないため、秘密鍵がなくても使えるようダミー署名を付けます。
/// イベントハッシュは「署名前のイベント CBOR」から計算した擬似的な値です。
#[must_use]
pub fn build_builtin_verified_events() -> Vec<crate::self_hosted_wasm_compiler::VerifiedCommitEvent>
{
    let (_account_id, events) = build_builtin_events();
    let dummy_signature = ed25519_dalek::Signature::from_bytes(&[0u8; 64]);
    events
        .into_iter()
        .map(|event| {
            let bytes = serde_cbor::to_vec(&event).unwrap_or_default();
            let hash = definy_event::EventHashId::from_bytes(&bytes);
            (hash, Ok((dummy_signature, event)))
        })
        .collect()
}

/// Cloudflare Workers 等のエッジ環境向けに、組み込みシードイベントと CAS コンテンツをバンドル生成する。
pub fn build_builtin_seed_bundle() -> Result<SeedBundle, anyhow::Error> {
    let signing_key = crate::system_account::system_signing_key()?;
    let (_account_id, events) = build_builtin_events();
    let mut seed_events = Vec::new();
    let mut seed_contents = Vec::new();
    let mut seen_content_hashes = HashSet::new();

    for event in events {
        let event_binary = definy_event::sign_and_serialize(event.clone(), &signing_key)
            .map_err(|e| anyhow::anyhow!("Failed to serialize builtin event: {:?}", e))?;
        let item = definy_event::rpc::EventItem::from_signed_bytes(event_binary.clone())
            .map_err(|e| anyhow::anyhow!("Failed to build EventItem: {:?}", e))?;

        seed_events.push(SeedEventEntry {
            event_hash: item.event_hash,
            signed_event_bytes: base64::engine::general_purpose::STANDARD.encode(&event_binary),
            account_id: item.account_id,
            event_type: item.event_type,
            created_at_rfc3339: item.created_at_rfc3339,
            time_ms: event.time.timestamp_millis(),
        });

        if let definy_event::event::EventContent::ModuleCommit(ref mc) = event.content {
            for part in &mc.parts {
                if let Some(ref expr) = part.expression
                    && let Ok(ch) = definy_event::ContentHash::from_expression(expr)
                    && let Ok(bytes) = serde_cbor::to_vec(expr)
                {
                    let hash_str = ch.to_string();
                    if seen_content_hashes.insert(hash_str.clone()) {
                        seed_contents.push(SeedContentEntry {
                            content_hash: hash_str,
                            content_bytes: base64::engine::general_purpose::STANDARD.encode(&bytes),
                        });
                    }
                }
            }
        }
    }

    // Sort descending by time_ms to match DB `ORDER BY time DESC`
    seed_events.sort_by_key(|e| std::cmp::Reverse(e.time_ms));

    Ok(SeedBundle {
        events: seed_events,
        contents: seed_contents,
    })
}

pub async fn migrate_builtin_data(db: &Surreal<Any>) -> Result<(), anyhow::Error> {
    let Ok(signing_key) = crate::system_account::system_signing_key() else {
        println!(
            "{} is not set; skipping builtin seed bootstrap (builtin modules must already exist in the database)",
            crate::system_account::SECRET_KEY_ENV
        );
        return Ok(());
    };
    let (account_id, events) = build_builtin_events();
    let system_addr: std::net::SocketAddr = "127.0.0.1:0".parse().unwrap();

    // Prepare serialized binaries and expected hashes for all valid built-in events
    let mut valid_hashes = HashSet::new();
    let mut prepared_events = Vec::new();

    for event in events {
        let event_binary = definy_event::sign_and_serialize(event.clone(), &signing_key)
            .map_err(|e| anyhow::anyhow!("Failed to serialize builtin event: {:?}", e))?;
        let hash = sha2::Sha256::digest(&event_binary);
        let hash_hex = hex::encode(hash);
        valid_hashes.insert(hash_hex);
        prepared_events.push((event, event_binary, hash));
    }

    // 1. Clean up outdated bootstrap events created by the definy system account.
    //    UI などからシステムアカウントで投稿された編集イベント（ブートストラップ時刻以外）は残す。
    let mut response = db
        .query("SELECT event_binary_hash, time FROM events WHERE account_id = $account_id")
        .bind(("account_id", account_id.0.as_bytes().to_vec()))
        .await?
        .check()?;
    let existing_rows: Vec<EventHashRow> = response.take(0)?;

    for row in existing_rows {
        let hex_hash = hex::encode(&row.event_binary_hash);
        if is_bootstrap_time(row.time) && !valid_hashes.contains(&hex_hash) {
            println!(
                "Cleaning up outdated or unexpected builtin event: {}",
                hex_hash
            );
            let _: Option<EventRecord> = db.delete(("events", hex_hash.as_str())).await?;
        }
    }

    // 2. Insert any missing built-in events and register their contents to CAS
    for (event, event_binary, hash) in prepared_events {
        if get_event(db, &hash).await?.is_none() {
            let (signature, verified_event) =
                definy_event::verify_and_deserialize(&event_binary)
                    .map_err(|e| anyhow::anyhow!("Failed to verify builtin event: {:?}", e))?;
            save_event(&verified_event, &signature, &event_binary, system_addr, db).await?;
        }

        // Always ensure expressions of built-in module parts are stored in contents table
        if let definy_event::event::EventContent::ModuleCommit(ref mc) = event.content {
            for part in &mc.parts {
                if let Some(ref expr) = part.expression
                    && let Ok(ch) = definy_event::ContentHash::from_expression(expr)
                    && let Ok(bytes) = serde_cbor::to_vec(expr)
                {
                    let _ = crate::db::save_content(db, &ch.to_string(), &bytes).await;
                }
            }
        }
    }

    Ok(())
}
