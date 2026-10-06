use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, CallExpression, Description, EqualExpression, Expression, FunctionExpression,
    IfExpression, LessThanOrEqualExpression, ListGetExpression, ListLengthExpression,
    ListLiteralExpression, MatchArm, MatchExpression, ModulePartEntry, NumberExpression,
    PartReferenceExpression, PartType, RecordFieldType, RecordGetExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, VariableExpression, VariantExpression, derive_module_part_id,
};

/// 直和型のバリアント一覧からタグ名でペイロード型を再帰探索するパーツ
/// `core.union-variant-type-lookup`: `list<{ tag: string, payload_type: none | some(type-ast) }> -> string -> number -> type-result`
pub fn create_union_variant_type_lookup_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let lookup_hash = derive_module_part_id(core_module_id, "union-variant-type-lookup");

    let variants = Expression::Variable(VariableExpression { variable_id: 0 });
    let tag = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });

    let at_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(variants.clone()),
        })),
        right: Box::new(index.clone()),
    });

    let current_variant = Expression::ListGet(ListGetExpression {
        list: Box::new(variants.clone()),
        index: Box::new(index.clone()),
    });
    let current_tag = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_variant.clone()),
        key: "tag".into(),
    });
    let current_payload_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_variant),
        key: "payload_type".into(),
    });

    let tag_matches = Expression::Equal(EqualExpression {
        left: Box::new(current_tag),
        right: Box::new(tag.clone()),
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
                argument: Box::new(variants),
            })),
            argument: Box::new(tag.clone()),
        })),
        argument: Box::new(next_index),
    });

    let err_variant_not_found = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "error".into(),
        payload: Some(Box::new(Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "variant_not_found".into(),
            payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![TypeLiteralItemExpression {
                    key: "tag".into(),
                    value: Box::new(tag),
                }],
            }))),
        }))),
    });

    // payload_type が none の場合は空レコード型 record([]) を ok で返す
    let empty_record_type = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "record".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![],
        }))),
    });

    let ok_empty_payload = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "ok".into(),
        payload: Some(Box::new(empty_record_type)),
    });

    let ok_some_payload = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "ok".into(),
        payload: Some(Box::new(Expression::Variable(VariableExpression {
            variable_id: 10,
        }))),
    });

    let payload_match = Expression::Match(MatchExpression {
        target: Box::new(current_payload_type),
        arms: vec![
            MatchArm {
                tag: "none".into(),
                variable_id: None,
                variable_name: None,
                body: Box::new(ok_empty_payload),
            },
            MatchArm {
                tag: "some".into(),
                variable_id: Some(10),
                variable_name: Some("t".into()),
                body: Box::new(ok_some_payload),
            },
        ],
        default: None,
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(err_variant_not_found),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(tag_matches),
            then_expr: Box::new(payload_match),
            else_expr: Box::new(recurse),
        })),
    });

    let variant_type = PartType::Record(vec![
        RecordFieldType {
            key: "tag".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "payload_type".into(),
            value: Box::new(PartType::Union(vec![
                definy_event::event::UnionVariantType {
                    tag: "none".into(),
                    payload: None,
                },
                definy_event::event::UnionVariantType {
                    tag: "some".into(),
                    payload: Some(Box::new(PartType::TypePart(type_ast_hash))),
                },
            ])),
        },
    ]);

    ModulePartEntry {
        name: "union-variant-type-lookup".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::List(Box::new(variant_type))),
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
                "Lookup payload type by variant tag in union type variants",
            ),
            ("ja", "直和型のバリアント一覧からタグ名でペイロード型を探索"),
        ]),
        content_hash: None,
        expression: Some(Expression::Function(FunctionExpression {
            parameter_id: 0,
            parameter_name: "variants".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "tag".into(),
                body: Box::new(Expression::Function(FunctionExpression {
                    parameter_id: 2,
                    parameter_name: "index".into(),
                    body: Box::new(body),
                })),
            })),
        })),
    }
}

/// パターンマッチアーム一覧に対象タグが含まれるかを線形探索するパーツ
/// `core.find-tag-in-arms`: `list<{ tag: string, variable_id: number, body: expression }> -> string -> number -> boolean`
pub fn create_find_tag_in_arms_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_hash = derive_module_part_id(core_module_id, "expression");
    let find_hash = derive_module_part_id(core_module_id, "find-tag-in-arms");

    let arms = Expression::Variable(VariableExpression { variable_id: 0 });
    let target_tag = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });

    let at_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(arms.clone()),
        })),
        right: Box::new(index.clone()),
    });

    let current_arm = Expression::ListGet(ListGetExpression {
        list: Box::new(arms.clone()),
        index: Box::new(index.clone()),
    });
    let current_tag = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_arm),
        key: "tag".into(),
    });

    let matches = Expression::Equal(EqualExpression {
        left: Box::new(current_tag),
        right: Box::new(target_tag.clone()),
    });

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let recurse = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    find_hash,
                ))),
                argument: Box::new(arms),
            })),
            argument: Box::new(target_tag),
        })),
        argument: Box::new(next_index),
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(Expression::Boolean(
            definy_event::event::BooleanExpression { value: false },
        )),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(matches),
            then_expr: Box::new(Expression::Boolean(
                definy_event::event::BooleanExpression { value: true },
            )),
            else_expr: Box::new(recurse),
        })),
    });

    let arm_type = PartType::Record(vec![
        RecordFieldType {
            key: "tag".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "variable_id".into(),
            value: Box::new(PartType::Number),
        },
        RecordFieldType {
            key: "body".into(),
            value: Box::new(PartType::TypePart(expr_hash)),
        },
    ]);

    ModulePartEntry {
        name: "find-tag-in-arms".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::List(Box::new(arm_type))),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::String),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::Boolean),
                }),
            }),
        }),
        description: Description::localized(vec![
            ("en", "Check if tag is present in match arm list"),
            ("ja", "パターンマッチアーム一覧に対象タグが存在するか検査"),
        ]),
        content_hash: None,
        expression: Some(Expression::Function(FunctionExpression {
            parameter_id: 0,
            parameter_name: "arms".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "target_tag".into(),
                body: Box::new(Expression::Function(FunctionExpression {
                    parameter_id: 2,
                    parameter_name: "index".into(),
                    body: Box::new(body),
                })),
            })),
        })),
    }
}

/// 直和型の全バリアントが match アームで網羅されているか検査するパーツ
/// `core.check-union-exhaustiveness`: `variants -> arms -> number -> type-ast -> type-result`
pub fn create_check_union_exhaustiveness_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let expr_hash = derive_module_part_id(core_module_id, "expression");
    let find_hash = derive_module_part_id(core_module_id, "find-tag-in-arms");
    let exhaust_hash = derive_module_part_id(core_module_id, "check-union-exhaustiveness");

    let variants = Expression::Variable(VariableExpression { variable_id: 0 });
    let arms = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });
    let return_type = Expression::Variable(VariableExpression { variable_id: 3 });

    let at_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(variants.clone()),
        })),
        right: Box::new(index.clone()),
    });

    let current_variant = Expression::ListGet(ListGetExpression {
        list: Box::new(variants.clone()),
        index: Box::new(index.clone()),
    });
    let current_tag = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_variant),
        key: "tag".into(),
    });

    let is_present = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    find_hash,
                ))),
                argument: Box::new(arms.clone()),
            })),
            argument: Box::new(current_tag.clone()),
        })),
        argument: Box::new(Expression::Number(NumberExpression { value: 0 })),
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
                        exhaust_hash,
                    ))),
                    argument: Box::new(variants),
                })),
                argument: Box::new(arms),
            })),
            argument: Box::new(next_index),
        })),
        argument: Box::new(return_type.clone()),
    });

    let ok_result = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "ok".into(),
        payload: Some(Box::new(return_type)),
    });

    let err_non_exhaustive = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "error".into(),
        payload: Some(Box::new(Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "non_exhaustive_match".into(),
            payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![TypeLiteralItemExpression {
                    key: "missing_tag".into(),
                    value: Box::new(current_tag),
                }],
            }))),
        }))),
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(ok_result),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(is_present),
            then_expr: Box::new(recurse),
            else_expr: Box::new(err_non_exhaustive),
        })),
    });

    let variant_type = PartType::Record(vec![
        RecordFieldType {
            key: "tag".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "payload_type".into(),
            value: Box::new(PartType::Union(vec![
                definy_event::event::UnionVariantType {
                    tag: "none".into(),
                    payload: None,
                },
                definy_event::event::UnionVariantType {
                    tag: "some".into(),
                    payload: Some(Box::new(PartType::TypePart(type_ast_hash.clone()))),
                },
            ])),
        },
    ]);

    let arm_type = PartType::Record(vec![
        RecordFieldType {
            key: "tag".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "variable_id".into(),
            value: Box::new(PartType::Number),
        },
        RecordFieldType {
            key: "body".into(),
            value: Box::new(PartType::TypePart(expr_hash)),
        },
    ]);

    ModulePartEntry {
        name: "check-union-exhaustiveness".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::List(Box::new(variant_type))),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::List(Box::new(arm_type))),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::Function {
                        parameter: Box::new(PartType::TypePart(type_ast_hash)),
                        return_type: Box::new(PartType::TypePart(type_result_hash)),
                    }),
                }),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Verify that all variants in a union are covered by pattern match arms",
            ),
            (
                "ja",
                "直和型のすべてのバリアントがマッチアームで網羅されているか検査",
            ),
        ]),
        content_hash: None,
        expression: Some(Expression::Function(FunctionExpression {
            parameter_id: 0,
            parameter_name: "variants".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "arms".into(),
                body: Box::new(Expression::Function(FunctionExpression {
                    parameter_id: 2,
                    parameter_name: "index".into(),
                    body: Box::new(Expression::Function(FunctionExpression {
                        parameter_id: 3,
                        parameter_name: "return_type".into(),
                        body: Box::new(body),
                    })),
                })),
            })),
        })),
    }
}

/// 実際のバリアント群が期待される直和型に含まれ、ペイロード型が適合しているかを再帰判定するパーツ
/// `core.type-assignable-union-variants`: `actual_variants -> expected_variants -> index -> boolean`
pub fn create_type_assignable_union_variants_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_assignable_hash = derive_module_part_id(core_module_id, "type-assignable");
    let lookup_hash = derive_module_part_id(core_module_id, "union-variant-type-lookup");
    let assignable_variants_hash =
        derive_module_part_id(core_module_id, "type-assignable-union-variants");

    let actual_variants = Expression::Variable(VariableExpression { variable_id: 0 });
    let expected_variants = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });

    let at_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(actual_variants.clone()),
        })),
        right: Box::new(index.clone()),
    });

    let current_v = Expression::ListGet(ListGetExpression {
        list: Box::new(actual_variants.clone()),
        index: Box::new(index.clone()),
    });
    let current_tag = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_v.clone()),
        key: "tag".into(),
    });
    let current_payload_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_v),
        key: "payload_type".into(),
    });

    let lookup_call = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    lookup_hash,
                ))),
                argument: Box::new(expected_variants.clone()),
            })),
            argument: Box::new(current_tag),
        })),
        argument: Box::new(Expression::Number(NumberExpression { value: 0 })),
    });

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let recurse = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    assignable_variants_hash,
                ))),
                argument: Box::new(actual_variants),
            })),
            argument: Box::new(expected_variants),
        })),
        argument: Box::new(next_index),
    });

    let check_payload_assignable = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                type_assignable_hash,
            ))),
            argument: Box::new(Expression::Variable(VariableExpression { variable_id: 11 })),
        })),
        argument: Box::new(Expression::Variable(VariableExpression { variable_id: 10 })),
    });

    let payload_match = Expression::Match(MatchExpression {
        target: Box::new(current_payload_type),
        arms: vec![
            MatchArm {
                tag: "none".into(),
                variable_id: None,
                variable_name: None,
                body: Box::new(recurse.clone()),
            },
            MatchArm {
                tag: "some".into(),
                variable_id: Some(11),
                variable_name: Some("act_p".into()),
                body: Box::new(Expression::If(IfExpression {
                    condition: Box::new(check_payload_assignable),
                    then_expr: Box::new(recurse),
                    else_expr: Box::new(Expression::Boolean(
                        definy_event::event::BooleanExpression { value: false },
                    )),
                })),
            },
        ],
        default: None,
    });

    let lookup_match = Expression::Match(MatchExpression {
        target: Box::new(lookup_call),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(10),
                variable_name: Some("exp_payload_t".into()),
                body: Box::new(payload_match),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: None,
                variable_name: None,
                body: Box::new(Expression::Boolean(
                    definy_event::event::BooleanExpression { value: false },
                )),
            },
        ],
        default: None,
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(Expression::Boolean(
            definy_event::event::BooleanExpression { value: true },
        )),
        else_expr: Box::new(lookup_match),
    });

    let variant_type = PartType::Record(vec![
        RecordFieldType {
            key: "tag".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "payload_type".into(),
            value: Box::new(PartType::Union(vec![
                definy_event::event::UnionVariantType {
                    tag: "none".into(),
                    payload: None,
                },
                definy_event::event::UnionVariantType {
                    tag: "some".into(),
                    payload: Some(Box::new(PartType::TypePart(type_ast_hash))),
                },
            ])),
        },
    ]);

    ModulePartEntry {
        name: "type-assignable-union-variants".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::List(Box::new(variant_type.clone()))),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::List(Box::new(variant_type))),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::Boolean),
                }),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Verify that actual union variants are assignable to expected union variants",
            ),
            (
                "ja",
                "実際の直和型バリアントが期待される直和型バリアントに代入可能か再帰判定",
            ),
        ]),
        content_hash: None,
        expression: Some(Expression::Function(FunctionExpression {
            parameter_id: 0,
            parameter_name: "actual_variants".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "expected_variants".into(),
                body: Box::new(Expression::Function(FunctionExpression {
                    parameter_id: 2,
                    parameter_name: "index".into(),
                    body: Box::new(body),
                })),
            })),
        })),
    }
}
