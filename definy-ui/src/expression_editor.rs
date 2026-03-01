use narumincho_vdom::*;

use crate::app_state::AppState;

#[derive(Clone, Copy)]
pub enum EditorTarget {
    PartDefinition,
    PartUpdate,
}

#[derive(Clone, Copy)]
enum NodeKind {
    Number,
    Add,
}

#[derive(Clone, Copy)]
enum PathStep {
    Left,
    Right,
}

pub fn render_root_expression_editor(
    expression: &definy_event::event::Expression,
    target: EditorTarget,
) -> Node<AppState> {
    render_expression_editor(expression, Vec::new(), target)
}

fn render_expression_editor(
    expression: &definy_event::event::Expression,
    path: Vec<PathStep>,
    target: EditorTarget,
) -> Node<AppState> {
    Div::new()
        .class("event-detail-card")
        .style(
            Style::new()
                .set("padding", "0.8rem")
                .set("display", "grid")
                .set("gap", "0.6rem"),
        )
        .children({
            let mut children = vec![
                Div::new()
                    .style(Style::new().set("display", "flex").set("gap", "0.5rem"))
                    .children([
                        kind_button(path.clone(), target, NodeKind::Number, "Number"),
                        kind_button(path.clone(), target, NodeKind::Add, "+"),
                    ])
                    .into_node(),
            ];

            match expression {
                definy_event::event::Expression::Number(number_expression) => {
                    children.push(number_input(path, target, number_expression.value));
                }
                definy_event::event::Expression::Add(add_expression) => {
                    let mut left_path = path.clone();
                    left_path.push(PathStep::Left);
                    let mut right_path = path;
                    right_path.push(PathStep::Right);

                    children.push(
                        Div::new()
                            .style(
                                Style::new()
                                    .set("display", "grid")
                                    .set("grid-template-columns", "1fr 1fr")
                                    .set("gap", "0.6rem"),
                            )
                            .children([
                                Div::new()
                                    .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                                    .children([
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("color", "var(--text-secondary)")
                                                    .set("font-size", "0.82rem"),
                                            )
                                            .children([text("Left")])
                                            .into_node(),
                                        render_expression_editor(
                                            add_expression.left.as_ref(),
                                            left_path,
                                            target,
                                        ),
                                    ])
                                    .into_node(),
                                Div::new()
                                    .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                                    .children([
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("color", "var(--text-secondary)")
                                                    .set("font-size", "0.82rem"),
                                            )
                                            .children([text("Right")])
                                            .into_node(),
                                        render_expression_editor(
                                            add_expression.right.as_ref(),
                                            right_path,
                                            target,
                                        ),
                                    ])
                                    .into_node(),
                            ])
                            .into_node(),
                    );
                }
            }
            children
        })
        .into_node()
}

fn kind_button(path: Vec<PathStep>, target: EditorTarget, kind: NodeKind, label: &str) -> Node<AppState> {
    Button::new()
        .type_("button")
        .on_click(EventHandler::new(move |set_state| {
            let path = path.clone();
            async move {
                set_state(Box::new(move |state: AppState| {
                    let mut next = state.clone();
                    let root_expression = target_expression_mut(&mut next, target);
                    set_node_kind(root_expression, path.as_slice(), kind);
                    next
                }));
            }
        }))
        .children([text(label)])
        .into_node()
}

fn number_input(path: Vec<PathStep>, target: EditorTarget, value: i64) -> Node<AppState> {
    let name = format!("{}-expr-number-{}", selector_prefix(target), path_to_key(path.as_slice()));
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
        EditorTarget::PartUpdate => &mut state.part_update_form.expression_input,
    }
}

fn path_to_key(path: &[PathStep]) -> String {
    if path.is_empty() {
        return "root".to_string();
    }
    path.iter()
        .map(|step| match step {
            PathStep::Left => 'L',
            PathStep::Right => 'R',
        })
        .collect()
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
        },
        definy_event::event::Expression::Number(_) => None,
    }
}

fn set_node_kind(
    root_expression: &mut definy_event::event::Expression,
    path: &[PathStep],
    kind: NodeKind,
) {
    if let Some(expression) = get_mut_expression_at_path(root_expression, path) {
        *expression = match kind {
            NodeKind::Number => definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            ),
            NodeKind::Add => definy_event::event::Expression::Add(definy_event::event::AddExpression {
                left: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 0 },
                )),
                right: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 0 },
                )),
            }),
        }
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

#[cfg(test)]
mod tests {
    use super::{get_mut_expression_at_path, path_to_key, set_node_kind, set_number_value, NodeKind, PathStep};

    #[test]
    fn edit_nested_expression_by_ui_path() {
        let mut expression = definy_event::event::Expression::Number(
            definy_event::event::NumberExpression { value: 0 },
        );

        set_node_kind(&mut expression, &[], NodeKind::Add);
        set_number_value(&mut expression, &[PathStep::Left], 321);
        set_node_kind(&mut expression, &[PathStep::Right], NodeKind::Add);
        set_number_value(&mut expression, &[PathStep::Right, PathStep::Left], 1);
        set_number_value(&mut expression, &[PathStep::Right, PathStep::Right], 3);

        assert_eq!(crate::expression_eval::expression_to_source(&expression), "+ 321 (+ 1 3)");
        assert_eq!(crate::expression_eval::evaluate_expression(&expression), Ok(325));
        assert_eq!(path_to_key(&[]), "root");
        assert!(get_mut_expression_at_path(&mut expression, &[PathStep::Left]).is_some());
    }
}
