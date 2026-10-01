use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, CallExpression, Description, Expression, FunctionExpression, IfExpression,
    LessThanOrEqualExpression, ListGetExpression, ListLengthExpression, MatchArm, MatchExpression,
    ModulePartEntry, NumberExpression, PartReferenceExpression, PartType, TypeLiteralExpression,
    TypeLiteralItemExpression, VariableExpression, VariantExpression, derive_module_part_id,
};

/// リストリテラルの要素型を再帰的に走査し、全要素が `expected_item_type` に適合するか検査する。
/// 全走査完了時に `ok(list({ item_type: expected_item_type }))` を返却する。
/// `core.type-check-list-items`: `list<expression> -> type-env -> number -> type-ast -> type-result`
pub fn create_type_check_list_items_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_hash = derive_module_part_id(core_module_id, "expression");
    let type_env_hash = derive_module_part_id(core_module_id, "type-env");
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let type_check_hash = derive_module_part_id(core_module_id, "type-check");
    let type_assignable_hash = derive_module_part_id(core_module_id, "type-assignable");
    let check_list_items_hash = derive_module_part_id(core_module_id, "type-check-list-items");

    // 引数:
    // 0: items (list<expression>)
    // 1: env (type-env)
    // 2: index (number)
    // 3: expected_item_type (type-ast)
    let items = Expression::Variable(VariableExpression { variable_id: 0 });
    let env = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });
    let expected_item_type = Expression::Variable(VariableExpression { variable_id: 3 });

    // 1. 走査完了判定: index >= list_length(items)
    let is_done = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(items.clone()),
        })),
        right: Box::new(index.clone()),
    });

    // 走査完了時の成功値: ok(list({ item_type: expected_item_type }))
    let list_type = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(type_ast_hash.clone()),
        tag: "list".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![TypeLiteralItemExpression {
                key: "item_type".into(),
                value: Box::new(expected_item_type.clone()),
            }],
        }))),
    });
    let ok_list_result = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(type_result_hash.clone()),
        tag: "ok".into(),
        payload: Some(Box::new(list_type)),
    });

    // 2. 現在の要素の取得: current_expr = list_get(items, index)
    let current_expr = Expression::ListGet(ListGetExpression {
        list: Box::new(items.clone()),
        index: Box::new(index.clone()),
    });

    // current_expr の型検査: type-check(current_expr, env)
    let check_item = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                type_check_hash,
            ))),
            argument: Box::new(current_expr),
        })),
        argument: Box::new(env.clone()),
    });

    // 次のインデックス: index + 1
    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    // 再帰呼び出し: type-check-list-items(items, env, next_index, expected_item_type)
    let recurse_call = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                        check_list_items_hash,
                    ))),
                    argument: Box::new(items),
                })),
                argument: Box::new(env),
            })),
            argument: Box::new(next_index),
        })),
        argument: Box::new(expected_item_type.clone()),
    });

    // 要素型の一致判定: type-assignable(item_type, expected_item_type)
    let item_type_var = 10;
    let item_type_assignable = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                type_assignable_hash,
            ))),
            argument: Box::new(Expression::Variable(VariableExpression {
                variable_id: item_type_var,
            })),
        })),
        argument: Box::new(expected_item_type.clone()),
    });

    // 型不一致エラー: error(type_mismatch { expected, actual })
    let mismatch_err = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "error".into(),
        payload: Some(Box::new(Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "type_mismatch".into(),
            payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "expected".into(),
                        value: Box::new(expected_item_type),
                    },
                    TypeLiteralItemExpression {
                        key: "actual".into(),
                        value: Box::new(Expression::Variable(VariableExpression {
                            variable_id: item_type_var,
                        })),
                    },
                ],
            }))),
        }))),
    });

    let check_element_match = Expression::Match(MatchExpression {
        target: Box::new(check_item),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(item_type_var),
                variable_name: Some("item_type".into()),
                body: Box::new(Expression::If(IfExpression {
                    condition: Box::new(item_type_assignable),
                    then_expr: Box::new(recurse_call),
                    else_expr: Box::new(mismatch_err),
                })),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(11),
                variable_name: Some("err".into()),
                body: Box::new(Expression::Variant(VariantExpression {
                    type_part_definition_event_hash: None,
                    tag: "error".into(),
                    payload: Some(Box::new(Expression::Variable(VariableExpression {
                        variable_id: 11,
                    }))),
                })),
            },
        ],
        default: None,
    });

    let loop_body = Expression::If(IfExpression {
        condition: Box::new(is_done),
        then_expr: Box::new(ok_list_result),
        else_expr: Box::new(check_element_match),
    });

    ModulePartEntry {
        name: "type-check-list-items".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::List(Box::new(PartType::TypePart(expr_hash)))),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::TypePart(type_env_hash)),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::Function {
                        parameter: Box::new(PartType::TypePart(type_ast_hash)),
                        return_type: Box::new(PartType::TypePart(type_result_hash)),
                    }),
                }),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Recursively type check list items against expected element type",
            ),
            (
                "ja",
                "リストリテラルの各要素を期待される要素型に対して再帰検査",
            ),
        ]),
        content_hash: None,
        expression: Some(Expression::Function(FunctionExpression {
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
                        parameter_name: "expected_item_type".into(),
                        body: Box::new(loop_body),
                    })),
                })),
            })),
        })),
    }
}

/// リストリテラルの型推論エントリーポイント。
/// 要素が0個（空リスト）の場合は `error(cannot_infer_empty_list)` を返却し、
/// 1個以上の場合は先頭要素から型を推論して残りの要素を `core.type-check-list-items` で検証する。
/// `core.type-check-list`: `list<expression> -> type-env -> type-result`
pub fn create_type_check_list_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_hash = derive_module_part_id(core_module_id, "expression");
    let type_env_hash = derive_module_part_id(core_module_id, "type-env");
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let type_check_hash = derive_module_part_id(core_module_id, "type-check");
    let check_list_items_hash = derive_module_part_id(core_module_id, "type-check-list-items");

    // 引数:
    // 0: items (list<expression>)
    // 1: env (type-env)
    let items = Expression::Variable(VariableExpression { variable_id: 0 });
    let env = Expression::Variable(VariableExpression { variable_id: 1 });

    // 空リスト判定: list_length(items) <= 0
    let is_empty = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(items.clone()),
        })),
        right: Box::new(Expression::Number(NumberExpression { value: 0 })),
    });

    // 空リスト推論エラー: error(cannot_infer_empty_list)
    let empty_err = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "error".into(),
        payload: Some(Box::new(Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "cannot_infer_empty_list".into(),
            payload: None,
        }))),
    });

    // 先頭要素の取得: list_get(items, 0)
    let first_expr = Expression::ListGet(ListGetExpression {
        list: Box::new(items.clone()),
        index: Box::new(Expression::Number(NumberExpression { value: 0 })),
    });

    // 先頭要素の型検査: type-check(first_expr, env)
    let check_first = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                type_check_hash,
            ))),
            argument: Box::new(first_expr),
        })),
        argument: Box::new(env.clone()),
    });

    let first_type_var = 10;
    // 残り要素の検査呼び出し: type-check-list-items(items, env, 1, first_type)
    let check_rest = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                        check_list_items_hash,
                    ))),
                    argument: Box::new(items),
                })),
                argument: Box::new(env),
            })),
            argument: Box::new(Expression::Number(NumberExpression { value: 1 })),
        })),
        argument: Box::new(Expression::Variable(VariableExpression {
            variable_id: first_type_var,
        })),
    });

    let check_first_match = Expression::Match(MatchExpression {
        target: Box::new(check_first),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(first_type_var),
                variable_name: Some("first_type".into()),
                body: Box::new(check_rest),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(11),
                variable_name: Some("err".into()),
                body: Box::new(Expression::Variant(VariantExpression {
                    type_part_definition_event_hash: None,
                    tag: "error".into(),
                    payload: Some(Box::new(Expression::Variable(VariableExpression {
                        variable_id: 11,
                    }))),
                })),
            },
        ],
        default: None,
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(is_empty),
        then_expr: Box::new(empty_err),
        else_expr: Box::new(check_first_match),
    });

    ModulePartEntry {
        name: "type-check-list".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::List(Box::new(PartType::TypePart(expr_hash)))),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::TypePart(type_env_hash)),
                return_type: Box::new(PartType::TypePart(type_result_hash)),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Type check list literal expression deriving element type",
            ),
            ("ja", "リストリテラル式の要素型を推論・検証する型チェッカー"),
        ]),
        content_hash: None,
        expression: Some(Expression::Function(FunctionExpression {
            parameter_id: 0,
            parameter_name: "items".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "env".into(),
                body: Box::new(body),
            })),
        })),
    }
}

/// `check.rs` 用に `list` 式の型検査アームを生成する。
pub fn create_list_check_arms(type_check_list_hash: &EventHashId) -> Vec<MatchArm> {
    vec![MatchArm {
        tag: "list".into(),
        variable_id: Some(30),
        variable_name: Some("items".into()),
        body: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    type_check_list_hash.clone(),
                ))),
                argument: Box::new(Expression::Variable(VariableExpression { variable_id: 30 })),
            })),
            argument: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
        })),
    }]
}
