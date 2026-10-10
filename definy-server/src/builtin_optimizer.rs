//! 自己記述 AST 最適化器 (`core.optimize-expression`):
//! `expression -> expression`
//!
//! definy の式 AST を再帰的に走査し、定数同士の計算を事前に計算して畳み込む
//! 「定数畳み込み (Constant Folding)」および不要な分岐の枝刈り (Dead Code Elimination) を行う
//! 純粋な自己記述型最適化器パーツを定義します。

use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, Description, Expression, IfExpression, MatchArm, MatchExpression,
    ModulePartEntry, MultiplyExpression, NotExpression, PartType, RecordGetExpression,
    SubtractExpression, TypeLiteralExpression, TypeLiteralItemExpression, VariableExpression,
    VariantExpression, derive_module_part_id,
};

/// 自己記述 AST 最適化器パーツ (`core.optimize-expression`) を生成します。
///
/// 入力された `core.expression` を走査し、定数演算（算術、論理、条件分岐）を
/// 事前に簡約化した新しい `core.expression` を返します。
pub fn create_optimize_expression_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_type_part_hash = derive_module_part_id(core_module_id, "expression");
    let optimize_hash = derive_module_part_id(core_module_id, "optimize-expression");

    // Helper: call optimize-expression(sub_expr)
    fn opt_sub(opt_hash: &EventHashId, sub_expr: Expression) -> Expression {
        crate::ast_builder::call_part(opt_hash, &[("expr", sub_expr)])
    }

    let expr_hash_clone = expr_type_part_hash.clone();
    let ast_number = move |num_expr: Expression| -> Expression {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: Some(expr_hash_clone.clone()),
            tag: "number".into(),
            payload: Some(Box::new(num_expr)),
        })
    };

    let expr_hash_clone2 = expr_type_part_hash.clone();
    let ast_boolean = move |bool_expr: Expression| -> Expression {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: Some(expr_hash_clone2.clone()),
            tag: "boolean".into(),
            payload: Some(Box::new(bool_expr)),
        })
    };

    let expr_hash_clone3 = expr_type_part_hash.clone();
    let ast_binary = move |tag: &str, left: Expression, right: Expression| -> Expression {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: Some(expr_hash_clone3.clone()),
            tag: tag.into(),
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
        })
    };

    let expr_hash_clone4 = expr_type_part_hash.clone();
    let ast_if = move |cond: Expression, then_e: Expression, else_e: Expression| -> Expression {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: Some(expr_hash_clone4.clone()),
            tag: "if".into(),
            payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "condition".into(),
                        value: Box::new(cond),
                    },
                    TypeLiteralItemExpression {
                        key: "then_expr".into(),
                        value: Box::new(then_e),
                    },
                    TypeLiteralItemExpression {
                        key: "else_expr".into(),
                        value: Box::new(else_e),
                    },
                ],
            }))),
        })
    };

    let expr_hash_clone5 = expr_type_part_hash.clone();
    let ast_not = move |val: Expression| -> Expression {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: Some(expr_hash_clone5.clone()),
            tag: "not".into(),
            payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![TypeLiteralItemExpression {
                    key: "value".into(),
                    value: Box::new(val),
                }],
            }))),
        })
    };

    let optimize_binary =
        |tag: &'static str,
         opt_hash: &EventHashId,
         var_id: i64,
         calc_op: fn(Expression, Expression) -> Expression| {
            let left_raw = Expression::RecordGet(RecordGetExpression {
                record: Box::new(Expression::Variable(VariableExpression {
                    variable_id: var_id,
                })),
                key: "left".into(),
            });
            let right_raw = Expression::RecordGet(RecordGetExpression {
                record: Box::new(Expression::Variable(VariableExpression {
                    variable_id: var_id,
                })),
                key: "right".into(),
            });

            let l_opt = opt_sub(opt_hash, left_raw);
            let r_opt = opt_sub(opt_hash, right_raw);

            let l_opt_var = 100 + var_id;
            let r_opt_var = 200 + var_id;
            let l_num_var = 300 + var_id;
            let r_num_var = 400 + var_id;

            // Match on r_opt
            let r_match = Expression::Match(MatchExpression {
                target: Box::new(Expression::Variable(VariableExpression {
                    variable_id: r_opt_var,
                })),
                arms: vec![
                    MatchArm {
                        tag: "number".into(),
                        variable_id: Some(r_num_var),
                        variable_name: Some("rn".into()),
                        body: Box::new(ast_number(calc_op(
                            Expression::Variable(VariableExpression {
                                variable_id: l_num_var,
                            }),
                            Expression::Variable(VariableExpression {
                                variable_id: r_num_var,
                            }),
                        ))),
                    },
                    MatchArm {
                        tag: "_".into(),
                        variable_id: Some(500 + var_id),
                        variable_name: Some("_".into()),
                        body: Box::new(ast_binary(
                            tag,
                            ast_number(Expression::Variable(VariableExpression {
                                variable_id: l_num_var,
                            })),
                            Expression::Variable(VariableExpression {
                                variable_id: r_opt_var,
                            }),
                        )),
                    },
                ],
                default: None,
            });

            // Match on l_opt
            let l_match = Expression::Match(MatchExpression {
                target: Box::new(Expression::Variable(VariableExpression {
                    variable_id: l_opt_var,
                })),
                arms: vec![
                    MatchArm {
                        tag: "number".into(),
                        variable_id: Some(l_num_var),
                        variable_name: Some("ln".into()),
                        body: Box::new(r_match),
                    },
                    MatchArm {
                        tag: "_".into(),
                        variable_id: Some(600 + var_id),
                        variable_name: Some("_".into()),
                        body: Box::new(ast_binary(
                            tag,
                            Expression::Variable(VariableExpression {
                                variable_id: l_opt_var,
                            }),
                            Expression::Variable(VariableExpression {
                                variable_id: r_opt_var,
                            }),
                        )),
                    },
                ],
                default: None,
            });

            // Let r_opt = ... in Match l_opt
            let with_r_let = Expression::Let(definy_event::event::LetExpression {
                variable_id: r_opt_var,
                variable_name: "r_opt".into(),
                value: Box::new(r_opt),
                body: Box::new(l_match),
            });

            let with_l_let = Expression::Let(definy_event::event::LetExpression {
                variable_id: l_opt_var,
                variable_name: "l_opt".into(),
                value: Box::new(l_opt),
                body: Box::new(with_r_let),
            });

            MatchArm {
                tag: tag.into(),
                variable_id: Some(var_id),
                variable_name: Some("bin".into()),
                body: Box::new(with_l_let),
            }
        };

    let mut arms = Vec::new();

    // 1. Literal values: already optimal, return as-is
    arms.push(MatchArm {
        tag: "number".into(),
        variable_id: Some(10),
        variable_name: Some("n".into()),
        body: Box::new(ast_number(Expression::Variable(VariableExpression {
            variable_id: 10,
        }))),
    });
    arms.push(MatchArm {
        tag: "string".into(),
        variable_id: Some(11),
        variable_name: Some("s".into()),
        body: Box::new(Expression::Variant(VariantExpression {
            type_part_definition_event_hash: Some(expr_type_part_hash.clone()),
            tag: "string".into(),
            payload: Some(Box::new(Expression::Variable(VariableExpression {
                variable_id: 11,
            }))),
        })),
    });
    arms.push(MatchArm {
        tag: "boolean".into(),
        variable_id: Some(12),
        variable_name: Some("b".into()),
        body: Box::new(ast_boolean(Expression::Variable(VariableExpression {
            variable_id: 12,
        }))),
    });

    // 2. Arithmetic constant folding: add, subtract, multiply
    arms.push(optimize_binary("add", &optimize_hash, 13, |l, r| {
        Expression::Add(AddExpression {
            left: Box::new(l),
            right: Box::new(r),
        })
    }));
    arms.push(optimize_binary("subtract", &optimize_hash, 14, |l, r| {
        Expression::Subtract(SubtractExpression {
            left: Box::new(l),
            right: Box::new(r),
        })
    }));
    arms.push(optimize_binary("multiply", &optimize_hash, 15, |l, r| {
        Expression::Multiply(MultiplyExpression {
            left: Box::new(l),
            right: Box::new(r),
        })
    }));

    // 3. Conditional: if (true) then_expr else else_expr => then_expr
    {
        let if_var_id = 16;
        let cond_raw = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: if_var_id,
            })),
            key: "condition".into(),
        });
        let then_raw = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: if_var_id,
            })),
            key: "then_expr".into(),
        });
        let else_raw = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: if_var_id,
            })),
            key: "else_expr".into(),
        });

        let cond_opt = opt_sub(&optimize_hash, cond_raw);
        let cond_opt_var = 160;
        let bool_val_var = 161;

        let match_cond = Expression::Match(MatchExpression {
            target: Box::new(Expression::Variable(VariableExpression {
                variable_id: cond_opt_var,
            })),
            arms: vec![
                MatchArm {
                    tag: "boolean".into(),
                    variable_id: Some(bool_val_var),
                    variable_name: Some("b".into()),
                    body: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::Variable(VariableExpression {
                            variable_id: bool_val_var,
                        })),
                        then_expr: Box::new(opt_sub(&optimize_hash, then_raw.clone())),
                        else_expr: Box::new(opt_sub(&optimize_hash, else_raw.clone())),
                    })),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(162),
                    variable_name: Some("_".into()),
                    body: Box::new(ast_if(
                        Expression::Variable(VariableExpression {
                            variable_id: cond_opt_var,
                        }),
                        opt_sub(&optimize_hash, then_raw),
                        opt_sub(&optimize_hash, else_raw),
                    )),
                },
            ],
            default: None,
        });

        let if_let = Expression::Let(definy_event::event::LetExpression {
            variable_id: cond_opt_var,
            variable_name: "cond_opt".into(),
            value: Box::new(cond_opt),
            body: Box::new(match_cond),
        });

        arms.push(MatchArm {
            tag: "if".into(),
            variable_id: Some(if_var_id),
            variable_name: Some("if_e".into()),
            body: Box::new(if_let),
        });
    }

    // 4. Logical Not: not(boolean(b)) => boolean(!b)
    {
        let not_var_id = 17;
        let val_raw = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: not_var_id,
            })),
            key: "value".into(),
        });
        let val_opt = opt_sub(&optimize_hash, val_raw);
        let val_opt_var = 170;
        let bool_val_var = 171;

        let match_val = Expression::Match(MatchExpression {
            target: Box::new(Expression::Variable(VariableExpression {
                variable_id: val_opt_var,
            })),
            arms: vec![
                MatchArm {
                    tag: "boolean".into(),
                    variable_id: Some(bool_val_var),
                    variable_name: Some("b".into()),
                    body: Box::new(ast_boolean(Expression::Not(NotExpression {
                        value: Box::new(Expression::Variable(VariableExpression {
                            variable_id: bool_val_var,
                        })),
                    }))),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(172),
                    variable_name: Some("_".into()),
                    body: Box::new(ast_not(Expression::Variable(VariableExpression {
                        variable_id: val_opt_var,
                    }))),
                },
            ],
            default: None,
        });

        let not_let = Expression::Let(definy_event::event::LetExpression {
            variable_id: val_opt_var,
            variable_name: "val_opt".into(),
            value: Box::new(val_opt),
            body: Box::new(match_val),
        });

        arms.push(MatchArm {
            tag: "not".into(),
            variable_id: Some(not_var_id),
            variable_name: Some("not_e".into()),
            body: Box::new(not_let),
        });
    }

    // 5. Default fallback: other expressions remain as-is
    arms.push(MatchArm {
        tag: "_".into(),
        variable_id: Some(99),
        variable_name: Some("other".into()),
        body: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
    });

    let main_expr = crate::ast_builder::fn_expr(
        &[("expr", 0)],
        Expression::Match(MatchExpression {
            target: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
            arms,
            default: None,
        }),
    );

    ModulePartEntry {
        name: "optimize-expression".into(),
        part_type: Some(crate::ast_builder::fn_type(
            &[("expr", PartType::TypePart(expr_type_part_hash.clone()))],
            PartType::TypePart(expr_type_part_hash),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Optimizes an AST expression via constant folding and dead branch elimination",
            ),
            (
                "ja",
                "定数畳み込みと不要な分岐の枝刈りを行い AST 式を自己最適化する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}
