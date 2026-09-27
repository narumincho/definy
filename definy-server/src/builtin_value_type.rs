use definy_event::EventHashId;
use definy_event::event::{
    Description, Expression, ModulePartEntry, PartReferenceExpression, PartType,
    TypeListExpression, TypeLiteralExpression, TypeLiteralItemExpression, TypeUnionExpression,
    TypeUnionVariant, derive_module_part_id,
};

pub fn create_value_type_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let val_part_hash = derive_module_part_id(core_module_id, "value");
    let val_ref = Expression::PartReference(PartReferenceExpression::new(val_part_hash));

    ModulePartEntry {
        name: "value".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            ("en", "Definy runtime value type (self-describing value)"),
            ("ja", "Definy のランタイム値型 (値の自己表現)"),
        ]),
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
    }
}
