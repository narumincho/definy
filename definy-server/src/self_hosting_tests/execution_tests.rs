//! セルフホスティング機能の動的実行・メタ循環評価（Meta-Circular Evaluation）実証テスト。
//!
//! definy 自身の式・パーツとして実装された評価器、型検査器、バリデータ、フォーマッタ、
//! および WebAssembly コンパイラが実際に definy の実行系上で期待通りに動作することを検証します。

use definy_core::expression_eval::Value;
use definy_event::event::{
    Expression, ListLiteralExpression, StringExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, VariantExpression, derive_module_part_id,
};

use super::helpers::{
    all_evaluator_parts, all_type_checker_parts, ast_add, ast_mul, ast_num, call_part1, call_part2,
    call_part3, create_test_module_events, empty_type_env, get_test_account_and_mod_id,
    test_val_bool, test_val_num, test_val_str, value_list_to_u8_vec,
};

/// `core.eval-ast` パーツに AST 式 `(100 - (10 * 3)) + (50 / 2)` を与え、自己評価結果が 95 になることを実証します。
#[test]
fn test_self_hosted_meta_circular_eval_ast_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();

    let eval_ast_part = crate::builtin_expression_type::create_eval_ast_part(&mod_id);
    let sample_calc_part = crate::builtin_expression_type::create_sample_ast_calc_part(&mod_id);

    let events = create_test_module_events(account, vec![eval_ast_part], 123);

    let sample_expr = sample_calc_part.expression.expect("sample expr required");
    let result = definy_core::evaluate_expression(&sample_expr, &events)
        .expect("Failed to evaluate self-hosted sample calc");

    // Evaluates: (100 - (10 * 3)) + (50 / 2) = 70 + 25 = 95
    assert_eq!(result, Value::Number(95));
}

#[test]
fn test_self_hosted_expression_to_source_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();

    let expr_to_source_part = crate::builtin_formatter::create_expression_to_source_part(&mod_id);
    let to_source_hash = derive_module_part_id(&mod_id, "expression-to-source");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let events = create_test_module_events(account, vec![expr_to_source_part], 124);

    let expr_type_opt = Some(expr_type_hash);
    let ast_expr = ast_add(
        ast_num(10, expr_type_opt.clone()),
        ast_num(20, expr_type_opt.clone()),
        expr_type_opt.clone(),
    );

    let call_expr = call_part1(to_source_hash, ast_expr);

    let result = definy_core::evaluate_expression(&call_expr, &events)
        .expect("Failed to evaluate self-hosted expression-to-source");

    assert_eq!(result, Value::String("(<number> + <number>)".into()));
}

#[test]
fn test_self_hosted_meta_circular_eval_value_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();

    let parts = all_evaluator_parts(&mod_id);
    let eval_hash = derive_module_part_id(&mod_id, "eval-value");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let events = create_test_module_events(account, parts, 125);

    let expr_type_opt = Some(expr_type_hash);
    // Expression: 10 + 25 = 35
    let expr_to_eval = ast_add(
        ast_num(10, expr_type_opt.clone()),
        ast_num(25, expr_type_opt.clone()),
        expr_type_opt,
    );
    let empty_env = Expression::ListLiteral(ListLiteralExpression { items: vec![] });

    let eval_call = call_part2(eval_hash, expr_to_eval, empty_env);

    let result = definy_core::evaluate_expression(&eval_call, &events)
        .expect("Failed to evaluate expression using core.eval-value");

    assert_eq!(
        result,
        Value::Variant {
            tag: "number".into(),
            payload: Some(Box::new(Value::Number(35))),
        }
    );
}

#[test]
fn test_self_hosted_type_checker_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let type_check_hash = derive_module_part_id(&mod_id, "type-check");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let events = create_test_module_events(account, all_type_checker_parts(&mod_id), 126);

    let expr_type_opt = Some(expr_type_hash);
    // Expression: 10 + 20
    let expr_to_check = ast_add(
        ast_num(10, expr_type_opt.clone()),
        ast_num(20, expr_type_opt.clone()),
        expr_type_opt,
    );
    let empty_env = empty_type_env();

    let check_call = call_part2(type_check_hash, expr_to_check, empty_env);

    let result = definy_core::evaluate_expression(&check_call, &events)
        .expect("Failed to type-check expression using core.type-check");

    assert_eq!(
        result,
        Value::Variant {
            tag: "ok".into(),
            payload: Some(Box::new(Value::Variant {
                tag: "number".into(),
                payload: None,
            })),
        }
    );

    let type_equals_hash = derive_module_part_id(&mod_id, "type-equals");
    let number_type = Expression::Variant(VariantExpression {
        tag: "number".into(),
        payload: None,
        type_part_definition_event_hash: None,
    });
    let string_type = Expression::Variant(VariantExpression {
        tag: "string".into(),
        payload: None,
        type_part_definition_event_hash: None,
    });
    let unequal_types = call_part2(type_equals_hash, number_type.clone(), string_type.clone());
    let unequal_types_result = definy_core::evaluate_expression(&unequal_types, &events)
        .expect("Failed to compare distinct primitive type ASTs");
    assert_eq!(unequal_types_result, Value::Bool(false));

    let type_ast_hash = derive_module_part_id(&mod_id, "type-ast");
    let make_type = |tag: &str, payload: Option<Expression>| {
        Expression::Variant(VariantExpression {
            tag: tag.into(),
            payload: payload.map(Box::new),
            type_part_definition_event_hash: Some(type_ast_hash.clone()),
        })
    };
    let make_record = |items: Vec<(&str, Expression)>| {
        Expression::TypeLiteral(TypeLiteralExpression {
            items: items
                .into_iter()
                .map(|(key, value)| TypeLiteralItemExpression {
                    key: key.into(),
                    value: Box::new(value),
                })
                .collect(),
        })
    };
    let list_number = make_type(
        "list",
        Some(make_record(vec![("item_type", number_type.clone())])),
    );
    let list_number_again = make_type(
        "list",
        Some(make_record(vec![("item_type", number_type.clone())])),
    );
    let list_string = make_type(
        "list",
        Some(make_record(vec![("item_type", string_type.clone())])),
    );
    let type_equals_hash = derive_module_part_id(&mod_id, "type-equals");
    let compare_types = |left, right| {
        definy_core::evaluate_expression(
            &call_part2(type_equals_hash.clone(), left, right),
            &events,
        )
        .expect("Failed to compare structural type ASTs")
    };
    assert_eq!(
        compare_types(list_number.clone(), list_number_again),
        Value::Bool(true)
    );
    assert_eq!(compare_types(list_number, list_string), Value::Bool(false));

    let function_number_to_string = make_type(
        "function",
        Some(make_record(vec![
            ("parameter", number_type.clone()),
            ("return_type", string_type.clone()),
        ])),
    );
    let same_function_type = make_type(
        "function",
        Some(make_record(vec![
            ("parameter", number_type.clone()),
            ("return_type", string_type.clone()),
        ])),
    );
    let different_function_type = make_type(
        "function",
        Some(make_record(vec![
            ("parameter", string_type.clone()),
            ("return_type", number_type.clone()),
        ])),
    );
    assert_eq!(
        compare_types(function_number_to_string.clone(), same_function_type),
        Value::Bool(true)
    );
    assert_eq!(
        compare_types(function_number_to_string, different_function_type),
        Value::Bool(false)
    );

    let record_number = make_type(
        "record",
        Some(Expression::ListLiteral(ListLiteralExpression {
            items: vec![make_record(vec![
                (
                    "key",
                    Expression::String(StringExpression {
                        value: "count".into(),
                    }),
                ),
                ("field_type", number_type.clone()),
            ])],
        })),
    );
    let same_record_type = make_type(
        "record",
        Some(Expression::ListLiteral(ListLiteralExpression {
            items: vec![make_record(vec![
                (
                    "key",
                    Expression::String(StringExpression {
                        value: "count".into(),
                    }),
                ),
                ("field_type", number_type.clone()),
            ])],
        })),
    );
    let record_string = make_type(
        "record",
        Some(Expression::ListLiteral(ListLiteralExpression {
            items: vec![make_record(vec![
                (
                    "key",
                    Expression::String(StringExpression {
                        value: "count".into(),
                    }),
                ),
                ("field_type", string_type.clone()),
            ])],
        })),
    );
    assert_eq!(
        compare_types(record_number.clone(), same_record_type),
        Value::Bool(true)
    );
    assert_eq!(
        compare_types(record_number, record_string),
        Value::Bool(false)
    );

    let count_and_label = make_type(
        "record",
        Some(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                make_record(vec![
                    (
                        "key",
                        Expression::String(StringExpression {
                            value: "count".into(),
                        }),
                    ),
                    ("field_type", number_type.clone()),
                ]),
                make_record(vec![
                    (
                        "key",
                        Expression::String(StringExpression {
                            value: "label".into(),
                        }),
                    ),
                    ("field_type", string_type.clone()),
                ]),
            ],
        })),
    );
    let label_and_count = make_type(
        "record",
        Some(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                make_record(vec![
                    (
                        "key",
                        Expression::String(StringExpression {
                            value: "label".into(),
                        }),
                    ),
                    ("field_type", string_type.clone()),
                ]),
                make_record(vec![
                    (
                        "key",
                        Expression::String(StringExpression {
                            value: "count".into(),
                        }),
                    ),
                    ("field_type", number_type.clone()),
                ]),
            ],
        })),
    );
    assert_eq!(
        compare_types(count_and_label, label_and_count),
        Value::Bool(false)
    );

    let reference_a = make_type(
        "reference",
        Some(make_record(vec![(
            "part_hash",
            Expression::String(StringExpression {
                value: "part-a".into(),
            }),
        )])),
    );
    let same_reference = make_type(
        "reference",
        Some(make_record(vec![(
            "part_hash",
            Expression::String(StringExpression {
                value: "part-a".into(),
            }),
        )])),
    );
    let different_reference = make_type(
        "reference",
        Some(make_record(vec![(
            "part_hash",
            Expression::String(StringExpression {
                value: "part-b".into(),
            }),
        )])),
    );
    assert_eq!(
        compare_types(reference_a.clone(), same_reference),
        Value::Bool(true)
    );
    assert_eq!(
        compare_types(reference_a, different_reference),
        Value::Bool(false)
    );

    let make_optional_type = |payload: Option<Expression>| match payload {
        Some(payload) => Expression::Variant(VariantExpression {
            tag: "some".into(),
            payload: Some(Box::new(payload)),
            type_part_definition_event_hash: None,
        }),
        None => Expression::Variant(VariantExpression {
            tag: "none".into(),
            payload: None,
            type_part_definition_event_hash: None,
        }),
    };
    let make_union_variant = |tag: &str, payload_type: Option<Expression>| {
        make_record(vec![
            (
                "tag",
                Expression::String(StringExpression { value: tag.into() }),
            ),
            ("payload_type", make_optional_type(payload_type)),
        ])
    };
    let union_number = make_type(
        "union",
        Some(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                make_union_variant("none", None),
                make_union_variant("some", Some(number_type.clone())),
            ],
        })),
    );
    let same_union_type = make_type(
        "union",
        Some(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                make_union_variant("none", None),
                make_union_variant("some", Some(number_type.clone())),
            ],
        })),
    );
    let union_string = make_type(
        "union",
        Some(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                make_union_variant("none", None),
                make_union_variant("some", Some(string_type)),
            ],
        })),
    );
    assert_eq!(
        compare_types(union_number.clone(), same_union_type),
        Value::Bool(true)
    );
    assert_eq!(
        compare_types(union_number, union_string),
        Value::Bool(false)
    );
}

#[test]
fn test_self_hosted_validate_part_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let validate_part_hash = derive_module_part_id(&mod_id, "validate-part");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let mut parts = all_type_checker_parts(&mod_id);
    parts.push(crate::builtin_validator::create_validate_part_part(&mod_id));

    let events = create_test_module_events(account, parts, 127);

    let expr_type_opt = Some(expr_type_hash);
    let sample_expr = ast_add(
        ast_num(10, expr_type_opt.clone()),
        ast_num(20, expr_type_opt.clone()),
        expr_type_opt.clone(),
    );

    // Construct valid part definition:
    // { name: "calc", description: "...", part_type: number, expression: 10 + 20 }
    let valid_part_def = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "name".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "calc".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "description".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "sample calc".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "part_type".into(),
                value: Box::new(Expression::Variant(VariantExpression {
                    tag: "number".into(),
                    payload: None,
                    type_part_definition_event_hash: None,
                })),
            },
            TypeLiteralItemExpression {
                key: "expression".into(),
                value: Box::new(sample_expr),
            },
        ],
    });

    let call_validate = call_part1(validate_part_hash.clone(), valid_part_def);

    let result = definy_core::evaluate_expression(&call_validate, &events)
        .expect("Failed to validate part using core.validate-part");

    assert_eq!(result, Value::Bool(true));

    let make_type_record = |items: Vec<(&str, Expression)>| {
        Expression::TypeLiteral(TypeLiteralExpression {
            items: items
                .into_iter()
                .map(|(key, value)| TypeLiteralItemExpression {
                    key: key.into(),
                    value: Box::new(value),
                })
                .collect(),
        })
    };
    let number_type = Expression::Variant(VariantExpression {
        tag: "number".into(),
        payload: None,
        type_part_definition_event_hash: None,
    });
    let function_type = Expression::Variant(VariantExpression {
        tag: "function".into(),
        payload: Some(Box::new(make_type_record(vec![
            ("parameter", number_type.clone()),
            ("return_type", number_type),
        ]))),
        type_part_definition_event_hash: None,
    });
    let function_expression = Expression::Variant(VariantExpression {
        tag: "function".into(),
        payload: Some(Box::new(make_type_record(vec![
            (
                "parameter_variable_id",
                Expression::Number(definy_event::event::NumberExpression { value: 7 }),
            ),
            (
                "body",
                Expression::Variant(VariantExpression {
                    tag: "variable".into(),
                    payload: Some(Box::new(make_type_record(vec![(
                        "variable_id",
                        Expression::Number(definy_event::event::NumberExpression { value: 7 }),
                    )]))),
                    type_part_definition_event_hash: expr_type_opt.clone(),
                }),
            ),
        ]))),
        type_part_definition_event_hash: expr_type_opt.clone(),
    });
    let function_part_def = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "name".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "identity".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "description".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "identity function".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "part_type".into(),
                value: Box::new(function_type),
            },
            TypeLiteralItemExpression {
                key: "expression".into(),
                value: Box::new(function_expression),
            },
        ],
    });
    let validate_function_call = call_part1(validate_part_hash.clone(), function_part_def);
    let function_result = definy_core::evaluate_expression(&validate_function_call, &events)
        .expect("Failed to validate declared identity function");
    assert_eq!(function_result, Value::Bool(true));

    let function_type_ast = |parameter: Expression, return_type: Expression| {
        Expression::Variant(VariantExpression {
            tag: "function".into(),
            payload: Some(Box::new(make_type_record(vec![
                ("parameter", parameter),
                ("return_type", return_type),
            ]))),
            type_part_definition_event_hash: None,
        })
    };
    let number_type_ast = || {
        Expression::Variant(VariantExpression {
            tag: "number".into(),
            payload: None,
            type_part_definition_event_hash: None,
        })
    };
    let string_type_ast = || {
        Expression::Variant(VariantExpression {
            tag: "string".into(),
            payload: None,
            type_part_definition_event_hash: None,
        })
    };
    let number_to_number = function_type_ast(number_type_ast(), number_type_ast());
    let string_to_number = function_type_ast(string_type_ast(), number_type_ast());
    let higher_order_type = function_type_ast(
        number_to_number.clone(),
        function_type_ast(number_type_ast(), number_type_ast()),
    );
    let invalid_higher_order_type = function_type_ast(
        string_to_number,
        function_type_ast(number_type_ast(), number_type_ast()),
    );
    let variable_ast = |variable_id| {
        Expression::Variant(VariantExpression {
            tag: "variable".into(),
            payload: Some(Box::new(make_type_record(vec![(
                "variable_id",
                Expression::Number(definy_event::event::NumberExpression { value: variable_id }),
            )]))),
            type_part_definition_event_hash: expr_type_opt.clone(),
        })
    };
    let call_ast = Expression::Variant(VariantExpression {
        tag: "call".into(),
        payload: Some(Box::new(make_type_record(vec![
            ("function", variable_ast(1)),
            ("argument", variable_ast(2)),
        ]))),
        type_part_definition_event_hash: expr_type_opt.clone(),
    });
    let inner_function_ast = Expression::Variant(VariantExpression {
        tag: "function".into(),
        payload: Some(Box::new(make_type_record(vec![
            (
                "parameter_variable_id",
                Expression::Number(definy_event::event::NumberExpression { value: 2 }),
            ),
            ("body", call_ast),
        ]))),
        type_part_definition_event_hash: expr_type_opt.clone(),
    });
    let higher_order_expression = Expression::Variant(VariantExpression {
        tag: "function".into(),
        payload: Some(Box::new(make_type_record(vec![
            (
                "parameter_variable_id",
                Expression::Number(definy_event::event::NumberExpression { value: 1 }),
            ),
            ("body", inner_function_ast),
        ]))),
        type_part_definition_event_hash: expr_type_opt.clone(),
    });
    let make_part_definition = |name: &str, expression: Expression, part_type: Expression| {
        Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "name".into(),
                    value: Box::new(Expression::String(StringExpression { value: name.into() })),
                },
                TypeLiteralItemExpression {
                    key: "description".into(),
                    value: Box::new(Expression::String(StringExpression {
                        value: "higher order call test".into(),
                    })),
                },
                TypeLiteralItemExpression {
                    key: "part_type".into(),
                    value: Box::new(part_type),
                },
                TypeLiteralItemExpression {
                    key: "expression".into(),
                    value: Box::new(expression),
                },
            ],
        })
    };
    let higher_order_call = call_part1(
        validate_part_hash.clone(),
        make_part_definition("apply", higher_order_expression.clone(), higher_order_type),
    );
    let higher_order_result = definy_core::evaluate_expression(&higher_order_call, &events)
        .expect("Failed to type-check a higher-order function call");
    assert_eq!(higher_order_result, Value::Bool(true));

    let wrong_argument_type = call_part1(
        validate_part_hash.clone(),
        make_part_definition(
            "invalid-apply",
            higher_order_expression,
            invalid_higher_order_type,
        ),
    );
    let wrong_argument_result = definy_core::evaluate_expression(&wrong_argument_type, &events)
        .expect("Failed to reject a higher-order call with mismatched argument type");
    assert_eq!(wrong_argument_result, Value::Bool(false));

    let callback_lambda = Expression::Variant(VariantExpression {
        tag: "function".into(),
        payload: Some(Box::new(make_type_record(vec![
            (
                "parameter_variable_id",
                Expression::Number(definy_event::event::NumberExpression { value: 3 }),
            ),
            ("body", variable_ast(3)),
        ]))),
        type_part_definition_event_hash: expr_type_opt.clone(),
    });
    let callback_call = Expression::Variant(VariantExpression {
        tag: "call".into(),
        payload: Some(Box::new(make_type_record(vec![
            ("function", variable_ast(1)),
            ("argument", callback_lambda.clone()),
        ]))),
        type_part_definition_event_hash: expr_type_opt.clone(),
    });
    let callback_consumer_type = function_type_ast(number_to_number.clone(), number_type_ast());
    let callback_consumer_lambda_type =
        function_type_ast(callback_consumer_type.clone(), number_type_ast());
    let callback_consumer_expression = Expression::Variant(VariantExpression {
        tag: "function".into(),
        payload: Some(Box::new(make_type_record(vec![
            (
                "parameter_variable_id",
                Expression::Number(definy_event::event::NumberExpression { value: 1 }),
            ),
            ("body", callback_call),
        ]))),
        type_part_definition_event_hash: expr_type_opt.clone(),
    });
    let callback_type_check = call_part3(
        derive_module_part_id(&mod_id, "type-check-against"),
        callback_consumer_expression.clone(),
        empty_type_env(),
        callback_consumer_lambda_type.clone(),
    );
    let callback_type_check_result =
        definy_core::evaluate_expression(&callback_type_check, &events)
            .expect("Failed direct type-check-against for callback lambda");
    assert!(
        matches!(
            &callback_type_check_result,
            Value::Variant { tag, .. } if tag == "ok"
        ),
        "Expected type-check-against to return ok, got: {callback_type_check_result:?}"
    );
    let callback_consumer = call_part1(
        validate_part_hash.clone(),
        make_part_definition(
            "consume-callback",
            callback_consumer_expression,
            callback_consumer_lambda_type,
        ),
    );
    let callback_result = definy_core::evaluate_expression(&callback_consumer, &events)
        .expect("Failed to validate a lambda passed to a function parameter");
    assert_eq!(callback_result, Value::Bool(true));

    let directly_called_lambda = Expression::Variant(VariantExpression {
        tag: "function".into(),
        payload: Some(Box::new(make_type_record(vec![
            (
                "parameter_variable_id",
                Expression::Number(definy_event::event::NumberExpression { value: 4 }),
            ),
            ("body", variable_ast(4)),
        ]))),
        type_part_definition_event_hash: expr_type_opt.clone(),
    });
    let direct_lambda_call = Expression::Variant(VariantExpression {
        tag: "call".into(),
        payload: Some(Box::new(make_type_record(vec![
            ("function", directly_called_lambda),
            (
                "argument",
                Expression::Variant(VariantExpression {
                    tag: "number".into(),
                    payload: Some(Box::new(Expression::Number(
                        definy_event::event::NumberExpression { value: 1 },
                    ))),
                    type_part_definition_event_hash: expr_type_opt.clone(),
                }),
            ),
        ]))),
        type_part_definition_event_hash: expr_type_opt.clone(),
    });
    let direct_lambda_part = call_part1(
        validate_part_hash,
        make_part_definition("direct-lambda-call", direct_lambda_call, number_type_ast()),
    );
    let direct_lambda_result = definy_core::evaluate_expression(&direct_lambda_part, &events)
        .expect("Failed to reject a directly applied lambda");
    assert_eq!(direct_lambda_result, Value::Bool(false));
}

#[test]
fn test_self_hosted_compile_to_wasm_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();

    let compile_instr =
        crate::builtin_wasm_compiler::create_compile_expr_instructions_part(&mod_id);
    let compile_to_wasm = crate::builtin_wasm_compiler::create_compile_to_wasm_part(&mod_id);

    let compile_to_wasm_hash = derive_module_part_id(&mod_id, "compile-to-wasm");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let events = create_test_module_events(account, vec![compile_instr, compile_to_wasm], 128);

    let expr_type_opt = Some(expr_type_hash);
    // Expression to compile: 15 + 27 = 42
    let expr_to_compile = ast_add(
        ast_num(15, expr_type_opt.clone()),
        ast_num(27, expr_type_opt.clone()),
        expr_type_opt,
    );

    let call_compile = call_part1(compile_to_wasm_hash, expr_to_compile);

    // Execute self-hosted compiler to generate Wasm bytecode!
    let generated_wasm_list = definy_core::evaluate_expression(&call_compile, &events)
        .expect("Failed to execute self-hosted compile-to-wasm");

    let wasm_bytes = value_list_to_u8_vec(generated_wasm_list);

    // Now execute the Wasm binary emitted BY definy's own compiled code!
    let execution_result = definy_core::wasm_emitter::execute_wasm(&wasm_bytes)
        .expect("Failed to execute Wasm binary emitted by self-hosted compiler");

    assert_eq!(execution_result, Value::Number(42));
}

/// `core.optimize-expression` を呼び出し、式 `(10 * 3) + 12` を定数畳み込みして `42` に最適化し、
/// さらに最適化された AST から自己ホスト Wasm コンパイラでバイナリを生成・実行して `42` が返ることを実証します。
#[test]
fn test_self_hosted_optimize_expression_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();

    let optimize_part = crate::builtin_optimizer::create_optimize_expression_part(&mod_id);
    let compile_instr =
        crate::builtin_wasm_compiler::create_compile_expr_instructions_part(&mod_id);
    let compile_to_wasm = crate::builtin_wasm_compiler::create_compile_to_wasm_part(&mod_id);

    let optimize_hash = derive_module_part_id(&mod_id, "optimize-expression");
    let compile_to_wasm_hash = derive_module_part_id(&mod_id, "compile-to-wasm");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let events = create_test_module_events(
        account,
        vec![optimize_part, compile_instr, compile_to_wasm],
        129,
    );

    let expr_type_opt = Some(expr_type_hash.clone());
    // AST to optimize: (10 * 3) + 12
    let expr_to_optimize = ast_add(
        ast_mul(
            ast_num(10, expr_type_opt.clone()),
            ast_num(3, expr_type_opt.clone()),
            expr_type_opt.clone(),
        ),
        ast_num(12, expr_type_opt.clone()),
        expr_type_opt.clone(),
    );

    let call_optimize = call_part1(optimize_hash, expr_to_optimize);

    // Execute self-hosted optimizer!
    let optimized_result = definy_core::evaluate_expression(&call_optimize, &events)
        .expect("Failed to execute self-hosted optimize-expression");

    // The entire (10 * 3) + 12 AST should be constant-folded to number(42)!
    assert_eq!(
        optimized_result,
        Value::Variant {
            tag: "number".into(),
            payload: Some(Box::new(Value::Number(42))),
        }
    );

    // Now compile the folded AST: number(42) directly to Wasm
    let folded_ast = ast_num(42, expr_type_opt);
    let call_compile = call_part1(compile_to_wasm_hash, folded_ast);

    let generated_wasm_list = definy_core::evaluate_expression(&call_compile, &events)
        .expect("Failed to compile optimized AST to Wasm");

    let wasm_bytes = value_list_to_u8_vec(generated_wasm_list);

    let execution_result = definy_core::wasm_emitter::execute_wasm(&wasm_bytes)
        .expect("Failed to execute Wasm from optimized AST");

    assert_eq!(execution_result, Value::Number(42));
}

/// `core.validate-module` を呼び出し、正常なモジュール定義に対して `true`、
/// モジュール名が空の不正なモジュールに対して `false` が自己判定されることを実証します。
#[test]
fn test_self_hosted_validate_module_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let validate_module_hash = derive_module_part_id(&mod_id, "validate-module");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let mut parts = all_type_checker_parts(&mod_id);
    parts.push(crate::builtin_validator::create_validate_part_part(&mod_id));
    parts.push(crate::builtin_validator::create_validate_parts_part(
        &mod_id,
    ));
    parts.push(crate::builtin_validator::create_validate_module_part(
        &mod_id,
    ));

    let events = create_test_module_events(account, parts, 130);

    let expr_type_opt = Some(expr_type_hash.clone());
    let valid_part_def = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "name".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "sample_fn".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "description".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "valid function".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "part_type".into(),
                value: Box::new(Expression::Variant(VariantExpression {
                    tag: "number".into(),
                    payload: None,
                    type_part_definition_event_hash: None,
                })),
            },
            TypeLiteralItemExpression {
                key: "expression".into(),
                value: Box::new(ast_add(
                    ast_num(10, expr_type_opt.clone()),
                    ast_num(20, expr_type_opt),
                    Some(expr_type_hash),
                )),
            },
        ],
    });

    // Valid module: name: "math", description: "math module", parts: [valid_part]
    let valid_mod = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "name".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "math".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "description".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "math functions".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "parts".into(),
                value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![valid_part_def.clone()],
                })),
            },
        ],
    });

    let call_valid = call_part1(validate_module_hash.clone(), valid_mod);

    let valid_result = definy_core::evaluate_expression(&call_valid, &events)
        .expect("Failed to evaluate validate-module on valid module");
    assert_eq!(valid_result, Value::Bool(true));

    // Invalid module: empty name ""
    let invalid_mod = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "name".into(),
                value: Box::new(Expression::String(StringExpression { value: "".into() })),
            },
            TypeLiteralItemExpression {
                key: "description".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "empty name module".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "parts".into(),
                value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![],
                })),
            },
        ],
    });

    let call_invalid = call_part1(validate_module_hash.clone(), invalid_mod);

    let invalid_result = definy_core::evaluate_expression(&call_invalid, &events)
        .expect("Failed to evaluate validate-module on invalid module");
    assert_eq!(invalid_result, Value::Bool(false));

    let invalid_second_part = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "name".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "invalid_fn".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "description".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "invalid function".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "part_type".into(),
                value: Box::new(Expression::Variant(VariantExpression {
                    tag: "number".into(),
                    payload: None,
                    type_part_definition_event_hash: None,
                })),
            },
            TypeLiteralItemExpression {
                key: "expression".into(),
                value: Box::new(Expression::Boolean(
                    definy_event::event::BooleanExpression { value: true },
                )),
            },
        ],
    });
    let invalid_second_part_mod = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "name".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "math".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "description".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "math module".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "parts".into(),
                value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![valid_part_def, invalid_second_part],
                })),
            },
        ],
    });
    let call_invalid_second_part = call_part1(validate_module_hash, invalid_second_part_mod);
    let invalid_second_part_result =
        definy_core::evaluate_expression(&call_invalid_second_part, &events)
            .expect("Failed to evaluate validate-module with an invalid second part");
    assert_eq!(invalid_second_part_result, Value::Bool(false));
}

#[test]
fn test_self_hosted_value_equals_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_evaluator_parts(&mod_id);
    let val_eq_hash = derive_module_part_id(&mod_id, "value-equals");

    let events = create_test_module_events(account, parts, 201);

    let check_eq = |a: Expression, b: Expression| {
        let call = call_part2(val_eq_hash.clone(), a, b);
        definy_core::evaluate_expression(&call, &events).expect("evaluate value-equals")
    };

    // Numbers: 42 == 42 -> true, 42 == 100 -> false
    assert_eq!(
        check_eq(test_val_num(42), test_val_num(42)),
        Value::Bool(true)
    );
    assert_eq!(
        check_eq(test_val_num(42), test_val_num(100)),
        Value::Bool(false)
    );

    // Strings: "hello" == "hello" -> true, "hello" == "world" -> false
    assert_eq!(
        check_eq(test_val_str("hello"), test_val_str("hello")),
        Value::Bool(true)
    );
    assert_eq!(
        check_eq(test_val_str("hello"), test_val_str("world")),
        Value::Bool(false)
    );

    // Booleans: true == true -> true, true == false -> false
    assert_eq!(
        check_eq(test_val_bool(true), test_val_bool(true)),
        Value::Bool(true)
    );
    assert_eq!(
        check_eq(test_val_bool(true), test_val_bool(false)),
        Value::Bool(false)
    );
}

#[test]
fn test_self_hosted_eval_value_variant_and_match_execution() {
    use definy_event::event::NumberExpression;

    let (account, mod_id) = get_test_account_and_mod_id();

    let parts = all_evaluator_parts(&mod_id);
    let eval_hash = derive_module_part_id(&mod_id, "eval-value");

    let events = create_test_module_events(account, parts, 202);

    // Target AST: variant("some", 42)
    let target_ast = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "variant".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "tag".into(),
                    value: Box::new(Expression::String(StringExpression {
                        value: "some".into(),
                    })),
                },
                TypeLiteralItemExpression {
                    key: "payload".into(),
                    value: Box::new(Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: None,
                        tag: "some".into(),
                        payload: Some(Box::new(Expression::Variant(VariantExpression {
                            type_part_definition_event_hash: None,
                            tag: "number".into(),
                            payload: Some(Box::new(Expression::Number(NumberExpression {
                                value: 42,
                            }))),
                        }))),
                    })),
                },
            ],
        }))),
    });

    // Arm: { tag: "some", variable_id: 10, body: variable(10) + 8 }
    let arm_some = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "tag".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "some".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "variable_id".into(),
                value: Box::new(Expression::Number(NumberExpression { value: 10 })),
            },
            TypeLiteralItemExpression {
                key: "body".into(),
                value: Box::new(Expression::Variant(VariantExpression {
                    type_part_definition_event_hash: None,
                    tag: "add".into(),
                    payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![
                            TypeLiteralItemExpression {
                                key: "left".into(),
                                value: Box::new(Expression::Variant(VariantExpression {
                                    type_part_definition_event_hash: None,
                                    tag: "variable".into(),
                                    payload: Some(Box::new(Expression::TypeLiteral(
                                        TypeLiteralExpression {
                                            items: vec![TypeLiteralItemExpression {
                                                key: "variable_id".into(),
                                                value: Box::new(Expression::Number(
                                                    NumberExpression { value: 10 },
                                                )),
                                            }],
                                        },
                                    ))),
                                })),
                            },
                            TypeLiteralItemExpression {
                                key: "right".into(),
                                value: Box::new(Expression::Variant(VariantExpression {
                                    type_part_definition_event_hash: None,
                                    tag: "number".into(),
                                    payload: Some(Box::new(Expression::Number(NumberExpression {
                                        value: 8,
                                    }))),
                                })),
                            },
                        ],
                    }))),
                })),
            },
        ],
    });

    // Match AST: match(variant("some", 42), [arm_some])
    let match_ast = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "match".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "target".into(),
                    value: Box::new(target_ast),
                },
                TypeLiteralItemExpression {
                    key: "arms".into(),
                    value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                        items: vec![arm_some],
                    })),
                },
            ],
        }))),
    });

    let empty_env = Expression::ListLiteral(ListLiteralExpression { items: vec![] });
    let eval_call = call_part2(eval_hash, match_ast, empty_env);

    let eval_result = definy_core::evaluate_expression(&eval_call, &events)
        .expect("Failed to evaluate self-hosted variant and match");

    // Match arms evaluated 42 + 8 = 50 -> value.number(50)
    assert_eq!(
        eval_result,
        Value::Variant {
            tag: "number".into(),
            payload: Some(Box::new(Value::Number(50))),
        }
    );
}

#[test]
fn test_self_hosted_list_map_and_fold_execution() {
    use definy_event::event::{FunctionExpression, MultiplyExpression, NumberExpression};

    let (account, mod_id) = get_test_account_and_mod_id();

    let list_map = crate::builtin_list_ops::create_list_map_part(&mod_id);
    let list_map_inner = crate::builtin_list_ops::create_list_map_inner_part(&mod_id);
    let list_fold = crate::builtin_list_ops::create_list_fold_part(&mod_id);
    let list_fold_inner = crate::builtin_list_ops::create_list_fold_inner_part(&mod_id);

    let map_hash = derive_module_part_id(&mod_id, "list-map");
    let fold_hash = derive_module_part_id(&mod_id, "list-fold");

    let events = create_test_module_events(
        account,
        vec![list_map, list_map_inner, list_fold, list_fold_inner],
        203,
    );

    // 1. Test list-map: map (x => x * 2) [1, 2, 3] -> [2, 4, 6]
    let double_fn = Expression::Function(FunctionExpression {
        parameter_id: 10,
        parameter_name: "x".into(),
        body: Box::new(Expression::Multiply(MultiplyExpression {
            left: Box::new(Expression::Variable(
                definy_event::event::VariableExpression { variable_id: 10 },
            )),
            right: Box::new(Expression::Number(NumberExpression { value: 2 })),
        })),
    });

    let list_input = Expression::ListLiteral(ListLiteralExpression {
        items: vec![
            Expression::Number(NumberExpression { value: 1 }),
            Expression::Number(NumberExpression { value: 2 }),
            Expression::Number(NumberExpression { value: 3 }),
        ],
    });

    let map_call = call_part2(map_hash, double_fn, list_input);

    let map_res = definy_core::evaluate_expression(&map_call, &events)
        .expect("Failed to evaluate self-hosted list-map");
    assert_eq!(
        map_res,
        Value::List(vec![Value::Number(2), Value::Number(4), Value::Number(6)])
    );

    // 2. Test list-fold: fold (acc => x => acc + x) 0 [10, 20, 30] -> 60
    let add_reducer = Expression::Function(FunctionExpression {
        parameter_id: 20,
        parameter_name: "acc".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 21,
            parameter_name: "x".into(),
            body: Box::new(Expression::Add(definy_event::event::AddExpression {
                left: Box::new(Expression::Variable(
                    definy_event::event::VariableExpression { variable_id: 20 },
                )),
                right: Box::new(Expression::Variable(
                    definy_event::event::VariableExpression { variable_id: 21 },
                )),
            })),
        })),
    });

    let fold_list_input = Expression::ListLiteral(ListLiteralExpression {
        items: vec![
            Expression::Number(NumberExpression { value: 10 }),
            Expression::Number(NumberExpression { value: 20 }),
            Expression::Number(NumberExpression { value: 30 }),
        ],
    });

    let fold_call = call_part3(
        fold_hash,
        add_reducer,
        Expression::Number(NumberExpression { value: 0 }),
        fold_list_input,
    );

    let fold_res = definy_core::evaluate_expression(&fold_call, &events)
        .expect("Failed to evaluate self-hosted list-fold");
    assert_eq!(fold_res, Value::Number(60));
}
