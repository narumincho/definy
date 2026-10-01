//! 直和型（Union）およびパターンマッチ（Match）に関するセルフホスティング実証テスト。
//!
//! `core.type-check`, `core.type-check-against`, `core.type-assignable` における
//! 直和型バリアント（Variant）構築とパターンマッチ（Match）の型検査、戻り値型の一致、
//! および網羅性検査（Exhaustiveness checking）を実証します。

use definy_core::expression_eval::Value;
use definy_event::event::{
    Expression, ListLiteralExpression, NumberExpression, StringExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, VariantExpression, derive_module_part_id,
};

use super::helpers::{
    all_type_checker_parts, call_part2, call_part3, create_test_module_events,
    get_test_account_and_mod_id,
};

/// AST 式直和型ヘルパー: `variant({ tag, payload: some(expr) })`
fn ast_variant_some(tag: &str, payload_expr: Expression) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "variant".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "tag".into(),
                    value: Box::new(Expression::String(StringExpression { value: tag.into() })),
                },
                TypeLiteralItemExpression {
                    key: "payload".into(),
                    value: Box::new(Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: None,
                        tag: "some".into(),
                        payload: Some(Box::new(payload_expr)),
                    })),
                },
            ],
        }))),
    })
}

/// AST 式直和型ヘルパー: `variant({ tag, payload: none })`
fn ast_variant_none(tag: &str) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "variant".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "tag".into(),
                    value: Box::new(Expression::String(StringExpression { value: tag.into() })),
                },
                TypeLiteralItemExpression {
                    key: "payload".into(),
                    value: Box::new(Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: None,
                        tag: "none".into(),
                        payload: None,
                    })),
                },
            ],
        }))),
    })
}

/// AST 型直和型ヘルパー: `union([ { tag, payload_type: none | some(type) } ])`
fn ast_union_type(variants: Vec<(&str, Option<Expression>)>) -> Expression {
    let items = variants
        .into_iter()
        .map(|(tag, payload)| {
            let payload_variant = match payload {
                None => Expression::Variant(VariantExpression {
                    type_part_definition_event_hash: None,
                    tag: "none".into(),
                    payload: None,
                }),
                Some(t) => Expression::Variant(VariantExpression {
                    type_part_definition_event_hash: None,
                    tag: "some".into(),
                    payload: Some(Box::new(t)),
                }),
            };
            Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "tag".into(),
                        value: Box::new(Expression::String(StringExpression { value: tag.into() })),
                    },
                    TypeLiteralItemExpression {
                        key: "payload_type".into(),
                        value: Box::new(payload_variant),
                    },
                ],
            })
        })
        .collect();

    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "union".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items,
        }))),
    })
}

/// AST 式 match ヘルパー: `match({ target, arms })`
fn ast_match(target: Expression, arms: Vec<(&str, i64, Expression)>) -> Expression {
    let arm_items = arms
        .into_iter()
        .map(|(tag, var_id, body)| {
            Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "tag".into(),
                        value: Box::new(Expression::String(StringExpression { value: tag.into() })),
                    },
                    TypeLiteralItemExpression {
                        key: "variable_id".into(),
                        value: Box::new(Expression::Number(NumberExpression { value: var_id })),
                    },
                    TypeLiteralItemExpression {
                        key: "body".into(),
                        value: Box::new(body),
                    },
                ],
            })
        })
        .collect();

    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "match".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "target".into(),
                    value: Box::new(target),
                },
                TypeLiteralItemExpression {
                    key: "arms".into(),
                    value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                        items: arm_items,
                    })),
                },
            ],
        }))),
    })
}

fn type_num() -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "number".into(),
        payload: None,
    })
}

fn expr_num(n: i64) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "number".into(),
        payload: Some(Box::new(Expression::Number(NumberExpression { value: n }))),
    })
}

fn expr_var(id: i64) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "variable".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![TypeLiteralItemExpression {
                key: "variable_id".into(),
                value: Box::new(Expression::Number(NumberExpression { value: id })),
            }],
        }))),
    })
}

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
fn test_self_hosted_variant_type_inference_and_subtyping() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_check_hash = derive_module_part_id(&mod_id, "type-check");
    let type_check_against_hash = derive_module_part_id(&mod_id, "type-check-against");
    let type_assignable_hash = derive_module_part_id(&mod_id, "type-assignable");

    let events = create_test_module_events(account, parts, 100);

    // 1. Variant 式の型推論: variant("some", 42)
    let var_some_expr = ast_variant_some("some", expr_num(42));
    let env_empty = Expression::ListLiteral(ListLiteralExpression { items: vec![] });

    let check_call = call_part2(type_check_hash, var_some_expr.clone(), env_empty.clone());
    let inferred = definy_core::evaluate_expression(&check_call, &events)
        .expect("evaluate type check inferred");

    match &inferred {
        Value::Variant { tag, payload } => {
            assert_eq!(tag.as_str(), "ok");
            let p = payload.as_ref().expect("ok should have payload");
            match p.as_ref() {
                Value::Variant {
                    tag: tag_inner,
                    payload: p_inner,
                } => {
                    assert_eq!(tag_inner.as_str(), "union");
                    let variants_list = p_inner.as_ref().expect("union list");
                    match variants_list.as_ref() {
                        Value::List(list) => {
                            assert_eq!(list.len(), 1);
                        }
                        other => panic!("expected list, got {:?}", other),
                    }
                }
                other => panic!("expected union variant, got {:?}", other),
            }
        }
        other => panic!("expected ok, got {:?}", other),
    }

    // 2. 直和型のサブタイピング: Option<number> への代入可能性
    // Option<number> = union([ ("none", none), ("some", some(number)) ])
    let option_num_type = ast_union_type(vec![("none", None), ("some", Some(type_num()))]);

    // inferred_type（some(number) のみを持つ union）が Option<number> に代入可能か
    let assignable_call = call_part2(
        type_assignable_hash,
        ast_union_type(vec![("some", Some(type_num()))]),
        option_num_type.clone(),
    );
    let assignable_res =
        definy_core::evaluate_expression(&assignable_call, &events).expect("evaluate assignable");
    assert_eq!(assignable_res, Value::Bool(true));

    // 3. check-against で variant("some", 42) を Option<number> に対して検査
    let against_call = call_part3(
        type_check_against_hash,
        var_some_expr,
        env_empty,
        option_num_type,
    );
    let against_res =
        definy_core::evaluate_expression(&against_call, &events).expect("evaluate check against");
    match &against_res {
        Value::Variant { tag, .. } => {
            assert_eq!(
                tag.as_str(),
                "ok",
                "check-against should succeed for variant in union"
            );
        }
        other => panic!("expected ok, got {:?}", other),
    }
}

#[test]
fn test_self_hosted_match_expression_type_checking() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_check_hash = derive_module_part_id(&mod_id, "type-check");

    let events = create_test_module_events(account, parts, 101);

    // Option<number> = union([ ("none", none), ("some", some(number)) ])
    let option_num_type = ast_union_type(vec![("none", None), ("some", Some(type_num()))]);
    let env_with_option = Expression::ListLiteral(ListLiteralExpression {
        items: vec![Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "variable_id".into(),
                    value: Box::new(Expression::Number(NumberExpression { value: 100 })),
                },
                TypeLiteralItemExpression {
                    key: "var_type".into(),
                    value: Box::new(option_num_type),
                },
            ],
        })],
    });

    // target: variable(100) (型は Option<number>)
    // match target { some(x) => x + 10, none => 0 }
    // x = variable(1)
    let match_expr = ast_match(
        expr_var(100),
        vec![
            ("some", 1, expr_add(expr_var(1), expr_num(10))),
            ("none", 2, expr_num(0)),
        ],
    );

    let check_call = call_part2(type_check_hash, match_expr, env_with_option);
    let result =
        definy_core::evaluate_expression(&check_call, &events).expect("evaluate match type check");
    match result {
        Value::Variant { tag, payload } => {
            assert_eq!(tag.as_str(), "ok", "match type checking should succeed");
            let p = payload.expect("payload");
            match p.as_ref() {
                Value::Variant { tag: t_tag, .. } => {
                    assert_eq!(
                        t_tag.as_str(),
                        "number",
                        "match expression should return number type"
                    );
                }
                other => panic!("expected number type, got {:?}", other),
            }
        }
        other => panic!("expected ok, got {:?}", other),
    }
}

#[test]
fn test_self_hosted_match_expression_detects_type_mismatch() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_check_hash = derive_module_part_id(&mod_id, "type-check");

    let events = create_test_module_events(account, parts, 102);

    // Option<number> = union([ ("none", none), ("some", some(number)) ])
    let option_num_type = ast_union_type(vec![("none", None), ("some", Some(type_num()))]);
    let env_with_option = Expression::ListLiteral(ListLiteralExpression {
        items: vec![Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "variable_id".into(),
                    value: Box::new(Expression::Number(NumberExpression { value: 100 })),
                },
                TypeLiteralItemExpression {
                    key: "var_type".into(),
                    value: Box::new(option_num_type),
                },
            ],
        })],
    });

    // target: variable(100) (型は Option<number>)
    // match target { some(x) => x + 1, none => "hello" }
    // 枝の型が number と string で異なる！
    let expr_str_hello = Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "string".into(),
        payload: Some(Box::new(Expression::String(StringExpression {
            value: "hello".into(),
        }))),
    });

    let match_expr = ast_match(
        expr_var(100),
        vec![
            ("some", 1, expr_add(expr_var(1), expr_num(1))),
            ("none", 2, expr_str_hello),
        ],
    );

    let check_call = call_part2(type_check_hash, match_expr, env_with_option);
    let result =
        definy_core::evaluate_expression(&check_call, &events).expect("evaluate type mismatch");
    match result {
        Value::Variant { tag, payload } => {
            assert_eq!(
                tag.as_str(),
                "error",
                "should detect type mismatch across arms"
            );
            let err = payload.expect("error payload");
            match err.as_ref() {
                Value::Variant { tag: err_tag, .. } => {
                    assert_eq!(err_tag.as_str(), "type_mismatch");
                }
                other => panic!("expected type_mismatch, got {:?}", other),
            }
        }
        other => panic!("expected error, got {:?}", other),
    }
}

#[test]
fn test_self_hosted_match_expression_detects_non_exhaustive_arms() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_check_hash = derive_module_part_id(&mod_id, "type-check");

    let events = create_test_module_events(account, parts, 103);

    // 環境に target_var (Option<number> = union([none, some(number)])) を束縛
    // env = [ { variable_id: 100, var_type: Option<number> } ]
    let option_num_type = ast_union_type(vec![("none", None), ("some", Some(type_num()))]);
    let env_with_option = Expression::ListLiteral(ListLiteralExpression {
        items: vec![Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "variable_id".into(),
                    value: Box::new(Expression::Number(NumberExpression { value: 100 })),
                },
                TypeLiteralItemExpression {
                    key: "var_type".into(),
                    value: Box::new(option_num_type),
                },
            ],
        })],
    });

    // target: variable(100) (型は Option<number>)
    // match target { some(x) => x + 1 }
    // "none" のアームが欠落している！
    let match_non_exhaustive = ast_match(
        expr_var(100),
        vec![("some", 1, expr_add(expr_var(1), expr_num(1)))],
    );

    let check_call = call_part2(type_check_hash, match_non_exhaustive, env_with_option);
    let result = definy_core::evaluate_expression(&check_call, &events)
        .expect("evaluate non exhaustive match");
    match result {
        Value::Variant { tag, payload } => {
            assert_eq!(tag.as_str(), "error", "should detect non-exhaustive match");
            let err = payload.expect("error payload");
            match err.as_ref() {
                Value::Variant {
                    tag: err_tag,
                    payload: p,
                } => {
                    assert_eq!(err_tag.as_str(), "non_exhaustive_match");
                    let rec = p.as_ref().expect("record payload");
                    match rec.as_ref() {
                        Value::Record(fields) => {
                            let missing_tag = fields
                                .iter()
                                .find(|(key, _)| key == "missing_tag")
                                .expect("missing_tag field");
                            assert_eq!(missing_tag.1, Value::String("none".into()));
                        }
                        other => panic!("expected record, got {:?}", other),
                    }
                }
                other => panic!("expected non_exhaustive_match, got {:?}", other),
            }
        }
        other => panic!("expected error, got {:?}", other),
    }
}

#[test]
fn test_self_hosted_match_expression_detects_unknown_variant() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_check_hash = derive_module_part_id(&mod_id, "type-check");

    let events = create_test_module_events(account, parts, 104);

    let option_num_type = ast_union_type(vec![("none", None), ("some", Some(type_num()))]);
    let env_with_option = Expression::ListLiteral(ListLiteralExpression {
        items: vec![Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "variable_id".into(),
                    value: Box::new(Expression::Number(NumberExpression { value: 100 })),
                },
                TypeLiteralItemExpression {
                    key: "var_type".into(),
                    value: Box::new(option_num_type),
                },
            ],
        })],
    });

    // target: Option<number> (バリアントは some, none)
    // match target { some(x) => x + 1, invalid_tag => 0 }
    // invalid_tag は Option<number> に存在しない！
    let match_unknown = ast_match(
        expr_var(100),
        vec![
            ("some", 1, expr_add(expr_var(1), expr_num(1))),
            ("invalid_tag", 2, expr_num(0)),
        ],
    );

    let check_call = call_part2(type_check_hash, match_unknown, env_with_option);
    let result =
        definy_core::evaluate_expression(&check_call, &events).expect("evaluate unknown variant");
    match result {
        Value::Variant { tag, payload } => {
            assert_eq!(tag.as_str(), "error", "should detect unknown variant tag");
            let err = payload.expect("error payload");
            match err.as_ref() {
                Value::Variant {
                    tag: err_tag,
                    payload: p,
                } => {
                    assert_eq!(err_tag.as_str(), "variant_not_found");
                    let rec = p.as_ref().expect("record payload");
                    match rec.as_ref() {
                        Value::Record(fields) => {
                            let tag_field = fields
                                .iter()
                                .find(|(key, _)| key == "tag")
                                .expect("tag field");
                            assert_eq!(tag_field.1, Value::String("invalid_tag".into()));
                        }
                        other => panic!("expected record, got {:?}", other),
                    }
                }
                other => panic!("expected variant_not_found, got {:?}", other),
            }
        }
        other => panic!("expected error, got {:?}", other),
    }
}

#[test]
fn test_self_hosted_variant_none_inference_and_against() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let parts = all_type_checker_parts(&mod_id);
    let type_check_hash = derive_module_part_id(&mod_id, "type-check");
    let type_check_against_hash = derive_module_part_id(&mod_id, "type-check-against");

    let events = create_test_module_events(account, parts, 105);
    let env_empty = Expression::ListLiteral(ListLiteralExpression { items: vec![] });

    // variant("none", none)
    let var_none_expr = ast_variant_none("none");

    // 1. 型推論
    let check_call = call_part2(type_check_hash, var_none_expr.clone(), env_empty.clone());
    let inferred =
        definy_core::evaluate_expression(&check_call, &events).expect("evaluate none type check");
    match inferred {
        Value::Variant { tag, .. } => {
            assert_eq!(tag.as_str(), "ok");
        }
        other => panic!("expected ok, got {:?}", other),
    }

    // 2. Option<number> に対する check-against
    let option_num_type = ast_union_type(vec![("none", None), ("some", Some(type_num()))]);
    let against_call = call_part3(
        type_check_against_hash,
        var_none_expr,
        env_empty,
        option_num_type,
    );
    let against_res = definy_core::evaluate_expression(&against_call, &events)
        .expect("evaluate against for none");
    match against_res {
        Value::Variant { tag, .. } => {
            assert_eq!(tag.as_str(), "ok", "none variant should match Option");
        }
        other => panic!("expected ok, got {:?}", other),
    }
}
