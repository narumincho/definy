use definy_event::EventHashId;
use definy_event::event::{
    Description, Expression, ModulePartEntry, PartReferenceExpression, PartType,
    TypeListExpression, TypeLiteralExpression, TypeLiteralItemExpression, TypeUnionExpression,
    TypeUnionVariant, derive_module_part_id,
};

/// definy の型システムを表現する AST 型 (`core.type-ast`) を生成します。
/// セルフホストコンパイラ・型チェッカーにおいて、型をデータとして扱うための型定義です。
pub fn create_type_ast_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_def_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_ast_ref = Expression::PartReference(PartReferenceExpression::new(type_ast_def_hash));

    ModulePartEntry {
        name: "type-ast".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            ("en", "Definy type system AST (self-describing types)"),
            ("ja", "Definy の型システム AST (型の自己表現)"),
        ]),
        content_hash: None,
        expression: Some(Expression::TypeUnion(TypeUnionExpression {
            variants: vec![
                TypeUnionVariant {
                    tag: "number".into(),
                    payload_type: None,
                },
                TypeUnionVariant {
                    tag: "string".into(),
                    payload_type: None,
                },
                TypeUnionVariant {
                    tag: "boolean".into(),
                    payload_type: None,
                },
                TypeUnionVariant {
                    tag: "list".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "item_type".into(),
                            value: Box::new(type_ast_ref.clone()),
                        }],
                    }))),
                },
                TypeUnionVariant {
                    tag: "function".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![
                            TypeLiteralItemExpression {
                                key: "parameter".into(),
                                value: Box::new(type_ast_ref.clone()),
                            },
                            TypeLiteralItemExpression {
                                key: "return_type".into(),
                                value: Box::new(type_ast_ref.clone()),
                            },
                        ],
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
                                    key: "field_type".into(),
                                    value: Box::new(type_ast_ref.clone()),
                                },
                            ],
                        })),
                    }))),
                },
                TypeUnionVariant {
                    tag: "union".into(),
                    payload_type: Some(Box::new(Expression::TypeList(TypeListExpression {
                        item_type: Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                            items: vec![
                                TypeLiteralItemExpression {
                                    key: "tag".into(),
                                    value: Box::new(Expression::TypeString),
                                },
                                TypeLiteralItemExpression {
                                    key: "payload_type".into(),
                                    value: Box::new(type_ast_ref.clone()),
                                },
                            ],
                        })),
                    }))),
                },
                TypeUnionVariant {
                    tag: "reference".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "part_hash".into(),
                            value: Box::new(Expression::TypeString),
                        }],
                    }))),
                },
            ],
        })),
    }
}

/// definy のパーツ定義を表現するメタデータ型 (`core.part-definition`) を生成します。
pub fn create_part_definition_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_def_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_ast_ref = Expression::PartReference(PartReferenceExpression::new(type_ast_def_hash));

    let expr_def_hash = derive_module_part_id(core_module_id, "expression");
    let expr_ref = Expression::PartReference(PartReferenceExpression::new(expr_def_hash));

    ModulePartEntry {
        name: "part-definition".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            (
                "en",
                "Definy part definition structure (self-describing part metadata)",
            ),
            ("ja", "Definy のパーツ定義構造 (パーツメタデータの自己表現)"),
        ]),
        content_hash: None,
        expression: Some(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "name".into(),
                    value: Box::new(Expression::TypeString),
                },
                TypeLiteralItemExpression {
                    key: "description".into(),
                    value: Box::new(Expression::TypeString),
                },
                TypeLiteralItemExpression {
                    key: "part_type".into(),
                    value: Box::new(type_ast_ref),
                },
                TypeLiteralItemExpression {
                    key: "expression".into(),
                    value: Box::new(expr_ref),
                },
            ],
        })),
    }
}

/// definy のモジュール定義を表現するメタデータ型 (`core.module-definition`) を生成します。
pub fn create_module_definition_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let part_def_hash = derive_module_part_id(core_module_id, "part-definition");
    let part_def_ref = Expression::PartReference(PartReferenceExpression::new(part_def_hash));

    ModulePartEntry {
        name: "module-definition".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            (
                "en",
                "Definy module definition structure (self-describing module metadata)",
            ),
            (
                "ja",
                "Definy のモジュール定義構造 (モジュールメタデータの自己表現)",
            ),
        ]),
        content_hash: None,
        expression: Some(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "name".into(),
                    value: Box::new(Expression::TypeString),
                },
                TypeLiteralItemExpression {
                    key: "description".into(),
                    value: Box::new(Expression::TypeString),
                },
                TypeLiteralItemExpression {
                    key: "parts".into(),
                    value: Box::new(Expression::TypeList(TypeListExpression {
                        item_type: Box::new(part_def_ref),
                    })),
                },
            ],
        })),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_type_ast_and_definitions_parts() {
        let dummy_hash = EventHashId::from_bytes(&[1u8; 32]);
        let type_ast = create_type_ast_part(&dummy_hash);
        assert_eq!(type_ast.name.as_ref(), "type-ast");
        assert_eq!(type_ast.part_type, Some(PartType::Type));
        assert!(matches!(
            type_ast.expression,
            Some(Expression::TypeUnion(_))
        ));

        let part_def = create_part_definition_part(&dummy_hash);
        assert_eq!(part_def.name.as_ref(), "part-definition");
        assert_eq!(part_def.part_type, Some(PartType::Type));
        assert!(matches!(
            part_def.expression,
            Some(Expression::TypeLiteral(_))
        ));

        let mod_def = create_module_definition_part(&dummy_hash);
        assert_eq!(mod_def.name.as_ref(), "module-definition");
        assert_eq!(mod_def.part_type, Some(PartType::Type));
        assert!(matches!(
            mod_def.expression,
            Some(Expression::TypeLiteral(_))
        ));
    }
}
