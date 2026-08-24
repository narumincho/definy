use sha2::Digest;
use surrealdb::Surreal;
use surrealdb::engine::any::Any;
use surrealdb::types::SurrealValue;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, SurrealValue)]
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

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DbConfig {
    pub endpoint: String,
    pub namespace: String,
    pub database: String,
    pub auth: Option<AuthCredentials>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AuthCredentials {
    Root {
        username: String,
        password: String,
    },
    Namespace {
        namespace: String,
        username: String,
        password: String,
    },
    Database {
        namespace: String,
        database: String,
        username: String,
        password: String,
    },
}

pub fn load_db_config_from_env() -> Option<DbConfig> {
    let raw_url = std::env::var("DATABASE_URL").ok()?;
    let mut endpoint = raw_url.trim().to_string();

    if endpoint.starts_with("http://")
        || endpoint.starts_with("https://")
        || endpoint.starts_with("ws://")
        || endpoint.starts_with("wss://")
    {
        endpoint = endpoint
            .trim_end_matches('/')
            .trim_end_matches("/rpc")
            .trim_end_matches('/')
            .to_string();
    }

    let namespace = std::env::var("DATABASE_NS").unwrap_or_else(|_| "definy".to_string());
    let database = std::env::var("DATABASE_DB").unwrap_or_else(|_| "definy".to_string());

    let username = std::env::var("DATABASE_USER").ok();
    let password = std::env::var("DATABASE_PASS").ok();
    let auth_level = std::env::var("DATABASE_AUTH_LEVEL").ok();

    let auth = match (username, password) {
        (Some(username), Some(password)) => {
            match auth_level.as_deref().map(|s| s.to_lowercase()).as_deref() {
                Some("root") => Some(AuthCredentials::Root { username, password }),
                Some("namespace") | Some("ns") => Some(AuthCredentials::Namespace {
                    namespace: namespace.clone(),
                    username,
                    password,
                }),
                _ => Some(AuthCredentials::Database {
                    namespace: namespace.clone(),
                    database: database.clone(),
                    username,
                    password,
                }),
            }
        }
        _ => None,
    };

    Some(DbConfig {
        endpoint,
        namespace,
        database,
        auth,
    })
}

const SCHEMA_SQL: &str = include_str!("../schema.surql");

const COMPILER_SYSTEM_KEY_SEED: [u8; 32] = *b"definy-compiler-system-key-2026\0";

pub async fn init_db() -> Result<Surreal<Any>, anyhow::Error> {
    let db = match load_db_config_from_env() {
        Some(config) => {
            println!("Connecting to SurrealDB at {}...", config.endpoint);
            let db = surrealdb::engine::any::connect(&config.endpoint).await?;
            println!("Connected to SurrealDB via {}.", config.endpoint);

            db.use_ns(&config.namespace)
                .use_db(&config.database)
                .await?;

            if let Some(auth) = config.auth {
                println!("Signing in to SurrealDB...");
                match auth {
                    AuthCredentials::Root { username, password } => {
                        db.signin(surrealdb::opt::auth::Root { username, password })
                            .await?;
                    }
                    AuthCredentials::Namespace {
                        namespace,
                        username,
                        password,
                    } => {
                        db.signin(surrealdb::opt::auth::Namespace {
                            namespace,
                            username,
                            password,
                        })
                        .await?;
                    }
                    AuthCredentials::Database {
                        namespace,
                        database,
                        username,
                        password,
                    } => {
                        db.signin(surrealdb::opt::auth::Database {
                            namespace,
                            database,
                            username,
                            password,
                        })
                        .await?;
                    }
                }
                println!("Signed in successfully.");
            }
            db
        }
        None => {
            eprintln!(
                "WARNING: DATABASE_URL environment variable is not set. Using in-memory SurrealDB (mem://). Data will NOT be persisted across server restarts."
            );
            let db = surrealdb::engine::any::connect("mem://").await?;
            println!("Initialized in-memory SurrealDB.");
            db.use_ns("definy").use_db("definy").await?;
            db
        }
    };

    println!("Migrating database schema...");
    db.query(SCHEMA_SQL).await?.check()?;
    println!("Migrating database schema... done");

    println!("Migrating builtin data...");
    migrate_builtin_data(&db).await?;
    println!("Migrating builtin data... done");

    Ok(db)
}

pub async fn migrate_builtin_data(db: &Surreal<Any>) -> Result<(), anyhow::Error> {
    let signing_key = ed25519_dalek::SigningKey::from_bytes(&COMPILER_SYSTEM_KEY_SEED);
    let verifying_key = signing_key.verifying_key();
    let account_id = definy_event::event::AccountId(verifying_key);
    let system_addr: std::net::SocketAddr = "127.0.0.1:0".parse().unwrap();
    let epoch = chrono::DateTime::UNIX_EPOCH;

    let events = vec![
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: epoch,
            content: definy_event::event::EventContent::CreateAccount(
                definy_event::event::CreateAccountEvent {
                    account_name: "definy".into(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: epoch + chrono::Duration::milliseconds(1),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "let".into(),
                    part_type: None,
                    description: "Compiler built-in let binding".into(),
                    expression: definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Let,
                    ),
                    module_definition_event_hash: None,
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: epoch + chrono::Duration::milliseconds(2),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "plus".into(),
                    part_type: None,
                    description: "Compiler built-in addition".into(),
                    expression: definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Plus,
                    ),
                    module_definition_event_hash: None,
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: epoch + chrono::Duration::milliseconds(3),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "number literal".into(),
                    part_type: Some(definy_event::event::PartType::Number),
                    description: "Compiler built-in number literal".into(),
                    expression: definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::NumberLiteral,
                    ),
                    module_definition_event_hash: None,
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: epoch + chrono::Duration::milliseconds(4),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "if".into(),
                    part_type: None,
                    description: "Compiler built-in conditional expression".into(),
                    expression: definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::If,
                    ),
                    module_definition_event_hash: None,
                },
            ),
        },
    ];

    for event in events {
        let event_binary = definy_event::sign_and_serialize(event.clone(), &signing_key)
            .map_err(|e| anyhow::anyhow!("Failed to serialize builtin event: {:?}", e))?;
        let hash = sha2::Sha256::digest(&event_binary);
        if get_event(db, &hash).await?.is_none() {
            let (signature, verified_event) =
                definy_event::verify_and_deserialize(&event_binary)
                    .map_err(|e| anyhow::anyhow!("Failed to verify builtin event: {:?}", e))?;
            save_event(&verified_event, &signature, &event_binary, system_addr, db).await?;
        }
    }

    Ok(())
}

pub async fn save_event(
    event: &definy_event::event::Event,
    signature: &ed25519_dalek::Signature,
    event_binary: &[u8],
    address: std::net::SocketAddr,
    db: &Surreal<Any>,
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

    let _: Option<EventRecord> = db
        .create(("events", event_binary_hash_hex.as_str()))
        .content(record)
        .await?;

    Ok(())
}

#[derive(serde::Deserialize, SurrealValue)]
struct EventBinaryRow {
    event_binary: Vec<u8>,
}

pub async fn get_events(
    db: &Surreal<Any>,
    event_type: Option<definy_event::event::EventType>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Box<[Vec<u8>]>, anyhow::Error> {
    let mut query_str = "SELECT event_binary, time FROM events".to_string();

    if event_type.is_some() {
        query_str.push_str(" WHERE event_type = $event_type");
    }

    query_str.push_str(" ORDER BY time DESC");

    if limit.is_some() {
        query_str.push_str(" LIMIT $limit");
    }

    if offset.is_some() {
        query_str.push_str(" START $offset");
    }

    let mut query = db.query(&query_str);

    if let Some(event_type) = event_type {
        query = query.bind(("event_type", event_type.to_string()));
    }

    if let Some(limit) = limit {
        let limit_value = std::cmp::min(limit, i64::MAX as usize) as i64;
        query = query.bind(("limit", limit_value));
    }

    if let Some(offset) = offset {
        let offset_value = std::cmp::min(offset, i64::MAX as usize) as i64;
        query = query.bind(("offset", offset_value));
    }

    let mut response = query.await?.check()?;
    let rows: Vec<EventBinaryRow> = response.take(0)?;
    let events: Vec<Vec<u8>> = rows.into_iter().map(|r| r.event_binary).collect();

    Ok(events.into_boxed_slice())
}

pub async fn get_event(
    db: &Surreal<Any>,
    event_binary_hash: &[u8],
) -> Result<Option<Vec<u8>>, anyhow::Error> {
    let event_binary_hash_hex = hex::encode(event_binary_hash);
    let record: Option<EventRecord> = db
        .select(("events", event_binary_hash_hex.as_str()))
        .await?;

    Ok(record.map(|r| r.event_binary))
}

#[cfg(test)]
mod tests {
    use super::*;

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

        let events = get_events(&db, None, Some(10), Some(0)).await.unwrap();
        // 1 CreateAccount + 4 PartDefinition = 5 events
        assert_eq!(events.len(), 5);

        let mut part_names = Vec::new();
        for event_binary in events.iter() {
            let (_, event) = definy_event::verify_and_deserialize(event_binary).unwrap();
            match event.content {
                definy_event::event::EventContent::PartDefinition(part) => {
                    part_names.push(part.part_name.to_string());
                }
                definy_event::event::EventContent::CreateAccount(account) => {
                    assert_eq!(account.account_name.as_ref(), "definy");
                }
                _ => {}
            }
        }

        assert!(part_names.contains(&"let".to_string()));
        assert!(part_names.contains(&"plus".to_string()));
        assert!(part_names.contains(&"number literal".to_string()));
        assert!(part_names.contains(&"if".to_string()));

        // Idempotency check: running init_db / migration again shouldn't duplicate records
        migrate_builtin_data(&db).await.unwrap();
        let events_after = get_events(&db, None, Some(10), Some(0)).await.unwrap();
        assert_eq!(events_after.len(), 5);
    }
}
