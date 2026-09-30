use std::collections::HashMap;

use definy_event::EventHashId;
use definy_event::event::*;

use super::*;
use crate::expression_editor::types::ExpressionType;
use crate::part_projection::PartSnapshot;

fn create_test_snapshot(
    hash: EventHashId,
    name: &str,
    part_type: Option<PartType>,
    expression: Option<Expression>,
) -> PartSnapshot {
    let dummy_key = ed25519_dalek::SigningKey::from_bytes(&[0; 32]);
    PartSnapshot {
        definition_event_hash: hash.clone(),
        latest_event_hash: hash,
        account_id: AccountId(dummy_key.verifying_key()),
        part_name: name.to_string(),
        part_type,
        part_description: Description::Plain("test".into()),
        content_hash: expression
            .as_ref()
            .and_then(|e| definy_event::ContentHash::from_expression(e).ok()),
        expression,
        module_definition_event_hash: EventHashId::from_bytes(&[0; 32]),
        updated_at: chrono::Utc::now(),
    }
}

#[test]
fn test_recursive_type_variant_type_inference_and_matching() {
    let expr_hash = EventHashId::from_bytes(&[1; 32]);
    let expr_ref = Expression::PartReference(PartReferenceExpression::new(expr_hash.clone()));

    let type_part_expr = Expression::TypeUnion(TypeUnionExpression {
        variants: vec![
            TypeUnionVariant {
                tag: "number".into(),
                payload_type: Some(Box::new(Expression::TypeNumber)),
            },
            TypeUnionVariant {
                tag: "add".into(),
                payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                    items: vec![
                        TypeLiteralItemExpression {
                            key: "left".into(),
                            value: Box::new(expr_ref.clone()),
                        },
                        TypeLiteralItemExpression {
                            key: "right".into(),
                            value: Box::new(expr_ref.clone()),
                        },
                    ],
                }))),
            },
        ],
    });

    let mut part_snapshot_map = HashMap::new();
    part_snapshot_map.insert(
        expr_hash.clone(),
        create_test_snapshot(
            expr_hash.clone(),
            "expression",
            Some(PartType::Type),
            Some(type_part_expr),
        ),
    );

    let mut part_type_map = HashMap::new();
    part_type_map.insert(expr_hash.clone(), ExpressionType::Type);

    // 1. Recursive variant construction: number(10)
    let num_variant = Expression::Variant(VariantExpression {
        tag: "number".into(),
        payload: Some(Box::new(Expression::Number(NumberExpression { value: 10 }))),
        type_part_definition_event_hash: Some(expr_hash.clone()),
    });

    // 1. Recursive variant construction: number(10)
    {
        let mut diagnostics = Vec::new();
        let mut expected_types = HashMap::new();
        let mut variable_types = HashMap::new();
        let env = HashMap::new();
        let mut ctx = TypeCheckContext::new(
            &env,
            &part_type_map,
            &part_snapshot_map,
            &mut diagnostics,
            &mut expected_types,
            &mut variable_types,
        );
        let num_type = ctx.check(&num_variant, &[], None);
        assert_eq!(num_type, ExpressionType::TypePart(expr_hash.clone()));
        assert!(diagnostics.is_empty());
    }

    // 2. Recursive variant construction: add({ left: number(1), right: number(2) })
    let add_variant = Expression::Variant(VariantExpression {
        tag: "add".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "left".into(),
                    value: Box::new(Expression::Variant(VariantExpression {
                        tag: "number".into(),
                        payload: Some(Box::new(Expression::Number(NumberExpression { value: 1 }))),
                        type_part_definition_event_hash: Some(expr_hash.clone()),
                    })),
                },
                TypeLiteralItemExpression {
                    key: "right".into(),
                    value: Box::new(Expression::Variant(VariantExpression {
                        tag: "number".into(),
                        payload: Some(Box::new(Expression::Number(NumberExpression { value: 2 }))),
                        type_part_definition_event_hash: Some(expr_hash.clone()),
                    })),
                },
            ],
        }))),
        type_part_definition_event_hash: Some(expr_hash.clone()),
    });

    {
        let mut diagnostics = Vec::new();
        let mut expected_types = HashMap::new();
        let mut variable_types = HashMap::new();
        let env = HashMap::new();
        let mut ctx = TypeCheckContext::new(
            &env,
            &part_type_map,
            &part_snapshot_map,
            &mut diagnostics,
            &mut expected_types,
            &mut variable_types,
        );
        let add_type = ctx.check(&add_variant, &[], None);
        assert_eq!(add_type, ExpressionType::TypePart(expr_hash.clone()));
        assert!(diagnostics.is_empty());
    }

    // 3. Pattern match with arm variable propagation:
    // Match target is add_variant. Arm for "add" binds variable 1, which has Record type with left/right.
    // Body is RecordGet(variable 1, "left") which should resolve to TypePart(expr_hash).
    let match_expr = Expression::Match(MatchExpression {
        target: Box::new(add_variant),
        arms: vec![
            MatchArm {
                tag: "add".into(),
                variable_id: Some(1),
                variable_name: Some("bin".into()),
                body: Box::new(Expression::RecordGet(RecordGetExpression {
                    record: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                    key: "left".into(),
                })),
            },
            MatchArm {
                tag: "number".into(),
                variable_id: Some(2),
                variable_name: Some("n".into()),
                body: Box::new(Expression::Variant(VariantExpression {
                    tag: "number".into(),
                    payload: Some(Box::new(Expression::Variable(VariableExpression {
                        variable_id: 2,
                    }))),
                    type_part_definition_event_hash: Some(expr_hash.clone()),
                })),
            },
        ],
        default: None,
    });

    {
        let mut diagnostics = Vec::new();
        let mut expected_types = HashMap::new();
        let mut variable_types = HashMap::new();
        let env = HashMap::new();
        let mut ctx = TypeCheckContext::new(
            &env,
            &part_type_map,
            &part_snapshot_map,
            &mut diagnostics,
            &mut expected_types,
            &mut variable_types,
        );
        let match_res_type = ctx.check(&match_expr, &[], None);
        assert_eq!(match_res_type, ExpressionType::TypePart(expr_hash.clone()));
        assert!(diagnostics.is_empty());

        // Variable 1 should have been inferred as Record
        assert!(matches!(
            variable_types.get(&1),
            Some(ExpressionType::Record(_))
        ));
        // Variable 2 should have been inferred as Number
        assert_eq!(variable_types.get(&2), Some(&ExpressionType::Number));
    }
}

#[test]
fn test_recursive_type_cycle_detection_in_constructor() {
    let expr_hash = EventHashId::from_bytes(&[2; 32]);
    let expr_ref = Expression::PartReference(PartReferenceExpression::new(expr_hash.clone()));

    // A recursive record: Node { next: Node, val: Number }
    let type_part_expr = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "next".into(),
                value: Box::new(expr_ref.clone()),
            },
            TypeLiteralItemExpression {
                key: "val".into(),
                value: Box::new(Expression::TypeNumber),
            },
        ],
    });

    let mut part_snapshot_map = HashMap::new();
    part_snapshot_map.insert(
        expr_hash.clone(),
        create_test_snapshot(
            expr_hash.clone(),
            "node",
            Some(PartType::Type),
            Some(type_part_expr),
        ),
    );

    // Calling infer_constructor_shape_from_type_part must terminate without infinite recursion!
    let shape = infer_constructor_shape_from_type_part(&part_snapshot_map, &expr_hash);
    match shape {
        crate::expression_editor::types::ConstructorValueShape::Record(fields) => {
            assert_eq!(fields.len(), 2);
            assert_eq!(fields[0].0, "next");
            assert_eq!(
                fields[0].1,
                crate::expression_editor::types::ConstructorValueShape::Unknown
            );
            assert_eq!(fields[1].0, "val");
            assert_eq!(
                fields[1].1,
                crate::expression_editor::types::ConstructorValueShape::Number
            );
        }
        other => panic!("Expected Record shape, got {:?}", other),
    }
}

#[test]
fn test_function_parameter_accepts_lambda_argument() {
    let state = crate::app_state::AppState::default();
    let callback_type = ExpressionType::Function {
        parameter: Box::new(ExpressionType::Number),
        return_type: Box::new(ExpressionType::Number),
    };
    let map_type = ExpressionType::Function {
        parameter: Box::new(callback_type),
        return_type: Box::new(ExpressionType::Number),
    };
    let expected_type = ExpressionType::Function {
        parameter: Box::new(map_type),
        return_type: Box::new(ExpressionType::Number),
    };
    let callback = Expression::Function(FunctionExpression {
        parameter_id: 2,
        parameter_name: "value".into(),
        body: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
    });
    let expression = Expression::Function(FunctionExpression {
        parameter_id: 1,
        parameter_name: "map".into(),
        body: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            argument: Box::new(callback),
        })),
    });

    let analysis = analyze_expression_types(&state, &expression, Some(expected_type));

    assert!(
        analysis.diagnostics.is_empty(),
        "{:?}",
        analysis.diagnostics
    );
}

#[test]
fn test_direct_lambda_application_is_diagnosed() {
    let state = crate::app_state::AppState::default();
    let expression = Expression::Call(CallExpression {
        function: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "value".into(),
            body: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
        })),
        argument: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let analysis = analyze_expression_types(&state, &expression, Some(ExpressionType::Number));

    assert!(analysis.diagnostics.iter().any(|diagnostic| {
        diagnostic
            .message
            .contains("Inline lambda application is not supported")
    }));
}

#[test]
fn test_record_structural_width_subtyping_allows_extra_fields() {
    let state = crate::app_state::AppState::default();

    // funcA: { clock: Number } -> Number
    let expected_param_type =
        ExpressionType::Record(vec![("clock".to_string(), ExpressionType::Number)]);
    let func_expected_type = ExpressionType::Function {
        parameter: Box::new(expected_param_type),
        return_type: Box::new(ExpressionType::Number),
    };

    // fn ctx => ctx.clock
    let func_expr = Expression::Function(FunctionExpression {
        parameter_id: 1,
        parameter_name: "ctx".into(),
        body: Box::new(Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            key: "clock".into(),
        })),
    });

    // 1. 関数の型定義検査: 期待型 { clock: Number } -> Number に合致すること
    let func_analysis = analyze_expression_types(&state, &func_expr, Some(func_expected_type));
    assert!(
        func_analysis.diagnostics.is_empty(),
        "Function definition should have no diagnostics: {:?}",
        func_analysis.diagnostics
    );

    // 2. 呼び出し引数検査:
    // funcA に 余分なフィールドを持つ ctx: { clock: 42, crypto: "hash", random: 99 } を渡す
    let extra_record_arg = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "clock".into(),
                value: Box::new(Expression::Number(NumberExpression { value: 42 })),
            },
            TypeLiteralItemExpression {
                key: "crypto".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "hash".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "random".into(),
                value: Box::new(Expression::Number(NumberExpression { value: 99 })),
            },
        ],
    });

    let call_expr = Expression::Call(CallExpression {
        function: Box::new(Expression::Variable(VariableExpression { variable_id: 10 })),
        argument: Box::new(extra_record_arg),
    });

    // env: 変数 10 は funcA ({ clock: Number } -> Number)
    let mut env = std::collections::HashMap::new();
    env.insert(
        10,
        ExpressionType::Function {
            parameter: Box::new(ExpressionType::Record(vec![(
                "clock".to_string(),
                ExpressionType::Number,
            )])),
            return_type: Box::new(ExpressionType::Number),
        },
    );

    let part_type_map = std::collections::HashMap::new();
    let part_snapshot_map = std::collections::HashMap::new();
    let mut diagnostics = Vec::new();
    let mut expected_types = std::collections::HashMap::new();
    let mut variable_types = std::collections::HashMap::new();
    let mut ctx = TypeCheckContext::new(
        &env,
        &part_type_map,
        &part_snapshot_map,
        &mut diagnostics,
        &mut expected_types,
        &mut variable_types,
    );

    let result_type = ctx.check(&call_expr, &[], Some(ExpressionType::Number));
    assert_eq!(result_type, ExpressionType::Number);
    assert!(
        diagnostics.is_empty(),
        "Extra fields in record should be accepted without diagnostics, but found: {:?}",
        diagnostics
    );

    // 3. 必須フィールド clock が欠けている場合はエラーになること
    let missing_clock_arg = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![TypeLiteralItemExpression {
            key: "crypto".into(),
            value: Box::new(Expression::String(StringExpression {
                value: "hash".into(),
            })),
        }],
    });
    let call_missing_expr = Expression::Call(CallExpression {
        function: Box::new(Expression::Variable(VariableExpression { variable_id: 10 })),
        argument: Box::new(missing_clock_arg),
    });

    let mut diagnostics_missing = Vec::new();
    let mut expected_types_missing = std::collections::HashMap::new();
    let mut variable_types_missing = std::collections::HashMap::new();
    let mut ctx_missing = TypeCheckContext::new(
        &env,
        &part_type_map,
        &part_snapshot_map,
        &mut diagnostics_missing,
        &mut expected_types_missing,
        &mut variable_types_missing,
    );

    ctx_missing.check(&call_missing_expr, &[], Some(ExpressionType::Number));
    assert!(
        !diagnostics_missing.is_empty(),
        "Missing required field 'clock' should produce a diagnostic"
    );
}
