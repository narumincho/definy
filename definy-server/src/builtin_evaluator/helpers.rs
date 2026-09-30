use definy_event::EventHashId;
use definy_event::event::{
    CallExpression, Expression, PartReferenceExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, VariantExpression,
};

/// `eval-value(sub_expr)(env)` のカリー化呼び出し式を生成します。
pub fn eval_sub(eval_hash: &EventHashId, sub_expr: Expression, env_expr: Expression) -> Expression {
    Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                eval_hash.clone(),
            ))),
            argument: Box::new(sub_expr),
        })),
        argument: Box::new(env_expr),
    })
}

/// 数値動的値 `Value::Number` を生成する式です。
pub fn val_num(n: Expression) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "number".into(),
        payload: Some(Box::new(n)),
    })
}

/// 文字列動的値 `Value::String` を生成する式です。
pub fn val_str(s: Expression) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "string".into(),
        payload: Some(Box::new(s)),
    })
}

/// 真偽値動的値 `Value::Boolean` を生成する式です。
pub fn val_bool(b: Expression) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "boolean".into(),
        payload: Some(Box::new(b)),
    })
}

/// 直和型動的値 `Value::Variant { tag, payload }` を生成する式です。
pub fn val_variant(tag: Expression, payload: Expression) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "variant".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "tag".into(),
                    value: Box::new(tag),
                },
                TypeLiteralItemExpression {
                    key: "payload".into(),
                    value: Box::new(payload),
                },
            ],
        }))),
    })
}

/// ユニット値 `Value::Unit` を生成する式です。
pub fn val_unit() -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: None,
        tag: "unit".into(),
        payload: None,
    })
}
