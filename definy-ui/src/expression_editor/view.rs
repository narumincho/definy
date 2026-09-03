use std::str::FromStr;

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::app_state::{AppState, PathStep};
use crate::language::Language;
use crate::part_projection::collect_part_snapshots;

use super::diagnostics::constructor_default_value_from_type_part;
use super::mutation::*;
use super::types::{EditorTarget, ExpressionEditorContext, ScopeVariable};

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
    } else {
        "1px solid transparent"
    };
    let path_str = crate::app_state::path_to_string(&path);

    rsx! {
        div {
            class: "event-detail-card",
            "data-path": "{path_str}",
            style: "padding: 0.8rem; display: grid; gap: 0.6rem; border: {border_style}; background: var(--surface); border-radius: var(--radius-sm);",
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
            if let Some(msg) = warning_message {
                div { style: "font-size: 0.8rem; color: var(--error);", "{msg}" }
            }
            {
                match expression {
                    definy_event::event::Expression::Number(number_expression) => {
                        rsx! {
                            {number_input(path.clone(), target, number_expression.value)}
                        }
                    }
                    definy_event::event::Expression::String(string_expression) => {
                        rsx! {
                            {string_input(path.clone(), target, string_expression.value.as_ref())}
                        }
                    }
                    definy_event::event::Expression::TypeNumber
                    | definy_event::event::Expression::TypeString
                    | definy_event::event::Expression::TypeBoolean => rsx! {
                        div { style: "font-size: 0.8rem; color: var(--text-secondary);",
                            "{language.label(\"Built-in types\", \"組み込み型\", \"Enkonstruitaj tipoj\")}"
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
                                            let mut item_path = path.clone();
                                            item_path.push(PathStep::ListItemValue(index));
                                            let allow_kind_for_item = allow_kind_change_for_nested_values(
                                                allow_kind_change,
                                                path.as_slice(),
                                            );
                                            rsx! {
                                                div {
                                                    key: "row-{index}",
                                                    style: "display: flex; align-items: center; gap: 0.4rem; padding: 0.2rem 0.5rem;",
                                                    "{index + 1}"
                                                    {remove_list_item_button(path.clone(), index, target)}
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
                                                                                    scope_variables.clone(),
                                                                                    structure_locked,
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
                                {add_list_item_button(language, path.clone(), target)}
                            }
                        } else {
                            rsx! {
                                div { style: "display: flex; flex-direction: column; gap: 0.6rem;",
                                    for (index, item) in list_expression.items.iter().enumerate() {
                                        {
                                            let mut item_path = path.clone();
                                            item_path.push(PathStep::ListItemValue(index));
                                            let allow_kind_for_item = allow_kind_change_for_nested_values(
                                                allow_kind_change,
                                                path.as_slice(),
                                            );
                                            rsx! {
                                                div {
                                                    key: "list-item-{index}",
                                                    style: "display: flex; flex-direction: column; gap: 0.4rem; padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius-md);",
                                                    div { style: "display: flex; gap: 0.5rem;",
                                                        div { style: "font-size: 0.8rem; color: var(--text-secondary); flex: 1;",
                                                            "{language.label(\"Item\", \"項目\", \"Ero\")} {index + 1}"
                                                        }
                                                        {remove_list_item_button(path.clone(), index, target)}
                                                    }
                                                    {
                                                        render_expression_editor(
                                                            state,
                                                            item,
                                                            context
                                                                .child(
                                                                    item_path,
                                                                    scope_variables.clone(),
                                                                    structure_locked,
                                                                    allow_kind_for_item,
                                                                ),
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    {add_list_item_button(language, path.clone(), target)}
                                }
                            }
                        }
                    }
                    definy_event::event::Expression::Add(add_expression) => {
                        render_binary_inputs(state, &context, &path, &add_expression.left, &add_expression.right)
                    }
                    definy_event::event::Expression::Subtract(sub_expression) => {
                        render_binary_inputs(state, &context, &path, &sub_expression.left, &sub_expression.right)
                    }
                    definy_event::event::Expression::Multiply(mul_expression) => {
                        render_binary_inputs(state, &context, &path, &mul_expression.left, &mul_expression.right)
                    }
                    definy_event::event::Expression::Divide(div_expression) => {
                        render_binary_inputs(state, &context, &path, &div_expression.left, &div_expression.right)
                    }
                    definy_event::event::Expression::Remainder(rem_expression) => {
                        render_binary_inputs(state, &context, &path, &rem_expression.left, &rem_expression.right)
                    }
                    definy_event::event::Expression::Equal(equal_expression) => {
                        render_binary_inputs(state, &context, &path, &equal_expression.left, &equal_expression.right)
                    }
                    definy_event::event::Expression::NotEqual(ne_expression) => {
                        render_binary_inputs(state, &context, &path, &ne_expression.left, &ne_expression.right)
                    }
                    definy_event::event::Expression::LessThan(lt_expression) => {
                        render_binary_inputs(state, &context, &path, &lt_expression.left, &lt_expression.right)
                    }
                    definy_event::event::Expression::LessThanOrEqual(le_expression) => {
                        render_binary_inputs(state, &context, &path, &le_expression.left, &le_expression.right)
                    }
                    definy_event::event::Expression::GreaterThan(gt_expression) => {
                        render_binary_inputs(state, &context, &path, &gt_expression.left, &gt_expression.right)
                    }
                    definy_event::event::Expression::GreaterThanOrEqual(ge_expression) => {
                        render_binary_inputs(state, &context, &path, &ge_expression.left, &ge_expression.right)
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
                        render_binary_inputs(state, &context, &path, &and_expression.left, &and_expression.right)
                    }
                    definy_event::event::Expression::Or(or_expression) => {
                        render_binary_inputs(state, &context, &path, &or_expression.left, &or_expression.right)
                    }
                    definy_event::event::Expression::StringConcat(concat_expr) => {
                        render_binary_inputs(state, &context, &path, &concat_expr.left, &concat_expr.right)
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
                        let mut val_path = path.clone();
                        val_path.push(PathStep::Condition);
                        let mut start_path = path.clone();
                        start_path.push(PathStep::Start);
                        let mut end_path = path.clone();
                        end_path.push(PathStep::End);
                        rsx! {
                            div { style: "display: flex; flex-wrap: wrap; gap: 0.6rem;",
                                div { style: "display: grid; gap: 0.3rem;",
                                    "{language.label(\"String\", \"文字列\", \"Ĉeno\")}"
                                    {
                                        render_expression_editor(
                                            state,
                                            slice_expr.value.as_ref(),
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
                                div { style: "display: grid; gap: 0.3rem;",
                                    "{language.label(\"Start\", \"開始位置\", \"Komenco\")}"
                                    {
                                        render_expression_editor(
                                            state,
                                            slice_expr.start.as_ref(),
                                            context
                                                .child(
                                                    start_path,
                                                    scope_variables.clone(),
                                                    structure_locked,
                                                    allow_kind_change,
                                                ),
                                        )
                                    }
                                }
                                div { style: "display: grid; gap: 0.3rem;",
                                    "{language.label(\"End\", \"終了位置\", \"Fino\")}"
                                    {
                                        render_expression_editor(
                                            state,
                                            slice_expr.end.as_ref(),
                                            context
                                                .child(
                                                    end_path,
                                                    scope_variables.clone(),
                                                    structure_locked,
                                                    allow_kind_change,
                                                ),
                                        )
                                    }
                                }
                            }
                        }
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
                        render_binary_inputs(state, &context, &path, &concat_expr.left, &concat_expr.right)
                    }
                    definy_event::event::Expression::ListGet(get_expr) => {
                        let mut list_path = path.clone();
                        list_path.push(PathStep::Left);
                        let mut idx_path = path.clone();
                        idx_path.push(PathStep::Index);
                        rsx! {
                            div { style: "display: flex; flex-wrap: wrap; gap: 0.6rem;",
                                div { style: "display: grid; gap: 0.3rem;",
                                    "{language.label(\"List\", \"リスト\", \"Listo\")}"
                                    {
                                        render_expression_editor(
                                            state,
                                            get_expr.list.as_ref(),
                                            context
                                                .child(
                                                    list_path,
                                                    scope_variables.clone(),
                                                    structure_locked,
                                                    allow_kind_change,
                                                ),
                                        )
                                    }
                                }
                                div { style: "display: grid; gap: 0.3rem;",
                                    "{language.label(\"Index\", \"インデックス\", \"Indekso\")}"
                                    {
                                        render_expression_editor(
                                            state,
                                            get_expr.index.as_ref(),
                                            context
                                                .child(
                                                    idx_path,
                                                    scope_variables.clone(),
                                                    structure_locked,
                                                    allow_kind_change,
                                                ),
                                        )
                                    }
                                }
                            }
                        }
                    }
                    definy_event::event::Expression::ListAppend(append_expr) => {
                        let mut list_path = path.clone();
                        list_path.push(PathStep::Left);
                        let mut item_path = path.clone();
                        item_path.push(PathStep::Item);
                        rsx! {
                            div { style: "display: flex; flex-wrap: wrap; gap: 0.6rem;",
                                div { style: "display: grid; gap: 0.3rem;",
                                    "{language.label(\"List\", \"リスト\", \"Listo\")}"
                                    {
                                        render_expression_editor(
                                            state,
                                            append_expr.list.as_ref(),
                                            context
                                                .child(
                                                    list_path,
                                                    scope_variables.clone(),
                                                    structure_locked,
                                                    allow_kind_change,
                                                ),
                                        )
                                    }
                                }
                                div { style: "display: grid; gap: 0.3rem;",
                                    "{language.label(\"Item\", \"項目\", \"Elemento\")}"
                                    {
                                        render_expression_editor(
                                            state,
                                            append_expr.item.as_ref(),
                                            context
                                                .child(
                                                    item_path,
                                                    scope_variables.clone(),
                                                    structure_locked,
                                                    allow_kind_change,
                                                ),
                                        )
                                    }
                                }
                            }
                        }
                    }
                    definy_event::event::Expression::Boolean(boolean_expression) => {
                        rsx! {
                            {boolean_input(language, path.clone(), target, boolean_expression.value)}
                        }
                    }
                    definy_event::event::Expression::If(if_expression) => {
                        let mut cond_path = path.clone();
                        cond_path.push(PathStep::Condition);
                        let mut then_path = path.clone();
                        then_path.push(PathStep::Then);
                        let mut else_path = path.clone();
                        else_path.push(PathStep::Else);
                        rsx! {
                            div { style: "display: flex; flex-wrap: wrap; gap: 0.6rem;",
                                div { style: "display: grid; gap: 0.3rem;",
                                    "{language.label(\"Condition\", \"条件\", \"Kondiĉo\")}"
                                    {
                                        render_expression_editor(
                                            state,
                                            if_expression.condition.as_ref(),
                                            context
                                                .child(
                                                    cond_path,
                                                    scope_variables.clone(),
                                                    structure_locked,
                                                    allow_kind_change,
                                                ),
                                        )
                                    }
                                }
                                div { style: "display: grid; gap: 0.3rem;",
                                    "{language.label(\"Then\", \"なら\", \"Tiam\")}"
                                    {
                                        render_expression_editor(
                                            state,
                                            if_expression.then_expr.as_ref(),
                                            context
                                                .child(
                                                    then_path,
                                                    scope_variables.clone(),
                                                    structure_locked,
                                                    allow_kind_change,
                                                ),
                                        )
                                    }
                                }
                                div { style: "display: grid; gap: 0.3rem;",
                                    "{language.label(\"Else\", \"それ以外\", \"Alie\")}"
                                    {
                                        render_expression_editor(
                                            state,
                                            if_expression.else_expr.as_ref(),
                                            context
                                                .child(
                                                    else_path,
                                                    scope_variables.clone(),
                                                    structure_locked,
                                                    allow_kind_change,
                                                ),
                                        )
                                    }
                                }
                            }
                        }
                    }
                    definy_event::event::Expression::Let(let_expression) => {
                        let mut value_path = path.clone();
                        value_path.push(PathStep::LetValue);
                        let mut body_path = path.clone();
                        body_path.push(PathStep::LetBody);
                        let var_name = let_expression.variable_name.clone();
                        let mut body_scope = scope_variables.clone();
                        body_scope
                            .push(ScopeVariable {
                                id: let_expression.variable_id,
                                name: let_expression.variable_name.to_string(),
                            });
                        rsx! {
                            div { style: "display: flex; flex-wrap: wrap; gap: 0.6rem;",
                                div { style: "display: grid; gap: 0.3rem;",
                                    "{language.label(\"Let Name\", \"変数名\", \"Nomo\")}"
                                    {let_name_input(path.clone(), target, &var_name)}
                                }
                                div { style: "display: grid; gap: 0.3rem;",
                                    "{language.label(\"Value\", \"値\", \"Valoro\")}"
                                    {
                                        render_expression_editor(
                                            state,
                                            let_expression.value.as_ref(),
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
                                div { style: "display: grid; gap: 0.3rem;",
                                    "{language.label(\"Body\", \"本体\", \"Kerno\")}"
                                    {
                                        render_expression_editor(
                                            state,
                                            let_expression.body.as_ref(),
                                            context.child(body_path, body_scope, structure_locked, allow_kind_change),
                                        )
                                    }
                                }
                            }
                        }
                    }
                    definy_event::event::Expression::TypeLiteral(record_expression) => {
                        rsx! {
                            div { style: "display: grid; gap: 0.6rem;",
                                div { style: "font-size: 0.8rem; color: var(--text-secondary);",
                                    "{language.label(\"Record fields\", \"レコードフィールド\", \"Kampoj de rikordo\")}"
                                }
                                div { style: "display: grid; gap: 0.45rem;",
                                    for (index , item) in record_expression.items.iter().enumerate() {
                                        {
                                            let mut item_path = path.clone();
                                            item_path.push(PathStep::RecordItemValue(index));
                                            let key = item.key.clone();
                                            let is_not_first = index > 0;
                                            rsx! {
                                                div {
                                                    key: "record-item-{index}",
                                                    style: "display: grid; gap: 0.4rem; padding: 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm);",
                                                    div { style: "display: flex; gap: 0.5rem; align-items: center;",
                                                        {record_item_key_input(path.clone(), index, target, &key)}
                                                        if is_not_first {
                                                            {remove_record_item_button(language, path.clone(), index, target)}
                                                        }
                                                    }
                                                    {
                                                        render_expression_editor(
                                                            state,
                                                            item.value.as_ref(),
                                                            context
                                                                .child(
                                                                    item_path,
                                                                    scope_variables.clone(),
                                                                    structure_locked,
                                                                    allow_kind_change,
                                                                ),
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    {add_record_item_button(language, path.clone(), target)}
                                }
                            }
                        }
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
                                div { style: "font-size: 0.8rem; color: var(--text-secondary);",
                                    "{type_part_name}"
                                }
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
                    definy_event::event::Expression::PartReference(part_reference_expression) => {
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
                            div { style: "display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem;",
                                div { style: "font-weight: 600;", "{part_name}" }
                                div {
                                    class: "badge",
                                    style: "font-size: 0.72rem; color: var(--primary); background: rgb(124 192 216 / 0.1); padding: 0.1rem 0.4rem; border-radius: var(--radius-full);",
                                    "{part_type}"
                                }
                            }
                        }
                    }
                    definy_event::event::Expression::Variable(_) => rsx! {
                        div { style: "font-size: 0.8rem; color: var(--text-secondary);",
                            "{language.label(\"Local variable reference\", \"ローカル変数参照\", \"Loka variabla referenco\")}"
                        }
                    },
                    definy_event::event::Expression::Compiler(_) => rsx! {
                        div { style: "font-size: 0.8rem; color: var(--text-secondary);",
                            "{language.label(\"Compiler Builtin\", \"コンパイラ組み込み\", \"Kompililo enkonstruita\")}"
                        }
                    },
                }
            }
        }
    }
}

fn render_binary_inputs(
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
    rsx! {
        div { style: "display: flex; flex-wrap: wrap; gap: 0.6rem;",
            div { style: "display: grid; gap: 0.3rem;",
                "{language.label(\"Left\", \"左\", \"Maldekstre\")}"
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
            div { style: "display: grid; gap: 0.3rem;",
                "{language.label(\"Right\", \"右\", \"Dekstre\")}"
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

pub fn allow_kind_change_for_nested_values(allow_kind_change: bool, path: &[PathStep]) -> bool {
    if allow_kind_change {
        return true;
    }
    path.iter()
        .any(|step| matches!(step, PathStep::ConstructorValue))
}

pub fn expression_selector(
    _state: &AppState,
    path: Vec<PathStep>,
    target: EditorTarget,
    current_value: &str,
    options: &[(String, String)],
) -> Element {
    let name = format!(
        "{}-expr-kind-{}",
        selector_prefix(target),
        path_to_key(path.as_slice())
    );

    let path_clone = path.clone();
    let current_val_str = current_value.to_string();
    let options_vec = options.to_vec();

    rsx! {
        crate::dropdown::SearchableDropdown {
            name,
            current_value: current_val_str,
            options: options_vec,
            on_change: move |selected_value: String| {
                let mut state_sig = use_context::<Signal<AppState>>();
                let constructor_default = selected_value
                    .strip_prefix("expr:constructor:")
                    .and_then(|value| EventHashId::from_str(value).ok())
                    .map(|type_part_definition_event_hash| {
                        (
                            type_part_definition_event_hash.clone(),
                            constructor_default_value_from_type_part(
                                &state_sig.read(),
                                &type_part_definition_event_hash,
                            ),
                        )
                    });
                let mut state_val = state_sig.read().clone();
                let root_expression = target_expression_mut(&mut state_val, target);
                apply_selection(
                    &state_sig.read(),
                    root_expression,
                    path_clone.as_slice(),
                    selected_value.as_str(),
                    constructor_default,
                );
                state_sig.set(state_val);
            },
        }
    }
}

pub fn selector_options(
    state: &AppState,
    language: Language,
    scope_variables: &[ScopeVariable],
    is_root: bool,
) -> Vec<(String, String)> {
    let snapshots = collect_part_snapshots(state);
    let mut options = Vec::new();

    if is_root {
        options.push((
            "expr:none".to_string(),
            format!("{}\t\t", language.label("None", "なし", "Neniu")),
        ));
    }

    // Local Variables
    options.extend(scope_variables.iter().map(|scope_var| {
        (
            format!("ref:local:{}", scope_var.id),
            format!("{}\tLocal\t#{}", scope_var.name, scope_var.id),
        )
    }));

    // Literals and generic constructors
    options.extend([
        ("expr:number".to_string(), "Number\tLiteral\t".to_string()),
        ("expr:string".to_string(), "String\tLiteral\t".to_string()),
        ("expr:boolean".to_string(), "Boolean\tLiteral\t".to_string()),
        ("expr:list".to_string(), "List\tLiteral\t".to_string()),
        (
            "expr:type_literal".to_string(),
            "Record\tLiteral\t".to_string(),
        ),
        ("expr:add".to_string(), "Add (+)\tFunction\t".to_string()),
        (
            "expr:subtract".to_string(),
            "Subtract (-)\tFunction\t".to_string(),
        ),
        (
            "expr:multiply".to_string(),
            "Multiply (*)\tFunction\t".to_string(),
        ),
        (
            "expr:divide".to_string(),
            "Divide (/)\tFunction\t".to_string(),
        ),
        (
            "expr:remainder".to_string(),
            "Remainder (%)\tFunction\t".to_string(),
        ),
        (
            "expr:equal".to_string(),
            "Equal (==)\tFunction\t".to_string(),
        ),
        (
            "expr:not_equal".to_string(),
            "Not Equal (!=)\tFunction\t".to_string(),
        ),
        (
            "expr:less_than".to_string(),
            "Less Than (<)\tFunction\t".to_string(),
        ),
        (
            "expr:less_than_or_equal".to_string(),
            "Less Than or Equal (<=)\tFunction\t".to_string(),
        ),
        (
            "expr:greater_than".to_string(),
            "Greater Than (>)\tFunction\t".to_string(),
        ),
        (
            "expr:greater_than_or_equal".to_string(),
            "Greater Than or Equal (>=)\tFunction\t".to_string(),
        ),
        ("expr:not".to_string(), "Not (not)\tFunction\t".to_string()),
        ("expr:and".to_string(), "And (and)\tFunction\t".to_string()),
        ("expr:or".to_string(), "Or (or)\tFunction\t".to_string()),
        (
            "expr:string_concat".to_string(),
            "String Concat (string_concat)\tFunction\t".to_string(),
        ),
        (
            "expr:string_length".to_string(),
            "String Length (string_length)\tFunction\t".to_string(),
        ),
        (
            "expr:string_slice".to_string(),
            "String Slice (string_slice)\tFunction\t".to_string(),
        ),
        (
            "expr:list_length".to_string(),
            "List Length (list_length)\tFunction\t".to_string(),
        ),
        (
            "expr:list_concat".to_string(),
            "List Concat (list_concat)\tFunction\t".to_string(),
        ),
        (
            "expr:list_get".to_string(),
            "List Get (list_get)\tFunction\t".to_string(),
        ),
        (
            "expr:list_append".to_string(),
            "List Append (list_append)\tFunction\t".to_string(),
        ),
        ("expr:if".to_string(), "If\tSyntax\t".to_string()),
        ("expr:let".to_string(), "Let\tSyntax\t".to_string()),
    ]);

    // Type constructors
    options.extend(snapshots.iter().filter_map(|snapshot| {
        if snapshot.part_type == Some(definy_event::event::PartType::Type) {
            Some((
                format!("expr:constructor:{}", snapshot.definition_event_hash),
                format!(
                    "{}\tConstructor\t{}",
                    snapshot.part_name, snapshot.definition_event_hash
                ),
            ))
        } else {
            None
        }
    }));

    // Global Parts
    options.extend(snapshots.into_iter().map(|snapshot| {
        let type_text = snapshot
            .part_type
            .as_ref()
            .map(crate::part_list::part_type_text)
            .unwrap_or_else(|| "Part".to_string());
        (
            format!("ref:global:{}", snapshot.definition_event_hash),
            format!(
                "{}\t{}\t{}",
                snapshot.part_name, type_text, snapshot.definition_event_hash
            ),
        )
    }));

    options
}

fn current_selection_value(
    state: &AppState,
    expression: &definy_event::event::Expression,
) -> String {
    match expression {
        definy_event::event::Expression::Number(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::NumberLiteral)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:number".to_string())
        }
        definy_event::event::Expression::Add(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Plus)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:add".to_string())
        }
        definy_event::event::Expression::Subtract(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Minus)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:subtract".to_string())
        }
        definy_event::event::Expression::Multiply(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Multiply)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:multiply".to_string())
        }
        definy_event::event::Expression::Divide(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Divide)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:divide".to_string())
        }
        definy_event::event::Expression::Remainder(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Remainder)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:remainder".to_string())
        }
        definy_event::event::Expression::If(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::If)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:if".to_string())
        }
        definy_event::event::Expression::Equal(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Equal)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:equal".to_string())
        }
        definy_event::event::Expression::NotEqual(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::NotEqual)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:not_equal".to_string())
        }
        definy_event::event::Expression::LessThan(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::LessThan)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:less_than".to_string())
        }
        definy_event::event::Expression::LessThanOrEqual(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::LessThanOrEqual)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:less_than_or_equal".to_string())
        }
        definy_event::event::Expression::GreaterThan(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::GreaterThan)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:greater_than".to_string())
        }
        definy_event::event::Expression::GreaterThanOrEqual(_) => find_builtin_part_hash(
            state,
            definy_event::event::CompilerBuiltin::GreaterThanOrEqual,
        )
        .map(|h| format!("ref:global:{}", h))
        .unwrap_or_else(|| "expr:greater_than_or_equal".to_string()),
        definy_event::event::Expression::Not(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Not)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:not".to_string())
        }
        definy_event::event::Expression::And(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::And)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:and".to_string())
        }
        definy_event::event::Expression::Or(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Or)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:or".to_string())
        }
        definy_event::event::Expression::StringConcat(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::StringConcat)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:string_concat".to_string())
        }
        definy_event::event::Expression::StringLength(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::StringLength)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:string_length".to_string())
        }
        definy_event::event::Expression::StringSlice(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::StringSlice)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:string_slice".to_string())
        }
        definy_event::event::Expression::ListLength(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::ListLength)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:list_length".to_string())
        }
        definy_event::event::Expression::ListConcat(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::ListConcat)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:list_concat".to_string())
        }
        definy_event::event::Expression::ListGet(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::ListGet)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:list_get".to_string())
        }
        definy_event::event::Expression::ListAppend(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::ListAppend)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:list_append".to_string())
        }
        definy_event::event::Expression::Let(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Let)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:let".to_string())
        }
        definy_event::event::Expression::Compiler(builtin) => {
            find_builtin_part_hash(state, *builtin)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| match builtin {
                    definy_event::event::CompilerBuiltin::Let => "expr:let".to_string(),
                    definy_event::event::CompilerBuiltin::Plus => "expr:add".to_string(),
                    definy_event::event::CompilerBuiltin::Minus => "expr:subtract".to_string(),
                    definy_event::event::CompilerBuiltin::Multiply => "expr:multiply".to_string(),
                    definy_event::event::CompilerBuiltin::Divide => "expr:divide".to_string(),
                    definy_event::event::CompilerBuiltin::Remainder => "expr:remainder".to_string(),
                    definy_event::event::CompilerBuiltin::Equal => "expr:equal".to_string(),
                    definy_event::event::CompilerBuiltin::NotEqual => "expr:not_equal".to_string(),
                    definy_event::event::CompilerBuiltin::LessThan => "expr:less_than".to_string(),
                    definy_event::event::CompilerBuiltin::LessThanOrEqual => {
                        "expr:less_than_or_equal".to_string()
                    }
                    definy_event::event::CompilerBuiltin::GreaterThan => {
                        "expr:greater_than".to_string()
                    }
                    definy_event::event::CompilerBuiltin::GreaterThanOrEqual => {
                        "expr:greater_than_or_equal".to_string()
                    }
                    definy_event::event::CompilerBuiltin::Not => "expr:not".to_string(),
                    definy_event::event::CompilerBuiltin::And => "expr:and".to_string(),
                    definy_event::event::CompilerBuiltin::Or => "expr:or".to_string(),
                    definy_event::event::CompilerBuiltin::StringConcat => {
                        "expr:string_concat".to_string()
                    }
                    definy_event::event::CompilerBuiltin::StringLength => {
                        "expr:string_length".to_string()
                    }
                    definy_event::event::CompilerBuiltin::StringSlice => {
                        "expr:string_slice".to_string()
                    }
                    definy_event::event::CompilerBuiltin::ListLength => {
                        "expr:list_length".to_string()
                    }
                    definy_event::event::CompilerBuiltin::ListConcat => {
                        "expr:list_concat".to_string()
                    }
                    definy_event::event::CompilerBuiltin::ListGet => "expr:list_get".to_string(),
                    definy_event::event::CompilerBuiltin::ListAppend => {
                        "expr:list_append".to_string()
                    }
                    definy_event::event::CompilerBuiltin::NumberLiteral => {
                        "expr:number".to_string()
                    }
                    definy_event::event::CompilerBuiltin::If => "expr:if".to_string(),
                })
        }
        definy_event::event::Expression::String(_) => "expr:string".to_string(),
        definy_event::event::Expression::Boolean(_) => "expr:boolean".to_string(),
        definy_event::event::Expression::ListLiteral(_) => "expr:list".to_string(),
        definy_event::event::Expression::TypeLiteral(_) => "expr:type_literal".to_string(),
        definy_event::event::Expression::TypeNumber => "expr:type:number".to_string(),
        definy_event::event::Expression::TypeString => "expr:type:string".to_string(),
        definy_event::event::Expression::TypeBoolean => "expr:type:boolean".to_string(),
        definy_event::event::Expression::TypeList(_) => "expr:type:list".to_string(),
        definy_event::event::Expression::Constructor(constructor_expression) => format!(
            "expr:constructor:{}",
            constructor_expression.type_part_definition_event_hash
        ),
        definy_event::event::Expression::PartReference(part_ref) => {
            format!("ref:global:{}", part_ref.part_definition_event_hash)
        }
        definy_event::event::Expression::Variable(var_expr) => {
            format!("ref:local:{}", var_expr.variable_id)
        }
    }
}

fn find_builtin_part_hash(
    state: &AppState,
    target: definy_event::event::CompilerBuiltin,
) -> Option<EventHashId> {
    collect_part_snapshots(state)
        .into_iter()
        .find(|snapshot| match snapshot.expression.as_ref() {
            Some(definy_event::event::Expression::Compiler(builtin)) => *builtin == target,
            _ => false,
        })
        .map(|snapshot| snapshot.definition_event_hash)
}

fn number_input(path: Vec<PathStep>, target: EditorTarget, value: i64) -> Element {
    let name = format!(
        "{}-expr-number-{}",
        selector_prefix(target),
        path_to_key(path.as_slice())
    );

    rsx! {
        input {
            name: "{name}",
            r#type: "number",
            value: "{value}",
            style: "padding: 0.35rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
            oninput: move |evt: FormEvent| {
                if let Ok(val) = evt.value().parse::<i64>() {
                    let mut state_sig = use_context::<Signal<AppState>>();
                    let mut next = state_sig.read().clone();
                    let root_expression = target_expression_mut(&mut next, target);
                    set_number_value(root_expression, path.as_slice(), val);
                    state_sig.set(next);
                }
            },
        }
    }
}

fn string_input(path: Vec<PathStep>, target: EditorTarget, value: &str) -> Element {
    let name = format!(
        "{}-expr-string-{}",
        selector_prefix(target),
        path_to_key(path.as_slice())
    );

    rsx! {
        input {
            name: "{name}",
            r#type: "text",
            value: "{value}",
            style: "padding: 0.35rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); width: 100%; box-sizing: border-box;",
            oninput: move |evt: FormEvent| {
                let mut state_sig = use_context::<Signal<AppState>>();
                let mut next = state_sig.read().clone();
                let root_expression = target_expression_mut(&mut next, target);
                set_string_value(root_expression, path.as_slice(), &evt.value());
                state_sig.set(next);
            },
        }
    }
}

fn boolean_input(
    language: Language,
    path: Vec<PathStep>,
    target: EditorTarget,
    value: bool,
) -> Element {
    let path_f = path.clone();
    let style_true = if value {
        "padding: 0.3rem 0.7rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--primary); color: #0e1720; font-weight: 600; cursor: pointer;"
    } else {
        "padding: 0.3rem 0.7rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer;"
    };
    let style_false = if !value {
        "padding: 0.3rem 0.7rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--primary); color: #0e1720; font-weight: 600; cursor: pointer;"
    } else {
        "padding: 0.3rem 0.7rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer;"
    };

    rsx! {
        div { style: "display: flex; gap: 0.5rem;",
            button {
                r#type: "button",
                style: "{style_true}",
                onclick: move |_| {
                    let mut state_sig = use_context::<Signal<AppState>>();
                    let mut next = state_sig.read().clone();
                    let root_expression = target_expression_mut(&mut next, target);
                    set_boolean_value(root_expression, path.as_slice(), true);
                    state_sig.set(next);
                },
                "{language.label(\"True\", \"真\", \"Vera\")}"
            }
            button {
                r#type: "button",
                style: "{style_false}",
                onclick: move |_| {
                    let mut state_sig = use_context::<Signal<AppState>>();
                    let mut next = state_sig.read().clone();
                    let root_expression = target_expression_mut(&mut next, target);
                    set_boolean_value(root_expression, path_f.as_slice(), false);
                    state_sig.set(next);
                },
                "{language.label(\"False\", \"偽\", \"Falsa\")}"
            }
        }
    }
}

fn let_name_input(path: Vec<PathStep>, target: EditorTarget, value: &str) -> Element {
    let name = format!(
        "{}-expr-let-name-{}",
        selector_prefix(target),
        path_to_key(path.as_slice())
    );

    rsx! {
        input {
            name: "{name}",
            r#type: "text",
            value: "{value}",
            style: "padding: 0.35rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
            oninput: move |evt: FormEvent| {
                let mut state_sig = use_context::<Signal<AppState>>();
                let mut next = state_sig.read().clone();
                let root_expression = target_expression_mut(&mut next, target);
                set_let_variable_name(root_expression, path.as_slice(), &evt.value());
                state_sig.set(next);
            },
        }
    }
}

fn record_item_key_input(
    path: Vec<PathStep>,
    item_index: usize,
    target: EditorTarget,
    value: &str,
) -> Element {
    let name = format!(
        "{}-expr-record-key-{}-{}",
        selector_prefix(target),
        path_to_key(path.as_slice()),
        item_index
    );

    rsx! {
        input {
            name: "{name}",
            r#type: "text",
            value: "{value}",
            style: "max-width: 16rem; padding: 0.35rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
            oninput: move |evt: FormEvent| {
                let mut state_sig = use_context::<Signal<AppState>>();
                let mut next = state_sig.read().clone();
                let root_expression = target_expression_mut(&mut next, target);
                set_record_item_key(root_expression, path.as_slice(), item_index, &evt.value());
                state_sig.set(next);
            },
        }
    }
}

fn add_record_item_button(
    language: Language,
    path: Vec<PathStep>,
    target: EditorTarget,
) -> Element {
    rsx! {
        button {
            r#type: "button",
            style: "padding: 0.35rem 0.8rem; background: rgb(255 255 255 / 0.05); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer;",
            onclick: move |_| {
                let mut state_sig = use_context::<Signal<AppState>>();
                let mut next = state_sig.read().clone();
                let root_expression = target_expression_mut(&mut next, target);
                add_record_item(root_expression, path.as_slice());
                state_sig.set(next);
            },
            "{language.label(\"+ Add Item\", \"+ 追加\", \"+ Aldoni eron\")}"
        }
    }
}

fn remove_record_item_button(
    language: Language,
    path: Vec<PathStep>,
    item_index: usize,
    target: EditorTarget,
) -> Element {
    rsx! {
        button {
            r#type: "button",
            style: "padding: 0.25rem 0.5rem; font-size: 0.75rem; background: rgb(255 255 255 / 0.05); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--error); cursor: pointer;",
            onclick: move |_| {
                let mut state_sig = use_context::<Signal<AppState>>();
                let mut next = state_sig.read().clone();
                let root_expression = target_expression_mut(&mut next, target);
                remove_record_item(root_expression, path.as_slice(), item_index);
                state_sig.set(next);
            },
            "{language.label(\"Remove\", \"削除\", \"Forigi\")}"
        }
    }
}

fn add_list_item_button(language: Language, path: Vec<PathStep>, target: EditorTarget) -> Element {
    rsx! {
        button {
            r#type: "button",
            style: "padding: 0.35rem 0.8rem; background: rgb(255 255 255 / 0.05); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer;",
            onclick: move |_| {
                let mut state_sig = use_context::<Signal<AppState>>();
                let mut next = state_sig.read().clone();
                let root_expression = target_expression_mut(&mut next, target);
                add_list_item(root_expression, path.as_slice());
                state_sig.set(next);
            },
            "{language.label(\"+ Add Item\", \"+ 追加\", \"+ Aldoni eron\")}"
        }
    }
}

fn remove_list_item_button(
    path: Vec<PathStep>,
    item_index: usize,
    target: EditorTarget,
) -> Element {
    rsx! {
        button {
            r#type: "button",
            style: "padding: 0.2rem 0.5rem; font-size: 0.75rem; background: rgb(255 255 255 / 0.05); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--error); cursor: pointer;",
            onclick: move |_| {
                let mut state_sig = use_context::<Signal<AppState>>();
                let mut next = state_sig.read().clone();
                let root_expression = target_expression_mut(&mut next, target);
                remove_list_item(root_expression, path.as_slice(), item_index);
                state_sig.set(next);
            },
            "x"
        }
    }
}

fn get_tabular_keys(
    list_expression: &definy_event::event::ListLiteralExpression,
) -> Option<Vec<String>> {
    if list_expression.items.is_empty() {
        return None;
    }
    let mut common_keys: Option<Vec<String>> = None;
    for item in &list_expression.items {
        if let definy_event::event::Expression::TypeLiteral(record) = item {
            if record.items.is_empty() {
                return None;
            }
            let keys: Vec<String> = record.items.iter().map(|i| i.key.to_string()).collect();
            if let Some(ref c) = common_keys {
                if c != &keys {
                    return None;
                }
            } else {
                common_keys = Some(keys);
            }
        } else {
            return None;
        }
    }
    common_keys
}
