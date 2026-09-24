use definy_event::EventHashId;
use definy_event::event::{
    AccountId, Description, Event, EventContent, Expression, PartDefinitionEvent,
    PartReferenceExpression, PartType, PartUpdateEvent, TypeListExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, TypeUnionExpression, TypeUnionVariant,
};

pub fn create_expression_ast_type_events(
    account_id: &AccountId,
    first_commit_time: chrono::DateTime<chrono::Utc>,
    core_module_hash: &EventHashId,
    signing_key: &ed25519_dalek::SigningKey,
) -> Result<(Event, Event), anyhow::Error> {
    let expr_def_event = Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(37),
        content: EventContent::PartDefinition(PartDefinitionEvent {
            part_name: "expression".into(),
            part_type: Some(PartType::Type),
            description: Description::localized(vec![
                ("en", "Definy AST expression type (self-describing AST)"),
                ("ja", "Definy の AST 式型 (メタデータ・ASTの自己表現)"),
            ]),
            expression: None,
            module_definition_event_hash: core_module_hash.clone(),
        }),
    };
    let expr_def_binary = definy_event::sign_and_serialize(expr_def_event.clone(), signing_key)
        .map_err(|e| anyhow::anyhow!("Failed to serialize expression def event: {:?}", e))?;
    let expr_def_hash = EventHashId::from_bytes(&expr_def_binary);

    let expr_ref = Expression::PartReference(PartReferenceExpression {
        part_definition_event_hash: expr_def_hash.clone(),
    });

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

    let expr_update_event = Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(38),
        content: EventContent::PartUpdate(PartUpdateEvent {
            part_name: "expression".into(),
            part_description: Description::localized(vec![
                ("en", "Definy AST expression type (self-describing AST)"),
                ("ja", "Definy の AST 式型 (メタデータ・ASTの自己表現)"),
            ]),
            part_definition_event_hash: expr_def_hash.clone(),
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
                        tag: "less_than".into(),
                        payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                    },
                    TypeUnionVariant {
                        tag: "less_than_or_equal".into(),
                        payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                    },
                    TypeUnionVariant {
                        tag: "greater_than".into(),
                        payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                    },
                    TypeUnionVariant {
                        tag: "greater_than_or_equal".into(),
                        payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                    },
                    TypeUnionVariant {
                        tag: "equal".into(),
                        payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                    },
                    TypeUnionVariant {
                        tag: "not_equal".into(),
                        payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                    },
                    TypeUnionVariant {
                        tag: "not".into(),
                        payload_type: Some(Box::new(expr_ref.clone())),
                    },
                    TypeUnionVariant {
                        tag: "and".into(),
                        payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                    },
                    TypeUnionVariant {
                        tag: "or".into(),
                        payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                    },
                    TypeUnionVariant {
                        tag: "string_concat".into(),
                        payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                    },
                    TypeUnionVariant {
                        tag: "string_length".into(),
                        payload_type: Some(Box::new(expr_ref.clone())),
                    },
                    TypeUnionVariant {
                        tag: "string_slice".into(),
                        payload_type: Some(Box::new(Expression::TypeLiteral(
                            TypeLiteralExpression {
                                items: vec![
                                    TypeLiteralItemExpression {
                                        key: "value".into(),
                                        value: Box::new(expr_ref.clone()),
                                    },
                                    TypeLiteralItemExpression {
                                        key: "start".into(),
                                        value: Box::new(expr_ref.clone()),
                                    },
                                    TypeLiteralItemExpression {
                                        key: "end".into(),
                                        value: Box::new(expr_ref.clone()),
                                    },
                                ],
                            },
                        ))),
                    },
                    TypeUnionVariant {
                        tag: "list_literal".into(),
                        payload_type: Some(Box::new(Expression::TypeList(TypeListExpression {
                            item_type: Box::new(expr_ref.clone()),
                        }))),
                    },
                    TypeUnionVariant {
                        tag: "list_length".into(),
                        payload_type: Some(Box::new(expr_ref.clone())),
                    },
                    TypeUnionVariant {
                        tag: "list_concat".into(),
                        payload_type: Some(Box::new(binary_op_payload("left", "right"))),
                    },
                    TypeUnionVariant {
                        tag: "list_get".into(),
                        payload_type: Some(Box::new(Expression::TypeLiteral(
                            TypeLiteralExpression {
                                items: vec![
                                    TypeLiteralItemExpression {
                                        key: "list".into(),
                                        value: Box::new(expr_ref.clone()),
                                    },
                                    TypeLiteralItemExpression {
                                        key: "index".into(),
                                        value: Box::new(expr_ref.clone()),
                                    },
                                ],
                            },
                        ))),
                    },
                    TypeUnionVariant {
                        tag: "list_append".into(),
                        payload_type: Some(Box::new(Expression::TypeLiteral(
                            TypeLiteralExpression {
                                items: vec![
                                    TypeLiteralItemExpression {
                                        key: "list".into(),
                                        value: Box::new(expr_ref.clone()),
                                    },
                                    TypeLiteralItemExpression {
                                        key: "item".into(),
                                        value: Box::new(expr_ref.clone()),
                                    },
                                ],
                            },
                        ))),
                    },
                    TypeUnionVariant {
                        tag: "if".into(),
                        payload_type: Some(Box::new(Expression::TypeLiteral(
                            TypeLiteralExpression {
                                items: vec![
                                    TypeLiteralItemExpression {
                                        key: "condition".into(),
                                        value: Box::new(expr_ref.clone()),
                                    },
                                    TypeLiteralItemExpression {
                                        key: "then_expr".into(),
                                        value: Box::new(expr_ref.clone()),
                                    },
                                    TypeLiteralItemExpression {
                                        key: "else_expr".into(),
                                        value: Box::new(expr_ref.clone()),
                                    },
                                ],
                            },
                        ))),
                    },
                    TypeUnionVariant {
                        tag: "let".into(),
                        payload_type: Some(Box::new(Expression::TypeLiteral(
                            TypeLiteralExpression {
                                items: vec![
                                    TypeLiteralItemExpression {
                                        key: "variable_name".into(),
                                        value: Box::new(Expression::TypeString),
                                    },
                                    TypeLiteralItemExpression {
                                        key: "value".into(),
                                        value: Box::new(expr_ref.clone()),
                                    },
                                    TypeLiteralItemExpression {
                                        key: "body".into(),
                                        value: Box::new(expr_ref.clone()),
                                    },
                                ],
                            },
                        ))),
                    },
                    TypeUnionVariant {
                        tag: "variable".into(),
                        payload_type: Some(Box::new(Expression::TypeNumber)),
                    },
                    TypeUnionVariant {
                        tag: "record_get".into(),
                        payload_type: Some(Box::new(Expression::TypeLiteral(
                            TypeLiteralExpression {
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
                            },
                        ))),
                    },
                    TypeUnionVariant {
                        tag: "part_reference".into(),
                        payload_type: Some(Box::new(Expression::TypeString)),
                    },
                ],
            })),
            module_definition_event_hash: core_module_hash.clone(),
        }),
    };

    Ok((expr_def_event, expr_update_event))
}
