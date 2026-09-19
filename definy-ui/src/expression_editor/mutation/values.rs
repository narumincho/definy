use crate::app_state::PathStep;

use super::get_mut_expression_at_path;

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

pub fn set_function_parameter_name(
    root_expression_opt: &mut Option<definy_event::event::Expression>,
    path: &[PathStep],
    value: &str,
) {
    if let Some(root_expression) = root_expression_opt.as_mut()
        && let Some(definy_event::event::Expression::Function(func_expr)) =
            get_mut_expression_at_path(root_expression, path)
    {
        func_expr.parameter_name = value.into();
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
