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

fn compiler_part_entry(
    name: &str,
    part_type: Option<definy_event::event::PartType>,
    desc_en: &str,
    desc_ja: &str,
    builtin: definy_event::event::CompilerBuiltin,
) -> definy_event::event::ModulePartEntry {
    definy_event::event::ModulePartEntry {
        name: name.into(),
        part_type,
        description: definy_event::event::Description::localized(vec![
            ("en", desc_en),
            ("ja", desc_ja),
        ]),
        content_hash: None,
        expression: Some(definy_event::event::Expression::Compiler(builtin)),
    }
}

fn type_part_entry(
    name: &str,
    desc_en: &str,
    desc_ja: &str,
) -> definy_event::event::ModulePartEntry {
    definy_event::event::ModulePartEntry {
        name: name.into(),
        part_type: Some(definy_event::event::PartType::Type),
        description: definy_event::event::Description::localized(vec![
            ("en", desc_en),
            ("ja", desc_ja),
        ]),
        content_hash: None,
        expression: None,
    }
}

pub async fn migrate_builtin_data(db: &Surreal<Any>) -> Result<(), anyhow::Error> {
    let signing_key = ed25519_dalek::SigningKey::from_bytes(&COMPILER_SYSTEM_KEY_SEED);
    let verifying_key = signing_key.verifying_key();
    let account_id = definy_event::event::AccountId(verifying_key);
    let system_addr: std::net::SocketAddr = "127.0.0.1:0".parse().unwrap();
    // Repository first commit timestamp: 2019-01-31T13:36:01+09:00 (2019-01-31T04:36:01Z)
    let first_commit_time = chrono::DateTime::from_timestamp(1548909361, 0).unwrap();

    let core_module_id = definy_event::event::derive_module_id(&account_id, "core");

    let mut core_parts = vec![
        compiler_part_entry(
            "let",
            None,
            "Compiler built-in let binding",
            "ローカル変数を定義する組み込み構文 (let)",
            definy_event::event::CompilerBuiltin::Let,
        ),
        compiler_part_entry(
            "plus",
            None,
            "Compiler built-in addition",
            "数値の加算を行う組み込み関数 (+)",
            definy_event::event::CompilerBuiltin::Plus,
        ),
        compiler_part_entry(
            "number-literal",
            Some(definy_event::event::PartType::Number),
            "Compiler built-in number literal",
            "数値リテラル",
            definy_event::event::CompilerBuiltin::NumberLiteral,
        ),
        compiler_part_entry(
            "if",
            None,
            "Compiler built-in conditional expression",
            "条件分岐を行う組み込み構文 (if)",
            definy_event::event::CompilerBuiltin::If,
        ),
        type_part_entry(
            "number",
            "Built-in 64-bit integer type",
            "組み込み 64ビット符号付き整数型",
        ),
        type_part_entry(
            "string",
            "Built-in UTF-8 string type",
            "組み込み UTF-8 文字列型",
        ),
        type_part_entry("boolean", "Built-in boolean type", "組み込み真偽値型"),
        type_part_entry(
            "list",
            "Built-in list type constructor",
            "組み込みリスト型コンストラクタ",
        ),
        compiler_part_entry(
            "equal",
            None,
            "Compiler built-in equality comparison",
            "値が等しいかを判定する組み込み関数 (==)",
            definy_event::event::CompilerBuiltin::Equal,
        ),
        compiler_part_entry(
            "minus",
            None,
            "Compiler built-in subtraction",
            "数値の減算を行う組み込み関数 (-)",
            definy_event::event::CompilerBuiltin::Minus,
        ),
        compiler_part_entry(
            "multiply",
            None,
            "Compiler built-in multiplication",
            "数値の乗算を行う組み込み関数 (*)",
            definy_event::event::CompilerBuiltin::Multiply,
        ),
        compiler_part_entry(
            "divide",
            None,
            "Compiler built-in division",
            "数値の除算を行う組み込み関数 (/)",
            definy_event::event::CompilerBuiltin::Divide,
        ),
        compiler_part_entry(
            "remainder",
            None,
            "Compiler built-in remainder",
            "数値の剰余を求める組み込み関数 (%)",
            definy_event::event::CompilerBuiltin::Remainder,
        ),
        compiler_part_entry(
            "less-than",
            None,
            "Compiler built-in less than comparison",
            "左辺が右辺より小さいかを判定する組み込み関数 (<)",
            definy_event::event::CompilerBuiltin::LessThan,
        ),
        compiler_part_entry(
            "less-than-or-equal",
            None,
            "Compiler built-in less than or equal comparison",
            "左辺が右辺以下かを判定する組み込み関数 (<=)",
            definy_event::event::CompilerBuiltin::LessThanOrEqual,
        ),
        compiler_part_entry(
            "greater-than",
            None,
            "Compiler built-in greater than comparison",
            "左辺が右辺より大きいかを判定する組み込み関数 (>)",
            definy_event::event::CompilerBuiltin::GreaterThan,
        ),
        compiler_part_entry(
            "greater-than-or-equal",
            None,
            "Compiler built-in greater than or equal comparison",
            "左辺が右辺以上かを判定する組み込み関数 (>=)",
            definy_event::event::CompilerBuiltin::GreaterThanOrEqual,
        ),
        compiler_part_entry(
            "not-equal",
            None,
            "Compiler built-in not equal comparison",
            "値が等しくないかを判定する組み込み関数 (!=)",
            definy_event::event::CompilerBuiltin::NotEqual,
        ),
        compiler_part_entry(
            "not",
            None,
            "Compiler built-in boolean negation",
            "真偽値の否定を行う組み込み関数 (not)",
            definy_event::event::CompilerBuiltin::Not,
        ),
        compiler_part_entry(
            "and",
            None,
            "Compiler built-in boolean and",
            "真偽値の論理積を行う組み込み関数 (and)",
            definy_event::event::CompilerBuiltin::And,
        ),
        compiler_part_entry(
            "or",
            None,
            "Compiler built-in boolean or",
            "真偽値の論理和を行う組み込み関数 (or)",
            definy_event::event::CompilerBuiltin::Or,
        ),
        compiler_part_entry(
            "string-concat",
            None,
            "Compiler built-in string concatenation",
            "文字列の結合を行う組み込み関数",
            definy_event::event::CompilerBuiltin::StringConcat,
        ),
        compiler_part_entry(
            "string-length",
            None,
            "Compiler built-in string length",
            "文字列の文字数を取得する組み込み関数",
            definy_event::event::CompilerBuiltin::StringLength,
        ),
        compiler_part_entry(
            "string-slice",
            None,
            "Compiler built-in string slice",
            "文字列の部分文字列を取得する組み込み関数",
            definy_event::event::CompilerBuiltin::StringSlice,
        ),
        compiler_part_entry(
            "list-length",
            None,
            "Compiler built-in list length",
            "リストの要素数を取得する組み込み関数",
            definy_event::event::CompilerBuiltin::ListLength,
        ),
        compiler_part_entry(
            "list-concat",
            None,
            "Compiler built-in list concatenation",
            "2つのリストを結合する組み込み関数",
            definy_event::event::CompilerBuiltin::ListConcat,
        ),
        compiler_part_entry(
            "list-get",
            None,
            "Compiler built-in list item access by index",
            "リストのインデックス参照 (list-get)",
            definy_event::event::CompilerBuiltin::ListGet,
        ),
        compiler_part_entry(
            "list-append",
            None,
            "Compiler built-in list append item",
            "リストの末尾に要素を追加 (list-append)",
            definy_event::event::CompilerBuiltin::ListAppend,
        ),
        compiler_part_entry(
            "bit-and",
            None,
            "Compiler built-in bitwise AND",
            "ビット積を行う組み込み関数 (&)",
            definy_event::event::CompilerBuiltin::BitAnd,
        ),
        compiler_part_entry(
            "bit-or",
            None,
            "Compiler built-in bitwise OR",
            "ビット和を行う組み込み関数 (|)",
            definy_event::event::CompilerBuiltin::BitOr,
        ),
        compiler_part_entry(
            "bit-xor",
            None,
            "Compiler built-in bitwise XOR",
            "排他的ビット和を行う組み込み関数 (^)",
            definy_event::event::CompilerBuiltin::BitXor,
        ),
        compiler_part_entry(
            "shift-left",
            None,
            "Compiler built-in left shift",
            "左シフトを行う組み込み関数 (<<)",
            definy_event::event::CompilerBuiltin::ShiftLeft,
        ),
        compiler_part_entry(
            "shift-right",
            None,
            "Compiler built-in right shift",
            "右シフトを行う組み込み関数 (>>)",
            definy_event::event::CompilerBuiltin::ShiftRight,
        ),
    ];

    core_parts.push(crate::builtin_expression_type::create_expression_ast_part(
        &core_module_id,
    ));
    core_parts.push(crate::builtin_value_type::create_value_type_part(
        &core_module_id,
    ));
    core_parts.push(crate::builtin_type_ast::create_type_ast_part(
        &core_module_id,
    ));
    core_parts.push(crate::builtin_type_ast::create_part_definition_part(
        &core_module_id,
    ));
    core_parts.push(crate::builtin_type_ast::create_module_definition_part(
        &core_module_id,
    ));
    core_parts.push(crate::builtin_expression_type::create_eval_ast_part(
        &core_module_id,
    ));

    let core_module_commit = definy_event::event::Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(1),
        content: definy_event::event::EventContent::ModuleCommit(
            definy_event::event::ModuleCommitEvent {
                module_name: "core".into(),
                module_description: definy_event::event::Description::localized(vec![
                    ("en", "Core built-in module for definy"),
                    ("ja", "definy のコア組み込みモジュール"),
                ]),
                parent_commit_hash: None,
                message: "Initial commit for core module".into(),
                parts: core_parts,
            },
        ),
    };

    let sample_parts = vec![
        definy_event::event::ModulePartEntry {
            name: "triangle-area".into(),
            part_type: Some(definy_event::event::PartType::Number),
            description: definy_event::event::Description::localized(vec![
                ("en", "Calculate the area of a triangle (base 10, height 5)"),
                (
                    "ja",
                    "三角形の面積を計算するサンプルプログラム (底辺 10, 高さ 5)",
                ),
            ]),
            content_hash: None,
            expression: Some(definy_event::event::Expression::Let(
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
        },
        definy_event::event::ModulePartEntry {
            name: "greet".into(),
            part_type: Some(definy_event::event::PartType::String),
            description: definy_event::event::Description::localized(vec![
                ("en", "Greeting message using string concatenation"),
                ("ja", "文字列結合を使った挨拶メッセージの生成サンプル"),
            ]),
            content_hash: None,
            expression: Some(definy_event::event::Expression::StringConcat(
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
        },
        definy_event::event::ModulePartEntry {
            name: "is-even-sample".into(),
            part_type: Some(definy_event::event::PartType::String),
            description: definy_event::event::Description::localized(vec![
                (
                    "en",
                    "Check if a number is even using conditional expression",
                ),
                ("ja", "剰余算と条件分岐による偶数・奇数判定サンプル (n = 4)"),
            ]),
            content_hash: None,
            expression: Some(definy_event::event::Expression::Let(
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
        },
        definy_event::event::ModulePartEntry {
            name: "prime-numbers".into(),
            part_type: Some(definy_event::event::PartType::List(Box::new(
                definy_event::event::PartType::Number,
            ))),
            description: definy_event::event::Description::localized(vec![
                ("en", "List literal containing prime numbers"),
                ("ja", "素数のリストリテラルサンプル [2, 3, 5, 7, 11]"),
            ]),
            content_hash: None,
            expression: Some(definy_event::event::Expression::ListLiteral(
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
        },
        definy_event::event::ModulePartEntry {
            name: "option-number".into(),
            part_type: Some(definy_event::event::PartType::Type),
            description: definy_event::event::Description::localized(vec![
                ("en", "Option type for numbers (none or some(number))"),
                ("ja", "数値用の Option 型 (none または some(number))"),
            ]),
            content_hash: None,
            expression: Some(definy_event::event::Expression::TypeUnion(
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
        },
        definy_event::event::ModulePartEntry {
            name: "match-option-sample".into(),
            part_type: Some(definy_event::event::PartType::Number),
            description: definy_event::event::Description::localized(vec![
                ("en", "Pattern match sample: unwrap some(100) and add 23"),
                (
                    "ja",
                    "パターンマッチのサンプル: some(100) を分解して 23 を加算 (結果: 123)",
                ),
            ]),
            content_hash: None,
            expression: Some(definy_event::event::Expression::Match(
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
        },
        crate::builtin_expression_type::create_sample_ast_calc_part(&core_module_id),
    ];

    let sample_module_commit = definy_event::event::Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(30),
        content: definy_event::event::EventContent::ModuleCommit(
            definy_event::event::ModuleCommitEvent {
                module_name: "sample".into(),
                module_description: definy_event::event::Description::localized(vec![
                    (
                        "en",
                        "Sample programs showcasing definy expressions and computations",
                    ),
                    (
                        "ja",
                        "definy の計算式や機能を体験できるサンプルプログラム集",
                    ),
                ]),
                parent_commit_hash: None,
                message: "Initial commit for sample module".into(),
                parts: sample_parts,
            },
        ),
    };

    let std_parts = crate::builtin_std_functions::create_std_module_parts();
    let std_module_commit = definy_event::event::Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(15),
        content: definy_event::event::EventContent::ModuleCommit(
            definy_event::event::ModuleCommitEvent {
                module_name: "std".into(),
                module_description: definy_event::event::Description::localized(vec![
                    (
                        "en",
                        "Definy standard utility functions (pure math, logic, list operations)",
                    ),
                    (
                        "ja",
                        "definy の標準ユーティリティ関数群 (数学・論理・リスト操作)",
                    ),
                ]),
                parent_commit_hash: None,
                message: "Initial commit for std module".into(),
                parts: std_parts,
            },
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
                if let Some(ref expr) = part.expression {
                    if let Ok(ch) = definy_event::ContentHash::from_expression(expr) {
                        if let Ok(bytes) = serde_cbor::to_vec(expr) {
                            let _ = crate::db::save_content(db, &ch.to_string(), &bytes).await;
                        }
                    }
                }
            }
        }
    }

    Ok(())
}
