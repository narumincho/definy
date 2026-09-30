use definy_event::EventHashId;
use definy_event::event::{
    CallExpression, Description, Expression, FunctionExpression, MatchArm, MatchExpression,
    ModulePartEntry, PartReferenceExpression, PartType, RecordGetExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, VariableExpression, VariantExpression, derive_module_part_id,
};

/// `core.type-check-against`: `expression -> type-env -> expected-type -> type-result`
pub fn create_type_check_against_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expression_hash = derive_module_part_id(core_module_id, "expression");
    let type_env_hash = derive_module_part_id(core_module_id, "type-env");
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let type_check_hash = derive_module_part_id(core_module_id, "type-check");
    let type_check_against_hash = derive_module_part_id(core_module_id, "type-check-against");
    let type_equals_hash = derive_module_part_id(core_module_id, "type-equals");
    let type_env_extend_hash = derive_module_part_id(core_module_id, "type-env-extend");

    let expected_type = Expression::Variable(VariableExpression { variable_id: 2 });
    let function_payload = Expression::Variable(VariableExpression { variable_id: 15 });
    let parameter_type = record_get(function_payload.clone(), "parameter");
    let return_type = record_get(function_payload, "return_type");

    let function_ast = Expression::Variable(VariableExpression { variable_id: 10 });
    let parameter_id = record_get(function_ast.clone(), "parameter_variable_id");
    let body = record_get(function_ast, "body");
    let extended_env = call_part(
        &type_env_extend_hash,
        vec![
            Expression::Variable(VariableExpression { variable_id: 1 }),
            parameter_id,
            parameter_type,
        ],
    );
    let checked_body = call_part(
        &type_check_against_hash,
        vec![body, extended_env, return_type],
    );
    let check_function_body = Expression::Match(MatchExpression {
        target: Box::new(checked_body),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(16),
                variable_name: Some("body_type".into()),
                body: Box::new(ok_type(expected_type.clone())),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(17),
                variable_name: Some("error".into()),
                body: Box::new(error_value(Expression::Variable(VariableExpression {
                    variable_id: 17,
                }))),
            },
        ],
        default: Some(Box::new(error_unknown())),
    });
    let expected_function_match = Expression::Match(MatchExpression {
        target: Box::new(expected_type.clone()),
        arms: vec![MatchArm {
            tag: "function".into(),
            variable_id: Some(15),
            variable_name: Some("function_type".into()),
            body: Box::new(check_function_body),
        }],
        default: Some(Box::new(error_unknown())),
    });

    let inferred_type = Expression::Variable(VariableExpression { variable_id: 18 });
    let types_match = call_part(
        &type_equals_hash,
        vec![inferred_type.clone(), expected_type.clone()],
    );
    let check_inferred_type = Expression::If(definy_event::event::IfExpression {
        condition: Box::new(types_match),
        then_expr: Box::new(ok_type(expected_type.clone())),
        else_expr: Box::new(error_mismatch(expected_type, inferred_type)),
    });
    let inferred_result = call_part(
        &type_check_hash,
        vec![
            Expression::Variable(VariableExpression { variable_id: 0 }),
            Expression::Variable(VariableExpression { variable_id: 1 }),
        ],
    );
    let check_non_function = Expression::Match(MatchExpression {
        target: Box::new(inferred_result),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(18),
                variable_name: Some("inferred_type".into()),
                body: Box::new(check_inferred_type),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(19),
                variable_name: Some("error".into()),
                body: Box::new(error_value(Expression::Variable(VariableExpression {
                    variable_id: 19,
                }))),
            },
        ],
        default: Some(Box::new(error_unknown())),
    });

    let body = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "expr".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "env".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 2,
                parameter_name: "expected_type".into(),
                body: Box::new(Expression::Match(MatchExpression {
                    target: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
                    arms: vec![MatchArm {
                        tag: "function".into(),
                        variable_id: Some(10),
                        variable_name: Some("function_expr".into()),
                        body: Box::new(expected_function_match),
                    }],
                    default: Some(Box::new(check_non_function)),
                })),
            })),
        })),
    });

    ModulePartEntry {
        name: "type-check-against".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(expression_hash)),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::TypePart(type_env_hash)),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::TypePart(type_ast_hash)),
                    return_type: Box::new(PartType::TypePart(type_result_hash)),
                }),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Check an expression against an expected type, binding typed function parameters",
            ),
            ("ja", "期待型に照らして式を検査し、関数引数の型を環境へ束縛"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

fn call_part(part_hash: &EventHashId, args: Vec<Expression>) -> Expression {
    args.into_iter().fold(
        Expression::PartReference(PartReferenceExpression::new(part_hash.clone())),
        |function, argument| {
            Expression::Call(CallExpression {
                function: Box::new(function),
                argument: Box::new(argument),
            })
        },
    )
}

fn record_get(record: Expression, key: &'static str) -> Expression {
    Expression::RecordGet(RecordGetExpression {
        record: Box::new(record),
        key: key.into(),
    })
}

fn ok_type(type_ast: Expression) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "ok".into(),
        payload: Some(Box::new(type_ast)),
    })
}

fn error_value(error: Expression) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "error".into(),
        payload: Some(Box::new(error)),
    })
}

fn error_mismatch(expected: Expression, actual: Expression) -> Expression {
    error_value(Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "type_mismatch".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "expected".into(),
                    value: Box::new(expected),
                },
                TypeLiteralItemExpression {
                    key: "actual".into(),
                    value: Box::new(actual),
                },
            ],
        }))),
    }))
}

fn error_unknown() -> Expression {
    error_value(Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "unknown_error".into(),
        payload: None,
    }))
}
