pub mod compound;
pub mod inputs;
pub mod selector;

use dioxus::prelude::*;

use crate::app_state::{AppState, PathStep};

use super::types::ExpressionEditorContext;

pub use compound::*;
use inputs::*;
pub use selector::*;

pub fn is_compound_expression(expr: &definy_event::event::Expression) -> bool {
    match expr {
        definy_event::event::Expression::Number(_)
        | definy_event::event::Expression::String(_)
        | definy_event::event::Expression::Boolean(_)
        | definy_event::event::Expression::Variable(_)
        | definy_event::event::Expression::PartReference(_)
        | definy_event::event::Expression::TypeNumber
        | definy_event::event::Expression::TypeString
        | definy_event::event::Expression::TypeBoolean
        | definy_event::event::Expression::Compiler(_) => false,
        _ => true,
    }
}

pub fn render_expression_editor(
    state: &AppState,
    expression: &definy_event::event::Expression,
    context: ExpressionEditorContext,
) -> Element {
    let path = context.path.clone();
    let target = context.target;
    let scope_variables = context.scope_variables.clone();
    let diagnostics = context.diagnostics;
    let structure_locked = context.structure_locked;
    let allow_kind_change = context.allow_kind_change;
    let language = context.language;
    let current_selection = current_selection_value(state, expression);
    let selector_options = selector_options(state, language, &scope_variables, path.is_empty());
    let warning_message = diagnostics
        .iter()
        .find(|diagnostic| diagnostic.path == path)
        .map(|diagnostic| diagnostic.message.as_str());

    let is_focused = state.focused_path.as_ref() == Some(&path);
    let border_style = if is_focused {
        "2px solid var(--accent)"
    } else if warning_message.is_some() {
        "1px solid var(--error)"
    } else if path.is_empty() {
        "1px solid var(--border)"
    } else {
        "1px solid rgb(255 255 255 / 0.1)"
    };
    let card_padding = if path.is_empty() {
        "0.5rem 0.65rem"
    } else {
        "0.3rem 0.45rem"
    };
    let card_gap = if path.is_empty() {
        "0.35rem"
    } else {
        "0.25rem"
    };
    let card_bg = if path.is_empty() {
        "var(--surface)"
    } else {
        "rgb(255 255 255 / 0.02)"
    };
    let card_class = if path.is_empty() {
        "event-detail-card"
    } else {
        ""
    };
    let path_str = crate::app_state::path_to_string(&path);

    rsx! {
        div {
            class: "{card_class}",
            "data-path": "{path_str}",
            style: "padding: {card_padding}; display: grid; gap: {card_gap}; border: {border_style}; background: {card_bg}; border-radius: var(--radius-sm); width: 100%; box-sizing: border-box;",
            if allow_kind_change && is_compound_expression(expression) {
                {
                    expression_selector(
                        state,
                        path.clone(),
                        target,
                        &current_selection,
                        &selector_options,
                    )
                }
            }
            if let Some(msg) = warning_message {
                div { style: "font-size: 0.75rem; color: var(--error);", "{msg}" }
            }
            {
                match expression {
                    definy_event::event::Expression::Number(number_expression) => {
                        rsx! {
                            div { style: "display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;",
                                if allow_kind_change {
                                    {
                                        expression_selector(
                                            state,
                                            path.clone(),
                                            target,
                                            &current_selection,
                                            &selector_options,
                                        )
                                    }
                                }
                                {number_input(path.clone(), target, number_expression.value)}
                            }
                        }
                    }
                    definy_event::event::Expression::String(string_expression) => {
                        rsx! {
                            div { style: "display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; width: 100%;",
                                if allow_kind_change {
                                    {
                                        expression_selector(
                                            state,
                                            path.clone(),
                                            target,
                                            &current_selection,
                                            &selector_options,
                                        )
                                    }
                                }
                                {string_input(path.clone(), target, string_expression.value.as_ref())}
                            }
                        }
                    }
                    definy_event::event::Expression::TypeNumber
                    | definy_event::event::Expression::TypeString
                    | definy_event::event::Expression::TypeBoolean => rsx! {
                        div { style: "display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;",
                            if allow_kind_change {
                                {
                                    expression_selector(
                                        state,
                                        path.clone(),
                                        target,
                                        &current_selection,
                                        &selector_options,
                                    )
                                }
                            }
                            div { style: "font-size: 0.75rem; color: var(--text-secondary);",
                                "{language.label(\"Built-in types\", \"組み込み型\", \"Enkonstruitaj tipoj\")}"
                            }
                        }
                    },
                    definy_event::event::Expression::TypeList(type_list_expression) => {
                        let mut item_type_path = path.clone();
                        item_type_path.push(PathStep::TypeListItem);
                        rsx! {
                            div { style: "display: grid; gap: 0.3rem;",
                                "{language.label(\"Item Type\", \"要素型\", \"Ero-tipo\")}"
                                {
                                    render_expression_editor(
                                        state,
                                        type_list_expression.item_type.as_ref(),
                                        context
                                            .child(
                                                item_type_path,
                                                scope_variables.clone(),
                                                structure_locked,
                                                allow_kind_change,
                                            ),
                                    )
                                }
                            }
                        }
                    }
                    definy_event::event::Expression::ListLiteral(list_expression) => {
                        render_list_literal(state, &context, &path, target, list_expression)
                    }
                    definy_event::event::Expression::Add(add_expression) => {
                        render_binary_inputs(
                            state,
                            &context,
                            &path,
                            &add_expression.left,
                            &add_expression.right,
                        )
                    }
                    definy_event::event::Expression::Subtract(sub_expression) => {
                        render_binary_inputs(
                            state,
                            &context,
                            &path,
                            &sub_expression.left,
                            &sub_expression.right,
                        )
                    }
                    definy_event::event::Expression::Multiply(mul_expression) => {
                        render_binary_inputs(
                            state,
                            &context,
                            &path,
                            &mul_expression.left,
                            &mul_expression.right,
                        )
                    }
                    definy_event::event::Expression::Divide(div_expression) => {
                        render_binary_inputs(
                            state,
                            &context,
                            &path,
                            &div_expression.left,
                            &div_expression.right,
                        )
                    }
                    definy_event::event::Expression::Remainder(rem_expression) => {
                        render_binary_inputs(
                            state,
                            &context,
                            &path,
                            &rem_expression.left,
                            &rem_expression.right,
                        )
                    }
                    definy_event::event::Expression::Equal(equal_expression) => {
                        render_binary_inputs(
                            state,
                            &context,
                            &path,
                            &equal_expression.left,
                            &equal_expression.right,
                        )
                    }
                    definy_event::event::Expression::NotEqual(ne_expression) => {
                        render_binary_inputs(
                            state,
                            &context,
                            &path,
                            &ne_expression.left,
                            &ne_expression.right,
                        )
                    }
                    definy_event::event::Expression::LessThan(lt_expression) => {
                        render_binary_inputs(
                            state,
                            &context,
                            &path,
                            &lt_expression.left,
                            &lt_expression.right,
                        )
                    }
                    definy_event::event::Expression::LessThanOrEqual(le_expression) => {
                        render_binary_inputs(
                            state,
                            &context,
                            &path,
                            &le_expression.left,
                            &le_expression.right,
                        )
                    }
                    definy_event::event::Expression::GreaterThan(gt_expression) => {
                        render_binary_inputs(
                            state,
                            &context,
                            &path,
                            &gt_expression.left,
                            &gt_expression.right,
                        )
                    }
                    definy_event::event::Expression::GreaterThanOrEqual(ge_expression) => {
                        render_binary_inputs(
                            state,
                            &context,
                            &path,
                            &ge_expression.left,
                            &ge_expression.right,
                        )
                    }
                    definy_event::event::Expression::Not(not_expression) => {
                        let mut val_path = path.clone();
                        val_path.push(PathStep::Condition);
                        rsx! {
                            div { style: "display: grid; gap: 0.3rem;",
                                "{language.label(\"Value\", \"値\", \"Valoro\")}"
                                {
                                    render_expression_editor(
                                        state,
                                        not_expression.value.as_ref(),
                                        context
                                            .child(
                                                val_path,
                                                scope_variables.clone(),
                                                structure_locked,
                                                allow_kind_change,
                                            ),
                                    )
                                }
                            }
                        }
                    }
                    definy_event::event::Expression::And(and_expression) => {
                        render_binary_inputs(
                            state,
                            &context,
                            &path,
                            &and_expression.left,
                            &and_expression.right,
                        )
                    }
                    definy_event::event::Expression::Or(or_expression) => {
                        render_binary_inputs(
                            state,
                            &context,
                            &path,
                            &or_expression.left,
                            &or_expression.right,
                        )
                    }
                    definy_event::event::Expression::StringConcat(concat_expr) => {
                        render_binary_inputs(
                            state,
                            &context,
                            &path,
                            &concat_expr.left,
                            &concat_expr.right,
                        )
                    }
                    definy_event::event::Expression::StringLength(len_expr) => {
                        let mut val_path = path.clone();
                        val_path.push(PathStep::Condition);
                        rsx! {
                            div { style: "display: grid; gap: 0.3rem;",
                                "{language.label(\"String\", \"文字列\", \"Ĉeno\")}"
                                {
                                    render_expression_editor(
                                        state,
                                        len_expr.value.as_ref(),
                                        context
                                            .child(
                                                val_path,
                                                scope_variables.clone(),
                                                structure_locked,
                                                allow_kind_change,
                                            ),
                                    )
                                }
                            }
                        }
                    }
                    definy_event::event::Expression::StringSlice(slice_expr) => {
                        render_string_slice(state, &context, &path, slice_expr)
                    }
                    definy_event::event::Expression::ListLength(len_expr) => {
                        let mut val_path = path.clone();
                        val_path.push(PathStep::Condition);
                        rsx! {
                            div { style: "display: grid; gap: 0.3rem;",
                                "{language.label(\"List\", \"リスト\", \"Listo\")}"
                                {
                                    render_expression_editor(
                                        state,
                                        len_expr.value.as_ref(),
                                        context
                                            .child(
                                                val_path,
                                                scope_variables.clone(),
                                                structure_locked,
                                                allow_kind_change,
                                            ),
                                    )
                                }
                            }
                        }
                    }
                    definy_event::event::Expression::ListConcat(concat_expr) => {
                        render_binary_inputs(
                            state,
                            &context,
                            &path,
                            &concat_expr.left,
                            &concat_expr.right,
                        )
                    }
                    definy_event::event::Expression::ListGet(get_expr) => {
                        render_list_get(state, &context, &path, get_expr)
                    }
                    definy_event::event::Expression::ListAppend(append_expr) => {
                        render_list_append(state, &context, &path, append_expr)
                    }
                    definy_event::event::Expression::Boolean(boolean_expression) => {
                        rsx! {
                            div { style: "display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;",
                                if allow_kind_change {
                                    {
                                        expression_selector(
                                            state,
                                            path.clone(),
                                            target,
                                            &current_selection,
                                            &selector_options,
                                        )
                                    }
                                }
                                {boolean_input(language, path.clone(), target, boolean_expression.value)}
                            }
                        }
                    }
                    definy_event::event::Expression::If(if_expression) => {
                        render_if(state, &context, &path, if_expression)
                    }
                    definy_event::event::Expression::Let(let_expression) => {
                        render_let(state, &context, &path, target, let_expression)
                    }
                    definy_event::event::Expression::TypeLiteral(record_expression) => {
                        render_type_literal(state, &context, &path, target, record_expression)
                    }
                    definy_event::event::Expression::Constructor(constructor_expression) => {
                        let mut value_path = path.clone();
                        value_path.push(PathStep::ConstructorValue);
                        let type_part_name = crate::part_projection::find_part_snapshot(
                                state,
                                &constructor_expression.type_part_definition_event_hash,
                            )
                            .map(|s| s.part_name)
                            .unwrap_or_else(|| {
                                constructor_expression
                                    .type_part_definition_event_hash
                                    .to_string()
                            });
                        rsx! {
                            div { style: "display: grid; gap: 0.45rem;",
                                div { style: "font-size: 0.8rem; color: var(--text-secondary);", "{type_part_name}" }
                                {
                                    render_expression_editor(
                                        state,
                                        constructor_expression.value.as_ref(),
                                        context
                                            .child(
                                                value_path,
                                                scope_variables.clone(),
                                                structure_locked,
                                                allow_kind_change,
                                            ),
                                    )
                                }
                            }
                        }
                    }
                    definy_event::event::Expression::PartReference(
                        part_reference_expression,
                    ) => {
                        let part = crate::part_projection::find_part_snapshot(
                            state,
                            &part_reference_expression.part_definition_event_hash,
                        );
                        let part_name = part
                            .as_ref()
                            .map(|p| p.part_name.as_str())
                            .unwrap_or("Unknown");
                        let part_type = part
                            .as_ref()
                            .and_then(|p| p.part_type.as_ref())
                            .map(crate::part_list::part_type_text)
                            .unwrap_or_else(|| "Part".to_string());
                        rsx! {
                            div { style: "display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;",
                                if allow_kind_change {
                                    {
                                        expression_selector(
                                            state,
                                            path.clone(),
                                            target,
                                            &current_selection,
                                            &selector_options,
                                        )
                                    }
                                }
                                div { style: "display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; padding: 0.15rem 0.4rem; background: rgb(255 255 255 / 0.05); border-radius: var(--radius-sm);",
                                    div { style: "font-weight: 600;", "{part_name}" }
                                    div {
                                        class: "badge",
                                        style: "font-size: 0.68rem; color: var(--primary); background: rgb(124 192 216 / 0.1); padding: 0.05rem 0.3rem; border-radius: var(--radius-full);",
                                        "{part_type}"
                                    }
                                }
                            }
                        }
                    }
                    definy_event::event::Expression::Variable(_) => rsx! {
                        div { style: "display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;",
                            if allow_kind_change {
                                {
                                    expression_selector(
                                        state,
                                        path.clone(),
                                        target,
                                        &current_selection,
                                        &selector_options,
                                    )
                                }
                            }
                        }
                    },
                    definy_event::event::Expression::Compiler(_) => rsx! {
                        div { style: "display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;",
                            if allow_kind_change {
                                {
                                    expression_selector(
                                        state,
                                        path.clone(),
                                        target,
                                        &current_selection,
                                        &selector_options,
                                    )
                                }
                            }
                            div { style: "font-size: 0.75rem; color: var(--text-secondary);",
                                "{language.label(\"Compiler Builtin\", \"コンパイラ組み込み\", \"Kompililo enkonstruita\")}"
                            }
                        }
                    },
                    definy_event::event::Expression::Function(func_expression) => {
                        rsx! {
                            div { style: "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;",
                                if allow_kind_change {
                                    {
                                        expression_selector(
                                            state,
                                            path.clone(),
                                            target,
                                            &current_selection,
                                            &selector_options,
                                        )
                                    }
                                }
                                {render_function(state, &context, &path, target, func_expression)}
                            }
                        }
                    }
                    definy_event::event::Expression::Call(call_expression) => rsx! {
                        div { style: "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;",
                            if allow_kind_change {
                                {
                                    expression_selector(
                                        state,
                                        path.clone(),
                                        target,
                                        &current_selection,
                                        &selector_options,
                                    )
                                }
                            }
                            {render_call(state, &context, &path, target, call_expression)}
                        }
                    },
                    definy_event::event::Expression::TypeFunction(type_func_expression) => {
                        rsx! {
                            div { style: "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;",
                                if allow_kind_change {
                                    {
                                        expression_selector(
                                            state,
                                            path.clone(),
                                            target,
                                            &current_selection,
                                            &selector_options,
                                        )
                                    }
                                }
                                {render_type_function(state, &context, &path, target, type_func_expression)}
                            }
                        }
                    }
                }
            }
        }
    }
}
