use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, CallExpression, Description, EqualExpression, Expression, FunctionExpression,
    IfExpression, LessThanOrEqualExpression, ListAppendExpression, ListGetExpression,
    ListLengthExpression, ListLiteralExpression, MatchArm, MatchExpression, ModulePartEntry,
    NumberExpression, PartReferenceExpression, PartType, RecordFieldType, RecordGetExpression,
    TypeLiteralExpression, TypeLiteralItemExpression, VariableExpression, VariantExpression,
    derive_module_part_id,
};

/// レコードのフィールド一覧からキーを再帰探索して型結果を返すパーツ
/// `core.record-field-type-lookup`: `list<{ key: string, field_type: type-ast }> -> string -> number -> type-result`
pub fn create_record_field_type_lookup_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let lookup_hash = derive_module_part_id(core_module_id, "record-field-type-lookup");

    let fields = Expression::Variable(VariableExpression { variable_id: 0 });
    let key = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });

    let at_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(fields.clone()),
        })),
        right: Box::new(index.clone()),
    });

    let current_field = Expression::ListGet(ListGetExpression {
        list: Box::new(fields.clone()),
        index: Box::new(index.clone()),
    });
    let current_key = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_field.clone()),
        key: "key".into(),
    });
    let current_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_field),
        key: "field_type".into(),
    });

    let key_matches = Expression::Equal(EqualExpression {
        left: Box::new(current_key),
        right: Box::new(key.clone()),
    });

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let recurse = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    lookup_hash,
                ))),
                argument: Box::new(fields),
            })),
            argument: Box::new(key.clone()),
        })),
        argument: Box::new(next_index),
    });

    let err_field_not_found = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "error".into(),
        payload: Some(Box::new(Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "field_not_found".into(),
            payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![TypeLiteralItemExpression {
                    key: "key".into(),
                    value: Box::new(key),
                }],
            }))),
        }))),
    });

    let ok_type = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "ok".into(),
        payload: Some(Box::new(current_type)),
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(err_field_not_found),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(key_matches),
            then_expr: Box::new(ok_type),
            else_expr: Box::new(recurse),
        })),
    });

    let field_type = PartType::Record(vec![
        RecordFieldType {
            key: "key".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "field_type".into(),
            value: Box::new(PartType::TypePart(type_ast_hash)),
        },
    ]);

    ModulePartEntry {
        name: "record-field-type-lookup".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::List(Box::new(field_type))),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::String),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::TypePart(type_result_hash)),
                }),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Looks up a field's type in an ordered record field type list",
            ),
            (
                "ja",
                "レコード型のフィールド型一覧からキーに対応する型を検索する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(Expression::Function(FunctionExpression {
            parameter_id: 0,
            parameter_name: "fields".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "key".into(),
                body: Box::new(Expression::Function(FunctionExpression {
                    parameter_id: 2,
                    parameter_name: "index".into(),
                    body: Box::new(body),
                })),
            })),
        })),
    }
}

/// レコード式内の全フィールドの式を左から右へ型検査してレコード型を構築するパーツ
/// `core.type-check-record-fields`: `list<{ key: string, value: expression }> -> type-env -> number -> list<{ key: string, field_type: type-ast }> -> type-result`
pub fn create_type_check_record_fields_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_type_hash = derive_module_part_id(core_module_id, "expression");
    let type_env_hash = derive_module_part_id(core_module_id, "type-env");
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let type_check_hash = derive_module_part_id(core_module_id, "type-check");
    let check_record_fields_hash =
        derive_module_part_id(core_module_id, "type-check-record-fields");

    let fields = Expression::Variable(VariableExpression { variable_id: 0 });
    let env = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });
    let accum = Expression::Variable(VariableExpression { variable_id: 3 });

    let at_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(fields.clone()),
        })),
        right: Box::new(index.clone()),
    });

    let ok_finished = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "ok".into(),
        payload: Some(Box::new(Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "record".into(),
            payload: Some(Box::new(accum.clone())),
        }))),
    });

    let current_field = Expression::ListGet(ListGetExpression {
        list: Box::new(fields.clone()),
        index: Box::new(index.clone()),
    });
    let current_key = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_field.clone()),
        key: "key".into(),
    });
    let current_value_expr = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_field),
        key: "value".into(),
    });

    // type-check(current_value_expr)(env)
    let check_val = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                type_check_hash,
            ))),
            argument: Box::new(current_value_expr),
        })),
        argument: Box::new(env.clone()),
    });

    let new_entry = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "key".into(),
                value: Box::new(current_key),
            },
            TypeLiteralItemExpression {
                key: "field_type".into(),
                value: Box::new(Expression::Variable(VariableExpression { variable_id: 10 })),
            },
        ],
    });
    let next_accum = Expression::ListAppend(ListAppendExpression {
        list: Box::new(accum),
        item: Box::new(new_entry),
    });
    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let recurse = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                        check_record_fields_hash,
                    ))),
                    argument: Box::new(fields),
                })),
                argument: Box::new(env),
            })),
            argument: Box::new(next_index),
        })),
        argument: Box::new(next_accum),
    });

    let check_val_match = Expression::Match(MatchExpression {
        target: Box::new(check_val),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(10),
                variable_name: Some("inferred_type".into()),
                body: Box::new(recurse),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(11),
                variable_name: Some("err".into()),
                body: Box::new(Expression::Variant(VariantExpression {
                    type_part_definition_event_hash: None,
                    tag: "error".into(),
                    payload: Some(Box::new(Expression::Variable(VariableExpression {
                        variable_id: 11,
                    }))),
                })),
            },
            MatchArm {
                tag: "_".into(),
                variable_id: Some(99),
                variable_name: Some("_".into()),
                body: Box::new(Expression::Variant(VariantExpression {
                    type_part_definition_event_hash: None,
                    tag: "error".into(),
                    payload: Some(Box::new(Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: None,
                        tag: "unknown_error".into(),
                        payload: None,
                    }))),
                })),
            },
        ],
        default: None,
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(ok_finished),
        else_expr: Box::new(check_val_match),
    });

    let expr_field_type = PartType::Record(vec![
        RecordFieldType {
            key: "key".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "value".into(),
            value: Box::new(PartType::TypePart(expr_type_hash)),
        },
    ]);
    let checked_field_type = PartType::Record(vec![
        RecordFieldType {
            key: "key".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "field_type".into(),
            value: Box::new(PartType::TypePart(type_ast_hash)),
        },
    ]);

    ModulePartEntry {
        name: "type-check-record-fields".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::List(Box::new(expr_field_type))),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::TypePart(type_env_hash)),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::Function {
                        parameter: Box::new(PartType::List(Box::new(checked_field_type))),
                        return_type: Box::new(PartType::TypePart(type_result_hash)),
                    }),
                }),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Recursively type-checks record expression fields to infer a record type",
            ),
            (
                "ja",
                "レコード式の各フィールドを再帰的に型検査してレコード型を構築する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(Expression::Function(FunctionExpression {
            parameter_id: 0,
            parameter_name: "fields".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "env".into(),
                body: Box::new(Expression::Function(FunctionExpression {
                    parameter_id: 2,
                    parameter_name: "index".into(),
                    body: Box::new(Expression::Function(FunctionExpression {
                        parameter_id: 3,
                        parameter_name: "accum".into(),
                        body: Box::new(body),
                    })),
                })),
            })),
        })),
    }
}

/// `core.type-check` 用のレコード関連 MatchArm（`record_get`, `record`）を生成
pub fn create_record_check_arms(
    type_check_hash: &EventHashId,
    record_field_type_lookup_hash: EventHashId,
    check_record_fields_hash: EventHashId,
) -> Vec<MatchArm> {
    fn check_sub(check_hash: &EventHashId, expr: Expression, env: Expression) -> Expression {
        Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    check_hash.clone(),
                ))),
                argument: Box::new(expr),
            })),
            argument: Box::new(env),
        })
    }

    let mut arms = Vec::new();

    // Record field access: record_get({ record, key })
    {
        let rg_var_id = 70;
        let record_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: rg_var_id,
            })),
            key: "record".into(),
        });
        let key_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: rg_var_id,
            })),
            key: "key".into(),
        });

        let check_rec = check_sub(
            type_check_hash,
            record_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let rec_ok_var = 71;
        let fields_var = 72;

        let lookup_call = Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                        record_field_type_lookup_hash,
                    ))),
                    argument: Box::new(Expression::Variable(VariableExpression {
                        variable_id: fields_var,
                    })),
                })),
                argument: Box::new(key_expr),
            })),
            argument: Box::new(Expression::Number(NumberExpression { value: 0 })),
        });

        let not_a_record_err = Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "error".into(),
            payload: Some(Box::new(Expression::Variant(VariantExpression {
                type_part_definition_event_hash: None,
                tag: "not_a_record".into(),
                payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                    items: vec![TypeLiteralItemExpression {
                        key: "actual".into(),
                        value: Box::new(Expression::Variable(VariableExpression {
                            variable_id: rec_ok_var,
                        })),
                    }],
                }))),
            }))),
        });

        let rec_type_match = Expression::Match(MatchExpression {
            target: Box::new(Expression::Variable(VariableExpression {
                variable_id: rec_ok_var,
            })),
            arms: vec![
                MatchArm {
                    tag: "record".into(),
                    variable_id: Some(fields_var),
                    variable_name: Some("fields".into()),
                    body: Box::new(lookup_call),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(96),
                    variable_name: Some("_".into()),
                    body: Box::new(not_a_record_err),
                },
            ],
            default: None,
        });

        let rg_match = Expression::Match(MatchExpression {
            target: Box::new(check_rec),
            arms: vec![
                MatchArm {
                    tag: "ok".into(),
                    variable_id: Some(rec_ok_var),
                    variable_name: Some("rec_t".into()),
                    body: Box::new(rec_type_match),
                },
                MatchArm {
                    tag: "error".into(),
                    variable_id: Some(73),
                    variable_name: Some("err".into()),
                    body: Box::new(Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: None,
                        tag: "error".into(),
                        payload: Some(Box::new(Expression::Variable(VariableExpression {
                            variable_id: 73,
                        }))),
                    })),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "record_get".into(),
            variable_id: Some(rg_var_id),
            variable_name: Some("rg_e".into()),
            body: Box::new(rg_match),
        });
    }

    // Record literal: record(list<{ key, value }>)
    {
        let rec_var_id = 74;
        let empty_accum = Expression::ListLiteral(ListLiteralExpression { items: vec![] });
        let check_fields_call = Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::Call(CallExpression {
                        function: Box::new(Expression::PartReference(
                            PartReferenceExpression::new(check_record_fields_hash),
                        )),
                        argument: Box::new(Expression::Variable(VariableExpression {
                            variable_id: rec_var_id,
                        })),
                    })),
                    argument: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                })),
                argument: Box::new(Expression::Number(NumberExpression { value: 0 })),
            })),
            argument: Box::new(empty_accum),
        });

        arms.push(MatchArm {
            tag: "record".into(),
            variable_id: Some(rec_var_id),
            variable_name: Some("rec_fields".into()),
            body: Box::new(check_fields_call),
        });
    }

    arms
}
