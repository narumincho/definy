use definy_event::EventHashId;
use definy_event::event::{
    CallExpression, Expression, ListLiteralExpression, NumberExpression, PartReferenceExpression,
    RecordGetExpression, TypeLiteralExpression, TypeLiteralItemExpression, VariantExpression,
};

/// 成功した型検査結果 `ok(type_ast)` を構築します。
pub fn ok_type(type_ast: Expression) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "ok".into(),
        payload: Some(Box::new(type_ast)),
    })
}

/// エラーの型検査結果 `error(err)` を構築します。
pub fn error_value(error: Expression) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "error".into(),
        payload: Some(Box::new(error)),
    })
}

/// 型不一致エラー `error(type_mismatch { expected, actual })` を構築します。
pub fn error_mismatch(expected: Expression, actual: Expression) -> Expression {
    error_value(Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "type_mismatch".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "expected".into(),
                    value: Box::new(expected),
                },
                TypeLiteralItemExpression {
                    key: "actual".into(),
                    value: Box::new(actual),
                },
            ],
        }))),
    }))
}

/// 非関数呼び出しエラー `error(not_a_function { actual })` を構築します。
pub fn error_not_a_function(actual: Expression) -> Expression {
    error_value(Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "not_a_function".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![TypeLiteralItemExpression {
                key: "actual".into(),
                value: Box::new(actual),
            }],
        }))),
    }))
}

/// 未知のエラー `error(unknown_error)` を構築します。
pub fn error_unknown() -> Expression {
    error_value(Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "unknown_error".into(),
        payload: None,
    }))
}

/// パーツ未発見エラー `error(part_not_found { part_definition_event_hash })` を構築します。
pub fn error_part_not_found(part_hash: Expression) -> Expression {
    error_value(Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "part_not_found".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![TypeLiteralItemExpression {
                key: "part_definition_event_hash".into(),
                value: Box::new(part_hash),
            }],
        }))),
    }))
}

/// 型 AST の数値型 `number` を構築します。
pub fn type_num() -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "number".into(),
        payload: None,
    })
}

/// 型 AST の文字列型 `string` を構築します。
pub fn type_str() -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "string".into(),
        payload: None,
    })
}

/// 型 AST の真偽値型 `boolean` を構築します。
pub fn type_bool() -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "boolean".into(),
        payload: None,
    })
}

/// パーツ呼び出し式 `f(arg1)(arg2)...` をカリー化合成します。
pub fn call_part(part_hash: &EventHashId, args: Vec<Expression>) -> Expression {
    args.into_iter().fold(
        Expression::PartReference(PartReferenceExpression::new(part_hash.clone())),
        |function, argument| {
            Expression::Call(CallExpression {
                function: Box::new(function),
                argument: Box::new(argument),
            })
        },
    )
}

/// レコードフィールドアクセス式 `record.key` を構築します。
pub fn record_get(record: Expression, key: &str) -> Expression {
    Expression::RecordGet(RecordGetExpression {
        record: Box::new(record),
        key: key.into(),
    })
}

/// 部分式の型検査呼び出し `type-check(expr, env)` を構築します。
pub fn check_sub(check_hash: &EventHashId, expr: Expression, env: Expression) -> Expression {
    Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                check_hash.clone(),
            ))),
            argument: Box::new(expr),
        })),
        argument: Box::new(env),
    })
}

/// 空の型環境 `{ variables: [], parts: [] }` を構築します。
pub fn empty_type_env() -> Expression {
    Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "variables".into(),
                value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![],
                })),
            },
            TypeLiteralItemExpression {
                key: "parts".into(),
                value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![],
                })),
            },
        ],
    })
}

/// 指定したパーツ一覧を持つ型環境 `{ variables: [], parts: <parts> }` を構築します。
#[allow(dead_code)]
pub fn type_env_with_parts(parts: Expression) -> Expression {
    Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "variables".into(),
                value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![],
                })),
            },
            TypeLiteralItemExpression {
                key: "parts".into(),
                value: Box::new(parts),
            },
        ],
    })
}

/// 指定した変数束縛リストを持つ型環境 `{ variables: <vars>, parts: [] }` を構築します。
#[allow(dead_code)]
pub fn type_env_from_vars(vars: Vec<Expression>) -> Expression {
    Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "variables".into(),
                value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vars,
                })),
            },
            TypeLiteralItemExpression {
                key: "parts".into(),
                value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![],
                })),
            },
        ],
    })
}

/// 単一の変数束縛を持つ型環境を構築します。
#[allow(dead_code)]
pub fn type_env_single_var(variable_id: i64, var_type: Expression) -> Expression {
    type_env_from_vars(vec![Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "variable_id".into(),
                value: Box::new(Expression::Number(NumberExpression { value: variable_id })),
            },
            TypeLiteralItemExpression {
                key: "var_type".into(),
                value: Box::new(var_type),
            },
        ],
    })])
}
