use crate::ast_builder::{call_part, fn_expr, fn_type};
use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, Description, Expression, IfExpression, LessThanOrEqualExpression,
    ListAppendExpression, ListGetExpression, ListLengthExpression, ListLiteralExpression, MatchArm,
    ModulePartEntry, NumberExpression, PartType, VariableExpression, derive_module_part_id,
};

use super::helpers::{eval_sub, val_list};

/// リスト式内の全要素の式を左から右へ動的評価して値リストを構築する関数パーツ
/// `core.eval-list-items`: `(items: list<expression>, env: env, index: number, accum: list<value>) -> list<value>`
pub fn create_eval_list_items_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let val_part_hash = derive_module_part_id(core_module_id, "value");
    let env_part_hash = derive_module_part_id(core_module_id, "env");
    let expr_type_hash = derive_module_part_id(core_module_id, "expression");
    let eval_value_hash = derive_module_part_id(core_module_id, "eval-value");
    let eval_list_items_hash = derive_module_part_id(core_module_id, "eval-list-items");

    let items = Expression::Variable(VariableExpression { variable_id: 0 });
    let env = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });
    let accum = Expression::Variable(VariableExpression { variable_id: 3 });

    let at_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(items.clone()),
        })),
        right: Box::new(index.clone()),
    });

    let current_expr = Expression::ListGet(ListGetExpression {
        list: Box::new(items.clone()),
        index: Box::new(index.clone()),
    });

    let eval_val = eval_sub(&eval_value_hash, current_expr, env.clone());

    let next_accum = Expression::ListAppend(ListAppendExpression {
        list: Box::new(accum.clone()),
        item: Box::new(eval_val),
    });

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let recurse = call_part(
        &eval_list_items_hash,
        &[
            ("items", items),
            ("env", env),
            ("index", next_index),
            ("accum", next_accum),
        ],
    );

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(accum),
        else_expr: Box::new(recurse),
    });

    ModulePartEntry {
        name: "eval-list-items".into(),
        part_type: Some(fn_type(
            &[
                (
                    "items",
                    PartType::List(Box::new(PartType::TypePart(expr_type_hash))),
                ),
                ("env", PartType::TypePart(env_part_hash)),
                ("index", PartType::Number),
                (
                    "accum",
                    PartType::List(Box::new(PartType::TypePart(val_part_hash.clone()))),
                ),
            ],
            PartType::List(Box::new(PartType::TypePart(val_part_hash))),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Evaluates expressions in a list literal into a list of dynamic values",
            ),
            (
                "ja",
                "リスト式内の各式を左から順に動的評価して値リストを構築する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(fn_expr(
            &[("items", 0), ("env", 1), ("index", 2), ("accum", 3)],
            body,
        )),
    }
}

/// 自己評価器 `core.eval-value` にリスト式の評価アームを追加します。
pub fn create_list_eval_arms(
    core_module_id: &EventHashId,
    _eval_value_hash: &EventHashId,
    arms: &mut Vec<MatchArm>,
) {
    let eval_list_items_hash = derive_module_part_id(core_module_id, "eval-list-items");

    let list_var_id = 70;
    let items_expr = Expression::Variable(VariableExpression {
        variable_id: list_var_id,
    });
    let empty_accum = Expression::ListLiteral(ListLiteralExpression { items: vec![] });

    let eval_call = call_part(
        &eval_list_items_hash,
        &[
            ("items", items_expr),
            (
                "env",
                Expression::Variable(VariableExpression { variable_id: 1 }),
            ),
            ("index", Expression::Number(NumberExpression { value: 0 })),
            ("accum", empty_accum),
        ],
    );

    arms.push(MatchArm {
        tag: "list".into(),
        variable_id: Some(list_var_id),
        variable_name: Some("items".into()),
        body: Box::new(val_list(eval_call)),
    });
}
