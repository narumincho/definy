//! パーツ妥当性検証器（`core.validate-part`）およびモジュール妥当性検証器（`core.validate-module`）の
//! 動的メタ循環実行実証テスト。
//!
//! 単一パーツの型整合性検証、高階関数やラムダ適用の妥当性判定、および
//! モジュール型環境の自動構築を通じたモジュール全体の一括妥当性検証を実証します。

use definy_core::expression_eval::Value;
use definy_event::event::{
    Expression, ListLiteralExpression, StringExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, VariantExpression, derive_module_part_id,
};

use super::helpers::{
    all_type_checker_parts, all_validator_parts, ast_add, ast_num, call_part1, call_part3,
    create_test_module_events, empty_type_env, get_test_account_and_mod_id,
};

#[test]
fn test_self_hosted_validate_part_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let validate_part_hash = derive_module_part_id(&mod_id, "validate-part");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let mut parts = all_type_checker_parts(&mod_id);
    parts.extend(all_validator_parts(&mod_id));

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
        let part_id = derive_module_part_id(&mod_id, name).to_string();
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
                    key: "part_definition_event_hash".into(),
                    value: Box::new(Expression::String(StringExpression {
                        value: part_id.into(),
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

/// `core.validate-module` を呼び出し、正常なモジュール定義に対して `true`、
/// モジュール名が空の不正なモジュールに対して `false` が自己判定されることを実証します。
#[test]
fn test_self_hosted_validate_module_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let validate_module_hash = derive_module_part_id(&mod_id, "validate-module");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let mut parts = all_type_checker_parts(&mod_id);
    parts.extend(all_validator_parts(&mod_id));

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
                key: "part_definition_event_hash".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: derive_module_part_id(&mod_id, "sample_fn")
                        .to_string()
                        .into(),
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
                key: "part_definition_event_hash".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: derive_module_part_id(&mod_id, "invalid_fn")
                        .to_string()
                        .into(),
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
