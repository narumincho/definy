use dioxus::prelude::*;

use crate::app_state::{AppState, PathStep};

use super::super::types::{EditorTarget, ExpressionEditorContext, ScopeVariable};
use super::inputs::{
    add_list_item_button, add_record_item_button, get_tabular_keys, let_name_input,
    record_item_key_input, remove_list_item_button, remove_record_item_button,
};
use super::is_compound_expression;
use super::render_expression_editor;
use super::selector::allow_kind_change_for_nested_values;

pub fn render_binary_inputs(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
    left: &definy_event::event::Expression,
    right: &definy_event::event::Expression,
) -> Element {
    let mut left_path = path.to_vec();
    left_path.push(PathStep::Left);
    let mut right_path = path.to_vec();
    right_path.push(PathStep::Right);
    let language = context.language;

    let has_nested = is_compound_expression(left) || is_compound_expression(right);
    let container_style = if has_nested {
        "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;"
    } else {
        "display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: flex-start;"
    };
    let item_style = if has_nested {
        "display: grid; gap: 0.15rem; width: 100%;"
    } else {
        "display: grid; gap: 0.15rem; flex: 1; min-width: 7rem;"
    };

    rsx! {
        div { style: "{container_style}",
            div { style: "{item_style}",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Left\", \"左\", \"Maldekstre\")}"
                }
                {
                    render_expression_editor(
                        state,
                        left,
                        context
                            .child(
                                left_path,
                                context.scope_variables.clone(),
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
            div { style: "{item_style}",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Right\", \"右\", \"Dekstre\")}"
                }
                {
                    render_expression_editor(
                        state,
                        right,
                        context
                            .child(
                                right_path,
                                context.scope_variables.clone(),
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
        }
    }
}

pub fn render_string_slice(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
    slice_expr: &definy_event::event::StringSliceExpression,
) -> Element {
    let mut val_path = path.to_vec();
    val_path.push(PathStep::Condition);
    let mut start_path = path.to_vec();
    start_path.push(PathStep::Start);
    let mut end_path = path.to_vec();
    end_path.push(PathStep::End);
    let language = context.language;

    let has_nested = is_compound_expression(slice_expr.value.as_ref())
        || is_compound_expression(slice_expr.start.as_ref())
        || is_compound_expression(slice_expr.end.as_ref());
    let container_style = if has_nested {
        "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;"
    } else {
        "display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: flex-start;"
    };
    let item_style = if has_nested {
        "display: grid; gap: 0.15rem; width: 100%;"
    } else {
        "display: grid; gap: 0.15rem; flex: 1; min-width: 6rem;"
    };

    rsx! {
        div { style: "{container_style}",
            div { style: "{item_style}",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"String\", \"文字列\", \"Ĉeno\")}"
                }
                {
                    render_expression_editor(
                        state,
                        slice_expr.value.as_ref(),
                        context
                            .child(
                                val_path,
                                context.scope_variables.clone(),
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
            div { style: "{item_style}",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Start\", \"開始位置\", \"Komenco\")}"
                }
                {
                    render_expression_editor(
                        state,
                        slice_expr.start.as_ref(),
                        context
                            .child(
                                start_path,
                                context.scope_variables.clone(),
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
            div { style: "{item_style}",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"End\", \"終了位置\", \"Fino\")}"
                }
                {
                    render_expression_editor(
                        state,
                        slice_expr.end.as_ref(),
                        context
                            .child(
                                end_path,
                                context.scope_variables.clone(),
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
        }
    }
}

pub fn render_list_get(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
    get_expr: &definy_event::event::ListGetExpression,
) -> Element {
    let mut list_path = path.to_vec();
    list_path.push(PathStep::Left);
    let mut idx_path = path.to_vec();
    idx_path.push(PathStep::Index);
    let language = context.language;

    let has_nested = is_compound_expression(get_expr.list.as_ref())
        || is_compound_expression(get_expr.index.as_ref());
    let container_style = if has_nested {
        "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;"
    } else {
        "display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: flex-start;"
    };
    let item_style = if has_nested {
        "display: grid; gap: 0.15rem; width: 100%;"
    } else {
        "display: grid; gap: 0.15rem; flex: 1; min-width: 7rem;"
    };

    rsx! {
        div { style: "{container_style}",
            div { style: "{item_style}",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"List\", \"リスト\", \"Listo\")}"
                }
                {
                    render_expression_editor(
                        state,
                        get_expr.list.as_ref(),
                        context
                            .child(
                                list_path,
                                context.scope_variables.clone(),
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
            div { style: "{item_style}",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Index\", \"インデックス\", \"Indekso\")}"
                }
                {
                    render_expression_editor(
                        state,
                        get_expr.index.as_ref(),
                        context
                            .child(
                                idx_path,
                                context.scope_variables.clone(),
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
        }
    }
}

pub fn render_list_append(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
    append_expr: &definy_event::event::ListAppendExpression,
) -> Element {
    let mut list_path = path.to_vec();
    list_path.push(PathStep::Left);
    let mut item_path = path.to_vec();
    item_path.push(PathStep::Item);
    let language = context.language;

    let has_nested = is_compound_expression(append_expr.list.as_ref())
        || is_compound_expression(append_expr.item.as_ref());
    let container_style = if has_nested {
        "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;"
    } else {
        "display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: flex-start;"
    };
    let item_style = if has_nested {
        "display: grid; gap: 0.15rem; width: 100%;"
    } else {
        "display: grid; gap: 0.15rem; flex: 1; min-width: 7rem;"
    };

    rsx! {
        div { style: "{container_style}",
            div { style: "{item_style}",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"List\", \"リスト\", \"Listo\")}"
                }
                {
                    render_expression_editor(
                        state,
                        append_expr.list.as_ref(),
                        context
                            .child(
                                list_path,
                                context.scope_variables.clone(),
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
            div { style: "{item_style}",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Item\", \"項目\", \"Elemento\")}"
                }
                {
                    render_expression_editor(
                        state,
                        append_expr.item.as_ref(),
                        context
                            .child(
                                item_path,
                                context.scope_variables.clone(),
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
        }
    }
}

pub fn render_if(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
    if_expression: &definy_event::event::IfExpression,
) -> Element {
    let mut cond_path = path.to_vec();
    cond_path.push(PathStep::Condition);
    let mut then_path = path.to_vec();
    then_path.push(PathStep::Then);
    let mut else_path = path.to_vec();
    else_path.push(PathStep::Else);
    let language = context.language;

    let has_nested = is_compound_expression(if_expression.condition.as_ref())
        || is_compound_expression(if_expression.then_expr.as_ref())
        || is_compound_expression(if_expression.else_expr.as_ref());
    let container_style = if has_nested {
        "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;"
    } else {
        "display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: flex-start;"
    };
    let item_style = if has_nested {
        "display: grid; gap: 0.15rem; width: 100%;"
    } else {
        "display: grid; gap: 0.15rem; flex: 1; min-width: 6.5rem;"
    };

    rsx! {
        div { style: "{container_style}",
            div { style: "{item_style}",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Condition\", \"条件\", \"Kondiĉo\")}"
                }
                {
                    render_expression_editor(
                        state,
                        if_expression.condition.as_ref(),
                        context
                            .child(
                                cond_path,
                                context.scope_variables.clone(),
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
            div { style: "{item_style}",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Then\", \"なら\", \"Tiam\")}"
                }
                {
                    render_expression_editor(
                        state,
                        if_expression.then_expr.as_ref(),
                        context
                            .child(
                                then_path,
                                context.scope_variables.clone(),
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
            div { style: "{item_style}",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Else\", \"それ以外\", \"Alie\")}"
                }
                {
                    render_expression_editor(
                        state,
                        if_expression.else_expr.as_ref(),
                        context
                            .child(
                                else_path,
                                context.scope_variables.clone(),
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
        }
    }
}

pub fn render_let(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
    target: EditorTarget,
    let_expression: &definy_event::event::LetExpression,
) -> Element {
    let mut value_path = path.to_vec();
    value_path.push(PathStep::LetValue);
    let mut body_path = path.to_vec();
    body_path.push(PathStep::LetBody);
    let var_name = let_expression.variable_name.clone();
    let mut body_scope = context.scope_variables.clone();
    body_scope.push(ScopeVariable {
        id: let_expression.variable_id,
        name: let_expression.variable_name.to_string(),
    });
    let language = context.language;

    let is_value_compound = is_compound_expression(let_expression.value.as_ref());

    rsx! {
        div { style: "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;",
            if is_value_compound {
                div { style: "display: grid; gap: 0.15rem;",
                    div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                        "{language.label(\"Let Name\", \"変数名\", \"Nomo\")}"
                    }
                    {let_name_input(path.to_vec(), target, &var_name)}
                }
                div { style: "display: grid; gap: 0.15rem; width: 100%;",
                    div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                        "{language.label(\"Value\", \"値\", \"Valoro\")}"
                    }
                    {
                        render_expression_editor(
                            state,
                            let_expression.value.as_ref(),
                            context
                                .child(
                                    value_path,
                                    context.scope_variables.clone(),
                                    context.structure_locked,
                                    context.allow_kind_change,
                                ),
                        )
                    }
                }
            } else {
                div { style: "display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: flex-start;",
                    div { style: "display: grid; gap: 0.15rem; min-width: 7.5rem;",
                        div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                            "{language.label(\"Let Name\", \"変数名\", \"Nomo\")}"
                        }
                        {let_name_input(path.to_vec(), target, &var_name)}
                    }
                    div { style: "display: grid; gap: 0.15rem; flex: 1; min-width: 8rem;",
                        div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                            "{language.label(\"Value\", \"値\", \"Valoro\")}"
                        }
                        {
                            render_expression_editor(
                                state,
                                let_expression.value.as_ref(),
                                context
                                    .child(
                                        value_path,
                                        context.scope_variables.clone(),
                                        context.structure_locked,
                                        context.allow_kind_change,
                                    ),
                            )
                        }
                    }
                }
            }
            div { style: "display: grid; gap: 0.15rem; width: 100%;",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Body\", \"本体\", \"Kerno\")}"
                }
                {
                    render_expression_editor(
                        state,
                        let_expression.body.as_ref(),
                        context
                            .child(
                                body_path,
                                body_scope,
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
        }
    }
}

pub fn render_list_literal(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
    target: EditorTarget,
    list_expression: &definy_event::event::ListLiteralExpression,
) -> Element {
    let language = context.language;
    let tabular_keys = get_tabular_keys(list_expression);
    if let Some(keys) = tabular_keys {
        rsx! {
            div { style: "display: grid; grid-template-columns: max-content repeat({keys.len()}, 1fr); gap: 0.2rem; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.5rem; overflow-x: auto;",
                div { style: "font-weight: bold; font-size: 0.8rem; color: var(--text-secondary); padding: 0.2rem 0.5rem;",
                    "{language.label(\"Item\", \"項目\", \"Ero\")}"
                }
                for key in &keys {
                    div {
                        key: "{key}",
                        style: "font-weight: bold; font-size: 0.8rem; color: var(--text-secondary); padding: 0.2rem 0.5rem;",
                        "{key}"
                    }
                }
                for (index, item) in list_expression.items.iter().enumerate() {
                    {
                        let mut item_path = path.to_vec();
                        item_path.push(PathStep::ListItemValue(index));
                        let allow_kind_for_item = allow_kind_change_for_nested_values(
                            context.allow_kind_change,
                            path,
                        );
                        rsx! {
                            div {
                                key: "row-{index}",
                                style: "display: flex; align-items: center; gap: 0.4rem; padding: 0.2rem 0.5rem;",
                                "{index + 1}"
                                {remove_list_item_button(path.to_vec(), index, target)}
                            }
                            if let definy_event::event::Expression::TypeLiteral(record) = item {
                                for (i, record_item) in record.items.iter().enumerate() {
                                    {
                                        let mut value_path = item_path.clone();
                                        value_path.push(PathStep::RecordItemValue(i));
                                        rsx! {
                                            div {
                                                key: "cell-{index}-{i}",
                                                style: "display: flex; align-items: stretch; padding: 0.2rem;",
                                                {
                                                    render_expression_editor(
                                                        state,
                                                        record_item.value.as_ref(),
                                                        context
                                                            .child(
                                                                value_path,
                                                                context.scope_variables.clone(),
                                                                context.structure_locked,
                                                                allow_kind_for_item,
                                                            ),
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            {add_list_item_button(language, path.to_vec(), target)}
        }
    } else {
        rsx! {
            div { style: "display: flex; flex-direction: column; gap: 0.4rem;",
                for (index, item) in list_expression.items.iter().enumerate() {
                    {
                        let mut item_path = path.to_vec();
                        item_path.push(PathStep::ListItemValue(index));
                        let allow_kind_for_item = allow_kind_change_for_nested_values(
                            context.allow_kind_change,
                            path,
                        );
                        rsx! {
                            div {
                                key: "list-item-{index}",
                                style: "display: flex; flex-direction: column; gap: 0.3rem; padding: 0.35rem 0.5rem; border: 1px solid var(--border); border-radius: var(--radius-sm);",
                                div { style: "display: flex; gap: 0.5rem;",
                                    div { style: "font-size: 0.75rem; color: var(--text-secondary); flex: 1;",
                                        "{language.label(\"Item\", \"項目\", \"Ero\")} {index + 1}"
                                    }
                                    {remove_list_item_button(path.to_vec(), index, target)}
                                }
                                {
                                    render_expression_editor(
                                        state,
                                        item,
                                        context
                                            .child(
                                                item_path,
                                                context.scope_variables.clone(),
                                                context.structure_locked,
                                                allow_kind_for_item,
                                            ),
                                    )
                                }
                            }
                        }
                    }
                }
                {add_list_item_button(language, path.to_vec(), target)}
            }
        }
    }
}

pub fn render_type_literal(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
    target: EditorTarget,
    record_expression: &definy_event::event::TypeLiteralExpression,
) -> Element {
    let language = context.language;
    rsx! {
        div { style: "display: grid; gap: 0.4rem;",
            div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                "{language.label(\"Record fields\", \"レコードフィールド\", \"Kampoj de rikordo\")}"
            }
            div { style: "display: grid; gap: 0.35rem;",
                for (index, item) in record_expression.items.iter().enumerate() {
                    {
                        let mut item_path = path.to_vec();
                        item_path.push(PathStep::RecordItemValue(index));
                        let key = item.key.clone();
                        let is_not_first = index > 0;
                        rsx! {
                            div {
                                key: "record-item-{index}",
                                style: "display: grid; gap: 0.3rem; padding: 0.35rem 0.5rem; border: 1px solid var(--border); border-radius: var(--radius-sm);",
                                div { style: "display: flex; gap: 0.4rem; align-items: center;",
                                    {record_item_key_input(path.to_vec(), index, target, &key)}
                                    if is_not_first {
                                        {remove_record_item_button(language, path.to_vec(), index, target)}
                                    }
                                }
                                {
                                    render_expression_editor(
                                        state,
                                        item.value.as_ref(),
                                        context
                                            .child(
                                                item_path,
                                                context.scope_variables.clone(),
                                                context.structure_locked,
                                                context.allow_kind_change,
                                            ),
                                    )
                                }
                            }
                        }
                    }
                }
                {add_record_item_button(language, path.to_vec(), target)}
            }
        }
    }
}
