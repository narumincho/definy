//! セルフホスティングテスト用の共通ヘルパー関数および型定義。

use definy_event::event::{
    AccountId, Description, Event, EventContent, Expression, ModuleCommitEvent, ModulePartEntry,
    NumberExpression, TypeLiteralExpression, TypeLiteralItemExpression, VariantExpression,
    derive_module_id,
};
use definy_event::{EventHashId, VerifyAndDeserializeError};

pub use crate::builtin_type_checker::{empty_type_env, type_env_single_var, type_env_with_parts};

/// テスト用のダミー core モジュール ID を取得します。
pub fn get_dummy_core_id() -> EventHashId {
    EventHashId::from_bytes(&[1u8; 32])
}

/// テスト用のダミーアカウント ID と `core` モジュール ID のペアを生成します。
pub fn get_test_account_and_mod_id() -> (AccountId, EventHashId) {
    let dummy_key = ed25519_dalek::VerifyingKey::from_bytes(&[0u8; 32]).unwrap();
    let dummy_account = AccountId(dummy_key);
    let mod_id = derive_module_id(&dummy_account, "core");
    (dummy_account, mod_id)
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

/// 1引数パーツ呼び出し式 `part_ref(arg)` を構築します。
pub fn call_part1(part_hash: EventHashId, arg: Expression) -> Expression {
    Expression::Call(definy_event::event::CallExpression {
        function: Box::new(Expression::PartReference(
            definy_event::event::PartReferenceExpression::new(part_hash),
        )),
        argument: Box::new(arg),
    })
}

/// カリー化 2引数パーツ呼び出し式 `part_ref(arg1)(arg2)` を構築します。
pub fn call_part2(part_hash: EventHashId, arg1: Expression, arg2: Expression) -> Expression {
    Expression::Call(definy_event::event::CallExpression {
        function: Box::new(Expression::Call(definy_event::event::CallExpression {
            function: Box::new(Expression::PartReference(
                definy_event::event::PartReferenceExpression::new(part_hash),
            )),
            argument: Box::new(arg1),
        })),
        argument: Box::new(arg2),
    })
}

/// カリー化 3引数パーツ呼び出し式 `part_ref(arg1)(arg2)(arg3)` を構築します。
pub fn call_part3(
    part_hash: EventHashId,
    arg1: Expression,
    arg2: Expression,
    arg3: Expression,
) -> Expression {
    Expression::Call(definy_event::event::CallExpression {
        function: Box::new(call_part2(part_hash, arg1, arg2)),
        argument: Box::new(arg3),
    })
}

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
pub fn all_type_checker_parts(mod_id: &EventHashId) -> Vec<ModulePartEntry> {
    vec![
        crate::builtin_type_checker::create_type_error_part(mod_id),
        crate::builtin_type_checker::create_type_result_part(mod_id),
        crate::builtin_type_checker::create_type_env_part(mod_id),
        crate::builtin_type_checker::create_type_env_lookup_part(mod_id),
        crate::builtin_type_checker::create_type_env_lookup_inner_part(mod_id),
        crate::builtin_type_checker::create_type_env_extend_part(mod_id),
        crate::builtin_type_checker::create_part_type_env_part(mod_id),
        crate::builtin_type_checker::create_part_type_lookup_part(mod_id),
        crate::builtin_type_checker::create_part_type_lookup_inner_part(mod_id),
        crate::builtin_type_checker::create_type_env_lookup_part_part(mod_id),
        crate::builtin_type_checker::create_type_equals_part(mod_id),
        crate::builtin_type_checker::create_type_equals_record_fields_part(mod_id),
        crate::builtin_type_checker::create_type_equals_union_variants_part(mod_id),
        crate::builtin_type_checker::create_record_field_type_lookup_part(mod_id),
        crate::builtin_type_checker::create_type_check_record_fields_part(mod_id),
        crate::builtin_type_checker::create_type_assignable_record_fields_part(mod_id),
        crate::builtin_type_checker::create_union_variant_type_lookup_part(mod_id),
        crate::builtin_type_checker::create_find_tag_in_arms_part(mod_id),
        crate::builtin_type_checker::create_check_union_exhaustiveness_part(mod_id),
        crate::builtin_type_checker::create_type_assignable_union_variants_part(mod_id),
        crate::builtin_type_checker::create_type_check_match_arms_inner_part(mod_id),
        crate::builtin_type_checker::create_type_check_match_arms_part(mod_id),
        crate::builtin_type_checker::create_type_check_list_items_part(mod_id),
        crate::builtin_type_checker::create_type_check_list_part(mod_id),
        crate::builtin_type_checker::create_type_assignable_part(mod_id),
        crate::builtin_type_checker::create_type_check_part(mod_id),
        crate::builtin_type_checker::create_type_check_against_part(mod_id),
    ]
}

/// 汎用自己評価器 `core.eval-value` および `core.value-equals` が必要とする全パーツを返却します。
pub fn all_evaluator_parts(mod_id: &EventHashId) -> Vec<ModulePartEntry> {
    vec![
        crate::builtin_value_type::create_value_type_part(mod_id),
        crate::builtin_value_type::create_env_type_part(mod_id),
        crate::builtin_value_type::create_env_lookup_part(mod_id),
        crate::builtin_value_type::create_env_lookup_inner_part(mod_id),
        crate::builtin_value_type::create_env_extend_part(mod_id),
        crate::builtin_value_type::create_value_equals_part(mod_id),
        crate::builtin_value_type::create_value_equals_record_fields_part(mod_id),
        crate::builtin_value_type::create_value_equals_list_items_part(mod_id),
        crate::builtin_evaluator::create_record_field_lookup_part(mod_id),
        crate::builtin_evaluator::create_eval_record_fields_part(mod_id),
        crate::builtin_evaluator::create_eval_list_items_part(mod_id),
        crate::builtin_eval_match::create_eval_match_arms_part(mod_id),
        crate::builtin_eval_match::create_eval_match_arms_inner_part(mod_id),
        crate::builtin_evaluator::create_eval_value_part(mod_id),
    ]
}

/// 自己検証器 `core.validate-module`, `core.validate-part` 等が必要とする全パーツを返却します。
pub fn all_validator_parts(mod_id: &EventHashId) -> Vec<ModulePartEntry> {
    vec![
        crate::builtin_validator::create_collect_part_type_env_inner_part(mod_id),
        crate::builtin_validator::create_collect_part_type_env_part(mod_id),
        crate::builtin_validator::create_validate_part_in_env_part(mod_id),
        crate::builtin_validator::create_validate_part_part(mod_id),
        crate::builtin_validator::create_validate_parts_in_env_part(mod_id),
        crate::builtin_validator::create_validate_parts_part(mod_id),
        crate::builtin_validator::create_validate_module_part(mod_id),
    ]
}
