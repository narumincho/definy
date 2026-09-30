use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, BooleanExpression, CallExpression, Description, DivideExpression,
    EqualExpression, Expression, FunctionExpression, IfExpression, LessThanExpression, MatchArm,
    MatchExpression, ModulePartEntry, MultiplyExpression, PartReferenceExpression, PartType,
    RecordGetExpression, RemainderExpression, SubtractExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, VariableExpression, VariantExpression, derive_module_part_id,
};

/// 汎用自己評価器 `core.eval-value`: `expression -> env -> value`
/// definy 内で定義された式 AST を、definy の純粋関数として評価・解釈実行します。
pub fn create_eval_value_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_type_part_hash = derive_module_part_id(core_module_id, "expression");
    let val_part_hash = derive_module_part_id(core_module_id, "value");
    let env_part_hash = derive_module_part_id(core_module_id, "env");
    let env_lookup_hash = derive_module_part_id(core_module_id, "env-lookup");
    let env_extend_hash = derive_module_part_id(core_module_id, "env-extend");
    let eval_value_hash = derive_module_part_id(core_module_id, "eval-value");
    let eval_match_arms_hash = derive_module_part_id(core_module_id, "eval-match-arms");

    // Helper: call eval-value(sub_expr)(env)
    fn eval_sub(eval_hash: &EventHashId, sub_expr: Expression, env_expr: Expression) -> Expression {
        Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    eval_hash.clone(),
                ))),
                argument: Box::new(sub_expr),
            })),
            argument: Box::new(env_expr),
        })
    }

    fn val_num(n: Expression) -> Expression {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "number".into(),
            payload: Some(Box::new(n)),
        })
    }

    fn val_str(s: Expression) -> Expression {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "string".into(),
            payload: Some(Box::new(s)),
        })
    }

    fn val_bool(b: Expression) -> Expression {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "boolean".into(),
            payload: Some(Box::new(b)),
        })
    }

    fn val_variant(tag: Expression, payload: Expression) -> Expression {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "variant".into(),
            payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "tag".into(),
                        value: Box::new(tag),
                    },
                    TypeLiteralItemExpression {
                        key: "payload".into(),
                        value: Box::new(payload),
                    },
                ],
            }))),
        })
    }

    let val_unit = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "unit".into(),
        payload: None,
    });

    let binary_arith_arm =
        |tag: &'static str,
         eval_hash: &EventHashId,
         var_id: i64,
         op_fn: fn(Expression, Expression) -> Expression| {
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

            let eval_l = eval_sub(
                eval_hash,
                left_expr,
                Expression::Variable(VariableExpression { variable_id: 1 }),
            );
            let eval_r = eval_sub(
                eval_hash,
                right_expr,
                Expression::Variable(VariableExpression { variable_id: 1 }),
            );

            let left_num_var = 10;
            let right_num_var = 11;

            let compute = val_num(op_fn(
                Expression::Variable(VariableExpression {
                    variable_id: left_num_var,
                }),
                Expression::Variable(VariableExpression {
                    variable_id: right_num_var,
                }),
            ));

            let inner_match = Expression::Match(MatchExpression {
                target: Box::new(eval_r),
                arms: vec![
                    MatchArm {
                        tag: "number".into(),
                        variable_id: Some(right_num_var),
                        variable_name: Some("r_num".into()),
                        body: Box::new(compute),
                    },
                    MatchArm {
                        tag: "_".into(),
                        variable_id: Some(99),
                        variable_name: Some("_".into()),
                        body: Box::new(val_unit.clone()),
                    },
                ],
                default: None,
            });

            let outer_match = Expression::Match(MatchExpression {
                target: Box::new(eval_l),
                arms: vec![
                    MatchArm {
                        tag: "number".into(),
                        variable_id: Some(left_num_var),
                        variable_name: Some("l_num".into()),
                        body: Box::new(inner_match),
                    },
                    MatchArm {
                        tag: "_".into(),
                        variable_id: Some(98),
                        variable_name: Some("_".into()),
                        body: Box::new(val_unit.clone()),
                    },
                ],
                default: None,
            });

            MatchArm {
                tag: tag.into(),
                variable_id: Some(var_id),
                variable_name: Some("bin".into()),
                body: Box::new(outer_match),
            }
        };

    let mut arms = Vec::new();

    // 1. Literal: number
    arms.push(MatchArm {
        tag: "number".into(),
        variable_id: Some(10),
        variable_name: Some("n".into()),
        body: Box::new(val_num(Expression::Variable(VariableExpression {
            variable_id: 10,
        }))),
    });

    // 2. Literal: string
    arms.push(MatchArm {
        tag: "string".into(),
        variable_id: Some(11),
        variable_name: Some("s".into()),
        body: Box::new(val_str(Expression::Variable(VariableExpression {
            variable_id: 11,
        }))),
    });

    // 3. Literal: boolean
    arms.push(MatchArm {
        tag: "boolean".into(),
        variable_id: Some(12),
        variable_name: Some("b".into()),
        body: Box::new(val_bool(Expression::Variable(VariableExpression {
            variable_id: 12,
        }))),
    });

    // 4. Arithmetic
    arms.push(binary_arith_arm("add", &eval_value_hash, 13, |l, r| {
        Expression::Add(AddExpression {
            left: Box::new(l),
            right: Box::new(r),
        })
    }));
    arms.push(binary_arith_arm(
        "subtract",
        &eval_value_hash,
        14,
        |l, r| {
            Expression::Subtract(SubtractExpression {
                left: Box::new(l),
                right: Box::new(r),
            })
        },
    ));
    arms.push(binary_arith_arm(
        "multiply",
        &eval_value_hash,
        15,
        |l, r| {
            Expression::Multiply(MultiplyExpression {
                left: Box::new(l),
                right: Box::new(r),
            })
        },
    ));
    arms.push(binary_arith_arm("divide", &eval_value_hash, 16, |l, r| {
        Expression::Divide(DivideExpression {
            left: Box::new(l),
            right: Box::new(r),
        })
    }));
    arms.push(binary_arith_arm(
        "remainder",
        &eval_value_hash,
        17,
        |l, r| {
            Expression::Remainder(RemainderExpression {
                left: Box::new(l),
                right: Box::new(r),
            })
        },
    ));

    // 5. Comparison: equal
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
        let eval_l = eval_sub(
            &eval_value_hash,
            left_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let eval_r = eval_sub(
            &eval_value_hash,
            right_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );

        arms.push(MatchArm {
            tag: "equal".into(),
            variable_id: Some(var_id),
            variable_name: Some("eq".into()),
            body: Box::new(val_bool(Expression::Equal(EqualExpression {
                left: Box::new(eval_l),
                right: Box::new(eval_r),
            }))),
        });
    }

    // 6. Comparison: less_than
    arms.push(binary_arith_arm(
        "less_than",
        &eval_value_hash,
        19,
        |l, r| {
            Expression::LessThan(LessThanExpression {
                left: Box::new(l),
                right: Box::new(r),
            })
        },
    ));

    // 7. Variable lookup: env-lookup(env)(variable_id)
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
                    env_lookup_hash.clone(),
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

    // 8. Conditional: if({ condition, then_expr, else_expr })
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

        let eval_cond = eval_sub(
            &eval_value_hash,
            cond_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let eval_then = eval_sub(
            &eval_value_hash,
            then_sub,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let eval_else = eval_sub(
            &eval_value_hash,
            else_sub,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );

        let bool_var_id = 22;
        let if_body = Expression::Match(MatchExpression {
            target: Box::new(eval_cond),
            arms: vec![
                MatchArm {
                    tag: "boolean".into(),
                    variable_id: Some(bool_var_id),
                    variable_name: Some("b".into()),
                    body: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::Variable(VariableExpression {
                            variable_id: bool_var_id,
                        })),
                        then_expr: Box::new(eval_then),
                        else_expr: Box::new(eval_else),
                    })),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(97),
                    variable_name: Some("_".into()),
                    body: Box::new(val_unit.clone()),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "if".into(),
            variable_id: Some(if_var_id),
            variable_name: Some("if_e".into()),
            body: Box::new(if_body),
        });
    }

    // 9. Function definition: function({ parameter_variable_id, body }) -> value.closure
    {
        let func_var_id = 23;
        let param_id_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: func_var_id,
            })),
            key: "parameter_variable_id".into(),
        });
        let body_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: func_var_id,
            })),
            key: "body".into(),
        });

        let closure_record = Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "parameter_variable_id".into(),
                    value: Box::new(param_id_expr),
                },
                TypeLiteralItemExpression {
                    key: "body".into(),
                    value: Box::new(body_expr),
                },
                TypeLiteralItemExpression {
                    key: "captured_env".into(),
                    value: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                },
            ],
        });

        let closure_val = Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "closure".into(),
            payload: Some(Box::new(closure_record)),
        });

        arms.push(MatchArm {
            tag: "function".into(),
            variable_id: Some(func_var_id),
            variable_name: Some("fn_def".into()),
            body: Box::new(closure_val),
        });
    }

    // 10. Function call: call({ function, argument })
    {
        let call_var_id = 24;
        let fn_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: call_var_id,
            })),
            key: "function".into(),
        });
        let arg_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: call_var_id,
            })),
            key: "argument".into(),
        });

        let eval_fn = eval_sub(
            &eval_value_hash,
            fn_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let eval_arg = eval_sub(
            &eval_value_hash,
            arg_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );

        let closure_var_id = 25;
        let closure_param_id = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: closure_var_id,
            })),
            key: "parameter_variable_id".into(),
        });
        let closure_body = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: closure_var_id,
            })),
            key: "body".into(),
        });
        let closure_env = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: closure_var_id,
            })),
            key: "captured_env".into(),
        });

        // extended_env = env-extend(closure_env)(closure_param_id)(eval_arg)
        let extended_env = Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                        env_extend_hash.clone(),
                    ))),
                    argument: Box::new(closure_env),
                })),
                argument: Box::new(closure_param_id),
            })),
            argument: Box::new(eval_arg),
        });

        let call_result = eval_sub(&eval_value_hash, closure_body, extended_env);

        let call_body = Expression::Match(MatchExpression {
            target: Box::new(eval_fn),
            arms: vec![
                MatchArm {
                    tag: "closure".into(),
                    variable_id: Some(closure_var_id),
                    variable_name: Some("c".into()),
                    body: Box::new(call_result),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(96),
                    variable_name: Some("_".into()),
                    body: Box::new(val_unit.clone()),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "call".into(),
            variable_id: Some(call_var_id),
            variable_name: Some("call_e".into()),
            body: Box::new(call_body),
        });
    }

    // 11. Let binding: let({ variable_id, value, body })
    {
        let let_var_id = 26;
        let var_id_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: let_var_id,
            })),
            key: "variable_id".into(),
        });
        let val_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: let_var_id,
            })),
            key: "value".into(),
        });
        let body_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: let_var_id,
            })),
            key: "body".into(),
        });

        let eval_val = eval_sub(
            &eval_value_hash,
            val_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );

        let extended_env = Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                        env_extend_hash.clone(),
                    ))),
                    argument: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                })),
                argument: Box::new(var_id_expr),
            })),
            argument: Box::new(eval_val),
        });

        let let_eval_body = eval_sub(&eval_value_hash, body_expr, extended_env);

        arms.push(MatchArm {
            tag: "let".into(),
            variable_id: Some(let_var_id),
            variable_name: Some("let_e".into()),
            body: Box::new(let_eval_body),
        });
    }

    // 12. Logical not: not({ value })
    {
        let not_var_id = 27;
        let val_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: not_var_id,
            })),
            key: "value".into(),
        });
        let eval_v = eval_sub(
            &eval_value_hash,
            val_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let b_id = 28;
        let not_body = Expression::Match(MatchExpression {
            target: Box::new(eval_v),
            arms: vec![
                MatchArm {
                    tag: "boolean".into(),
                    variable_id: Some(b_id),
                    variable_name: Some("b".into()),
                    body: Box::new(val_bool(Expression::If(IfExpression {
                        condition: Box::new(Expression::Variable(VariableExpression {
                            variable_id: b_id,
                        })),
                        then_expr: Box::new(Expression::Boolean(BooleanExpression {
                            value: false,
                        })),
                        else_expr: Box::new(Expression::Boolean(BooleanExpression { value: true })),
                    }))),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(94),
                    variable_name: Some("_".into()),
                    body: Box::new(val_unit.clone()),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "not".into(),
            variable_id: Some(not_var_id),
            variable_name: Some("not_e".into()),
            body: Box::new(not_body),
        });
    }

    // 13. Logical and: and({ left, right })
    {
        let and_var_id = 29;
        let left_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: and_var_id,
            })),
            key: "left".into(),
        });
        let right_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: and_var_id,
            })),
            key: "right".into(),
        });
        let eval_l = eval_sub(
            &eval_value_hash,
            left_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let eval_r = eval_sub(
            &eval_value_hash,
            right_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let b_id = 30;
        let and_body = Expression::Match(MatchExpression {
            target: Box::new(eval_l),
            arms: vec![
                MatchArm {
                    tag: "boolean".into(),
                    variable_id: Some(b_id),
                    variable_name: Some("b".into()),
                    body: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::Variable(VariableExpression {
                            variable_id: b_id,
                        })),
                        then_expr: Box::new(eval_r),
                        else_expr: Box::new(val_bool(Expression::Boolean(BooleanExpression {
                            value: false,
                        }))),
                    })),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(93),
                    variable_name: Some("_".into()),
                    body: Box::new(val_unit.clone()),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "and".into(),
            variable_id: Some(and_var_id),
            variable_name: Some("and_e".into()),
            body: Box::new(and_body),
        });
    }

    // 14. Logical or: or({ left, right })
    {
        let or_var_id = 31;
        let left_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: or_var_id,
            })),
            key: "left".into(),
        });
        let right_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: or_var_id,
            })),
            key: "right".into(),
        });
        let eval_l = eval_sub(
            &eval_value_hash,
            left_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let eval_r = eval_sub(
            &eval_value_hash,
            right_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let b_id = 32;
        let or_body = Expression::Match(MatchExpression {
            target: Box::new(eval_l),
            arms: vec![
                MatchArm {
                    tag: "boolean".into(),
                    variable_id: Some(b_id),
                    variable_name: Some("b".into()),
                    body: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::Variable(VariableExpression {
                            variable_id: b_id,
                        })),
                        then_expr: Box::new(val_bool(Expression::Boolean(BooleanExpression {
                            value: true,
                        }))),
                        else_expr: Box::new(eval_r),
                    })),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(92),
                    variable_name: Some("_".into()),
                    body: Box::new(val_unit.clone()),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "or".into(),
            variable_id: Some(or_var_id),
            variable_name: Some("or_e".into()),
            body: Box::new(or_body),
        });
    }

    // 15. Variant constructor: variant({ tag, payload })
    {
        let var_id = 33;
        let tag_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: var_id,
            })),
            key: "tag".into(),
        });
        let payload_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: var_id,
            })),
            key: "payload".into(),
        });

        let payload_sub_id = 34;
        let payload_match = Expression::Match(MatchExpression {
            target: Box::new(payload_expr),
            arms: vec![
                MatchArm {
                    tag: "none".into(),
                    variable_id: None,
                    variable_name: None,
                    body: Box::new(val_variant(tag_expr.clone(), val_unit.clone())),
                },
                MatchArm {
                    tag: "some".into(),
                    variable_id: Some(payload_sub_id),
                    variable_name: Some("sub_e".into()),
                    body: Box::new(val_variant(
                        tag_expr,
                        eval_sub(
                            &eval_value_hash,
                            Expression::Variable(VariableExpression {
                                variable_id: payload_sub_id,
                            }),
                            Expression::Variable(VariableExpression { variable_id: 1 }),
                        ),
                    )),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(91),
                    variable_name: Some("_".into()),
                    body: Box::new(val_unit.clone()),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "variant".into(),
            variable_id: Some(var_id),
            variable_name: Some("v_def".into()),
            body: Box::new(payload_match),
        });
    }

    // 16. Match expression: match({ target, arms })
    {
        let match_var_id = 35;
        let target_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: match_var_id,
            })),
            key: "target".into(),
        });
        let arms_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: match_var_id,
            })),
            key: "arms".into(),
        });

        let eval_target = eval_sub(
            &eval_value_hash,
            target_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );

        let target_var_val_id = 36;
        let target_val_record = Expression::Variable(VariableExpression {
            variable_id: target_var_val_id,
        });

        let target_tag = Expression::RecordGet(RecordGetExpression {
            record: Box::new(target_val_record.clone()),
            key: "tag".into(),
        });
        let target_payload = Expression::RecordGet(RecordGetExpression {
            record: Box::new(target_val_record),
            key: "payload".into(),
        });

        // call eval-match-arms(arms)(target_tag)(target_payload)(env)
        let eval_match_call = Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::Call(CallExpression {
                        function: Box::new(Expression::PartReference(
                            PartReferenceExpression::new(eval_match_arms_hash),
                        )),
                        argument: Box::new(arms_expr),
                    })),
                    argument: Box::new(target_tag),
                })),
                argument: Box::new(target_payload),
            })),
            argument: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
        });

        let match_body = Expression::Match(MatchExpression {
            target: Box::new(eval_target),
            arms: vec![
                MatchArm {
                    tag: "variant".into(),
                    variable_id: Some(target_var_val_id),
                    variable_name: Some("v_val".into()),
                    body: Box::new(eval_match_call),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(90),
                    variable_name: Some("_".into()),
                    body: Box::new(val_unit.clone()),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "match".into(),
            variable_id: Some(match_var_id),
            variable_name: Some("match_e".into()),
            body: Box::new(match_body),
        });
    }

    // Default arm
    arms.push(MatchArm {
        tag: "_".into(),
        variable_id: Some(95),
        variable_name: Some("_".into()),
        body: Box::new(val_unit),
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
        name: "eval-value".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(expr_type_part_hash)),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::TypePart(env_part_hash)),
                return_type: Box::new(PartType::TypePart(val_part_hash)),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Universal self-hosted AST evaluator returning dynamic values",
            ),
            ("ja", "動的値を返却する汎用自己ホスト AST 評価器"),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}
