use definy_event::EventHashId;
use definy_event::event::{
    CallExpression, Expression, PartReferenceExpression, RecordGetExpression,
    TypeLiteralExpression, TypeLiteralItemExpression, VariantExpression,
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
