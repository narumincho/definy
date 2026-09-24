use definy_event::EventHashId;
use definy_event::event::{
    AccountId, Description, Event, EventContent, Expression, PartDefinitionEvent,
    PartReferenceExpression, PartType, PartUpdateEvent, TypeListExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, TypeUnionExpression, TypeUnionVariant,
};

pub fn create_value_type_events(
    account_id: &AccountId,
    first_commit_time: chrono::DateTime<chrono::Utc>,
    core_module_hash: &EventHashId,
    signing_key: &ed25519_dalek::SigningKey,
) -> Result<(Event, Event), anyhow::Error> {
    let val_def_event = Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(42),
        content: EventContent::PartDefinition(PartDefinitionEvent {
            part_name: "value".into(),
            part_type: Some(PartType::Type),
            description: Description::localized(vec![
                ("en", "Definy runtime value type (self-describing value)"),
                ("ja", "Definy のランタイム値型 (値の自己表現)"),
            ]),
            expression: None,
            module_definition_event_hash: core_module_hash.clone(),
        }),
    };
    let val_def_binary = definy_event::sign_and_serialize(val_def_event.clone(), signing_key)
        .map_err(|e| anyhow::anyhow!("Failed to serialize value def event: {:?}", e))?;
    let val_def_hash = EventHashId::from_bytes(&val_def_binary);

    let val_ref = Expression::PartReference(PartReferenceExpression {
        part_definition_event_hash: val_def_hash.clone(),
    });

    let val_update_event = Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(43),
        content: EventContent::PartUpdate(PartUpdateEvent {
            part_name: "value".into(),
            part_description: Description::localized(vec![
                ("en", "Definy runtime value type (self-describing value)"),
                ("ja", "Definy のランタイム値型 (値の自己表現)"),
            ]),
            part_definition_event_hash: val_def_hash.clone(),
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
                        tag: "unit".into(),
                        payload_type: None,
                    },
                ],
            })),
            module_definition_event_hash: core_module_hash.clone(),
        }),
    };

    Ok((val_def_event, val_update_event))
}
