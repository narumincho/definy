//! definy AST の `match` 式パターンマッチ自己評価ヘルパーを定義するモジュール。
//!
//! `core.eval-match-arms` および `core.eval-match-arms-inner`:
//! 与えられたパターンアーム一覧 (`arms`) を先頭から走査し、対象バリアントのタグと一致するアームを
//! 検出して、その変数を束縛した環境上で本体式を `core.eval-value` で解釈実行します。

use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, CallExpression, Description, EqualExpression, Expression, FunctionExpression,
    IfExpression, LessThanOrEqualExpression, ListGetExpression, ListLengthExpression,
    ModulePartEntry, NumberExpression, PartReferenceExpression, PartType, RecordGetExpression,
    VariableExpression, VariantExpression, derive_module_part_id,
};

/// `core.eval-match-arms`:
/// `arms -> target_tag -> target_payload -> env -> value`
///
/// パターンマッチアームのリストを先頭 (インデックス 0) から走査開始するエントリーポイントです。
pub fn create_eval_match_arms_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let val_part_hash = derive_module_part_id(core_module_id, "value");
    let env_part_hash = derive_module_part_id(core_module_id, "env");
    let match_arms_inner_hash = derive_module_part_id(core_module_id, "eval-match-arms-inner");

    // eval-match-arms(arms)(target_tag)(target_payload)(env)
    // = eval-match-arms-inner(arms)(target_tag)(target_payload)(env)(0)
    let body = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "arms".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "target_tag".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 2,
                parameter_name: "target_payload".into(),
                body: Box::new(Expression::Function(FunctionExpression {
                    parameter_id: 3,
                    parameter_name: "env".into(),
                    body: Box::new(Expression::Call(CallExpression {
                        function: Box::new(Expression::Call(CallExpression {
                            function: Box::new(Expression::Call(CallExpression {
                                function: Box::new(Expression::Call(CallExpression {
                                    function: Box::new(Expression::Call(CallExpression {
                                        function: Box::new(Expression::PartReference(
                                            PartReferenceExpression::new(match_arms_inner_hash),
                                        )),
                                        argument: Box::new(Expression::Variable(
                                            VariableExpression { variable_id: 0 },
                                        )),
                                    })),
                                    argument: Box::new(Expression::Variable(VariableExpression {
                                        variable_id: 1,
                                    })),
                                })),
                                argument: Box::new(Expression::Variable(VariableExpression {
                                    variable_id: 2,
                                })),
                            })),
                            argument: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 3,
                            })),
                        })),
                        argument: Box::new(Expression::Number(NumberExpression { value: 0 })),
                    })),
                })),
            })),
        })),
    });

    ModulePartEntry {
        name: "eval-match-arms".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(derive_module_part_id(
                core_module_id,
                "expression",
            ))),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::String),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::TypePart(val_part_hash.clone())),
                    return_type: Box::new(PartType::Function {
                        parameter: Box::new(PartType::TypePart(env_part_hash)),
                        return_type: Box::new(PartType::TypePart(val_part_hash)),
                    }),
                }),
            }),
        }),
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

    // recurse: eval-match-arms-inner(arms)(target_tag)(target_payload)(env)(idx + 1)
    let recurse_next = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::Call(CallExpression {
                        function: Box::new(Expression::PartReference(
                            PartReferenceExpression::new(match_arms_inner_hash),
                        )),
                        argument: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 0,
                        })),
                    })),
                    argument: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                })),
                argument: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
            })),
            argument: Box::new(Expression::Variable(VariableExpression { variable_id: 3 })),
        })),
        argument: Box::new(Expression::Add(AddExpression {
            left: Box::new(Expression::Variable(VariableExpression { variable_id: 4 })),
            right: Box::new(Expression::Number(NumberExpression { value: 1 })),
        })),
    });

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

    // extended_env = env-extend(env)(arm.variable_id)(target_payload)
    let extended_env = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    env_extend_hash,
                ))),
                argument: Box::new(Expression::Variable(VariableExpression { variable_id: 3 })),
            })),
            argument: Box::new(current_arm_var_id),
        })),
        argument: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
    });

    // evaluated_body = eval-value(arm.body)(extended_env)
    let evaluated_body = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                eval_value_hash,
            ))),
            argument: Box::new(current_arm_body),
        })),
        argument: Box::new(extended_env),
    });

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

    let body = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "arms".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "target_tag".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 2,
                parameter_name: "target_payload".into(),
                body: Box::new(Expression::Function(FunctionExpression {
                    parameter_id: 3,
                    parameter_name: "env".into(),
                    body: Box::new(Expression::Function(FunctionExpression {
                        parameter_id: 4,
                        parameter_name: "idx".into(),
                        body: Box::new(body_inner),
                    })),
                })),
            })),
        })),
    });

    ModulePartEntry {
        name: "eval-match-arms-inner".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(derive_module_part_id(
                core_module_id,
                "expression",
            ))),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::String),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::TypePart(val_part_hash.clone())),
                    return_type: Box::new(PartType::Function {
                        parameter: Box::new(PartType::TypePart(env_part_hash)),
                        return_type: Box::new(PartType::Function {
                            parameter: Box::new(PartType::Number),
                            return_type: Box::new(PartType::TypePart(val_part_hash)),
                        }),
                    }),
                }),
            }),
        }),
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
