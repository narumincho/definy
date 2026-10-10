use std::collections::HashSet;

use base64::Engine as _;
use sha2::Digest;
use surrealdb::Surreal;
use surrealdb::engine::any::Any;
use surrealdb::types::SurrealValue;

use crate::db::{EventRecord, get_event, save_event};

pub const COMPILER_SYSTEM_KEY_SEED: [u8; 32] = *b"definy-compiler-system-key-2026\0";

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SeedEventEntry {
    pub hash_hex: String,
    pub event_type: String,
    pub time_ms: i64,
    pub event_binary_base64: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SeedContentEntry {
    pub hash: String,
    pub content_base64: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SeedBundle {
    pub events: Vec<SeedEventEntry>,
    pub contents: Vec<SeedContentEntry>,
}

#[derive(serde::Deserialize, SurrealValue)]
struct EventHashRow {
    event_binary_hash: Vec<u8>,
}

fn build_builtin_events() -> (
    definy_event::event::AccountId,
    ed25519_dalek::SigningKey,
    Vec<definy_event::event::Event>,
) {
    let signing_key = ed25519_dalek::SigningKey::from_bytes(&COMPILER_SYSTEM_KEY_SEED);
    let verifying_key = signing_key.verifying_key();
    let account_id = definy_event::event::AccountId(verifying_key);
    // Repository first commit timestamp: 2019-01-31T13:36:01+09:00 (2019-01-31T04:36:01Z)
    let first_commit_time = chrono::DateTime::from_timestamp(1548909361, 0).unwrap();

    let seeds = crate::seed::get_builtin_module_seeds(&account_id);
    let core_seed = seeds.iter().find(|s| &*s.module_name == "core").unwrap();
    let std_seed = seeds.iter().find(|s| &*s.module_name == "std").unwrap();
    let wasi_seed = seeds.iter().find(|s| &*s.module_name == "wasi").unwrap();
    let sample_seed = seeds.iter().find(|s| &*s.module_name == "sample").unwrap();

    let core_module_commit = definy_event::event::Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(1),
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
        core_module_commit,
        std_module_commit,
        sample_module_commit,
        wasi_module_commit,
    ];

    (account_id, signing_key, events)
}

/// Cloudflare Workers 等のエッジ環境向けに、組み込みシードイベントと CAS コンテンツをバンドル生成する。
pub fn build_builtin_seed_bundle() -> Result<SeedBundle, anyhow::Error> {
    let (_account_id, signing_key, events) = build_builtin_events();
    let mut seed_events = Vec::new();
    let mut seed_contents = Vec::new();
    let mut seen_content_hashes = HashSet::new();

    for event in events {
        let event_binary = definy_event::sign_and_serialize(event.clone(), &signing_key)
            .map_err(|e| anyhow::anyhow!("Failed to serialize builtin event: {:?}", e))?;
        let hash = sha2::Sha256::digest(&event_binary);
        let hash_hex = hex::encode(hash);
        let event_type = definy_event::event::EventType::from(&event.content).to_string();

        seed_events.push(SeedEventEntry {
            hash_hex,
            event_type,
            time_ms: event.time.timestamp_millis(),
            event_binary_base64: base64::engine::general_purpose::STANDARD.encode(&event_binary),
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
                            hash: hash_str,
                            content_base64: base64::engine::general_purpose::STANDARD
                                .encode(&bytes),
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
    let (account_id, signing_key, events) = build_builtin_events();
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

    // 1. Clean up outdated or unexpected events created by the definy system account
    let mut response = db
        .query("SELECT event_binary_hash FROM events WHERE account_id = $account_id")
        .bind(("account_id", account_id.0.as_bytes().to_vec()))
        .await?
        .check()?;
    let existing_rows: Vec<EventHashRow> = response.take(0)?;

    for row in existing_rows {
        let hex_hash = hex::encode(&row.event_binary_hash);
        if !valid_hashes.contains(&hex_hash) {
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
