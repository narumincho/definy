pub mod builder;
pub mod values;
pub mod variables;

use super::types::EditorTarget;
use crate::app_state::{AppState, PathStep};

pub use builder::*;
pub use values::*;
pub use variables::*;

pub fn selector_prefix(target: EditorTarget) -> &'static str {
    match target {
        EditorTarget::PartDefinition => "part-definition",
        EditorTarget::PartUpdate => "part-update",
    }
}

pub fn target_expression_mut(
    state: &mut AppState,
    target: EditorTarget,
) -> &mut Option<definy_event::event::Expression> {
    match target {
        EditorTarget::PartDefinition => &mut state.part_definition_form.composing_expression,
        EditorTarget::PartUpdate => &mut state.part_update_form.expression_input,
    }
}

pub fn path_to_key(path: &[PathStep]) -> String {
    if path.is_empty() {
        return "root".to_string();
    }
    path.iter()
        .map(|step| match step {
            PathStep::Left => "L".to_string(),
            PathStep::Right => "R".to_string(),
            PathStep::Condition => "C".to_string(),
            PathStep::Then => "T".to_string(),
            PathStep::Else => "E".to_string(),
            PathStep::LetValue => "LV".to_string(),
            PathStep::LetBody => "LB".to_string(),
            PathStep::ListItemValue(index) => format!("LI{}", index),
            PathStep::RecordItemValue(index) => format!("RV{}", index),
            PathStep::ConstructorValue => "CV".to_string(),
            PathStep::TypeListItem => "TL".to_string(),
            PathStep::Start => "ST".to_string(),
            PathStep::End => "ED".to_string(),
            PathStep::Index => "IX".to_string(),
            PathStep::Item => "IT".to_string(),
        })
        .collect::<Vec<String>>()
        .join("-")
}

pub fn get_mut_expression_at_path<'a>(
    expression: &'a mut definy_event::event::Expression,
    path: &[PathStep],
) -> Option<&'a mut definy_event::event::Expression> {
    if path.is_empty() {
        return Some(expression);
    }

    match expression {
        definy_event::event::Expression::Add(add_expression) => match path[0] {
            PathStep::Left => get_mut_expression_at_path(add_expression.left.as_mut(), &path[1..]),
            PathStep::Right => {
                get_mut_expression_at_path(add_expression.right.as_mut(), &path[1..])
            }
            _ => None,
        },
        definy_event::event::Expression::Subtract(sub_expression) => match path[0] {
            PathStep::Left => get_mut_expression_at_path(sub_expression.left.as_mut(), &path[1..]),
            PathStep::Right => {
                get_mut_expression_at_path(sub_expression.right.as_mut(), &path[1..])
            }
            _ => None,
        },
        definy_event::event::Expression::Multiply(mul_expression) => match path[0] {
            PathStep::Left => get_mut_expression_at_path(mul_expression.left.as_mut(), &path[1..]),
            PathStep::Right => {
                get_mut_expression_at_path(mul_expression.right.as_mut(), &path[1..])
            }
            _ => None,
        },
        definy_event::event::Expression::Divide(div_expression) => match path[0] {
            PathStep::Left => get_mut_expression_at_path(div_expression.left.as_mut(), &path[1..]),
            PathStep::Right => {
                get_mut_expression_at_path(div_expression.right.as_mut(), &path[1..])
            }
            _ => None,
        },
        definy_event::event::Expression::Remainder(rem_expression) => match path[0] {
            PathStep::Left => get_mut_expression_at_path(rem_expression.left.as_mut(), &path[1..]),
            PathStep::Right => {
                get_mut_expression_at_path(rem_expression.right.as_mut(), &path[1..])
            }
            _ => None,
        },
        definy_event::event::Expression::Equal(equal_expression) => match path[0] {
            PathStep::Left => {
                get_mut_expression_at_path(equal_expression.left.as_mut(), &path[1..])
            }
            PathStep::Right => {
                get_mut_expression_at_path(equal_expression.right.as_mut(), &path[1..])
            }
            _ => None,
        },
        definy_event::event::Expression::NotEqual(ne_expression) => match path[0] {
            PathStep::Left => get_mut_expression_at_path(ne_expression.left.as_mut(), &path[1..]),
            PathStep::Right => get_mut_expression_at_path(ne_expression.right.as_mut(), &path[1..]),
            _ => None,
        },
        definy_event::event::Expression::LessThan(lt_expression) => match path[0] {
            PathStep::Left => get_mut_expression_at_path(lt_expression.left.as_mut(), &path[1..]),
            PathStep::Right => get_mut_expression_at_path(lt_expression.right.as_mut(), &path[1..]),
            _ => None,
        },
        definy_event::event::Expression::LessThanOrEqual(le_expression) => match path[0] {
            PathStep::Left => get_mut_expression_at_path(le_expression.left.as_mut(), &path[1..]),
            PathStep::Right => get_mut_expression_at_path(le_expression.right.as_mut(), &path[1..]),
            _ => None,
        },
        definy_event::event::Expression::GreaterThan(gt_expression) => match path[0] {
            PathStep::Left => get_mut_expression_at_path(gt_expression.left.as_mut(), &path[1..]),
            PathStep::Right => get_mut_expression_at_path(gt_expression.right.as_mut(), &path[1..]),
            _ => None,
        },
        definy_event::event::Expression::GreaterThanOrEqual(ge_expression) => match path[0] {
            PathStep::Left => get_mut_expression_at_path(ge_expression.left.as_mut(), &path[1..]),
            PathStep::Right => get_mut_expression_at_path(ge_expression.right.as_mut(), &path[1..]),
            _ => None,
        },
        definy_event::event::Expression::Not(not_expression) => match path[0] {
            PathStep::Condition | PathStep::Left => {
                get_mut_expression_at_path(not_expression.value.as_mut(), &path[1..])
            }
            _ => None,
        },
        definy_event::event::Expression::And(and_expression) => match path[0] {
            PathStep::Left => get_mut_expression_at_path(and_expression.left.as_mut(), &path[1..]),
            PathStep::Right => {
                get_mut_expression_at_path(and_expression.right.as_mut(), &path[1..])
            }
            _ => None,
        },
        definy_event::event::Expression::Or(or_expression) => match path[0] {
            PathStep::Left => get_mut_expression_at_path(or_expression.left.as_mut(), &path[1..]),
            PathStep::Right => get_mut_expression_at_path(or_expression.right.as_mut(), &path[1..]),
            _ => None,
        },
        definy_event::event::Expression::StringConcat(concat_expr) => match path[0] {
            PathStep::Left => get_mut_expression_at_path(concat_expr.left.as_mut(), &path[1..]),
            PathStep::Right => get_mut_expression_at_path(concat_expr.right.as_mut(), &path[1..]),
            _ => None,
        },
        definy_event::event::Expression::StringLength(len_expr) => match path[0] {
            PathStep::Condition | PathStep::Left => {
                get_mut_expression_at_path(len_expr.value.as_mut(), &path[1..])
            }
            _ => None,
        },
        definy_event::event::Expression::StringSlice(slice_expr) => match path[0] {
            PathStep::Condition | PathStep::Left => {
                get_mut_expression_at_path(slice_expr.value.as_mut(), &path[1..])
            }
            PathStep::Start => get_mut_expression_at_path(slice_expr.start.as_mut(), &path[1..]),
            PathStep::End => get_mut_expression_at_path(slice_expr.end.as_mut(), &path[1..]),
            _ => None,
        },
        definy_event::event::Expression::ListLength(len_expr) => match path[0] {
            PathStep::Condition | PathStep::Left => {
                get_mut_expression_at_path(len_expr.value.as_mut(), &path[1..])
            }
            _ => None,
        },
        definy_event::event::Expression::ListConcat(concat_expr) => match path[0] {
            PathStep::Left => get_mut_expression_at_path(concat_expr.left.as_mut(), &path[1..]),
            PathStep::Right => get_mut_expression_at_path(concat_expr.right.as_mut(), &path[1..]),
            _ => None,
        },
        definy_event::event::Expression::ListGet(get_expr) => match path[0] {
            PathStep::Left => get_mut_expression_at_path(get_expr.list.as_mut(), &path[1..]),
            PathStep::Index | PathStep::Right => {
                get_mut_expression_at_path(get_expr.index.as_mut(), &path[1..])
            }
            _ => None,
        },
        definy_event::event::Expression::ListAppend(append_expr) => match path[0] {
            PathStep::Left => get_mut_expression_at_path(append_expr.list.as_mut(), &path[1..]),
            PathStep::Item | PathStep::Right => {
                get_mut_expression_at_path(append_expr.item.as_mut(), &path[1..])
            }
            _ => None,
        },
        definy_event::event::Expression::If(if_expression) => match path[0] {
            PathStep::Condition => {
                get_mut_expression_at_path(if_expression.condition.as_mut(), &path[1..])
            }
            PathStep::Then => {
                get_mut_expression_at_path(if_expression.then_expr.as_mut(), &path[1..])
            }
            PathStep::Else => {
                get_mut_expression_at_path(if_expression.else_expr.as_mut(), &path[1..])
            }
            _ => None,
        },
        definy_event::event::Expression::Let(let_expression) => match path[0] {
            PathStep::LetValue => {
                get_mut_expression_at_path(let_expression.value.as_mut(), &path[1..])
            }
            PathStep::LetBody => {
                get_mut_expression_at_path(let_expression.body.as_mut(), &path[1..])
            }
            _ => None,
        },
        definy_event::event::Expression::ListLiteral(list_expression) => match path[0] {
            PathStep::ListItemValue(index) => {
                if index < list_expression.items.len() {
                    get_mut_expression_at_path(&mut list_expression.items[index], &path[1..])
                } else {
                    None
                }
            }
            _ => None,
        },
        definy_event::event::Expression::TypeList(type_list_expression) => match path[0] {
            PathStep::TypeListItem => {
                get_mut_expression_at_path(type_list_expression.item_type.as_mut(), &path[1..])
            }
            _ => None,
        },
        definy_event::event::Expression::TypeLiteral(record_expression) => match path[0] {
            PathStep::RecordItemValue(index) => {
                if index < record_expression.items.len() {
                    get_mut_expression_at_path(
                        record_expression.items[index].value.as_mut(),
                        &path[1..],
                    )
                } else {
                    None
                }
            }
            _ => None,
        },
        definy_event::event::Expression::Constructor(constructor_expression) => match path[0] {
            PathStep::ConstructorValue => {
                get_mut_expression_at_path(constructor_expression.value.as_mut(), &path[1..])
            }
            _ => None,
        },
        _ => None,
    }
}
