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
        expression,
        module_definition_event_hash: EventHashId::from_bytes(&[0; 32]),
        updated_at: chrono::Utc::now(),
        has_definition: true,
    }
}

#[test]
fn test_recursive_type_variant_type_inference_and_matching() {
    let expr_hash = EventHashId::from_bytes(&[1; 32]);
    let expr_ref = Expression::PartReference(PartReferenceExpression {
        part_definition_event_hash: expr_hash.clone(),
    });

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
        assert_eq!(variable_types.get(&1), Some(&ExpressionType::Record));
        // Variable 2 should have been inferred as Number
        assert_eq!(variable_types.get(&2), Some(&ExpressionType::Number));
    }
}

#[test]
fn test_recursive_type_cycle_detection_in_constructor() {
    let expr_hash = EventHashId::from_bytes(&[2; 32]);
    let expr_ref = Expression::PartReference(PartReferenceExpression {
        part_definition_event_hash: expr_hash.clone(),
    });

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
