use crate::ast_builder::{call_part, fn_expr, fn_type};
use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, AndExpression, Description, EqualExpression, Expression, IfExpression,
    LessThanOrEqualExpression, ListGetExpression, ListLengthExpression, MatchArm, MatchExpression,
    ModulePartEntry, NumberExpression, PartType, RecordFieldType, RecordGetExpression,
    StringExpression, VariableExpression, derive_module_part_id,
};

use super::helpers::{error_invalid_type_declaration, error_unknown, error_value, ok_type};

/// 関数呼び出しの実引数リストと関数型の仮引数リストを順序・名前・型に沿って再帰検査するパーツ
/// `core.type-check-call-arguments`:
/// `(parameters: list<param>, arguments: list<arg>, env: type-env, index: number, return_type: type-ast) -> type-result`
pub fn create_type_check_call_arguments_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_type_hash = derive_module_part_id(core_module_id, "expression");
    let type_env_hash = derive_module_part_id(core_module_id, "type-env");
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let type_check_against_hash = derive_module_part_id(core_module_id, "type-check-against");
    let check_call_args_hash = derive_module_part_id(core_module_id, "type-check-call-arguments");

    let params = Expression::Variable(VariableExpression { variable_id: 0 });
    let args = Expression::Variable(VariableExpression { variable_id: 1 });
    let env = Expression::Variable(VariableExpression { variable_id: 2 });
    let index = Expression::Variable(VariableExpression { variable_id: 3 });
    let return_type = Expression::Variable(VariableExpression { variable_id: 4 });

    let params_len = Expression::ListLength(ListLengthExpression {
        value: Box::new(params.clone()),
    });
    let args_len = Expression::ListLength(ListLengthExpression {
        value: Box::new(args.clone()),
    });

    let params_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(params_len.clone()),
        right: Box::new(index.clone()),
    });
    let args_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(args_len.clone()),
        right: Box::new(index.clone()),
    });

    let current_param = Expression::ListGet(ListGetExpression {
        list: Box::new(params.clone()),
        index: Box::new(index.clone()),
    });
    let current_param_name = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_param.clone()),
        key: "name".into(),
    });
    let current_param_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_param),
        key: "type".into(),
    });

    let current_arg = Expression::ListGet(ListGetExpression {
        list: Box::new(args.clone()),
        index: Box::new(index.clone()),
    });
    let current_arg_name = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_arg.clone()),
        key: "name".into(),
    });
    let current_arg_val = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_arg),
        key: "value".into(),
    });

    let name_matches = Expression::Equal(EqualExpression {
        left: Box::new(current_param_name),
        right: Box::new(current_arg_name),
    });

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let recurse = call_part(
        &check_call_args_hash,
        &[
            ("parameters", params),
            ("arguments", args),
            ("env", env.clone()),
            ("index", next_index),
            ("return_type", return_type.clone()),
        ],
    );

    let check_arg = call_part(
        &type_check_against_hash,
        &[
            ("expr", current_arg_val),
            ("env", env),
            ("expected_type", current_param_type),
        ],
    );

    let check_arg_match = Expression::Match(MatchExpression {
        target: Box::new(check_arg),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(10),
                variable_name: Some("ok_type".into()),
                body: Box::new(recurse),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(11),
                variable_name: Some("err".into()),
                body: Box::new(error_value(Expression::Variable(VariableExpression {
                    variable_id: 11,
                }))),
            },
        ],
        default: Some(Box::new(error_unknown())),
    });

    let name_mismatch_err = error_invalid_type_declaration(Expression::String(StringExpression {
        value: "call argument name does not match function parameter name".into(),
    }));

    let check_current_item = Expression::If(IfExpression {
        condition: Box::new(name_matches),
        then_expr: Box::new(check_arg_match),
        else_expr: Box::new(name_mismatch_err),
    });

    let count_mismatch_err = error_invalid_type_declaration(Expression::String(StringExpression {
        value: "call argument count does not match function parameter count".into(),
    }));

    // If params_end && args_end => ok(return_type)
    // Else if params_end || args_end => error(count_mismatch)
    // Else => check_current_item
    let body = Expression::If(IfExpression {
        condition: Box::new(params_end.clone()),
        then_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(args_end.clone()),
            then_expr: Box::new(ok_type(return_type)),
            else_expr: Box::new(count_mismatch_err.clone()),
        })),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(args_end),
            then_expr: Box::new(count_mismatch_err),
            else_expr: Box::new(check_current_item),
        })),
    });

    let param_type = PartType::Record(vec![
        RecordFieldType {
            key: "name".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "type".into(),
            value: Box::new(PartType::TypePart(type_ast_hash.clone())),
        },
    ]);
    let call_arg_type = PartType::Record(vec![
        RecordFieldType {
            key: "name".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "value".into(),
            value: Box::new(PartType::TypePart(expr_type_hash)),
        },
    ]);

    ModulePartEntry {
        name: "type-check-call-arguments".into(),
        part_type: Some(fn_type(
            &[
                ("parameters", PartType::List(Box::new(param_type))),
                ("arguments", PartType::List(Box::new(call_arg_type))),
                ("env", PartType::TypePart(type_env_hash)),
                ("index", PartType::Number),
                ("return_type", PartType::TypePart(type_ast_hash)),
            ],
            PartType::TypePart(type_result_hash),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Recursively checks function call arguments against parameter types and names",
            ),
            (
                "ja",
                "関数呼び出しの引数リストをパラメータの名前と型に対して再帰検査",
            ),
        ]),
        content_hash: None,
        expression: Some(fn_expr(
            &[
                ("parameters", 0),
                ("arguments", 1),
                ("env", 2),
                ("index", 3),
                ("return_type", 4),
            ],
            body,
        )),
    }
}

/// 関数式の仮引数を期待される関数型の仮引数と照合・環境へ順次束縛し、本体を戻り値型に対して検査するパーツ
/// `core.type-check-function`:
/// `(fn_parameters: list<fn_param>, ty_parameters: list<ty_param>, body: expression, return_type: type-ast, env: type-env, index: number, expected_type: type-ast) -> type-result`
pub fn create_type_check_function_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_type_hash = derive_module_part_id(core_module_id, "expression");
    let type_env_hash = derive_module_part_id(core_module_id, "type-env");
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let type_env_extend_hash = derive_module_part_id(core_module_id, "type-env-extend");
    let type_check_against_hash = derive_module_part_id(core_module_id, "type-check-against");
    let check_function_hash = derive_module_part_id(core_module_id, "type-check-function");

    let fn_params = Expression::Variable(VariableExpression { variable_id: 0 });
    let ty_params = Expression::Variable(VariableExpression { variable_id: 1 });
    let body = Expression::Variable(VariableExpression { variable_id: 2 });
    let return_type = Expression::Variable(VariableExpression { variable_id: 3 });
    let env = Expression::Variable(VariableExpression { variable_id: 4 });
    let index = Expression::Variable(VariableExpression { variable_id: 5 });
    let expected_type = Expression::Variable(VariableExpression { variable_id: 6 });

    let fn_len = Expression::ListLength(ListLengthExpression {
        value: Box::new(fn_params.clone()),
    });
    let ty_len = Expression::ListLength(ListLengthExpression {
        value: Box::new(ty_params.clone()),
    });

    let fn_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(fn_len.clone()),
        right: Box::new(index.clone()),
    });
    let ty_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(ty_len.clone()),
        right: Box::new(index.clone()),
    });

    let both_end = Expression::And(AndExpression {
        left: Box::new(fn_end.clone()),
        right: Box::new(ty_end.clone()),
    });

    let check_body = call_part(
        &type_check_against_hash,
        &[
            ("expr", body.clone()),
            ("env", env.clone()),
            ("expected_type", return_type.clone()),
        ],
    );

    let check_body_match = Expression::Match(MatchExpression {
        target: Box::new(check_body),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(10),
                variable_name: Some("body_ok".into()),
                body: Box::new(ok_type(expected_type.clone())),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(11),
                variable_name: Some("err".into()),
                body: Box::new(error_value(Expression::Variable(VariableExpression {
                    variable_id: 11,
                }))),
            },
        ],
        default: Some(Box::new(error_unknown())),
    });

    let current_fn_param = Expression::ListGet(ListGetExpression {
        list: Box::new(fn_params.clone()),
        index: Box::new(index.clone()),
    });
    let fn_param_id = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_fn_param.clone()),
        key: "parameter_id".into(),
    });
    let fn_param_name = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_fn_param),
        key: "parameter_name".into(),
    });

    let current_ty_param = Expression::ListGet(ListGetExpression {
        list: Box::new(ty_params.clone()),
        index: Box::new(index.clone()),
    });
    let ty_param_name = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_ty_param.clone()),
        key: "name".into(),
    });
    let ty_param_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_ty_param),
        key: "type".into(),
    });

    let names_match = Expression::Equal(EqualExpression {
        left: Box::new(fn_param_name),
        right: Box::new(ty_param_name),
    });

    let extended_env = call_part(
        &type_env_extend_hash,
        &[
            ("env", env),
            ("var_id", fn_param_id),
            ("var_type", ty_param_type),
        ],
    );

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let recurse = call_part(
        &check_function_hash,
        &[
            ("fn_parameters", fn_params),
            ("ty_parameters", ty_params),
            ("body", body),
            ("return_type", return_type),
            ("env", extended_env),
            ("index", next_index),
            ("expected_type", expected_type),
        ],
    );

    let param_step = Expression::If(IfExpression {
        condition: Box::new(names_match),
        then_expr: Box::new(recurse),
        else_expr: Box::new(error_invalid_type_declaration(Expression::String(
            StringExpression {
                value: "function parameter name does not match expected parameter name".into(),
            },
        ))),
    });

    let either_end = Expression::If(IfExpression {
        condition: Box::new(fn_end),
        then_expr: Box::new(error_invalid_type_declaration(Expression::String(
            StringExpression {
                value: "function parameter count does not match expected function type".into(),
            },
        ))),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(ty_end),
            then_expr: Box::new(error_invalid_type_declaration(Expression::String(
                StringExpression {
                    value: "function parameter count does not match expected function type".into(),
                },
            ))),
            else_expr: Box::new(param_step),
        })),
    });

    let check_body_logic = Expression::If(IfExpression {
        condition: Box::new(both_end),
        then_expr: Box::new(check_body_match),
        else_expr: Box::new(either_end),
    });

    let fn_param_type = PartType::Record(vec![
        RecordFieldType {
            key: "parameter_id".into(),
            value: Box::new(PartType::Number),
        },
        RecordFieldType {
            key: "parameter_name".into(),
            value: Box::new(PartType::String),
        },
    ]);
    let ty_param_type = PartType::Record(vec![
        RecordFieldType {
            key: "name".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "type".into(),
            value: Box::new(PartType::TypePart(type_ast_hash.clone())),
        },
    ]);

    ModulePartEntry {
        name: "type-check-function".into(),
        part_type: Some(fn_type(
            &[
                ("fn_parameters", PartType::List(Box::new(fn_param_type))),
                ("ty_parameters", PartType::List(Box::new(ty_param_type))),
                ("body", PartType::TypePart(expr_type_hash)),
                ("return_type", PartType::TypePart(type_ast_hash.clone())),
                ("env", PartType::TypePart(type_env_hash)),
                ("index", PartType::Number),
                ("expected_type", PartType::TypePart(type_ast_hash)),
            ],
            PartType::TypePart(type_result_hash),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Recursively binds function parameters to type environment and checks body",
            ),
            (
                "ja",
                "関数の仮引数を型環境へ順次束縛し、本体式を戻り値型に対して検査",
            ),
        ]),
        content_hash: None,
        expression: Some(fn_expr(
            &[
                ("fn_parameters", 0),
                ("ty_parameters", 1),
                ("body", 2),
                ("return_type", 3),
                ("env", 4),
                ("index", 5),
                ("expected_type", 6),
            ],
            check_body_logic,
        )),
    }
}
