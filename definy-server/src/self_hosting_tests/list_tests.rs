//! リスト式（List Literal）に関するセルフホスティング実証テスト。
//!
//! `core.type-check`, `core.type-check-against`, `core.type-assignable` における
//! リスト式の要素型推論、空リストに対する期待型検査、異種要素の型不一致検出、
//! およびリスト型の共変サブタイピング（Covariant Subtyping）を実証します。

use definy_core::expression_eval::Value;
use definy_event::event::{
    Expression, ListLiteralExpression, NumberExpression, StringExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, VariantExpression, derive_module_part_id,
};

use super::helpers::{
    all_evaluator_parts, all_type_checker_parts, call_part, create_test_module_events,
    empty_type_env, get_test_account_and_mod_id,
};

/// 式 AST の数値リテラル: `number(n)`
fn expr_num(n: i64) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "number".into(),
        payload: Some(Box::new(Expression::Number(NumberExpression { value: n }))),
    })
}

/// 式 AST の文字列リテラル: `string(s)`
fn expr_str(s: &str) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "string".into(),
        payload: Some(Box::new(Expression::String(StringExpression {
            value: s.into(),
        }))),
    })
}

/// 式 AST のリストリテラル: `list([ item1, item2, ... ])`
fn ast_list(items: Vec<Expression>) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "list".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items,
        }))),
    })
}

/// 式 AST のレコードリテラル: `record([ { key, value } ])`
fn ast_record(fields: Vec<(&str, Expression)>) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "record".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: fields
                .into_iter()
                .map(|(k, v)| {
                    Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![
                            TypeLiteralItemExpression {
                                key: "key".into(),
                                value: Box::new(Expression::String(StringExpression {
                                    value: k.into(),
                                })),
                            },
                            TypeLiteralItemExpression {
                                key: "value".into(),
                                value: Box::new(v),
                            },
                        ],
                    })
                })
                .collect(),
        }))),
    })
}

/// 型 AST の数値型: `number`
fn type_num() -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "number".into(),
        payload: None,
    })
}

/// 型 AST の文字列型: `string`
fn type_str() -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "string".into(),
        payload: None,
    })
}

/// 型 AST のリスト型: `list({ item_type })`
fn type_list(item_type: Expression) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "list".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![TypeLiteralItemExpression {
                key: "item_type".into(),
                value: Box::new(item_type),
            }],
        }))),
    })
}

/// 型 AST のレコード型: `record([ { key, field_type } ])`
fn type_record(fields: Vec<(&str, Expression)>) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "record".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: fields
                .into_iter()
                .map(|(k, t)| {
                    Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![
                            TypeLiteralItemExpression {
                                key: "key".into(),
                                value: Box::new(Expression::String(StringExpression {
                                    value: k.into(),
                                })),
                            },
                            TypeLiteralItemExpression {
                                key: "field_type".into(),
                                value: Box::new(t),
                            },
                        ],
                    })
                })
                .collect(),
        }))),
    })
}

/// 空の型環境
fn empty_env() -> Expression {
    empty_type_env()
}

fn get_field<'a>(fields: &'a [(String, Value)], key: &str) -> &'a Value {
    fields
        .iter()
        .find(|(k, _)| k == key)
        .map(|(_, v)| v)
        .unwrap_or_else(|| panic!("field '{}' not found in record", key))
}

#[test]
fn test_self_hosted_list_number_type_inference() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_check_hash = derive_module_part_id(&mod_id, "type-check");

    let events = create_test_module_events(account, parts, 110);

    // リスト式: [10, 20, 30]
    let list_expr = ast_list(vec![expr_num(10), expr_num(20), expr_num(30)]);

    let check_call = call_part(
        type_check_hash,
        &[("expr", list_expr), ("env", empty_env())],
    );
    let result = definy_core::evaluate_expression(&check_call, &events)
        .expect("evaluate type check on number list");

    match &result {
        Value::Variant { tag, payload } => {
            assert_eq!(tag.as_str(), "ok");
            let p = payload.as_ref().expect("ok has payload");
            match p.as_ref() {
                Value::Variant {
                    tag: inner_tag,
                    payload: inner_payload,
                } => {
                    assert_eq!(inner_tag.as_str(), "list");
                    let rec = inner_payload.as_ref().expect("list payload");
                    match rec.as_ref() {
                        Value::Record(fields) => {
                            let item_t = get_field(fields, "item_type");
                            match item_t {
                                Value::Variant { tag: t_tag, .. } => {
                                    assert_eq!(t_tag.as_str(), "number");
                                }
                                other => panic!("expected number type variant, got {:?}", other),
                            }
                        }
                        other => panic!("expected record payload for list, got {:?}", other),
                    }
                }
                other => panic!("expected list type variant, got {:?}", other),
            }
        }
        other => panic!("expected ok result, got {:?}", other),
    }
}

#[test]
fn test_self_hosted_list_string_type_inference() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_check_hash = derive_module_part_id(&mod_id, "type-check");

    let events = create_test_module_events(account, parts, 111);

    // リスト式: ["hello", "world"]
    let list_expr = ast_list(vec![expr_str("hello"), expr_str("world")]);

    let check_call = call_part(
        type_check_hash,
        &[("expr", list_expr), ("env", empty_env())],
    );
    let result = definy_core::evaluate_expression(&check_call, &events)
        .expect("evaluate type check on string list");

    match &result {
        Value::Variant { tag, payload } => {
            assert_eq!(tag.as_str(), "ok");
            let p = payload.as_ref().expect("ok has payload");
            match p.as_ref() {
                Value::Variant {
                    tag: inner_tag,
                    payload: inner_payload,
                } => {
                    assert_eq!(inner_tag.as_str(), "list");
                    let rec = inner_payload.as_ref().expect("list payload");
                    match rec.as_ref() {
                        Value::Record(fields) => {
                            let item_t = get_field(fields, "item_type");
                            match item_t {
                                Value::Variant { tag: t_tag, .. } => {
                                    assert_eq!(t_tag.as_str(), "string");
                                }
                                other => panic!("expected string type variant, got {:?}", other),
                            }
                        }
                        other => panic!("expected record payload for list, got {:?}", other),
                    }
                }
                other => panic!("expected list type variant, got {:?}", other),
            }
        }
        other => panic!("expected ok result, got {:?}", other),
    }
}

#[test]
fn test_self_hosted_empty_list_inference_fails_without_expected_type() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_check_hash = derive_module_part_id(&mod_id, "type-check");

    let events = create_test_module_events(account, parts, 112);

    // 空リスト式: []
    let list_expr = ast_list(vec![]);

    let check_call = call_part(
        type_check_hash,
        &[("expr", list_expr), ("env", empty_env())],
    );
    let result = definy_core::evaluate_expression(&check_call, &events)
        .expect("evaluate type check on empty list without expected type");

    match &result {
        Value::Variant { tag, payload } => {
            assert_eq!(tag.as_str(), "error");
            let p = payload.as_ref().expect("error has payload");
            match p.as_ref() {
                Value::Variant { tag: err_tag, .. } => {
                    assert_eq!(err_tag.as_str(), "cannot_infer_empty_list");
                }
                other => panic!("expected cannot_infer_empty_list, got {:?}", other),
            }
        }
        other => panic!("expected error result, got {:?}", other),
    }
}

#[test]
fn test_self_hosted_empty_list_checked_against_expected_type() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_check_against_hash = derive_module_part_id(&mod_id, "type-check-against");

    let events = create_test_module_events(account, parts, 113);

    // 空リスト式: []
    let list_expr = ast_list(vec![]);
    // 期待型: list<number>
    let expected = type_list(type_num());

    let check_call = call_part(
        type_check_against_hash,
        &[
            ("expr", list_expr),
            ("env", empty_env()),
            ("expected_type", expected),
        ],
    );
    let result = definy_core::evaluate_expression(&check_call, &events)
        .expect("evaluate type check against on empty list");

    match &result {
        Value::Variant { tag, payload } => {
            assert_eq!(tag.as_str(), "ok");
            let p = payload.as_ref().expect("ok has payload");
            match p.as_ref() {
                Value::Variant {
                    tag: inner_tag,
                    payload: inner_payload,
                } => {
                    assert_eq!(inner_tag.as_str(), "list");
                    let rec = inner_payload.as_ref().expect("list payload");
                    match rec.as_ref() {
                        Value::Record(fields) => {
                            let item_t = get_field(fields, "item_type");
                            match item_t {
                                Value::Variant { tag: t_tag, .. } => {
                                    assert_eq!(t_tag.as_str(), "number");
                                }
                                other => panic!("expected number type variant, got {:?}", other),
                            }
                        }
                        other => panic!("expected record payload, got {:?}", other),
                    }
                }
                other => panic!("expected list type variant, got {:?}", other),
            }
        }
        other => panic!("expected ok result, got {:?}", other),
    }
}

#[test]
fn test_self_hosted_list_heterogeneous_items_detects_mismatch() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_check_hash = derive_module_part_id(&mod_id, "type-check");

    let events = create_test_module_events(account, parts, 114);

    // 異種要素リスト: [10, "string_item"]
    let list_expr = ast_list(vec![expr_num(10), expr_str("string_item")]);

    let check_call = call_part(
        type_check_hash,
        &[("expr", list_expr), ("env", empty_env())],
    );
    let result = definy_core::evaluate_expression(&check_call, &events)
        .expect("evaluate type check on heterogeneous list");

    match &result {
        Value::Variant { tag, payload } => {
            assert_eq!(tag.as_str(), "error");
            let p = payload.as_ref().expect("error has payload");
            match p.as_ref() {
                Value::Variant { tag: err_tag, .. } => {
                    assert_eq!(err_tag.as_str(), "type_mismatch");
                }
                other => panic!("expected type_mismatch error, got {:?}", other),
            }
        }
        other => panic!("expected error result, got {:?}", other),
    }
}

#[test]
fn test_self_hosted_list_covariant_subtyping() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_assignable_hash = derive_module_part_id(&mod_id, "type-assignable");
    let type_check_against_hash = derive_module_part_id(&mod_id, "type-check-against");

    let events = create_test_module_events(account, parts, 115);

    // actual_type: list<{ x: number, y: string }>
    let actual_item_type = type_record(vec![("x", type_num()), ("y", type_str())]);
    let actual_list_type = type_list(actual_item_type);

    // expected_type: list<{ x: number }>
    let expected_item_type = type_record(vec![("x", type_num())]);
    let expected_list_type = type_list(expected_item_type.clone());

    // 1. type-assignable による共変サブタイピング検証
    // list<{ x: number, y: string }> は list<{ x: number }> に代入適合すべき
    let assignable_call = call_part(
        type_assignable_hash.clone(),
        &[
            ("sub", actual_list_type.clone()),
            ("sup", expected_list_type.clone()),
        ],
    );
    let is_assignable = definy_core::evaluate_expression(&assignable_call, &events)
        .expect("evaluate type-assignable for list subtyping");
    assert_eq!(is_assignable, Value::Bool(true));

    // 逆向きは不適合
    let reverse_call = call_part(
        type_assignable_hash,
        &[
            ("sub", expected_list_type.clone()),
            ("sup", actual_list_type),
        ],
    );
    let is_reverse_assignable = definy_core::evaluate_expression(&reverse_call, &events)
        .expect("evaluate reverse type-assignable");
    assert_eq!(is_reverse_assignable, Value::Bool(false));

    // 2. type-check-against によるレコードリスト式の検査
    // [{ x: 10, y: "a" }, { x: 20, y: "b" }] を expected_list_type (list<{ x: number }>) で検査
    let record_list_expr = ast_list(vec![
        ast_record(vec![("x", expr_num(10)), ("y", expr_str("a"))]),
        ast_record(vec![("x", expr_num(20)), ("y", expr_str("b"))]),
    ]);

    let against_call = call_part(
        type_check_against_hash,
        &[
            ("expr", record_list_expr),
            ("env", empty_env()),
            ("expected_type", expected_list_type),
        ],
    );
    let against_result = definy_core::evaluate_expression(&against_call, &events)
        .expect("evaluate type-check-against with record list");

    match &against_result {
        Value::Variant { tag, .. } => {
            assert_eq!(tag.as_str(), "ok");
        }
        other => panic!("expected ok for record list against check, got {:?}", other),
    }
}

/// 式 AST の加算: `add({ left, right })`
fn expr_add(left: Expression, right: Expression) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "add".into(),
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
    })
}

#[test]
fn test_self_hosted_list_eval_value_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_evaluator_parts(&mod_id);
    let eval_hash = derive_module_part_id(&mod_id, "eval-value");

    let events = create_test_module_events(account, parts, 185);

    // 1. 要素を含むリスト式: [ 10 + 20, 42 ]
    let list_ast = ast_list(vec![expr_add(expr_num(10), expr_num(20)), expr_num(42)]);
    let empty_env_val = Expression::ListLiteral(ListLiteralExpression { items: vec![] });
    let eval_call = call_part(
        eval_hash.clone(),
        &[("expr", list_ast), ("env", empty_env_val.clone())],
    );

    let eval_res = definy_core::evaluate_expression(&eval_call, &events)
        .expect("Failed to evaluate list literal expression");

    let expected_list_val = Value::Variant {
        tag: "list".into(),
        payload: Some(Box::new(Value::List(vec![
            Value::Variant {
                tag: "number".into(),
                payload: Some(Box::new(Value::Number(30))),
            },
            Value::Variant {
                tag: "number".into(),
                payload: Some(Box::new(Value::Number(42))),
            },
        ]))),
    };
    assert_eq!(eval_res, expected_list_val);

    // 2. 空リスト式: []
    let empty_list_ast = ast_list(vec![]);
    let eval_empty_call = call_part(
        eval_hash,
        &[("expr", empty_list_ast), ("env", empty_env_val)],
    );
    let eval_empty_res = definy_core::evaluate_expression(&eval_empty_call, &events)
        .expect("Failed to evaluate empty list literal expression");

    let expected_empty_val = Value::Variant {
        tag: "list".into(),
        payload: Some(Box::new(Value::List(vec![]))),
    };
    assert_eq!(eval_empty_res, expected_empty_val);
}

#[test]
fn test_self_hosted_list_value_equals_execution() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_evaluator_parts(&mod_id);
    let val_equals_hash = derive_module_part_id(&mod_id, "value-equals");

    let events = create_test_module_events(account, parts, 186);

    let val_num = |n: i64| {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "number".into(),
            payload: Some(Box::new(Expression::Number(NumberExpression { value: n }))),
        })
    };

    let val_list = |items: Vec<Expression>| {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "list".into(),
            payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
                items,
            }))),
        })
    };

    // 1. 同一のリスト値: [1, 2] == [1, 2] -> true
    let list_a = val_list(vec![val_num(1), val_num(2)]);
    let list_b = val_list(vec![val_num(1), val_num(2)]);
    let eq_call = call_part(val_equals_hash.clone(), &[("a", list_a), ("b", list_b)]);
    let eq_res = definy_core::evaluate_expression(&eq_call, &events)
        .expect("evaluate value-equals on identical lists");
    assert_eq!(eq_res, Value::Bool(true));

    // 2. 異なる要素を持つリスト値: [1, 2] == [1, 3] -> false
    let list_c = val_list(vec![val_num(1), val_num(3)]);
    let neq_call = call_part(
        val_equals_hash.clone(),
        &[("a", val_list(vec![val_num(1), val_num(2)])), ("b", list_c)],
    );
    let neq_res = definy_core::evaluate_expression(&neq_call, &events)
        .expect("evaluate value-equals on different item lists");
    assert_eq!(neq_res, Value::Bool(false));

    // 3. 異なる長さのリスト値: [1] == [1, 2] -> false
    let diff_len_call = call_part(
        val_equals_hash.clone(),
        &[
            ("a", val_list(vec![val_num(1)])),
            ("b", val_list(vec![val_num(1), val_num(2)])),
        ],
    );
    let diff_len_res = definy_core::evaluate_expression(&diff_len_call, &events)
        .expect("evaluate value-equals on different length lists");
    assert_eq!(diff_len_res, Value::Bool(false));

    // 4. 空リスト同士: [] == [] -> true
    let empty_eq_call = call_part(
        val_equals_hash.clone(),
        &[("a", val_list(vec![])), ("b", val_list(vec![]))],
    );
    let empty_eq_res = definy_core::evaluate_expression(&empty_eq_call, &events)
        .expect("evaluate value-equals on empty lists");
    assert_eq!(empty_eq_res, Value::Bool(true));

    // 5. 型違い: [] == 0 -> false
    let type_mismatch_call = call_part(
        val_equals_hash,
        &[("a", val_list(vec![])), ("b", val_num(0))],
    );
    let type_mismatch_res = definy_core::evaluate_expression(&type_mismatch_call, &events)
        .expect("evaluate value-equals on type mismatch");
    assert_eq!(type_mismatch_res, Value::Bool(false));
}
