use definy_event::event::*;

#[allow(dead_code)]
pub fn num(value: i64) -> Expression {
    Expression::Number(NumberExpression { value })
}

#[allow(dead_code)]
pub fn bool_lit(value: bool) -> Expression {
    Expression::Boolean(BooleanExpression { value })
}

#[allow(dead_code)]
pub fn str_lit(value: &str) -> Expression {
    Expression::String(StringExpression {
        value: value.into(),
    })
}

#[allow(dead_code)]
pub fn var_ref(variable_id: i64) -> Expression {
    Expression::Variable(VariableExpression { variable_id })
}

#[allow(dead_code)]
pub fn add(left: Expression, right: Expression) -> Expression {
    Expression::Add(AddExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

#[allow(dead_code)]
pub fn sub(left: Expression, right: Expression) -> Expression {
    Expression::Subtract(SubtractExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

#[allow(dead_code)]
pub fn mul(left: Expression, right: Expression) -> Expression {
    Expression::Multiply(MultiplyExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

#[allow(dead_code)]
pub fn div(left: Expression, right: Expression) -> Expression {
    Expression::Divide(DivideExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

#[allow(dead_code)]
pub fn rem(left: Expression, right: Expression) -> Expression {
    Expression::Remainder(RemainderExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

#[allow(dead_code)]
pub fn bit_and(left: Expression, right: Expression) -> Expression {
    Expression::BitAnd(BitAndExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

#[allow(dead_code)]
pub fn bit_or(left: Expression, right: Expression) -> Expression {
    Expression::BitOr(BitOrExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

#[allow(dead_code)]
pub fn bit_xor(left: Expression, right: Expression) -> Expression {
    Expression::BitXor(BitXorExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

#[allow(dead_code)]
pub fn shl(left: Expression, right: Expression) -> Expression {
    Expression::ShiftLeft(ShiftLeftExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

#[allow(dead_code)]
pub fn shr(left: Expression, right: Expression) -> Expression {
    Expression::ShiftRight(ShiftRightExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

#[allow(dead_code)]
pub fn lt(left: Expression, right: Expression) -> Expression {
    Expression::LessThan(LessThanExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

#[allow(dead_code)]
pub fn ge(left: Expression, right: Expression) -> Expression {
    Expression::GreaterThanOrEqual(GreaterThanOrEqualExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

#[allow(dead_code)]
pub fn not_equal(left: Expression, right: Expression) -> Expression {
    Expression::NotEqual(NotEqualExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

#[allow(dead_code)]
pub fn equal_op(left: Expression, right: Expression) -> Expression {
    Expression::Equal(EqualExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

#[allow(dead_code)]
pub fn not_op(value: Expression) -> Expression {
    Expression::Not(NotExpression {
        value: Box::new(value),
    })
}

#[allow(dead_code)]
pub fn and_op(left: Expression, right: Expression) -> Expression {
    Expression::And(AndExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

#[allow(dead_code)]
pub fn or_op(left: Expression, right: Expression) -> Expression {
    Expression::Or(OrExpression {
        left: Box::new(left),
        right: Box::new(right),
    })
}

#[allow(dead_code)]
pub fn if_op(condition: Expression, then_expr: Expression, else_expr: Expression) -> Expression {
    Expression::If(IfExpression {
        condition: Box::new(condition),
        then_expr: Box::new(then_expr),
        else_expr: Box::new(else_expr),
    })
}

#[allow(dead_code)]
pub fn let_bind(
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

#[allow(dead_code)]
pub fn list_lit(items: Vec<Expression>) -> Expression {
    Expression::ListLiteral(ListLiteralExpression { items })
}

#[allow(dead_code)]
pub fn record_lit(items: Vec<(&str, Expression)>) -> Expression {
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

#[allow(dead_code)]
pub fn record_get(record: Expression, key: &str) -> Expression {
    Expression::RecordGet(RecordGetExpression {
        record: Box::new(record),
        key: key.into(),
    })
}

#[allow(dead_code)]
pub fn variant_unit(tag: &str) -> Expression {
    Expression::Variant(VariantExpression {
        tag: tag.into(),
        payload: None,
        type_part_definition_event_hash: None,
    })
}

#[allow(dead_code)]
pub fn variant_val(tag: &str, payload: Expression) -> Expression {
    Expression::Variant(VariantExpression {
        tag: tag.into(),
        payload: Some(Box::new(payload)),
        type_part_definition_event_hash: None,
    })
}

#[allow(dead_code)]
pub fn match_arm_unit(tag: &str, body: Expression) -> MatchArm {
    MatchArm {
        tag: tag.into(),
        variable_id: None,
        variable_name: None,
        body: Box::new(body),
    }
}

#[allow(dead_code)]
pub fn match_arm_payload(
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

#[allow(dead_code)]
pub fn match_op(
    target: Expression,
    arms: Vec<MatchArm>,
    default: Option<Expression>,
) -> Expression {
    Expression::Match(MatchExpression {
        target: Box::new(target),
        arms,
        default: default.map(Box::new),
    })
}
