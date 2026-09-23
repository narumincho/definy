use crate::app_state::PathStep;

use super::super::types::ExpressionType;
use super::type_check::TypeCheckContext;

pub(crate) fn check_binary_arithmetic(
    left: &definy_event::event::Expression,
    right: &definy_event::event::Expression,
    path: &[PathStep],
    ctx: &mut TypeCheckContext<'_>,
) -> ExpressionType {
    let mut left_path = path.to_vec();
    left_path.push(PathStep::Left);
    let left_type = ctx.check(left, &left_path, Some(ExpressionType::Number));

    let mut right_path = path.to_vec();
    right_path.push(PathStep::Right);
    let right_type = ctx.check(right, &right_path, Some(ExpressionType::Number));

    if left_type == ExpressionType::Number && right_type == ExpressionType::Number {
        ExpressionType::Number
    } else {
        ExpressionType::Unknown
    }
}

pub(crate) fn check_binary_comparison_numbers(
    left: &definy_event::event::Expression,
    right: &definy_event::event::Expression,
    path: &[PathStep],
    ctx: &mut TypeCheckContext<'_>,
) -> ExpressionType {
    let mut left_path = path.to_vec();
    left_path.push(PathStep::Left);
    ctx.check(left, &left_path, Some(ExpressionType::Number));

    let mut right_path = path.to_vec();
    right_path.push(PathStep::Right);
    ctx.check(right, &right_path, Some(ExpressionType::Number));

    ExpressionType::Boolean
}

pub(crate) fn check_binary_boolean(
    left: &definy_event::event::Expression,
    right: &definy_event::event::Expression,
    path: &[PathStep],
    ctx: &mut TypeCheckContext<'_>,
) -> ExpressionType {
    let mut left_path = path.to_vec();
    left_path.push(PathStep::Left);
    ctx.check(left, &left_path, Some(ExpressionType::Boolean));

    let mut right_path = path.to_vec();
    right_path.push(PathStep::Right);
    ctx.check(right, &right_path, Some(ExpressionType::Boolean));

    ExpressionType::Boolean
}

pub(crate) fn check_binary_equality(
    left: &definy_event::event::Expression,
    right: &definy_event::event::Expression,
    path: &[PathStep],
    ctx: &mut TypeCheckContext<'_>,
) -> ExpressionType {
    let mut left_path = path.to_vec();
    left_path.push(PathStep::Left);
    let left_type = ctx.check(left, &left_path, None);

    let mut right_path = path.to_vec();
    right_path.push(PathStep::Right);
    let right_type = ctx.check(right, &right_path, None);

    if left_type != ExpressionType::Unknown
        && right_type != ExpressionType::Unknown
        && left_type != right_type
    {
        ctx.push_mismatch(&right_path, &left_type, &right_type);
    }
    ExpressionType::Boolean
}
