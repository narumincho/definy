use crate::ast_builder::{call_part, fn_expr, fn_type};
use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, Description, Expression, IfExpression, LessThanOrEqualExpression,
    ListGetExpression, ListLengthExpression, ListLiteralExpression, MatchArm, MatchExpression,
    ModulePartEntry, NumberExpression, PartType, RecordFieldType, RecordGetExpression,
    TypeLiteralExpression, TypeLiteralItemExpression, VariableExpression, VariantExpression,
    derive_module_part_id,
};

/// パターンマッチアーム一覧の各アームを検査し戻り値型の統一性を検証するパーツ
/// `core.type-check-match-arms-inner`: `(arms: List Arm, variants: List Variant, env: type-env, index: Number, first_arm_type: optional-type-ast) -> type-result`
pub fn create_type_check_match_arms_inner_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_env_hash = derive_module_part_id(core_module_id, "type-env");
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let expr_hash = derive_module_part_id(core_module_id, "expression");
    let type_check_hash = derive_module_part_id(core_module_id, "type-check");
    let type_assignable_hash = derive_module_part_id(core_module_id, "type-assignable");
    let env_extend_hash = derive_module_part_id(core_module_id, "type-env-extend");
    let variant_lookup_hash = derive_module_part_id(core_module_id, "union-variant-type-lookup");
    let exhaust_hash = derive_module_part_id(core_module_id, "check-union-exhaustiveness");
    let inner_hash = derive_module_part_id(core_module_id, "type-check-match-arms-inner");

    let arms = Expression::Variable(VariableExpression { variable_id: 0 });
    let variants = Expression::Variable(VariableExpression { variable_id: 1 });
    let env = Expression::Variable(VariableExpression { variable_id: 2 });
    let index = Expression::Variable(VariableExpression { variable_id: 3 });
    let first_arm_type = Expression::Variable(VariableExpression { variable_id: 4 });

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
    let arm_tag = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_arm.clone()),
        key: "tag".into(),
    });
    let arm_var_id = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_arm.clone()),
        key: "variable_id".into(),
    });
    let arm_body = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_arm),
        key: "body".into(),
    });

    // lookup = union-variant-type-lookup(variants, arm_tag, 0)
    let lookup_call = call_part(
        &variant_lookup_hash,
        &[
            ("variants", variants.clone()),
            ("tag", arm_tag),
            ("index", Expression::Number(NumberExpression { value: 0 })),
        ],
    );

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    // recurse(arms, variants, env, next_index, new_first_arm_type)
    let call_recurse = |new_first: Expression| {
        call_part(
            &inner_hash,
            &[
                ("arms", arms.clone()),
                ("variants", variants.clone()),
                ("env", env.clone()),
                ("index", next_index.clone()),
                ("first_arm_type", new_first),
            ],
        )
    };

    let opt_some = |t: Expression| {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "some".into(),
            payload: Some(Box::new(t)),
        })
    };

    // extended_env = env-extend(env, arm_var_id, payload_type)
    let extended_env = call_part(
        &env_extend_hash,
        &[
            ("env", env.clone()),
            ("var_id", arm_var_id),
            (
                "var_type",
                Expression::Variable(VariableExpression { variable_id: 11 }),
            ),
        ],
    );

    // body_check = type-check(arm_body, extended_env)
    let check_body = call_part(
        &type_check_hash,
        &[("expr", arm_body), ("env", extended_env)],
    );

    // first_arm_type との一致検査
    let prev_t_var = 13;
    let body_t_var = 12;

    let is_assignable = call_part(
        &type_assignable_hash,
        &[
            (
                "actual_type",
                Expression::Variable(VariableExpression {
                    variable_id: body_t_var,
                }),
            ),
            (
                "expected_type",
                Expression::Variable(VariableExpression {
                    variable_id: prev_t_var,
                }),
            ),
        ],
    );

    let err_type_mismatch = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "error".into(),
        payload: Some(Box::new(Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "type_mismatch".into(),
            payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "expected".into(),
                        value: Box::new(Expression::Variable(VariableExpression {
                            variable_id: prev_t_var,
                        })),
                    },
                    TypeLiteralItemExpression {
                        key: "actual".into(),
                        value: Box::new(Expression::Variable(VariableExpression {
                            variable_id: body_t_var,
                        })),
                    },
                ],
            }))),
        }))),
    });

    let check_prev_match = Expression::Match(MatchExpression {
        target: Box::new(first_arm_type.clone()),
        arms: vec![
            MatchArm {
                tag: "none".into(),
                variable_id: None,
                variable_name: None,
                body: Box::new(call_recurse(opt_some(Expression::Variable(
                    VariableExpression {
                        variable_id: body_t_var,
                    },
                )))),
            },
            MatchArm {
                tag: "some".into(),
                variable_id: Some(prev_t_var),
                variable_name: Some("prev_t".into()),
                body: Box::new(Expression::If(IfExpression {
                    condition: Box::new(is_assignable),
                    then_expr: Box::new(call_recurse(opt_some(Expression::Variable(
                        VariableExpression {
                            variable_id: prev_t_var,
                        },
                    )))),
                    else_expr: Box::new(err_type_mismatch),
                })),
            },
        ],
        default: None,
    });

    let body_check_match = Expression::Match(MatchExpression {
        target: Box::new(check_body),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(body_t_var),
                variable_name: Some("body_t".into()),
                body: Box::new(check_prev_match),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(14),
                variable_name: Some("err".into()),
                body: Box::new(Expression::Variant(VariantExpression {
                    type_part_definition_event_hash: None,
                    tag: "error".into(),
                    payload: Some(Box::new(Expression::Variable(VariableExpression {
                        variable_id: 14,
                    }))),
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
                variable_id: Some(11),
                variable_name: Some("payload_t".into()),
                body: Box::new(body_check_match),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(15),
                variable_name: Some("err".into()),
                body: Box::new(Expression::Variant(VariantExpression {
                    type_part_definition_event_hash: None,
                    tag: "error".into(),
                    payload: Some(Box::new(Expression::Variable(VariableExpression {
                        variable_id: 15,
                    }))),
                })),
            },
        ],
        default: None,
    });

    // at_end の時の処理: 全アーム走査完了 -> check-union-exhaustiveness を呼び出す
    let call_exhaustiveness = call_part(
        &exhaust_hash,
        &[
            ("variants", variants),
            ("arms", arms),
            ("index", Expression::Number(NumberExpression { value: 0 })),
            (
                "return_type",
                Expression::Variable(VariableExpression { variable_id: 16 }),
            ),
        ],
    );

    let err_empty_arms = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "error".into(),
        payload: Some(Box::new(Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "unknown_error".into(),
            payload: None,
        }))),
    });

    let end_first_arm_match = Expression::Match(MatchExpression {
        target: Box::new(first_arm_type),
        arms: vec![
            MatchArm {
                tag: "none".into(),
                variable_id: None,
                variable_name: None,
                body: Box::new(err_empty_arms),
            },
            MatchArm {
                tag: "some".into(),
                variable_id: Some(16),
                variable_name: Some("final_t".into()),
                body: Box::new(call_exhaustiveness),
            },
        ],
        default: None,
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(end_first_arm_match),
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

    let optional_type_ast = PartType::Union(vec![
        definy_event::event::UnionVariantType {
            tag: "none".into(),
            payload: None,
        },
        definy_event::event::UnionVariantType {
            tag: "some".into(),
            payload: Some(Box::new(PartType::TypePart(type_ast_hash))),
        },
    ]);

    ModulePartEntry {
        name: "type-check-match-arms-inner".into(),
        part_type: Some(fn_type(
            &[
                ("arms", PartType::List(Box::new(arm_type))),
                ("variants", PartType::List(Box::new(variant_type))),
                ("env", PartType::TypePart(type_env_hash)),
                ("index", PartType::Number),
                ("first_arm_type", optional_type_ast),
            ],
            PartType::TypePart(type_result_hash),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Internal recursion verifying match arms and unifying return types",
            ),
            (
                "ja",
                "パターンマッチアームの順次検証と戻り値型の整合性確認内部関数",
            ),
        ]),
        content_hash: None,
        expression: Some(fn_expr(
            &[
                ("arms", 0),
                ("variants", 1),
                ("env", 2),
                ("index", 3),
                ("first_arm_type", 4),
            ],
            body,
        )),
    }
}

/// パターンマッチアーム一覧の型検査エントリーポイント
/// `core.type-check-match-arms`: `(arms: List Arm, variants: List Variant, env: type-env) -> type-result`
pub fn create_type_check_match_arms_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_env_hash = derive_module_part_id(core_module_id, "type-env");
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let expr_hash = derive_module_part_id(core_module_id, "expression");
    let inner_hash = derive_module_part_id(core_module_id, "type-check-match-arms-inner");

    let arms = Expression::Variable(VariableExpression { variable_id: 0 });
    let variants = Expression::Variable(VariableExpression { variable_id: 1 });
    let env = Expression::Variable(VariableExpression { variable_id: 2 });

    let opt_none = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "none".into(),
        payload: None,
    });

    let call_inner = call_part(
        &inner_hash,
        &[
            ("arms", arms),
            ("variants", variants),
            ("env", env),
            ("index", Expression::Number(NumberExpression { value: 0 })),
            ("first_arm_type", opt_none),
        ],
    );

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
        name: "type-check-match-arms".into(),
        part_type: Some(fn_type(
            &[
                ("arms", PartType::List(Box::new(arm_type))),
                ("variants", PartType::List(Box::new(variant_type))),
                ("env", PartType::TypePart(type_env_hash)),
            ],
            PartType::TypePart(type_result_hash),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Verify pattern match arms and deduce unified branch return type",
            ),
            (
                "ja",
                "パターンマッチアームの型検査を行い統一された分岐戻り値型を導出",
            ),
        ]),
        content_hash: None,
        expression: Some(fn_expr(
            &[("arms", 0), ("variants", 1), ("env", 2)],
            call_inner,
        )),
    }
}

/// `check.rs` 用に `variant` と `match` の型検査マッチアームを構築するヘルパー
pub fn create_union_check_arms(
    type_check_hash: &EventHashId,
    type_check_match_arms_hash: &EventHashId,
) -> Vec<MatchArm> {
    let mut arms = Vec::with_capacity(2);

    // 1. Variant 式の型検査: variant({ tag, payload })
    {
        let var_id = 70;
        let variant_record = Expression::Variable(VariableExpression {
            variable_id: var_id,
        });
        let tag_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(variant_record.clone()),
            key: "tag".into(),
        });
        let payload_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(variant_record),
            key: "payload".into(),
        });

        let make_union_type = |payload_variant: Expression| {
            let variant_item = Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "tag".into(),
                        value: Box::new(tag_expr.clone()),
                    },
                    TypeLiteralItemExpression {
                        key: "payload_type".into(),
                        value: Box::new(payload_variant),
                    },
                ],
            });
            let variants_list = Expression::ListLiteral(ListLiteralExpression {
                items: vec![variant_item],
            });
            let union_type = Expression::Variant(VariantExpression {
                type_part_definition_event_hash: None,
                tag: "union".into(),
                payload: Some(Box::new(variants_list)),
            });
            Expression::Variant(VariantExpression {
                type_part_definition_event_hash: None,
                tag: "ok".into(),
                payload: Some(Box::new(union_type)),
            })
        };

        let payload_none_type = Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "none".into(),
            payload: None,
        });

        let ok_for_none = make_union_type(payload_none_type);

        let check_payload = call_part(
            type_check_hash,
            &[
                (
                    "expr",
                    Expression::Variable(VariableExpression { variable_id: 72 }),
                ),
                (
                    "env",
                    Expression::Variable(VariableExpression { variable_id: 1 }),
                ),
            ],
        );

        let payload_some_match = Expression::Match(MatchExpression {
            target: Box::new(check_payload),
            arms: vec![
                MatchArm {
                    tag: "ok".into(),
                    variable_id: Some(73),
                    variable_name: Some("p_type".into()),
                    body: Box::new(make_union_type(Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: None,
                        tag: "some".into(),
                        payload: Some(Box::new(Expression::Variable(VariableExpression {
                            variable_id: 73,
                        }))),
                    }))),
                },
                MatchArm {
                    tag: "error".into(),
                    variable_id: Some(74),
                    variable_name: Some("err".into()),
                    body: Box::new(Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: None,
                        tag: "error".into(),
                        payload: Some(Box::new(Expression::Variable(VariableExpression {
                            variable_id: 74,
                        }))),
                    })),
                },
            ],
            default: None,
        });

        let payload_match = Expression::Match(MatchExpression {
            target: Box::new(payload_expr),
            arms: vec![
                MatchArm {
                    tag: "none".into(),
                    variable_id: None,
                    variable_name: None,
                    body: Box::new(ok_for_none),
                },
                MatchArm {
                    tag: "some".into(),
                    variable_id: Some(72),
                    variable_name: Some("sub_expr".into()),
                    body: Box::new(payload_some_match),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "variant".into(),
            variable_id: Some(var_id),
            variable_name: Some("var_e".into()),
            body: Box::new(payload_match),
        });
    }

    // 2. Match 式の型検査: match({ target, arms })
    {
        let match_var_id = 75;
        let match_record = Expression::Variable(VariableExpression {
            variable_id: match_var_id,
        });
        let target_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(match_record.clone()),
            key: "target".into(),
        });
        let arms_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(match_record),
            key: "arms".into(),
        });

        let check_target = call_part(
            type_check_hash,
            &[
                ("expr", target_expr),
                (
                    "env",
                    Expression::Variable(VariableExpression { variable_id: 1 }),
                ),
            ],
        );

        let check_match_arms_call = call_part(
            type_check_match_arms_hash,
            &[
                ("arms", arms_expr),
                (
                    "variants",
                    Expression::Variable(VariableExpression { variable_id: 77 }),
                ),
                (
                    "env",
                    Expression::Variable(VariableExpression { variable_id: 1 }),
                ),
            ],
        );

        let err_not_a_union = Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "error".into(),
            payload: Some(Box::new(Expression::Variant(VariantExpression {
                type_part_definition_event_hash: None,
                tag: "not_a_union".into(),
                payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                    items: vec![TypeLiteralItemExpression {
                        key: "actual".into(),
                        value: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 76,
                        })),
                    }],
                }))),
            }))),
        });

        let target_type_match = Expression::Match(MatchExpression {
            target: Box::new(Expression::Variable(VariableExpression { variable_id: 76 })),
            arms: vec![MatchArm {
                tag: "union".into(),
                variable_id: Some(77),
                variable_name: Some("variants".into()),
                body: Box::new(check_match_arms_call),
            }],
            default: Some(Box::new(err_not_a_union)),
        });

        let check_target_match = Expression::Match(MatchExpression {
            target: Box::new(check_target),
            arms: vec![
                MatchArm {
                    tag: "ok".into(),
                    variable_id: Some(76),
                    variable_name: Some("t_type".into()),
                    body: Box::new(target_type_match),
                },
                MatchArm {
                    tag: "error".into(),
                    variable_id: Some(78),
                    variable_name: Some("err".into()),
                    body: Box::new(Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: None,
                        tag: "error".into(),
                        payload: Some(Box::new(Expression::Variable(VariableExpression {
                            variable_id: 78,
                        }))),
                    })),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "match".into(),
            variable_id: Some(match_var_id),
            variable_name: Some("match_e".into()),
            body: Box::new(check_target_match),
        });
    }

    arms
}
