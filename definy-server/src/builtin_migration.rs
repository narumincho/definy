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

#[allow(clippy::too_many_arguments)]
fn builtin_part_event(
    account_id: &definy_event::event::AccountId,
    time: chrono::DateTime<chrono::Utc>,
    offset_ms: i64,
    module_hash: &definy_event::EventHashId,
    name: &str,
    part_type: Option<definy_event::event::PartType>,
    desc_en: &str,
    desc_ja: &str,
    expression: Option<definy_event::event::Expression>,
) -> definy_event::event::Event {
    definy_event::event::Event {
        account_id: account_id.clone(),
        time: time + chrono::Duration::milliseconds(offset_ms),
        content: definy_event::event::EventContent::PartDefinition(
            definy_event::event::PartDefinitionEvent {
                part_name: name.into(),
                part_type,
                description: definy_event::event::Description::localized(vec![
                    ("en", desc_en),
                    ("ja", desc_ja),
                ]),
                expression,
                module_definition_event_hash: module_hash.clone(),
            },
        ),
    }
}

#[allow(clippy::too_many_arguments)]
fn builtin_compiler_part(
    account_id: &definy_event::event::AccountId,
    time: chrono::DateTime<chrono::Utc>,
    offset_ms: i64,
    module_hash: &definy_event::EventHashId,
    name: &str,
    part_type: Option<definy_event::event::PartType>,
    desc_en: &str,
    desc_ja: &str,
    builtin: definy_event::event::CompilerBuiltin,
) -> definy_event::event::Event {
    builtin_part_event(
        account_id,
        time,
        offset_ms,
        module_hash,
        name,
        part_type,
        desc_en,
        desc_ja,
        Some(definy_event::event::Expression::Compiler(builtin)),
    )
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

    let sample_module_event = definy_event::event::Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(30),
        content: definy_event::event::EventContent::ModuleDefinition(
            definy_event::event::ModuleDefinitionEvent {
                module_name: "sample".into(),
                description: definy_event::event::Description::localized(vec![
                    (
                        "en",
                        "Sample programs showcasing definy expressions and computations",
                    ),
                    (
                        "ja",
                        "definy の計算式や機能を体験できるサンプルプログラム集",
                    ),
                ]),
            },
        ),
    };
    let sample_module_binary =
        definy_event::sign_and_serialize(sample_module_event.clone(), &signing_key)
            .map_err(|e| anyhow::anyhow!("Failed to serialize sample module event: {:?}", e))?;
    let sample_module_hash = definy_event::EventHashId::from_bytes(&sample_module_binary);

    let mut events = vec![
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
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            2,
            &core_module_hash,
            "let",
            None,
            "Compiler built-in let binding",
            "ローカル変数を定義する組み込み構文 (let)",
            definy_event::event::CompilerBuiltin::Let,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            3,
            &core_module_hash,
            "plus",
            None,
            "Compiler built-in addition",
            "数値の加算を行う組み込み関数 (+)",
            definy_event::event::CompilerBuiltin::Plus,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            4,
            &core_module_hash,
            "number-literal",
            Some(definy_event::event::PartType::Number),
            "Compiler built-in number literal",
            "数値リテラル",
            definy_event::event::CompilerBuiltin::NumberLiteral,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            5,
            &core_module_hash,
            "if",
            None,
            "Compiler built-in conditional expression",
            "条件分岐を行う組み込み構文 (if)",
            definy_event::event::CompilerBuiltin::If,
        ),
        builtin_part_event(
            &account_id,
            first_commit_time,
            6,
            &core_module_hash,
            "number",
            Some(definy_event::event::PartType::Type),
            "Built-in 64-bit integer type",
            "組み込み 64ビット符号付き整数型",
            None,
        ),
        builtin_part_event(
            &account_id,
            first_commit_time,
            7,
            &core_module_hash,
            "string",
            Some(definy_event::event::PartType::Type),
            "Built-in UTF-8 string type",
            "組み込み UTF-8 文字列型",
            None,
        ),
        builtin_part_event(
            &account_id,
            first_commit_time,
            8,
            &core_module_hash,
            "boolean",
            Some(definy_event::event::PartType::Type),
            "Built-in boolean type",
            "組み込み真偽値型",
            None,
        ),
        builtin_part_event(
            &account_id,
            first_commit_time,
            9,
            &core_module_hash,
            "list",
            Some(definy_event::event::PartType::Type),
            "Built-in list type constructor",
            "組み込みリスト型コンストラクタ",
            None,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            10,
            &core_module_hash,
            "equal",
            None,
            "Compiler built-in equality comparison",
            "値が等しいかを判定する組み込み関数 (==)",
            definy_event::event::CompilerBuiltin::Equal,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            11,
            &core_module_hash,
            "minus",
            None,
            "Compiler built-in subtraction",
            "数値の減算を行う組み込み関数 (-)",
            definy_event::event::CompilerBuiltin::Minus,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            12,
            &core_module_hash,
            "multiply",
            None,
            "Compiler built-in multiplication",
            "数値の乗算を行う組み込み関数 (*)",
            definy_event::event::CompilerBuiltin::Multiply,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            13,
            &core_module_hash,
            "divide",
            None,
            "Compiler built-in division",
            "数値の除算を行う組み込み関数 (/)",
            definy_event::event::CompilerBuiltin::Divide,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            14,
            &core_module_hash,
            "remainder",
            None,
            "Compiler built-in remainder",
            "数値の剰余を求める組み込み関数 (%)",
            definy_event::event::CompilerBuiltin::Remainder,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            15,
            &core_module_hash,
            "less-than",
            None,
            "Compiler built-in less than comparison",
            "左辺が右辺より小さいかを判定する組み込み関数 (<)",
            definy_event::event::CompilerBuiltin::LessThan,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            16,
            &core_module_hash,
            "less-than-or-equal",
            None,
            "Compiler built-in less than or equal comparison",
            "左辺が右辺以下かを判定する組み込み関数 (<=)",
            definy_event::event::CompilerBuiltin::LessThanOrEqual,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            17,
            &core_module_hash,
            "greater-than",
            None,
            "Compiler built-in greater than comparison",
            "左辺が右辺より大きいかを判定する組み込み関数 (>)",
            definy_event::event::CompilerBuiltin::GreaterThan,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            18,
            &core_module_hash,
            "greater-than-or-equal",
            None,
            "Compiler built-in greater than or equal comparison",
            "左辺が右辺以上かを判定する組み込み関数 (>=)",
            definy_event::event::CompilerBuiltin::GreaterThanOrEqual,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            19,
            &core_module_hash,
            "not-equal",
            None,
            "Compiler built-in not equal comparison",
            "値が等しくないかを判定する組み込み関数 (!=)",
            definy_event::event::CompilerBuiltin::NotEqual,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            20,
            &core_module_hash,
            "not",
            None,
            "Compiler built-in boolean negation",
            "真偽値の否定を行う組み込み関数 (not)",
            definy_event::event::CompilerBuiltin::Not,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            21,
            &core_module_hash,
            "and",
            None,
            "Compiler built-in boolean and",
            "真偽値の論理積を行う組み込み関数 (and)",
            definy_event::event::CompilerBuiltin::And,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            22,
            &core_module_hash,
            "or",
            None,
            "Compiler built-in boolean or",
            "真偽値の論理和を行う組み込み関数 (or)",
            definy_event::event::CompilerBuiltin::Or,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            23,
            &core_module_hash,
            "string-concat",
            None,
            "Compiler built-in string concatenation",
            "文字列の結合を行う組み込み関数",
            definy_event::event::CompilerBuiltin::StringConcat,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            24,
            &core_module_hash,
            "string-length",
            None,
            "Compiler built-in string length",
            "文字列の文字数を取得する組み込み関数",
            definy_event::event::CompilerBuiltin::StringLength,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            25,
            &core_module_hash,
            "string-slice",
            None,
            "Compiler built-in string slice",
            "文字列の部分文字列を取得する組み込み関数",
            definy_event::event::CompilerBuiltin::StringSlice,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            26,
            &core_module_hash,
            "list-length",
            None,
            "Compiler built-in list length",
            "リストの要素数を取得する組み込み関数",
            definy_event::event::CompilerBuiltin::ListLength,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            27,
            &core_module_hash,
            "list-concat",
            None,
            "Compiler built-in list concatenation",
            "2つのリストを結合する組み込み関数",
            definy_event::event::CompilerBuiltin::ListConcat,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            28,
            &core_module_hash,
            "list-get",
            None,
            "Compiler built-in list element retrieval",
            "リストの指定位置の要素を取得する組み込み関数",
            definy_event::event::CompilerBuiltin::ListGet,
        ),
        builtin_compiler_part(
            &account_id,
            first_commit_time,
            29,
            &core_module_hash,
            "list-append",
            None,
            "Compiler built-in list append",
            "リストの末尾に要素を追加する組み込み関数",
            definy_event::event::CompilerBuiltin::ListAppend,
        ),
        sample_module_event,
        builtin_part_event(
            &account_id,
            first_commit_time,
            31,
            &sample_module_hash,
            "triangle-area",
            Some(definy_event::event::PartType::Number),
            "Calculate the area of a triangle (base 10, height 5)",
            "三角形の面積を計算するサンプルプログラム (底辺 10, 高さ 5)",
            Some(definy_event::event::Expression::Let(
                definy_event::event::LetExpression {
                    variable_id: 1,
                    variable_name: "base".into(),
                    value: Box::new(definy_event::event::Expression::Number(
                        definy_event::event::NumberExpression { value: 10 },
                    )),
                    body: Box::new(definy_event::event::Expression::Let(
                        definy_event::event::LetExpression {
                            variable_id: 2,
                            variable_name: "height".into(),
                            value: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 5 },
                            )),
                            body: Box::new(definy_event::event::Expression::Divide(
                                definy_event::event::DivideExpression {
                                    left: Box::new(definy_event::event::Expression::Multiply(
                                        definy_event::event::MultiplyExpression {
                                            left: Box::new(
                                                definy_event::event::Expression::Variable(
                                                    definy_event::event::VariableExpression {
                                                        variable_id: 1,
                                                    },
                                                ),
                                            ),
                                            right: Box::new(
                                                definy_event::event::Expression::Variable(
                                                    definy_event::event::VariableExpression {
                                                        variable_id: 2,
                                                    },
                                                ),
                                            ),
                                        },
                                    )),
                                    right: Box::new(definy_event::event::Expression::Number(
                                        definy_event::event::NumberExpression { value: 2 },
                                    )),
                                },
                            )),
                        },
                    )),
                },
            )),
        ),
        builtin_part_event(
            &account_id,
            first_commit_time,
            32,
            &sample_module_hash,
            "greet",
            Some(definy_event::event::PartType::String),
            "Greeting message using string concatenation",
            "文字列結合を使った挨拶メッセージの生成サンプル",
            Some(definy_event::event::Expression::StringConcat(
                definy_event::event::StringConcatExpression {
                    left: Box::new(definy_event::event::Expression::String(
                        definy_event::event::StringExpression {
                            value: "Hello, ".into(),
                        },
                    )),
                    right: Box::new(definy_event::event::Expression::String(
                        definy_event::event::StringExpression {
                            value: "definy!".into(),
                        },
                    )),
                },
            )),
        ),
        builtin_part_event(
            &account_id,
            first_commit_time,
            33,
            &sample_module_hash,
            "is-even-sample",
            Some(definy_event::event::PartType::String),
            "Check if a number is even using conditional expression",
            "剰余算と条件分岐による偶数・奇数判定サンプル (n = 4)",
            Some(definy_event::event::Expression::Let(
                definy_event::event::LetExpression {
                    variable_id: 1,
                    variable_name: "n".into(),
                    value: Box::new(definy_event::event::Expression::Number(
                        definy_event::event::NumberExpression { value: 4 },
                    )),
                    body: Box::new(definy_event::event::Expression::If(
                        definy_event::event::IfExpression {
                            condition: Box::new(definy_event::event::Expression::Equal(
                                definy_event::event::EqualExpression {
                                    left: Box::new(definy_event::event::Expression::Remainder(
                                        definy_event::event::RemainderExpression {
                                            left: Box::new(
                                                definy_event::event::Expression::Variable(
                                                    definy_event::event::VariableExpression {
                                                        variable_id: 1,
                                                    },
                                                ),
                                            ),
                                            right: Box::new(
                                                definy_event::event::Expression::Number(
                                                    definy_event::event::NumberExpression {
                                                        value: 2,
                                                    },
                                                ),
                                            ),
                                        },
                                    )),
                                    right: Box::new(definy_event::event::Expression::Number(
                                        definy_event::event::NumberExpression { value: 0 },
                                    )),
                                },
                            )),
                            then_expr: Box::new(definy_event::event::Expression::String(
                                definy_event::event::StringExpression {
                                    value: "even".into(),
                                },
                            )),
                            else_expr: Box::new(definy_event::event::Expression::String(
                                definy_event::event::StringExpression {
                                    value: "odd".into(),
                                },
                            )),
                        },
                    )),
                },
            )),
        ),
        builtin_part_event(
            &account_id,
            first_commit_time,
            34,
            &sample_module_hash,
            "prime-numbers",
            Some(definy_event::event::PartType::List(Box::new(
                definy_event::event::PartType::Number,
            ))),
            "List literal containing prime numbers",
            "素数のリストリテラルサンプル [2, 3, 5, 7, 11]",
            Some(definy_event::event::Expression::ListLiteral(
                definy_event::event::ListLiteralExpression {
                    items: vec![
                        definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 2 },
                        ),
                        definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 3 },
                        ),
                        definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 5 },
                        ),
                        definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 7 },
                        ),
                        definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 11 },
                        ),
                    ],
                },
            )),
        ),
        builtin_part_event(
            &account_id,
            first_commit_time,
            35,
            &core_module_hash,
            "option-number",
            Some(definy_event::event::PartType::Type),
            "Option type for numbers (none or some(number))",
            "数値用の Option 型 (none または some(number))",
            Some(definy_event::event::Expression::TypeUnion(
                definy_event::event::TypeUnionExpression {
                    variants: vec![
                        definy_event::event::TypeUnionVariant {
                            tag: "none".into(),
                            payload_type: None,
                        },
                        definy_event::event::TypeUnionVariant {
                            tag: "some".into(),
                            payload_type: Some(Box::new(
                                definy_event::event::Expression::TypeNumber,
                            )),
                        },
                    ],
                },
            )),
        ),
        builtin_part_event(
            &account_id,
            first_commit_time,
            36,
            &sample_module_hash,
            "match-option-sample",
            Some(definy_event::event::PartType::Number),
            "Pattern match sample: unwrap some(100) and add 23",
            "パターンマッチのサンプル: some(100) を分解して 23 を加算 (結果: 123)",
            Some(definy_event::event::Expression::Match(
                definy_event::event::MatchExpression {
                    target: Box::new(definy_event::event::Expression::Variant(
                        definy_event::event::VariantExpression {
                            tag: "some".into(),
                            payload: Some(Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 100 },
                            ))),
                            type_part_definition_event_hash: None,
                        },
                    )),
                    arms: vec![
                        definy_event::event::MatchArm {
                            tag: "some".into(),
                            variable_id: Some(1),
                            variable_name: Some("val".into()),
                            body: Box::new(definy_event::event::Expression::Add(
                                definy_event::event::AddExpression {
                                    left: Box::new(definy_event::event::Expression::Variable(
                                        definy_event::event::VariableExpression { variable_id: 1 },
                                    )),
                                    right: Box::new(definy_event::event::Expression::Number(
                                        definy_event::event::NumberExpression { value: 23 },
                                    )),
                                },
                            )),
                        },
                        definy_event::event::MatchArm {
                            tag: "none".into(),
                            variable_id: None,
                            variable_name: None,
                            body: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ],
                    default: None,
                },
            )),
        ),
    ];

    // Expression AST Type (Self-describing AST)
    let (expr_def_event, expr_update_event) =
        crate::builtin_expression_type::create_expression_ast_type_events(
            &account_id,
            first_commit_time,
            &core_module_hash,
            &signing_key,
        )?;
    events.push(expr_def_event);
    events.push(expr_update_event);

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
