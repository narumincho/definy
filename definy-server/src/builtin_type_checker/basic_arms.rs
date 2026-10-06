use definy_event::EventHashId;
use definy_event::event::{
    CallExpression, Expression, IfExpression, MatchArm, MatchExpression, PartReferenceExpression,
    RecordGetExpression, VariableExpression, VariantExpression,
};

use super::helpers::{check_sub, error_mismatch, ok_type, type_bool, type_num, type_str};

/// リテラル型、算術演算、比較演算、論理演算に関する型検査 MatchArm リストを生成します。
pub fn create_basic_check_arms(
    type_check_hash: &EventHashId,
    type_equals_hash: &EventHashId,
) -> Vec<MatchArm> {
    let binary_typed_op =
        |tag: &'static str, var_id: i64, operand_and_result_type: fn() -> Expression| {
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
                type_check_hash,
                left_expr,
                Expression::Variable(VariableExpression { variable_id: 1 }),
            );
            let check_r = check_sub(
                type_check_hash,
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
                                argument: Box::new(operand_and_result_type()),
                            })),
                            then_expr: Box::new(ok_type(operand_and_result_type())),
                            else_expr: Box::new(error_mismatch(
                                operand_and_result_type(),
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
                                argument: Box::new(operand_and_result_type()),
                            })),
                            then_expr: Box::new(check_r_match),
                            else_expr: Box::new(error_mismatch(
                                operand_and_result_type(),
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

    let binary_num_op = |tag: &'static str, var_id: i64| binary_typed_op(tag, var_id, type_num);
    let binary_bool_op = |tag: &'static str, var_id: i64| binary_typed_op(tag, var_id, type_bool);

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
        binary_num_op("add", 13),
        binary_num_op("subtract", 14),
        binary_num_op("multiply", 15),
        binary_num_op("divide", 16),
        binary_num_op("remainder", 17),
    ];

    // Comparison: equal
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
            type_check_hash,
            left_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let check_r = check_sub(
            type_check_hash,
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
                        else_expr: Box::new(error_mismatch(
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

    // Comparison: less_than
    arms.push(MatchArm {
        tag: "less_than".into(),
        variable_id: Some(19),
        variable_name: Some("lt".into()),
        body: Box::new(ok_type(type_bool())),
    });

    // Logical and & or
    arms.push(binary_bool_op("and", 44));
    arms.push(binary_bool_op("or", 45));

    // Logical not: not({ value })
    {
        let not_var_id = 46;
        let val_sub = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: not_var_id,
            })),
            key: "value".into(),
        });
        let check_v = check_sub(
            type_check_hash,
            val_sub,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let v_ok_var = 47;
        let not_match = Expression::Match(MatchExpression {
            target: Box::new(check_v),
            arms: vec![
                MatchArm {
                    tag: "ok".into(),
                    variable_id: Some(v_ok_var),
                    variable_name: Some("v_ok".into()),
                    body: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::Call(CallExpression {
                            function: Box::new(Expression::Call(CallExpression {
                                function: Box::new(Expression::PartReference(
                                    PartReferenceExpression::new(type_equals_hash.clone()),
                                )),
                                argument: Box::new(Expression::Variable(VariableExpression {
                                    variable_id: v_ok_var,
                                })),
                            })),
                            argument: Box::new(type_bool()),
                        })),
                        then_expr: Box::new(ok_type(type_bool())),
                        else_expr: Box::new(error_mismatch(
                            type_bool(),
                            Expression::Variable(VariableExpression {
                                variable_id: v_ok_var,
                            }),
                        )),
                    })),
                },
                MatchArm {
                    tag: "error".into(),
                    variable_id: Some(48),
                    variable_name: Some("err".into()),
                    body: Box::new(Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: None,
                        tag: "error".into(),
                        payload: Some(Box::new(Expression::Variable(VariableExpression {
                            variable_id: 48,
                        }))),
                    })),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "not".into(),
            variable_id: Some(not_var_id),
            variable_name: Some("not_e".into()),
            body: Box::new(not_match),
        });
    }

    arms
}
