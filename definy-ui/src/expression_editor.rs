use narumincho_vdom::*;
use std::collections::HashMap;

use crate::Location;
use crate::app_state::AppState;
use crate::part_projection::{PartSnapshot, collect_part_snapshots, find_part_snapshot};

#[derive(Clone, Copy)]
pub enum EditorTarget {
    PartDefinition,
    PartUpdate,
}

use crate::app_state::PathStep;

#[derive(Clone)]
struct ScopeVariable {
    id: i64,
    name: String,
}

#[derive(Clone, PartialEq, Eq)]
enum ExpressionType {
    Number,
    String,
    Boolean,
    Type,
    TypePart([u8; 32]),
    List(Box<ExpressionType>),
    Record,
    Unknown,
}

#[derive(Clone)]
enum ConstructorValueShape {
    Number,
    String,
    Boolean,
    List(Box<ConstructorValueShape>),
    Record(Vec<(String, ConstructorValueShape)>),
    Unknown,
}

impl ExpressionType {
    fn text(&self) -> String {
        match self {
            ExpressionType::Number => "Number".to_string(),
            ExpressionType::String => "String".to_string(),
            ExpressionType::Boolean => "Boolean".to_string(),
            ExpressionType::Type => "Type".to_string(),
            ExpressionType::TypePart(hash) => {
                format!("TypePart({})", crate::hash_format::short_hash32(hash))
            }
            ExpressionType::List(item) => format!("list<{}>", item.text()),
            ExpressionType::Record => "Record".to_string(),
            ExpressionType::Unknown => "Unknown".to_string(),
        }
    }
}

#[derive(Clone)]
struct TypeDiagnostic {
    path: Vec<PathStep>,
    message: String,
}

pub fn render_root_expression_editor(
    state: &AppState,
    expression: &definy_event::event::Expression,
    target: EditorTarget,
) -> Node<AppState> {
    let expected_type = expected_type_for_target(state, target);
    let diagnostics = collect_type_diagnostics(state, expression, expected_type);
    render_expression_editor(
        state,
        expression,
        Vec::new(),
        target,
        Vec::new(),
        diagnostics.as_slice(),
        false,
        true,
    )
}

fn allow_kind_change_for_nested_values(allow_kind_change: bool, path: &[PathStep]) -> bool {
    if allow_kind_change {
        return true;
    }
    path.iter().any(|step| matches!(step, PathStep::ConstructorValue))
}

fn render_expression_editor(
    state: &AppState,
    expression: &definy_event::event::Expression,
    path: Vec<PathStep>,
    target: EditorTarget,
    scope_variables: Vec<ScopeVariable>,
    diagnostics: &[TypeDiagnostic],
    structure_locked: bool,
    allow_kind_change: bool,
) -> Node<AppState> {
    let current_selection = current_selection_value(expression);
    let selector_options = selector_options(state, &scope_variables);
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
                    .children([text("組み込み型")])
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
                        text("Item Type"),
                        render_expression_editor(
                            state,
                            type_list_expression.item_type.as_ref(),
                            item_type_path,
                            target,
                            scope_variables.clone(),
                            diagnostics,
                            structure_locked,
                            allow_kind_change,
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
                        .children([text("Item")])
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
                                        value_path,
                                        target,
                                        scope_variables.clone(),
                                        diagnostics,
                                        structure_locked,
                                        allow_kind_for_item,
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
                                    &format!("max-content repeat({}, 1fr)", keys.len()),
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
                children.push(add_list_item_button(path.clone(), target));
            } else {
                let mut list_children = list_expression
                    .items
                    .iter()
                    .enumerate()
                    .map(|(index, item)| {
                        let mut item_path = path.clone();
                        item_path.push(PathStep::ListItemValue(index));
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
                                            .children([text(format!("Item {}", index + 1))])
                                            .into_node(),
                                        remove_list_item_button(path.clone(), index, target),
                                    ])
                                    .into_node(),
                                    render_expression_editor(
                                        state,
                                        item,
                                        item_path,
                                        target,
                                        scope_variables.clone(),
                                        diagnostics,
                                        structure_locked,
                                        allow_kind_for_item,
                                    ),
                                ])
                                .into_node()
                        })
                        .collect::<Vec<Node<AppState>>>();
                list_children.push(add_list_item_button(path.clone(), target));
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
                                text("Left"),
                                render_expression_editor(
                                    state,
                                    add_expression.left.as_ref(),
                                    left_path,
                                    target,
                                    scope_variables.clone(),
                                    diagnostics,
                                    structure_locked,
                                    allow_kind_change,
                                ),
                            ])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([
                                text("Right"),
                                render_expression_editor(
                                    state,
                                    add_expression.right.as_ref(),
                                    right_path,
                                    target,
                                    scope_variables.clone(),
                                    diagnostics,
                                    structure_locked,
                                    allow_kind_change,
                                ),
                            ])
                            .into_node(),
                    ])
                    .into_node(),
            );
        }
        definy_event::event::Expression::Boolean(boolean_expression) => {
            children.push(boolean_input(path, target, boolean_expression.value));
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
                                text("Condition"),
                                render_expression_editor(
                                    state,
                                    if_expression.condition.as_ref(),
                                    cond_path,
                                    target,
                                    scope_variables.clone(),
                                    diagnostics,
                                    structure_locked,
                                    allow_kind_change,
                                ),
                            ])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([
                                text("Then"),
                                render_expression_editor(
                                    state,
                                    if_expression.then_expr.as_ref(),
                                    then_path,
                                    target,
                                    scope_variables.clone(),
                                    diagnostics,
                                    structure_locked,
                                    allow_kind_change,
                                ),
                            ])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([
                                text("Else"),
                                render_expression_editor(
                                    state,
                                    if_expression.else_expr.as_ref(),
                                    else_path,
                                    target,
                                    scope_variables.clone(),
                                    diagnostics,
                                    structure_locked,
                                    allow_kind_change,
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
                                text("Left"),
                                render_expression_editor(
                                    state,
                                    equal_expression.left.as_ref(),
                                    left_path,
                                    target,
                                    scope_variables.clone(),
                                    diagnostics,
                                    structure_locked,
                                    allow_kind_change,
                                ),
                            ])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([
                                text("Right"),
                                render_expression_editor(
                                    state,
                                    equal_expression.right.as_ref(),
                                    right_path,
                                    target,
                                    scope_variables.clone(),
                                    diagnostics,
                                    structure_locked,
                                    allow_kind_change,
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
                                text("Let Name"),
                                let_name_input(path.clone(), target, &let_expression.variable_name),
                            ])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([
                                text("Value"),
                                render_expression_editor(
                                    state,
                                    let_expression.value.as_ref(),
                                    value_path,
                                    target,
                                    scope_variables.clone(),
                                    diagnostics,
                                    structure_locked,
                                    allow_kind_change,
                                ),
                            ])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([text("Body"), {
                                let mut body_scope = scope_variables.clone();
                                body_scope.push(ScopeVariable {
                                    id: let_expression.variable_id,
                                    name: let_expression.variable_name.to_string(),
                                });
                                render_expression_editor(
                                    state,
                                    let_expression.body.as_ref(),
                                    body_path,
                                    target,
                                    body_scope,
                                    diagnostics,
                                    structure_locked,
                                    allow_kind_change,
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
                                        .children([text("Key")])
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
                                        remove_record_item_button(path.clone(), index, target)
                                    },
                                ])
                                .into_node(),
                            Div::new()
                                .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                                .children([
                                    text("Value"),
                                    render_expression_editor(
                                        state,
                                        item.value.as_ref(),
                                        value_path,
                                        target,
                                        scope_variables.clone(),
                                        diagnostics,
                                        structure_locked,
                                        allow_kind_for_value,
                                    ),
                                ])
                                .into_node(),
                        ])
                        .into_node()
                })
                .collect::<Vec<Node<AppState>>>();
            if !structure_locked {
                record_children.push(add_record_item_button(path, target));
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
            let type_part_name = find_part_snapshot(
                state,
                &constructor_expression.type_part_definition_event_hash,
            )
            .map(|snapshot| snapshot.part_name)
            .unwrap_or_else(|| {
                format!(
                    "(unknown: {})",
                    crate::hash_format::short_hash32(
                        &constructor_expression.type_part_definition_event_hash
                    )
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
                            .children([text(format!("Type: {}", type_part_name))])
                            .into_node(),
                        render_expression_editor(
                            state,
                            constructor_expression.value.as_ref(),
                            value_path,
                            target,
                            scope_variables.clone(),
                            diagnostics,
                            true,
                            false,
                        ),
                    ])
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
                    .children([text("ドロップダウンから Global/Local 参照を選んでください")])
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

fn part_type_to_expression_type(part_type: &definy_event::event::PartType) -> ExpressionType {
    match part_type {
        definy_event::event::PartType::Number => ExpressionType::Number,
        definy_event::event::PartType::String => ExpressionType::String,
        definy_event::event::PartType::Boolean => ExpressionType::Boolean,
        definy_event::event::PartType::Type => ExpressionType::Type,
        definy_event::event::PartType::TypePart(hash) => ExpressionType::TypePart(*hash),
        definy_event::event::PartType::List(item_type) => {
            ExpressionType::List(Box::new(part_type_to_expression_type(item_type.as_ref())))
        }
    }
}

fn expected_type_for_target(state: &AppState, target: EditorTarget) -> Option<ExpressionType> {
    match target {
        EditorTarget::PartDefinition => state
            .part_definition_form
            .part_type_input
            .as_ref()
            .map(part_type_to_expression_type),
        EditorTarget::PartUpdate => {
            let hash = match state.location {
                Some(Location::Part(hash)) => hash,
                _ => return None,
            };
            find_part_snapshot(state, &hash)
                .and_then(|snapshot| snapshot.part_type)
                .as_ref()
                .map(part_type_to_expression_type)
        }
    }
}

fn collect_type_diagnostics(
    state: &AppState,
    expression: &definy_event::event::Expression,
    expected_type: Option<ExpressionType>,
) -> Vec<TypeDiagnostic> {
    let snapshots = collect_part_snapshots(state);
    let part_type_map = snapshots
        .iter()
        .filter_map(|snapshot| {
            snapshot.part_type.as_ref().map(|part_type| {
                (
                    snapshot.definition_event_hash,
                    part_type_to_expression_type(part_type),
                )
            })
        })
        .collect::<HashMap<[u8; 32], ExpressionType>>();
    let part_snapshot_map = snapshots
        .into_iter()
        .map(|snapshot| (snapshot.definition_event_hash, snapshot))
        .collect::<HashMap<[u8; 32], PartSnapshot>>();

    let mut diagnostics = Vec::new();
    let env = HashMap::new();
    check_expression_type(
        expression,
        &Vec::new(),
        expected_type,
        &env,
        &part_type_map,
        &part_snapshot_map,
        &mut diagnostics,
    );
    diagnostics
}

fn push_type_mismatch_diagnostic(
    diagnostics: &mut Vec<TypeDiagnostic>,
    path: &[PathStep],
    expected_type: &ExpressionType,
    actual_type: &ExpressionType,
) {
    if actual_type == &ExpressionType::Unknown || expected_type == actual_type {
        return;
    }
    diagnostics.push(TypeDiagnostic {
        path: path.to_vec(),
        message: format!(
            "Type mismatch: expected {}, but found {}.",
            expected_type.text(),
            actual_type.text()
        ),
    });
}

fn check_expression_type(
    expression: &definy_event::event::Expression,
    path: &[PathStep],
    expected_type: Option<ExpressionType>,
    env: &HashMap<i64, ExpressionType>,
    part_type_map: &HashMap<[u8; 32], ExpressionType>,
    part_snapshot_map: &HashMap<[u8; 32], PartSnapshot>,
    diagnostics: &mut Vec<TypeDiagnostic>,
) -> ExpressionType {
    let actual_type = match expression {
        definy_event::event::Expression::Number(_) => ExpressionType::Number,
        definy_event::event::Expression::String(_) => ExpressionType::String,
        definy_event::event::Expression::TypeNumber
        | definy_event::event::Expression::TypeString
        | definy_event::event::Expression::TypeBoolean => ExpressionType::Type,
        definy_event::event::Expression::TypeList(type_list_expression) => {
            let mut item_type_path = path.to_vec();
            item_type_path.push(PathStep::TypeListItem);
            check_expression_type(
                type_list_expression.item_type.as_ref(),
                item_type_path.as_slice(),
                Some(ExpressionType::Type),
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );
            ExpressionType::Type
        }
        definy_event::event::Expression::Boolean(_) => ExpressionType::Boolean,
        definy_event::event::Expression::ListLiteral(list_expression) => {
            let expected_item_type =
                if let Some(ExpressionType::List(item_type)) = expected_type.as_ref() {
                    Some(item_type.as_ref().clone())
                } else {
                    None
                };
            let mut inferred_item_type = expected_item_type.clone();
            for (index, item) in list_expression.items.iter().enumerate() {
                let mut item_path = path.to_vec();
                item_path.push(PathStep::ListItemValue(index));
                let item_type = check_expression_type(
                    item,
                    item_path.as_slice(),
                    expected_item_type.clone(),
                    env,
                    part_type_map,
                    part_snapshot_map,
                    diagnostics,
                );
                if inferred_item_type.is_none() && item_type != ExpressionType::Unknown {
                    inferred_item_type = Some(item_type);
                }
            }
            ExpressionType::List(Box::new(
                inferred_item_type.unwrap_or(ExpressionType::Unknown),
            ))
        }
        definy_event::event::Expression::Variable(variable_expression) => env
            .get(&variable_expression.variable_id)
            .cloned()
            .unwrap_or(ExpressionType::Unknown),
        definy_event::event::Expression::PartReference(part_reference_expression) => part_type_map
            .get(&part_reference_expression.part_definition_event_hash)
            .cloned()
            .unwrap_or(ExpressionType::Unknown),
        definy_event::event::Expression::TypeLiteral(record_expression) => {
            let item_expected_type = if expected_type == Some(ExpressionType::Type) {
                Some(ExpressionType::Type)
            } else {
                None
            };
            for (index, item) in record_expression.items.iter().enumerate() {
                let mut item_path = path.to_vec();
                item_path.push(PathStep::RecordItemValue(index));
                check_expression_type(
                    item.value.as_ref(),
                    item_path.as_slice(),
                    item_expected_type.clone(),
                    env,
                    part_type_map,
                    part_snapshot_map,
                    diagnostics,
                );
            }
            if expected_type == Some(ExpressionType::Type) {
                ExpressionType::Type
            } else {
                ExpressionType::Record
            }
        }
        definy_event::event::Expression::Add(add_expression) => {
            let mut left_path = path.to_vec();
            left_path.push(PathStep::Left);
            let left_type = check_expression_type(
                add_expression.left.as_ref(),
                left_path.as_slice(),
                Some(ExpressionType::Number),
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );
            let mut right_path = path.to_vec();
            right_path.push(PathStep::Right);
            let right_type = check_expression_type(
                add_expression.right.as_ref(),
                right_path.as_slice(),
                Some(ExpressionType::Number),
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );

            if left_type == ExpressionType::Number && right_type == ExpressionType::Number {
                ExpressionType::Number
            } else {
                ExpressionType::Unknown
            }
        }
        definy_event::event::Expression::Equal(equal_expression) => {
            let mut left_path = path.to_vec();
            left_path.push(PathStep::Left);
            let left_type = check_expression_type(
                equal_expression.left.as_ref(),
                left_path.as_slice(),
                None,
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );
            let mut right_path = path.to_vec();
            right_path.push(PathStep::Right);
            let right_type = check_expression_type(
                equal_expression.right.as_ref(),
                right_path.as_slice(),
                None,
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );
            if left_type != ExpressionType::Unknown
                && right_type != ExpressionType::Unknown
                && left_type != right_type
            {
                push_type_mismatch_diagnostic(
                    diagnostics,
                    right_path.as_slice(),
                    &left_type,
                    &right_type,
                );
            }
            ExpressionType::Boolean
        }
        definy_event::event::Expression::If(if_expression) => {
            let mut condition_path = path.to_vec();
            condition_path.push(PathStep::Condition);
            check_expression_type(
                if_expression.condition.as_ref(),
                condition_path.as_slice(),
                Some(ExpressionType::Boolean),
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );
            let mut then_path = path.to_vec();
            then_path.push(PathStep::Then);
            let then_type = check_expression_type(
                if_expression.then_expr.as_ref(),
                then_path.as_slice(),
                expected_type.clone(),
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );
            let mut else_path = path.to_vec();
            else_path.push(PathStep::Else);
            let else_type = check_expression_type(
                if_expression.else_expr.as_ref(),
                else_path.as_slice(),
                expected_type.clone(),
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );

            if then_type != ExpressionType::Unknown
                && else_type != ExpressionType::Unknown
                && then_type != else_type
            {
                push_type_mismatch_diagnostic(
                    diagnostics,
                    else_path.as_slice(),
                    &then_type,
                    &else_type,
                );
                ExpressionType::Unknown
            } else if then_type != ExpressionType::Unknown {
                then_type
            } else {
                else_type
            }
        }
        definy_event::event::Expression::Let(let_expression) => {
            let mut value_path = path.to_vec();
            value_path.push(PathStep::LetValue);
            let value_type = check_expression_type(
                let_expression.value.as_ref(),
                value_path.as_slice(),
                None,
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );
            let mut body_env = env.clone();
            body_env.insert(let_expression.variable_id, value_type);
            let mut body_path = path.to_vec();
            body_path.push(PathStep::LetBody);
            check_expression_type(
                let_expression.body.as_ref(),
                body_path.as_slice(),
                expected_type.clone(),
                &body_env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            )
        }
        definy_event::event::Expression::Constructor(constructor_expression) => {
            let inferred_shape = infer_constructor_shape_from_type_part(
                part_snapshot_map,
                &constructor_expression.type_part_definition_event_hash,
            );
            let mut value_path = path.to_vec();
            value_path.push(PathStep::ConstructorValue);
            check_expression_type(
                constructor_expression.value.as_ref(),
                value_path.as_slice(),
                Some(expression_type_from_constructor_shape(&inferred_shape)),
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );
            ExpressionType::TypePart(constructor_expression.type_part_definition_event_hash)
        }
    };

    if let Some(expected_type) = expected_type {
        push_type_mismatch_diagnostic(diagnostics, path, &expected_type, &actual_type);
    }

    actual_type
}

fn expression_type_from_constructor_shape(shape: &ConstructorValueShape) -> ExpressionType {
    match shape {
        ConstructorValueShape::Number => ExpressionType::Number,
        ConstructorValueShape::String => ExpressionType::String,
        ConstructorValueShape::Boolean => ExpressionType::Boolean,
        ConstructorValueShape::List(item_shape) => ExpressionType::List(Box::new(
            expression_type_from_constructor_shape(item_shape.as_ref()),
        )),
        ConstructorValueShape::Record(_) => ExpressionType::Record,
        ConstructorValueShape::Unknown => ExpressionType::Unknown,
    }
}

fn infer_constructor_shape_from_type_part(
    part_snapshot_map: &HashMap<[u8; 32], PartSnapshot>,
    type_part_definition_event_hash: &[u8; 32],
) -> ConstructorValueShape {
    let mut visited = Vec::new();
    infer_constructor_shape_from_type_part_with_visited(
        part_snapshot_map,
        type_part_definition_event_hash,
        &mut visited,
    )
}

fn infer_constructor_shape_from_type_part_with_visited(
    part_snapshot_map: &HashMap<[u8; 32], PartSnapshot>,
    type_part_definition_event_hash: &[u8; 32],
    visited: &mut Vec<[u8; 32]>,
) -> ConstructorValueShape {
    if visited.contains(type_part_definition_event_hash) {
        return ConstructorValueShape::Unknown;
    }
    let Some(snapshot) = part_snapshot_map.get(type_part_definition_event_hash) else {
        return ConstructorValueShape::Unknown;
    };
    visited.push(*type_part_definition_event_hash);
    let shape = infer_constructor_shape_from_type_expression(
        snapshot.expression.clone(),
        part_snapshot_map,
        visited,
    );
    visited.pop();
    shape
}

fn infer_constructor_shape_from_type_expression(
    expression: definy_event::event::Expression,
    part_snapshot_map: &HashMap<[u8; 32], PartSnapshot>,
    visited: &mut Vec<[u8; 32]>,
) -> ConstructorValueShape {
    match expression {
        definy_event::event::Expression::Number(_) => ConstructorValueShape::Number,
        definy_event::event::Expression::String(_) => ConstructorValueShape::String,
        definy_event::event::Expression::TypeNumber => ConstructorValueShape::Number,
        definy_event::event::Expression::TypeString => ConstructorValueShape::String,
        definy_event::event::Expression::TypeBoolean => ConstructorValueShape::Boolean,
        definy_event::event::Expression::TypeList(type_list_expression) => {
            ConstructorValueShape::List(Box::new(infer_constructor_shape_from_type_expression(
                type_list_expression.item_type.as_ref().clone(),
                part_snapshot_map,
                visited,
            )))
        }
        definy_event::event::Expression::Boolean(_) => ConstructorValueShape::Boolean,
        definy_event::event::Expression::ListLiteral(list_expression) => {
            if let Some(first) = list_expression.items.first() {
                ConstructorValueShape::List(Box::new(infer_constructor_shape_from_type_expression(
                    first.clone(),
                    part_snapshot_map,
                    visited,
                )))
            } else {
                ConstructorValueShape::List(Box::new(ConstructorValueShape::Unknown))
            }
        }
        definy_event::event::Expression::TypeLiteral(record_expression) => {
            ConstructorValueShape::Record(
                record_expression
                    .items
                    .iter()
                    .map(|item| {
                        (
                            item.key.to_string(),
                            infer_constructor_shape_from_type_expression(
                                item.value.as_ref().clone(),
                                part_snapshot_map,
                                visited,
                            ),
                        )
                    })
                    .collect(),
            )
        }
        definy_event::event::Expression::PartReference(part_reference_expression) => {
            infer_constructor_shape_from_type_part_with_visited(
                part_snapshot_map,
                &part_reference_expression.part_definition_event_hash,
                visited,
            )
        }
        _ => ConstructorValueShape::Unknown,
    }
}

fn default_expression_from_constructor_shape(
    shape: &ConstructorValueShape,
) -> definy_event::event::Expression {
    match shape {
        ConstructorValueShape::Number => {
            definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                value: 0,
            })
        }
        ConstructorValueShape::String => {
            definy_event::event::Expression::String(definy_event::event::StringExpression {
                value: "".into(),
            })
        }
        ConstructorValueShape::Boolean => {
            definy_event::event::Expression::Boolean(definy_event::event::BooleanExpression {
                value: false,
            })
        }
        ConstructorValueShape::List(item_shape) => definy_event::event::Expression::ListLiteral(
            definy_event::event::ListLiteralExpression {
                items: vec![default_expression_from_constructor_shape(
                    item_shape.as_ref(),
                )],
            },
        ),
        ConstructorValueShape::Record(items) => definy_event::event::Expression::TypeLiteral(
            definy_event::event::TypeLiteralExpression {
                items: items
                    .iter()
                    .map(
                        |(key, item_shape)| definy_event::event::TypeLiteralItemExpression {
                            key: key.clone().into(),
                            value: Box::new(default_expression_from_constructor_shape(item_shape)),
                        },
                    )
                    .collect(),
            },
        ),
        ConstructorValueShape::Unknown => {
            definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                value: 0,
            })
        }
    }
}

fn constructor_default_value_from_type_part(
    state: &AppState,
    type_part_definition_event_hash: &[u8; 32],
) -> definy_event::event::Expression {
    let part_snapshot_map = collect_part_snapshots(state)
        .into_iter()
        .map(|snapshot| (snapshot.definition_event_hash, snapshot))
        .collect::<HashMap<[u8; 32], PartSnapshot>>();
    let shape =
        infer_constructor_shape_from_type_part(&part_snapshot_map, type_part_definition_event_hash);
    default_expression_from_constructor_shape(&shape)
}

fn expression_selector(
    state: &AppState,
    path: Vec<PathStep>,
    target: EditorTarget,
    current_value: &str,
    options: &[(String, String)],
) -> Node<AppState> {
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
                .and_then(decode_hash32)
                .map(|type_part_definition_event_hash| {
                    (
                        type_part_definition_event_hash,
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

    crate::dropdown::searchable_dropdown(state, name.as_str(), current_value, options, on_change)
}

fn selector_options(state: &AppState, scope_variables: &[ScopeVariable]) -> Vec<(String, String)> {
    let snapshots = collect_part_snapshots(state);
    let mut options = vec![
        ("expr:number".to_string(), "Constant: Number".to_string()),
        ("expr:string".to_string(), "Constant: String".to_string()),
        (
            "expr:type:number".to_string(),
            "Builtin Type: Number".to_string(),
        ),
        (
            "expr:type:string".to_string(),
            "Builtin Type: String".to_string(),
        ),
        (
            "expr:type:boolean".to_string(),
            "Builtin Type: Boolean".to_string(),
        ),
        (
            "expr:type:list".to_string(),
            "Builtin Type: List".to_string(),
        ),
        ("expr:list".to_string(), "Literal: List".to_string()),
        ("expr:boolean".to_string(), "Constant: Boolean".to_string()),
        ("expr:add".to_string(), "Function: Add".to_string()),
        ("expr:equal".to_string(), "Function: Equal".to_string()),
        ("expr:if".to_string(), "Syntax: If".to_string()),
        ("expr:let".to_string(), "Syntax: Let".to_string()),
        ("expr:type_literal".to_string(), "Literal: Type".to_string()),
    ];

    options.extend(snapshots.iter().filter_map(|snapshot| {
        if snapshot.part_type == Some(definy_event::event::PartType::Type) {
            Some((
                format!(
                    "expr:constructor:{}",
                    crate::hash_format::encode_hash32(&snapshot.definition_event_hash)
                ),
                format!(
                    "Constructor: {} ({})",
                    snapshot.part_name,
                    crate::hash_format::short_hash32(&snapshot.definition_event_hash)
                ),
            ))
        } else {
            None
        }
    }));

    options.extend(snapshots.into_iter().map(|snapshot| {
        (
            format!(
                "ref:global:{}",
                crate::hash_format::encode_hash32(&snapshot.definition_event_hash)
            ),
            format!(
                "Global: {} ({})",
                snapshot.part_name,
                crate::hash_format::short_hash32(&snapshot.definition_event_hash)
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
            crate::hash_format::encode_hash32(
                &constructor_expression.type_part_definition_event_hash
            )
        ),
        definy_event::event::Expression::PartReference(part_ref) => format!(
            "ref:global:{}",
            crate::hash_format::encode_hash32(&part_ref.part_definition_event_hash)
        ),
        definy_event::event::Expression::Variable(var_expr) => {
            format!("ref:local:{}", var_expr.variable_id)
        }
    }
}

fn apply_selection(
    root_expression: &mut definy_event::event::Expression,
    path: &[PathStep],
    selected_value: &str,
    constructor_default: Option<([u8; 32], definy_event::event::Expression)>,
) {
    let next_variable_id = if selected_value == "expr:let" {
        next_local_variable_id(root_expression)
    } else {
        0
    };
    if let Some(expression) = get_mut_expression_at_path(root_expression, path) {
        *expression = if selected_value == "expr:number" {
            definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                value: 0,
            })
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
            definy_event::event::Expression::ListLiteral(
                definy_event::event::ListLiteralExpression {
                    items: vec![definy_event::event::Expression::Number(
                        definy_event::event::NumberExpression { value: 0 },
                    )],
                },
            )
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
        } else if selected_value == "expr:equal" {
            definy_event::event::Expression::Equal(definy_event::event::EqualExpression {
                left: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 0 },
                )),
                right: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 0 },
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
            definy_event::event::Expression::TypeLiteral(
                definy_event::event::TypeLiteralExpression {
                    items: vec![definy_event::event::TypeLiteralItemExpression {
                        key: "key".into(),
                        value: Box::new(definy_event::event::Expression::TypeString),
                    }],
                },
            )
        } else if let Some((type_part_definition_event_hash, default_value)) = constructor_default {
            definy_event::event::Expression::Constructor(
                definy_event::event::ConstructorExpression {
                    type_part_definition_event_hash,
                    value: Box::new(default_value),
                },
            )
        } else if let Some(encoded) = selected_value.strip_prefix("ref:global:") {
            if let Some(hash) = decode_hash32(encoded) {
                definy_event::event::Expression::PartReference(
                    definy_event::event::PartReferenceExpression {
                        part_definition_event_hash: hash,
                    },
                )
            } else {
                expression.clone()
            }
        } else if let Some(local_id_str) = selected_value.strip_prefix("ref:local:") {
            if let Ok(variable_id) = local_id_str.parse::<i64>() {
                definy_event::event::Expression::Variable(definy_event::event::VariableExpression {
                    variable_id,
                })
            } else {
                expression.clone()
            }
        } else {
            expression.clone()
        };
    }
}

fn decode_hash32(value: &str) -> Option<[u8; 32]> {
    let bytes =
        base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, value).ok()?;
    if bytes.len() == 32 {
        let mut result = [0u8; 32];
        result.copy_from_slice(&bytes);
        Some(result)
    } else {
        None
    }
}

fn number_input(path: Vec<PathStep>, target: EditorTarget, value: i64) -> Node<AppState> {
    let name = format!(
        "{}-expr-number-{}",
        selector_prefix(target),
        path_to_key(path.as_slice())
    );
    let selector = format!("input[name='{}']", name);

    let mut input = Input::new()
        .name(name.as_str())
        .type_("number")
        .value(value.to_string().as_str());

    input.events.push((
        "input".to_string(),
        EventHandler::new(move |set_state| {
            let selector = selector.clone();
            let path = path.clone();
            async move {
                let value = web_sys::window()
                    .and_then(|window| window.document())
                    .and_then(|document| document.query_selector(selector.as_str()).ok())
                    .flatten()
                    .and_then(|element| {
                        wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(element).ok()
                    })
                    .and_then(|input| input.value().parse::<i64>().ok());

                if let Some(value) = value {
                    set_state(Box::new(move |state: AppState| {
                        let mut next = state.clone();
                        let root_expression = target_expression_mut(&mut next, target);
                        set_number_value(root_expression, path.as_slice(), value);
                        next
                    }));
                }
            }
        }),
    ));

    input.into_node()
}

fn string_input(path: Vec<PathStep>, target: EditorTarget, value: &str) -> Node<AppState> {
    let name = format!(
        "{}-expr-string-{}",
        selector_prefix(target),
        path_to_key(path.as_slice())
    );
    let selector = format!("input[name='{}']", name);

    let mut input = Input::new().name(name.as_str()).type_("text").value(value);
    input.events.push((
        "input".to_string(),
        EventHandler::new(move |set_state| {
            let selector = selector.clone();
            let path = path.clone();
            async move {
                let value = web_sys::window()
                    .and_then(|window| window.document())
                    .and_then(|document| document.query_selector(selector.as_str()).ok())
                    .flatten()
                    .and_then(|element| {
                        wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(element).ok()
                    })
                    .map(|input| input.value())
                    .unwrap_or_default();

                set_state(Box::new(move |state: AppState| {
                    let mut next = state.clone();
                    let root_expression = target_expression_mut(&mut next, target);
                    set_string_value(root_expression, path.as_slice(), &value);
                    next
                }));
            }
        }),
    ));
    input.into_node()
}

fn boolean_input(path: Vec<PathStep>, target: EditorTarget, value: bool) -> Node<AppState> {
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
                .children([text("True")])
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
                .children([text("False")])
                .into_node(),
        ])
        .into_node()
}

fn let_name_input(path: Vec<PathStep>, target: EditorTarget, value: &str) -> Node<AppState> {
    let name = format!(
        "{}-expr-let-name-{}",
        selector_prefix(target),
        path_to_key(path.as_slice())
    );
    let selector = format!("input[name='{}']", name);

    let mut input = Input::new().name(name.as_str()).type_("text").value(value);
    input.events.push((
        "input".to_string(),
        EventHandler::new(move |set_state| {
            let selector = selector.clone();
            let path = path.clone();
            async move {
                let value = web_sys::window()
                    .and_then(|window| window.document())
                    .and_then(|document| document.query_selector(selector.as_str()).ok())
                    .flatten()
                    .and_then(|element| {
                        wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(element).ok()
                    })
                    .map(|input| input.value())
                    .unwrap_or_default();

                set_state(Box::new(move |state: AppState| {
                    let mut next = state.clone();
                    let root_expression = target_expression_mut(&mut next, target);
                    set_let_variable_name(root_expression, path.as_slice(), &value);
                    next
                }));
            }
        }),
    ));
    input.into_node()
}

fn record_item_key_input(
    path: Vec<PathStep>,
    item_index: usize,
    target: EditorTarget,
    value: &str,
) -> Node<AppState> {
    let name = format!(
        "{}-expr-record-key-{}-{}",
        selector_prefix(target),
        path_to_key(path.as_slice()),
        item_index
    );
    let selector = format!("input[name='{}']", name);

    let mut input = Input::new()
        .name(name.as_str())
        .type_("text")
        .value(value)
        .style(Style::new().set("max-width", "16rem"));
    input.events.push((
        "input".to_string(),
        EventHandler::new(move |set_state| {
            let selector = selector.clone();
            let path = path.clone();
            async move {
                let value = web_sys::window()
                    .and_then(|window| window.document())
                    .and_then(|document| document.query_selector(selector.as_str()).ok())
                    .flatten()
                    .and_then(|element| {
                        wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(element).ok()
                    })
                    .map(|input| input.value())
                    .unwrap_or_default();

                set_state(Box::new(move |state: AppState| {
                    let mut next = state.clone();
                    let root_expression = target_expression_mut(&mut next, target);
                    set_record_item_key(root_expression, path.as_slice(), item_index, &value);
                    next
                }));
            }
        }),
    ));
    input.into_node()
}

fn add_record_item_button(path: Vec<PathStep>, target: EditorTarget) -> Node<AppState> {
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
        .children([text("+ Add Item")])
        .into_node()
}

fn remove_record_item_button(
    path: Vec<PathStep>,
    item_index: usize,
    target: EditorTarget,
) -> Node<AppState> {
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
        .children([text("Remove")])
        .into_node()
}

fn add_list_item_button(path: Vec<PathStep>, target: EditorTarget) -> Node<AppState> {
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
        .children([text("+ Add Item")])
        .into_node()
}

fn remove_list_item_button(
    path: Vec<PathStep>,
    item_index: usize,
    target: EditorTarget,
) -> Node<AppState> {
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

fn selector_prefix(target: EditorTarget) -> &'static str {
    match target {
        EditorTarget::PartDefinition => "part-definition",
        EditorTarget::PartUpdate => "part-update",
    }
}

fn target_expression_mut<'a>(
    state: &'a mut AppState,
    target: EditorTarget,
) -> &'a mut definy_event::event::Expression {
    match target {
        EditorTarget::PartDefinition => &mut state.part_definition_form.composing_expression,
        EditorTarget::PartUpdate => {
            if let Some(Location::Part(hash)) = state.location {
                state.part_update_form.part_definition_event_hash = Some(hash);
            }
            &mut state.part_update_form.expression_input
        }
    }
}

fn path_to_key(path: &[PathStep]) -> String {
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

fn get_mut_expression_at_path<'a>(
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
        definy_event::event::Expression::Equal(equal_expression) => match path[0] {
            PathStep::Left => {
                get_mut_expression_at_path(equal_expression.left.as_mut(), &path[1..])
            }
            PathStep::Right => {
                get_mut_expression_at_path(equal_expression.right.as_mut(), &path[1..])
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

fn set_number_value(
    root_expression: &mut definy_event::event::Expression,
    path: &[PathStep],
    value: i64,
) {
    if let Some(definy_event::event::Expression::Number(number_expression)) =
        get_mut_expression_at_path(root_expression, path)
    {
        number_expression.value = value;
    }
}

fn set_boolean_value(
    root_expression: &mut definy_event::event::Expression,
    path: &[PathStep],
    value: bool,
) {
    if let Some(definy_event::event::Expression::Boolean(bool_expr)) =
        get_mut_expression_at_path(root_expression, path)
    {
        bool_expr.value = value;
    }
}

fn set_let_variable_name(
    root_expression: &mut definy_event::event::Expression,
    path: &[PathStep],
    value: &str,
) {
    if let Some(definy_event::event::Expression::Let(let_expr)) =
        get_mut_expression_at_path(root_expression, path)
    {
        let_expr.variable_name = value.into();
    }
}

fn set_string_value(
    root_expression: &mut definy_event::event::Expression,
    path: &[PathStep],
    value: &str,
) {
    if let Some(definy_event::event::Expression::String(string_expr)) =
        get_mut_expression_at_path(root_expression, path)
    {
        string_expr.value = value.into();
    }
}

fn set_record_item_key(
    root_expression: &mut definy_event::event::Expression,
    path: &[PathStep],
    item_index: usize,
    value: &str,
) {
    if let Some(definy_event::event::Expression::TypeLiteral(record_expr)) =
        get_mut_expression_at_path(root_expression, path)
    {
        if let Some(item) = record_expr.items.get_mut(item_index) {
            item.key = value.into();
        }
    }
}

fn add_record_item(root_expression: &mut definy_event::event::Expression, path: &[PathStep]) {
    if let Some(definy_event::event::Expression::TypeLiteral(record_expr)) =
        get_mut_expression_at_path(root_expression, path)
    {
        record_expr
            .items
            .push(definy_event::event::TypeLiteralItemExpression {
                key: format!("key{}", record_expr.items.len() + 1).into(),
                value: Box::new(definy_event::event::Expression::TypeString),
            });
    }
}

fn remove_record_item(
    root_expression: &mut definy_event::event::Expression,
    path: &[PathStep],
    item_index: usize,
) {
    if let Some(definy_event::event::Expression::TypeLiteral(record_expr)) =
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

fn add_list_item(root_expression: &mut definy_event::event::Expression, path: &[PathStep]) {
    if let Some(definy_event::event::Expression::ListLiteral(list_expr)) =
        get_mut_expression_at_path(root_expression, path)
    {
        let next_item =
            list_expr
                .items
                .last()
                .cloned()
                .unwrap_or(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 0 },
                ));
        list_expr.items.push(next_item);
    }
}

fn remove_list_item(
    root_expression: &mut definy_event::event::Expression,
    path: &[PathStep],
    item_index: usize,
) {
    if let Some(definy_event::event::Expression::ListLiteral(list_expr)) =
        get_mut_expression_at_path(root_expression, path)
    {
        if item_index < list_expr.items.len() {
            list_expr.items.remove(item_index);
        }
    }
}

fn next_local_variable_id(expression: &definy_event::event::Expression) -> i64 {
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
            definy_event::event::Expression::If(if_expression) => {
                max_local_variable_id(if_expression.condition.as_ref())
                    .max(max_local_variable_id(if_expression.then_expr.as_ref()))
                    .max(max_local_variable_id(if_expression.else_expr.as_ref()))
            }
            definy_event::event::Expression::Equal(equal_expression) => {
                max_local_variable_id(equal_expression.left.as_ref())
                    .max(max_local_variable_id(equal_expression.right.as_ref()))
            }
            definy_event::event::Expression::Let(let_expression) => let_expression
                .variable_id
                .max(max_local_variable_id(let_expression.value.as_ref()))
                .max(max_local_variable_id(let_expression.body.as_ref())),
            definy_event::event::Expression::Variable(var_expression) => var_expression.variable_id,
            definy_event::event::Expression::Constructor(constructor_expression) => {
                max_local_variable_id(constructor_expression.value.as_ref())
            }
        }
    }
    max_local_variable_id(expression).saturating_add(1).max(1)
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

#[cfg(test)]
mod tests {
    use super::{
        PathStep, get_mut_expression_at_path, path_to_key, remove_list_item, set_number_value,
    };

    #[test]
    fn edit_nested_expression_by_ui_path() {
        let mut expression =
            definy_event::event::Expression::Add(definy_event::event::AddExpression {
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
            });

        set_number_value(&mut expression, &[PathStep::Left], 321);
        set_number_value(&mut expression, &[PathStep::Right, PathStep::Left], 1);
        set_number_value(&mut expression, &[PathStep::Right, PathStep::Right], 3);

        assert_eq!(
            crate::expression_eval::expression_to_source(&expression),
            "+ 321 (+ 1 3)"
        );
        assert_eq!(
            crate::expression_eval::evaluate_expression(&expression, &[]),
            Ok(crate::expression_eval::Value::Number(325))
        );
        assert_eq!(path_to_key(&[]), "root");
        assert!(get_mut_expression_at_path(&mut expression, &[PathStep::Left]).is_some());
    }

    #[test]
    fn remove_list_item_can_make_empty_and_removes_target_index() {
        let mut expression = definy_event::event::Expression::ListLiteral(
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
        );

        remove_list_item(&mut expression, &[], 0);
        assert_eq!(
            crate::expression_eval::expression_to_source(&expression),
            "[\"b\"]"
        );

        remove_list_item(&mut expression, &[], 0);
        assert_eq!(
            crate::expression_eval::expression_to_source(&expression),
            "[]"
        );
    }
}
