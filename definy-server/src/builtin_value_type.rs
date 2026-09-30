use definy_event::EventHashId;
use definy_event::event::{
    BooleanExpression, CallExpression, Description, EqualExpression, Expression,
    FunctionExpression, IfExpression, LessThanExpression, ListAppendExpression, ListGetExpression,
    ListLengthExpression, MatchArm, MatchExpression, ModulePartEntry, NumberExpression,
    PartReferenceExpression, PartType, RecordGetExpression, SubtractExpression, TypeListExpression,
    TypeLiteralExpression, TypeLiteralItemExpression, TypeUnionExpression, TypeUnionVariant,
    VariableExpression, VariantExpression, derive_module_part_id,
};

/// definy のランタイム値を表す自己記述型 (`core.value`)
pub fn create_value_type_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let val_part_hash = derive_module_part_id(core_module_id, "value");
    let val_ref = Expression::PartReference(PartReferenceExpression::new(val_part_hash));
    let expr_part_hash = derive_module_part_id(core_module_id, "expression");
    let expr_ref = Expression::PartReference(PartReferenceExpression::new(expr_part_hash));

    let env_item_type = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "variable_id".into(),
                value: Box::new(Expression::TypeNumber),
            },
            TypeLiteralItemExpression {
                key: "value".into(),
                value: Box::new(val_ref.clone()),
            },
        ],
    });

    ModulePartEntry {
        name: "value".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            ("en", "Definy runtime value type (self-describing value)"),
            ("ja", "Definy のランタイム値型 (値の自己表現)"),
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
                    tag: "list".into(),
                    payload_type: Some(Box::new(Expression::TypeList(TypeListExpression {
                        item_type: Box::new(val_ref.clone()),
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
                                    value: Box::new(val_ref.clone()),
                                },
                            ],
                        })),
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
                                value: Box::new(val_ref.clone()),
                            },
                        ],
                    }))),
                },
                TypeUnionVariant {
                    tag: "closure".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![
                            TypeLiteralItemExpression {
                                key: "parameter_variable_id".into(),
                                value: Box::new(Expression::TypeNumber),
                            },
                            TypeLiteralItemExpression {
                                key: "body".into(),
                                value: Box::new(expr_ref),
                            },
                            TypeLiteralItemExpression {
                                key: "captured_env".into(),
                                value: Box::new(Expression::TypeList(TypeListExpression {
                                    item_type: Box::new(env_item_type),
                                })),
                            },
                        ],
                    }))),
                },
                TypeUnionVariant {
                    tag: "unit".into(),
                    payload_type: None,
                },
            ],
        })),
    }
}

/// definy の評価環境型 (`core.env` = `list<{ variable_id: number, value: value }>`)
pub fn create_env_type_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let val_part_hash = derive_module_part_id(core_module_id, "value");
    let val_ref = Expression::PartReference(PartReferenceExpression::new(val_part_hash));

    ModulePartEntry {
        name: "env".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            (
                "en",
                "Definy runtime evaluation environment (variable bindings)",
            ),
            ("ja", "Definy のランタイム評価環境 (変数束縛環境)"),
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
                        key: "value".into(),
                        value: Box::new(val_ref),
                    },
                ],
            })),
        })),
    }
}

/// 環境から変数IDを検索して値を返す関数 (`core.env-lookup`)
/// `env -> number -> value` (カリー化関数)
pub fn create_env_lookup_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let val_part_hash = derive_module_part_id(core_module_id, "value");
    let env_part_hash = derive_module_part_id(core_module_id, "env");
    let env_lookup_inner_hash = derive_module_part_id(core_module_id, "env-lookup-inner");

    // env-lookup(env)(var_id) = env-lookup-inner(env)(var_id)(list_length(env) - 1)
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
                            PartReferenceExpression::new(env_lookup_inner_hash),
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
        name: "env-lookup".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(env_part_hash)),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::TypePart(val_part_hash)),
            }),
        }),
        description: Description::localized(vec![
            ("en", "Lookup a variable in the environment"),
            ("ja", "環境から変数を探索して値を返却"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// `core.env-lookup-inner`: `env -> var_id -> idx -> value`
pub fn create_env_lookup_inner_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let val_part_hash = derive_module_part_id(core_module_id, "value");
    let env_part_hash = derive_module_part_id(core_module_id, "env");
    let env_lookup_inner_hash = derive_module_part_id(core_module_id, "env-lookup-inner");

    let unit_val = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "unit".into(),
        payload: None,
    });

    let recurse_prev = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    env_lookup_inner_hash,
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

    let current_item = Expression::ListGet(ListGetExpression {
        list: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
        index: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
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
                    then_expr: Box::new(unit_val),
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
                        then_expr: Box::new(Expression::RecordGet(RecordGetExpression {
                            record: Box::new(current_item),
                            key: "value".into(),
                        })),
                        else_expr: Box::new(recurse_prev),
                    })),
                })),
            })),
        })),
    });

    ModulePartEntry {
        name: "env-lookup-inner".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(env_part_hash)),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::TypePart(val_part_hash)),
                }),
            }),
        }),
        description: Description::localized(vec![
            ("en", "Inner helper for env-lookup with index recursion"),
            ("ja", "env-lookup のインデックス再帰用内部ヘルパー"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// 環境に変数を追加して新しい環境を返す関数 (`core.env-extend`)
/// `env -> number -> value -> env`
pub fn create_env_extend_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let val_part_hash = derive_module_part_id(core_module_id, "value");
    let env_part_hash = derive_module_part_id(core_module_id, "env");

    let new_entry = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "variable_id".into(),
                value: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            },
            TypeLiteralItemExpression {
                key: "value".into(),
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
                parameter_name: "val".into(),
                body: Box::new(Expression::ListAppend(ListAppendExpression {
                    list: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
                    item: Box::new(new_entry),
                })),
            })),
        })),
    });

    ModulePartEntry {
        name: "env-extend".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(env_part_hash.clone())),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::TypePart(val_part_hash)),
                    return_type: Box::new(PartType::TypePart(env_part_hash)),
                }),
            }),
        }),
        description: Description::localized(vec![
            ("en", "Extend environment with a new variable binding"),
            ("ja", "環境に新しい変数束縛を追加した新しい環境を返却"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// 2つの動的値が等しいかを再帰的に判定する自己記述関数 (`core.value-equals`)
/// `value -> value -> boolean` (カリー化関数)
pub fn create_value_equals_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let val_part_hash = derive_module_part_id(core_module_id, "value");
    let val_equals_hash = derive_module_part_id(core_module_id, "value-equals");

    // Helper: recursive call value-equals(a)(b)
    let recurse_eq = |a: Expression, b: Expression| {
        Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    val_equals_hash.clone(),
                ))),
                argument: Box::new(a),
            })),
            argument: Box::new(b),
        })
    };

    let false_expr = Expression::Boolean(BooleanExpression { value: false });
    let true_expr = Expression::Boolean(BooleanExpression { value: true });

    let primitive_eq_arm = |tag: &'static str, var1_id: i64, var2_id: i64| MatchArm {
        tag: tag.into(),
        variable_id: Some(var1_id),
        variable_name: Some("v1".into()),
        body: Box::new(Expression::Match(MatchExpression {
            target: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            arms: vec![
                MatchArm {
                    tag: tag.into(),
                    variable_id: Some(var2_id),
                    variable_name: Some("v2".into()),
                    body: Box::new(Expression::Equal(EqualExpression {
                        left: Box::new(Expression::Variable(VariableExpression {
                            variable_id: var1_id,
                        })),
                        right: Box::new(Expression::Variable(VariableExpression {
                            variable_id: var2_id,
                        })),
                    })),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(99),
                    variable_name: Some("_".into()),
                    body: Box::new(false_expr.clone()),
                },
            ],
            default: None,
        })),
    };

    // For variant:
    let var1_id = 14;
    let var2_id = 24;
    let variant_body = Expression::Match(MatchExpression {
        target: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
        arms: vec![
            MatchArm {
                tag: "variant".into(),
                variable_id: Some(var2_id),
                variable_name: Some("v2".into()),
                body: Box::new(Expression::If(IfExpression {
                    condition: Box::new(Expression::Equal(EqualExpression {
                        left: Box::new(Expression::RecordGet(RecordGetExpression {
                            record: Box::new(Expression::Variable(VariableExpression {
                                variable_id: var1_id,
                            })),
                            key: "tag".into(),
                        })),
                        right: Box::new(Expression::RecordGet(RecordGetExpression {
                            record: Box::new(Expression::Variable(VariableExpression {
                                variable_id: var2_id,
                            })),
                            key: "tag".into(),
                        })),
                    })),
                    then_expr: Box::new(recurse_eq(
                        Expression::RecordGet(RecordGetExpression {
                            record: Box::new(Expression::Variable(VariableExpression {
                                variable_id: var1_id,
                            })),
                            key: "payload".into(),
                        }),
                        Expression::RecordGet(RecordGetExpression {
                            record: Box::new(Expression::Variable(VariableExpression {
                                variable_id: var2_id,
                            })),
                            key: "payload".into(),
                        }),
                    )),
                    else_expr: Box::new(false_expr.clone()),
                })),
            },
            MatchArm {
                tag: "_".into(),
                variable_id: Some(99),
                variable_name: Some("_".into()),
                body: Box::new(false_expr.clone()),
            },
        ],
        default: None,
    });

    let arms = vec![
        primitive_eq_arm("number", 10, 20),
        primitive_eq_arm("string", 11, 21),
        primitive_eq_arm("boolean", 12, 22),
        // unit
        MatchArm {
            tag: "unit".into(),
            variable_id: None,
            variable_name: None,
            body: Box::new(Expression::Match(MatchExpression {
                target: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                arms: vec![
                    MatchArm {
                        tag: "unit".into(),
                        variable_id: None,
                        variable_name: None,
                        body: Box::new(true_expr),
                    },
                    MatchArm {
                        tag: "_".into(),
                        variable_id: Some(99),
                        variable_name: Some("_".into()),
                        body: Box::new(false_expr.clone()),
                    },
                ],
                default: None,
            })),
        },
        // variant
        MatchArm {
            tag: "variant".into(),
            variable_id: Some(var1_id),
            variable_name: Some("v1".into()),
            body: Box::new(variant_body),
        },
        // fallback
        MatchArm {
            tag: "_".into(),
            variable_id: Some(99),
            variable_name: Some("_".into()),
            body: Box::new(false_expr),
        },
    ];

    let body = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "val_a".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "val_b".into(),
            body: Box::new(Expression::Match(MatchExpression {
                target: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
                arms,
                default: None,
            })),
        })),
    });

    ModulePartEntry {
        name: "value-equals".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(val_part_hash.clone())),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::TypePart(val_part_hash)),
                return_type: Box::new(PartType::Boolean),
            }),
        }),
        description: Description::localized(vec![
            ("en", "Compare two dynamic values for equality"),
            ("ja", "2つの動的値が等しいかを再帰的に判定する関数"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}
