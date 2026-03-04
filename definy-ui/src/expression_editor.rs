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
    PartReference,
    Boolean,
    If,
    Equal,
    Let,
    Variable,
}

#[derive(Clone, Copy)]
enum PathStep {
    Left,
    Right,
    Condition,
    Then,
    Else,
    LetValue,
    LetBody,
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
                    .style(
                        Style::new()
                            .set("display", "flex")
                            .set("gap", "0.5rem")
                            .set("flex-wrap", "wrap"),
                    )
                    .children([
                        kind_button(path.clone(), target, NodeKind::Number, "Number"),
                        kind_button(path.clone(), target, NodeKind::Add, "+"),
                        kind_button(path.clone(), target, NodeKind::PartReference, "Ref"),
                        kind_button(path.clone(), target, NodeKind::Boolean, "Bool"),
                        kind_button(path.clone(), target, NodeKind::If, "If"),
                        kind_button(path.clone(), target, NodeKind::Equal, "=="),
                        kind_button(path.clone(), target, NodeKind::Let, "Let"),
                        kind_button(path.clone(), target, NodeKind::Variable, "Var"),
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
                    let mut right_path = path.clone();
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
                definy_event::event::Expression::PartReference(part_ref) => {
                    children.push(reference_input(path, target, &part_ref.part_name));
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
                                    .set("display", "grid")
                                    .set("grid-template-columns", "1fr")
                                    .set("gap", "0.6rem"),
                            )
                            .children([
                                Div::new()
                                    .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                                    .children([
                                        text("Condition"),
                                        render_expression_editor(
                                            if_expression.condition.as_ref(),
                                            cond_path,
                                            target,
                                        ),
                                    ])
                                    .into_node(),
                                Div::new()
                                    .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                                    .children([
                                        text("Then"),
                                        render_expression_editor(
                                            if_expression.then_expr.as_ref(),
                                            then_path,
                                            target,
                                        ),
                                    ])
                                    .into_node(),
                                Div::new()
                                    .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                                    .children([
                                        text("Else"),
                                        render_expression_editor(
                                            if_expression.else_expr.as_ref(),
                                            else_path,
                                            target,
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
                                    .set("display", "grid")
                                    .set("grid-template-columns", "1fr 1fr")
                                    .set("gap", "0.6rem"),
                            )
                            .children([
                                Div::new()
                                    .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                                    .children([
                                        text("Left"),
                                        render_expression_editor(
                                            equal_expression.left.as_ref(),
                                            left_path,
                                            target,
                                        ),
                                    ])
                                    .into_node(),
                                Div::new()
                                    .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                                    .children([
                                        text("Right"),
                                        render_expression_editor(
                                            equal_expression.right.as_ref(),
                                            right_path,
                                            target,
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
                                    .set("display", "grid")
                                    .set("grid-template-columns", "1fr")
                                    .set("gap", "0.6rem"),
                            )
                            .children([
                                Div::new()
                                    .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                                    .children([
                                        text("Let ID"),
                                        variable_input(
                                            path.clone(),
                                            target,
                                            &let_expression.variable_name,
                                        ),
                                    ])
                                    .into_node(),
                                Div::new()
                                    .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                                    .children([
                                        text("Value"),
                                        render_expression_editor(
                                            let_expression.value.as_ref(),
                                            value_path,
                                            target,
                                        ),
                                    ])
                                    .into_node(),
                                Div::new()
                                    .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                                    .children([
                                        text("Body"),
                                        render_expression_editor(
                                            let_expression.body.as_ref(),
                                            body_path,
                                            target,
                                        ),
                                    ])
                                    .into_node(),
                            ])
                            .into_node(),
                    );
                }
                definy_event::event::Expression::Variable(var_expression) => {
                    children.push(variable_input(
                        path.clone(),
                        target,
                        &var_expression.variable_name,
                    ));
                }
            }
            children
        })
        .into_node()
}

fn kind_button(
    path: Vec<PathStep>,
    target: EditorTarget,
    kind: NodeKind,
    label: &str,
) -> Node<AppState> {
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

fn reference_input(path: Vec<PathStep>, target: EditorTarget, value: &str) -> Node<AppState> {
    let name = format!(
        "{}-expr-ref-{}",
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
                    .map(|input| input.value());

                if let Some(value) = value {
                    set_state(Box::new(move |state: AppState| {
                        let mut next = state.clone();
                        let root_expression = target_expression_mut(&mut next, target);
                        set_reference_value(root_expression, path.as_slice(), &value);
                        next
                    }));
                }
            }
        }),
    ));

    input.into_node()
}

fn variable_input(path: Vec<PathStep>, target: EditorTarget, value: &str) -> Node<AppState> {
    let name = format!(
        "{}-expr-var-{}",
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
                    .map(|input| input.value());

                if let Some(value) = value {
                    set_state(Box::new(move |state: AppState| {
                        let mut next = state.clone();
                        let root_expression = target_expression_mut(&mut next, target);
                        set_variable_value(root_expression, path.as_slice(), &value);
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
            PathStep::Left => "L",
            PathStep::Right => "R",
            PathStep::Condition => "C",
            PathStep::Then => "T",
            PathStep::Else => "E",
            PathStep::LetValue => "LV",
            PathStep::LetBody => "LB",
        })
        .collect::<Vec<&str>>()
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
        _ => None,
    }
}

fn set_node_kind(
    root_expression: &mut definy_event::event::Expression,
    path: &[PathStep],
    kind: NodeKind,
) {
    if let Some(expression) = get_mut_expression_at_path(root_expression, path) {
        *expression =
            match kind {
                NodeKind::Number => {
                    definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                        value: 0,
                    })
                }
                NodeKind::Add => {
                    definy_event::event::Expression::Add(definy_event::event::AddExpression {
                        left: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 0 },
                        )),
                        right: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 0 },
                        )),
                    })
                }
                NodeKind::PartReference => definy_event::event::Expression::PartReference(
                    definy_event::event::PartReferenceExpression {
                        part_name: "".into(),
                    },
                ),
                NodeKind::Boolean => definy_event::event::Expression::Boolean(
                    definy_event::event::BooleanExpression { value: false },
                ),
                NodeKind::If => {
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
                }
                NodeKind::Equal => {
                    definy_event::event::Expression::Equal(definy_event::event::EqualExpression {
                        left: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 0 },
                        )),
                        right: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 0 },
                        )),
                    })
                }
                NodeKind::Let => {
                    definy_event::event::Expression::Let(definy_event::event::LetExpression {
                        variable_name: "x".into(),
                        value: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 0 },
                        )),
                        body: Box::new(definy_event::event::Expression::Variable(
                            definy_event::event::VariableExpression {
                                variable_name: "x".into(),
                            },
                        )),
                    })
                }
                NodeKind::Variable => definy_event::event::Expression::Variable(
                    definy_event::event::VariableExpression {
                        variable_name: "x".into(),
                    },
                ),
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

fn set_reference_value(
    root_expression: &mut definy_event::event::Expression,
    path: &[PathStep],
    value: &str,
) {
    if let Some(definy_event::event::Expression::PartReference(part_ref)) =
        get_mut_expression_at_path(root_expression, path)
    {
        part_ref.part_name = value.into();
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

fn set_variable_value(
    root_expression: &mut definy_event::event::Expression,
    path: &[PathStep],
    value: &str,
) {
    if let Some(expr) = get_mut_expression_at_path(root_expression, path) {
        match expr {
            definy_event::event::Expression::Let(let_expr) => {
                let_expr.variable_name = value.into();
            }
            definy_event::event::Expression::Variable(var_expr) => {
                var_expr.variable_name = value.into();
            }
            _ => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        NodeKind, PathStep, get_mut_expression_at_path, path_to_key, set_node_kind,
        set_number_value,
    };

    #[test]
    fn edit_nested_expression_by_ui_path() {
        let mut expression =
            definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                value: 0,
            });

        set_node_kind(&mut expression, &[], NodeKind::Add);
        set_number_value(&mut expression, &[PathStep::Left], 321);
        set_node_kind(&mut expression, &[PathStep::Right], NodeKind::Add);
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
}
