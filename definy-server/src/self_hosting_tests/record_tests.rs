//! レコード式・フィールドアクセス・動的レコード値等価比較に関するセルフホスティング実証テスト。
//!
//! `core.type-check`, `core.eval-value`, `core.value-equals`, `core.validate-part` における
//! レコード構築およびフィールドアクセスの動作を実証します。

use definy_core::expression_eval::Value;
use definy_event::event::{
    Expression, ListLiteralExpression, NumberExpression, StringExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, VariantExpression, derive_module_part_id,
};

use super::helpers::{
    call_part1, call_part2, create_test_module_events, get_test_account_and_mod_id,
};

fn all_type_checker_parts(
    mod_id: &definy_event::EventHashId,
) -> Vec<definy_event::event::ModulePartEntry> {
    vec![
        crate::builtin_type_checker::create_type_error_part(mod_id),
        crate::builtin_type_checker::create_type_result_part(mod_id),
        crate::builtin_type_checker::create_type_env_part(mod_id),
        crate::builtin_type_checker::create_type_env_lookup_part(mod_id),
        crate::builtin_type_checker::create_type_env_lookup_inner_part(mod_id),
        crate::builtin_type_checker::create_type_env_extend_part(mod_id),
        crate::builtin_type_checker::create_type_equals_part(mod_id),
        crate::builtin_type_checker::create_type_equals_record_fields_part(mod_id),
        crate::builtin_type_checker::create_type_equals_union_variants_part(mod_id),
        crate::builtin_type_checker::create_record_field_type_lookup_part(mod_id),
        crate::builtin_type_checker::create_type_check_record_fields_part(mod_id),
        crate::builtin_type_checker::create_type_assignable_record_fields_part(mod_id),
        crate::builtin_type_checker::create_union_variant_type_lookup_part(mod_id),
        crate::builtin_type_checker::create_find_tag_in_arms_part(mod_id),
        crate::builtin_type_checker::create_check_union_exhaustiveness_part(mod_id),
        crate::builtin_type_checker::create_type_assignable_union_variants_part(mod_id),
        crate::builtin_type_checker::create_type_check_match_arms_inner_part(mod_id),
        crate::builtin_type_checker::create_type_check_match_arms_part(mod_id),
        crate::builtin_type_checker::create_type_assignable_part(mod_id),
        crate::builtin_type_checker::create_type_check_part(mod_id),
        crate::builtin_type_checker::create_type_check_against_part(mod_id),
    ]
}

fn all_evaluator_parts(
    mod_id: &definy_event::EventHashId,
) -> Vec<definy_event::event::ModulePartEntry> {
    vec![
        crate::builtin_value_type::create_value_type_part(mod_id),
        crate::builtin_value_type::create_env_type_part(mod_id),
        crate::builtin_value_type::create_env_lookup_part(mod_id),
        crate::builtin_value_type::create_env_lookup_inner_part(mod_id),
        crate::builtin_value_type::create_env_extend_part(mod_id),
        crate::builtin_evaluator::create_record_field_lookup_part(mod_id),
        crate::builtin_evaluator::create_eval_record_fields_part(mod_id),
        crate::builtin_eval_match::create_eval_match_arms_part(mod_id),
        crate::builtin_eval_match::create_eval_match_arms_inner_part(mod_id),
        crate::builtin_evaluator::create_eval_value_part(mod_id),
    ]
}

#[test]
fn test_self_hosted_record_type_checking_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_check_hash = derive_module_part_id(&mod_id, "type-check");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let events = create_test_module_events(account, parts, 180);

    // AST for record: { count: 42, label: "items" }
    // Expression::Variant("record", [ { key: "count", value: Expression::Variant("number", 42) }, { key: "label", value: Expression::Variant("string", "items") } ])
    let num_expr = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash.clone()),
        tag: "number".into(),
        payload: Some(Box::new(Expression::Number(NumberExpression { value: 42 }))),
    });
    let str_expr = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash.clone()),
        tag: "string".into(),
        payload: Some(Box::new(Expression::String(StringExpression {
            value: "items".into(),
        }))),
    });

    let record_ast = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash),
        tag: "record".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                Expression::TypeLiteral(TypeLiteralExpression {
                    items: vec![
                        TypeLiteralItemExpression {
                            key: "key".into(),
                            value: Box::new(Expression::String(StringExpression {
                                value: "count".into(),
                            })),
                        },
                        TypeLiteralItemExpression {
                            key: "value".into(),
                            value: Box::new(num_expr),
                        },
                    ],
                }),
                Expression::TypeLiteral(TypeLiteralExpression {
                    items: vec![
                        TypeLiteralItemExpression {
                            key: "key".into(),
                            value: Box::new(Expression::String(StringExpression {
                                value: "label".into(),
                            })),
                        },
                        TypeLiteralItemExpression {
                            key: "value".into(),
                            value: Box::new(str_expr),
                        },
                    ],
                }),
            ],
        }))),
    });

    let empty_env = Expression::ListLiteral(ListLiteralExpression { items: vec![] });
    let check_call = call_part2(type_check_hash, record_ast, empty_env);

    let result = definy_core::evaluate_expression(&check_call, &events)
        .expect("Failed to evaluate record type checking");

    let expected = Value::Variant {
        tag: "ok".into(),
        payload: Some(Box::new(Value::Variant {
            tag: "record".into(),
            payload: Some(Box::new(Value::List(vec![
                Value::Record(vec![
                    ("key".into(), Value::String("count".into())),
                    (
                        "field_type".into(),
                        Value::Variant {
                            tag: "number".into(),
                            payload: None,
                        },
                    ),
                ]),
                Value::Record(vec![
                    ("key".into(), Value::String("label".into())),
                    (
                        "field_type".into(),
                        Value::Variant {
                            tag: "string".into(),
                            payload: None,
                        },
                    ),
                ]),
            ]))),
        })),
    };

    assert_eq!(result, expected);
}

#[test]
fn test_self_hosted_record_get_type_checking_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_check_hash = derive_module_part_id(&mod_id, "type-check");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let events = create_test_module_events(account, parts, 181);

    // Environment: variable 0 has type record([ { key: "age", field_type: number } ])
    let age_record_type = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "record".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "key".into(),
                        value: Box::new(Expression::String(StringExpression {
                            value: "age".into(),
                        })),
                    },
                    TypeLiteralItemExpression {
                        key: "field_type".into(),
                        value: Box::new(Expression::Variant(VariantExpression {
                            type_part_definition_event_hash: None,
                            tag: "number".into(),
                            payload: None,
                        })),
                    },
                ],
            })],
        }))),
    });

    let env = Expression::ListLiteral(ListLiteralExpression {
        items: vec![Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "variable_id".into(),
                    value: Box::new(Expression::Number(NumberExpression { value: 0 })),
                },
                TypeLiteralItemExpression {
                    key: "var_type".into(),
                    value: Box::new(age_record_type),
                },
            ],
        })],
    });

    // 1. Success case: record_get({ record: variable(0), key: "age" }) -> ok(number)
    let var0_expr = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash.clone()),
        tag: "variable".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![TypeLiteralItemExpression {
                key: "variable_id".into(),
                value: Box::new(Expression::Number(NumberExpression { value: 0 })),
            }],
        }))),
    });

    let record_get_age = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash.clone()),
        tag: "record_get".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "record".into(),
                    value: Box::new(var0_expr.clone()),
                },
                TypeLiteralItemExpression {
                    key: "key".into(),
                    value: Box::new(Expression::String(StringExpression {
                        value: "age".into(),
                    })),
                },
            ],
        }))),
    });

    let check_success = call_part2(type_check_hash.clone(), record_get_age, env.clone());
    let res_success = definy_core::evaluate_expression(&check_success, &events)
        .expect("Failed to evaluate record_get type check");
    assert_eq!(
        res_success,
        Value::Variant {
            tag: "ok".into(),
            payload: Some(Box::new(Value::Variant {
                tag: "number".into(),
                payload: None,
            })),
        }
    );

    // 2. Field not found case: record_get({ record: variable(0), key: "unknown_field" }) -> error(field_not_found)
    let record_get_missing = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash.clone()),
        tag: "record_get".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "record".into(),
                    value: Box::new(var0_expr),
                },
                TypeLiteralItemExpression {
                    key: "key".into(),
                    value: Box::new(Expression::String(StringExpression {
                        value: "unknown_field".into(),
                    })),
                },
            ],
        }))),
    });

    let check_missing = call_part2(type_check_hash.clone(), record_get_missing, env);
    let res_missing = definy_core::evaluate_expression(&check_missing, &events)
        .expect("Failed to evaluate missing field type check");
    assert_eq!(
        res_missing,
        Value::Variant {
            tag: "error".into(),
            payload: Some(Box::new(Value::Variant {
                tag: "field_not_found".into(),
                payload: Some(Box::new(Value::Record(vec![(
                    "key".into(),
                    Value::String("unknown_field".into())
                )]))),
            })),
        }
    );

    // 3. Not a record case: record_get on number literal -> error(not_a_record)
    let num_ast = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash.clone()),
        tag: "number".into(),
        payload: Some(Box::new(Expression::Number(NumberExpression { value: 99 }))),
    });
    let record_get_on_num = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash),
        tag: "record_get".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "record".into(),
                    value: Box::new(num_ast),
                },
                TypeLiteralItemExpression {
                    key: "key".into(),
                    value: Box::new(Expression::String(StringExpression {
                        value: "age".into(),
                    })),
                },
            ],
        }))),
    });

    let empty_env = Expression::ListLiteral(ListLiteralExpression { items: vec![] });
    let check_not_record = call_part2(type_check_hash, record_get_on_num, empty_env);
    let res_not_record = definy_core::evaluate_expression(&check_not_record, &events)
        .expect("Failed to evaluate not a record type check");
    assert_eq!(
        res_not_record,
        Value::Variant {
            tag: "error".into(),
            payload: Some(Box::new(Value::Variant {
                tag: "not_a_record".into(),
                payload: Some(Box::new(Value::Record(vec![(
                    "actual".into(),
                    Value::Variant {
                        tag: "number".into(),
                        payload: None,
                    }
                )]))),
            })),
        }
    );
}

#[test]
fn test_self_hosted_record_eval_value_and_get_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_evaluator_parts(&mod_id);
    let eval_hash = derive_module_part_id(&mod_id, "eval-value");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let events = create_test_module_events(account, parts, 182);

    // Expression: record([ { key: "x", value: 10 + 20 }, { key: "msg", value: "hello" } ])
    let ten = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash.clone()),
        tag: "number".into(),
        payload: Some(Box::new(Expression::Number(NumberExpression { value: 10 }))),
    });
    let twenty = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash.clone()),
        tag: "number".into(),
        payload: Some(Box::new(Expression::Number(NumberExpression { value: 20 }))),
    });
    let add_expr = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash.clone()),
        tag: "add".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "left".into(),
                    value: Box::new(ten),
                },
                TypeLiteralItemExpression {
                    key: "right".into(),
                    value: Box::new(twenty),
                },
            ],
        }))),
    });
    let msg_expr = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash.clone()),
        tag: "string".into(),
        payload: Some(Box::new(Expression::String(StringExpression {
            value: "hello".into(),
        }))),
    });

    let record_ast = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash.clone()),
        tag: "record".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                Expression::TypeLiteral(TypeLiteralExpression {
                    items: vec![
                        TypeLiteralItemExpression {
                            key: "key".into(),
                            value: Box::new(Expression::String(StringExpression {
                                value: "x".into(),
                            })),
                        },
                        TypeLiteralItemExpression {
                            key: "value".into(),
                            value: Box::new(add_expr),
                        },
                    ],
                }),
                Expression::TypeLiteral(TypeLiteralExpression {
                    items: vec![
                        TypeLiteralItemExpression {
                            key: "key".into(),
                            value: Box::new(Expression::String(StringExpression {
                                value: "msg".into(),
                            })),
                        },
                        TypeLiteralItemExpression {
                            key: "value".into(),
                            value: Box::new(msg_expr),
                        },
                    ],
                }),
            ],
        }))),
    });

    let empty_env = Expression::ListLiteral(ListLiteralExpression { items: vec![] });
    let eval_record_call = call_part2(eval_hash.clone(), record_ast.clone(), empty_env.clone());

    let eval_res = definy_core::evaluate_expression(&eval_record_call, &events)
        .expect("Failed to evaluate record literal expression");

    let expected_record_val = Value::Variant {
        tag: "record".into(),
        payload: Some(Box::new(Value::List(vec![
            Value::Record(vec![
                ("key".into(), Value::String("x".into())),
                (
                    "value".into(),
                    Value::Variant {
                        tag: "number".into(),
                        payload: Some(Box::new(Value::Number(30))),
                    },
                ),
            ]),
            Value::Record(vec![
                ("key".into(), Value::String("msg".into())),
                (
                    "value".into(),
                    Value::Variant {
                        tag: "string".into(),
                        payload: Some(Box::new(Value::String("hello".into()))),
                    },
                ),
            ]),
        ]))),
    };
    assert_eq!(eval_res, expected_record_val);

    // Test record_get: record_get({ record: record_ast, key: "x" }) -> number(30)
    let get_x_ast = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash.clone()),
        tag: "record_get".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "record".into(),
                    value: Box::new(record_ast.clone()),
                },
                TypeLiteralItemExpression {
                    key: "key".into(),
                    value: Box::new(Expression::String(StringExpression { value: "x".into() })),
                },
            ],
        }))),
    });
    let get_x_call = call_part2(eval_hash.clone(), get_x_ast, empty_env.clone());
    let get_x_res = definy_core::evaluate_expression(&get_x_call, &events)
        .expect("Failed to evaluate record_get field 'x'");
    assert_eq!(
        get_x_res,
        Value::Variant {
            tag: "number".into(),
            payload: Some(Box::new(Value::Number(30))),
        }
    );

    // Test missing key: record_get({ record: record_ast, key: "not_found" }) -> unit
    let get_missing_ast = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash),
        tag: "record_get".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "record".into(),
                    value: Box::new(record_ast),
                },
                TypeLiteralItemExpression {
                    key: "key".into(),
                    value: Box::new(Expression::String(StringExpression {
                        value: "not_found".into(),
                    })),
                },
            ],
        }))),
    });
    let get_missing_call = call_part2(eval_hash, get_missing_ast, empty_env);
    let get_missing_res = definy_core::evaluate_expression(&get_missing_call, &events)
        .expect("Failed to evaluate record_get missing key");
    assert_eq!(
        get_missing_res,
        Value::Variant {
            tag: "unit".into(),
            payload: None,
        }
    );
}

#[test]
fn test_self_hosted_record_value_equals_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let val_equals = crate::builtin_value_type::create_value_equals_part(&mod_id);
    let val_equals_rec = crate::builtin_value_type::create_value_equals_record_fields_part(&mod_id);

    let val_equals_hash = derive_module_part_id(&mod_id, "value-equals");
    let val_part_hash = derive_module_part_id(&mod_id, "value");

    let events = create_test_module_events(account, vec![val_equals, val_equals_rec], 183);

    let make_val_num = |n: i64| {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: Some(val_part_hash.clone()),
            tag: "number".into(),
            payload: Some(Box::new(Expression::Number(NumberExpression { value: n }))),
        })
    };
    let make_val_str = |s: &str| {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: Some(val_part_hash.clone()),
            tag: "string".into(),
            payload: Some(Box::new(Expression::String(StringExpression {
                value: s.into(),
            }))),
        })
    };

    let make_val_record = |fields: Vec<(&str, Expression)>| {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: Some(val_part_hash.clone()),
            tag: "record".into(),
            payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
                items: fields
                    .into_iter()
                    .map(|(k, v)| {
                        Expression::TypeLiteral(TypeLiteralExpression {
                            items: vec![
                                TypeLiteralItemExpression {
                                    key: "key".into(),
                                    value: Box::new(Expression::String(StringExpression {
                                        value: k.into(),
                                    })),
                                },
                                TypeLiteralItemExpression {
                                    key: "value".into(),
                                    value: Box::new(v),
                                },
                            ],
                        })
                    })
                    .collect(),
            }))),
        })
    };

    let rec1 = make_val_record(vec![("a", make_val_num(10)), ("b", make_val_str("ok"))]);
    let rec1_same = make_val_record(vec![("a", make_val_num(10)), ("b", make_val_str("ok"))]);
    let rec2_diff_val = make_val_record(vec![("a", make_val_num(99)), ("b", make_val_str("ok"))]);
    let rec3_diff_key = make_val_record(vec![("z", make_val_num(10)), ("b", make_val_str("ok"))]);

    // rec1 == rec1_same -> true
    let call_equal = call_part2(val_equals_hash.clone(), rec1.clone(), rec1_same);
    let res_equal = definy_core::evaluate_expression(&call_equal, &events)
        .expect("Failed to compare equal record values");
    assert_eq!(res_equal, Value::Bool(true));

    // rec1 == rec2_diff_val -> false
    let call_diff_val = call_part2(val_equals_hash.clone(), rec1.clone(), rec2_diff_val);
    let res_diff_val = definy_core::evaluate_expression(&call_diff_val, &events)
        .expect("Failed to compare records with different value");
    assert_eq!(res_diff_val, Value::Bool(false));

    // rec1 == rec3_diff_key -> false
    let call_diff_key = call_part2(val_equals_hash, rec1, rec3_diff_key);
    let res_diff_key = definy_core::evaluate_expression(&call_diff_key, &events)
        .expect("Failed to compare records with different key");
    assert_eq!(res_diff_key, Value::Bool(false));
}

#[test]
fn test_self_hosted_validate_part_with_record_expression() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let mut parts = all_type_checker_parts(&mod_id);
    let validate_part = crate::builtin_validator::create_validate_part_part(&mod_id);
    parts.push(validate_part);

    let validate_part_hash = derive_module_part_id(&mod_id, "validate-part");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");
    let type_ast_hash = derive_module_part_id(&mod_id, "type-ast");

    let events = create_test_module_events(account, parts, 184);

    // Target Part:
    // name: "user_info"
    // part_type: record([ { key: "id", field_type: number } ])
    // expression: record([ { key: "id", value: 100 } ])
    let num_ast = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash.clone()),
        tag: "number".into(),
        payload: Some(Box::new(Expression::Number(NumberExpression {
            value: 100,
        }))),
    });
    let record_expr = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash),
        tag: "record".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "key".into(),
                        value: Box::new(Expression::String(StringExpression {
                            value: "id".into(),
                        })),
                    },
                    TypeLiteralItemExpression {
                        key: "value".into(),
                        value: Box::new(num_ast),
                    },
                ],
            })],
        }))),
    });

    let number_type = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(type_ast_hash.clone()),
        tag: "number".into(),
        payload: None,
    });
    let declared_record_type = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(type_ast_hash),
        tag: "record".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "key".into(),
                        value: Box::new(Expression::String(StringExpression {
                            value: "id".into(),
                        })),
                    },
                    TypeLiteralItemExpression {
                        key: "field_type".into(),
                        value: Box::new(number_type),
                    },
                ],
            })],
        }))),
    });

    let part_def = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "name".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "user_info".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "description".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "sample user record part".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "part_type".into(),
                value: Box::new(declared_record_type),
            },
            TypeLiteralItemExpression {
                key: "expression".into(),
                value: Box::new(record_expr),
            },
        ],
    });

    let call_validate = call_part1(validate_part_hash, part_def);
    let result = definy_core::evaluate_expression(&call_validate, &events)
        .expect("Failed to validate part with record expression");

    assert_eq!(result, Value::Bool(true));
}

#[test]
fn test_self_hosted_record_width_subtyping_in_call_and_against() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_assignable_hash = derive_module_part_id(&mod_id, "type-assignable");
    let type_check_hash = derive_module_part_id(&mod_id, "type-check");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let events = create_test_module_events(account, parts, 183);

    let num_type = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "number".into(),
        payload: None,
    });
    let str_type = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "string".into(),
        payload: None,
    });

    let make_field = |k: &str, t: Expression| {
        Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "key".into(),
                    value: Box::new(Expression::String(StringExpression { value: k.into() })),
                },
                TypeLiteralItemExpression {
                    key: "field_type".into(),
                    value: Box::new(t),
                },
            ],
        })
    };

    // 期待型: { clock: number }
    let expected_clock_record_type = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "record".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![make_field("clock", num_type.clone())],
        }))),
    });

    // 実際の型: { clock: number, crypto: string, random: number } (余計なフィールドあり)
    let actual_large_record_type = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "record".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                make_field("clock", num_type.clone()),
                make_field("crypto", str_type.clone()),
                make_field("random", num_type.clone()),
            ],
        }))),
    });

    // 1. type-assignable(actual_large, expected_clock) -> true !
    let call_subtyping = call_part2(
        type_assignable_hash.clone(),
        actual_large_record_type.clone(),
        expected_clock_record_type.clone(),
    );
    let res_subtyping = definy_core::evaluate_expression(&call_subtyping, &events)
        .expect("Failed to evaluate type-assignable");
    assert_eq!(
        res_subtyping,
        Value::Bool(true),
        "Actual record with extra fields should be assignable to expected record"
    );

    // 2. 逆方向 type-assignable(expected_clock, actual_large) -> false ! (不足フィールドあり)
    let call_reverse = call_part2(
        type_assignable_hash.clone(),
        expected_clock_record_type.clone(),
        actual_large_record_type,
    );
    let res_reverse = definy_core::evaluate_expression(&call_reverse, &events)
        .expect("Failed to evaluate reverse type-assignable");
    assert_eq!(
        res_reverse,
        Value::Bool(false),
        "Record lacking required fields must not be assignable"
    );

    // 3. フィールドの並び順が異なる場合: { crypto: string, clock: number } -> true !
    let reordered_record_type = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "record".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                make_field("crypto", str_type),
                make_field("clock", num_type.clone()),
            ],
        }))),
    });
    let call_reordered = call_part2(
        type_assignable_hash,
        reordered_record_type,
        expected_clock_record_type.clone(),
    );
    let res_reordered = definy_core::evaluate_expression(&call_reordered, &events)
        .expect("Failed to evaluate reordered type-assignable");
    assert_eq!(
        res_reordered,
        Value::Bool(true),
        "Reordered record fields must be assignable"
    );

    // 4. 関数呼び出し (Call 式):
    // funcA: { clock: number } -> number
    // call(funcA, { clock: 42, crypto: "secret", random: 99 }) -> ok(number)
    let func_type = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "function".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "parameter".into(),
                    value: Box::new(expected_clock_record_type),
                },
                TypeLiteralItemExpression {
                    key: "return_type".into(),
                    value: Box::new(num_type),
                },
            ],
        }))),
    });

    let env = Expression::ListLiteral(ListLiteralExpression {
        items: vec![Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "variable_id".into(),
                    value: Box::new(Expression::Number(NumberExpression { value: 10 })),
                },
                TypeLiteralItemExpression {
                    key: "var_type".into(),
                    value: Box::new(func_type),
                },
            ],
        })],
    });

    // 引数: record({ clock: 42, crypto: "secret", random: 99 })
    let make_value_expr = |k: &str, v: Expression| {
        Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "key".into(),
                    value: Box::new(Expression::String(StringExpression { value: k.into() })),
                },
                TypeLiteralItemExpression {
                    key: "value".into(),
                    value: Box::new(v),
                },
            ],
        })
    };

    let arg_record_expr = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash.clone()),
        tag: "record".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                make_value_expr(
                    "clock",
                    Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: Some(expr_type_hash.clone()),
                        tag: "number".into(),
                        payload: Some(Box::new(Expression::Number(NumberExpression { value: 42 }))),
                    }),
                ),
                make_value_expr(
                    "crypto",
                    Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: Some(expr_type_hash.clone()),
                        tag: "string".into(),
                        payload: Some(Box::new(Expression::String(StringExpression {
                            value: "secret".into(),
                        }))),
                    }),
                ),
                make_value_expr(
                    "random",
                    Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: Some(expr_type_hash.clone()),
                        tag: "number".into(),
                        payload: Some(Box::new(Expression::Number(NumberExpression { value: 99 }))),
                    }),
                ),
            ],
        }))),
    });

    let call_func_expr = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expr_type_hash.clone()),
        tag: "call".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "function".into(),
                    value: Box::new(Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: Some(expr_type_hash),
                        tag: "variable".into(),
                        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                            items: vec![TypeLiteralItemExpression {
                                key: "variable_id".into(),
                                value: Box::new(Expression::Number(NumberExpression { value: 10 })),
                            }],
                        }))),
                    })),
                },
                TypeLiteralItemExpression {
                    key: "argument".into(),
                    value: Box::new(arg_record_expr),
                },
            ],
        }))),
    });

    let check_call = call_part2(type_check_hash, call_func_expr, env);
    let check_result = definy_core::evaluate_expression(&check_call, &events)
        .expect("Failed to evaluate call type check with extra record fields");

    assert_eq!(
        check_result,
        Value::Variant {
            tag: "ok".into(),
            payload: Some(Box::new(Value::Variant {
                tag: "number".into(),
                payload: None,
            })),
        },
        "Call with extra record fields must type check successfully"
    );
}
