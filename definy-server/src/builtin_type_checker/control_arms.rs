use definy_event::EventHashId;
use definy_event::event::{
    Expression, IfExpression, MatchArm, MatchExpression, NumberExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, VariableExpression, VariantExpression,
};

use super::helpers::{
    call_part, check_sub, error_mismatch, error_not_a_function, error_unknown, error_value,
    ok_type, record_get, type_bool,
};

/// 関数適用 (call)、変数参照 (variable)、条件分岐 (if)、let 束縛 (let)、パーツ参照 (part_reference) の型検査 MatchArm リストを生成します。
pub fn create_control_check_arms(
    type_check_hash: &EventHashId,
    type_check_against_hash: &EventHashId,
    type_check_call_arguments_hash: &EventHashId,
    type_assignable_hash: &EventHashId,
    type_equals_hash: &EventHashId,
    type_env_lookup_hash: &EventHashId,
    type_env_extend_hash: &EventHashId,
    type_env_lookup_part_hash: &EventHashId,
) -> Vec<MatchArm> {
    let _ = type_check_against_hash;
    let _ = type_assignable_hash;
    let mut arms = Vec::new();

    // 1. Function application: call({ function, arguments })
    {
        let call_var_id = 56;
        let function_expr = record_get(
            Expression::Variable(VariableExpression {
                variable_id: call_var_id,
            }),
            "function",
        );
        let arguments_expr = record_get(
            Expression::Variable(VariableExpression {
                variable_id: call_var_id,
            }),
            "arguments",
        );
        let function_check = check_sub(
            type_check_hash,
            function_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let function_type_var_id = 57;
        let function_type = Expression::Variable(VariableExpression {
            variable_id: function_type_var_id,
        });
        let parameters = record_get(
            Expression::Variable(VariableExpression { variable_id: 58 }),
            "parameters",
        );
        let return_type = record_get(
            Expression::Variable(VariableExpression { variable_id: 58 }),
            "return_type",
        );
        let check_call_args = call_part(
            type_check_call_arguments_hash,
            &[
                ("parameters", parameters),
                ("arguments", arguments_expr),
                (
                    "env",
                    Expression::Variable(VariableExpression { variable_id: 1 }),
                ),
                ("index", Expression::Number(NumberExpression { value: 0 })),
                ("return_type", return_type),
            ],
        );
        let function_type_match = Expression::Match(MatchExpression {
            target: Box::new(function_type.clone()),
            arms: vec![MatchArm {
                tag: "function".into(),
                variable_id: Some(58),
                variable_name: Some("function_type".into()),
                body: Box::new(check_call_args),
            }],
            default: Some(Box::new(error_not_a_function(function_type))),
        });
        arms.push(MatchArm {
            tag: "call".into(),
            variable_id: Some(call_var_id),
            variable_name: Some("call_expr".into()),
            body: Box::new(Expression::Match(MatchExpression {
                target: Box::new(function_check),
                arms: vec![
                    MatchArm {
                        tag: "ok".into(),
                        variable_id: Some(function_type_var_id),
                        variable_name: Some("function_type".into()),
                        body: Box::new(function_type_match),
                    },
                    MatchArm {
                        tag: "error".into(),
                        variable_id: Some(61),
                        variable_name: Some("function_error".into()),
                        body: Box::new(error_value(Expression::Variable(VariableExpression {
                            variable_id: 61,
                        }))),
                    },
                ],
                default: Some(Box::new(error_unknown())),
            })),
        });
    }

    // 2. Variable lookup: variable({ variable_id })
    {
        let var_payload_id = 20;
        let target_var_id = record_get(
            Expression::Variable(VariableExpression {
                variable_id: var_payload_id,
            }),
            "variable_id",
        );
        let lookup_call = call_part(
            type_env_lookup_hash,
            &[
                (
                    "env",
                    Expression::Variable(VariableExpression { variable_id: 1 }),
                ),
                ("var_id", target_var_id),
            ],
        );

        arms.push(MatchArm {
            tag: "variable".into(),
            variable_id: Some(var_payload_id),
            variable_name: Some("var".into()),
            body: Box::new(lookup_call),
        });
    }

    // 3. Conditional: if({ condition, then_expr, else_expr })
    {
        let if_var_id = 21;
        let cond_expr = record_get(
            Expression::Variable(VariableExpression {
                variable_id: if_var_id,
            }),
            "condition",
        );
        let then_sub = record_get(
            Expression::Variable(VariableExpression {
                variable_id: if_var_id,
            }),
            "then_expr",
        );
        let else_sub = record_get(
            Expression::Variable(VariableExpression {
                variable_id: if_var_id,
            }),
            "else_expr",
        );

        let check_c = check_sub(
            type_check_hash,
            cond_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let check_t = check_sub(
            type_check_hash,
            then_sub,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let check_e = check_sub(
            type_check_hash,
            else_sub,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );

        let t_type_var = 51;
        let e_type_var = 52;

        let check_branch_types = Expression::Match(MatchExpression {
            target: Box::new(check_t),
            arms: vec![
                MatchArm {
                    tag: "ok".into(),
                    variable_id: Some(t_type_var),
                    variable_name: Some("t_ok".into()),
                    body: Box::new(Expression::Match(MatchExpression {
                        target: Box::new(check_e),
                        arms: vec![
                            MatchArm {
                                tag: "ok".into(),
                                variable_id: Some(e_type_var),
                                variable_name: Some("e_ok".into()),
                                body: Box::new(Expression::If(IfExpression {
                                    condition: Box::new(call_part(
                                        type_equals_hash,
                                        &[
                                            (
                                                "t1",
                                                Expression::Variable(VariableExpression {
                                                    variable_id: t_type_var,
                                                }),
                                            ),
                                            (
                                                "t2",
                                                Expression::Variable(VariableExpression {
                                                    variable_id: e_type_var,
                                                }),
                                            ),
                                        ],
                                    )),
                                    then_expr: Box::new(ok_type(Expression::Variable(
                                        VariableExpression {
                                            variable_id: t_type_var,
                                        },
                                    ))),
                                    else_expr: Box::new(error_mismatch(
                                        Expression::Variable(VariableExpression {
                                            variable_id: t_type_var,
                                        }),
                                        Expression::Variable(VariableExpression {
                                            variable_id: e_type_var,
                                        }),
                                    )),
                                })),
                            },
                            MatchArm {
                                tag: "error".into(),
                                variable_id: Some(53),
                                variable_name: Some("err".into()),
                                body: Box::new(error_value(Expression::Variable(
                                    VariableExpression { variable_id: 53 },
                                ))),
                            },
                        ],
                        default: None,
                    })),
                },
                MatchArm {
                    tag: "error".into(),
                    variable_id: Some(54),
                    variable_name: Some("err".into()),
                    body: Box::new(error_value(Expression::Variable(VariableExpression {
                        variable_id: 54,
                    }))),
                },
            ],
            default: None,
        });

        let cond_match = Expression::Match(MatchExpression {
            target: Box::new(check_c),
            arms: vec![
                MatchArm {
                    tag: "ok".into(),
                    variable_id: Some(50),
                    variable_name: Some("c_ok".into()),
                    body: Box::new(Expression::If(IfExpression {
                        condition: Box::new(call_part(
                            type_equals_hash,
                            &[
                                (
                                    "t1",
                                    Expression::Variable(VariableExpression { variable_id: 50 }),
                                ),
                                ("t2", type_bool()),
                            ],
                        )),
                        then_expr: Box::new(check_branch_types),
                        else_expr: Box::new(error_value(Expression::Variant(VariantExpression {
                            type_part_definition_event_hash: None,
                            tag: "condition_not_boolean".into(),
                            payload: Some(Box::new(Expression::TypeLiteral(
                                TypeLiteralExpression {
                                    items: vec![TypeLiteralItemExpression {
                                        key: "actual".into(),
                                        value: Box::new(Expression::Variable(VariableExpression {
                                            variable_id: 50,
                                        })),
                                    }],
                                },
                            ))),
                        }))),
                    })),
                },
                MatchArm {
                    tag: "error".into(),
                    variable_id: Some(55),
                    variable_name: Some("err".into()),
                    body: Box::new(error_value(Expression::Variable(VariableExpression {
                        variable_id: 55,
                    }))),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "if".into(),
            variable_id: Some(if_var_id),
            variable_name: Some("if_e".into()),
            body: Box::new(cond_match),
        });
    }

    // 4. Let binding: let({ variable_id, value, body })
    {
        let let_var_id = 49;
        let var_id_sub = record_get(
            Expression::Variable(VariableExpression {
                variable_id: let_var_id,
            }),
            "variable_id",
        );
        let val_sub = record_get(
            Expression::Variable(VariableExpression {
                variable_id: let_var_id,
            }),
            "value",
        );
        let body_sub = record_get(
            Expression::Variable(VariableExpression {
                variable_id: let_var_id,
            }),
            "body",
        );

        let check_val = check_sub(
            type_check_hash,
            val_sub,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let val_ok_var = 50;

        let extended_env = call_part(
            type_env_extend_hash,
            &[
                (
                    "env",
                    Expression::Variable(VariableExpression { variable_id: 1 }),
                ),
                ("var_id", var_id_sub),
                (
                    "var_type",
                    Expression::Variable(VariableExpression {
                        variable_id: val_ok_var,
                    }),
                ),
            ],
        );

        let check_body = check_sub(type_check_hash, body_sub, extended_env);

        let let_match = Expression::Match(MatchExpression {
            target: Box::new(check_val),
            arms: vec![
                MatchArm {
                    tag: "ok".into(),
                    variable_id: Some(val_ok_var),
                    variable_name: Some("v_t".into()),
                    body: Box::new(check_body),
                },
                MatchArm {
                    tag: "error".into(),
                    variable_id: Some(51),
                    variable_name: Some("err".into()),
                    body: Box::new(error_value(Expression::Variable(VariableExpression {
                        variable_id: 51,
                    }))),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "let".into(),
            variable_id: Some(let_var_id),
            variable_name: Some("let_e".into()),
            body: Box::new(let_match),
        });
    }

    // 5. Part reference lookup: part_reference({ part_definition_event_hash })
    {
        let part_ref_var_id = 22;
        let part_hash = record_get(
            Expression::Variable(VariableExpression {
                variable_id: part_ref_var_id,
            }),
            "part_definition_event_hash",
        );
        let lookup_call = call_part(
            type_env_lookup_part_hash,
            &[
                (
                    "env",
                    Expression::Variable(VariableExpression { variable_id: 1 }),
                ),
                ("part_hash", part_hash),
            ],
        );

        arms.push(MatchArm {
            tag: "part_reference".into(),
            variable_id: Some(part_ref_var_id),
            variable_name: Some("part_ref".into()),
            body: Box::new(lookup_call),
        });
    }

    arms
}
