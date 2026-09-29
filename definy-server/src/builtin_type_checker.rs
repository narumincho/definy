use definy_event::EventHashId;
use definy_event::event::{
    CallExpression, Description, EqualExpression, Expression, FunctionExpression, IfExpression,
    LessThanExpression, ListAppendExpression, ListGetExpression, ListLengthExpression, MatchArm,
    MatchExpression, ModulePartEntry, NumberExpression, PartReferenceExpression, PartType,
    RecordGetExpression, SubtractExpression, TypeListExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, TypeUnionExpression, TypeUnionVariant, VariableExpression,
    VariantExpression, derive_module_part_id,
};

/// 型検査エラーを表す直和型 (`core.type-error`)
pub fn create_type_error_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_ast_ref = Expression::PartReference(PartReferenceExpression::new(type_ast_hash));

    ModulePartEntry {
        name: "type-error".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            ("en", "Definy type checker error diagnostics"),
            ("ja", "Definy の自己記述型チェッカーのエラー情報"),
        ]),
        content_hash: None,
        expression: Some(Expression::TypeUnion(TypeUnionExpression {
            variants: vec![
                TypeUnionVariant {
                    tag: "type_mismatch".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![
                            TypeLiteralItemExpression {
                                key: "expected".into(),
                                value: Box::new(type_ast_ref.clone()),
                            },
                            TypeLiteralItemExpression {
                                key: "actual".into(),
                                value: Box::new(type_ast_ref.clone()),
                            },
                        ],
                    }))),
                },
                TypeUnionVariant {
                    tag: "undefined_variable".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "variable_id".into(),
                            value: Box::new(Expression::TypeNumber),
                        }],
                    }))),
                },
                TypeUnionVariant {
                    tag: "not_a_function".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "actual".into(),
                            value: Box::new(type_ast_ref.clone()),
                        }],
                    }))),
                },
                TypeUnionVariant {
                    tag: "condition_not_boolean".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "actual".into(),
                            value: Box::new(type_ast_ref),
                        }],
                    }))),
                },
                TypeUnionVariant {
                    tag: "unknown_error".into(),
                    payload_type: None,
                },
            ],
        })),
    }
}

/// 型検査結果を表す直和型 (`core.type-result`)
/// `ok: type-ast | error: type-error`
pub fn create_type_result_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_ast_ref = Expression::PartReference(PartReferenceExpression::new(type_ast_hash));
    let type_error_hash = derive_module_part_id(core_module_id, "type-error");
    let type_error_ref = Expression::PartReference(PartReferenceExpression::new(type_error_hash));

    ModulePartEntry {
        name: "type-result".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            (
                "en",
                "Result of type checking: ok(type-ast) or error(type-error)",
            ),
            ("ja", "型検査結果 (ok: 成功時の型, error: エラー情報)"),
        ]),
        content_hash: None,
        expression: Some(Expression::TypeUnion(TypeUnionExpression {
            variants: vec![
                TypeUnionVariant {
                    tag: "ok".into(),
                    payload_type: Some(Box::new(type_ast_ref)),
                },
                TypeUnionVariant {
                    tag: "error".into(),
                    payload_type: Some(Box::new(type_error_ref)),
                },
            ],
        })),
    }
}

/// 型環境型 (`core.type-env` = `list<{ variable_id: number, var_type: type-ast }>`)
pub fn create_type_env_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_ast_ref = Expression::PartReference(PartReferenceExpression::new(type_ast_hash));

    ModulePartEntry {
        name: "type-env".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            (
                "en",
                "Type checking environment mapping variable IDs to types",
            ),
            ("ja", "変数 ID と型の対応を管理する型環境"),
        ]),
        content_hash: None,
        expression: Some(Expression::TypeList(TypeListExpression {
            item_type: Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "variable_id".into(),
                        value: Box::new(Expression::TypeNumber),
                    },
                    TypeLiteralItemExpression {
                        key: "var_type".into(),
                        value: Box::new(type_ast_ref),
                    },
                ],
            })),
        })),
    }
}

/// `core.type-env-lookup`: `type-env -> number -> type-result`
pub fn create_type_env_lookup_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_env_part_hash = derive_module_part_id(core_module_id, "type-env");
    let type_result_part_hash = derive_module_part_id(core_module_id, "type-result");
    let inner_hash = derive_module_part_id(core_module_id, "type-env-lookup-inner");

    let body = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "env".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "var_id".into(),
            body: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::Call(CallExpression {
                        function: Box::new(Expression::PartReference(
                            PartReferenceExpression::new(inner_hash),
                        )),
                        argument: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 0,
                        })),
                    })),
                    argument: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                })),
                argument: Box::new(Expression::Subtract(SubtractExpression {
                    left: Box::new(Expression::ListLength(ListLengthExpression {
                        value: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 0,
                        })),
                    })),
                    right: Box::new(Expression::Number(NumberExpression { value: 1 })),
                })),
            })),
        })),
    });

    ModulePartEntry {
        name: "type-env-lookup".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(type_env_part_hash)),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::TypePart(type_result_part_hash)),
            }),
        }),
        description: Description::localized(vec![
            ("en", "Lookup variable type in type environment"),
            ("ja", "型環境から変数の型を検索"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// `core.type-env-lookup-inner`: `type-env -> var_id -> idx -> type-result`
pub fn create_type_env_lookup_inner_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_env_part_hash = derive_module_part_id(core_module_id, "type-env");
    let type_result_part_hash = derive_module_part_id(core_module_id, "type-result");
    let inner_hash = derive_module_part_id(core_module_id, "type-env-lookup-inner");

    let err_undef = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "error".into(),
        payload: Some(Box::new(Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "undefined_variable".into(),
            payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![TypeLiteralItemExpression {
                    key: "variable_id".into(),
                    value: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                }],
            }))),
        }))),
    });

    let current_item = Expression::ListGet(ListGetExpression {
        list: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
        index: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
    });

    let recurse_prev = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    inner_hash,
                ))),
                argument: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
            })),
            argument: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
        })),
        argument: Box::new(Expression::Subtract(SubtractExpression {
            left: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
            right: Box::new(Expression::Number(NumberExpression { value: 1 })),
        })),
    });

    let body = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "env".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "var_id".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 2,
                parameter_name: "idx".into(),
                body: Box::new(Expression::If(IfExpression {
                    condition: Box::new(Expression::LessThan(LessThanExpression {
                        left: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
                        right: Box::new(Expression::Number(NumberExpression { value: 0 })),
                    })),
                    then_expr: Box::new(err_undef),
                    else_expr: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::Equal(EqualExpression {
                            left: Box::new(Expression::RecordGet(RecordGetExpression {
                                record: Box::new(current_item.clone()),
                                key: "variable_id".into(),
                            })),
                            right: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 1,
                            })),
                        })),
                        then_expr: Box::new(Expression::Variant(VariantExpression {
                            type_part_definition_event_hash: None,
                            tag: "ok".into(),
                            payload: Some(Box::new(Expression::RecordGet(RecordGetExpression {
                                record: Box::new(current_item),
                                key: "var_type".into(),
                            }))),
                        })),
                        else_expr: Box::new(recurse_prev),
                    })),
                })),
            })),
        })),
    });

    ModulePartEntry {
        name: "type-env-lookup-inner".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(type_env_part_hash)),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::TypePart(type_result_part_hash)),
                }),
            }),
        }),
        description: Description::localized(vec![
            ("en", "Inner helper for type-env-lookup recursion"),
            ("ja", "type-env-lookup の再帰用内部ヘルパー"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// `core.type-env-extend`: `type-env -> number -> type-ast -> type-env`
pub fn create_type_env_extend_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_env_part_hash = derive_module_part_id(core_module_id, "type-env");
    let type_ast_part_hash = derive_module_part_id(core_module_id, "type-ast");

    let new_entry = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "variable_id".into(),
                value: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            },
            TypeLiteralItemExpression {
                key: "var_type".into(),
                value: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
            },
        ],
    });

    let body = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "env".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "var_id".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 2,
                parameter_name: "var_type".into(),
                body: Box::new(Expression::ListAppend(ListAppendExpression {
                    list: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
                    item: Box::new(new_entry),
                })),
            })),
        })),
    });

    ModulePartEntry {
        name: "type-env-extend".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(type_env_part_hash.clone())),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::TypePart(type_ast_part_hash)),
                    return_type: Box::new(PartType::TypePart(type_env_part_hash)),
                }),
            }),
        }),
        description: Description::localized(vec![
            ("en", "Extend type environment with a variable type binding"),
            ("ja", "型環境に変数の型束縛を追加"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// `core.type-equals`: `type-ast -> type-ast -> boolean`
pub fn create_type_equals_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_part_hash = derive_module_part_id(core_module_id, "type-ast");

    let body = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "t1".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "t2".into(),
            body: Box::new(Expression::Equal(EqualExpression {
                left: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
                right: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            })),
        })),
    });

    ModulePartEntry {
        name: "type-equals".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(type_ast_part_hash.clone())),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::TypePart(type_ast_part_hash)),
                return_type: Box::new(PartType::Boolean),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Check structural equality between two type-ast values",
            ),
            ("ja", "2つの型 AST が構造的に同一であるかを判定"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

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

    let mut arms = Vec::new();

    // 1. Literal types
    arms.push(MatchArm {
        tag: "number".into(),
        variable_id: Some(10),
        variable_name: Some("n".into()),
        body: Box::new(ok_type(type_num())),
    });
    arms.push(MatchArm {
        tag: "string".into(),
        variable_id: Some(11),
        variable_name: Some("s".into()),
        body: Box::new(ok_type(type_str())),
    });
    arms.push(MatchArm {
        tag: "boolean".into(),
        variable_id: Some(12),
        variable_name: Some("b".into()),
        body: Box::new(ok_type(type_bool())),
    });

    // 2. Arithmetic
    arms.push(binary_num_op("add", &type_check_hash, 13));
    arms.push(binary_num_op("subtract", &type_check_hash, 14));
    arms.push(binary_num_op("multiply", &type_check_hash, 15));
    arms.push(binary_num_op("divide", &type_check_hash, 16));
    arms.push(binary_num_op("remainder", &type_check_hash, 17));

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
