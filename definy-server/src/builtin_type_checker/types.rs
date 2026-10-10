use crate::ast_builder::{call_part, fn_expr, fn_type};
use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, AndExpression, BooleanExpression, Description, EqualExpression, Expression,
    IfExpression, LessThanOrEqualExpression, ListGetExpression, ListLengthExpression, MatchArm,
    MatchExpression, ModulePartEntry, NumberExpression, PartReferenceExpression, PartType,
    RecordFieldType, RecordGetExpression, TypeListExpression, TypeLiteralExpression,
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
                            value: Box::new(type_ast_ref.clone()),
                        }],
                    }))),
                },
                TypeUnionVariant {
                    tag: "not_a_record".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "actual".into(),
                            value: Box::new(type_ast_ref.clone()),
                        }],
                    }))),
                },
                TypeUnionVariant {
                    tag: "not_a_union".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "actual".into(),
                            value: Box::new(type_ast_ref),
                        }],
                    }))),
                },
                TypeUnionVariant {
                    tag: "variant_not_found".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "tag".into(),
                            value: Box::new(Expression::TypeString),
                        }],
                    }))),
                },
                TypeUnionVariant {
                    tag: "non_exhaustive_match".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "missing_tag".into(),
                            value: Box::new(Expression::TypeString),
                        }],
                    }))),
                },
                TypeUnionVariant {
                    tag: "field_not_found".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "key".into(),
                            value: Box::new(Expression::TypeString),
                        }],
                    }))),
                },
                TypeUnionVariant {
                    tag: "cannot_infer_empty_list".into(),
                    payload_type: None,
                },
                TypeUnionVariant {
                    tag: "part_not_found".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "part_definition_event_hash".into(),
                            value: Box::new(Expression::TypeString),
                        }],
                    }))),
                },
                TypeUnionVariant {
                    tag: "invalid_type_declaration".into(),
                    payload_type: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![TypeLiteralItemExpression {
                            key: "message".into(),
                            value: Box::new(Expression::TypeString),
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

/// 型環境型 (`core.type-env` = `{ variables: list<{ variable_id: number, var_type: type-ast }>, parts: list<{ part_definition_event_hash: string, part_type: type-ast }> }`)
pub fn create_type_env_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_ast_ref = Expression::PartReference(PartReferenceExpression::new(type_ast_hash));

    ModulePartEntry {
        name: "type-env".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            (
                "en",
                "Type checking environment mapping variable IDs and part hashes to types",
            ),
            (
                "ja",
                "変数 ID およびパーツ定義ハッシュと型の対応を管理する型環境",
            ),
        ]),
        content_hash: None,
        expression: Some(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "variables".into(),
                    value: Box::new(Expression::TypeList(TypeListExpression {
                        item_type: Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                            items: vec![
                                TypeLiteralItemExpression {
                                    key: "variable_id".into(),
                                    value: Box::new(Expression::TypeNumber),
                                },
                                TypeLiteralItemExpression {
                                    key: "var_type".into(),
                                    value: Box::new(type_ast_ref.clone()),
                                },
                            ],
                        })),
                    })),
                },
                TypeLiteralItemExpression {
                    key: "parts".into(),
                    value: Box::new(Expression::TypeList(TypeListExpression {
                        item_type: Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                            items: vec![
                                TypeLiteralItemExpression {
                                    key: "part_definition_event_hash".into(),
                                    value: Box::new(Expression::TypeString),
                                },
                                TypeLiteralItemExpression {
                                    key: "part_type".into(),
                                    value: Box::new(type_ast_ref),
                                },
                            ],
                        })),
                    })),
                },
            ],
        })),
    }
}

/// `core.type-equals`: `(t1: type-ast, t2: type-ast) -> Boolean`
pub fn create_type_equals_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_part_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_equals_hash = derive_module_part_id(core_module_id, "type-equals");
    let function_parameters_equals_hash =
        derive_module_part_id(core_module_id, "type-equals-function-parameters");
    let record_fields_equals_hash =
        derive_module_part_id(core_module_id, "type-equals-record-fields");
    let union_variants_equals_hash =
        derive_module_part_id(core_module_id, "type-equals-union-variants");

    let compare_second_tag = |tag: &'static str, variable_id, body| {
        Expression::Match(MatchExpression {
            target: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            arms: vec![MatchArm {
                tag: tag.into(),
                variable_id,
                variable_name: None,
                body: Box::new(body),
            }],
            default: Some(Box::new(Expression::Boolean(BooleanExpression {
                value: false,
            }))),
        })
    };
    let compare_field = |left_id, right_id, key: &'static str| {
        let get_field = |variable_id| {
            Expression::RecordGet(RecordGetExpression {
                record: Box::new(Expression::Variable(VariableExpression { variable_id })),
                key: key.into(),
            })
        };
        call_type_equals(&type_equals_hash, get_field(left_id), get_field(right_id))
    };
    let compare_list_payloads =
        compare_second_tag("list", Some(3), compare_field(2, 3, "item_type"));
    let compare_function_payloads = compare_second_tag(
        "function",
        Some(5),
        Expression::And(AndExpression {
            left: Box::new(call_type_equals_function_parameters(
                &function_parameters_equals_hash,
                Expression::RecordGet(RecordGetExpression {
                    record: Box::new(Expression::Variable(VariableExpression { variable_id: 4 })),
                    key: "parameters".into(),
                }),
                Expression::RecordGet(RecordGetExpression {
                    record: Box::new(Expression::Variable(VariableExpression { variable_id: 5 })),
                    key: "parameters".into(),
                }),
                Expression::Number(NumberExpression { value: 0 }),
            )),
            right: Box::new(compare_field(4, 5, "return_type")),
        }),
    );
    let compare_record_payloads = compare_second_tag(
        "record",
        Some(7),
        call_type_equals_record_fields(
            &record_fields_equals_hash,
            Expression::Variable(VariableExpression { variable_id: 6 }),
            Expression::Variable(VariableExpression { variable_id: 7 }),
            Expression::Number(NumberExpression { value: 0 }),
        ),
    );
    let compare_reference_payloads = compare_second_tag(
        "reference",
        Some(9),
        Expression::Equal(EqualExpression {
            left: Box::new(Expression::RecordGet(RecordGetExpression {
                record: Box::new(Expression::Variable(VariableExpression { variable_id: 8 })),
                key: "part_hash".into(),
            })),
            right: Box::new(Expression::RecordGet(RecordGetExpression {
                record: Box::new(Expression::Variable(VariableExpression { variable_id: 9 })),
                key: "part_hash".into(),
            })),
        }),
    );
    let compare_union_payloads = compare_second_tag(
        "union",
        Some(11),
        call_type_equals_union_variants(
            &union_variants_equals_hash,
            Expression::Variable(VariableExpression { variable_id: 10 }),
            Expression::Variable(VariableExpression { variable_id: 11 }),
            Expression::Number(NumberExpression { value: 0 }),
        ),
    );

    let body = fn_expr(
        &[("t1", 0), ("t2", 1)],
        Expression::Match(MatchExpression {
            target: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
            arms: vec![
                MatchArm {
                    tag: "number".into(),
                    variable_id: None,
                    variable_name: None,
                    body: Box::new(compare_second_tag(
                        "number",
                        None,
                        Expression::Boolean(BooleanExpression { value: true }),
                    )),
                },
                MatchArm {
                    tag: "string".into(),
                    variable_id: None,
                    variable_name: None,
                    body: Box::new(compare_second_tag(
                        "string",
                        None,
                        Expression::Boolean(BooleanExpression { value: true }),
                    )),
                },
                MatchArm {
                    tag: "boolean".into(),
                    variable_id: None,
                    variable_name: None,
                    body: Box::new(compare_second_tag(
                        "boolean",
                        None,
                        Expression::Boolean(BooleanExpression { value: true }),
                    )),
                },
                MatchArm {
                    tag: "type".into(),
                    variable_id: None,
                    variable_name: None,
                    body: Box::new(compare_second_tag(
                        "type",
                        None,
                        Expression::Boolean(BooleanExpression { value: true }),
                    )),
                },
                MatchArm {
                    tag: "list".into(),
                    variable_id: Some(2),
                    variable_name: None,
                    body: Box::new(compare_list_payloads),
                },
                MatchArm {
                    tag: "function".into(),
                    variable_id: Some(4),
                    variable_name: None,
                    body: Box::new(compare_function_payloads),
                },
                MatchArm {
                    tag: "record".into(),
                    variable_id: Some(6),
                    variable_name: None,
                    body: Box::new(compare_record_payloads),
                },
                MatchArm {
                    tag: "reference".into(),
                    variable_id: Some(8),
                    variable_name: None,
                    body: Box::new(compare_reference_payloads),
                },
                MatchArm {
                    tag: "union".into(),
                    variable_id: Some(10),
                    variable_name: None,
                    body: Box::new(compare_union_payloads),
                },
            ],
            default: Some(Box::new(Expression::Boolean(BooleanExpression {
                value: false,
            }))),
        }),
    );

    ModulePartEntry {
        name: "type-equals".into(),
        part_type: Some(fn_type(
            &[
                ("t1", PartType::TypePart(type_ast_part_hash.clone())),
                ("t2", PartType::TypePart(type_ast_part_hash)),
            ],
            PartType::Boolean,
        )),
        description: Description::localized(vec![
            ("en", "Compare all type-ast forms structurally"),
            ("ja", "すべての型 AST 形式を構造的に比較"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

pub fn create_type_equals_function_parameters_part(
    core_module_id: &EventHashId,
) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_equals_hash = derive_module_part_id(core_module_id, "type-equals");
    let function_parameters_equals_hash =
        derive_module_part_id(core_module_id, "type-equals-function-parameters");

    let left_params = Expression::Variable(VariableExpression { variable_id: 0 });
    let right_params = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });
    let left_done = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(left_params.clone()),
        })),
        right: Box::new(index.clone()),
    });
    let right_done = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(right_params.clone()),
        })),
        right: Box::new(index.clone()),
    });
    let left_param = Expression::ListGet(ListGetExpression {
        list: Box::new(left_params.clone()),
        index: Box::new(index.clone()),
    });
    let right_param = Expression::ListGet(ListGetExpression {
        list: Box::new(right_params.clone()),
        index: Box::new(index.clone()),
    });
    let left_name = Expression::RecordGet(RecordGetExpression {
        record: Box::new(left_param.clone()),
        key: "name".into(),
    });
    let right_name = Expression::RecordGet(RecordGetExpression {
        record: Box::new(right_param.clone()),
        key: "name".into(),
    });
    let names_equal = Expression::Equal(EqualExpression {
        left: Box::new(left_name),
        right: Box::new(right_name),
    });
    let left_param_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(left_param),
        key: "type".into(),
    });
    let right_param_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(right_param),
        key: "type".into(),
    });
    let param_types_equal = call_type_equals(&type_equals_hash, left_param_type, right_param_type);
    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });
    let compare_rest = call_type_equals_function_parameters(
        &function_parameters_equals_hash,
        left_params.clone(),
        right_params.clone(),
        next_index,
    );
    let current_params_equal = Expression::If(IfExpression {
        condition: Box::new(names_equal),
        then_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(param_types_equal),
            then_expr: Box::new(compare_rest),
            else_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
        })),
        else_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
    });
    let body = Expression::If(IfExpression {
        condition: Box::new(left_done),
        then_expr: Box::new(right_done.clone()),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(right_done),
            then_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
            else_expr: Box::new(current_params_equal),
        })),
    });

    let param_type = PartType::Record(vec![
        RecordFieldType {
            key: "name".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "type".into(),
            value: Box::new(PartType::TypePart(type_ast_hash)),
        },
    ]);
    ModulePartEntry {
        name: "type-equals-function-parameters".into(),
        part_type: Some(fn_type(
            &[
                (
                    "left_parameters",
                    PartType::List(Box::new(param_type.clone())),
                ),
                ("right_parameters", PartType::List(Box::new(param_type))),
                ("index", PartType::Number),
            ],
            PartType::Boolean,
        )),
        description: Description::localized(vec![
            ("en", "Recursively compare ordered function type parameters"),
            ("ja", "関数型のパラメータ一覧を順序付きで再帰比較"),
        ]),
        content_hash: None,
        expression: Some(fn_expr(
            &[
                ("left_parameters", 0),
                ("right_parameters", 1),
                ("index", 2),
            ],
            body,
        )),
    }
}

pub fn create_type_equals_record_fields_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_equals_hash = derive_module_part_id(core_module_id, "type-equals");
    let record_fields_equals_hash =
        derive_module_part_id(core_module_id, "type-equals-record-fields");

    let left_fields = Expression::Variable(VariableExpression { variable_id: 0 });
    let right_fields = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });
    let left_done = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(left_fields.clone()),
        })),
        right: Box::new(index.clone()),
    });
    let right_done = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(right_fields.clone()),
        })),
        right: Box::new(index.clone()),
    });
    let left_field = Expression::ListGet(ListGetExpression {
        list: Box::new(left_fields.clone()),
        index: Box::new(index.clone()),
    });
    let right_field = Expression::ListGet(ListGetExpression {
        list: Box::new(right_fields.clone()),
        index: Box::new(index.clone()),
    });
    let left_key = Expression::RecordGet(RecordGetExpression {
        record: Box::new(left_field.clone()),
        key: "key".into(),
    });
    let right_key = Expression::RecordGet(RecordGetExpression {
        record: Box::new(right_field.clone()),
        key: "key".into(),
    });
    let keys_equal = Expression::Equal(EqualExpression {
        left: Box::new(left_key),
        right: Box::new(right_key),
    });
    let left_field_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(left_field),
        key: "field_type".into(),
    });
    let right_field_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(right_field),
        key: "field_type".into(),
    });
    let field_types_equal = call_type_equals(&type_equals_hash, left_field_type, right_field_type);
    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });
    let compare_rest = call_type_equals_record_fields(
        &record_fields_equals_hash,
        left_fields.clone(),
        right_fields.clone(),
        next_index,
    );
    let current_fields_equal = Expression::If(IfExpression {
        condition: Box::new(keys_equal),
        then_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(field_types_equal),
            then_expr: Box::new(compare_rest),
            else_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
        })),
        else_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
    });
    let body = Expression::If(IfExpression {
        condition: Box::new(left_done),
        then_expr: Box::new(right_done.clone()),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(right_done),
            then_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
            else_expr: Box::new(current_fields_equal),
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
        name: "type-equals-record-fields".into(),
        part_type: Some(fn_type(
            &[
                ("left_fields", PartType::List(Box::new(field_type.clone()))),
                ("right_fields", PartType::List(Box::new(field_type))),
                ("index", PartType::Number),
            ],
            PartType::Boolean,
        )),
        description: Description::localized(vec![
            ("en", "Recursively compare ordered record type fields"),
            ("ja", "レコード型のフィールド一覧を順序付きで再帰比較"),
        ]),
        content_hash: None,
        expression: Some(fn_expr(
            &[("left_fields", 0), ("right_fields", 1), ("index", 2)],
            body,
        )),
    }
}

pub fn create_type_equals_union_variants_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_equals_hash = derive_module_part_id(core_module_id, "type-equals");
    let union_variants_equals_hash =
        derive_module_part_id(core_module_id, "type-equals-union-variants");

    let left_variants = Expression::Variable(VariableExpression { variable_id: 0 });
    let right_variants = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });
    let left_done = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(left_variants.clone()),
        })),
        right: Box::new(index.clone()),
    });
    let right_done = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(right_variants.clone()),
        })),
        right: Box::new(index.clone()),
    });
    let left_variant = Expression::ListGet(ListGetExpression {
        list: Box::new(left_variants.clone()),
        index: Box::new(index.clone()),
    });
    let right_variant = Expression::ListGet(ListGetExpression {
        list: Box::new(right_variants.clone()),
        index: Box::new(index.clone()),
    });
    let get_field = |record: Expression, key: &'static str| {
        Expression::RecordGet(RecordGetExpression {
            record: Box::new(record),
            key: key.into(),
        })
    };
    let tags_equal = Expression::Equal(EqualExpression {
        left: Box::new(get_field(left_variant.clone(), "tag")),
        right: Box::new(get_field(right_variant.clone(), "tag")),
    });
    let left_payload = get_field(left_variant, "payload_type");
    let right_payload = get_field(right_variant, "payload_type");
    let payloads_equal = Expression::Match(MatchExpression {
        target: Box::new(left_payload),
        arms: vec![
            MatchArm {
                tag: "none".into(),
                variable_id: None,
                variable_name: None,
                body: Box::new(Expression::Match(MatchExpression {
                    target: Box::new(right_payload.clone()),
                    arms: vec![MatchArm {
                        tag: "none".into(),
                        variable_id: None,
                        variable_name: None,
                        body: Box::new(Expression::Boolean(BooleanExpression { value: true })),
                    }],
                    default: Some(Box::new(Expression::Boolean(BooleanExpression {
                        value: false,
                    }))),
                })),
            },
            MatchArm {
                tag: "some".into(),
                variable_id: Some(3),
                variable_name: None,
                body: Box::new(Expression::Match(MatchExpression {
                    target: Box::new(right_payload),
                    arms: vec![MatchArm {
                        tag: "some".into(),
                        variable_id: Some(4),
                        variable_name: None,
                        body: Box::new(call_type_equals(
                            &type_equals_hash,
                            Expression::Variable(VariableExpression { variable_id: 3 }),
                            Expression::Variable(VariableExpression { variable_id: 4 }),
                        )),
                    }],
                    default: Some(Box::new(Expression::Boolean(BooleanExpression {
                        value: false,
                    }))),
                })),
            },
        ],
        default: Some(Box::new(Expression::Boolean(BooleanExpression {
            value: false,
        }))),
    });
    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });
    let compare_rest = call_type_equals_union_variants(
        &union_variants_equals_hash,
        left_variants.clone(),
        right_variants.clone(),
        next_index,
    );
    let current_variants_equal = Expression::If(IfExpression {
        condition: Box::new(tags_equal),
        then_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(payloads_equal),
            then_expr: Box::new(compare_rest),
            else_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
        })),
        else_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
    });
    let body = Expression::If(IfExpression {
        condition: Box::new(left_done),
        then_expr: Box::new(right_done.clone()),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(right_done),
            then_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
            else_expr: Box::new(current_variants_equal),
        })),
    });

    let optional_type = PartType::Union(vec![
        definy_event::event::UnionVariantType {
            tag: "none".into(),
            payload: None,
        },
        definy_event::event::UnionVariantType {
            tag: "some".into(),
            payload: Some(Box::new(PartType::TypePart(type_ast_hash.clone()))),
        },
    ]);
    let variant_type = PartType::Record(vec![
        RecordFieldType {
            key: "tag".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "payload_type".into(),
            value: Box::new(optional_type),
        },
    ]);
    ModulePartEntry {
        name: "type-equals-union-variants".into(),
        part_type: Some(fn_type(
            &[
                (
                    "left_variants",
                    PartType::List(Box::new(variant_type.clone())),
                ),
                ("right_variants", PartType::List(Box::new(variant_type))),
                ("index", PartType::Number),
            ],
            PartType::Boolean,
        )),
        description: Description::localized(vec![
            ("en", "Recursively compare ordered union type variants"),
            ("ja", "union 型の variant 一覧を順序付きで再帰比較"),
        ]),
        content_hash: None,
        expression: Some(fn_expr(
            &[("left_variants", 0), ("right_variants", 1), ("index", 2)],
            body,
        )),
    }
}

fn call_type_equals(
    type_equals_hash: &EventHashId,
    left: Expression,
    right: Expression,
) -> Expression {
    call_part(type_equals_hash, &[("t1", left), ("t2", right)])
}

fn call_type_equals_function_parameters(
    helper_hash: &EventHashId,
    left: Expression,
    right: Expression,
    index: Expression,
) -> Expression {
    call_part(
        helper_hash,
        &[
            ("left_parameters", left),
            ("right_parameters", right),
            ("index", index),
        ],
    )
}

fn call_type_equals_record_fields(
    helper_hash: &EventHashId,
    left: Expression,
    right: Expression,
    index: Expression,
) -> Expression {
    call_part(
        helper_hash,
        &[
            ("left_fields", left),
            ("right_fields", right),
            ("index", index),
        ],
    )
}

fn call_type_equals_union_variants(
    helper_hash: &EventHashId,
    left: Expression,
    right: Expression,
    index: Expression,
) -> Expression {
    call_part(
        helper_hash,
        &[
            ("left_variants", left),
            ("right_variants", right),
            ("index", index),
        ],
    )
}
