use narumincho_vdom::*;

use crate::app_state::AppState;
use crate::part_projection::collect_part_snapshots;

#[derive(Clone, Copy)]
pub enum EditorTarget {
    PartDefinition,
    PartUpdate,
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

#[derive(Clone)]
struct ScopeVariable {
    id: i64,
    name: String,
}

pub fn render_root_expression_editor(
    state: &AppState,
    expression: &definy_event::event::Expression,
    target: EditorTarget,
) -> Node<AppState> {
    render_expression_editor(state, expression, Vec::new(), target, Vec::new())
}

fn render_expression_editor(
    state: &AppState,
    expression: &definy_event::event::Expression,
    path: Vec<PathStep>,
    target: EditorTarget,
    scope_variables: Vec<ScopeVariable>,
) -> Node<AppState> {
    let current_selection = current_selection_value(expression);
    let selector_options = selector_options(state, &scope_variables);

    let mut children = vec![
        expression_selector(
            path.clone(),
            target,
            &current_selection,
            &selector_options,
        ),
    ];

    match expression {
        definy_event::event::Expression::Number(number_expression) => {
            children.push(number_input(path, target, number_expression.value));
        }
        definy_event::event::Expression::String(string_expression) => {
            children.push(string_input(path, target, string_expression.value.as_ref()));
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
                                text("Left"),
                                render_expression_editor(
                                    state,
                                    add_expression.left.as_ref(),
                                    left_path,
                                    target,
                                    scope_variables.clone(),
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
                                    state,
                                    if_expression.condition.as_ref(),
                                    cond_path,
                                    target,
                                    scope_variables.clone(),
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
                                    state,
                                    equal_expression.left.as_ref(),
                                    left_path,
                                    target,
                                    scope_variables.clone(),
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
                                ),
                            ])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.3rem"))
                            .children([
                                text("Body"),
                                {
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
                                    )
                                },
                            ])
                            .into_node(),
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
                    .children([text("Select から Global/Local 参照を選んでください")])
                    .into_node(),
            );
        }
    }

    Div::new()
        .class("event-detail-card")
        .style(
            Style::new()
                .set("padding", "0.8rem")
                .set("display", "grid")
                .set("gap", "0.6rem"),
        )
        .children(children)
        .into_node()
}

fn expression_selector(
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
    let selector = format!("select[name='{}']", name);

    let mut select = Select::new()
        .name(name.as_str())
        .value(current_value)
        .style(Style::new().set("padding", "0.35rem 0.5rem"));

    select.events.push((
        "change".to_string(),
        EventHandler::new(move |set_state| {
            let selector = selector.clone();
            let path = path.clone();
            async move {
                let selected_value = web_sys::window()
                    .and_then(|window| window.document())
                    .and_then(|document| document.query_selector(selector.as_str()).ok())
                    .flatten()
                    .and_then(|element| {
                        js_sys::Reflect::get(
                            &element,
                            &wasm_bindgen::JsValue::from_str("value"),
                        )
                        .ok()
                    })
                    .and_then(|value| value.as_string())
                    .unwrap_or_default();

                set_state(Box::new(move |state: AppState| {
                    let mut next = state.clone();
                    let root_expression = target_expression_mut(&mut next, target);
                    apply_selection(root_expression, path.as_slice(), selected_value.as_str());
                    next
                }));
            }
        }),
    ));

    select
        .children(
            options
                .iter()
                .map(|(value, label)| {
                    OptionElement::new()
                        .value(value)
                        .children([text(label.clone())])
                        .into_node()
                })
                .collect::<Vec<Node<AppState>>>(),
        )
        .into_node()
}

fn selector_options(state: &AppState, scope_variables: &[ScopeVariable]) -> Vec<(String, String)> {
    let mut options = vec![
        ("expr:number".to_string(), "Constant: Number".to_string()),
        ("expr:string".to_string(), "Constant: String".to_string()),
        ("expr:boolean".to_string(), "Constant: Boolean".to_string()),
        ("expr:add".to_string(), "Function: Add".to_string()),
        ("expr:equal".to_string(), "Function: Equal".to_string()),
        ("expr:if".to_string(), "Syntax: If".to_string()),
        ("expr:let".to_string(), "Syntax: Let".to_string()),
    ];

    options.extend(collect_part_snapshots(state).into_iter().map(|snapshot| {
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
        definy_event::event::Expression::Boolean(_) => "expr:boolean".to_string(),
        definy_event::event::Expression::Add(_) => "expr:add".to_string(),
        definy_event::event::Expression::Equal(_) => "expr:equal".to_string(),
        definy_event::event::Expression::If(_) => "expr:if".to_string(),
        definy_event::event::Expression::Let(_) => "expr:let".to_string(),
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
) {
    let next_variable_id = if selected_value == "expr:let" {
        next_local_variable_id(root_expression)
    } else {
        0
    };
    if let Some(expression) = get_mut_expression_at_path(root_expression, path) {
        *expression = if selected_value == "expr:number" {
            definy_event::event::Expression::Number(definy_event::event::NumberExpression { value: 0 })
        } else if selected_value == "expr:string" {
            definy_event::event::Expression::String(definy_event::event::StringExpression {
                value: "".into(),
            })
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

fn next_local_variable_id(expression: &definy_event::event::Expression) -> i64 {
    fn max_local_variable_id(expression: &definy_event::event::Expression) -> i64 {
        match expression {
            definy_event::event::Expression::Number(_) => 0,
            definy_event::event::Expression::String(_) => 0,
            definy_event::event::Expression::Boolean(_) => 0,
            definy_event::event::Expression::PartReference(_) => 0,
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
        }
    }
    max_local_variable_id(expression).saturating_add(1).max(1)
}

#[cfg(test)]
mod tests {
    use super::{get_mut_expression_at_path, path_to_key, set_number_value, PathStep};

    #[test]
    fn edit_nested_expression_by_ui_path() {
        let mut expression = definy_event::event::Expression::Add(definy_event::event::AddExpression {
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
}
