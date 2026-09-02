use std::str::FromStr;

use definy_event::EventHashId;

use super::types::EditorTarget;
use crate::app_state::{AppState, PathStep};

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

pub fn set_number_value(
    root_expression_opt: &mut Option<definy_event::event::Expression>,
    path: &[PathStep],
    value: i64,
) {
    if let Some(root_expression) = root_expression_opt.as_mut()
        && let Some(definy_event::event::Expression::Number(number_expression)) =
            get_mut_expression_at_path(root_expression, path)
    {
        number_expression.value = value;
    }
}

pub fn set_boolean_value(
    root_expression_opt: &mut Option<definy_event::event::Expression>,
    path: &[PathStep],
    value: bool,
) {
    if let Some(root_expression) = root_expression_opt.as_mut()
        && let Some(definy_event::event::Expression::Boolean(bool_expr)) =
            get_mut_expression_at_path(root_expression, path)
    {
        bool_expr.value = value;
    }
}

pub fn set_let_variable_name(
    root_expression_opt: &mut Option<definy_event::event::Expression>,
    path: &[PathStep],
    value: &str,
) {
    if let Some(root_expression) = root_expression_opt.as_mut()
        && let Some(definy_event::event::Expression::Let(let_expr)) =
            get_mut_expression_at_path(root_expression, path)
    {
        let_expr.variable_name = value.into();
    }
}

pub fn set_string_value(
    root_expression_opt: &mut Option<definy_event::event::Expression>,
    path: &[PathStep],
    value: &str,
) {
    if let Some(root_expression) = root_expression_opt.as_mut()
        && let Some(definy_event::event::Expression::String(string_expr)) =
            get_mut_expression_at_path(root_expression, path)
    {
        string_expr.value = value.into();
    }
}

pub fn set_record_item_key(
    root_expression_opt: &mut Option<definy_event::event::Expression>,
    path: &[PathStep],
    item_index: usize,
    value: &str,
) {
    if let Some(root_expression) = root_expression_opt.as_mut()
        && let Some(definy_event::event::Expression::TypeLiteral(record_expr)) =
            get_mut_expression_at_path(root_expression, path)
        && let Some(item) = record_expr.items.get_mut(item_index)
    {
        item.key = value.into();
    }
}

pub fn add_record_item(
    root_expression_opt: &mut Option<definy_event::event::Expression>,
    path: &[PathStep],
) {
    if let Some(root_expression) = root_expression_opt.as_mut()
        && let Some(definy_event::event::Expression::TypeLiteral(record_expr)) =
            get_mut_expression_at_path(root_expression, path)
    {
        record_expr
            .items
            .push(definy_event::event::TypeLiteralItemExpression {
                key: "key".into(),
                value: Box::new(definy_event::event::Expression::TypeString),
            });
    }
}

pub fn remove_record_item(
    root_expression_opt: &mut Option<definy_event::event::Expression>,
    path: &[PathStep],
    item_index: usize,
) {
    if let Some(root_expression) = root_expression_opt.as_mut()
        && let Some(definy_event::event::Expression::TypeLiteral(record_expr)) =
            get_mut_expression_at_path(root_expression, path)
    {
        if record_expr.items.len() <= 1 {
            return;
        }
        if item_index < record_expr.items.len() {
            record_expr.items.remove(item_index);
        }
    }
}

pub fn add_list_item(
    root_expression_opt: &mut Option<definy_event::event::Expression>,
    path: &[PathStep],
) {
    if let Some(root_expression) = root_expression_opt.as_mut()
        && let Some(definy_event::event::Expression::ListLiteral(list_expr)) =
            get_mut_expression_at_path(root_expression, path)
    {
        list_expr
            .items
            .push(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            ));
    }
}

pub fn remove_list_item(
    root_expression_opt: &mut Option<definy_event::event::Expression>,
    path: &[PathStep],
    item_index: usize,
) {
    if let Some(root_expression) = root_expression_opt.as_mut()
        && let Some(definy_event::event::Expression::ListLiteral(list_expr)) =
            get_mut_expression_at_path(root_expression, path)
        && item_index < list_expr.items.len()
    {
        list_expr.items.remove(item_index);
    }
}

pub fn next_local_variable_id(expression: &definy_event::event::Expression) -> i64 {
    fn max_local_variable_id(expression: &definy_event::event::Expression) -> i64 {
        match expression {
            definy_event::event::Expression::Number(_) => 0,
            definy_event::event::Expression::String(_) => 0,
            definy_event::event::Expression::TypeNumber => 0,
            definy_event::event::Expression::TypeString => 0,
            definy_event::event::Expression::TypeBoolean => 0,
            definy_event::event::Expression::Boolean(_) => 0,
            definy_event::event::Expression::PartReference(_) => 0,
            definy_event::event::Expression::TypeList(type_list_expression) => {
                max_local_variable_id(type_list_expression.item_type.as_ref())
            }
            definy_event::event::Expression::ListLiteral(list_expression) => list_expression
                .items
                .iter()
                .map(max_local_variable_id)
                .max()
                .unwrap_or(0),
            definy_event::event::Expression::TypeLiteral(record_expression) => record_expression
                .items
                .iter()
                .map(|item| max_local_variable_id(item.value.as_ref()))
                .max()
                .unwrap_or(0),
            definy_event::event::Expression::Add(add_expression) => {
                max_local_variable_id(add_expression.left.as_ref())
                    .max(max_local_variable_id(add_expression.right.as_ref()))
            }
            definy_event::event::Expression::Subtract(sub_expression) => {
                max_local_variable_id(sub_expression.left.as_ref())
                    .max(max_local_variable_id(sub_expression.right.as_ref()))
            }
            definy_event::event::Expression::Multiply(mul_expression) => {
                max_local_variable_id(mul_expression.left.as_ref())
                    .max(max_local_variable_id(mul_expression.right.as_ref()))
            }
            definy_event::event::Expression::Divide(div_expression) => {
                max_local_variable_id(div_expression.left.as_ref())
                    .max(max_local_variable_id(div_expression.right.as_ref()))
            }
            definy_event::event::Expression::Remainder(rem_expression) => {
                max_local_variable_id(rem_expression.left.as_ref())
                    .max(max_local_variable_id(rem_expression.right.as_ref()))
            }
            definy_event::event::Expression::Equal(equal_expression) => {
                max_local_variable_id(equal_expression.left.as_ref())
                    .max(max_local_variable_id(equal_expression.right.as_ref()))
            }
            definy_event::event::Expression::NotEqual(ne_expression) => {
                max_local_variable_id(ne_expression.left.as_ref())
                    .max(max_local_variable_id(ne_expression.right.as_ref()))
            }
            definy_event::event::Expression::LessThan(lt_expression) => {
                max_local_variable_id(lt_expression.left.as_ref())
                    .max(max_local_variable_id(lt_expression.right.as_ref()))
            }
            definy_event::event::Expression::LessThanOrEqual(le_expression) => {
                max_local_variable_id(le_expression.left.as_ref())
                    .max(max_local_variable_id(le_expression.right.as_ref()))
            }
            definy_event::event::Expression::GreaterThan(gt_expression) => {
                max_local_variable_id(gt_expression.left.as_ref())
                    .max(max_local_variable_id(gt_expression.right.as_ref()))
            }
            definy_event::event::Expression::GreaterThanOrEqual(ge_expression) => {
                max_local_variable_id(ge_expression.left.as_ref())
                    .max(max_local_variable_id(ge_expression.right.as_ref()))
            }
            definy_event::event::Expression::Not(not_expression) => {
                max_local_variable_id(not_expression.value.as_ref())
            }
            definy_event::event::Expression::And(and_expression) => {
                max_local_variable_id(and_expression.left.as_ref())
                    .max(max_local_variable_id(and_expression.right.as_ref()))
            }
            definy_event::event::Expression::Or(or_expression) => {
                max_local_variable_id(or_expression.left.as_ref())
                    .max(max_local_variable_id(or_expression.right.as_ref()))
            }
            definy_event::event::Expression::If(if_expression) => {
                max_local_variable_id(if_expression.condition.as_ref())
                    .max(max_local_variable_id(if_expression.then_expr.as_ref()))
                    .max(max_local_variable_id(if_expression.else_expr.as_ref()))
            }
            definy_event::event::Expression::Let(let_expression) => let_expression
                .variable_id
                .max(max_local_variable_id(let_expression.value.as_ref()))
                .max(max_local_variable_id(let_expression.body.as_ref())),
            definy_event::event::Expression::Variable(var_expression) => var_expression.variable_id,
            definy_event::event::Expression::Constructor(constructor_expression) => {
                max_local_variable_id(constructor_expression.value.as_ref())
            }
            definy_event::event::Expression::Compiler(_) => 0,
        }
    }
    max_local_variable_id(expression).saturating_add(1).max(1)
}

fn build_expression_from_selection(
    state: &AppState,
    selected_value: &str,
    next_variable_id: i64,
    constructor_default: Option<(EventHashId, definy_event::event::Expression)>,
    current_expr: &definy_event::event::Expression,
) -> definy_event::event::Expression {
    if selected_value == "expr:number" {
        definy_event::event::Expression::Number(definy_event::event::NumberExpression { value: 0 })
    } else if selected_value == "expr:string" {
        definy_event::event::Expression::String(definy_event::event::StringExpression {
            value: "".into(),
        })
    } else if selected_value == "expr:type:number" {
        definy_event::event::Expression::TypeNumber
    } else if selected_value == "expr:type:string" {
        definy_event::event::Expression::TypeString
    } else if selected_value == "expr:type:boolean" {
        definy_event::event::Expression::TypeBoolean
    } else if selected_value == "expr:type:list" {
        definy_event::event::Expression::TypeList(definy_event::event::TypeListExpression {
            item_type: Box::new(definy_event::event::Expression::TypeString),
        })
    } else if selected_value == "expr:list" {
        definy_event::event::Expression::ListLiteral(definy_event::event::ListLiteralExpression {
            items: vec![definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )],
        })
    } else if selected_value == "expr:boolean" {
        definy_event::event::Expression::Boolean(definy_event::event::BooleanExpression {
            value: false,
        })
    } else if selected_value == "expr:add" {
        definy_event::event::Expression::Add(definy_event::event::AddExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:subtract" || selected_value == "expr:minus" {
        definy_event::event::Expression::Subtract(definy_event::event::SubtractExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:multiply" {
        definy_event::event::Expression::Multiply(definy_event::event::MultiplyExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:divide" {
        definy_event::event::Expression::Divide(definy_event::event::DivideExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 1 },
            )),
        })
    } else if selected_value == "expr:remainder" {
        definy_event::event::Expression::Remainder(definy_event::event::RemainderExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 1 },
            )),
        })
    } else if selected_value == "expr:equal" {
        definy_event::event::Expression::Equal(definy_event::event::EqualExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:not_equal" {
        definy_event::event::Expression::NotEqual(definy_event::event::NotEqualExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:less_than" {
        definy_event::event::Expression::LessThan(definy_event::event::LessThanExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:less_than_or_equal" {
        definy_event::event::Expression::LessThanOrEqual(
            definy_event::event::LessThanOrEqualExpression {
                left: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 0 },
                )),
                right: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 0 },
                )),
            },
        )
    } else if selected_value == "expr:greater_than" {
        definy_event::event::Expression::GreaterThan(definy_event::event::GreaterThanExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:greater_than_or_equal" {
        definy_event::event::Expression::GreaterThanOrEqual(
            definy_event::event::GreaterThanOrEqualExpression {
                left: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 0 },
                )),
                right: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 0 },
                )),
            },
        )
    } else if selected_value == "expr:not" {
        definy_event::event::Expression::Not(definy_event::event::NotExpression {
            value: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: false },
            )),
        })
    } else if selected_value == "expr:and" {
        definy_event::event::Expression::And(definy_event::event::AndExpression {
            left: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: true },
            )),
            right: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: true },
            )),
        })
    } else if selected_value == "expr:or" {
        definy_event::event::Expression::Or(definy_event::event::OrExpression {
            left: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: false },
            )),
            right: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: false },
            )),
        })
    } else if selected_value == "expr:if" {
        definy_event::event::Expression::If(definy_event::event::IfExpression {
            condition: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: false },
            )),
            then_expr: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            else_expr: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:let" {
        definy_event::event::Expression::Let(definy_event::event::LetExpression {
            variable_id: next_variable_id,
            variable_name: "x".into(),
            value: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            body: Box::new(definy_event::event::Expression::Variable(
                definy_event::event::VariableExpression {
                    variable_id: next_variable_id,
                },
            )),
        })
    } else if selected_value == "expr:type_literal" {
        definy_event::event::Expression::TypeLiteral(definy_event::event::TypeLiteralExpression {
            items: vec![definy_event::event::TypeLiteralItemExpression {
                key: "key".into(),
                value: Box::new(definy_event::event::Expression::TypeString),
            }],
        })
    } else if let Some((type_part_definition_event_hash, default_value)) = constructor_default {
        definy_event::event::Expression::Constructor(definy_event::event::ConstructorExpression {
            type_part_definition_event_hash,
            value: Box::new(default_value),
        })
    } else if let Some(encoded) = selected_value.strip_prefix("ref:global:") {
        if let Ok(hash) = EventHashId::from_str(encoded) {
            if let Some(snapshot) = crate::part_projection::find_part_snapshot(state, &hash) {
                match snapshot.expression.as_ref() {
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Plus,
                    )) => {
                        definy_event::event::Expression::Add(definy_event::event::AddExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        })
                    }
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Minus,
                    )) => definy_event::event::Expression::Subtract(
                        definy_event::event::SubtractExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Multiply,
                    )) => definy_event::event::Expression::Multiply(
                        definy_event::event::MultiplyExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Divide,
                    )) => definy_event::event::Expression::Divide(
                        definy_event::event::DivideExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 1 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Remainder,
                    )) => definy_event::event::Expression::Remainder(
                        definy_event::event::RemainderExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 1 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::LessThan,
                    )) => definy_event::event::Expression::LessThan(
                        definy_event::event::LessThanExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::LessThanOrEqual,
                    )) => definy_event::event::Expression::LessThanOrEqual(
                        definy_event::event::LessThanOrEqualExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::GreaterThan,
                    )) => definy_event::event::Expression::GreaterThan(
                        definy_event::event::GreaterThanExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::GreaterThanOrEqual,
                    )) => definy_event::event::Expression::GreaterThanOrEqual(
                        definy_event::event::GreaterThanOrEqualExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::NotEqual,
                    )) => definy_event::event::Expression::NotEqual(
                        definy_event::event::NotEqualExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Not,
                    )) => {
                        definy_event::event::Expression::Not(definy_event::event::NotExpression {
                            value: Box::new(definy_event::event::Expression::Boolean(
                                definy_event::event::BooleanExpression { value: false },
                            )),
                        })
                    }
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::And,
                    )) => {
                        definy_event::event::Expression::And(definy_event::event::AndExpression {
                            left: Box::new(definy_event::event::Expression::Boolean(
                                definy_event::event::BooleanExpression { value: true },
                            )),
                            right: Box::new(definy_event::event::Expression::Boolean(
                                definy_event::event::BooleanExpression { value: true },
                            )),
                        })
                    }
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Or,
                    )) => definy_event::event::Expression::Or(definy_event::event::OrExpression {
                        left: Box::new(definy_event::event::Expression::Boolean(
                            definy_event::event::BooleanExpression { value: false },
                        )),
                        right: Box::new(definy_event::event::Expression::Boolean(
                            definy_event::event::BooleanExpression { value: false },
                        )),
                    }),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Let,
                    )) => {
                        definy_event::event::Expression::Let(definy_event::event::LetExpression {
                            variable_id: next_variable_id,
                            variable_name: "x".into(),
                            value: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            body: Box::new(definy_event::event::Expression::Variable(
                                definy_event::event::VariableExpression {
                                    variable_id: next_variable_id,
                                },
                            )),
                        })
                    }
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::NumberLiteral,
                    )) => definy_event::event::Expression::Number(
                        definy_event::event::NumberExpression { value: 0 },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::If,
                    )) => definy_event::event::Expression::If(definy_event::event::IfExpression {
                        condition: Box::new(definy_event::event::Expression::Boolean(
                            definy_event::event::BooleanExpression { value: false },
                        )),
                        then_expr: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 0 },
                        )),
                        else_expr: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 0 },
                        )),
                    }),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Equal,
                    )) => definy_event::event::Expression::Equal(
                        definy_event::event::EqualExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    _ => definy_event::event::Expression::PartReference(
                        definy_event::event::PartReferenceExpression {
                            part_definition_event_hash: hash,
                        },
                    ),
                }
            } else {
                definy_event::event::Expression::PartReference(
                    definy_event::event::PartReferenceExpression {
                        part_definition_event_hash: hash,
                    },
                )
            }
        } else {
            current_expr.clone()
        }
    } else if let Some(local_id_str) = selected_value.strip_prefix("ref:local:") {
        if let Ok(variable_id) = local_id_str.parse::<i64>() {
            definy_event::event::Expression::Variable(definy_event::event::VariableExpression {
                variable_id,
            })
        } else {
            current_expr.clone()
        }
    } else {
        current_expr.clone()
    }
}

pub fn apply_selection(
    state: &AppState,
    root_expression_opt: &mut Option<definy_event::event::Expression>,
    path: &[PathStep],
    selected_value: &str,
    constructor_default: Option<(EventHashId, definy_event::event::Expression)>,
) {
    if path.is_empty() {
        if selected_value == "expr:none" {
            *root_expression_opt = None;
            return;
        }
        let next_variable_id =
            if selected_value == "expr:let" || selected_value.starts_with("ref:global:") {
                root_expression_opt
                    .as_ref()
                    .map(next_local_variable_id)
                    .unwrap_or(1)
            } else {
                0
            };
        let fallback =
            definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                value: 0,
            });
        let current_ref = root_expression_opt.as_ref().unwrap_or(&fallback);
        *root_expression_opt = Some(build_expression_from_selection(
            state,
            selected_value,
            next_variable_id,
            constructor_default,
            current_ref,
        ));
        return;
    }

    if let Some(root_expr) = root_expression_opt.as_mut() {
        let next_variable_id =
            if selected_value == "expr:let" || selected_value.starts_with("ref:global:") {
                next_local_variable_id(root_expr)
            } else {
                0
            };
        if let Some(target_expr) = get_mut_expression_at_path(root_expr, path) {
            *target_expr = build_expression_from_selection(
                state,
                selected_value,
                next_variable_id,
                constructor_default,
                target_expr,
            );
        }
    }
}
