//! パーツ参照（PartReference）およびモジュール型環境に関するセルフホスティング実証テスト。
//!
//! `core.part-type-lookup`, `core.type-env-lookup-part`, `core.type-check`, `core.type-check-against` における
//! モジュール内パーツ参照の宣言型解決と相互型解決の動作を実証します。

use definy_core::expression_eval::Value;
use definy_event::event::{
    Expression, ListLiteralExpression, NumberExpression, StringExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, VariantExpression, derive_module_part_id,
};

use super::helpers::{
    all_type_checker_parts, call_part2, call_part3, create_test_module_events, empty_type_env,
    get_test_account_and_mod_id, type_env_with_parts,
};
use crate::builtin_type_checker::{type_num, type_str};

/// 式 AST のパーツ参照: `part_reference({ part_definition_event_hash })`
fn expr_part_ref(part_hash: &str) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "part_reference".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![TypeLiteralItemExpression {
                key: "part_definition_event_hash".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: part_hash.into(),
                })),
            }],
        }))),
    })
}

/// 式 AST の数値リテラル: `number(n)`
fn expr_num(n: i64) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "number".into(),
        payload: Some(Box::new(Expression::Number(NumberExpression { value: n }))),
    })
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

/// パーツ型環境エントリ `{ part_definition_event_hash, part_type }` を構築します。
fn make_part_env_entry(part_hash: &str, part_type: Expression) -> Expression {
    Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "part_definition_event_hash".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: part_hash.into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "part_type".into(),
                value: Box::new(part_type),
            },
        ],
    })
}

#[test]
fn test_self_hosted_part_type_lookup_direct() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let lookup_hash = derive_module_part_id(&mod_id, "part-type-lookup");

    let events = create_test_module_events(account, parts, 110);

    let part_env = Expression::ListLiteral(ListLiteralExpression {
        items: vec![
            make_part_env_entry("hash_const_pi", type_num()),
            make_part_env_entry("hash_app_title", type_str()),
        ],
    });

    // 1. 存在するパーツ "hash_const_pi" の検索 -> ok(number)
    let call_pi = call_part2(
        lookup_hash.clone(),
        part_env.clone(),
        Expression::String(StringExpression {
            value: "hash_const_pi".into(),
        }),
    );
    let result_pi = definy_core::evaluate_expression(&call_pi, &events)
        .expect("Failed to evaluate part-type-lookup for const_pi");

    assert_eq!(
        result_pi,
        Value::Variant {
            tag: "ok".into(),
            payload: Some(Box::new(Value::Variant {
                tag: "number".into(),
                payload: None,
            })),
        }
    );

    // 2. 存在するパーツ "hash_app_title" の検索 -> ok(string)
    let call_title = call_part2(
        lookup_hash.clone(),
        part_env.clone(),
        Expression::String(StringExpression {
            value: "hash_app_title".into(),
        }),
    );
    let result_title = definy_core::evaluate_expression(&call_title, &events)
        .expect("Failed to evaluate part-type-lookup for app_title");

    assert_eq!(
        result_title,
        Value::Variant {
            tag: "ok".into(),
            payload: Some(Box::new(Value::Variant {
                tag: "string".into(),
                payload: None,
            })),
        }
    );

    // 3. 存在しないパーツ "hash_missing" の検索 -> error(part_not_found { part_definition_event_hash: "hash_missing" })
    let call_missing = call_part2(
        lookup_hash,
        part_env,
        Expression::String(StringExpression {
            value: "hash_missing".into(),
        }),
    );
    let result_missing = definy_core::evaluate_expression(&call_missing, &events)
        .expect("Failed to evaluate part-type-lookup for missing part");

    match result_missing {
        Value::Variant { tag, payload } => {
            assert_eq!(tag.as_str(), "error");
            let err = payload.expect("error payload");
            match *err {
                Value::Variant { tag, payload } => {
                    assert_eq!(tag.as_str(), "part_not_found");
                    let rec = payload.expect("part_not_found record");
                    match *rec {
                        Value::Record(fields) => {
                            let f = fields
                                .iter()
                                .find(|(k, _)| k == "part_definition_event_hash")
                                .expect("field part_definition_event_hash");
                            assert_eq!(f.1, Value::String("hash_missing".into()));
                        }
                        other => panic!("expected record, got {:?}", other),
                    }
                }
                other => panic!("expected part_not_found, got {:?}", other),
            }
        }
        other => panic!("expected error, got {:?}", other),
    }
}

#[test]
fn test_self_hosted_part_reference_type_checking() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_check_hash = derive_module_part_id(&mod_id, "type-check");

    let events = create_test_module_events(account, parts, 111);

    let parts_list = Expression::ListLiteral(ListLiteralExpression {
        items: vec![
            make_part_env_entry("part_answer", type_num()),
            make_part_env_entry("part_greeting", type_str()),
        ],
    });
    let env = type_env_with_parts(parts_list);

    // 1. part_reference("part_answer") -> ok(number)
    let check_answer = call_part2(
        type_check_hash.clone(),
        expr_part_ref("part_answer"),
        env.clone(),
    );
    let res_answer = definy_core::evaluate_expression(&check_answer, &events)
        .expect("evaluate type check for part_answer");

    assert_eq!(
        res_answer,
        Value::Variant {
            tag: "ok".into(),
            payload: Some(Box::new(Value::Variant {
                tag: "number".into(),
                payload: None,
            })),
        }
    );

    // 2. part_reference("part_greeting") -> ok(string)
    let check_greeting = call_part2(
        type_check_hash.clone(),
        expr_part_ref("part_greeting"),
        env.clone(),
    );
    let res_greeting = definy_core::evaluate_expression(&check_greeting, &events)
        .expect("evaluate type check for part_greeting");

    assert_eq!(
        res_greeting,
        Value::Variant {
            tag: "ok".into(),
            payload: Some(Box::new(Value::Variant {
                tag: "string".into(),
                payload: None,
            })),
        }
    );

    // 3. 空環境での検索 -> error(part_not_found)
    let check_in_empty = call_part2(
        type_check_hash.clone(),
        expr_part_ref("part_answer"),
        empty_type_env(),
    );
    let res_in_empty = definy_core::evaluate_expression(&check_in_empty, &events)
        .expect("evaluate type check in empty env");

    match res_in_empty {
        Value::Variant { tag, payload } => {
            assert_eq!(tag.as_str(), "error");
            let err = payload.expect("error payload");
            assert!(
                matches!(*err, Value::Variant { ref tag, .. } if tag == "part_not_found"),
                "expected part_not_found, got {:?}",
                err
            );
        }
        other => panic!("expected error, got {:?}", other),
    }

    // 4. パーツ参照を含む複合式: part_reference("part_answer") + 10 -> ok(number)
    let compound_expr = expr_add(expr_part_ref("part_answer"), expr_num(10));
    let check_compound = call_part2(type_check_hash, compound_expr, env);
    let res_compound = definy_core::evaluate_expression(&check_compound, &events)
        .expect("evaluate type check for compound expression with part_reference");

    assert_eq!(
        res_compound,
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
fn test_self_hosted_part_reference_check_against() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_check_against_hash = derive_module_part_id(&mod_id, "type-check-against");

    let events = create_test_module_events(account, parts, 112);

    let parts_list = Expression::ListLiteral(ListLiteralExpression {
        items: vec![make_part_env_entry("part_answer", type_num())],
    });
    let env = type_env_with_parts(parts_list);

    // 1. 期待型 number に合致 -> ok(number)
    let check_num = call_part3(
        type_check_against_hash.clone(),
        expr_part_ref("part_answer"),
        env.clone(),
        type_num(),
    );
    let res_num = definy_core::evaluate_expression(&check_num, &events)
        .expect("evaluate type-check-against with matching type");

    assert_eq!(
        res_num,
        Value::Variant {
            tag: "ok".into(),
            payload: Some(Box::new(Value::Variant {
                tag: "number".into(),
                payload: None,
            })),
        }
    );

    // 2. 期待型 string に不一致 -> error(type_mismatch)
    let check_mismatch = call_part3(
        type_check_against_hash,
        expr_part_ref("part_answer"),
        env,
        type_str(),
    );
    let res_mismatch = definy_core::evaluate_expression(&check_mismatch, &events)
        .expect("evaluate type-check-against with mismatching type");

    match res_mismatch {
        Value::Variant { tag, payload } => {
            assert_eq!(tag.as_str(), "error");
            let err = payload.expect("error payload");
            assert!(
                matches!(*err, Value::Variant { ref tag, .. } if tag == "type_mismatch"),
                "expected type_mismatch, got {:?}",
                err
            );
        }
        other => panic!("expected error, got {:?}", other),
    }
}
