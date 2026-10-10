use super::evaluate_expression;
use super::expression_eval_test_helpers::*;
use definy_event::event::*;

#[test]
fn test_evaluate_self_hosting_eval_ast_all_operations() {
    use definy_event::EventHashId;

    let dummy_key = ed25519_dalek::VerifyingKey::from_bytes(&[0u8; 32]).unwrap();
    let dummy_account = AccountId(dummy_key);
    let mod_id = definy_event::event::derive_module_id(&dummy_account, "core");
    let expr_hash = definy_event::event::derive_module_part_id(&mod_id, "expression");
    let eval_hash = definy_event::event::derive_module_part_id(&mod_id, "eval_ast");

    fn rec_call(eval_hash: &EventHashId, var_id: i64, key: &str) -> Expression {
        Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                eval_hash.clone(),
            ))),
            arguments: vec![CallArgument {
                name: "e".into(),
                value: Box::new(record_get(var_ref(var_id), key)),
            }],
        })
    }

    let eval_event = Event {
        account_id: dummy_account,
        time: chrono::DateTime::UNIX_EPOCH,
        content: EventContent::ModuleCommit(definy_event::event::ModuleCommitEvent {
            module_name: "core".into(),
            module_description: "".into(),
            parent_commit_hash: None,
            message: "Add eval_ast".into(),
            parts: vec![definy_event::event::ModulePartEntry {
                name: "eval_ast".into(),
                part_type: Some(PartType::Function {
                    parameters: vec![FunctionParameterType {
                        name: "e".into(),
                        r#type: Box::new(PartType::TypePart(expr_hash.clone())),
                    }],
                    return_type: Box::new(PartType::Number),
                }),
                description: Description::Plain("eval AST all arithmetic ops".into()),
                content_hash: None,
                expression: Some(Expression::Function(FunctionExpression {
                    parameters: vec![FunctionParameter {
                        parameter_id: 1, // e
                        parameter_name: "e".into(),
                    }],
                    body: Box::new(match_op(
                        var_ref(1),
                        vec![
                            match_arm_payload("number", 10, "n", var_ref(10)),
                            match_arm_payload(
                                "add",
                                20,
                                "bin",
                                add(
                                    rec_call(&eval_hash, 20, "left"),
                                    rec_call(&eval_hash, 20, "right"),
                                ),
                            ),
                            match_arm_payload(
                                "subtract",
                                30,
                                "bin",
                                sub(
                                    rec_call(&eval_hash, 30, "left"),
                                    rec_call(&eval_hash, 30, "right"),
                                ),
                            ),
                            match_arm_payload(
                                "multiply",
                                40,
                                "bin",
                                mul(
                                    rec_call(&eval_hash, 40, "left"),
                                    rec_call(&eval_hash, 40, "right"),
                                ),
                            ),
                            match_arm_payload(
                                "divide",
                                50,
                                "bin",
                                div(
                                    rec_call(&eval_hash, 50, "left"),
                                    rec_call(&eval_hash, 50, "right"),
                                ),
                            ),
                            match_arm_payload(
                                "remainder",
                                60,
                                "bin",
                                rem(
                                    rec_call(&eval_hash, 60, "left"),
                                    rec_call(&eval_hash, 60, "right"),
                                ),
                            ),
                        ],
                        Some(num(0)),
                    )),
                })),
            }],
        }),
    };

    let dummy_sig = ed25519_dalek::Signature::from_bytes(&[0u8; 64]);
    let commit_hash = EventHashId::from_bytes(&[203u8; 32]);
    let events: Vec<crate::EventWithHash> = vec![(commit_hash, Ok((dummy_sig, eval_event)))];

    // Build AST: ((100 - (10 * 3)) + (50 / 2)) + (17 % 5)
    // 10 * 3 = 30
    // 100 - 30 = 70
    // 50 / 2 = 25
    // 70 + 25 = 95
    // 17 % 5 = 2
    // 95 + 2 = 97
    let ast_num = |val: i64| {
        Expression::Variant(VariantExpression {
            tag: "number".into(),
            payload: Some(Box::new(num(val))),
            type_part_definition_event_hash: Some(expr_hash.clone()),
        })
    };
    let ast_binary = |tag: &str, left: Expression, right: Expression| {
        Expression::Variant(VariantExpression {
            tag: tag.into(),
            payload: Some(Box::new(record_lit(vec![("left", left), ("right", right)]))),
            type_part_definition_event_hash: Some(expr_hash.clone()),
        })
    };

    let mul_e = ast_binary("multiply", ast_num(10), ast_num(3));
    let sub_e = ast_binary("subtract", ast_num(100), mul_e);
    let div_e = ast_binary("divide", ast_num(50), ast_num(2));
    let rem_e = ast_binary("remainder", ast_num(17), ast_num(5));
    let add1 = ast_binary("add", sub_e, div_e);
    let add2 = ast_binary("add", add1, rem_e);

    let eval_call = Expression::Call(CallExpression {
        function: Box::new(Expression::PartReference(PartReferenceExpression::new(
            eval_hash,
        ))),
        arguments: vec![CallArgument {
            name: "e".into(),
            value: Box::new(add2),
        }],
    });

    let val = evaluate_expression(&eval_call, &events).unwrap();
    assert_eq!(val, crate::expression_eval::Value::Number(97));
}

#[test]
fn test_part_reference_content_hash_version_locking() {
    let dummy_key = ed25519_dalek::VerifyingKey::from_bytes(&[0; 32]).unwrap();
    let dummy_account = AccountId(dummy_key);
    let mod_id = definy_event::event::derive_module_id(&dummy_account, "math");
    let part_a_hash = definy_event::event::derive_module_part_id(&mod_id, "a");
    let dummy_sig = ed25519_dalek::Signature::from_bytes(&[0u8; 64]);

    // 1. パーツ A の初期定義: 10 (v1)
    let expr_v1 = Expression::Number(NumberExpression { value: 10 });
    let content_hash_v1 = definy_event::ContentHash::from_expression(&expr_v1).unwrap();
    let commit_1_hash = definy_event::EventHashId::from_bytes(&[101u8; 32]);
    let commit_1_event = Event {
        account_id: dummy_account.clone(),
        time: chrono::DateTime::UNIX_EPOCH,
        content: EventContent::ModuleCommit(ModuleCommitEvent {
            module_name: "math".into(),
            module_description: "".into(),
            parent_commit_hash: None,
            message: "v1".into(),
            parts: vec![ModulePartEntry {
                name: "a".into(),
                part_type: Some(PartType::Number),
                description: Description::Plain("part a v1".into()),
                content_hash: None,
                expression: Some(expr_v1),
            }],
        }),
    };

    // 2. パーツ A の更新: 999 (v2)
    let expr_v2 = Expression::Number(NumberExpression { value: 999 });
    let commit_2_hash = definy_event::EventHashId::from_bytes(&[102u8; 32]);
    let commit_2_event = Event {
        account_id: dummy_account,
        time: chrono::DateTime::UNIX_EPOCH + chrono::Duration::seconds(10),
        content: EventContent::ModuleCommit(ModuleCommitEvent {
            module_name: "math".into(),
            module_description: "".into(),
            parent_commit_hash: Some(commit_1_hash.clone()),
            message: "v2".into(),
            parts: vec![ModulePartEntry {
                name: "a".into(),
                part_type: Some(PartType::Number),
                description: Description::Plain("part a v2".into()),
                content_hash: None,
                expression: Some(expr_v2),
            }],
        }),
    };

    let events: Vec<crate::EventWithHash> = vec![
        (commit_1_hash, Ok((dummy_sig, commit_1_event))),
        (commit_2_hash, Ok((dummy_sig, commit_2_event))),
    ];

    // 3. パターン1: content_hash で v1 を固定ロックした参照: A (locked v1) + 5 -> 10 + 5 = 15
    let locked_ref = Expression::Add(AddExpression {
        left: Box::new(Expression::PartReference(
            PartReferenceExpression::with_content_hash(part_a_hash.clone(), content_hash_v1),
        )),
        right: Box::new(Expression::Number(NumberExpression { value: 5 })),
    });

    assert_eq!(
        evaluate_expression(&locked_ref, &events),
        Ok(crate::expression_eval::Value::Number(15))
    );

    // 4. パターン2: content_hash が None (最新追跡): A (latest v2) + 5 -> 999 + 5 = 1004
    let unlocked_ref = Expression::Add(AddExpression {
        left: Box::new(Expression::PartReference(PartReferenceExpression::new(
            part_a_hash,
        ))),
        right: Box::new(Expression::Number(NumberExpression { value: 5 })),
    });

    assert_eq!(
        evaluate_expression(&unlocked_ref, &events),
        Ok(crate::expression_eval::Value::Number(1004))
    );
}

#[test]
fn test_module_commit_batch_parts_projection_and_eval() {
    let dummy_key = ed25519_dalek::VerifyingKey::from_bytes(&[0; 32]).unwrap();
    let dummy_account = AccountId(dummy_key);
    let commit_hash = definy_event::EventHashId::from_bytes(&[51u8; 32]);
    let dummy_sig = ed25519_dalek::Signature::from_bytes(&[0u8; 64]);

    // add_ten: x -> x + 10
    let add_ten_expr = Expression::Function(FunctionExpression {
        parameters: vec![FunctionParameter {
            parameter_id: 1,
            parameter_name: "x".into(),
        }],
        body: Box::new(Expression::Add(AddExpression {
            left: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            right: Box::new(Expression::Number(NumberExpression { value: 10 })),
        })),
    });
    let add_ten_content_hash = definy_event::ContentHash::from_expression(&add_ten_expr).unwrap();

    // ModuleCommitEvent で add_ten と forty_two パーツを一度にコミット
    let commit_event = Event {
        account_id: dummy_account.clone(),
        time: chrono::DateTime::UNIX_EPOCH,
        content: EventContent::ModuleCommit(ModuleCommitEvent {
            module_name: "math".into(),
            module_description: "".into(),
            parent_commit_hash: None,
            message: "Initial commit with math functions".into(),
            parts: vec![
                ModulePartEntry {
                    name: "add_ten".into(),
                    part_type: Some(PartType::Function {
                        parameters: vec![FunctionParameterType {
                            name: "x".into(),
                            r#type: Box::new(PartType::Number),
                        }],
                        return_type: Box::new(PartType::Number),
                    }),
                    description: Description::Plain("adds 10 to input".into()),
                    content_hash: Some(add_ten_content_hash.clone()),
                    expression: Some(add_ten_expr.clone()),
                },
                ModulePartEntry {
                    name: "forty_two".into(),
                    part_type: Some(PartType::Number),
                    description: Description::Plain("the answer".into()),
                    content_hash: None,
                    expression: Some(Expression::Number(NumberExpression { value: 42 })),
                },
            ],
        }),
    };

    let events: Vec<crate::EventWithHash> =
        vec![(commit_hash.clone(), Ok((dummy_sig, commit_event)))];

    let mod_id = definy_event::event::derive_module_id(&dummy_account, "math");
    let part_add_ten_id = definy_event::event::derive_module_part_id(&mod_id, "add_ten");

    // 評価器のテスト: add_ten を ContentHash で呼び出して 32 + 10 = 42
    let call_expr = Expression::Call(CallExpression {
        function: Box::new(Expression::PartReference(
            PartReferenceExpression::with_content_hash(part_add_ten_id, add_ten_content_hash),
        )),
        arguments: vec![CallArgument {
            name: "x".into(),
            value: Box::new(Expression::Number(NumberExpression { value: 32 })),
        }],
    });

    assert_eq!(
        evaluate_expression(&call_expr, &events),
        Ok(crate::expression_eval::Value::Number(42))
    );
}
