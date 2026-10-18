use std::collections::HashSet;

use base64::Engine as _;
use sha2::Digest;

use crate::db::{DbStore, cleanup_outdated_bootstrap_events, get_event, save_event};

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

const MAX_D1_SQL_VALUE_CHUNK_LEN: usize = 80_000;

fn escape_sql_literal(value: &str) -> String {
    value.replace('\'', "''")
}

/// Cloudflare D1 (`wrangler d1 execute`) 向けに、スキーマ初期化・古いシード削除・最新シード投入を行う冪等な SQL を生成する。
/// D1 の 1 ステートメントあたり 100KB 制限および SQLite の `SQLITE_LIMIT_SQL_LENGTH` を超えないよう、
/// 80KB を超えるペイロードは `INSERT OR IGNORE` + 冪等な `UPDATE ... WHERE LENGTH(...) = offset` に分割する。
pub fn build_builtin_seed_sql() -> Result<String, anyhow::Error> {
    let bundle = build_builtin_seed_bundle()?;
    let schema_sql = include_str!("../../migrations/0001_initial_schema.sql");

    let mut sql = String::with_capacity(schema_sql.len() + bundle.contents.len() * 256 + 4096);
    sql.push_str("-- Auto-generated by definy-server --export-seed-sql\n");
    sql.push_str(schema_sql.trim());
    sql.push_str("\n\n");

    let seed_accounts: HashSet<&str> = bundle
        .events
        .iter()
        .map(|ev| ev.account_id.as_str())
        .filter(|id| !id.is_empty())
        .collect();

    if !seed_accounts.is_empty() && !bundle.events.is_empty() {
        let quoted_hashes: Vec<String> = bundle
            .events
            .iter()
            .map(|ev| format!("'{}'", escape_sql_literal(&ev.event_hash)))
            .collect();
        let in_clause = quoted_hashes.join(", ");
        for account_id in seed_accounts {
            sql.push_str(&format!(
                "DELETE FROM events WHERE account_id = '{}' AND event_hash NOT IN ({});\n",
                escape_sql_literal(account_id),
                in_clause
            ));
        }
        sql.push('\n');
    }

    for ev in &bundle.events {
        let total_len = ev.signed_event_bytes.len();
        let first_end = total_len.min(MAX_D1_SQL_VALUE_CHUNK_LEN);
        let first_chunk = &ev.signed_event_bytes[..first_end];
        let escaped_hash = escape_sql_literal(&ev.event_hash);

        sql.push_str(&format!(
            "INSERT OR IGNORE INTO events (event_hash, signed_event_bytes, account_id, event_type, created_at_rfc3339, time_ms) VALUES ('{}', '{}', '{}', '{}', '{}', {});\n",
            escaped_hash,
            escape_sql_literal(first_chunk),
            escape_sql_literal(&ev.account_id),
            escape_sql_literal(&ev.event_type),
            escape_sql_literal(&ev.created_at_rfc3339),
            ev.time_ms
        ));

        let mut offset = first_end;
        while offset < total_len {
            let next_end = (offset + MAX_D1_SQL_VALUE_CHUNK_LEN).min(total_len);
            let chunk = &ev.signed_event_bytes[offset..next_end];
            sql.push_str(&format!(
                "UPDATE events SET signed_event_bytes = signed_event_bytes || '{}' WHERE event_hash = '{}' AND LENGTH(signed_event_bytes) = {};\n",
                escape_sql_literal(chunk),
                escaped_hash,
                offset
            ));
            offset = next_end;
        }
    }
    sql.push('\n');

    for content in &bundle.contents {
        let total_len = content.content_bytes.len();
        let first_end = total_len.min(MAX_D1_SQL_VALUE_CHUNK_LEN);
        let first_chunk = &content.content_bytes[..first_end];
        let escaped_hash = escape_sql_literal(&content.content_hash);

        sql.push_str(&format!(
            "INSERT OR IGNORE INTO cas_contents (content_hash, content_bytes) VALUES ('{}', '{}');\n",
            escaped_hash,
            escape_sql_literal(first_chunk)
        ));

        let mut offset = first_end;
        while offset < total_len {
            let next_end = (offset + MAX_D1_SQL_VALUE_CHUNK_LEN).min(total_len);
            let chunk = &content.content_bytes[offset..next_end];
            sql.push_str(&format!(
                "UPDATE cas_contents SET content_bytes = content_bytes || '{}' WHERE content_hash = '{}' AND LENGTH(content_bytes) = {};\n",
                escape_sql_literal(chunk),
                escaped_hash,
                offset
            ));
            offset = next_end;
        }
    }

    Ok(sql)
}

pub async fn migrate_builtin_data(db: &DbStore) -> Result<(), anyhow::Error> {
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
    cleanup_outdated_bootstrap_events(db, account_id.0.as_bytes(), &valid_hashes).await?;

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

#[cfg(test)]
mod ui_type_check_tests {
    /// 組み込みの seed のパーツは UI の型検査 (エクスプローラーの赤い印やエディタの「件のエラー」) で
    /// エラーにならないこと. seed の誤りと UI の型検査器の誤検出の両方を検出する
    #[test]
    fn builtin_parts_have_no_ui_type_diagnostics() {
        let (_account, events) = super::build_builtin_events();
        let mut state = definy_ui::AppState::default();
        for (index, event) in events.into_iter().enumerate() {
            let hash = definy_event::EventHashId::from_bytes(format!("seed-{index}").as_bytes());
            let signature = ed25519_dalek::Signature::from_bytes(&[0u8; 64]);
            state.event_cache.insert(hash, Ok((signature, event)));
        }
        let modules = definy_ui::module_projection::collect_module_snapshots(&state);
        let mut failures = Vec::new();
        for part in definy_ui::part_projection::collect_part_snapshots(&state) {
            let Some(expression) = &part.expression else {
                continue;
            };
            let module_name = modules
                .iter()
                .find(|module| module.definition_event_hash == part.module_definition_event_hash)
                .map(|module| module.module_name.clone())
                .unwrap_or_default();
            let expected_type = part
                .part_type
                .as_ref()
                .map(definy_ui::expression_editor::part_type_to_expression_type);
            for diagnostic in definy_ui::expression_editor::collect_type_diagnostics(
                &state,
                expression,
                expected_type,
            ) {
                let path: Vec<String> = diagnostic
                    .path
                    .iter()
                    .map(|step| step.to_string())
                    .collect();
                failures.push(format!(
                    "{module_name}.{} @ {}: {}",
                    part.part_name,
                    path.join("."),
                    diagnostic.message
                ));
            }
        }
        assert!(
            failures.is_empty(),
            "type diagnostics in builtin seeds:\n{}",
            failures.join("\n")
        );
    }
}
