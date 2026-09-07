use super::*;
use crate::expression_eval::Value;
use definy_event::{EventHashId, event::*};

#[test]
fn test_compile_and_execute_arithmetic() {
    let expr = Expression::Add(AddExpression {
        left: Box::new(Expression::Number(NumberExpression { value: 10 })),
        right: Box::new(Expression::Multiply(MultiplyExpression {
            left: Box::new(Expression::Number(NumberExpression { value: 3 })),
            right: Box::new(Expression::Number(NumberExpression { value: 4 })),
        })),
    });
    let wasm = compile_expression_to_wasm(&expr, &[]).unwrap();
    let val = execute_wasm(&wasm).unwrap();
    assert_eq!(val, Value::Number(22));
}

#[test]
fn test_compile_and_execute_comparisons_and_if() {
    let expr = Expression::If(IfExpression {
        condition: Box::new(Expression::LessThan(LessThanExpression {
            left: Box::new(Expression::Number(NumberExpression { value: 5 })),
            right: Box::new(Expression::Number(NumberExpression { value: 10 })),
        })),
        then_expr: Box::new(Expression::Subtract(SubtractExpression {
            left: Box::new(Expression::Number(NumberExpression { value: 50 })),
            right: Box::new(Expression::Number(NumberExpression { value: 8 })),
        })),
        else_expr: Box::new(Expression::Number(NumberExpression { value: 0 })),
    });
    let wasm = compile_expression_to_wasm(&expr, &[]).unwrap();
    let val = execute_wasm(&wasm).unwrap();
    assert_eq!(val, Value::Number(42));
}

#[test]
fn test_compile_and_execute_strings_and_lists() {
    let list_expr = Expression::ListLiteral(ListLiteralExpression {
        items: vec![
            Expression::String(StringExpression {
                value: "hello".into(),
            }),
            Expression::String(StringExpression {
                value: "world".into(),
            }),
        ],
    });
    let wasm = compile_expression_to_wasm(&list_expr, &[]).unwrap();
    let val = execute_wasm(&wasm).unwrap();
    assert_eq!(
        val,
        Value::List(vec![
            Value::String("hello".into()),
            Value::String("world".into())
        ])
    );
}

#[test]
fn test_compile_and_execute_string_operations() {
    // concat "Hello, " "World!"
    let concat_expr = Expression::StringConcat(StringConcatExpression {
        left: Box::new(Expression::String(StringExpression {
            value: "Hello, ".into(),
        })),
        right: Box::new(Expression::String(StringExpression {
            value: "World!".into(),
        })),
    });
    let wasm = compile_expression_to_wasm(&concat_expr, &[]).unwrap();
    let val = execute_wasm(&wasm).unwrap();
    assert_eq!(val, Value::String("Hello, World!".to_string()));

    // string_length "Definy"
    let len_expr = Expression::StringLength(StringLengthExpression {
        value: Box::new(Expression::String(StringExpression {
            value: "Definy".into(),
        })),
    });
    let wasm = compile_expression_to_wasm(&len_expr, &[]).unwrap();
    let val = execute_wasm(&wasm).unwrap();
    assert_eq!(val, Value::Number(6));

    // string_slice "Definy" 1 4 -> "efi"
    let slice_expr = Expression::StringSlice(StringSliceExpression {
        value: Box::new(Expression::String(StringExpression {
            value: "Definy".into(),
        })),
        start: Box::new(Expression::Number(NumberExpression { value: 1 })),
        end: Box::new(Expression::Number(NumberExpression { value: 4 })),
    });
    let wasm = compile_expression_to_wasm(&slice_expr, &[]).unwrap();
    let val = execute_wasm(&wasm).unwrap();
    assert_eq!(val, Value::String("efi".to_string()));
}

#[test]
fn test_compile_and_execute_list_operations() {
    // list_length [1, 2, 3] -> 3
    let len_expr = Expression::ListLength(ListLengthExpression {
        value: Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                Expression::Number(NumberExpression { value: 10 }),
                Expression::Number(NumberExpression { value: 20 }),
                Expression::Number(NumberExpression { value: 30 }),
            ],
        })),
    });
    let wasm = compile_expression_to_wasm(&len_expr, &[]).unwrap();
    let val = execute_wasm(&wasm).unwrap();
    assert_eq!(val, Value::Number(3));

    // list_concat [1, 2] [3, 4] -> [1, 2, 3, 4]
    let concat_expr = Expression::ListConcat(ListConcatExpression {
        left: Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                Expression::Number(NumberExpression { value: 1 }),
                Expression::Number(NumberExpression { value: 2 }),
            ],
        })),
        right: Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                Expression::Number(NumberExpression { value: 3 }),
                Expression::Number(NumberExpression { value: 4 }),
            ],
        })),
    });
    let wasm = compile_expression_to_wasm(&concat_expr, &[]).unwrap();
    let val = execute_wasm(&wasm).unwrap();
    assert_eq!(
        val,
        Value::List(vec![
            Value::Number(1),
            Value::Number(2),
            Value::Number(3),
            Value::Number(4),
        ])
    );

    // list_get [10, 20, 30] 1 -> 20
    let get_expr = Expression::ListGet(ListGetExpression {
        list: Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                Expression::Number(NumberExpression { value: 10 }),
                Expression::Number(NumberExpression { value: 20 }),
                Expression::Number(NumberExpression { value: 30 }),
            ],
        })),
        index: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });
    let wasm = compile_expression_to_wasm(&get_expr, &[]).unwrap();
    let val = execute_wasm(&wasm).unwrap();
    assert_eq!(val, Value::Number(20));

    // list_append [1, 2] 3 -> [1, 2, 3]
    let append_expr = Expression::ListAppend(ListAppendExpression {
        list: Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                Expression::Number(NumberExpression { value: 1 }),
                Expression::Number(NumberExpression { value: 2 }),
            ],
        })),
        item: Box::new(Expression::Number(NumberExpression { value: 3 })),
    });
    let wasm = compile_expression_to_wasm(&append_expr, &[]).unwrap();
    let val = execute_wasm(&wasm).unwrap();
    assert_eq!(
        val,
        Value::List(vec![Value::Number(1), Value::Number(2), Value::Number(3)])
    );
}

#[test]
fn test_compile_and_execute_function_call() {
    // (fn x -> x + 5) 10 -> 15
    let expr = Expression::Call(CallExpression {
        function: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "x".into(),
            body: Box::new(Expression::Add(AddExpression {
                left: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                right: Box::new(Expression::Number(NumberExpression { value: 5 })),
            })),
        })),
        argument: Box::new(Expression::Number(NumberExpression { value: 10 })),
    });

    let wasm = compile_expression_to_wasm(&expr, &[]).unwrap();
    let val = execute_wasm(&wasm).unwrap();
    assert_eq!(val, Value::Number(15));
}

#[test]
fn test_compile_and_execute_curried_function() {
    // ((fn x -> fn y -> x * y) 6) 7 -> 42
    let expr = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "x".into(),
                body: Box::new(Expression::Function(FunctionExpression {
                    parameter_id: 2,
                    parameter_name: "y".into(),
                    body: Box::new(Expression::Multiply(MultiplyExpression {
                        left: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                        right: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 2,
                        })),
                    })),
                })),
            })),
            argument: Box::new(Expression::Number(NumberExpression { value: 6 })),
        })),
        argument: Box::new(Expression::Number(NumberExpression { value: 7 })),
    });

    let wasm = compile_expression_to_wasm(&expr, &[]).unwrap();
    let val = execute_wasm(&wasm).unwrap();
    assert_eq!(val, Value::Number(42));
}

#[test]
fn test_compile_and_execute_closure_capture() {
    // let a = 100 in let add_a = (fn x -> x + a) in add_a 23 -> 123
    let expr = Expression::Let(LetExpression {
        variable_id: 1,
        variable_name: "a".into(),
        value: Box::new(Expression::Number(NumberExpression { value: 100 })),
        body: Box::new(Expression::Let(LetExpression {
            variable_id: 2,
            variable_name: "add_a".into(),
            value: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 3,
                parameter_name: "x".into(),
                body: Box::new(Expression::Add(AddExpression {
                    left: Box::new(Expression::Variable(VariableExpression { variable_id: 3 })),
                    right: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                })),
            })),
            body: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
                argument: Box::new(Expression::Number(NumberExpression { value: 23 })),
            })),
        })),
    });

    let wasm = compile_expression_to_wasm(&expr, &[]).unwrap();
    let val = execute_wasm(&wasm).unwrap();
    assert_eq!(val, Value::Number(123));
}

#[test]
fn test_compile_and_execute_part_reference_function() {
    // Part "double": fn x -> x * 2
    // Expression: Call(PartReference(double), 21) -> 42
    let dummy_key = ed25519_dalek::VerifyingKey::from_bytes(&[0u8; 32]).unwrap();
    let dummy_account = AccountId(dummy_key);
    let part_def_hash = EventHashId::from_bytes(&[42u8; 32]);

    let part_event = Event {
        account_id: dummy_account,
        time: chrono::DateTime::UNIX_EPOCH,
        content: EventContent::PartDefinition(PartDefinitionEvent {
            part_name: "double".into(),
            part_type: Some(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Number),
            }),
            description: Description::Plain("".into()),
            expression: Some(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "x".into(),
                body: Box::new(Expression::Multiply(MultiplyExpression {
                    left: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                    right: Box::new(Expression::Number(NumberExpression { value: 2 })),
                })),
            })),
            module_definition_event_hash: EventHashId::from_bytes(&[0u8; 32]),
        }),
    };

    let dummy_sig = ed25519_dalek::Signature::from_bytes(&[0u8; 64]);
    let events: Vec<crate::app_state::EventWithHash> =
        vec![(part_def_hash.clone(), Ok((dummy_sig, part_event)))];

    let expr = Expression::Call(CallExpression {
        function: Box::new(Expression::PartReference(PartReferenceExpression {
            part_definition_event_hash: part_def_hash,
        })),
        argument: Box::new(Expression::Number(NumberExpression { value: 21 })),
    });

    let wasm = compile_expression_to_wasm(&expr, &events).unwrap();
    let val = execute_wasm(&wasm).unwrap();
    assert_eq!(val, Value::Number(42));
}
