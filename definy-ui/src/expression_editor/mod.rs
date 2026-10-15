pub mod diagnostics;
pub mod mutation;
pub mod selector;
pub mod types;

pub use diagnostics::{
    analyze_expression_types, collect_type_diagnostics, part_type_to_expression_type,
    parts_with_type_errors,
};
pub use mutation::{
    add_let_binding, add_list_item, add_record_item, apply_selection, clear_expression_at_path,
    get_mut_expression_at_path, next_local_variable_id, path_to_key, remove_let_binding,
    remove_list_item, remove_record_item, set_boolean_value, set_let_variable_name,
    set_number_value, set_record_item_key, set_string_value, upgrade_part_reference_content_hash,
};
pub use selector::{
    RankedSelectorOption, current_selection_value, selector_options, selector_options_ranked,
};
pub use types::{ConstructorValueShape, ExpressionType, ScopeVariable, TypeDiagnostic};

#[cfg(test)]
mod tests {
    use super::mutation::{
        add_let_binding, clear_expression_at_path, get_mut_expression_at_path, path_to_key,
        remove_let_binding, remove_list_item, set_number_value,
    };
    use crate::app_state::PathStep;

    fn number(value: i64) -> definy_event::event::Expression {
        definy_event::event::Expression::Number(definy_event::event::NumberExpression { value })
    }

    #[test]
    fn clear_only_selected_sub_expression() {
        let mut expression = Some(definy_event::event::Expression::Add(
            definy_event::event::AddExpression {
                left: Box::new(number(1)),
                right: Box::new(number(2)),
            },
        ));

        clear_expression_at_path(&mut expression, &[PathStep::Left]);

        assert_eq!(
            expression,
            Some(definy_event::event::Expression::Add(
                definy_event::event::AddExpression {
                    left: Box::new(definy_event::event::Expression::Hole),
                    right: Box::new(number(2)),
                },
            ))
        );
        assert_eq!(
            crate::expression_eval::expression_to_source(expression.as_ref().unwrap()),
            "+ _ 2"
        );
        assert!(
            crate::expression_eval::evaluate_expression(expression.as_ref().unwrap(), &[]).is_err()
        );
    }

    #[test]
    fn clear_root_expression_makes_it_none() {
        let mut expression = Some(number(1));
        clear_expression_at_path(&mut expression, &[]);
        assert_eq!(expression, None);
    }

    #[test]
    fn edit_nested_expression_by_ui_path() {
        let mut expression = Some(definy_event::event::Expression::Add(
            definy_event::event::AddExpression {
                left: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 0 },
                )),
                right: Box::new(definy_event::event::Expression::Add(
                    definy_event::event::AddExpression {
                        left: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 0 },
                        )),
                        right: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 0 },
                        )),
                    },
                )),
            },
        ));

        set_number_value(&mut expression, &[PathStep::Left], 321);
        set_number_value(&mut expression, &[PathStep::Right, PathStep::Left], 1);
        set_number_value(&mut expression, &[PathStep::Right, PathStep::Right], 3);

        let inner_expr = expression.as_ref().unwrap();
        assert_eq!(
            crate::expression_eval::expression_to_source(inner_expr),
            "+ 321 (+ 1 3)"
        );
        assert_eq!(
            crate::expression_eval::evaluate_expression(inner_expr, &[]),
            Ok(crate::expression_eval::Value::Number(325))
        );
        assert_eq!(path_to_key(&[]), "root");
        assert!(
            get_mut_expression_at_path(expression.as_mut().unwrap(), &[PathStep::Left]).is_some()
        );
    }

    #[test]
    fn remove_list_item_can_make_empty_and_removes_target_index() {
        let mut expression = Some(definy_event::event::Expression::ListLiteral(
            definy_event::event::ListLiteralExpression {
                items: vec![
                    definy_event::event::Expression::String(
                        definy_event::event::StringExpression { value: "a".into() },
                    ),
                    definy_event::event::Expression::String(
                        definy_event::event::StringExpression { value: "b".into() },
                    ),
                ],
            },
        ));

        remove_list_item(&mut expression, &[], 0);
        assert_eq!(
            crate::expression_eval::expression_to_source(expression.as_ref().unwrap()),
            "[\"b\"]"
        );

        remove_list_item(&mut expression, &[], 0);
        assert_eq!(
            crate::expression_eval::expression_to_source(expression.as_ref().unwrap()),
            "[]"
        );
    }

    #[test]
    fn add_and_remove_let_binding_behavior() {
        let mut expression = Some(definy_event::event::Expression::Let(
            definy_event::event::LetExpression {
                bindings: vec![definy_event::event::LetBinding {
                    variable_id: 1,
                    variable_name: "x".into(),
                    value: Box::new(definy_event::event::Expression::Number(
                        definy_event::event::NumberExpression { value: 10 },
                    )),
                }],
                body: Box::new(definy_event::event::Expression::Variable(
                    definy_event::event::VariableExpression { variable_id: 1 },
                )),
            },
        ));

        add_let_binding(&mut expression, &[]);
        let let_expr = match expression.as_ref().unwrap() {
            definy_event::event::Expression::Let(l) => l,
            _ => panic!("expected let"),
        };
        assert_eq!(let_expr.bindings.len(), 2);
        assert_eq!(let_expr.bindings[1].variable_id, 2);

        // Cannot remove when only 1 binding left
        remove_let_binding(&mut expression, &[], 0);
        let let_expr = match expression.as_ref().unwrap() {
            definy_event::event::Expression::Let(l) => l,
            _ => panic!("expected let"),
        };
        assert_eq!(let_expr.bindings.len(), 1);
        assert_eq!(let_expr.bindings[0].variable_id, 2);

        // Removing single remaining binding is a no-op
        remove_let_binding(&mut expression, &[], 0);
        let let_expr = match expression.as_ref().unwrap() {
            definy_event::event::Expression::Let(l) => l,
            _ => panic!("expected let"),
        };
        assert_eq!(let_expr.bindings.len(), 1);
    }
}
