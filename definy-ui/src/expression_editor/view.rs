use std::str::FromStr;

use definy_event::EventHashId;
use narumincho_vdom::*;

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
) -> Node {
    let path = context.path.clone();
    let target = context.target;
    let scope_variables = context.scope_variables.clone();
    let diagnostics = context.diagnostics;
    let structure_locked = context.structure_locked;
    let allow_kind_change = context.allow_kind_change;
    let language = context.language;
    let current_selection = current_selection_value(expression);
    let selector_options = selector_options(state, &scope_variables, path.is_empty());
    let warning_message = diagnostics
        .iter()
        .find(|diagnostic| diagnostic.path == path)
        .map(|diagnostic| diagnostic.message.as_str());

    let mut children = Vec::new();
    if allow_kind_change {
        children.push(expression_selector(
            state,
            path.clone(),
            target,
            &current_selection,
            &selector_options,
        ));
    }
    if let Some(warning_message) = warning_message {
        children.push(
            Div::new()
                .style(
                    Style::new()
                        .set("font-size", "0.8rem")
                        .set("color", "var(--error)"),
                )
                .children([text(warning_message)])
                .into_node(),
        );
    }

    let is_focused = state.focused_path.as_ref() == Some(&path);
    let border_style = if is_focused {
        "2px solid var(--accent)"
    } else if warning_message.is_some() {
        "1px solid var(--error)"
    } else {
        "1px solid transparent"
    };
    let path_str = crate::app_state::path_to_string(&path);

    match expression {
        definy_event::event::Expression::Number(number_expression) => {
            children.push(number_input(path, target, number_expression.value));
        }
        definy_event::event::Expression::String(string_expression) => {
            children.push(string_input(path, target, string_expression.value.as_ref()));
        }
        definy_event::event::Expression::TypeNumber
        | definy_event::event::Expression::TypeString
        | definy_event::event::Expression::TypeBoolean => {
            children.push(
                Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "0.8rem")
                            .set("color", "var(--text-secondary)"),
                    )
                    .children([text(language.label(
                        "Built-in types",
                        "組み込み型",
                        "Enkonstruitaj tipoj",
                    ))])
                    .into_node(),
            );
        }
        definy_event::event::Expression::TypeList(type_list_expression) => {
            let mut item_type_path = path.clone();
            item_type_path.push(PathStep::TypeListItem);
            children.push(
                Div::new()
                    .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                    .children([
                        text(language.label("Item Type", "要素型", "Ero-tipo")),
                        render_expression_editor(
                            state,
                            type_list_expression.item_type.as_ref(),
                            context.child(
                                item_type_path,
                                scope_variables.clone(),
                                structure_locked,
                                allow_kind_change,
                            ),
                        ),
                    ])
                    .into_node(),
            );
        }
        definy_event::event::Expression::ListLiteral(list_expression) => {
            let tabular_keys = get_tabular_keys(list_expression);
            if let Some(keys) = tabular_keys {
                let mut grid_children = Vec::new();
                grid_children.push(
                    Div::new()
                        .children([text(language.label("Item", "項目", "Ero"))])
                        .style(
                            Style::new()
                                .set("font-weight", "bold")
                                .set("font-size", "0.8rem")
                                .set("color", "var(--text-secondary)")
                                .set("padding", "0.2rem 0.5rem"),
                        )
                        .into_node(),
                );
                for key in &keys {
                    grid_children.push(
                        Div::new()
                            .children([text(key)])
                            .style(
                                Style::new()
                                    .set("font-weight", "bold")
                                    .set("font-size", "0.8rem")
                                    .set("color", "var(--text-secondary)")
                                    .set("padding", "0.2rem 0.5rem"),
                            )
                            .into_node(),
                    );
                }
                for (index, item) in list_expression.items.iter().enumerate() {
                    let mut item_path = path.clone();
                    item_path.push(PathStep::ListItemValue(index));
                    let allow_kind_for_item =
                        allow_kind_change_for_nested_values(allow_kind_change, path.as_slice());
                    let remove_btn = remove_list_item_button(path.clone(), index, target);
                    grid_children.push(
                        Div::new()
                            .style(
                                Style::new()
                                    .set("display", "flex")
                                    .set("align-items", "center")
                                    .set("gap", "0.4rem")
                                    .set("padding", "0.2rem 0.5rem"),
                            )
                            .children([text(format!("{}", index + 1)), remove_btn])
                            .into_node(),
                    );
                    if let definy_event::event::Expression::TypeLiteral(record) = item {
                        for (i, record_item) in record.items.iter().enumerate() {
                            let mut value_path = item_path.clone();
                            value_path.push(PathStep::RecordItemValue(i));
                            grid_children.push(
                                Div::new()
                                    .style(
                                        Style::new()
                                            .set("display", "flex")
                                            .set("align-items", "stretch")
                                            .set("padding", "0.2rem"),
                                    )
                                    .children([render_expression_editor(
                                        state,
                                        record_item.value.as_ref(),
                                        context.child(
                                            value_path,
                                            scope_variables.clone(),
                                            structure_locked,
                                            allow_kind_for_item,
                                        ),
                                    )])
                                    .into_node(),
                            );
                        }
                    }
                }
                children.push(
                    Div::new()
                        .style(
                            Style::new()
                                .set("display", "grid")
                                .set(
                                    "grid-template-columns",
                                    format!("max-content repeat({}, 1fr)", keys.len()),
                                )
                                .set("gap", "0.2rem")
                                .set("border", "1px solid var(--border)")
                                .set("border-radius", "var(--radius-md)")
                                .set("padding", "0.5rem")
                                .set("overflow-x", "auto"),
                        )
                        .children(grid_children)
                        .into_node(),
                );
                children.push(add_list_item_button(language, path.clone(), target));
            } else {
                let mut list_children = list_expression
                    .items
                    .iter()
                    .enumerate()
                    .map(|(index, item)| {
                        let mut item_path = path.clone();
                        item_path.push(PathStep::ListItemValue(index));
                        let allow_kind_for_item =
                            allow_kind_change_for_nested_values(allow_kind_change, path.as_slice());
                        Div::new()
                            .style(
                                Style::new()
                                    .set("display", "flex")
                                    .set("flex-direction", "column")
                                    .set("gap", "0.4rem")
                                    .set("padding", "0.5rem")
                                    .set("border", "1px solid var(--border)")
                                    .set("border-radius", "var(--radius-md)"),
                            )
                            .children([
                                Div::new()
                                    .style(Style::new().set("display", "flex").set("gap", "0.5rem"))
                                    .children([
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.8rem")
                                                    .set("color", "var(--text-secondary)")
                                                    .set("flex", "1"),
                                            )
                                            .children([text(format!(
                                                "{} {}",
                                                language.label("Item", "項目", "Ero"),
                                                index + 1
                                            ))])
                                            .into_node(),
                                        remove_list_item_button(path.clone(), index, target),
                                    ])
                                    .into_node(),
                                render_expression_editor(
                                    state,
                                    item,
                                    context.child(
                                        item_path,
                                        scope_variables.clone(),
                                        structure_locked,
                                        allow_kind_for_item,
                                    ),
                                ),
                            ])
                            .into_node()
                    })
                    .collect::<Vec<Node>>();
                list_children.push(add_list_item_button(language, path.clone(), target));
                children.push(
                    Div::new()
                        .style(
                            Style::new()
                                .set("display", "flex")
                                .set("flex-direction", "column")
                                .set("gap", "0.6rem"),
                        )
                        .children(list_children)
                        .into_node(),
                );
            }
        }
        definy_event::event::Expression::Add(add_expression) => {
            let mut left_path = path.clone();
            left_path.push(PathStep::Left);
            let mut right_path = path.clone();
            right_path.push(PathStep::Right);

            children.push(
                Div::new()
                    .style(
                        Style::new()
                            .set("display", "flex")
                            .set("flex-wrap", "wrap")
                            .set("gap", "0.6rem"),
                    )
                    .children([
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([
                                text(language.label("Left", "左", "Maldekstre")),
                                render_expression_editor(
                                    state,
                                    add_expression.left.as_ref(),
                                    context.child(
                                        left_path,
                                        scope_variables.clone(),
                                        structure_locked,
                                        allow_kind_change,
                                    ),
                                ),
                            ])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([
                                text(language.label("Right", "右", "Dekstre")),
                                render_expression_editor(
                                    state,
                                    add_expression.right.as_ref(),
                                    context.child(
                                        right_path,
                                        scope_variables.clone(),
                                        structure_locked,
                                        allow_kind_change,
                                    ),
                                ),
                            ])
                            .into_node(),
                    ])
                    .into_node(),
            );
        }
        definy_event::event::Expression::Boolean(boolean_expression) => {
            children.push(boolean_input(
                language,
                path,
                target,
                boolean_expression.value,
            ));
        }
        definy_event::event::Expression::If(if_expression) => {
            let mut cond_path = path.clone();
            cond_path.push(PathStep::Condition);
            let mut then_path = path.clone();
            then_path.push(PathStep::Then);
            let mut else_path = path.clone();
            else_path.push(PathStep::Else);

            children.push(
                Div::new()
                    .style(
                        Style::new()
                            .set("display", "flex")
                            .set("flex-wrap", "wrap")
                            .set("gap", "0.6rem"),
                    )
                    .children([
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([
                                text(language.label("Condition", "条件", "Kondiĉo")),
                                render_expression_editor(
                                    state,
                                    if_expression.condition.as_ref(),
                                    context.child(
                                        cond_path,
                                        scope_variables.clone(),
                                        structure_locked,
                                        allow_kind_change,
                                    ),
                                ),
                            ])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([
                                text(language.label("Then", "なら", "Tiam")),
                                render_expression_editor(
                                    state,
                                    if_expression.then_expr.as_ref(),
                                    context.child(
                                        then_path,
                                        scope_variables.clone(),
                                        structure_locked,
                                        allow_kind_change,
                                    ),
                                ),
                            ])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([
                                text(language.label("Else", "それ以外", "Alie")),
                                render_expression_editor(
                                    state,
                                    if_expression.else_expr.as_ref(),
                                    context.child(
                                        else_path,
                                        scope_variables.clone(),
                                        structure_locked,
                                        allow_kind_change,
                                    ),
                                ),
                            ])
                            .into_node(),
                    ])
                    .into_node(),
            );
        }
        definy_event::event::Expression::Equal(equal_expression) => {
            let mut left_path = path.clone();
            left_path.push(PathStep::Left);
            let mut right_path = path.clone();
            right_path.push(PathStep::Right);

            children.push(
                Div::new()
                    .style(
                        Style::new()
                            .set("display", "flex")
                            .set("flex-wrap", "wrap")
                            .set("gap", "0.6rem"),
                    )
                    .children([
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([
                                text(language.label("Left", "左", "Maldekstre")),
                                render_expression_editor(
                                    state,
                                    equal_expression.left.as_ref(),
                                    context.child(
                                        left_path,
                                        scope_variables.clone(),
                                        structure_locked,
                                        allow_kind_change,
                                    ),
                                ),
                            ])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([
                                text(language.label("Right", "右", "Dekstre")),
                                render_expression_editor(
                                    state,
                                    equal_expression.right.as_ref(),
                                    context.child(
                                        right_path,
                                        scope_variables.clone(),
                                        structure_locked,
                                        allow_kind_change,
                                    ),
                                ),
                            ])
                            .into_node(),
                    ])
                    .into_node(),
            );
        }
        definy_event::event::Expression::Let(let_expression) => {
            let mut value_path = path.clone();
            value_path.push(PathStep::LetValue);
            let mut body_path = path.clone();
            body_path.push(PathStep::LetBody);

            children.push(
                Div::new()
                    .style(
                        Style::new()
                            .set("display", "flex")
                            .set("flex-wrap", "wrap")
                            .set("gap", "0.6rem"),
                    )
                    .children([
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([
                                text(language.label("Let Name", "変数名", "Nomo")),
                                let_name_input(path.clone(), target, &let_expression.variable_name),
                            ])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([
                                text(language.label("Value", "値", "Valoro")),
                                render_expression_editor(
                                    state,
                                    let_expression.value.as_ref(),
                                    context.child(
                                        value_path,
                                        scope_variables.clone(),
                                        structure_locked,
                                        allow_kind_change,
                                    ),
                                ),
                            ])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([text(language.label("Body", "本体", "Kerno")), {
                                let mut body_scope = scope_variables.clone();
                                body_scope.push(ScopeVariable {
                                    id: let_expression.variable_id,
                                    name: let_expression.variable_name.to_string(),
                                });
                                render_expression_editor(
                                    state,
                                    let_expression.body.as_ref(),
                                    context.child(
                                        body_path,
                                        body_scope,
                                        structure_locked,
                                        allow_kind_change,
                                    ),
                                )
                            }])
                            .into_node(),
                    ])
                    .into_node(),
            );
        }
        definy_event::event::Expression::TypeLiteral(record_expression) => {
            let mut record_children = record_expression
                .items
                .iter()
                .enumerate()
                .map(|(index, item)| {
                    let mut value_path = path.clone();
                    value_path.push(PathStep::RecordItemValue(index));
                    let allow_kind_for_value =
                        allow_kind_change_for_nested_values(allow_kind_change, path.as_slice());
                    Div::new()
                        .style(
                            Style::new()
                                .set("display", "grid")
                                .set("gap", "0.4rem")
                                .set("padding", "0.5rem")
                                .set("border", "1px solid var(--border)")
                                .set("border-radius", "var(--radius-md)"),
                        )
                        .children([
                            Div::new()
                                .style(
                                    Style::new()
                                        .set("display", "flex")
                                        .set("gap", "0.5rem")
                                        .set("align-items", "center"),
                                )
                                .children([
                                    Div::new()
                                        .style(
                                            Style::new()
                                                .set("min-width", "2.4rem")
                                                .set("font-size", "0.8rem")
                                                .set("color", "var(--text-secondary)"),
                                        )
                                        .children([text(language.label("Key", "キー", "Ŝlosilo"))])
                                        .into_node(),
                                    if structure_locked {
                                        Div::new()
                                            .style(Style::new().set("font-size", "0.9rem"))
                                            .children([text(item.key.as_ref())])
                                            .into_node()
                                    } else {
                                        record_item_key_input(
                                            path.clone(),
                                            index,
                                            target,
                                            item.key.as_ref(),
                                        )
                                    },
                                    if structure_locked {
                                        Div::new().children([]).into_node()
                                    } else {
                                        remove_record_item_button(
                                            language,
                                            path.clone(),
                                            index,
                                            target,
                                        )
                                    },
                                ])
                                .into_node(),
                            Div::new()
                                .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                                .children([
                                    text(language.label("Value", "値", "Valoro")),
                                    render_expression_editor(
                                        state,
                                        item.value.as_ref(),
                                        context.child(
                                            value_path,
                                            scope_variables.clone(),
                                            structure_locked,
                                            allow_kind_for_value,
                                        ),
                                    ),
                                ])
                                .into_node(),
                        ])
                        .into_node()
                })
                .collect::<Vec<Node>>();
            if !structure_locked {
                record_children.push(add_record_item_button(language, path, target));
            }
            children.push(
                Div::new()
                    .style(Style::new().set("display", "grid").set("gap", "0.6rem"))
                    .children(record_children)
                    .into_node(),
            );
        }
        definy_event::event::Expression::Constructor(constructor_expression) => {
            let mut value_path = path.clone();
            value_path.push(PathStep::ConstructorValue);
            let type_part_name = crate::part_projection::find_part_snapshot(
                state,
                &constructor_expression.type_part_definition_event_hash,
            )
            .map(|snapshot| snapshot.part_name)
            .unwrap_or_else(|| {
                format!(
                    "(unknown: {})",
                    constructor_expression.type_part_definition_event_hash
                )
            });
            children.push(
                Div::new()
                    .style(Style::new().set("display", "grid").set("gap", "0.4rem"))
                    .children([
                        Div::new()
                            .style(
                                Style::new()
                                    .set("font-size", "0.82rem")
                                    .set("color", "var(--text-secondary)"),
                            )
                            .children([text(format!(
                                "{} {}",
                                language.label("Type:", "型:", "Tipo:"),
                                type_part_name
                            ))])
                            .into_node(),
                        render_expression_editor(
                            state,
                            constructor_expression.value.as_ref(),
                            context.child(value_path, scope_variables.clone(), true, true),
                        ),
                    ])
                    .into_node(),
            );
        }
        definy_event::event::Expression::Compiler(builtin) => {
            let builtin_label = match builtin {
                definy_event::event::CompilerBuiltin::Let => "[compiler let]",
                definy_event::event::CompilerBuiltin::Plus => "[compiler plus]",
                definy_event::event::CompilerBuiltin::NumberLiteral => "[compiler number literal]",
                definy_event::event::CompilerBuiltin::If => "[compiler if]",
            };
            children.push(
                Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "0.85rem")
                            .set("color", "var(--text-secondary)")
                            .set("font-family", "monospace"),
                    )
                    .children([text(builtin_label)])
                    .into_node(),
            );
        }
        definy_event::event::Expression::PartReference(_)
        | definy_event::event::Expression::Variable(_) => {
            children.push(
                Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "0.8rem")
                            .set("color", "var(--text-secondary)"),
                    )
                    .children([text(language.label(
                        "Select a Global/Local reference from the dropdown.",
                        "ドロップダウンから Global/Local 参照を選んでください",
                        "Elektu Globalan/Lokan referencon el la falmenuo.",
                    ))])
                    .into_node(),
            );
        }
    }

    Div::new()
        .class("event-detail-card")
        .attribute("data-path", &path_str)
        .style(
            Style::new()
                .set("padding", "0.8rem")
                .set("display", "grid")
                .set("gap", "0.6rem")
                .set("border", border_style),
        )
        .children(children)
        .into_node()
}

pub fn allow_kind_change_for_nested_values(allow_kind_change: bool, path: &[PathStep]) -> bool {
    if allow_kind_change {
        return true;
    }
    path.iter()
        .any(|step| matches!(step, PathStep::ConstructorValue))
}

pub fn expression_selector(
    state: &AppState,
    path: Vec<PathStep>,
    target: EditorTarget,
    current_value: &str,
    options: &[(String, String)],
) -> Node {
    let name = format!(
        "{}-expr-kind-{}",
        selector_prefix(target),
        path_to_key(path.as_slice())
    );
    let on_change = std::rc::Rc::new(move |selected_value: String| {
        let path = path.clone();
        let target_clone = target;
        let update_fn: Box<dyn FnOnce(AppState) -> AppState> = Box::new(move |state: AppState| {
            let mut next = state.clone();
            let constructor_default = selected_value
                .strip_prefix("expr:constructor:")
                .and_then(|value| EventHashId::from_str(value).ok())
                .map(|type_part_definition_event_hash| {
                    (
                        type_part_definition_event_hash.clone(),
                        constructor_default_value_from_type_part(
                            &next,
                            &type_part_definition_event_hash,
                        ),
                    )
                });
            let root_expression = target_expression_mut(&mut next, target_clone);
            apply_selection(
                root_expression,
                path.as_slice(),
                selected_value.as_str(),
                constructor_default,
            );
            next
        });
        update_fn
    });

    crate::dropdown::searchable_dropdown(
        state,
        name.as_str(),
        current_value,
        options,
        crate::dropdown::button_option_renderer(name.clone(), on_change),
    )
}

pub fn selector_options(
    state: &AppState,
    scope_variables: &[ScopeVariable],
    is_root: bool,
) -> Vec<(String, String)> {
    let snapshots = collect_part_snapshots(state);
    let mut options = Vec::new();

    if is_root {
        options.push(("expr:none".to_string(), "None (式なし)".to_string()));
    }

    options.extend([
        ("expr:number".to_string(), "Literal: Number".to_string()),
        ("expr:string".to_string(), "Literal: String".to_string()),
        ("expr:boolean".to_string(), "Literal: Boolean".to_string()),
        ("expr:list".to_string(), "Literal: List".to_string()),
        (
            "expr:type_literal".to_string(),
            "Literal: Record".to_string(),
        ),
        ("expr:add".to_string(), "Syntax: + (Add)".to_string()),
        ("expr:equal".to_string(), "Syntax: == (Equal)".to_string()),
        ("expr:if".to_string(), "Syntax: If".to_string()),
        ("expr:let".to_string(), "Syntax: Let".to_string()),
    ]);

    options.extend(snapshots.iter().filter_map(|snapshot| {
        if snapshot.part_type == Some(definy_event::event::PartType::Type) {
            Some((
                format!("expr:constructor:{}", snapshot.definition_event_hash),
                format!(
                    "Constructor: {} ({})",
                    snapshot.part_name, snapshot.definition_event_hash
                ),
            ))
        } else {
            None
        }
    }));

    options.extend(snapshots.into_iter().map(|snapshot| {
        (
            format!("ref:global:{}", snapshot.definition_event_hash),
            format!(
                "Global: {} ({})",
                snapshot.part_name, snapshot.definition_event_hash
            ),
        )
    }));

    options.extend(scope_variables.iter().map(|scope_var| {
        (
            format!("ref:local:{}", scope_var.id),
            format!("Local: {} (#{})", scope_var.name, scope_var.id),
        )
    }));

    options
}

fn current_selection_value(expression: &definy_event::event::Expression) -> String {
    match expression {
        definy_event::event::Expression::Number(_) => "expr:number".to_string(),
        definy_event::event::Expression::String(_) => "expr:string".to_string(),
        definy_event::event::Expression::TypeNumber => "expr:type:number".to_string(),
        definy_event::event::Expression::TypeString => "expr:type:string".to_string(),
        definy_event::event::Expression::TypeBoolean => "expr:type:boolean".to_string(),
        definy_event::event::Expression::TypeList(_) => "expr:type:list".to_string(),
        definy_event::event::Expression::ListLiteral(_) => "expr:list".to_string(),
        definy_event::event::Expression::Boolean(_) => "expr:boolean".to_string(),
        definy_event::event::Expression::Add(_) => "expr:add".to_string(),
        definy_event::event::Expression::Equal(_) => "expr:equal".to_string(),
        definy_event::event::Expression::If(_) => "expr:if".to_string(),
        definy_event::event::Expression::Let(_) => "expr:let".to_string(),
        definy_event::event::Expression::TypeLiteral(_) => "expr:type_literal".to_string(),
        definy_event::event::Expression::Constructor(constructor_expression) => format!(
            "expr:constructor:{}",
            constructor_expression.type_part_definition_event_hash
        ),
        definy_event::event::Expression::Compiler(builtin) => match builtin {
            definy_event::event::CompilerBuiltin::Let => "expr:compiler:let".to_string(),
            definy_event::event::CompilerBuiltin::Plus => "expr:compiler:plus".to_string(),
            definy_event::event::CompilerBuiltin::NumberLiteral => {
                "expr:compiler:number_literal".to_string()
            }
            definy_event::event::CompilerBuiltin::If => "expr:compiler:if".to_string(),
        },
        definy_event::event::Expression::PartReference(part_ref) => {
            format!("ref:global:{}", part_ref.part_definition_event_hash)
        }
        definy_event::event::Expression::Variable(var_expr) => {
            format!("ref:local:{}", var_expr.variable_id)
        }
    }
}

fn number_input(path: Vec<PathStep>, target: EditorTarget, value: i64) -> Node {
    let name = format!(
        "{}-expr-number-{}",
        selector_prefix(target),
        path_to_key(path.as_slice())
    );
    let selector = format!("input[name='{}']", name);

    Input::new()
        .name(name.as_str())
        .type_("number")
        .value(value.to_string().as_str())
        .on_input(EventHandler::new(move |set_state| {
            let selector = selector.clone();
            let path = path.clone();
            async move {
                let value = crate::dom::get_input_value(selector.as_str())
                    .parse::<i64>()
                    .ok();

                if let Some(value) = value {
                    set_state(Box::new(move |state: AppState| {
                        let mut next = state.clone();
                        let root_expression = target_expression_mut(&mut next, target);
                        set_number_value(root_expression, path.as_slice(), value);
                        next
                    }));
                }
            }
        }))
        .into_node()
}

fn string_input(path: Vec<PathStep>, target: EditorTarget, value: &str) -> Node {
    let name = format!(
        "{}-expr-string-{}",
        selector_prefix(target),
        path_to_key(path.as_slice())
    );
    let selector = format!("input[name='{}']", name);

    Input::new()
        .name(name.as_str())
        .type_("text")
        .value(value)
        .on_input(EventHandler::new(move |set_state| {
            let selector = selector.clone();
            let path = path.clone();
            async move {
                let value = crate::dom::get_input_value(selector.as_str());

                set_state(Box::new(move |state: AppState| {
                    let mut next = state.clone();
                    let root_expression = target_expression_mut(&mut next, target);
                    set_string_value(root_expression, path.as_slice(), &value);
                    next
                }));
            }
        }))
        .into_node()
}

fn boolean_input(
    language: Language,
    path: Vec<PathStep>,
    target: EditorTarget,
    value: bool,
) -> Node {
    Div::new()
        .style(Style::new().set("display", "flex").set("gap", "0.5rem"))
        .children([
            Button::new()
                .type_("button")
                .style(if value {
                    Style::new()
                        .set("background-color", "var(--primary-color)")
                        .set("color", "var(--surface-color)")
                } else {
                    Style::new()
                })
                .on_click(EventHandler::new({
                    let path = path.clone();
                    move |set_state| {
                        let path = path.clone();
                        async move {
                            set_state(Box::new(move |state: AppState| {
                                let mut next = state.clone();
                                let root_expression = target_expression_mut(&mut next, target);
                                set_boolean_value(root_expression, path.as_slice(), true);
                                next
                            }));
                        }
                    }
                }))
                .children([text(language.label("True", "真", "Vera"))])
                .into_node(),
            Button::new()
                .type_("button")
                .style(if !value {
                    Style::new()
                        .set("background-color", "var(--primary-color)")
                        .set("color", "var(--surface-color)")
                } else {
                    Style::new()
                })
                .on_click(EventHandler::new({
                    let path = path.clone();
                    move |set_state| {
                        let path = path.clone();
                        async move {
                            set_state(Box::new(move |state: AppState| {
                                let mut next = state.clone();
                                let root_expression = target_expression_mut(&mut next, target);
                                set_boolean_value(root_expression, path.as_slice(), false);
                                next
                            }));
                        }
                    }
                }))
                .children([text(language.label("False", "偽", "Falsa"))])
                .into_node(),
        ])
        .into_node()
}

fn let_name_input(path: Vec<PathStep>, target: EditorTarget, value: &str) -> Node {
    let name = format!(
        "{}-expr-let-name-{}",
        selector_prefix(target),
        path_to_key(path.as_slice())
    );
    let selector = format!("input[name='{}']", name);

    Input::new()
        .name(name.as_str())
        .type_("text")
        .value(value)
        .on_input(EventHandler::new(move |set_state| {
            let selector = selector.clone();
            let path = path.clone();
            async move {
                let value = crate::dom::get_input_value(selector.as_str());

                set_state(Box::new(move |state: AppState| {
                    let mut next = state.clone();
                    let root_expression = target_expression_mut(&mut next, target);
                    set_let_variable_name(root_expression, path.as_slice(), &value);
                    next
                }));
            }
        }))
        .into_node()
}

fn record_item_key_input(
    path: Vec<PathStep>,
    item_index: usize,
    target: EditorTarget,
    value: &str,
) -> Node {
    let name = format!(
        "{}-expr-record-key-{}-{}",
        selector_prefix(target),
        path_to_key(path.as_slice()),
        item_index
    );
    let selector = format!("input[name='{}']", name);

    Input::new()
        .name(name.as_str())
        .type_("text")
        .value(value)
        .style(Style::new().set("max-width", "16rem"))
        .on_input(EventHandler::new(move |set_state| {
            let selector = selector.clone();
            let path = path.clone();
            async move {
                let value = crate::dom::get_input_value(selector.as_str());

                set_state(Box::new(move |state: AppState| {
                    let mut next = state.clone();
                    let root_expression = target_expression_mut(&mut next, target);
                    set_record_item_key(root_expression, path.as_slice(), item_index, &value);
                    next
                }));
            }
        }))
        .into_node()
}

fn add_record_item_button(language: Language, path: Vec<PathStep>, target: EditorTarget) -> Node {
    Button::new()
        .type_("button")
        .on_click(EventHandler::new(move |set_state| {
            let path = path.clone();
            async move {
                set_state(Box::new(move |state: AppState| {
                    let mut next = state.clone();
                    let root_expression = target_expression_mut(&mut next, target);
                    add_record_item(root_expression, path.as_slice());
                    next
                }));
            }
        }))
        .children([text(language.label(
            "+ Add Item",
            "+ 追加",
            "+ Aldoni eron",
        ))])
        .into_node()
}

fn remove_record_item_button(
    language: Language,
    path: Vec<PathStep>,
    item_index: usize,
    target: EditorTarget,
) -> Node {
    Button::new()
        .type_("button")
        .on_click(EventHandler::new(move |set_state| {
            let path = path.clone();
            async move {
                set_state(Box::new(move |state: AppState| {
                    let mut next = state.clone();
                    let root_expression = target_expression_mut(&mut next, target);
                    remove_record_item(root_expression, path.as_slice(), item_index);
                    next
                }));
            }
        }))
        .children([text(language.label("Remove", "削除", "Forigi"))])
        .into_node()
}

fn add_list_item_button(language: Language, path: Vec<PathStep>, target: EditorTarget) -> Node {
    Button::new()
        .type_("button")
        .on_click(EventHandler::new(move |set_state| {
            let path = path.clone();
            async move {
                set_state(Box::new(move |state: AppState| {
                    let mut next = state.clone();
                    let root_expression = target_expression_mut(&mut next, target);
                    add_list_item(root_expression, path.as_slice());
                    next
                }));
            }
        }))
        .children([text(language.label(
            "+ Add Item",
            "+ 追加",
            "+ Aldoni eron",
        ))])
        .into_node()
}

fn remove_list_item_button(path: Vec<PathStep>, item_index: usize, target: EditorTarget) -> Node {
    Button::new()
        .type_("button")
        .on_click(EventHandler::new(move |set_state| {
            let path = path.clone();
            async move {
                set_state(Box::new(move |state: AppState| {
                    let mut next = state.clone();
                    let root_expression = target_expression_mut(&mut next, target);
                    remove_list_item(root_expression, path.as_slice(), item_index);
                    next
                }));
            }
        }))
        .children([text("x")])
        .into_node()
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
