use definy_event::EventHashId;
use definy_event::event::{
    Description, EqualExpression, Expression, FunctionExpression, ModulePartEntry,
    PartReferenceExpression, PartType, TypeListExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, TypeUnionExpression, TypeUnionVariant, VariableExpression,
    derive_module_part_id,
};

/// 型検査エラーを表す直和型 (`core.type-error`)
pub fn create_type_error_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_ast_ref = Expression::PartReference(PartReferenceExpression::new(type_ast_hash));

    ModulePartEntry {
        name: "type-error".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            ("en", "Definy type checker error diagnostics"),
            ("ja", "Definy の自己記述型チェッカーのエラー情報"),
        ]),
        content_hash: None,
        expression: Some(Expression::TypeUnion(TypeUnionExpression {
            variants: vec![
                TypeUnionVariant {
                    tag: "type_mismatch".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![
                            TypeLiteralItemExpression {
                                key: "expected".into(),
                                value: Box::new(type_ast_ref.clone()),
                            },
                            TypeLiteralItemExpression {
                                key: "actual".into(),
                                value: Box::new(type_ast_ref.clone()),
                            },
                        ],
                    }))),
                },
                TypeUnionVariant {
                    tag: "undefined_variable".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "variable_id".into(),
                            value: Box::new(Expression::TypeNumber),
                        }],
                    }))),
                },
                TypeUnionVariant {
                    tag: "not_a_function".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "actual".into(),
                            value: Box::new(type_ast_ref.clone()),
                        }],
                    }))),
                },
                TypeUnionVariant {
                    tag: "condition_not_boolean".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "actual".into(),
                            value: Box::new(type_ast_ref),
                        }],
                    }))),
                },
                TypeUnionVariant {
                    tag: "unknown_error".into(),
                    payload_type: None,
                },
            ],
        })),
    }
}

/// 型検査結果を表す直和型 (`core.type-result`)
/// `ok: type-ast | error: type-error`
pub fn create_type_result_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_ast_ref = Expression::PartReference(PartReferenceExpression::new(type_ast_hash));
    let type_error_hash = derive_module_part_id(core_module_id, "type-error");
    let type_error_ref = Expression::PartReference(PartReferenceExpression::new(type_error_hash));

    ModulePartEntry {
        name: "type-result".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            (
                "en",
                "Result of type checking: ok(type-ast) or error(type-error)",
            ),
            ("ja", "型検査結果 (ok: 成功時の型, error: エラー情報)"),
        ]),
        content_hash: None,
        expression: Some(Expression::TypeUnion(TypeUnionExpression {
            variants: vec![
                TypeUnionVariant {
                    tag: "ok".into(),
                    payload_type: Some(Box::new(type_ast_ref)),
                },
                TypeUnionVariant {
                    tag: "error".into(),
                    payload_type: Some(Box::new(type_error_ref)),
                },
            ],
        })),
    }
}

/// 型環境型 (`core.type-env` = `list<{ variable_id: number, var_type: type-ast }>`)
pub fn create_type_env_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_ast_ref = Expression::PartReference(PartReferenceExpression::new(type_ast_hash));

    ModulePartEntry {
        name: "type-env".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            (
                "en",
                "Type checking environment mapping variable IDs to types",
            ),
            ("ja", "変数 ID と型の対応を管理する型環境"),
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
                        key: "var_type".into(),
                        value: Box::new(type_ast_ref),
                    },
                ],
            })),
        })),
    }
}

/// `core.type-equals`: `type-ast -> type-ast -> boolean`
pub fn create_type_equals_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_part_hash = derive_module_part_id(core_module_id, "type-ast");

    let body = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "t1".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "t2".into(),
            body: Box::new(Expression::Equal(EqualExpression {
                left: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
                right: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            })),
        })),
    });

    ModulePartEntry {
        name: "type-equals".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(type_ast_part_hash.clone())),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::TypePart(type_ast_part_hash)),
                return_type: Box::new(PartType::Boolean),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Check structural equality between two type-ast values",
            ),
            ("ja", "2つの型 AST が構造的に同一であるかを判定"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}
