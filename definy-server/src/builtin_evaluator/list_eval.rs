use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, CallExpression, Description, Expression, FunctionExpression, IfExpression,
    LessThanOrEqualExpression, ListAppendExpression, ListGetExpression, ListLengthExpression,
    ListLiteralExpression, MatchArm, ModulePartEntry, NumberExpression, PartReferenceExpression,
    PartType, VariableExpression, derive_module_part_id,
};

use super::helpers::{eval_sub, val_list};

/// リスト式内の全要素の式を左から右へ動的評価して値リストを構築する関数パーツ
/// `core.eval-list-items`: `list<expression> -> env -> number -> list<value> -> list<value>`
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

    let recurse = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                        eval_list_items_hash,
                    ))),
                    argument: Box::new(items),
                })),
                argument: Box::new(env),
            })),
            argument: Box::new(next_index),
        })),
        argument: Box::new(next_accum),
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(accum),
        else_expr: Box::new(recurse),
    });

    let main_expr = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "items".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "env".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 2,
                parameter_name: "index".into(),
                body: Box::new(Expression::Function(FunctionExpression {
                    parameter_id: 3,
                    parameter_name: "accum".into(),
                    body: Box::new(body),
                })),
            })),
        })),
    });

    ModulePartEntry {
        name: "eval-list-items".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::List(Box::new(PartType::TypePart(expr_type_hash)))),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::TypePart(env_part_hash)),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::Function {
                        parameter: Box::new(PartType::List(Box::new(PartType::TypePart(
                            val_part_hash.clone(),
                        )))),
                        return_type: Box::new(PartType::List(Box::new(PartType::TypePart(
                            val_part_hash,
                        )))),
                    }),
                }),
            }),
        }),
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
        expression: Some(main_expr),
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

    let eval_call = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                        eval_list_items_hash,
                    ))),
                    argument: Box::new(items_expr),
                })),
                argument: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            })),
            argument: Box::new(Expression::Number(NumberExpression { value: 0 })),
        })),
        argument: Box::new(empty_accum),
    });

    arms.push(MatchArm {
        tag: "list".into(),
        variable_id: Some(list_var_id),
        variable_name: Some("items".into()),
        body: Box::new(val_list(eval_call)),
    });
}
