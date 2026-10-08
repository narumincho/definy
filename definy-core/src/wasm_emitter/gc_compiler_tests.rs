use super::gc_compiler::*;
use crate::expression_eval::Value;
use crate::wasm_emitter::executor::execute_wasm;
use definy_event::event::*;

#[test]
fn test_compile_gc_number_and_arithmetic() {
    let expr = Expression::Add(AddExpression {
        left: Box::new(Expression::Number(NumberExpression { value: 10 })),
        right: Box::new(Expression::Multiply(MultiplyExpression {
            left: Box::new(Expression::Number(NumberExpression { value: 5 })),
            right: Box::new(Expression::Number(NumberExpression { value: 6 })),
        })),
    });

    let wasm = compile_expression_to_wasm_gc(&expr, &[]).expect("compilation failed");
    let result = execute_wasm(&wasm).expect("execution failed");
    assert_eq!(result, Value::Number(40));
}

#[test]
fn test_compile_gc_boolean_and_if() {
    let expr = Expression::If(IfExpression {
        condition: Box::new(Expression::Boolean(BooleanExpression { value: true })),
        then_expr: Box::new(Expression::String(StringExpression {
            value: "yes".into(),
        })),
        else_expr: Box::new(Expression::String(StringExpression { value: "no".into() })),
    });

    let wasm = compile_expression_to_wasm_gc(&expr, &[]).expect("compilation failed");
    let result = execute_wasm(&wasm).expect("execution failed");
    assert_eq!(result, Value::String("yes".into()));
}

#[test]
fn test_compile_gc_let_and_record() {
    let expr = Expression::Let(LetExpression {
        variable_id: 1,
        variable_name: "x".into(),
        value: Box::new(Expression::Number(NumberExpression { value: 99 })),
        body: Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![TypeLiteralItemExpression {
                key: "count".into(),
                value: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            }],
        })),
    });

    let wasm = compile_expression_to_wasm_gc(&expr, &[]).expect("compilation failed");
    let result = execute_wasm(&wasm).expect("execution failed");
    assert_eq!(
        result,
        Value::Record(vec![("count".into(), Value::Number(99))])
    );
}

#[test]
fn test_compile_gc_record_get() {
    let expr = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "name".into(),
                    value: Box::new(Expression::String(StringExpression {
                        value: "Definy".into(),
                    })),
                },
                TypeLiteralItemExpression {
                    key: "version".into(),
                    value: Box::new(Expression::Number(NumberExpression { value: 1 })),
                },
            ],
        })),
        key: "name".into(),
    });

    let wasm = compile_expression_to_wasm_gc(&expr, &[]).expect("compilation failed");
    let result = execute_wasm(&wasm).expect("execution failed");
    assert_eq!(result, Value::String("Definy".into()));
}

#[test]
fn test_compile_gc_record_get_second_field() {
    let expr = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "name".into(),
                    value: Box::new(Expression::String(StringExpression {
                        value: "Definy".into(),
                    })),
                },
                TypeLiteralItemExpression {
                    key: "version".into(),
                    value: Box::new(Expression::Number(NumberExpression { value: 42 })),
                },
            ],
        })),
        key: "version".into(),
    });

    let wasm = compile_expression_to_wasm_gc(&expr, &[]).expect("compilation failed");
    let result = execute_wasm(&wasm).expect("execution failed");
    assert_eq!(result, Value::Number(42));
}

#[test]
fn test_compile_gc_variant_and_list() {
    let expr = Expression::Variant(VariantExpression {
        tag: "Some".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                Expression::Number(NumberExpression { value: 1 }),
                Expression::Number(NumberExpression { value: 2 }),
            ],
        }))),
        type_part_definition_event_hash: None,
    });

    let wasm = compile_expression_to_wasm_gc(&expr, &[]).expect("compilation failed");
    let result = execute_wasm(&wasm).expect("execution failed");
    assert_eq!(
        result,
        Value::Variant {
            tag: "Some".into(),
            payload: Some(Box::new(Value::List(vec![
                Value::Number(1),
                Value::Number(2),
            ]))),
        }
    );
}

#[test]
fn test_compile_gc_comparisons_and_logic() {
    // string equality: "abc" == "abc" -> true
    let expr_str_eq = Expression::Equal(EqualExpression {
        left: Box::new(Expression::String(StringExpression {
            value: "abc".into(),
        })),
        right: Box::new(Expression::String(StringExpression {
            value: "abc".into(),
        })),
    });
    let wasm = compile_expression_to_wasm_gc(&expr_str_eq, &[]).unwrap();
    assert_eq!(execute_wasm(&wasm).unwrap(), Value::Bool(true));

    // string inequality: "abc" != "def" -> true
    let expr_str_ne = Expression::NotEqual(NotEqualExpression {
        left: Box::new(Expression::String(StringExpression {
            value: "abc".into(),
        })),
        right: Box::new(Expression::String(StringExpression {
            value: "def".into(),
        })),
    });
    let wasm = compile_expression_to_wasm_gc(&expr_str_ne, &[]).unwrap();
    assert_eq!(execute_wasm(&wasm).unwrap(), Value::Bool(true));

    // number comparison: 10 < 20 -> true
    let expr_lt = Expression::LessThan(LessThanExpression {
        left: Box::new(Expression::Number(NumberExpression { value: 10 })),
        right: Box::new(Expression::Number(NumberExpression { value: 20 })),
    });
    let wasm = compile_expression_to_wasm_gc(&expr_lt, &[]).unwrap();
    assert_eq!(execute_wasm(&wasm).unwrap(), Value::Bool(true));

    // logic: !(true && false) -> true
    let expr_logic = Expression::Not(NotExpression {
        value: Box::new(Expression::And(AndExpression {
            left: Box::new(Expression::Boolean(BooleanExpression { value: true })),
            right: Box::new(Expression::Boolean(BooleanExpression { value: false })),
        })),
    });
    let wasm = compile_expression_to_wasm_gc(&expr_logic, &[]).unwrap();
    assert_eq!(execute_wasm(&wasm).unwrap(), Value::Bool(true));
}

#[test]
fn test_compile_gc_string_and_list_operations() {
    // StringLength("Hello") -> 5
    let expr_strlen = Expression::StringLength(StringLengthExpression {
        value: Box::new(Expression::String(StringExpression {
            value: "Hello".into(),
        })),
    });
    let wasm = compile_expression_to_wasm_gc(&expr_strlen, &[]).unwrap();
    assert_eq!(execute_wasm(&wasm).unwrap(), Value::Number(5));

    // ListLength([10, 20, 30]) -> 3
    let expr_listlen = Expression::ListLength(ListLengthExpression {
        value: Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                Expression::Number(NumberExpression { value: 10 }),
                Expression::Number(NumberExpression { value: 20 }),
                Expression::Number(NumberExpression { value: 30 }),
            ],
        })),
    });
    let wasm = compile_expression_to_wasm_gc(&expr_listlen, &[]).unwrap();
    assert_eq!(execute_wasm(&wasm).unwrap(), Value::Number(3));

    // ListGet([10, 20, 30], 1) -> 20
    let expr_listget = Expression::ListGet(ListGetExpression {
        list: Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                Expression::Number(NumberExpression { value: 10 }),
                Expression::Number(NumberExpression { value: 20 }),
                Expression::Number(NumberExpression { value: 30 }),
            ],
        })),
        index: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });
    let wasm = compile_expression_to_wasm_gc(&expr_listget, &[]).unwrap();
    assert_eq!(execute_wasm(&wasm).unwrap(), Value::Number(20));

    // Bitwise: 5 & 3 -> 1, 5 | 2 -> 7, 1 << 4 -> 16
    let expr_bit = Expression::BitAnd(BitAndExpression {
        left: Box::new(Expression::Number(NumberExpression { value: 5 })),
        right: Box::new(Expression::Number(NumberExpression { value: 3 })),
    });
    let wasm = compile_expression_to_wasm_gc(&expr_bit, &[]).unwrap();
    assert_eq!(execute_wasm(&wasm).unwrap(), Value::Number(1));

    let expr_shl = Expression::ShiftLeft(ShiftLeftExpression {
        left: Box::new(Expression::Number(NumberExpression { value: 1 })),
        right: Box::new(Expression::Number(NumberExpression { value: 4 })),
    });
    let wasm = compile_expression_to_wasm_gc(&expr_shl, &[]).unwrap();
    assert_eq!(execute_wasm(&wasm).unwrap(), Value::Number(16));
}
