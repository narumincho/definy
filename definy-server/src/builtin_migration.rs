use std::collections::HashSet;

use sha2::Digest;
use surrealdb::Surreal;
use surrealdb::engine::any::Any;
use surrealdb::types::SurrealValue;

use crate::db::{EventRecord, get_event, save_event};

pub const COMPILER_SYSTEM_KEY_SEED: [u8; 32] = *b"definy-compiler-system-key-2026\0";

#[derive(serde::Deserialize, SurrealValue)]
struct EventHashRow {
    event_binary_hash: Vec<u8>,
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

    // 2. Insert any missing built-in events
    for (_event, event_binary, hash) in prepared_events {
        if get_event(db, &hash).await?.is_none() {
            let (signature, verified_event) =
                definy_event::verify_and_deserialize(&event_binary)
                    .map_err(|e| anyhow::anyhow!("Failed to verify builtin event: {:?}", e))?;
            save_event(&verified_event, &signature, &event_binary, system_addr, db).await?;
        }
    }

    Ok(())
}
