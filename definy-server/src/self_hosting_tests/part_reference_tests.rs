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
    all_type_checker_parts, all_validator_parts, call_part1, call_part2, call_part3,
    create_test_module_events, empty_type_env, get_test_account_and_mod_id, type_env_with_parts,
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

/// `core.validate-module` において、パーツ参照を含む複数パーツから成るモジュールが
/// `collect-part-type-env` によってモジュール型環境を自動構築し、相互参照を含むモジュール全体を
/// 一括検証できることを実証します。
#[test]
fn test_self_hosted_validate_module_with_part_references() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let mut parts = all_type_checker_parts(&mod_id);
    parts.extend(all_validator_parts(&mod_id));
    let validate_module_hash = derive_module_part_id(&mod_id, "validate-module");

    let events = create_test_module_events(account, parts, 115);

    let base_val_hash = derive_module_part_id(&mod_id, "base_val").to_string();
    let computed_val_hash = derive_module_part_id(&mod_id, "computed_val").to_string();

    let base_part_def = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "name".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "base_val".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "description".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "base value definition".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "part_definition_event_hash".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: base_val_hash.clone().into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "part_type".into(),
                value: Box::new(type_num()),
            },
            TypeLiteralItemExpression {
                key: "expression".into(),
                value: Box::new(expr_num(42)),
            },
        ],
    });

    // computed_val: base_val + 8 -> number
    let computed_part_def = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "name".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "computed_val".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "description".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "computed value that references base_val".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "part_definition_event_hash".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: computed_val_hash.clone().into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "part_type".into(),
                value: Box::new(type_num()),
            },
            TypeLiteralItemExpression {
                key: "expression".into(),
                value: Box::new(expr_add(expr_part_ref(&base_val_hash), expr_num(8))),
            },
        ],
    });

    // 1. 相互参照・パーツ参照を含む正常なモジュール -> true
    let valid_mod = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "name".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "calc_module".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "description".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "module with internal part reference".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "parts".into(),
                value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![base_part_def.clone(), computed_part_def.clone()],
                })),
            },
        ],
    });

    let call_valid = call_part1(validate_module_hash.clone(), valid_mod);
    let valid_res = definy_core::evaluate_expression(&call_valid, &events)
        .expect("evaluate validate-module on module with valid part_reference");
    assert_eq!(valid_res, Value::Bool(true));

    // 2. 存在しないパーツを参照しているパーツを含むモジュール -> false
    let invalid_ref_part_def = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "name".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "broken_ref".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "description".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "references non-existent part".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "part_definition_event_hash".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: derive_module_part_id(&mod_id, "broken_ref")
                        .to_string()
                        .into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "part_type".into(),
                value: Box::new(type_num()),
            },
            TypeLiteralItemExpression {
                key: "expression".into(),
                value: Box::new(expr_part_ref("unknown_part_hash")),
            },
        ],
    });
    let invalid_ref_mod = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "name".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "broken_module".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "description".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "broken module".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "parts".into(),
                value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![base_part_def, invalid_ref_part_def],
                })),
            },
        ],
    });
    let call_invalid_ref = call_part1(validate_module_hash.clone(), invalid_ref_mod);
    let invalid_ref_res = definy_core::evaluate_expression(&call_invalid_ref, &events)
        .expect("evaluate validate-module on module with unknown part_reference");
    assert_eq!(invalid_ref_res, Value::Bool(false));

    // 3. 参照先パーツと型の整合性が合わない（型不一致）パーツを含むモジュール -> false
    let type_mismatch_part_def = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "name".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "type_mismatch".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "description".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "declares string but produces number".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "part_definition_event_hash".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: derive_module_part_id(&mod_id, "type_mismatch")
                        .to_string()
                        .into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "part_type".into(),
                value: Box::new(type_str()), // 期待型: string だが式は number
            },
            TypeLiteralItemExpression {
                key: "expression".into(),
                value: Box::new(expr_add(expr_part_ref(&base_val_hash), expr_num(8))),
            },
        ],
    });
    let type_mismatch_mod = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "name".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "mismatch_module".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "description".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: "type mismatch module".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "parts".into(),
                value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![type_mismatch_part_def],
                })),
            },
        ],
    });
    let call_type_mismatch = call_part1(validate_module_hash, type_mismatch_mod);
    let type_mismatch_res = definy_core::evaluate_expression(&call_type_mismatch, &events)
        .expect("evaluate validate-module on module with type mismatch");
    assert_eq!(type_mismatch_res, Value::Bool(false));
}
