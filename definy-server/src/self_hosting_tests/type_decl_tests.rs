//! 型定義パーツ自体の相互参照および型構築子検証のセルフホスティング実証テスト。
//!
//! `type_list`, `type_function`, `type_record`, `type_union` の再帰的型検証、
//! 空ユニオンや重複フィールド/タグの意味検査による拒否、
//! および型定義パーツ内での `PartReference` 相互参照をモジュール自己検証（`core.validate-module`）で実証します。

use definy_core::expression_eval::Value;
use definy_event::event::{
    Description, Expression, ListLiteralExpression, ModuleCommitEvent, ModulePartEntry,
    NumberExpression, PartReferenceExpression, PartType, StringExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, TypeUnionExpression, TypeUnionVariant, VariantExpression,
    derive_module_part_id,
};

use super::helpers::{
    all_type_checker_parts, all_validator_parts, call_part, create_test_module_events,
    empty_type_env, get_test_account_and_mod_id, type_env_with_parts,
};
use crate::builtin_type_checker::type_type;
use crate::self_hosted_ast::module_commit_to_self_hosted_ast;

fn ast_type_num() -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "type_number".into(),
        payload: None,
    })
}

fn ast_type_str() -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "type_string".into(),
        payload: None,
    })
}

fn ast_type_bool() -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "type_boolean".into(),
        payload: None,
    })
}

fn ast_type_list(item_type: Expression) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "type_list".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![TypeLiteralItemExpression {
                key: "item_type".into(),
                value: Box::new(item_type),
            }],
        }))),
    })
}

fn ast_type_func(params: Vec<(&str, Expression)>, ret: Expression) -> Expression {
    let parameters = params
        .into_iter()
        .map(|(name, t)| {
            Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "name".into(),
                        value: Box::new(Expression::String(StringExpression {
                            value: name.into(),
                        })),
                    },
                    TypeLiteralItemExpression {
                        key: "type".into(),
                        value: Box::new(t),
                    },
                ],
            })
        })
        .collect();
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "type_function".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "parameters".into(),
                    value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                        items: parameters,
                    })),
                },
                TypeLiteralItemExpression {
                    key: "return_type".into(),
                    value: Box::new(ret),
                },
            ],
        }))),
    })
}

fn ast_type_record(fields: Vec<(&str, Expression)>) -> Expression {
    let items = fields
        .into_iter()
        .map(|(k, v)| {
            Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "key".into(),
                        value: Box::new(Expression::String(StringExpression { value: k.into() })),
                    },
                    TypeLiteralItemExpression {
                        key: "value".into(),
                        value: Box::new(v),
                    },
                ],
            })
        })
        .collect();
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "type_record".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items,
        }))),
    })
}

fn ast_type_union(variants: Vec<(&str, Option<Expression>)>) -> Expression {
    let items = variants
        .into_iter()
        .map(|(tag, payload)| {
            let p_expr = match payload {
                Some(p) => Expression::Variant(VariantExpression {
                    type_part_definition_event_hash: None,
                    tag: "some".into(),
                    payload: Some(Box::new(p)),
                }),
                None => Expression::Variant(VariantExpression {
                    type_part_definition_event_hash: None,
                    tag: "none".into(),
                    payload: None,
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
                        value: Box::new(p_expr),
                    },
                ],
            })
        })
        .collect();
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "type_union".into(),
        payload: Some(Box::new(Expression::ListLiteral(ListLiteralExpression {
            items,
        }))),
    })
}

fn ast_expr_num(n: i64) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "number".into(),
        payload: Some(Box::new(Expression::Number(NumberExpression { value: n }))),
    })
}

fn ast_part_ref(part_hash: &str) -> Expression {
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

fn assert_is_ok(val: &Value) {
    match val {
        Value::Variant { tag, .. } => assert_eq!(tag.as_str(), "ok"),
        _ => panic!("expected ok variant, got {:?}", val),
    }
}

fn get_error_tag(val: &Value) -> String {
    match val {
        Value::Variant { tag, payload } => {
            assert_eq!(tag.as_str(), "error");
            let err = payload.as_ref().expect("error payload");
            match err.as_ref() {
                Value::Variant { tag, .. } => tag.to_string(),
                _ => panic!("expected error variant, got {:?}", err),
            }
        }
        _ => panic!("expected error result, got {:?}", val),
    }
}

/// 正常な型構築子（プリミティブ型、list, function, record, union）が
/// `type-check-against` で期待型 `type` に対し成功（`ok(type)`）することを実証します。
#[test]
fn test_self_hosted_type_constructors_valid() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let type_check_against_hash = derive_module_part_id(&mod_id, "type-check-against");

    let parts = all_type_checker_parts(&mod_id);
    let events = create_test_module_events(account, parts, 140);
    let eval = |expr: Expression| -> Value {
        let call = call_part(
            type_check_against_hash.clone(),
            &[
                ("expr", expr),
                ("env", empty_type_env()),
                ("expected_type", type_type()),
            ],
        );
        definy_core::evaluate_expression(&call, &events).expect("evaluation failed")
    };

    // 1. Primitive types
    for primitive in [ast_type_num(), ast_type_str(), ast_type_bool()] {
        let res = eval(primitive);
        assert_is_ok(&res);
    }

    // 2. type_list
    let list_type_expr = ast_type_list(ast_type_num());
    let res = eval(list_type_expr);
    assert_is_ok(&res);

    // 3. type_function
    let func_type_expr = ast_type_func(vec![("s", ast_type_str())], ast_type_bool());
    let res = eval(func_type_expr);
    assert_is_ok(&res);

    // 4. type_record
    let record_type_expr = ast_type_record(vec![("id", ast_type_str()), ("age", ast_type_num())]);
    let res = eval(record_type_expr);
    assert_is_ok(&res);

    // 5. type_union
    let union_type_expr = ast_type_union(vec![("none", None), ("some", Some(ast_type_num()))]);
    let res = eval(union_type_expr);
    assert_is_ok(&res);
}

/// 不正な型構築子（要素型が値式、重複フィールド、空ユニオン、重複タグ）が
/// `type-check-against` で適切に拒否されることを実証します。
#[test]
fn test_self_hosted_type_constructors_invalid() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let type_check_against_hash = derive_module_part_id(&mod_id, "type-check-against");

    let parts = all_type_checker_parts(&mod_id);
    let events = create_test_module_events(account, parts, 141);
    let eval = |expr: Expression| -> Value {
        let call = call_part(
            type_check_against_hash.clone(),
            &[
                ("expr", expr),
                ("env", empty_type_env()),
                ("expected_type", type_type()),
            ],
        );
        definy_core::evaluate_expression(&call, &events).expect("evaluation failed")
    };

    // 1. type_list with invalid element type (number literal expression, not type)
    let bad_list = ast_type_list(ast_expr_num(100));
    let res = eval(bad_list);
    assert_eq!(get_error_tag(&res), "type_mismatch");

    // 2. type_function with invalid parameter type
    let bad_func = ast_type_func(vec![("n", ast_expr_num(42))], ast_type_num());
    let res = eval(bad_func);
    assert_eq!(get_error_tag(&res), "type_mismatch");

    // 2b. type_function with duplicate parameter name
    let dup_param_func = ast_type_func(
        vec![("n", ast_type_num()), ("n", ast_type_str())],
        ast_type_bool(),
    );
    let res = eval(dup_param_func);
    assert_eq!(get_error_tag(&res), "invalid_type_declaration");

    // 3. type_record with duplicate keys
    let dup_record = ast_type_record(vec![
        ("key_a", ast_type_str()),
        ("key_b", ast_type_num()),
        ("key_a", ast_type_bool()), // duplicate key_a
    ]);
    let res = eval(dup_record);
    assert_eq!(get_error_tag(&res), "invalid_type_declaration");

    // 4. type_union with empty variants
    let empty_union = ast_type_union(vec![]);
    let res = eval(empty_union);
    assert_eq!(get_error_tag(&res), "invalid_type_declaration");

    // 5. type_union with duplicate tags
    let dup_union = ast_type_union(vec![
        ("active", Some(ast_type_str())),
        ("inactive", None),
        ("active", None), // duplicate active
    ]);
    let res = eval(dup_union);
    assert_eq!(get_error_tag(&res), "invalid_type_declaration");
}

/// 型定義パーツ内でのパーツ参照（`PartReference`）および型パーツ同士の相互参照が
/// `core.validate-module` で一括して自己検証されることを実証します。
#[test]
fn test_self_hosted_type_part_reference_in_module_validation() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let validate_module_hash = derive_module_part_id(&mod_id, "validate-module");
    let expr_type_hash = derive_module_part_id(&mod_id, "expression");
    let type_ast_hash = derive_module_part_id(&mod_id, "type-ast");

    let mut parts = all_type_checker_parts(&mod_id);
    parts.extend(all_validator_parts(&mod_id));
    let events = create_test_module_events(account, parts, 142);

    // モジュール内に2つの型パーツと1つの値パーツを定義：
    // 1. AccountId = string (型パーツ)
    // 2. User = { id: AccountId, name: string } (型パーツ: AccountId を参照)
    // 3. get_user_id: User -> AccountId (関数パーツ: User と AccountId を使用)
    let account_id_part_hash = derive_module_part_id(&mod_id, "AccountId");
    let user_part_hash = derive_module_part_id(&mod_id, "User");

    let account_id_part = ModulePartEntry {
        name: "AccountId".into(),
        part_type: Some(PartType::Type),
        description: Description::Plain("Account ID type".into()),
        content_hash: None,
        expression: Some(Expression::TypeString),
    };

    let user_part = ModulePartEntry {
        name: "User".into(),
        part_type: Some(PartType::Type),
        description: Description::Plain("User record type".into()),
        content_hash: None,
        expression: Some(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "id".into(),
                    value: Box::new(Expression::PartReference(PartReferenceExpression::new(
                        account_id_part_hash.clone(),
                    ))),
                },
                TypeLiteralItemExpression {
                    key: "name".into(),
                    value: Box::new(Expression::TypeString),
                },
            ],
        })),
    };

    let user_status_part = ModulePartEntry {
        name: "UserStatus".into(),
        part_type: Some(PartType::Type),
        description: Description::Plain("User status union type".into()),
        content_hash: None,
        expression: Some(Expression::TypeUnion(TypeUnionExpression {
            variants: vec![
                TypeUnionVariant {
                    tag: "guest".into(),
                    payload_type: None,
                },
                TypeUnionVariant {
                    tag: "active".into(),
                    payload_type: Some(Box::new(Expression::PartReference(
                        PartReferenceExpression::new(user_part_hash.clone()),
                    ))),
                },
            ],
        })),
    };

    let test_commit = ModuleCommitEvent {
        module_name: "test_domain_module".into(),
        module_description: Description::Plain("Test module with mutual type references".into()),
        parent_commit_hash: None,
        message: "Test commit".into(),
        parts: vec![account_id_part, user_part, user_status_part],
    };

    // self_hosted_ast に変換
    let self_hosted_module =
        module_commit_to_self_hosted_ast(&test_commit, &mod_id, &expr_type_hash, &type_ast_hash)
            .expect("module_commit_to_self_hosted_ast failed");

    // validate-module でモジュール全体を一括検証
    let validate_call = call_part(validate_module_hash, &[("mod_def", self_hosted_module)]);
    let result = definy_core::evaluate_expression(&validate_call, &events)
        .expect("validation evaluation failed");

    assert_eq!(result, Value::Bool(true));
}

/// 型定義内で存在しないパーツや、非型パーツを参照した場合に
/// 型チェッカーが適切にエラーを返すことを実証します。
#[test]
fn test_self_hosted_type_part_reference_errors() {
    let (account, mod_id) = get_test_account_and_mod_id();
    let type_check_against_hash = derive_module_part_id(&mod_id, "type-check-against");
    let parts = all_type_checker_parts(&mod_id);
    let events = create_test_module_events(account, parts, 143);

    let eval_in_env = |expr: Expression, env: Expression| -> Value {
        let call = call_part(
            type_check_against_hash.clone(),
            &[("expr", expr), ("env", env), ("expected_type", type_type())],
        );
        definy_core::evaluate_expression(&call, &events).expect("evaluation failed")
    };

    // 1. Unknown part reference
    let unknown_ref = ast_part_ref("unknown_part_hash_12345");
    let res = eval_in_env(unknown_ref, empty_type_env());
    assert_eq!(get_error_tag(&res), "part_not_found");

    // 2. Reference to a non-type part (e.g. number value part) inside a type record
    let num_part_hash = "num_part_hash_99999";
    let env_with_num_part = type_env_with_parts(Expression::ListLiteral(ListLiteralExpression {
        items: vec![Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "part_definition_event_hash".into(),
                    value: Box::new(Expression::String(StringExpression {
                        value: num_part_hash.into(),
                    })),
                },
                TypeLiteralItemExpression {
                    key: "part_type".into(),
                    value: Box::new(crate::builtin_type_checker::type_num()),
                },
            ],
        })],
    }));

    let bad_record = ast_type_record(vec![
        ("num_field", ast_part_ref(num_part_hash)), // references a number part, not a type part!
    ]);

    let res = eval_in_env(bad_record, env_with_num_part);
    assert_eq!(get_error_tag(&res), "type_mismatch");
}
