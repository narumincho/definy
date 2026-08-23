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

#[derive(Debug, PartialEq, Eq)]
pub struct ParsedDbConfig {
    pub endpoint: String,
    pub namespace: String,
    pub database: String,
    pub auth: Option<AuthCredentials>,
}

#[derive(Debug, PartialEq, Eq)]
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

pub fn parse_database_url(raw: &str) -> ParsedDbConfig {
    let mut parts = raw.split(';');
    let mut endpoint = parts.next().unwrap_or("").trim().to_string();

    let mut namespace = "definy".to_string();
    let mut database = "definy".to_string();
    let mut username: Option<String> = None;
    let mut password: Option<String> = None;
    let mut auth_level: Option<String> = None;

    for param in parts {
        let param = param.trim();
        if param.is_empty() {
            continue;
        }
        if let Some((k, v)) = param.split_once('=') {
            let key = k.trim().to_lowercase();
            let val = v.trim().to_string();
            match key.as_str() {
                "ns" | "namespace" => namespace = val,
                "db" | "database" => database = val,
                "user" | "username" => username = Some(val),
                "pass" | "password" => password = Some(val),
                "authlevel" | "auth_level" | "level" => auth_level = Some(val),
                _ => {}
            }
        }
    }

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

    if username.is_none()
        && (endpoint.starts_with("ws://")
            || endpoint.starts_with("wss://")
            || endpoint.starts_with("http://")
            || endpoint.starts_with("https://"))
    {
        if let Ok(parsed_url) = url::Url::parse(&endpoint) {
            if !parsed_url.username().is_empty() {
                username = Some(parsed_url.username().to_string());
            }
            if let Some(pass) = parsed_url.password() {
                password = Some(pass.to_string());
            }
        }
    }

    let auth = match (username, password) {
        (Some(u), Some(p)) => match auth_level.as_deref().map(|s| s.to_lowercase()).as_deref() {
            Some("root") => Some(AuthCredentials::Root {
                username: u,
                password: p,
            }),
            Some("namespace") | Some("ns") => Some(AuthCredentials::Namespace {
                namespace: namespace.clone(),
                username: u,
                password: p,
            }),
            _ => Some(AuthCredentials::Database {
                namespace: namespace.clone(),
                database: database.clone(),
                username: u,
                password: p,
            }),
        },
        _ => None,
    };

    ParsedDbConfig {
        endpoint,
        namespace,
        database,
        auth,
    }
}

pub async fn init_db() -> Result<Surreal<Any>, anyhow::Error> {
    let db = match std::env::var("DATABASE_URL") {
        Ok(raw_url) => {
            let config = parse_database_url(&raw_url);
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
        Err(_) => {
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
    db.query(
        "
        DEFINE TABLE IF NOT EXISTS events SCHEMALESS;
        DEFINE INDEX IF NOT EXISTS idx_events_time ON TABLE events COLUMNS time;
        DEFINE INDEX IF NOT EXISTS idx_events_type ON TABLE events COLUMNS event_type;
        ",
    )
    .await?
    .check()?;
    println!("Migrating database schema... done");

    Ok(db)
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

    #[test]
    fn test_parse_database_url() {
        let url = "wss://sample.surreal.cloud/rpc;AuthLevel=Database;NS=definy;DB=definy;User=flyio;Pass=secret123";
        let parsed = parse_database_url(url);
        assert_eq!(
            parsed,
            ParsedDbConfig {
                endpoint: "wss://sample.surreal.cloud".to_string(),
                namespace: "definy".to_string(),
                database: "definy".to_string(),
                auth: Some(AuthCredentials::Database {
                    namespace: "definy".to_string(),
                    database: "definy".to_string(),
                    username: "flyio".to_string(),
                    password: "secret123".to_string(),
                }),
            }
        );
    }

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
}
