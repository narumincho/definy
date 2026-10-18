use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use sha2::Digest;
use tokio::sync::RwLock;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EventRecord {
    pub event_binary_hash: Vec<u8>,
    pub signature: Vec<u8>,
    pub account_id: Vec<u8>,
    pub time: chrono::DateTime<chrono::Utc>,
    pub event_binary: Vec<u8>,
    pub server_receive_timestamp: chrono::DateTime<chrono::Utc>,
    pub address: String,
    pub event_type: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ContentRecord {
    pub content_hash: String,
    pub content_bytes: Vec<u8>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DeploymentRecord {
    pub machine_id: String,
    pub commit_hash: Option<String>,
    pub status: String,
    pub url: String,
    pub app_url: String,
    pub region: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub wasm_hash: Option<String>,
    #[serde(default)]
    pub provider: Option<String>,
}

#[derive(Default)]
struct DbInner {
    events: HashMap<String, EventRecord>,
    contents: HashMap<String, ContentRecord>,
    deployments: HashMap<String, DeploymentRecord>,
}

/// `definy-server` 用のインメモリストア（テスト・MCP・シード生成用）。
/// 本番およびローカルの Cloudflare Workers 環境では Cloudflare D1 (`wrangler d1`) を使用する。
#[derive(Clone, Default)]
pub struct DbStore {
    inner: Arc<RwLock<DbInner>>,
}

impl DbStore {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }
}

pub use crate::builtin_migration::migrate_builtin_data;

pub async fn init_db() -> Result<DbStore, anyhow::Error> {
    let db = DbStore::new();
    migrate_builtin_data(&db).await?;
    Ok(db)
}

pub async fn save_event(
    event: &definy_event::event::Event,
    signature: &ed25519_dalek::Signature,
    event_binary: &[u8],
    address: std::net::SocketAddr,
    db: &DbStore,
) -> Result<(), anyhow::Error> {
    let mut hasher = sha2::Sha256::new();
    hasher.update(event_binary);
    let event_binary_hash = hasher.finalize();
    let event_binary_hash_hex = hex::encode(event_binary_hash);

    let event_type = strum::IntoDiscriminant::discriminant(&event.content);

    let record = EventRecord {
        event_binary_hash: event_binary_hash.to_vec(),
        signature: signature.to_bytes().to_vec(),
        account_id: event.account_id.0.as_bytes().to_vec(),
        time: event.time,
        event_binary: event_binary.to_vec(),
        server_receive_timestamp: chrono::Utc::now(),
        address: address.to_string(),
        event_type: event_type.to_string(),
    };

    let mut guard = db.inner.write().await;
    guard.events.insert(event_binary_hash_hex, record);
    Ok(())
}

pub async fn get_events(
    db: &DbStore,
    event_type: Option<definy_event::event::EventType>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Box<[Vec<u8>]>, anyhow::Error> {
    let guard = db.inner.read().await;
    let event_type_str = event_type.map(|et| et.to_string());

    let mut records: Vec<&EventRecord> = guard
        .events
        .values()
        .filter(|r| {
            event_type_str
                .as_ref()
                .is_none_or(|expected| &r.event_type == expected)
        })
        .collect();

    records.sort_by_key(|a| std::cmp::Reverse(a.time));

    let offset = offset.unwrap_or(0);
    let iter = records.into_iter().skip(offset);
    let events: Vec<Vec<u8>> = match limit {
        Some(limit) => iter.take(limit).map(|r| r.event_binary.clone()).collect(),
        None => iter.map(|r| r.event_binary.clone()).collect(),
    };

    Ok(events.into_boxed_slice())
}

pub async fn get_event(
    db: &DbStore,
    event_binary_hash: &[u8],
) -> Result<Option<Vec<u8>>, anyhow::Error> {
    let event_binary_hash_hex = hex::encode(event_binary_hash);
    let guard = db.inner.read().await;
    Ok(guard
        .events
        .get(&event_binary_hash_hex)
        .map(|r| r.event_binary.clone()))
}

pub async fn cleanup_outdated_bootstrap_events(
    db: &DbStore,
    account_id_bytes: &[u8],
    valid_hashes: &HashSet<String>,
) -> Result<(), anyhow::Error> {
    let mut guard = db.inner.write().await;
    guard.events.retain(|hex_hash, row| {
        if row.account_id == account_id_bytes
            && crate::builtin_migration::is_bootstrap_time(row.time)
            && !valid_hashes.contains(hex_hash)
        {
            println!(
                "Cleaning up outdated or unexpected builtin event: {}",
                hex_hash
            );
            false
        } else {
            true
        }
    });
    Ok(())
}

pub async fn save_content(
    db: &DbStore,
    content_hash: &str,
    content_bytes: &[u8],
) -> Result<(), anyhow::Error> {
    let mut guard = db.inner.write().await;
    if let Some(existing) = guard.contents.get(content_hash) {
        if existing.content_bytes == content_bytes {
            return Ok(());
        }
        anyhow::bail!("Content hash collision with different bytes for '{content_hash}'");
    }
    guard.contents.insert(
        content_hash.to_string(),
        ContentRecord {
            content_hash: content_hash.to_string(),
            content_bytes: content_bytes.to_vec(),
            created_at: chrono::Utc::now(),
        },
    );
    Ok(())
}

pub async fn get_content(
    db: &DbStore,
    content_hash: &str,
) -> Result<Option<Vec<u8>>, anyhow::Error> {
    let guard = db.inner.read().await;
    Ok(guard
        .contents
        .get(content_hash)
        .map(|r| r.content_bytes.clone()))
}

pub async fn filter_missing_content_hashes(
    db: &DbStore,
    hashes: &[String],
) -> Result<Vec<String>, anyhow::Error> {
    let guard = db.inner.read().await;
    let missing = hashes
        .iter()
        .filter(|hash| !guard.contents.contains_key(hash.as_str()))
        .cloned()
        .collect();
    Ok(missing)
}

pub async fn save_deployment(db: &DbStore, record: DeploymentRecord) -> Result<(), anyhow::Error> {
    let mut guard = db.inner.write().await;
    guard.deployments.insert(record.machine_id.clone(), record);
    Ok(())
}

pub async fn get_deployments(
    db: &DbStore,
    limit: Option<usize>,
) -> Result<Vec<DeploymentRecord>, anyhow::Error> {
    let limit = limit.unwrap_or(20);
    let guard = db.inner.read().await;
    let mut records: Vec<DeploymentRecord> = guard.deployments.values().cloned().collect();
    records.sort_by_key(|a| std::cmp::Reverse(a.created_at));
    records.truncate(limit);
    Ok(records)
}

#[cfg(test)]
pub async fn get_deployment(
    db: &DbStore,
    machine_id: &str,
) -> Result<Option<DeploymentRecord>, anyhow::Error> {
    let guard = db.inner.read().await;
    Ok(guard.deployments.get(machine_id).cloned())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::system_account::DEV_SYSTEM_KEY_SEED;

    #[tokio::test]
    async fn test_save_and_get_create_account_event() {
        let db = init_db().await.unwrap();

        let secret = ed25519_dalek::SigningKey::generate(&mut rand::rngs::OsRng);
        let event = definy_event::event::Event {
            account_id: definy_event::event::AccountId(secret.verifying_key()),
            time: chrono::Utc::now(),
            content: definy_event::event::EventContent::CreateAccount(
                definy_event::event::CreateAccountEvent {
                    account_name: "test_user".into(),
                },
            ),
        };
        let event_binary = definy_event::sign_and_serialize(event.clone(), &secret).unwrap();
        let (signature, verified_event) =
            definy_event::verify_and_deserialize(&event_binary).unwrap();

        let addr = "127.0.0.1:8000".parse().unwrap();
        save_event(&verified_event, &signature, &event_binary, addr, &db)
            .await
            .unwrap();

        let events = get_events(&db, None, Some(10), Some(0)).await.unwrap();
        assert!(!events.is_empty());

        let hash = sha2::Sha256::digest(&event_binary);
        let single_event = get_event(&db, &hash).await.unwrap();
        assert_eq!(single_event, Some(event_binary));
    }

    #[tokio::test]
    async fn test_builtin_migration() {
        let db = init_db().await.unwrap();

        let events = get_events(&db, None, Some(50), Some(0)).await.unwrap();
        // 1 CreateAccount + 5 ModuleCommit (core, definy, sample, std, wasi) = 6 events
        assert_eq!(events.len(), 6);

        let mut part_names = Vec::new();
        let mut module_names = Vec::new();
        for event_binary in events.iter() {
            let (_, event) = definy_event::verify_and_deserialize(event_binary).unwrap();
            match event.content {
                definy_event::event::EventContent::ModuleCommit(module_commit) => {
                    assert!(module_commit.module_description.get("en").is_some());
                    assert!(module_commit.module_description.get("ja").is_some());
                    module_names.push(module_commit.module_name.to_string());
                    for part in &module_commit.parts {
                        part_names.push(part.name.to_string());
                    }
                }
                definy_event::event::EventContent::CreateAccount(account) => {
                    assert_eq!(account.account_name.as_ref(), "definy");
                }
                _ => {}
            }
        }

        assert!(module_names.contains(&"core".to_string()));
        assert!(module_names.contains(&"definy".to_string()));
        assert!(module_names.contains(&"sample".to_string()));
        assert!(module_names.contains(&"std".to_string()));
        assert!(module_names.contains(&"wasi".to_string()));
        assert!(part_names.contains(&"deploy".to_string()));
        assert!(part_names.contains(&"let".to_string()));
        assert!(part_names.contains(&"plus".to_string()));
        assert!(part_names.contains(&"number-literal".to_string()));
        assert!(!part_names.contains(&"if".to_string()));
        assert!(part_names.contains(&"number".to_string()));
        assert!(part_names.contains(&"string".to_string()));
        assert!(part_names.contains(&"boolean".to_string()));
        assert!(part_names.contains(&"expression".to_string()));
        assert!(part_names.contains(&"value".to_string()));
        assert!(part_names.contains(&"eval-ast".to_string()));
        assert!(part_names.contains(&"sample-ast-calc".to_string()));
        assert!(part_names.contains(&"list".to_string()));
        assert!(part_names.contains(&"equal".to_string()));
        assert!(part_names.contains(&"minus".to_string()));
        assert!(part_names.contains(&"multiply".to_string()));
        assert!(part_names.contains(&"divide".to_string()));
        assert!(part_names.contains(&"remainder".to_string()));
        assert!(part_names.contains(&"less-than".to_string()));
        assert!(part_names.contains(&"less-than-or-equal".to_string()));
        assert!(part_names.contains(&"greater-than".to_string()));
        assert!(part_names.contains(&"greater-than-or-equal".to_string()));
        assert!(part_names.contains(&"not".to_string()));
        assert!(part_names.contains(&"list-get".to_string()));
        assert!(part_names.contains(&"list-append".to_string()));
        assert!(part_names.contains(&"type-ast".to_string()));
        assert!(part_names.contains(&"part-definition".to_string()));
        assert!(part_names.contains(&"module-definition".to_string()));
        assert!(part_names.contains(&"abs".to_string()));
        assert!(part_names.contains(&"min".to_string()));
        assert!(part_names.contains(&"max".to_string()));
        assert!(part_names.contains(&"sign".to_string()));
        assert!(part_names.contains(&"bool-to-string".to_string()));
        assert!(part_names.contains(&"list-is-empty".to_string()));
        assert!(part_names.contains(&"list-head".to_string()));
        assert!(part_names.contains(&"greet".to_string()));
        assert!(part_names.contains(&"is-even-sample".to_string()));
        assert!(part_names.contains(&"prime-numbers".to_string()));
        assert!(part_names.contains(&"option-number".to_string()));
        assert!(part_names.contains(&"match-option-sample".to_string()));
        assert!(part_names.contains(&"validate-module".to_string()));
        assert!(part_names.contains(&"optimize-expression".to_string()));

        // Idempotency check: running init_db / migration again shouldn't duplicate records
        migrate_builtin_data(&db).await.unwrap();
        let events_after = get_events(&db, None, Some(50), Some(0)).await.unwrap();
        assert_eq!(events_after.len(), 6);
    }

    #[tokio::test]
    async fn test_cleanup_outdated_builtin_events() {
        let db = init_db().await.unwrap();

        // Check initially 6 events (1 account + 5 module commits)
        let events = get_events(&db, None, Some(50), Some(0)).await.unwrap();
        assert_eq!(events.len(), 6);

        // Insert an outdated bootstrap event (bootstrap timestamp) created by the definy system account
        let signing_key = ed25519_dalek::SigningKey::from_bytes(&DEV_SYSTEM_KEY_SEED);
        let verifying_key = signing_key.verifying_key();
        let account_id = definy_event::event::AccountId(verifying_key);
        let outdated_event = definy_event::event::Event {
            account_id: account_id.clone(),
            time: chrono::DateTime::from_timestamp(
                crate::builtin_migration::BOOTSTRAP_TIMESTAMP_SECONDS,
                500_000_000,
            )
            .unwrap(),
            content: definy_event::event::EventContent::ModuleCommit(
                definy_event::event::ModuleCommitEvent {
                    module_name: "obsolete_builtin_module".into(),
                    module_description: definy_event::event::Description::localized(vec![(
                        "en",
                        "Obsolete module",
                    )]),
                    parent_commit_hash: None,
                    message: "Obsolete".into(),
                    parts: vec![],
                },
            ),
        };
        let outdated_binary =
            definy_event::sign_and_serialize(outdated_event.clone(), &signing_key).unwrap();
        let (sig, verified) = definy_event::verify_and_deserialize(&outdated_binary).unwrap();
        let addr = "127.0.0.1:0".parse().unwrap();
        save_event(&verified, &sig, &outdated_binary, addr, &db)
            .await
            .unwrap();

        // Verify that there are now 7 events
        let events_with_outdated = get_events(&db, None, Some(50), Some(0)).await.unwrap();
        assert_eq!(events_with_outdated.len(), 7);

        // Also insert a user event (not definy system account) to verify user data is NEVER deleted
        let user_key = ed25519_dalek::SigningKey::generate(&mut rand::rngs::OsRng);
        let user_account = definy_event::event::AccountId(user_key.verifying_key());
        let user_event = definy_event::event::Event {
            account_id: user_account,
            time: chrono::Utc::now(),
            content: definy_event::event::EventContent::CreateAccount(
                definy_event::event::CreateAccountEvent {
                    account_name: "normal_user".into(),
                },
            ),
        };
        let user_binary = definy_event::sign_and_serialize(user_event.clone(), &user_key).unwrap();
        let (user_sig, user_verified) = definy_event::verify_and_deserialize(&user_binary).unwrap();
        save_event(&user_verified, &user_sig, &user_binary, addr, &db)
            .await
            .unwrap();

        // Also insert an edit made as the system account (e.g. from the UI) at the current time.
        // It is not a bootstrap event, so it must be kept.
        let system_edit_event = definy_event::event::Event {
            account_id: account_id.clone(),
            time: chrono::Utc::now(),
            content: definy_event::event::EventContent::ModuleCommit(
                definy_event::event::ModuleCommitEvent {
                    module_name: "core".into(),
                    module_description: definy_event::event::Description::localized(vec![(
                        "en",
                        "Edited from UI",
                    )]),
                    parent_commit_hash: None,
                    message: "Edit".into(),
                    parts: vec![],
                },
            ),
        };
        let system_edit_binary =
            definy_event::sign_and_serialize(system_edit_event, &signing_key).unwrap();
        let (edit_sig, edit_verified) =
            definy_event::verify_and_deserialize(&system_edit_binary).unwrap();
        save_event(&edit_verified, &edit_sig, &system_edit_binary, addr, &db)
            .await
            .unwrap();

        // Total 9 events (6 builtin + 1 outdated builtin + 1 normal user + 1 system edit)
        let events_total = get_events(&db, None, Some(50), Some(0)).await.unwrap();
        assert_eq!(events_total.len(), 9);

        // Run migrate_builtin_data - it should delete the outdated bootstrap event only
        migrate_builtin_data(&db).await.unwrap();

        let events_cleaned = get_events(&db, None, Some(50), Some(0)).await.unwrap();
        // 6 built-in events + 1 user event + 1 system edit = 8 events (outdated bootstrap deleted)
        assert_eq!(events_cleaned.len(), 8);

        let system_edit_hash = sha2::Sha256::digest(&system_edit_binary);
        assert!(get_event(&db, &system_edit_hash).await.unwrap().is_some());

        let user_event_hash = sha2::Sha256::digest(&user_binary);
        assert!(get_event(&db, &user_event_hash).await.unwrap().is_some());

        let outdated_hash = sha2::Sha256::digest(&outdated_binary);
        assert!(get_event(&db, &outdated_hash).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_content_storage_and_filter_missing() {
        let db = init_db().await.unwrap();

        let hash1 = "dummy_content_hash_1".to_string();
        let bytes1 = vec![1, 2, 3, 4];
        let hash2 = "dummy_content_hash_2".to_string();

        assert_eq!(get_content(&db, &hash1).await.unwrap(), None);

        save_content(&db, &hash1, &bytes1).await.unwrap();
        save_content(&db, &hash1, &bytes1).await.unwrap();
        assert_eq!(get_content(&db, &hash1).await.unwrap(), Some(bytes1));
        assert!(save_content(&db, &hash1, &[4, 3, 2, 1]).await.is_err());
        assert_eq!(
            get_content(&db, &hash1).await.unwrap(),
            Some(vec![1, 2, 3, 4])
        );

        let missing = filter_missing_content_hashes(&db, &[hash1.clone(), hash2.clone()])
            .await
            .unwrap();
        assert_eq!(missing, vec![hash2]);
    }

    #[tokio::test]
    async fn test_save_and_get_deployment() {
        let db = init_db().await.unwrap();

        let rec = DeploymentRecord {
            machine_id: "m_test_deploy_1".to_string(),
            commit_hash: Some("commit_abc123".to_string()),
            status: "started".to_string(),
            url: "https://definy.workers.dev".to_string(),
            app_url: "https://definy.workers.dev".to_string(),
            region: "cloudflare-edge".to_string(),
            created_at: chrono::Utc::now(),
            wasm_hash: Some("wasm_hash_456".to_string()),
            provider: Some("cloudflare".to_string()),
        };

        save_deployment(&db, rec.clone()).await.unwrap();

        let fetched = get_deployment(&db, "m_test_deploy_1")
            .await
            .unwrap()
            .expect("Deployment should exist");
        assert_eq!(fetched.machine_id, rec.machine_id);
        assert_eq!(fetched.status, "started");
        assert_eq!(fetched.commit_hash, rec.commit_hash);
        assert_eq!(fetched.wasm_hash, Some("wasm_hash_456".to_string()));

        let list = get_deployments(&db, Some(10)).await.unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].machine_id, "m_test_deploy_1");
    }
}
