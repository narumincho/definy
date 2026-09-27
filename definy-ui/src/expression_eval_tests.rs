use std::str::FromStr;

use super::{evaluate_expression, expression_to_source};
use definy_event::event::*;

// --- AST Builder Helpers for Tests ---

fn num(value: i64) -> Expression {
    Expression::Number(NumberExpression { value })
}

fn bool_lit(value: bool) -> Expression {
    Expression::Boolean(BooleanExpression { value })
}

fn str_lit(value: &str) -> Expression {
    Expression::String(StringExpression {
        value: value.into(),
    })
}

fn var_ref(variable_id: i64) -> Expression {
    Expression::Variable(VariableExpression { variable_id })
}

fn add(left: Expression, right: Expression) -> Expression {
    Expression::Add(AddExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn sub(left: Expression, right: Expression) -> Expression {
    Expression::Subtract(SubtractExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn mul(left: Expression, right: Expression) -> Expression {
    Expression::Multiply(MultiplyExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn div(left: Expression, right: Expression) -> Expression {
    Expression::Divide(DivideExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn rem(left: Expression, right: Expression) -> Expression {
    Expression::Remainder(RemainderExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn bit_and(left: Expression, right: Expression) -> Expression {
    Expression::BitAnd(BitAndExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn bit_or(left: Expression, right: Expression) -> Expression {
    Expression::BitOr(BitOrExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn bit_xor(left: Expression, right: Expression) -> Expression {
    Expression::BitXor(BitXorExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn shl(left: Expression, right: Expression) -> Expression {
    Expression::ShiftLeft(ShiftLeftExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn shr(left: Expression, right: Expression) -> Expression {
    Expression::ShiftRight(ShiftRightExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn lt(left: Expression, right: Expression) -> Expression {
    Expression::LessThan(LessThanExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn ge(left: Expression, right: Expression) -> Expression {
    Expression::GreaterThanOrEqual(GreaterThanOrEqualExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn not_equal(left: Expression, right: Expression) -> Expression {
    Expression::NotEqual(NotEqualExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn equal_op(left: Expression, right: Expression) -> Expression {
    Expression::Equal(EqualExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn not_op(value: Expression) -> Expression {
    Expression::Not(NotExpression {
        value: Box::new(value),
    })
}

fn and_op(left: Expression, right: Expression) -> Expression {
    Expression::And(AndExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn or_op(left: Expression, right: Expression) -> Expression {
    Expression::Or(OrExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn if_op(condition: Expression, then_expr: Expression, else_expr: Expression) -> Expression {
    Expression::If(IfExpression {
        condition: Box::new(condition),
        then_expr: Box::new(then_expr),
        else_expr: Box::new(else_expr),
    })
}

fn let_bind(
    variable_id: i64,
    variable_name: &str,
    value: Expression,
    body: Expression,
) -> Expression {
    Expression::Let(LetExpression {
        variable_id,
        variable_name: variable_name.into(),
        value: Box::new(value),
        body: Box::new(body),
    })
}

fn list_lit(items: Vec<Expression>) -> Expression {
    Expression::ListLiteral(ListLiteralExpression { items })
}

fn record_lit(items: Vec<(&str, Expression)>) -> Expression {
    Expression::TypeLiteral(TypeLiteralExpression {
        items: items
            .into_iter()
            .map(|(key, value)| TypeLiteralItemExpression {
                key: key.into(),
                value: Box::new(value),
            })
            .collect(),
    })
}

fn record_get(record: Expression, key: &str) -> Expression {
    Expression::RecordGet(RecordGetExpression {
        record: Box::new(record),
        key: key.into(),
    })
}

fn variant_unit(tag: &str) -> Expression {
    Expression::Variant(VariantExpression {
        tag: tag.into(),
        payload: None,
        type_part_definition_event_hash: None,
    })
}

fn variant_val(tag: &str, payload: Expression) -> Expression {
    Expression::Variant(VariantExpression {
        tag: tag.into(),
        payload: Some(Box::new(payload)),
        type_part_definition_event_hash: None,
    })
}

fn match_arm_unit(tag: &str, body: Expression) -> MatchArm {
    MatchArm {
        tag: tag.into(),
        variable_id: None,
        variable_name: None,
        body: Box::new(body),
    }
}

fn match_arm_payload(
    tag: &str,
    variable_id: i64,
    variable_name: &str,
    body: Expression,
) -> MatchArm {
    MatchArm {
        tag: tag.into(),
        variable_id: Some(variable_id),
        variable_name: Some(variable_name.into()),
        body: Box::new(body),
    }
}

fn match_op(target: Expression, arms: Vec<MatchArm>, default: Option<Expression>) -> Expression {
    Expression::Match(MatchExpression {
        target: Box::new(target),
        arms,
        default: default.map(Box::new),
    })
}

// --- Tests ---

#[test]
fn evaluate_expression_works() {
    let expression = add(num(1), add(num(2), num(4)));
    assert_eq!(
        evaluate_expression(&expression, &[]),
        Ok(crate::expression_eval::Value::Number(7))
    );
    assert_eq!(expression_to_source(&expression), "+ 1 (+ 2 4)");
}

#[test]
fn nested_examples() {
    let expression1 = num(1);
    assert_eq!(
        evaluate_expression(&expression1, &[]),
        Ok(crate::expression_eval::Value::Number(1))
    );

    let expression2 = sub(num(10), num(3));
    assert_eq!(
        evaluate_expression(&expression2, &[]),
        Ok(crate::expression_eval::Value::Number(7))
    );
    assert_eq!(expression_to_source(&expression2), "- 10 3");

    let expression3 = mul(num(6), num(7));
    assert_eq!(
        evaluate_expression(&expression3, &[]),
        Ok(crate::expression_eval::Value::Number(42))
    );
    assert_eq!(expression_to_source(&expression3), "* 6 7");
}

#[test]
fn evaluate_division_and_remainder() {
    let div_expr = div(num(20), num(4));
    assert_eq!(
        evaluate_expression(&div_expr, &[]),
        Ok(crate::expression_eval::Value::Number(5))
    );
    assert_eq!(expression_to_source(&div_expr), "/ 20 4");

    let rem_expr = rem(num(17), num(5));
    assert_eq!(
        evaluate_expression(&rem_expr, &[]),
        Ok(crate::expression_eval::Value::Number(2))
    );
    assert_eq!(expression_to_source(&rem_expr), "% 17 5");
}

#[test]
fn evaluate_bitwise_operations() {
    let and_expr = bit_and(num(14), num(11));
    assert_eq!(
        evaluate_expression(&and_expr, &[]),
        Ok(crate::expression_eval::Value::Number(10))
    );
    assert_eq!(expression_to_source(&and_expr), "& 14 11");

    let or_expr = bit_or(num(12), num(3));
    assert_eq!(
        evaluate_expression(&or_expr, &[]),
        Ok(crate::expression_eval::Value::Number(15))
    );
    assert_eq!(expression_to_source(&or_expr), "| 12 3");

    let xor_expr = bit_xor(num(12), num(10));
    assert_eq!(
        evaluate_expression(&xor_expr, &[]),
        Ok(crate::expression_eval::Value::Number(6))
    );
    assert_eq!(expression_to_source(&xor_expr), "^ 12 10");

    let shl_expr = shl(num(2), num(3));
    assert_eq!(
        evaluate_expression(&shl_expr, &[]),
        Ok(crate::expression_eval::Value::Number(16))
    );
    assert_eq!(expression_to_source(&shl_expr), "<< 2 3");

    let shr_expr = shr(num(32), num(2));
    assert_eq!(
        evaluate_expression(&shr_expr, &[]),
        Ok(crate::expression_eval::Value::Number(8))
    );
    assert_eq!(expression_to_source(&shr_expr), ">> 32 2");
}

#[test]
fn evaluate_comparisons() {
    let lt_expr = lt(num(3), num(5));
    assert_eq!(
        evaluate_expression(&lt_expr, &[]),
        Ok(crate::expression_eval::Value::Bool(true))
    );
    assert_eq!(expression_to_source(&lt_expr), "< 3 5");

    let ge_expr = ge(num(5), num(5));
    assert_eq!(
        evaluate_expression(&ge_expr, &[]),
        Ok(crate::expression_eval::Value::Bool(true))
    );
    assert_eq!(expression_to_source(&ge_expr), ">= 5 5");

    let ne_expr = not_equal(num(3), num(5));
    assert_eq!(
        evaluate_expression(&ne_expr, &[]),
        Ok(crate::expression_eval::Value::Bool(true))
    );
    assert_eq!(expression_to_source(&ne_expr), "!= 3 5");
}

#[test]
fn evaluate_boolean_logic() {
    let not_expr = not_op(bool_lit(false));
    assert_eq!(
        evaluate_expression(&not_expr, &[]),
        Ok(crate::expression_eval::Value::Bool(true))
    );
    assert_eq!(expression_to_source(&not_expr), "not False");

    let and_expr = and_op(bool_lit(true), bool_lit(false));
    assert_eq!(
        evaluate_expression(&and_expr, &[]),
        Ok(crate::expression_eval::Value::Bool(false))
    );
    assert_eq!(expression_to_source(&and_expr), "and True False");

    let or_expr = or_op(bool_lit(true), bool_lit(false));
    assert_eq!(
        evaluate_expression(&or_expr, &[]),
        Ok(crate::expression_eval::Value::Bool(true))
    );
    assert_eq!(expression_to_source(&or_expr), "or True False");
}

#[test]
fn evaluate_boolean_and_if() {
    let bool_expr = bool_lit(true);
    assert_eq!(
        evaluate_expression(&bool_expr, &[]),
        Ok(crate::expression_eval::Value::Bool(true))
    );
    assert_eq!(expression_to_source(&bool_expr), "True");

    let if_expr = if_op(bool_lit(false), num(10), num(20));
    assert_eq!(
        evaluate_expression(&if_expr, &[]),
        Ok(crate::expression_eval::Value::Number(20))
    );
    assert_eq!(expression_to_source(&if_expr), "if False 10 20");
}

#[test]
fn evaluate_string_literal() {
    let string_expr = str_lit("hello");
    assert_eq!(
        evaluate_expression(&string_expr, &[]),
        Ok(crate::expression_eval::Value::String("hello".to_string()))
    );
    assert_eq!(expression_to_source(&string_expr), "\"hello\"");
}

#[test]
fn evaluate_list_literal() {
    let list_expr = list_lit(vec![num(1), num(2)]);
    assert_eq!(
        evaluate_expression(&list_expr, &[]),
        Ok(crate::expression_eval::Value::List(vec![
            crate::expression_eval::Value::Number(1),
            crate::expression_eval::Value::Number(2),
        ]))
    );
    assert_eq!(expression_to_source(&list_expr), "[1, 2]");
}

#[test]
fn evaluate_equal() {
    let equal_expr = equal_op(num(5), num(5));
    assert_eq!(
        evaluate_expression(&equal_expr, &[]),
        Ok(crate::expression_eval::Value::Bool(true))
    );
    assert_eq!(expression_to_source(&equal_expr), "equal 5 5");
}

#[test]
fn evaluate_record_literal() {
    let record_expr = record_lit(vec![("name", str_lit("narumi")), ("age", num(3))]);
    assert_eq!(
        evaluate_expression(&record_expr, &[]),
        Ok(crate::expression_eval::Value::Record(vec![
            (
                "name".to_string(),
                crate::expression_eval::Value::String("narumi".to_string()),
            ),
            ("age".to_string(), crate::expression_eval::Value::Number(3)),
        ]))
    );
    assert_eq!(
        expression_to_source(&record_expr),
        "{name: \"narumi\", age: 3}"
    );
}

#[test]
fn evaluate_let_bindings() {
    // let x = 10 in (let y = 20 in x + y)
    let let_expr = let_bind(
        1,
        "x",
        num(10),
        let_bind(2, "y", num(20), add(var_ref(1), var_ref(2))),
    );

    assert_eq!(
        evaluate_expression(&let_expr, &[]),
        Ok(crate::expression_eval::Value::Number(30))
    );
}

#[test]
fn evaluate_part_reference_by_definition_hash() {
    let account_id =
        definy_event::event::AccountId::from_str("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
            .unwrap();
    let mod_id = definy_event::event::derive_module_id(&account_id, "legacy-mod");
    let part_hash = definy_event::event::derive_module_part_id(&mod_id, "legacy-name");
    let part_expression = num(99);
    let commit_hash =
        definy_event::EventHashId::from_str("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA").unwrap();
    let events = vec![(
        commit_hash,
        Ok((
            ed25519_dalek::Signature::from_bytes(&[0u8; 64]),
            definy_event::event::Event {
                account_id,
                time: chrono::DateTime::UNIX_EPOCH,
                content: definy_event::event::EventContent::ModuleCommit(
                    definy_event::event::ModuleCommitEvent {
                        module_name: "legacy-mod".into(),
                        module_description: "".into(),
                        parent_commit_hash: None,
                        message: "initial commit".into(),
                        parts: vec![definy_event::event::ModulePartEntry {
                            name: "legacy-name".into(),
                            part_type: Some(definy_event::event::PartType::Number),
                            description: "".into(),
                            expression: Some(part_expression),
                        }],
                    },
                ),
            },
        )),
    )];

    let reference = definy_event::event::Expression::PartReference(
        definy_event::event::PartReferenceExpression::new(part_hash.clone()),
    );

    assert_eq!(
        evaluate_expression(&reference, &events),
        Ok(crate::expression_eval::Value::Number(99))
    );
    assert_eq!(expression_to_source(&reference), part_hash.to_string());
}

#[test]
fn test_compiler_builtins() {
    use definy_event::event::{CompilerBuiltin, Expression};

    let let_expr = Expression::Compiler(CompilerBuiltin::Let);
    assert_eq!(expression_to_source(&let_expr), "[compiler let]");
    assert!(evaluate_expression(&let_expr, &[]).is_err());

    let plus_expr = Expression::Compiler(CompilerBuiltin::Plus);
    assert_eq!(expression_to_source(&plus_expr), "[compiler plus]");
    assert!(evaluate_expression(&plus_expr, &[]).is_err());

    let minus_expr = Expression::Compiler(CompilerBuiltin::Minus);
    assert_eq!(expression_to_source(&minus_expr), "[compiler minus]");
    assert!(evaluate_expression(&minus_expr, &[]).is_err());

    let num_expr = Expression::Compiler(CompilerBuiltin::NumberLiteral);
    assert_eq!(expression_to_source(&num_expr), "[compiler number literal]");
    assert!(evaluate_expression(&num_expr, &[]).is_err());

    let if_expr = Expression::Compiler(CompilerBuiltin::If);
    assert_eq!(expression_to_source(&if_expr), "[compiler if]");
    assert!(evaluate_expression(&if_expr, &[]).is_err());

    let equal_expr = Expression::Compiler(CompilerBuiltin::Equal);
    assert_eq!(expression_to_source(&equal_expr), "[compiler equal]");
    assert!(evaluate_expression(&equal_expr, &[]).is_err());

    let str_concat = Expression::Compiler(CompilerBuiltin::StringConcat);
    assert_eq!(
        expression_to_source(&str_concat),
        "[compiler string concat]"
    );
    assert!(evaluate_expression(&str_concat, &[]).is_err());

    let list_get = Expression::Compiler(CompilerBuiltin::ListGet);
    assert_eq!(expression_to_source(&list_get), "[compiler list get]");
    assert!(evaluate_expression(&list_get, &[]).is_err());
}

#[test]
fn test_string_and_list_evaluation() {
    // string concat
    let concat = Expression::StringConcat(StringConcatExpression {
        left: Box::new(str_lit("foo")),
        right: Box::new(str_lit("bar")),
    });
    assert_eq!(
        evaluate_expression(&concat, &[]).unwrap(),
        crate::expression_eval::Value::String("foobar".to_string())
    );
    assert_eq!(
        expression_to_source(&concat),
        "string_concat \"foo\" \"bar\""
    );

    // string length
    let len = Expression::StringLength(StringLengthExpression {
        value: Box::new(str_lit("hello")),
    });
    assert_eq!(
        evaluate_expression(&len, &[]).unwrap(),
        crate::expression_eval::Value::Number(5)
    );

    // string slice
    let slice = Expression::StringSlice(StringSliceExpression {
        value: Box::new(str_lit("abcdef")),
        start: Box::new(num(2)),
        end: Box::new(num(5)),
    });
    assert_eq!(
        evaluate_expression(&slice, &[]).unwrap(),
        crate::expression_eval::Value::String("cde".to_string())
    );

    // list operations
    let list_lit_expr = list_lit(vec![num(100), num(200)]);
    let list_len = Expression::ListLength(ListLengthExpression {
        value: Box::new(list_lit_expr.clone()),
    });
    assert_eq!(
        evaluate_expression(&list_len, &[]).unwrap(),
        crate::expression_eval::Value::Number(2)
    );

    let list_get = Expression::ListGet(ListGetExpression {
        list: Box::new(list_lit_expr.clone()),
        index: Box::new(num(1)),
    });
    assert_eq!(
        evaluate_expression(&list_get, &[]).unwrap(),
        crate::expression_eval::Value::Number(200)
    );

    let list_append = Expression::ListAppend(ListAppendExpression {
        list: Box::new(list_lit_expr),
        item: Box::new(num(300)),
    });
    assert_eq!(
        evaluate_expression(&list_append, &[]).unwrap(),
        crate::expression_eval::Value::List(vec![
            crate::expression_eval::Value::Number(100),
            crate::expression_eval::Value::Number(200),
            crate::expression_eval::Value::Number(300),
        ])
    );
}

#[test]
fn test_variant_unit_and_with_payload() {
    // Unit variant
    let none_var = variant_unit("none");
    assert_eq!(
        evaluate_expression(&none_var, &[]).unwrap(),
        crate::expression_eval::Value::Variant {
            tag: "none".to_string(),
            payload: None,
        }
    );
    assert_eq!(expression_to_source(&none_var), "none");

    // Variant with number payload
    let some_var = variant_val("some", num(42));
    assert_eq!(
        evaluate_expression(&some_var, &[]).unwrap(),
        crate::expression_eval::Value::Variant {
            tag: "some".to_string(),
            payload: Some(Box::new(crate::expression_eval::Value::Number(42))),
        }
    );
    assert_eq!(expression_to_source(&some_var), "some(42)");
}

#[test]
fn test_match_expression_with_payload() {
    // match some(42) {
    //   some(val) => val + 10,
    //   none => 0
    // }
    let match_expr = match_op(
        variant_val("some", num(42)),
        vec![
            match_arm_payload("some", 1, "val", add(var_ref(1), num(10))),
            match_arm_unit("none", num(0)),
        ],
        None,
    );

    assert_eq!(
        evaluate_expression(&match_expr, &[]).unwrap(),
        crate::expression_eval::Value::Number(52)
    );
}

#[test]
fn test_match_expression_branching_to_other_arm() {
    // match none {
    //   some(val) => val + 10,
    //   none => 999
    // }
    let match_expr = match_op(
        variant_unit("none"),
        vec![
            match_arm_payload("some", 1, "val", add(var_ref(1), num(10))),
            match_arm_unit("none", num(999)),
        ],
        None,
    );

    assert_eq!(
        evaluate_expression(&match_expr, &[]).unwrap(),
        crate::expression_eval::Value::Number(999)
    );
}

#[test]
fn test_match_expression_default_arm() {
    // match other {
    //   first => 1,
    //   second => 2,
    //   _ => 42
    // }
    let match_expr = match_op(
        variant_unit("third"),
        vec![
            match_arm_unit("first", num(1)),
            match_arm_unit("second", num(2)),
        ],
        Some(num(42)),
    );

    assert_eq!(
        evaluate_expression(&match_expr, &[]).unwrap(),
        crate::expression_eval::Value::Number(42)
    );
}

#[test]
fn test_record_get_evaluation_and_source() {
    let record = record_lit(vec![("score", num(95)), ("name", str_lit("alice"))]);
    let get_score = record_get(record, "score");

    assert_eq!(
        expression_to_source(&get_score),
        "{score: 95, name: \"alice\"}.score"
    );

    let val = evaluate_expression(&get_score, &[]).unwrap();
    assert_eq!(val, crate::expression_eval::Value::Number(95));
}

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
            argument: Box::new(record_get(var_ref(var_id), key)),
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
                    parameter: Box::new(PartType::TypePart(expr_hash.clone())),
                    return_type: Box::new(PartType::Number),
                }),
                description: Description::Plain("eval AST all arithmetic ops".into()),
                expression: Some(Expression::Function(FunctionExpression {
                    parameter_id: 1, // e
                    parameter_name: "e".into(),
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
    let events: Vec<crate::app_state::EventWithHash> =
        vec![(commit_hash, Ok((dummy_sig, eval_event)))];

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
        argument: Box::new(add2),
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
                expression: Some(expr_v2),
            }],
        }),
    };

    let events: Vec<crate::app_state::EventWithHash> = vec![
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
        parameter_id: 1,
        parameter_name: "x".into(),
        body: Box::new(Expression::Add(AddExpression {
            left: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            right: Box::new(Expression::Number(NumberExpression { value: 10 })),
        })),
    });
    let add_ten_content_hash = definy_event::ContentHash::from_expression(&add_ten_expr).unwrap();

    // ModuleCommitEvent で add_ten と forty_two パーツを一度にコミット
    let commit_event = Event {
        account_id: dummy_account,
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
                        parameter: Box::new(PartType::Number),
                        return_type: Box::new(PartType::Number),
                    }),
                    description: Description::Plain("adds 10 to input".into()),
                    expression: Some(add_ten_expr.clone()),
                },
                ModulePartEntry {
                    name: "forty_two".into(),
                    part_type: Some(PartType::Number),
                    description: Description::Plain("the answer".into()),
                    expression: Some(Expression::Number(NumberExpression { value: 42 })),
                },
            ],
        }),
    };

    let events: Vec<crate::app_state::EventWithHash> =
        vec![(commit_hash.clone(), Ok((dummy_sig, commit_event)))];

    // 1. プロジェクションのテスト: 2つのパーツが同時にスナップショット化されていること
    let mut state = crate::app_state::AppState::default();
    for (h, res) in &events {
        let decoded = res
            .as_ref()
            .map(|(_, e)| (dummy_sig, e.clone()))
            .map_err(|_| definy_event::VerifyAndDeserializeError::DecodeError);
        state.event_cache.insert(h.clone(), decoded);
    }
    let snapshots = crate::part_projection::collect_part_snapshots(&state);
    assert_eq!(snapshots.len(), 2);
    let s_add_ten = snapshots.iter().find(|s| s.part_name == "add_ten").unwrap();
    let s_forty_two = snapshots
        .iter()
        .find(|s| s.part_name == "forty_two")
        .unwrap();

    assert_eq!(s_add_ten.content_hash, Some(add_ten_content_hash.clone()));
    assert_eq!(
        s_forty_two.content_hash,
        Some(
            definy_event::ContentHash::from_expression(&Expression::Number(NumberExpression {
                value: 42
            }))
            .unwrap()
        )
    );

    // 2. 評価器のテスト: add_ten を ContentHash で呼び出して 32 + 10 = 42
    let call_expr = Expression::Call(CallExpression {
        function: Box::new(Expression::PartReference(
            PartReferenceExpression::with_content_hash(
                s_add_ten.definition_event_hash.clone(),
                add_ten_content_hash,
            ),
        )),
        argument: Box::new(Expression::Number(NumberExpression { value: 32 })),
    });

    assert_eq!(
        evaluate_expression(&call_expr, &events),
        Ok(crate::expression_eval::Value::Number(42))
    );
}
