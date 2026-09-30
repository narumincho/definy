use definy_event::EventHashId;
use definy_event::event::{
    CallExpression, Description, Expression, FunctionExpression, IfExpression, MatchArm,
    MatchExpression, ModulePartEntry, PartReferenceExpression, PartType, RecordGetExpression,
    TypeLiteralExpression, TypeLiteralItemExpression, VariableExpression, VariantExpression,
    derive_module_part_id,
};

/// 自己記述型チェッカー `core.type-check`: `expression -> type-env -> type-result`
pub fn create_type_check_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_type_part_hash = derive_module_part_id(core_module_id, "expression");
    let type_env_part_hash = derive_module_part_id(core_module_id, "type-env");
    let type_result_part_hash = derive_module_part_id(core_module_id, "type-result");
    let type_check_hash = derive_module_part_id(core_module_id, "type-check");
    let type_equals_hash = derive_module_part_id(core_module_id, "type-equals");
    let type_env_lookup_hash = derive_module_part_id(core_module_id, "type-env-lookup");

    fn ok_type(t: Expression) -> Expression {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "ok".into(),
            payload: Some(Box::new(t)),
        })
    }

    fn type_num() -> Expression {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "number".into(),
            payload: None,
        })
    }

    fn type_str() -> Expression {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "string".into(),
            payload: None,
        })
    }

    fn type_bool() -> Expression {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "boolean".into(),
            payload: None,
        })
    }

    fn err_mismatch(expected: Expression, actual: Expression) -> Expression {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "error".into(),
            payload: Some(Box::new(Expression::Variant(VariantExpression {
                type_part_definition_event_hash: None,
                tag: "type_mismatch".into(),
                payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                    items: vec![
                        TypeLiteralItemExpression {
                            key: "expected".into(),
                            value: Box::new(expected),
                        },
                        TypeLiteralItemExpression {
                            key: "actual".into(),
                            value: Box::new(actual),
                        },
                    ],
                }))),
            }))),
        })
    }

    fn check_sub(check_hash: &EventHashId, expr: Expression, env: Expression) -> Expression {
        Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    check_hash.clone(),
                ))),
                argument: Box::new(expr),
            })),
            argument: Box::new(env),
        })
    }

    let binary_num_op = |tag: &'static str, check_hash: &EventHashId, var_id: i64| {
        let left_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: var_id,
            })),
            key: "left".into(),
        });
        let right_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: var_id,
            })),
            key: "right".into(),
        });

        let check_l = check_sub(
            check_hash,
            left_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let check_r = check_sub(
            check_hash,
            right_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );

        let r_ok_var = 31;
        let l_ok_var = 30;

        let check_r_match = Expression::Match(MatchExpression {
            target: Box::new(check_r),
            arms: vec![
                MatchArm {
                    tag: "ok".into(),
                    variable_id: Some(r_ok_var),
                    variable_name: Some("r_ok".into()),
                    body: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::Call(CallExpression {
                            function: Box::new(Expression::Call(CallExpression {
                                function: Box::new(Expression::PartReference(
                                    PartReferenceExpression::new(type_equals_hash.clone()),
                                )),
                                argument: Box::new(Expression::Variable(VariableExpression {
                                    variable_id: r_ok_var,
                                })),
                            })),
                            argument: Box::new(type_num()),
                        })),
                        then_expr: Box::new(ok_type(type_num())),
                        else_expr: Box::new(err_mismatch(
                            type_num(),
                            Expression::Variable(VariableExpression {
                                variable_id: r_ok_var,
                            }),
                        )),
                    })),
                },
                MatchArm {
                    tag: "error".into(),
                    variable_id: Some(32),
                    variable_name: Some("err".into()),
                    body: Box::new(Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: None,
                        tag: "error".into(),
                        payload: Some(Box::new(Expression::Variable(VariableExpression {
                            variable_id: 32,
                        }))),
                    })),
                },
            ],
            default: None,
        });

        let check_l_match = Expression::Match(MatchExpression {
            target: Box::new(check_l),
            arms: vec![
                MatchArm {
                    tag: "ok".into(),
                    variable_id: Some(l_ok_var),
                    variable_name: Some("l_ok".into()),
                    body: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::Call(CallExpression {
                            function: Box::new(Expression::Call(CallExpression {
                                function: Box::new(Expression::PartReference(
                                    PartReferenceExpression::new(type_equals_hash.clone()),
                                )),
                                argument: Box::new(Expression::Variable(VariableExpression {
                                    variable_id: l_ok_var,
                                })),
                            })),
                            argument: Box::new(type_num()),
                        })),
                        then_expr: Box::new(check_r_match),
                        else_expr: Box::new(err_mismatch(
                            type_num(),
                            Expression::Variable(VariableExpression {
                                variable_id: l_ok_var,
                            }),
                        )),
                    })),
                },
                MatchArm {
                    tag: "error".into(),
                    variable_id: Some(33),
                    variable_name: Some("err".into()),
                    body: Box::new(Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: None,
                        tag: "error".into(),
                        payload: Some(Box::new(Expression::Variable(VariableExpression {
                            variable_id: 33,
                        }))),
                    })),
                },
            ],
            default: None,
        });

        MatchArm {
            tag: tag.into(),
            variable_id: Some(var_id),
            variable_name: Some("bin".into()),
            body: Box::new(check_l_match),
        }
    };

    // 1. Literal types & 2. Arithmetic
    let mut arms = vec![
        MatchArm {
            tag: "number".into(),
            variable_id: Some(10),
            variable_name: Some("n".into()),
            body: Box::new(ok_type(type_num())),
        },
        MatchArm {
            tag: "string".into(),
            variable_id: Some(11),
            variable_name: Some("s".into()),
            body: Box::new(ok_type(type_str())),
        },
        MatchArm {
            tag: "boolean".into(),
            variable_id: Some(12),
            variable_name: Some("b".into()),
            body: Box::new(ok_type(type_bool())),
        },
        binary_num_op("add", &type_check_hash, 13),
        binary_num_op("subtract", &type_check_hash, 14),
        binary_num_op("multiply", &type_check_hash, 15),
        binary_num_op("divide", &type_check_hash, 16),
        binary_num_op("remainder", &type_check_hash, 17),
    ];

    // 3. Comparison: equal
    {
        let var_id = 18;
        let left_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: var_id,
            })),
            key: "left".into(),
        });
        let right_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: var_id,
            })),
            key: "right".into(),
        });

        let check_l = check_sub(
            &type_check_hash,
            left_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let check_r = check_sub(
            &type_check_hash,
            right_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );

        let l_t_var = 40;
        let r_t_var = 41;

        let check_r_match = Expression::Match(MatchExpression {
            target: Box::new(check_r),
            arms: vec![
                MatchArm {
                    tag: "ok".into(),
                    variable_id: Some(r_t_var),
                    variable_name: Some("r_ok".into()),
                    body: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::Call(CallExpression {
                            function: Box::new(Expression::Call(CallExpression {
                                function: Box::new(Expression::PartReference(
                                    PartReferenceExpression::new(type_equals_hash.clone()),
                                )),
                                argument: Box::new(Expression::Variable(VariableExpression {
                                    variable_id: l_t_var,
                                })),
                            })),
                            argument: Box::new(Expression::Variable(VariableExpression {
                                variable_id: r_t_var,
                            })),
                        })),
                        then_expr: Box::new(ok_type(type_bool())),
                        else_expr: Box::new(err_mismatch(
                            Expression::Variable(VariableExpression {
                                variable_id: l_t_var,
                            }),
                            Expression::Variable(VariableExpression {
                                variable_id: r_t_var,
                            }),
                        )),
                    })),
                },
                MatchArm {
                    tag: "error".into(),
                    variable_id: Some(42),
                    variable_name: Some("err".into()),
                    body: Box::new(Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: None,
                        tag: "error".into(),
                        payload: Some(Box::new(Expression::Variable(VariableExpression {
                            variable_id: 42,
                        }))),
                    })),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "equal".into(),
            variable_id: Some(var_id),
            variable_name: Some("eq".into()),
            body: Box::new(Expression::Match(MatchExpression {
                target: Box::new(check_l),
                arms: vec![
                    MatchArm {
                        tag: "ok".into(),
                        variable_id: Some(l_t_var),
                        variable_name: Some("l_ok".into()),
                        body: Box::new(check_r_match),
                    },
                    MatchArm {
                        tag: "error".into(),
                        variable_id: Some(43),
                        variable_name: Some("err".into()),
                        body: Box::new(Expression::Variant(VariantExpression {
                            type_part_definition_event_hash: None,
                            tag: "error".into(),
                            payload: Some(Box::new(Expression::Variable(VariableExpression {
                                variable_id: 43,
                            }))),
                        })),
                    },
                ],
                default: None,
            })),
        });
    }

    // 4. Comparison: less_than
    arms.push(MatchArm {
        tag: "less_than".into(),
        variable_id: Some(19),
        variable_name: Some("lt".into()),
        body: Box::new(ok_type(type_bool())),
    });

    // 5. Variable lookup
    {
        let var_payload_id = 20;
        let target_var_id = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: var_payload_id,
            })),
            key: "variable_id".into(),
        });
        let lookup_call = Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    type_env_lookup_hash.clone(),
                ))),
                argument: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            })),
            argument: Box::new(target_var_id),
        });

        arms.push(MatchArm {
            tag: "variable".into(),
            variable_id: Some(var_payload_id),
            variable_name: Some("var".into()),
            body: Box::new(lookup_call),
        });
    }

    // 6. Conditional: if({ condition, then_expr, else_expr })
    {
        let if_var_id = 21;
        let cond_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: if_var_id,
            })),
            key: "condition".into(),
        });
        let then_sub = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: if_var_id,
            })),
            key: "then_expr".into(),
        });
        let else_sub = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: if_var_id,
            })),
            key: "else_expr".into(),
        });

        let check_c = check_sub(
            &type_check_hash,
            cond_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let check_t = check_sub(
            &type_check_hash,
            then_sub,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let check_e = check_sub(
            &type_check_hash,
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
                                    condition: Box::new(Expression::Call(CallExpression {
                                        function: Box::new(Expression::Call(CallExpression {
                                            function: Box::new(Expression::PartReference(
                                                PartReferenceExpression::new(
                                                    type_equals_hash.clone(),
                                                ),
                                            )),
                                            argument: Box::new(Expression::Variable(
                                                VariableExpression {
                                                    variable_id: t_type_var,
                                                },
                                            )),
                                        })),
                                        argument: Box::new(Expression::Variable(
                                            VariableExpression {
                                                variable_id: e_type_var,
                                            },
                                        )),
                                    })),
                                    then_expr: Box::new(ok_type(Expression::Variable(
                                        VariableExpression {
                                            variable_id: t_type_var,
                                        },
                                    ))),
                                    else_expr: Box::new(err_mismatch(
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
                                body: Box::new(Expression::Variant(VariantExpression {
                                    type_part_definition_event_hash: None,
                                    tag: "error".into(),
                                    payload: Some(Box::new(Expression::Variable(
                                        VariableExpression { variable_id: 53 },
                                    ))),
                                })),
                            },
                        ],
                        default: None,
                    })),
                },
                MatchArm {
                    tag: "error".into(),
                    variable_id: Some(54),
                    variable_name: Some("err".into()),
                    body: Box::new(Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: None,
                        tag: "error".into(),
                        payload: Some(Box::new(Expression::Variable(VariableExpression {
                            variable_id: 54,
                        }))),
                    })),
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
                        condition: Box::new(Expression::Call(CallExpression {
                            function: Box::new(Expression::Call(CallExpression {
                                function: Box::new(Expression::PartReference(
                                    PartReferenceExpression::new(type_equals_hash.clone()),
                                )),
                                argument: Box::new(Expression::Variable(VariableExpression {
                                    variable_id: 50,
                                })),
                            })),
                            argument: Box::new(type_bool()),
                        })),
                        then_expr: Box::new(check_branch_types),
                        else_expr: Box::new(Expression::Variant(VariantExpression {
                            type_part_definition_event_hash: None,
                            tag: "error".into(),
                            payload: Some(Box::new(Expression::Variant(VariantExpression {
                                type_part_definition_event_hash: None,
                                tag: "condition_not_boolean".into(),
                                payload: Some(Box::new(Expression::TypeLiteral(
                                    TypeLiteralExpression {
                                        items: vec![TypeLiteralItemExpression {
                                            key: "actual".into(),
                                            value: Box::new(Expression::Variable(
                                                VariableExpression { variable_id: 50 },
                                            )),
                                        }],
                                    },
                                ))),
                            }))),
                        })),
                    })),
                },
                MatchArm {
                    tag: "error".into(),
                    variable_id: Some(55),
                    variable_name: Some("err".into()),
                    body: Box::new(Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: None,
                        tag: "error".into(),
                        payload: Some(Box::new(Expression::Variable(VariableExpression {
                            variable_id: 55,
                        }))),
                    })),
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

    // Default arm: unknown_error
    arms.push(MatchArm {
        tag: "_".into(),
        variable_id: Some(99),
        variable_name: Some("_".into()),
        body: Box::new(Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "error".into(),
            payload: Some(Box::new(Expression::Variant(VariantExpression {
                type_part_definition_event_hash: None,
                tag: "unknown_error".into(),
                payload: None,
            }))),
        })),
    });

    let main_expr = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "expr".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "env".into(),
            body: Box::new(Expression::Match(MatchExpression {
                target: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
                arms,
                default: None,
            })),
        })),
    });

    ModulePartEntry {
        name: "type-check".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(expr_type_part_hash)),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::TypePart(type_env_part_hash)),
                return_type: Box::new(PartType::TypePart(type_result_part_hash)),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Self-hosted type checker verifying expressions and deriving types",
            ),
            ("ja", "式の整合性を検証し型を導出する自己記述型チェッカー"),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}
