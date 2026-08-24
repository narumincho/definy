pub mod diagnostics;
pub mod mutation;
pub mod types;
pub mod view;

use narumincho_vdom::*;

use crate::app_state::AppState;
use crate::page_context::PageContext;

pub use diagnostics::{collect_type_diagnostics, expected_type_for_target};
pub use mutation::{
    add_list_item, add_record_item, apply_selection, get_mut_expression_at_path,
    next_local_variable_id, path_to_key, remove_list_item, remove_record_item, selector_prefix,
    set_boolean_value, set_let_variable_name, set_number_value, set_record_item_key,
    set_string_value, target_expression_mut,
};
pub use types::{
    ConstructorValueShape, EditorTarget, ExpressionEditorContext, ExpressionType, ScopeVariable,
    TypeDiagnostic,
};
pub use view::render_expression_editor;

pub fn render_root_expression_editor(
    state: &AppState,
    page_context: &PageContext,
    expression: &Option<definy_event::event::Expression>,
    target: EditorTarget,
) -> Node {
    match expression {
        Some(expr) => {
            let expected_type = expected_type_for_target(state, target);
            let diagnostics = collect_type_diagnostics(state, expr, expected_type);
            render_expression_editor(
                state,
                expr,
                ExpressionEditorContext {
                    path: Vec::new(),
                    target,
                    scope_variables: Vec::new(),
                    diagnostics: diagnostics.as_slice(),
                    structure_locked: false,
                    allow_kind_change: true,
                    language: page_context.language,
                },
            )
        }
        None => view::expression_selector(
            state,
            Vec::new(),
            target,
            "expr:none",
            &view::selector_options(state, page_context.language, &[], true),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::mutation::{
        get_mut_expression_at_path, path_to_key, remove_list_item, set_number_value,
    };
    use crate::app_state::PathStep;

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
}
