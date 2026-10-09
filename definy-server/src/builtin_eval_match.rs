//! definy AST の `match` 式パターンマッチ自己評価ヘルパーを定義するモジュール。
//!
//! `core.eval-match-arms` および `core.eval-match-arms-inner`:
//! 与えられたパターンアーム一覧 (`arms`) を先頭から走査し、対象バリアントのタグと一致するアームを
//! 検出して、その変数を束縛した環境上で本体式を `core.eval-value` で解釈実行します。

use crate::ast_builder::{call_part, fn_expr, fn_type};
use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, Description, EqualExpression, Expression, IfExpression,
    LessThanOrEqualExpression, ListGetExpression, ListLengthExpression, ModulePartEntry,
    NumberExpression, PartType, RecordGetExpression, VariableExpression, VariantExpression,
    derive_module_part_id,
};

/// `core.eval-match-arms`:
/// `(arms: expression, target_tag: String, target_payload: value, env: env) -> value`
///
/// パターンマッチアームのリストを先頭 (インデックス 0) から走査開始するエントリーポイントです。
pub fn create_eval_match_arms_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let val_part_hash = derive_module_part_id(core_module_id, "value");
    let env_part_hash = derive_module_part_id(core_module_id, "env");
    let match_arms_inner_hash = derive_module_part_id(core_module_id, "eval-match-arms-inner");

    let call_inner = call_part(
        &match_arms_inner_hash,
        &[
            (
                "arms",
                Expression::Variable(VariableExpression { variable_id: 0 }),
            ),
            (
                "target_tag",
                Expression::Variable(VariableExpression { variable_id: 1 }),
            ),
            (
                "target_payload",
                Expression::Variable(VariableExpression { variable_id: 2 }),
            ),
            (
                "env",
                Expression::Variable(VariableExpression { variable_id: 3 }),
            ),
            ("idx", Expression::Number(NumberExpression { value: 0 })),
        ],
    );

    let body = fn_expr(
        &[
            ("arms", 0),
            ("target_tag", 1),
            ("target_payload", 2),
            ("env", 3),
        ],
        call_inner,
    );

    ModulePartEntry {
        name: "eval-match-arms".into(),
        part_type: Some(fn_type(
            &[
                (
                    "arms",
                    PartType::TypePart(derive_module_part_id(core_module_id, "expression")),
                ),
                ("target_tag", PartType::String),
                ("target_payload", PartType::TypePart(val_part_hash.clone())),
                ("env", PartType::TypePart(env_part_hash)),
            ],
            PartType::TypePart(val_part_hash),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Evaluate pattern match arms sequentially for self-hosted evaluator",
            ),
            (
                "ja",
                "自己評価器用: パターンマッチアームを先頭から順に走査・解釈実行",
            ),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// `core.eval-match-arms-inner`:
/// `arms -> target_tag -> target_payload -> env -> idx -> value`
///
/// インデックス再帰によりアームを順番に探索し、合致するアームの body を拡張環境で評価します。
pub fn create_eval_match_arms_inner_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let val_part_hash = derive_module_part_id(core_module_id, "value");
    let env_part_hash = derive_module_part_id(core_module_id, "env");
    let env_extend_hash = derive_module_part_id(core_module_id, "env-extend");
    let eval_value_hash = derive_module_part_id(core_module_id, "eval-value");
    let match_arms_inner_hash = derive_module_part_id(core_module_id, "eval-match-arms-inner");

    let val_unit = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "unit".into(),
        payload: None,
    });

    // recurse: eval-match-arms-inner(arms, target_tag, target_payload, env, idx + 1)
    let recurse_next = call_part(
        &match_arms_inner_hash,
        &[
            (
                "arms",
                Expression::Variable(VariableExpression { variable_id: 0 }),
            ),
            (
                "target_tag",
                Expression::Variable(VariableExpression { variable_id: 1 }),
            ),
            (
                "target_payload",
                Expression::Variable(VariableExpression { variable_id: 2 }),
            ),
            (
                "env",
                Expression::Variable(VariableExpression { variable_id: 3 }),
            ),
            (
                "idx",
                Expression::Add(AddExpression {
                    left: Box::new(Expression::Variable(VariableExpression { variable_id: 4 })),
                    right: Box::new(Expression::Number(NumberExpression { value: 1 })),
                }),
            ),
        ],
    );

    // current arm = list_get(arms, idx)
    let current_arm = Expression::ListGet(ListGetExpression {
        list: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
        index: Box::new(Expression::Variable(VariableExpression { variable_id: 4 })),
    });

    let current_arm_tag = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_arm.clone()),
        key: "tag".into(),
    });

    let current_arm_var_id = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_arm.clone()),
        key: "variable_id".into(),
    });

    let current_arm_body = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_arm),
        key: "body".into(),
    });

    // extended_env = env-extend(env, arm.variable_id, target_payload)
    let extended_env = call_part(
        &env_extend_hash,
        &[
            (
                "env",
                Expression::Variable(VariableExpression { variable_id: 3 }),
            ),
            ("var_id", current_arm_var_id),
            (
                "val",
                Expression::Variable(VariableExpression { variable_id: 2 }),
            ),
        ],
    );

    // evaluated_body = eval-value(arm.body, extended_env)
    let evaluated_body = call_part(
        &eval_value_hash,
        &[("expr", current_arm_body), ("env", extended_env)],
    );

    // If idx >= list_length(arms) => unit
    // Else if arm.tag == target_tag => evaluated_body
    // Else => recurse_next
    let body_inner = Expression::If(IfExpression {
        condition: Box::new(Expression::LessThanOrEqual(LessThanOrEqualExpression {
            left: Box::new(Expression::ListLength(ListLengthExpression {
                value: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
            })),
            right: Box::new(Expression::Variable(VariableExpression { variable_id: 4 })),
        })),
        then_expr: Box::new(val_unit),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(Expression::Equal(EqualExpression {
                left: Box::new(current_arm_tag),
                right: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            })),
            then_expr: Box::new(evaluated_body),
            else_expr: Box::new(recurse_next),
        })),
    });

    let body = fn_expr(
        &[
            ("arms", 0),
            ("target_tag", 1),
            ("target_payload", 2),
            ("env", 3),
            ("idx", 4),
        ],
        body_inner,
    );

    ModulePartEntry {
        name: "eval-match-arms-inner".into(),
        part_type: Some(fn_type(
            &[
                (
                    "arms",
                    PartType::TypePart(derive_module_part_id(core_module_id, "expression")),
                ),
                ("target_tag", PartType::String),
                ("target_payload", PartType::TypePart(val_part_hash.clone())),
                ("env", PartType::TypePart(env_part_hash)),
                ("idx", PartType::Number),
            ],
            PartType::TypePart(val_part_hash),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Inner recursive helper for pattern match arms evaluation",
            ),
            ("ja", "パターンマッチアーム走査評価の内部再帰ヘルパー"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}
