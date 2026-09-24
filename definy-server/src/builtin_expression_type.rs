use definy_event::EventHashId;
use definy_event::event::{
    AccountId, AddExpression, CallExpression, Description, DivideExpression, Event, EventContent,
    Expression, FunctionExpression, MatchArm, MatchExpression, MultiplyExpression,
    NumberExpression, PartDefinitionEvent, PartReferenceExpression, PartType, PartUpdateEvent,
    RecordGetExpression, RemainderExpression, SubtractExpression, TypeListExpression,
    TypeLiteralExpression, TypeLiteralItemExpression, TypeUnionExpression, TypeUnionVariant,
    VariableExpression, VariantExpression,
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

pub fn create_eval_ast_part_events(
    account_id: &AccountId,
    first_commit_time: chrono::DateTime<chrono::Utc>,
    core_module_hash: &EventHashId,
    expr_type_part_hash: &EventHashId,
    signing_key: &ed25519_dalek::SigningKey,
) -> Result<(Event, Event), anyhow::Error> {
    let eval_ast_def_event = Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(39),
        content: EventContent::PartDefinition(PartDefinitionEvent {
            part_name: "eval-ast".into(),
            part_type: Some(PartType::Function {
                parameter: Box::new(PartType::TypePart(expr_type_part_hash.clone())),
                return_type: Box::new(PartType::Number),
            }),
            description: Description::localized(vec![
                (
                    "en",
                    "Evaluates a Definy AST expression to a number (self-hosting evaluator)",
                ),
                (
                    "ja",
                    "Definy の AST 式を評価して数値を計算する関数 (セルフホスティング評価器)",
                ),
            ]),
            expression: None,
            module_definition_event_hash: core_module_hash.clone(),
        }),
    };
    let eval_ast_def_binary =
        definy_event::sign_and_serialize(eval_ast_def_event.clone(), signing_key).map_err(|e| {
            anyhow::anyhow!(
                "Failed to serialize eval-ast part definition event: {:?}",
                e
            )
        })?;
    let eval_ast_def_hash = EventHashId::from_bytes(&eval_ast_def_binary);

    fn recursive_call(eval_ast_hash: &EventHashId, var_id: i64, key: &str) -> Expression {
        Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression {
                part_definition_event_hash: eval_ast_hash.clone(),
            })),
            argument: Box::new(Expression::RecordGet(RecordGetExpression {
                record: Box::new(Expression::Variable(VariableExpression {
                    variable_id: var_id,
                })),
                key: key.into(),
            })),
        })
    }

    let eval_ast_update_event = Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(40),
        content: EventContent::PartUpdate(PartUpdateEvent {
            part_name: "eval-ast".into(),
            part_description: Description::localized(vec![
                (
                    "en",
                    "Evaluates a Definy AST expression to a number (self-hosting evaluator)",
                ),
                (
                    "ja",
                    "Definy の AST 式を評価して数値を計算する関数 (セルフホスティング評価器)",
                ),
            ]),
            part_definition_event_hash: eval_ast_def_hash.clone(),
            expression: Some(Expression::Function(FunctionExpression {
                parameter_id: 1, // e
                parameter_name: "e".into(),
                body: Box::new(Expression::Match(MatchExpression {
                    target: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                    arms: vec![
                        MatchArm {
                            tag: "number".into(),
                            variable_id: Some(10), // n
                            variable_name: Some("n".into()),
                            body: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 10,
                            })),
                        },
                        MatchArm {
                            tag: "add".into(),
                            variable_id: Some(20), // bin
                            variable_name: Some("bin".into()),
                            body: Box::new(Expression::Add(AddExpression {
                                left: Box::new(recursive_call(&eval_ast_def_hash, 20, "left")),
                                right: Box::new(recursive_call(&eval_ast_def_hash, 20, "right")),
                            })),
                        },
                        MatchArm {
                            tag: "subtract".into(),
                            variable_id: Some(30), // bin
                            variable_name: Some("bin".into()),
                            body: Box::new(Expression::Subtract(SubtractExpression {
                                left: Box::new(recursive_call(&eval_ast_def_hash, 30, "left")),
                                right: Box::new(recursive_call(&eval_ast_def_hash, 30, "right")),
                            })),
                        },
                        MatchArm {
                            tag: "multiply".into(),
                            variable_id: Some(40), // bin
                            variable_name: Some("bin".into()),
                            body: Box::new(Expression::Multiply(MultiplyExpression {
                                left: Box::new(recursive_call(&eval_ast_def_hash, 40, "left")),
                                right: Box::new(recursive_call(&eval_ast_def_hash, 40, "right")),
                            })),
                        },
                        MatchArm {
                            tag: "divide".into(),
                            variable_id: Some(50), // bin
                            variable_name: Some("bin".into()),
                            body: Box::new(Expression::Divide(DivideExpression {
                                left: Box::new(recursive_call(&eval_ast_def_hash, 50, "left")),
                                right: Box::new(recursive_call(&eval_ast_def_hash, 50, "right")),
                            })),
                        },
                        MatchArm {
                            tag: "remainder".into(),
                            variable_id: Some(60), // bin
                            variable_name: Some("bin".into()),
                            body: Box::new(Expression::Remainder(RemainderExpression {
                                left: Box::new(recursive_call(&eval_ast_def_hash, 60, "left")),
                                right: Box::new(recursive_call(&eval_ast_def_hash, 60, "right")),
                            })),
                        },
                    ],
                    default: Some(Box::new(Expression::Number(NumberExpression { value: 0 }))),
                })),
            })),
            module_definition_event_hash: core_module_hash.clone(),
        }),
    };

    Ok((eval_ast_def_event, eval_ast_update_event))
}

pub fn create_sample_ast_calc_part_event(
    account_id: &AccountId,
    first_commit_time: chrono::DateTime<chrono::Utc>,
    sample_module_hash: &EventHashId,
    expr_type_part_hash: &EventHashId,
    eval_ast_part_hash: &EventHashId,
) -> Event {
    // AST Expression: (100 - (10 * 3)) + (50 / 2) = 70 + 25 = 95
    let ast_num = |val: i64| {
        Expression::Variant(VariantExpression {
            tag: "number".into(),
            payload: Some(Box::new(Expression::Number(NumberExpression {
                value: val,
            }))),
            type_part_definition_event_hash: Some(expr_type_part_hash.clone()),
        })
    };

    let ast_binary = |tag: &str, left: Expression, right: Expression| {
        Expression::Variant(VariantExpression {
            tag: tag.into(),
            payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "left".into(),
                        value: Box::new(left),
                    },
                    TypeLiteralItemExpression {
                        key: "right".into(),
                        value: Box::new(right),
                    },
                ],
            }))),
            type_part_definition_event_hash: Some(expr_type_part_hash.clone()),
        })
    };

    let mul = ast_binary("multiply", ast_num(10), ast_num(3)); // 30
    let sub = ast_binary("subtract", ast_num(100), mul); // 70
    let div = ast_binary("divide", ast_num(50), ast_num(2)); // 25
    let add = ast_binary("add", sub, div); // 95

    Event {
        account_id: account_id.clone(),
        time: first_commit_time + chrono::Duration::milliseconds(41),
        content: EventContent::PartDefinition(PartDefinitionEvent {
            part_name: "sample-ast-calc".into(),
            part_type: Some(PartType::Number),
            description: Description::localized(vec![
                (
                    "en",
                    "Evaluates AST expression (100 - (10 * 3)) + (50 / 2) = 95 using core::eval-ast",
                ),
                (
                    "ja",
                    "core::eval-ast を用いて AST 式 (100 - (10 * 3)) + (50 / 2) = 95 を評価するサンプル",
                ),
            ]),
            expression: Some(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression {
                    part_definition_event_hash: eval_ast_part_hash.clone(),
                })),
                argument: Box::new(add),
            })),
            module_definition_event_hash: sample_module_hash.clone(),
        }),
    }
}
