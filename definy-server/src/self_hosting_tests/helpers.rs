//! セルフホスティングテスト用の共通ヘルパー関数および型定義。

use definy_event::event::{
    AccountId, Description, Event, EventContent, Expression, ModuleCommitEvent, ModulePartEntry,
    NumberExpression, TypeLiteralExpression, TypeLiteralItemExpression, VariantExpression,
    derive_module_id,
};
use definy_event::{EventHashId, VerifyAndDeserializeError};

pub use super::type_helpers::{empty_type_env, type_env_single_var, type_env_with_parts};

/// ビルトインシステムアカウント ID と、その `core` モジュール ID のペアを返します。
pub fn get_test_account_and_mod_id() -> (AccountId, EventHashId) {
    let account = crate::seed::builtin_system_account_id();
    let mod_id = derive_module_id(&account, "core");
    (account, mod_id)
}

/// 正本の seed JSON（`seeds/*.json`）からビルトインパーツ定義を名前で取得します。
pub fn seed_part(name: &str) -> ModulePartEntry {
    crate::seed::find_builtin_part(name)
        .unwrap_or_else(|| panic!("builtin part `{name}` not found in seeds"))
        .clone()
}

/// 式評価器 `evaluate_expression` に渡すための署名検証済みイベント列の型エイリアス。
pub type TestEvents = Vec<(
    EventHashId,
    Result<(ed25519_dalek::Signature, Event), VerifyAndDeserializeError>,
)>;

/// 指定されたパーツ一覧を含むダミーの `ModuleCommitEvent` を作成し、評価器で直接使えるイベント列として返却します。
pub fn create_test_module_events(
    account: AccountId,
    parts: Vec<ModulePartEntry>,
    commit_id_byte: u8,
) -> TestEvents {
    let event = Event {
        account_id: account,
        time: chrono::DateTime::UNIX_EPOCH,
        content: EventContent::ModuleCommit(ModuleCommitEvent {
            module_name: "core".into(),
            module_description: Description::Plain("".into()),
            parent_commit_hash: None,
            message: "Self-hosting test".into(),
            parts,
        }),
    };
    let dummy_sig = ed25519_dalek::Signature::from_bytes(&[0u8; 64]);
    let commit_hash = EventHashId::from_bytes(&[commit_id_byte; 32]);
    vec![(commit_hash, Ok((dummy_sig, event)))]
}

/// `core.expression` 型の数値リテラル AST (`number(val)`) を構築します。
pub fn ast_num(val: i64, expr_type_hash: Option<EventHashId>) -> Expression {
    Expression::Variant(VariantExpression {
        tag: "number".into(),
        payload: Some(Box::new(Expression::Number(NumberExpression {
            value: val,
        }))),
        type_part_definition_event_hash: expr_type_hash,
    })
}

/// `core.expression` 型の加算 AST (`add({ left, right })`) を構築します。
pub fn ast_add(
    left: Expression,
    right: Expression,
    expr_type_hash: Option<EventHashId>,
) -> Expression {
    Expression::Variant(VariantExpression {
        tag: "add".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "left".into(),
                    value: Box::new(left),
                },
                TypeLiteralItemExpression {
                    key: "right".into(),
                    value: Box::new(right),
                },
            ],
        }))),
        type_part_definition_event_hash: expr_type_hash,
    })
}

/// `core.expression` 型の乗算 AST (`multiply({ left, right })`) を構築します。
pub fn ast_mul(
    left: Expression,
    right: Expression,
    expr_type_hash: Option<EventHashId>,
) -> Expression {
    Expression::Variant(VariantExpression {
        tag: "multiply".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "left".into(),
                    value: Box::new(left),
                },
                TypeLiteralItemExpression {
                    key: "right".into(),
                    value: Box::new(right),
                },
            ],
        }))),
        type_part_definition_event_hash: expr_type_hash,
    })
}

#[allow(unused_imports)]
pub use crate::ast_builder::{call_expr, call_part, fn_expr, fn_type};

/// 式評価結果の `Value::List` (数値リスト) からバイト列 `Vec<u8>` を抽出します。
pub fn value_list_to_u8_vec(val: definy_core::Value) -> Vec<u8> {
    match val {
        definy_core::Value::List(bytes) => bytes
            .into_iter()
            .map(|v| match v {
                definy_core::Value::Number(n) => n as u8,
                other => panic!(
                    "Expected Number byte in generated wasm list, got: {:?}",
                    other
                ),
            })
            .collect(),
        other => panic!("Expected List of bytes, got: {:?}", other),
    }
}

/// テスト用 `core.value` の数値バリアント式を構築します。
pub fn test_val_num(n: i64) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "number".into(),
        payload: Some(Box::new(Expression::Number(NumberExpression { value: n }))),
    })
}

/// テスト用 `core.value` の文字列バリアント式を構築します。
pub fn test_val_str(s: &str) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "string".into(),
        payload: Some(Box::new(Expression::String(
            definy_event::event::StringExpression { value: s.into() },
        ))),
    })
}

/// テスト用 `core.value` の真偽値バリアント式を構築します。
pub fn test_val_bool(b: bool) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "boolean".into(),
        payload: Some(Box::new(Expression::Boolean(
            definy_event::event::BooleanExpression { value: b },
        ))),
    })
}

/// 自己記述型チェッカーが必要とする全パーツ（レコード、直和型、リスト、基本演算）を返却します。
pub fn all_type_checker_parts() -> Vec<ModulePartEntry> {
    vec![
        seed_part("type-error"),
        seed_part("type-result"),
        seed_part("type-env"),
        seed_part("type-env-lookup"),
        seed_part("type-env-lookup-inner"),
        seed_part("type-env-extend"),
        seed_part("part-type-env"),
        seed_part("part-type-lookup"),
        seed_part("part-type-lookup-inner"),
        seed_part("type-env-lookup-part"),
        seed_part("type-equals"),
        seed_part("type-equals-function-parameters"),
        seed_part("type-equals-record-fields"),
        seed_part("type-equals-union-variants"),
        seed_part("record-field-type-lookup"),
        seed_part("type-check-record-fields"),
        seed_part("type-assignable-record-fields"),
        seed_part("type-assignable-function-parameters"),
        seed_part("union-variant-type-lookup"),
        seed_part("find-tag-in-arms"),
        seed_part("check-union-exhaustiveness"),
        seed_part("type-assignable-union-variants"),
        seed_part("type-check-match-arms-inner"),
        seed_part("type-check-match-arms"),
        seed_part("type-check-list-items"),
        seed_part("type-check-list"),
        seed_part("type-assignable"),
        seed_part("type-check"),
        seed_part("list-contains-string"),
        seed_part("type-check-type-record-fields"),
        seed_part("type-check-type-union-variants"),
        seed_part("type-check-type-function-parameters"),
        seed_part("type-check-call-arguments"),
        seed_part("type-check-function"),
        seed_part("type-check-against"),
    ]
}

/// 汎用自己評価器 `core.eval-value` および `core.value-equals` が必要とする全パーツを返却します。
pub fn all_evaluator_parts() -> Vec<ModulePartEntry> {
    vec![
        seed_part("value"),
        seed_part("env"),
        seed_part("env-lookup"),
        seed_part("env-lookup-inner"),
        seed_part("env-extend"),
        seed_part("value-equals"),
        seed_part("value-equals-record-fields"),
        seed_part("value-equals-list-items"),
        seed_part("record-field-lookup"),
        seed_part("eval-record-fields"),
        seed_part("eval-list-items"),
        seed_part("eval-match-arms"),
        seed_part("eval-match-arms-inner"),
        seed_part("eval-call-arguments"),
        seed_part("eval-value"),
    ]
}

/// 自己検証器 `core.validate-module`, `core.validate-part` 等が必要とする全パーツを返却します。
pub fn all_validator_parts() -> Vec<ModulePartEntry> {
    vec![
        seed_part("collect-part-type-env-inner"),
        seed_part("collect-part-type-env"),
        seed_part("validate-part-in-env"),
        seed_part("validate-part"),
        seed_part("validate-parts-in-env"),
        seed_part("validate-parts"),
        seed_part("validate-module"),
    ]
}
