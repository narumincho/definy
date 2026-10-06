use definy_event::EventHashId;
use definy_event::event::{
    Description, Expression, FunctionExpression, LessThanOrEqualExpression, ListLengthExpression,
    ListLiteralExpression, MatchArm, MatchExpression, ModulePartEntry, NumberExpression, PartType,
    StringExpression, VariableExpression, VariantExpression, derive_module_part_id,
};

use super::helpers::{
    call_part, error_invalid_type_declaration, error_mismatch, error_unknown, error_value, ok_type,
    record_get,
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
    let type_assignable_hash = derive_module_part_id(core_module_id, "type-assignable");
    let type_env_extend_hash = derive_module_part_id(core_module_id, "type-env-extend");
    let check_list_items_hash = derive_module_part_id(core_module_id, "type-check-list-items");
    let type_check_type_record_fields_hash =
        derive_module_part_id(core_module_id, "type-check-type-record-fields");
    let type_check_type_union_variants_hash =
        derive_module_part_id(core_module_id, "type-check-type-union-variants");

    let expected_type = Expression::Variable(VariableExpression { variable_id: 2 });
    let type_kind = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(type_ast_hash.clone()),
        tag: "type".into(),
        payload: None,
    });
    let type_kind_matches = call_part(
        &type_equals_hash,
        vec![expected_type.clone(), type_kind.clone()],
    );
    let check_type_expression = Expression::If(definy_event::event::IfExpression {
        condition: Box::new(type_kind_matches.clone()),
        then_expr: Box::new(ok_type(type_kind.clone())),
        else_expr: Box::new(error_mismatch(expected_type.clone(), type_kind.clone())),
    });

    // 1. type_list check
    let list_payload = Expression::Variable(VariableExpression { variable_id: 20 });
    let list_item_type = record_get(list_payload, "item_type");
    let check_list_item = call_part(
        &type_check_against_hash,
        vec![
            list_item_type,
            Expression::Variable(VariableExpression { variable_id: 1 }),
            type_kind.clone(),
        ],
    );
    let check_list_item_match = Expression::Match(MatchExpression {
        target: Box::new(check_list_item),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(25),
                variable_name: Some("ok_type".into()),
                body: Box::new(ok_type(type_kind.clone())),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(26),
                variable_name: Some("err".into()),
                body: Box::new(error_value(Expression::Variable(VariableExpression {
                    variable_id: 26,
                }))),
            },
        ],
        default: Some(Box::new(error_unknown())),
    });
    let check_type_list = Expression::If(definy_event::event::IfExpression {
        condition: Box::new(type_kind_matches.clone()),
        then_expr: Box::new(check_list_item_match),
        else_expr: Box::new(error_mismatch(expected_type.clone(), type_kind.clone())),
    });

    // 2. type_function check
    let func_payload = Expression::Variable(VariableExpression { variable_id: 21 });
    let func_param = record_get(func_payload.clone(), "parameter");
    let func_ret = record_get(func_payload, "return_type");
    let check_func_ret = call_part(
        &type_check_against_hash,
        vec![
            func_ret,
            Expression::Variable(VariableExpression { variable_id: 1 }),
            type_kind.clone(),
        ],
    );
    let check_func_ret_match = Expression::Match(MatchExpression {
        target: Box::new(check_func_ret),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(27),
                variable_name: Some("ok_type".into()),
                body: Box::new(ok_type(type_kind.clone())),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(28),
                variable_name: Some("err".into()),
                body: Box::new(error_value(Expression::Variable(VariableExpression {
                    variable_id: 28,
                }))),
            },
        ],
        default: Some(Box::new(error_unknown())),
    });
    let check_func_param = call_part(
        &type_check_against_hash,
        vec![
            func_param,
            Expression::Variable(VariableExpression { variable_id: 1 }),
            type_kind.clone(),
        ],
    );
    let check_func_param_match = Expression::Match(MatchExpression {
        target: Box::new(check_func_param),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(25),
                variable_name: Some("ok_type".into()),
                body: Box::new(check_func_ret_match),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(26),
                variable_name: Some("err".into()),
                body: Box::new(error_value(Expression::Variable(VariableExpression {
                    variable_id: 26,
                }))),
            },
        ],
        default: Some(Box::new(error_unknown())),
    });
    let check_type_function = Expression::If(definy_event::event::IfExpression {
        condition: Box::new(type_kind_matches.clone()),
        then_expr: Box::new(check_func_param_match),
        else_expr: Box::new(error_mismatch(expected_type.clone(), type_kind.clone())),
    });

    // 3. type_record check
    let record_fields = Expression::Variable(VariableExpression { variable_id: 22 });
    let check_record_fields_call = call_part(
        &type_check_type_record_fields_hash,
        vec![
            record_fields,
            Expression::Variable(VariableExpression { variable_id: 1 }),
            Expression::Number(NumberExpression { value: 0 }),
            Expression::ListLiteral(ListLiteralExpression { items: vec![] }),
        ],
    );
    let check_type_record = Expression::If(definy_event::event::IfExpression {
        condition: Box::new(type_kind_matches.clone()),
        then_expr: Box::new(check_record_fields_call),
        else_expr: Box::new(error_mismatch(expected_type.clone(), type_kind.clone())),
    });

    // 4. type_union check
    let union_variants = Expression::Variable(VariableExpression { variable_id: 23 });
    let is_union_empty = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(union_variants.clone()),
        })),
        right: Box::new(Expression::Number(NumberExpression { value: 0 })),
    });
    let empty_union_err = error_invalid_type_declaration(Expression::String(StringExpression {
        value: "union type must have at least one variant".into(),
    }));
    let check_union_variants_call = call_part(
        &type_check_type_union_variants_hash,
        vec![
            union_variants,
            Expression::Variable(VariableExpression { variable_id: 1 }),
            Expression::Number(NumberExpression { value: 0 }),
            Expression::ListLiteral(ListLiteralExpression { items: vec![] }),
        ],
    );
    let check_union_inner = Expression::If(definy_event::event::IfExpression {
        condition: Box::new(is_union_empty),
        then_expr: Box::new(empty_union_err),
        else_expr: Box::new(check_union_variants_call),
    });
    let check_type_union = Expression::If(definy_event::event::IfExpression {
        condition: Box::new(type_kind_matches),
        then_expr: Box::new(check_union_inner),
        else_expr: Box::new(error_mismatch(expected_type.clone(), type_kind)),
    });
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
        &type_assignable_hash,
        vec![inferred_type.clone(), expected_type.clone()],
    );
    let check_inferred_type = Expression::If(definy_event::event::IfExpression {
        condition: Box::new(types_match),
        then_expr: Box::new(ok_type(expected_type.clone())),
        else_expr: Box::new(error_mismatch(expected_type.clone(), inferred_type)),
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

    let list_items_var = 30;
    let exp_list_payload = Expression::Variable(VariableExpression { variable_id: 31 });
    let exp_item_type = record_get(exp_list_payload, "item_type");
    let check_list_elements = call_part(
        &check_list_items_hash,
        vec![
            Expression::Variable(VariableExpression {
                variable_id: list_items_var,
            }),
            Expression::Variable(VariableExpression { variable_id: 1 }),
            Expression::Number(NumberExpression { value: 0 }),
            exp_item_type,
        ],
    );

    let expected_list_match = Expression::Match(MatchExpression {
        target: Box::new(expected_type.clone()),
        arms: vec![MatchArm {
            tag: "list".into(),
            variable_id: Some(31),
            variable_name: Some("list_type".into()),
            body: Box::new(check_list_elements),
        }],
        default: Some(Box::new(check_non_function.clone())),
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
                    arms: vec![
                        MatchArm {
                            tag: "type_number".into(),
                            variable_id: None,
                            variable_name: None,
                            body: Box::new(check_type_expression.clone()),
                        },
                        MatchArm {
                            tag: "type_string".into(),
                            variable_id: None,
                            variable_name: None,
                            body: Box::new(check_type_expression.clone()),
                        },
                        MatchArm {
                            tag: "type_boolean".into(),
                            variable_id: None,
                            variable_name: None,
                            body: Box::new(check_type_expression.clone()),
                        },
                        MatchArm {
                            tag: "type_list".into(),
                            variable_id: Some(20),
                            variable_name: Some("type_list_payload".into()),
                            body: Box::new(check_type_list),
                        },
                        MatchArm {
                            tag: "type_function".into(),
                            variable_id: Some(21),
                            variable_name: Some("type_function_payload".into()),
                            body: Box::new(check_type_function),
                        },
                        MatchArm {
                            tag: "type_record".into(),
                            variable_id: Some(22),
                            variable_name: Some("type_record_payload".into()),
                            body: Box::new(check_type_record),
                        },
                        MatchArm {
                            tag: "type_union".into(),
                            variable_id: Some(23),
                            variable_name: Some("type_union_payload".into()),
                            body: Box::new(check_type_union),
                        },
                        MatchArm {
                            tag: "function".into(),
                            variable_id: Some(10),
                            variable_name: Some("function_expr".into()),
                            body: Box::new(expected_function_match),
                        },
                        MatchArm {
                            tag: "list".into(),
                            variable_id: Some(30),
                            variable_name: Some("list_items".into()),
                            body: Box::new(expected_list_match),
                        },
                    ],
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
