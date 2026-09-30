use definy_core::expression_eval::Value;
use definy_event::event::{
    CallExpression, Expression, ListLiteralExpression, PartReferenceExpression, StringExpression,
    TypeLiteralExpression, TypeLiteralItemExpression, VariantExpression, derive_module_part_id,
};

use super::helpers::{ast_add, ast_num, create_test_module_events, get_test_account_and_mod_id};

#[test]
fn test_self_hosted_meta_circular_eval_ast_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();

    let eval_ast_part = crate::builtin_expression_type::create_eval_ast_part(&mod_id);
    let sample_calc_part = crate::builtin_expression_type::create_sample_ast_calc_part(&mod_id);

    let events = create_test_module_events(account, vec![eval_ast_part], 123);

    let sample_expr = sample_calc_part.expression.expect("sample expr required");
    let result = definy_core::evaluate_expression(&sample_expr, &events)
        .expect("Failed to evaluate self-hosted sample calc");

    // Evaluates: (100 - (10 * 3)) + (50 / 2) = 70 + 25 = 95
    assert_eq!(result, Value::Number(95));
}

#[test]
fn test_self_hosted_expression_to_source_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();

    let expr_to_source_part = crate::builtin_formatter::create_expression_to_source_part(&mod_id);
    let to_source_hash = derive_module_part_id(&mod_id, "expression-to-source");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let events = create_test_module_events(account, vec![expr_to_source_part], 124);

    let expr_type_opt = Some(expr_type_hash);
    let ast_expr = ast_add(
        ast_num(10, expr_type_opt.clone()),
        ast_num(20, expr_type_opt.clone()),
        expr_type_opt,
    );

    let call_expr = Expression::Call(CallExpression {
        function: Box::new(Expression::PartReference(PartReferenceExpression::new(
            to_source_hash,
        ))),
        argument: Box::new(ast_expr),
    });

    let result = definy_core::evaluate_expression(&call_expr, &events)
        .expect("Failed to evaluate self-hosted expression-to-source");

    assert_eq!(result, Value::String("(<number> + <number>)".into()));
}

#[test]
fn test_self_hosted_meta_circular_eval_value_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();

    let val_part = crate::builtin_value_type::create_value_type_part(&mod_id);
    let env_part = crate::builtin_value_type::create_env_type_part(&mod_id);
    let env_lookup = crate::builtin_value_type::create_env_lookup_part(&mod_id);
    let env_lookup_inner = crate::builtin_value_type::create_env_lookup_inner_part(&mod_id);
    let env_extend = crate::builtin_value_type::create_env_extend_part(&mod_id);
    let eval_value = crate::builtin_evaluator::create_eval_value_part(&mod_id);

    let eval_hash = derive_module_part_id(&mod_id, "eval-value");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let events = create_test_module_events(
        account,
        vec![
            val_part,
            env_part,
            env_lookup,
            env_lookup_inner,
            env_extend,
            eval_value,
        ],
        125,
    );

    let expr_type_opt = Some(expr_type_hash);
    // Expression: 10 + 25 = 35
    let expr_to_eval = ast_add(
        ast_num(10, expr_type_opt.clone()),
        ast_num(25, expr_type_opt.clone()),
        expr_type_opt,
    );
    let empty_env = Expression::ListLiteral(ListLiteralExpression { items: vec![] });

    // call(call(eval-value, expr_to_eval), empty_env)
    let eval_call = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                eval_hash,
            ))),
            argument: Box::new(expr_to_eval),
        })),
        argument: Box::new(empty_env),
    });

    let result = definy_core::evaluate_expression(&eval_call, &events)
        .expect("Failed to evaluate expression using core.eval-value");

    assert_eq!(
        result,
        Value::Variant {
            tag: "number".into(),
            payload: Some(Box::new(Value::Number(35))),
        }
    );
}

#[test]
fn test_self_hosted_type_checker_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();

    let type_err = crate::builtin_type_checker::create_type_error_part(&mod_id);
    let type_res = crate::builtin_type_checker::create_type_result_part(&mod_id);
    let type_env = crate::builtin_type_checker::create_type_env_part(&mod_id);
    let type_env_lookup = crate::builtin_type_checker::create_type_env_lookup_part(&mod_id);
    let type_env_lookup_inner =
        crate::builtin_type_checker::create_type_env_lookup_inner_part(&mod_id);
    let type_env_extend = crate::builtin_type_checker::create_type_env_extend_part(&mod_id);
    let type_equals = crate::builtin_type_checker::create_type_equals_part(&mod_id);
    let type_check = crate::builtin_type_checker::create_type_check_part(&mod_id);

    let type_check_hash = derive_module_part_id(&mod_id, "type-check");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let events = create_test_module_events(
        account,
        vec![
            type_err,
            type_res,
            type_env,
            type_env_lookup,
            type_env_lookup_inner,
            type_env_extend,
            type_equals,
            type_check,
        ],
        126,
    );

    let expr_type_opt = Some(expr_type_hash);
    // Expression: 10 + 20
    let expr_to_check = ast_add(
        ast_num(10, expr_type_opt.clone()),
        ast_num(20, expr_type_opt.clone()),
        expr_type_opt,
    );
    let empty_env = Expression::ListLiteral(ListLiteralExpression { items: vec![] });

    // call(call(type-check, expr_to_check), empty_env)
    let check_call = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                type_check_hash,
            ))),
            argument: Box::new(expr_to_check),
        })),
        argument: Box::new(empty_env),
    });

    let result = definy_core::evaluate_expression(&check_call, &events)
        .expect("Failed to type-check expression using core.type-check");

    assert_eq!(
        result,
        Value::Variant {
            tag: "ok".into(),
            payload: Some(Box::new(Value::Variant {
                tag: "number".into(),
                payload: None,
            })),
        }
    );
}

#[test]
fn test_self_hosted_validate_part_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();

    let type_err = crate::builtin_type_checker::create_type_error_part(&mod_id);
    let type_res = crate::builtin_type_checker::create_type_result_part(&mod_id);
    let type_env = crate::builtin_type_checker::create_type_env_part(&mod_id);
    let type_env_lookup = crate::builtin_type_checker::create_type_env_lookup_part(&mod_id);
    let type_env_lookup_inner =
        crate::builtin_type_checker::create_type_env_lookup_inner_part(&mod_id);
    let type_env_extend = crate::builtin_type_checker::create_type_env_extend_part(&mod_id);
    let type_equals = crate::builtin_type_checker::create_type_equals_part(&mod_id);
    let type_check = crate::builtin_type_checker::create_type_check_part(&mod_id);
    let validate_part = crate::builtin_validator::create_validate_part_part(&mod_id);

    let validate_part_hash = derive_module_part_id(&mod_id, "validate-part");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let events = create_test_module_events(
        account,
        vec![
            type_err,
            type_res,
            type_env,
            type_env_lookup,
            type_env_lookup_inner,
            type_env_extend,
            type_equals,
            type_check,
            validate_part,
        ],
        127,
    );

    let expr_type_opt = Some(expr_type_hash);
    let sample_expr = ast_add(
        ast_num(10, expr_type_opt.clone()),
        ast_num(20, expr_type_opt.clone()),
        expr_type_opt,
    );

    // Construct valid part definition:
    // { name: "calc", description: "...", part_type: number, expression: 10 + 20 }
    let valid_part_def = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "name".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "calc".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "description".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "sample calc".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "part_type".into(),
                value: Box::new(Expression::Variant(VariantExpression {
                    tag: "number".into(),
                    payload: None,
                    type_part_definition_event_hash: None,
                })),
            },
            TypeLiteralItemExpression {
                key: "expression".into(),
                value: Box::new(sample_expr),
            },
        ],
    });

    let call_validate = Expression::Call(CallExpression {
        function: Box::new(Expression::PartReference(PartReferenceExpression::new(
            validate_part_hash,
        ))),
        argument: Box::new(valid_part_def),
    });

    let result = definy_core::evaluate_expression(&call_validate, &events)
        .expect("Failed to validate part using core.validate-part");

    assert_eq!(result, Value::Bool(true));
}

#[test]
fn test_self_hosted_compile_to_wasm_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();

    let compile_instr =
        crate::builtin_wasm_compiler::create_compile_expr_instructions_part(&mod_id);
    let compile_to_wasm = crate::builtin_wasm_compiler::create_compile_to_wasm_part(&mod_id);

    let compile_to_wasm_hash = derive_module_part_id(&mod_id, "compile-to-wasm");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");

    let events = create_test_module_events(account, vec![compile_instr, compile_to_wasm], 128);

    let expr_type_opt = Some(expr_type_hash);
    // Expression to compile: 15 + 27 = 42
    let expr_to_compile = ast_add(
        ast_num(15, expr_type_opt.clone()),
        ast_num(27, expr_type_opt.clone()),
        expr_type_opt,
    );

    let call_compile = Expression::Call(CallExpression {
        function: Box::new(Expression::PartReference(PartReferenceExpression::new(
            compile_to_wasm_hash,
        ))),
        argument: Box::new(expr_to_compile),
    });

    // Execute self-hosted compiler to generate Wasm bytecode!
    let generated_wasm_list = definy_core::evaluate_expression(&call_compile, &events)
        .expect("Failed to execute self-hosted compile-to-wasm");

    let wasm_bytes: Vec<u8> = match generated_wasm_list {
        Value::List(bytes) => bytes
            .into_iter()
            .map(|v| match v {
                Value::Number(n) => n as u8,
                other => {
                    panic!(
                        "Expected Number byte in generated wasm list, got: {:?}",
                        other
                    )
                }
            })
            .collect(),
        other => panic!(
            "Expected List of bytes from compile-to-wasm, got: {:?}",
            other
        ),
    };

    // Now execute the Wasm binary emitted BY definy's own compiled code!
    let execution_result = definy_core::wasm_emitter::execute_wasm(&wasm_bytes)
        .expect("Failed to execute Wasm binary emitted by self-hosted compiler");

    assert_eq!(execution_result, Value::Number(42));
}
