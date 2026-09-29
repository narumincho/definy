use dioxus::prelude::*;

use crate::app_state::{AppState, PathStep};

use super::super::types::{ExpressionEditorContext, ScopeVariable};
use super::inputs::{
    add_list_item_button, add_record_item_button, function_param_name_input, get_tabular_keys,
    let_name_input, record_get_key_input, record_item_key_input, remove_list_item_button,
    remove_record_item_button,
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
                                allow_kind_change_for_nested_values(context.allow_kind_change, path),
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
                                allow_kind_change_for_nested_values(context.allow_kind_change, path),
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

    rsx! {
        div { style: "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;",
            div { style: "display: grid; gap: 0.15rem; width: 100%;",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Target String\", \"対象文字列\", \"Cela ĉeno\")}"
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
            div { style: "display: flex; gap: 0.4rem; flex-wrap: wrap;",
                div { style: "display: grid; gap: 0.15rem; flex: 1; min-width: 6rem;",
                    div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                        "{language.label(\"Start Index\", \"開始インデックス\", \"Komenca indico\")}"
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
                div { style: "display: grid; gap: 0.15rem; flex: 1; min-width: 6rem;",
                    div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                        "{language.label(\"End Index\", \"終了インデックス\", \"Fina indico\")}"
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
}

pub fn render_list_get(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
    get_expr: &definy_event::event::ListGetExpression,
) -> Element {
    let mut list_path = path.to_vec();
    list_path.push(PathStep::Condition);
    let mut index_path = path.to_vec();
    index_path.push(PathStep::Index);
    let language = context.language;

    rsx! {
        div { style: "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;",
            div { style: "display: grid; gap: 0.15rem; width: 100%;",
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
            div { style: "display: grid; gap: 0.15rem; width: 100%;",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Index\", \"インデックス\", \"Indico\")}"
                }
                {
                    render_expression_editor(
                        state,
                        get_expr.index.as_ref(),
                        context
                            .child(
                                index_path,
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

pub fn render_record_get(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
    get_expr: &definy_event::event::RecordGetExpression,
) -> Element {
    let mut record_path = path.to_vec();
    record_path.push(PathStep::Record);
    let language = context.language;

    rsx! {
        div { style: "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;",
            div { style: "display: flex; align-items: center; gap: 0.5rem;",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Field name\", \"フィールド名\", \"Kampnomo\")}:"
                }
                {record_get_key_input(path.to_vec(), &get_expr.key)}
            }
            div { style: "display: grid; gap: 0.15rem; width: 100%;",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Record\", \"レコード\", \"Rikordo\")}"
                }
                {
                    render_expression_editor(
                        state,
                        get_expr.record.as_ref(),
                        context
                            .child(
                                record_path,
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
    list_path.push(PathStep::Condition);
    let mut item_path = path.to_vec();
    item_path.push(PathStep::Item);
    let language = context.language;

    rsx! {
        div { style: "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;",
            div { style: "display: grid; gap: 0.15rem; width: 100%;",
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
            div { style: "display: grid; gap: 0.15rem; width: 100%;",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Item to Append\", \"追加する要素\", \"Ero por aldoni\")}"
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
    let mut condition_path = path.to_vec();
    condition_path.push(PathStep::Condition);
    let mut then_path = path.to_vec();
    then_path.push(PathStep::Then);
    let mut else_path = path.to_vec();
    else_path.push(PathStep::Else);
    let language = context.language;

    rsx! {
        div { style: "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;",
            div { style: "display: grid; gap: 0.15rem; width: 100%;",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Condition\", \"条件\", \"Kondiĉo\")}"
                }
                {
                    render_expression_editor(
                        state,
                        if_expression.condition.as_ref(),
                        context
                            .child(
                                condition_path,
                                context.scope_variables.clone(),
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
            div { style: "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;",
                div { style: "display: grid; gap: 0.15rem; width: 100%;",
                    div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                        "{language.label(\"Then\", \"真の場合\", \"Tiam\")}"
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
                div { style: "display: grid; gap: 0.15rem; width: 100%;",
                    div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                        "{language.label(\"Else\", \"偽の場合\", \"Alie\")}"
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
}

pub fn render_let(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
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
                    {let_name_input(path.to_vec(), &var_name)}
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
                        {let_name_input(path.to_vec(), &var_name)}
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
    list_expression: &definy_event::event::ListLiteralExpression,
) -> Element {
    let language = context.language;
    let tabular_keys = get_tabular_keys(list_expression);
    if let Some(keys) = tabular_keys {
        rsx! {
            div { style: "display: grid; grid-template-columns: max-content repeat({keys.len()}, 1fr); gap: 0.2rem; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.5rem; overflow-x: auto;",
                div { style: "font-weight: bold; font-size: 0.8rem; color: var(--text-secondary); padding: 0.2rem 0.5rem;" }
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
                                style: "display: flex; align-items: center; justify-content: center; padding: 0.2rem 0.5rem;",
                                {remove_list_item_button(path.to_vec(), index)}
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
            {add_list_item_button(language, path.to_vec())}
        }
    } else {
        rsx! {
            div { style: "display: flex; flex-direction: column; gap: 0.35rem;",
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
                                style: "display: flex; align-items: center; gap: 0.35rem; width: 100%;",
                                div { style: "flex: 1; min-width: 0;",
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
                                {remove_list_item_button(path.to_vec(), index)}
                            }
                        }
                    }
                }
                {add_list_item_button(language, path.to_vec())}
            }
        }
    }
}

pub fn render_type_literal(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
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
                                    {record_item_key_input(path.to_vec(), index, &key)}
                                    if is_not_first {
                                        {remove_record_item_button(language, path.to_vec(), index)}
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
                {add_record_item_button(language, path.to_vec())}
            }
        }
    }
}

pub fn render_function(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
    func_expression: &definy_event::event::FunctionExpression,
) -> Element {
    let mut body_path = path.to_vec();
    body_path.push(PathStep::FunctionBody);
    let param_name = func_expression.parameter_name.clone();
    let mut body_scope = context.scope_variables.clone();
    body_scope.push(ScopeVariable {
        id: func_expression.parameter_id,
        name: func_expression.parameter_name.to_string(),
    });
    let language = context.language;

    rsx! {
        div { style: "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;",
            div { style: "display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: flex-start;",
                div { style: "display: grid; gap: 0.15rem; min-width: 7.5rem;",
                    div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                        "{language.label(\"Parameter\", \"引数名\", \"Parametro\")}"
                    }
                    {function_param_name_input(path.to_vec(), &param_name)}
                }
            }
            div { style: "display: grid; gap: 0.15rem; width: 100%;",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Body\", \"関数本体\", \"Korpo\")}"
                }
                {
                    render_expression_editor(
                        state,
                        func_expression.body.as_ref(),
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

pub fn render_call(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
    call_expression: &definy_event::event::CallExpression,
) -> Element {
    let mut func_path = path.to_vec();
    func_path.push(PathStep::CallFunction);
    let mut arg_path = path.to_vec();
    arg_path.push(PathStep::CallArgument);
    let language = context.language;

    rsx! {
        div { style: "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;",
            div { style: "display: grid; gap: 0.15rem; width: 100%;",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Function\", \"関数\", \"Funkcio\")}"
                }
                {
                    render_expression_editor(
                        state,
                        call_expression.function.as_ref(),
                        context
                            .child(
                                func_path,
                                context.scope_variables.clone(),
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
            div { style: "display: grid; gap: 0.15rem; width: 100%;",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Argument\", \"実引数\", \"Argumento\")}"
                }
                {
                    render_expression_editor(
                        state,
                        call_expression.argument.as_ref(),
                        context
                            .child(
                                arg_path,
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

pub fn render_type_function(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
    type_func: &definy_event::event::TypeFunctionExpression,
) -> Element {
    let mut param_path = path.to_vec();
    param_path.push(PathStep::TypeFunctionParameter);
    let mut ret_path = path.to_vec();
    ret_path.push(PathStep::TypeFunctionReturn);
    let language = context.language;

    rsx! {
        div { style: "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;",
            div { style: "display: grid; gap: 0.15rem; width: 100%;",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Parameter Type\", \"引数の型\", \"Parametra tipo\")}"
                }
                {
                    render_expression_editor(
                        state,
                        type_func.parameter.as_ref(),
                        context
                            .child(
                                param_path,
                                context.scope_variables.clone(),
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
            div { style: "display: grid; gap: 0.15rem; width: 100%;",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Return Type\", \"戻り値の型\", \"Rezulta tipo\")}"
                }
                {
                    render_expression_editor(
                        state,
                        type_func.return_type.as_ref(),
                        context
                            .child(
                                ret_path,
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
