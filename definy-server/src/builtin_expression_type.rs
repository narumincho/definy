use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, CallExpression, Description, DivideExpression, EqualExpression, Expression,
    FunctionExpression, IfExpression, LessThanExpression, MatchArm, MatchExpression,
    ModulePartEntry, MultiplyExpression, NumberExpression, PartReferenceExpression, PartType,
    RecordGetExpression, RemainderExpression, SubtractExpression, TypeListExpression,
    TypeLiteralExpression, TypeLiteralItemExpression, TypeUnionExpression, TypeUnionVariant,
    VariableExpression, VariantExpression, derive_module_part_id,
};

pub fn create_expression_ast_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_def_hash = derive_module_part_id(core_module_id, "expression");
    let expr_ref = Expression::PartReference(PartReferenceExpression::new(expr_def_hash));

    let binary_op_payload = |left_name: &str, right_name: &str| {
        Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: left_name.into(),
                    value: Box::new(expr_ref.clone()),
                },
                TypeLiteralItemExpression {
                    key: right_name.into(),
                    value: Box::new(expr_ref.clone()),
                },
            ],
        })
    };

    ModulePartEntry {
        name: "expression".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            ("en", "Definy AST expression type (self-describing AST)"),
            ("ja", "Definy の AST 式型 (メタデータ・ASTの自己表現)"),
        ]),
        content_hash: None,
        expression: Some(Expression::TypeUnion(TypeUnionExpression {
            variants: vec![
                TypeUnionVariant {
                    tag: "number".into(),
                    payload_type: Some(Box::new(Expression::TypeNumber)),
                },
                TypeUnionVariant {
                    tag: "string".into(),
                    payload_type: Some(Box::new(Expression::TypeString)),
                },
                TypeUnionVariant {
                    tag: "boolean".into(),
                    payload_type: Some(Box::new(Expression::TypeBoolean)),
                },
                TypeUnionVariant {
                    tag: "add".into(),
                    payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                },
                TypeUnionVariant {
                    tag: "subtract".into(),
                    payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                },
                TypeUnionVariant {
                    tag: "multiply".into(),
                    payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                },
                TypeUnionVariant {
                    tag: "divide".into(),
                    payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                },
                TypeUnionVariant {
                    tag: "remainder".into(),
                    payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                },
                TypeUnionVariant {
                    tag: "equal".into(),
                    payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                },
                TypeUnionVariant {
                    tag: "less_than".into(),
                    payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                },
                TypeUnionVariant {
                    tag: "list".into(),
                    payload_type: Some(Box::new(Expression::TypeList(TypeListExpression {
                        item_type: Box::new(expr_ref.clone()),
                    }))),
                },
                TypeUnionVariant {
                    tag: "call".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![
                            TypeLiteralItemExpression {
                                key: "function".into(),
                                value: Box::new(expr_ref.clone()),
                            },
                            TypeLiteralItemExpression {
                                key: "argument".into(),
                                value: Box::new(expr_ref.clone()),
                            },
                        ],
                    }))),
                },
                TypeUnionVariant {
                    tag: "variable".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "variable_id".into(),
                            value: Box::new(Expression::TypeNumber),
                        }],
                    }))),
                },
                TypeUnionVariant {
                    tag: "function".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![
                            TypeLiteralItemExpression {
                                key: "parameter_variable_id".into(),
                                value: Box::new(Expression::TypeNumber),
                            },
                            TypeLiteralItemExpression {
                                key: "body".into(),
                                value: Box::new(expr_ref.clone()),
                            },
                        ],
                    }))),
                },
                TypeUnionVariant {
                    tag: "record".into(),
                    payload_type: Some(Box::new(Expression::TypeList(TypeListExpression {
                        item_type: Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                            items: vec![
                                TypeLiteralItemExpression {
                                    key: "key".into(),
                                    value: Box::new(Expression::TypeString),
                                },
                                TypeLiteralItemExpression {
                                    key: "value".into(),
                                    value: Box::new(expr_ref.clone()),
                                },
                            ],
                        })),
                    }))),
                },
                TypeUnionVariant {
                    tag: "record_get".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![
                            TypeLiteralItemExpression {
                                key: "record".into(),
                                value: Box::new(expr_ref.clone()),
                            },
                            TypeLiteralItemExpression {
                                key: "key".into(),
                                value: Box::new(Expression::TypeString),
                            },
                        ],
                    }))),
                },
                TypeUnionVariant {
                    tag: "variant".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![
                            TypeLiteralItemExpression {
                                key: "tag".into(),
                                value: Box::new(Expression::TypeString),
                            },
                            TypeLiteralItemExpression {
                                key: "payload".into(),
                                value: Box::new(Expression::TypeUnion(TypeUnionExpression {
                                    variants: vec![
                                        TypeUnionVariant {
                                            tag: "none".into(),
                                            payload_type: None,
                                        },
                                        TypeUnionVariant {
                                            tag: "some".into(),
                                            payload_type: Some(Box::new(expr_ref.clone())),
                                        },
                                    ],
                                })),
                            },
                        ],
                    }))),
                },
                TypeUnionVariant {
                    tag: "match".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![
                            TypeLiteralItemExpression {
                                key: "target".into(),
                                value: Box::new(expr_ref.clone()),
                            },
                            TypeLiteralItemExpression {
                                key: "arms".into(),
                                value: Box::new(Expression::TypeList(TypeListExpression {
                                    item_type: Box::new(Expression::TypeLiteral(
                                        TypeLiteralExpression {
                                            items: vec![
                                                TypeLiteralItemExpression {
                                                    key: "tag".into(),
                                                    value: Box::new(Expression::TypeString),
                                                },
                                                TypeLiteralItemExpression {
                                                    key: "variable_id".into(),
                                                    value: Box::new(Expression::TypeNumber),
                                                },
                                                TypeLiteralItemExpression {
                                                    key: "body".into(),
                                                    value: Box::new(expr_ref.clone()),
                                                },
                                            ],
                                        },
                                    )),
                                })),
                            },
                        ],
                    }))),
                },
                TypeUnionVariant {
                    tag: "part_reference".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "part_definition_event_hash".into(),
                            value: Box::new(Expression::TypeString),
                        }],
                    }))),
                },
            ],
        })),
    }
}

pub fn create_eval_ast_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_type_part_hash = derive_module_part_id(core_module_id, "expression");
    let eval_ast_hash = derive_module_part_id(core_module_id, "eval-ast");

    fn recursive_call(eval_ast_hash: &EventHashId, var_id: i64, key: &str) -> Expression {
        Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                eval_ast_hash.clone(),
            ))),
            argument: Box::new(Expression::RecordGet(RecordGetExpression {
                record: Box::new(Expression::Variable(VariableExpression {
                    variable_id: var_id,
                })),
                key: key.into(),
            })),
        })
    }

    let binary_eval =
        |eval_ast_hash: &EventHashId, var_id: i64, op: fn(Expression, Expression) -> Expression| {
            op(
                recursive_call(eval_ast_hash, var_id, "left"),
                recursive_call(eval_ast_hash, var_id, "right"),
            )
        };

    ModulePartEntry {
        name: "eval-ast".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(expr_type_part_hash.clone())),
            return_type: Box::new(PartType::Number),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Evaluates a Definy AST expression to a number (self-hosting evaluator)",
            ),
            (
                "ja",
                "Definy の AST 式を評価して数値を計算する関数 (セルフホスティング評価器)",
            ),
        ]),
        content_hash: None,
        expression: Some(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "e".into(),
            body: Box::new(Expression::Match(MatchExpression {
                target: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                arms: vec![
                    MatchArm {
                        tag: "number".into(),
                        variable_id: Some(10),
                        variable_name: Some("n".into()),
                        body: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 10,
                        })),
                    },
                    MatchArm {
                        tag: "add".into(),
                        variable_id: Some(20),
                        variable_name: Some("bin".into()),
                        body: Box::new(binary_eval(&eval_ast_hash, 20, |l, r| {
                            Expression::Add(AddExpression {
                                left: Box::new(l),
                                right: Box::new(r),
                            })
                        })),
                    },
                    MatchArm {
                        tag: "subtract".into(),
                        variable_id: Some(30),
                        variable_name: Some("bin".into()),
                        body: Box::new(binary_eval(&eval_ast_hash, 30, |l, r| {
                            Expression::Subtract(SubtractExpression {
                                left: Box::new(l),
                                right: Box::new(r),
                            })
                        })),
                    },
                    MatchArm {
                        tag: "multiply".into(),
                        variable_id: Some(40),
                        variable_name: Some("bin".into()),
                        body: Box::new(binary_eval(&eval_ast_hash, 40, |l, r| {
                            Expression::Multiply(MultiplyExpression {
                                left: Box::new(l),
                                right: Box::new(r),
                            })
                        })),
                    },
                    MatchArm {
                        tag: "divide".into(),
                        variable_id: Some(50),
                        variable_name: Some("bin".into()),
                        body: Box::new(binary_eval(&eval_ast_hash, 50, |l, r| {
                            Expression::Divide(DivideExpression {
                                left: Box::new(l),
                                right: Box::new(r),
                            })
                        })),
                    },
                    MatchArm {
                        tag: "remainder".into(),
                        variable_id: Some(60),
                        variable_name: Some("bin".into()),
                        body: Box::new(binary_eval(&eval_ast_hash, 60, |l, r| {
                            Expression::Remainder(RemainderExpression {
                                left: Box::new(l),
                                right: Box::new(r),
                            })
                        })),
                    },
                    MatchArm {
                        tag: "equal".into(),
                        variable_id: Some(70),
                        variable_name: Some("bin".into()),
                        body: Box::new(Expression::If(IfExpression {
                            condition: Box::new(binary_eval(&eval_ast_hash, 70, |l, r| {
                                Expression::Equal(EqualExpression {
                                    left: Box::new(l),
                                    right: Box::new(r),
                                })
                            })),
                            then_expr: Box::new(Expression::Number(NumberExpression { value: 1 })),
                            else_expr: Box::new(Expression::Number(NumberExpression { value: 0 })),
                        })),
                    },
                    MatchArm {
                        tag: "less_than".into(),
                        variable_id: Some(80),
                        variable_name: Some("bin".into()),
                        body: Box::new(Expression::If(IfExpression {
                            condition: Box::new(binary_eval(&eval_ast_hash, 80, |l, r| {
                                Expression::LessThan(LessThanExpression {
                                    left: Box::new(l),
                                    right: Box::new(r),
                                })
                            })),
                            then_expr: Box::new(Expression::Number(NumberExpression { value: 1 })),
                            else_expr: Box::new(Expression::Number(NumberExpression { value: 0 })),
                        })),
                    },
                ],
                default: Some(Box::new(Expression::Number(NumberExpression { value: 0 }))),
            })),
        })),
    }
}

pub fn create_sample_ast_calc_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_type_part_hash = derive_module_part_id(core_module_id, "expression");
    let eval_ast_part_hash = derive_module_part_id(core_module_id, "eval-ast");

    let ast_num = |val: i64| {
        Expression::Variant(VariantExpression {
            tag: "number".into(),
            payload: Some(Box::new(Expression::Number(NumberExpression {
                value: val,
            }))),
            type_part_definition_event_hash: Some(expr_type_part_hash.clone()),
        })
    };

    let ast_binary = |tag: &str, left: Expression, right: Expression| {
        Expression::Variant(VariantExpression {
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
            type_part_definition_event_hash: Some(expr_type_part_hash.clone()),
        })
    };

    let mul = ast_binary("multiply", ast_num(10), ast_num(3)); // 30
    let sub = ast_binary("subtract", ast_num(100), mul); // 70
    let div = ast_binary("divide", ast_num(50), ast_num(2)); // 25
    let add = ast_binary("add", sub, div); // 95

    ModulePartEntry {
        name: "sample-ast-calc".into(),
        part_type: Some(PartType::Number),
        description: Description::localized(vec![
            (
                "en",
                "Evaluates AST expression (100 - (10 * 3)) + (50 / 2) = 95 using core::eval-ast",
            ),
            (
                "ja",
                "core::eval-ast を用いて AST 式 (100 - (10 * 3)) + (50 / 2) = 95 を評価するサンプル",
            ),
        ]),
        content_hash: None,
        expression: Some(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                eval_ast_part_hash,
            ))),
            argument: Box::new(add),
        })),
    }
}
