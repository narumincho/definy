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
    // Repository first commit timestamp: 2019-01-31T13:36:01+09:00 (2019-01-31T04:36:01Z)
    let first_commit_time = chrono::DateTime::from_timestamp(1548909361, 0).unwrap();

    let core_module_event = definy_event::event::Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(1),
        content: definy_event::event::EventContent::ModuleDefinition(
            definy_event::event::ModuleDefinitionEvent {
                module_name: "core".into(),
                description: definy_event::event::Description::localized(vec![
                    ("en", "Core built-in module for definy"),
                    ("ja", "definy のコア組み込みモジュール"),
                ]),
            },
        ),
    };
    let core_module_binary =
        definy_event::sign_and_serialize(core_module_event.clone(), &signing_key)
            .map_err(|e| anyhow::anyhow!("Failed to serialize core module event: {:?}", e))?;
    let core_module_hash = definy_event::EventHashId::from_bytes(&core_module_binary);

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
        core_module_event,
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(2),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "let".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in let binding"),
                        ("ja", "ローカル変数を定義する組み込み構文 (let)"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Let,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(3),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "plus".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in addition"),
                        ("ja", "数値の加算を行う組み込み関数 (+)"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Plus,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(4),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "number literal".into(),
                    part_type: Some(definy_event::event::PartType::Number),
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in number literal"),
                        ("ja", "数値リテラル"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::NumberLiteral,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(5),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "if".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in conditional expression"),
                        ("ja", "条件分岐を行う組み込み構文 (if)"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::If,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(6),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "Number".into(),
                    part_type: Some(definy_event::event::PartType::Type),
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Built-in 64-bit integer type"),
                        ("ja", "組み込み 64ビット符号付き整数型"),
                    ]),
                    expression: None,
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(7),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "String".into(),
                    part_type: Some(definy_event::event::PartType::Type),
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Built-in UTF-8 string type"),
                        ("ja", "組み込み UTF-8 文字列型"),
                    ]),
                    expression: None,
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(8),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "Boolean".into(),
                    part_type: Some(definy_event::event::PartType::Type),
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Built-in boolean type"),
                        ("ja", "組み込み真偽値型"),
                    ]),
                    expression: None,
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(9),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "List".into(),
                    part_type: Some(definy_event::event::PartType::Type),
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Built-in list type constructor"),
                        ("ja", "組み込みリスト型コンストラクタ"),
                    ]),
                    expression: None,
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(10),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "Equal".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in equality comparison"),
                        ("ja", "値が等しいかを判定する組み込み関数 (==)"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Equal,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(11),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "minus".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in subtraction"),
                        ("ja", "数値の減算を行う組み込み関数 (-)"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Minus,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(12),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "multiply".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in multiplication"),
                        ("ja", "数値の乗算を行う組み込み関数 (*)"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Multiply,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(13),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "divide".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in division"),
                        ("ja", "数値の除算を行う組み込み関数 (/)"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Divide,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(14),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "remainder".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in remainder"),
                        ("ja", "数値の剰余を求める組み込み関数 (%)"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Remainder,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(15),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "less than".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in less than comparison"),
                        ("ja", "左辺が右辺より小さいかを判定する組み込み関数 (<)"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::LessThan,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(16),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "less than or equal".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in less than or equal comparison"),
                        ("ja", "左辺が右辺以下かを判定する組み込み関数 (<=)"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::LessThanOrEqual,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(17),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "greater than".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in greater than comparison"),
                        ("ja", "左辺が右辺より大きいかを判定する組み込み関数 (>)"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::GreaterThan,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(18),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "greater than or equal".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in greater than or equal comparison"),
                        ("ja", "左辺が右辺以上かを判定する組み込み関数 (>=)"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::GreaterThanOrEqual,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(19),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "not equal".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in not equal comparison"),
                        ("ja", "値が等しくないかを判定する組み込み関数 (!=)"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::NotEqual,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(20),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "not".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in boolean negation"),
                        ("ja", "真偽値の否定を行う組み込み関数 (not)"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Not,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(21),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "and".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in boolean and"),
                        ("ja", "真偽値の論理積を行う組み込み関数 (and)"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::And,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(22),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "or".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in boolean or"),
                        ("ja", "真偽値の論理和を行う組み込み関数 (or)"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Or,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(23),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "string concat".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in string concatenation"),
                        ("ja", "文字列の結合を行う組み込み関数"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::StringConcat,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(24),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "string length".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in string length"),
                        ("ja", "文字列の文字数を取得する組み込み関数"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::StringLength,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(25),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "string slice".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in string slice"),
                        ("ja", "文字列の部分文字列を取得する組み込み関数"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::StringSlice,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(26),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "list length".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in list length"),
                        ("ja", "リストの要素数を取得する組み込み関数"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::ListLength,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(27),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "list concat".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in list concatenation"),
                        ("ja", "2つのリストを結合する組み込み関数"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::ListConcat,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(28),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "list get".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in list element retrieval"),
                        ("ja", "リストの指定位置の要素を取得する組み込み関数"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::ListGet,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
                },
            ),
        },
        definy_event::event::Event {
            account_id: account_id.clone(),
            time: first_commit_time + chrono::Duration::milliseconds(29),
            content: definy_event::event::EventContent::PartDefinition(
                definy_event::event::PartDefinitionEvent {
                    part_name: "list append".into(),
                    part_type: None,
                    description: definy_event::event::Description::localized(vec![
                        ("en", "Compiler built-in list append"),
                        ("ja", "リストの末尾に要素を追加する組み込み関数"),
                    ]),
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::ListAppend,
                    )),
                    module_definition_event_hash: core_module_hash.clone(),
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

        let events = get_events(&db, None, Some(50), Some(0)).await.unwrap();
        // 1 CreateAccount + 1 ModuleDefinition + 28 PartDefinition = 30 events
        assert_eq!(events.len(), 30);

        let mut part_names = Vec::new();
        let mut has_core_module = false;
        for event_binary in events.iter() {
            let (_, event) = definy_event::verify_and_deserialize(event_binary).unwrap();
            match event.content {
                definy_event::event::EventContent::ModuleDefinition(module) => {
                    assert_eq!(module.module_name.as_ref(), "core");
                    assert!(module.description.get("en").is_some());
                    assert!(module.description.get("ja").is_some());
                    has_core_module = true;
                }
                definy_event::event::EventContent::PartDefinition(part) => {
                    assert!(part.description.get("en").is_some());
                    assert!(part.description.get("ja").is_some());
                    part_names.push(part.part_name.to_string());
                }
                definy_event::event::EventContent::CreateAccount(account) => {
                    assert_eq!(account.account_name.as_ref(), "definy");
                }
                _ => {}
            }
        }

        assert!(has_core_module);
        assert!(part_names.contains(&"let".to_string()));
        assert!(part_names.contains(&"plus".to_string()));
        assert!(part_names.contains(&"number literal".to_string()));
        assert!(part_names.contains(&"if".to_string()));
        assert!(part_names.contains(&"Number".to_string()));
        assert!(part_names.contains(&"String".to_string()));
        assert!(part_names.contains(&"Boolean".to_string()));
        assert!(part_names.contains(&"List".to_string()));
        assert!(part_names.contains(&"Equal".to_string()));
        assert!(part_names.contains(&"minus".to_string()));
        assert!(part_names.contains(&"multiply".to_string()));
        assert!(part_names.contains(&"divide".to_string()));
        assert!(part_names.contains(&"remainder".to_string()));
        assert!(part_names.contains(&"less than".to_string()));
        assert!(part_names.contains(&"less than or equal".to_string()));
        assert!(part_names.contains(&"greater than".to_string()));
        assert!(part_names.contains(&"greater than or equal".to_string()));
        assert!(part_names.contains(&"not equal".to_string()));
        assert!(part_names.contains(&"not".to_string()));
        assert!(part_names.contains(&"and".to_string()));
        assert!(part_names.contains(&"or".to_string()));
        assert!(part_names.contains(&"string concat".to_string()));
        assert!(part_names.contains(&"string length".to_string()));
        assert!(part_names.contains(&"string slice".to_string()));
        assert!(part_names.contains(&"list length".to_string()));
        assert!(part_names.contains(&"list concat".to_string()));
        assert!(part_names.contains(&"list get".to_string()));
        assert!(part_names.contains(&"list append".to_string()));

        // Idempotency check: running init_db / migration again shouldn't duplicate records
        migrate_builtin_data(&db).await.unwrap();
        let events_after = get_events(&db, None, Some(50), Some(0)).await.unwrap();
        assert_eq!(events_after.len(), 30);
    }
}
