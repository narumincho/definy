use definy_event::EventHashId;
use definy_event::event::{
    CallExpression, Description, EqualExpression, Expression, FunctionExpression, IfExpression,
    LessThanExpression, ListAppendExpression, ListGetExpression, ListLengthExpression,
    ModulePartEntry, NumberExpression, PartReferenceExpression, PartType, RecordFieldType,
    RecordGetExpression, SubtractExpression, TypeLiteralExpression, TypeLiteralItemExpression,
    VariableExpression, VariantExpression, derive_module_part_id,
};

/// `core.type-env-lookup`: `type-env -> number -> type-result`
pub fn create_type_env_lookup_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_env_part_hash = derive_module_part_id(core_module_id, "type-env");
    let type_result_part_hash = derive_module_part_id(core_module_id, "type-result");
    let inner_hash = derive_module_part_id(core_module_id, "type-env-lookup-inner");

    let variables_expr = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
        key: "variables".into(),
    });

    let body = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "env".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "var_id".into(),
            body: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::Call(CallExpression {
                        function: Box::new(Expression::PartReference(
                            PartReferenceExpression::new(inner_hash),
                        )),
                        argument: Box::new(variables_expr.clone()),
                    })),
                    argument: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                })),
                argument: Box::new(Expression::Subtract(SubtractExpression {
                    left: Box::new(Expression::ListLength(ListLengthExpression {
                        value: Box::new(variables_expr),
                    })),
                    right: Box::new(Expression::Number(NumberExpression { value: 1 })),
                })),
            })),
        })),
    });

    ModulePartEntry {
        name: "type-env-lookup".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(type_env_part_hash)),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::TypePart(type_result_part_hash)),
            }),
        }),
        description: Description::localized(vec![
            ("en", "Lookup variable type in type environment"),
            ("ja", "型環境から変数の型を検索"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// `core.type-env-lookup-inner`: `list<{ variable_id, var_type }> -> var_id -> idx -> type-result`
pub fn create_type_env_lookup_inner_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_part_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_result_part_hash = derive_module_part_id(core_module_id, "type-result");
    let inner_hash = derive_module_part_id(core_module_id, "type-env-lookup-inner");

    let err_undef = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "error".into(),
        payload: Some(Box::new(Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "undefined_variable".into(),
            payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![TypeLiteralItemExpression {
                    key: "variable_id".into(),
                    value: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                }],
            }))),
        }))),
    });

    let current_item = Expression::ListGet(ListGetExpression {
        list: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
        index: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
    });

    let recurse_prev = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    inner_hash,
                ))),
                argument: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
            })),
            argument: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
        })),
        argument: Box::new(Expression::Subtract(SubtractExpression {
            left: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
            right: Box::new(Expression::Number(NumberExpression { value: 1 })),
        })),
    });

    let body = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "variables".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "var_id".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 2,
                parameter_name: "idx".into(),
                body: Box::new(Expression::If(IfExpression {
                    condition: Box::new(Expression::LessThan(LessThanExpression {
                        left: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
                        right: Box::new(Expression::Number(NumberExpression { value: 0 })),
                    })),
                    then_expr: Box::new(err_undef),
                    else_expr: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::Equal(EqualExpression {
                            left: Box::new(Expression::RecordGet(RecordGetExpression {
                                record: Box::new(current_item.clone()),
                                key: "variable_id".into(),
                            })),
                            right: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 1,
                            })),
                        })),
                        then_expr: Box::new(Expression::Variant(VariantExpression {
                            type_part_definition_event_hash: None,
                            tag: "ok".into(),
                            payload: Some(Box::new(Expression::RecordGet(RecordGetExpression {
                                record: Box::new(current_item),
                                key: "var_type".into(),
                            }))),
                        })),
                        else_expr: Box::new(recurse_prev),
                    })),
                })),
            })),
        })),
    });

    let var_entry_type = PartType::Record(vec![
        RecordFieldType {
            key: "variable_id".into(),
            value: Box::new(PartType::Number),
        },
        RecordFieldType {
            key: "var_type".into(),
            value: Box::new(PartType::TypePart(type_ast_part_hash)),
        },
    ]);

    ModulePartEntry {
        name: "type-env-lookup-inner".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::List(Box::new(var_entry_type))),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::TypePart(type_result_part_hash)),
                }),
            }),
        }),
        description: Description::localized(vec![
            ("en", "Inner helper for type-env-lookup recursion"),
            ("ja", "type-env-lookup の再帰用内部ヘルパー"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// `core.type-env-extend`: `type-env -> number -> type-ast -> type-env`
pub fn create_type_env_extend_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_env_part_hash = derive_module_part_id(core_module_id, "type-env");
    let type_ast_part_hash = derive_module_part_id(core_module_id, "type-ast");

    let new_entry = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "variable_id".into(),
                value: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            },
            TypeLiteralItemExpression {
                key: "var_type".into(),
                value: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
            },
        ],
    });

    let updated_env = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "variables".into(),
                value: Box::new(Expression::ListAppend(ListAppendExpression {
                    list: Box::new(Expression::RecordGet(RecordGetExpression {
                        record: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 0,
                        })),
                        key: "variables".into(),
                    })),
                    item: Box::new(new_entry),
                })),
            },
            TypeLiteralItemExpression {
                key: "parts".into(),
                value: Box::new(Expression::RecordGet(RecordGetExpression {
                    record: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
                    key: "parts".into(),
                })),
            },
        ],
    });

    let body = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "env".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "var_id".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 2,
                parameter_name: "var_type".into(),
                body: Box::new(updated_env),
            })),
        })),
    });

    ModulePartEntry {
        name: "type-env-extend".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(type_env_part_hash.clone())),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::TypePart(type_ast_part_hash)),
                    return_type: Box::new(PartType::TypePart(type_env_part_hash)),
                }),
            }),
        }),
        description: Description::localized(vec![
            ("en", "Extend type environment with a variable type binding"),
            ("ja", "型環境に変数の型束縛を追加"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}
