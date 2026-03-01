use definy_event::event::EventContent;
use narumincho_vdom::*;

use crate::app_state::{AppState, ExpressionOperator};
use crate::expression_eval::{evaluate_expression, expression_to_source};

pub fn event_list_view(state: &AppState) -> Node<AppState> {
    let message_form = if state.current_key.is_some() {
        Some(
            Div::new()
                .class("composer")
                .style(
                    Style::new()
                        .set("display", "flex")
                        .set("gap", "1rem")
                        .set("background", "var(--surface)")
                        .set("backdrop-filter", "var(--glass-blur)")
                        .set("-webkit-backdrop-filter", "var(--glass-blur)")
                        .set("padding", "1.5rem")
                        .set("border-radius", "var(--radius-lg)")
                        .set("box-shadow", "var(--shadow-md)")
                        .set("border", "1px solid var(--border)"),
                )
                .children([
                    Div::new()
                        .style(
                            Style::new()
                                .set("display", "grid")
                                .set("grid-template-columns", "auto 1fr 1fr")
                                .set("gap", "0.5rem")
                                .set("flex-grow", "1"),
                        )
                        .children([
                            Button::new()
                                .type_("button")
                                .on_click(EventHandler::new(async |set_state| {
                                    set_state(Box::new(|state: AppState| AppState {
                                        selected_operator: ExpressionOperator::Add,
                                        ..state.clone()
                                    }));
                                }))
                                .style(
                                    Style::new()
                                        .set("min-width", "2.8rem")
                                        .set(
                                            "background",
                                            if state.selected_operator == ExpressionOperator::Add {
                                                "var(--primary-gradient)"
                                            } else {
                                                "rgba(255, 255, 255, 0.05)"
                                            },
                                        ),
                                )
                                .children([text("+")])
                                .into_node(),
                            {
                                let mut left_input =
                                    Input::new().type_("number").value(&state.expression_left_input);
                                left_input.events.push((
                                    "input".to_string(),
                                    EventHandler::new(move |set_state| async move {
                                        let value = web_sys::window()
                                            .and_then(|window| window.document())
                                            .and_then(|document| {
                                                document.query_selector("input[name='expr-left']").ok()
                                            })
                                            .flatten()
                                            .and_then(|element| {
                                                wasm_bindgen::JsCast::dyn_into::<
                                                    web_sys::HtmlInputElement,
                                                >(element)
                                                .ok()
                                            })
                                            .map(|input| input.value())
                                            .unwrap_or_default();
                                        set_state(Box::new(move |state: AppState| AppState {
                                            expression_left_input: value,
                                            ..state.clone()
                                        }));
                                    }),
                                ));
                                left_input.name("expr-left").into_node()
                            },
                            {
                                let mut right_input =
                                    Input::new().type_("number").value(&state.expression_right_input);
                                right_input.events.push((
                                    "input".to_string(),
                                    EventHandler::new(move |set_state| async move {
                                        let value = web_sys::window()
                                            .and_then(|window| window.document())
                                            .and_then(|document| {
                                                document.query_selector("input[name='expr-right']").ok()
                                            })
                                            .flatten()
                                            .and_then(|element| {
                                                wasm_bindgen::JsCast::dyn_into::<
                                                    web_sys::HtmlInputElement,
                                                >(element)
                                                .ok()
                                            })
                                            .map(|input| input.value())
                                            .unwrap_or_default();
                                        set_state(Box::new(move |state: AppState| AppState {
                                            expression_right_input: value,
                                            ..state.clone()
                                        }));
                                    }),
                                ));
                                right_input.name("expr-right").into_node()
                            },
                        ])
                        .into_node(),
                    Button::new()
                        .type_("button")
                        .on_click(EventHandler::new(async |set_state| {
                            set_state(Box::new(|state: AppState| {
                                let result = match expression_from_inputs(&state) {
                                    Ok(expression) => match evaluate_expression(&expression) {
                                        Ok(value) => format!("Result: {}", value),
                                        Err(error) => format!("Error: {}", error),
                                    },
                                    Err(error) => format!("Error: {}", error),
                                };
                                AppState {
                                    message_eval_result: Some(result),
                                    ..state.clone()
                                }
                            }));
                        }))
                        .children([text("Evaluate")])
                        .into_node(),
                    Button::new()
                        .on_click(EventHandler::new(async |set_state| {
                            let set_state = std::rc::Rc::new(set_state);
                            let set_state_for_async = set_state.clone();
                            set_state(Box::new(|state: AppState| {
                                let key: &ed25519_dalek::SigningKey =
                                    if let Some(key) = &state.current_key {
                                        key
                                    } else {
                                        web_sys::console::log_1(&"login required".into());
                                        return state;
                                    };

                                let expression = match expression_from_inputs(&state) {
                                    Ok(expression) => expression,
                                    Err(error) => {
                                        return AppState {
                                            message_eval_result: Some(format!("Error: {}", error)),
                                            ..state.clone()
                                        };
                                    }
                                };
                                let key_for_async = key.clone();

                                wasm_bindgen_futures::spawn_local(async move {
                                    let event_binary = definy_event::sign_and_serialize(
                                        definy_event::event::Event {
                                            account_id: definy_event::event::AccountId(Box::new(
                                                key_for_async.verifying_key().to_bytes(),
                                            )),
                                            time: chrono::Utc::now(),
                                            content: definy_event::event::EventContent::Message(
                                                definy_event::event::MessageEvent { expression },
                                            ),
                                        },
                                        &key_for_async,
                                    )
                                    .unwrap();

                                    let status = crate::fetch::post_event(event_binary.as_slice()).await;
                                    match status {
                                        Ok(_) => {
                                            let events = crate::fetch::get_events().await;
                                            if let Ok(events) = events {
                                                set_state_for_async(Box::new(|state| AppState {
                                                    created_account_events: events,
                                                    ..state.clone()
                                                }));
                                            }
                                        }
                                        Err(e) => {
                                            web_sys::console::log_1(
                                                &format!("Failed to post event: {:?}", e).into(),
                                            );
                                        }
                                    }
                                });
                                AppState {
                                    message_eval_result: None,
                                    expression_left_input: String::new(),
                                    expression_right_input: String::new(),
                                    ..state.clone()
                                }
                            }));
                        }))
                        .children([text("Send")])
                        .into_node(),
                ])
                .into_node(),
        )
    } else {
        None
    };

    Div::new()
        .class("page-shell")
        .style(
            Style::new()
                .set("display", "grid")
                .set("gap", "2rem")
                .set("width", "100%")
                .set("max-width", "800px")
                .set("margin", "0 auto")
                .set("padding", "2rem 1rem"),
        )
        .children({
            let mut children = Vec::new();
            if let Some(message_form) = message_form {
                children.push(message_form);
            }
            if let Some(result) = &state.message_eval_result {
                children.push(
                    Div::new()
                        .class("event-detail-card")
                        .style(
                            Style::new()
                                .set("padding", "0.9rem 1rem")
                                .set("font-family", "'JetBrains Mono', monospace")
                                .set("font-size", "0.9rem")
                                .set("word-break", "break-word"),
                        )
                        .children([text(result)])
                        .into_node(),
                );
            }
            children.push(
                Div::new()
                    .class("event-list")
                    .style(Style::new().set("display", "grid").set("gap", "1rem"))
                    .children({
                        let account_name_map = state.account_name_map();

                        state
                            .created_account_events
                            .iter()
                            .map(|(hash, event)| event_view(hash, event, &account_name_map))
                            .collect::<Vec<Node<AppState>>>()
                    })
                    .into_node(),
            );
            children
        })
        .into_node()
}

fn event_view(
    hash: &[u8; 32],
    event_result: &Result<
        (ed25519_dalek::Signature, definy_event::event::Event),
        definy_event::VerifyAndDeserializeError,
    >,
    account_name_map: &std::collections::HashMap<definy_event::event::AccountId, Box<str>>,
) -> Node<AppState> {
    match event_result {
        Ok((_, event)) => A::<AppState, crate::Location>::new()
            .class("event-card")
            .style(
                Style::new()
                    .set("background", "rgba(255, 255, 255, 0.02)")
                    .set("backdrop-filter", "var(--glass-blur)")
                    .set("-webkit-backdrop-filter", "var(--glass-blur)")
                    .set("border", "1px solid var(--border)")
                    .set("border-radius", "var(--radius-lg)")
                    .set("padding", "1.5rem")
                    .set("box-shadow", "0 4px 6px -1px rgba(0, 0, 0, 0.1)")
                    .set("transition", "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)")
                    .set("display", "grid")
                    .set("gap", "0.75rem"),
            )
            .href(narumincho_vdom::Href::Internal(crate::Location::Event(
                *hash,
            )))
            .children([
                Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "0.875rem")
                            .set("color", "var(--text-secondary)")
                            .set("display", "flex")
                            .set("justify-content", "space-between")
                            .set("align-items", "center"),
                    )
                    .children([
                        Div::new()
                            .children([text(&event.time.format("%Y-%m-%d %H:%M:%S").to_string())])
                            .into_node(),
                        Div::new()
                            .class("mono")
                            .style(Style::new().set("opacity", "0.6"))
                            .children([text(&base64::Engine::encode(
                                &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                                event.account_id.0.as_slice(),
                            ))])
                            .into_node(),
                    ])
                    .into_node(),
                match &event.content {
                    EventContent::CreateAccount(create_account_event) => Div::new()
                        .style(Style::new().set("color", "var(--primary)"))
                        .children([
                            text("Account created: "),
                            text(create_account_event.account_name.as_ref()),
                        ])
                        .into_node(),
                    EventContent::ChangeProfile(change_profile_event) => Div::new()
                        .style(Style::new().set("color", "var(--primary)"))
                        .children([
                            text("Profile changed: "),
                            text(change_profile_event.account_name.as_ref()),
                        ])
                        .into_node(),
                    EventContent::Message(message_event) => Div::new()
                        .style(Style::new().set("font-size", "1.125rem"))
                        .children([
                            Div::new()
                                .style(
                                    Style::new()
                                        .set("font-size", "0.85rem")
                                        .set("color", "var(--primary)")
                                        .set("font-weight", "600")
                                        .set("margin-bottom", "0.25rem"),
                                )
                                .children([text(
                                    account_name_map
                                        .get(&event.account_id)
                                        .map(|name: &Box<str>| name.as_ref())
                                        .unwrap_or("Unknown"),
                                )])
                                .into_node(),
                            text(expression_to_source(&message_event.expression)),
                        ])
                        .into_node(),
                },
            ])
            .into_node(),
        Err(e) => Div::new()
            .class("error-card")
            .style(
                Style::new()
                    .set("background-color", "rgba(244, 63, 94, 0.1)")
                    .set("border", "1px solid var(--error)")
                    .set("border-radius", "var(--radius-md)")
                    .set("padding", "1rem")
                    .set("color", "var(--error)"),
            )
            .children([text(&format!("イベントの読み込みに失敗しました: {:?}", e))])
            .into_node(),
    }
}

fn expression_from_inputs(state: &AppState) -> Result<definy_event::event::Expression, &'static str> {
    expression_from_input_values(
        &state.selected_operator,
        state.expression_left_input.as_str(),
        state.expression_right_input.as_str(),
    )
}

fn expression_from_input_values(
    operator: &ExpressionOperator,
    left_input: &str,
    right_input: &str,
) -> Result<definy_event::event::Expression, &'static str> {
    let left = left_input
        .trim()
        .parse::<i64>()
        .map_err(|_| "left operand must be a number")?;
    let right = right_input
        .trim()
        .parse::<i64>()
        .map_err(|_| "right operand must be a number")?;

    match operator {
        ExpressionOperator::Add => Ok(definy_event::event::Expression::Add(
            definy_event::event::AddExpression { left, right },
        )),
    }
}

#[cfg(test)]
mod tests {
    use crate::app_state::ExpressionOperator;

    use super::expression_from_input_values;

    #[test]
    fn parse_expression_input_values() {
        let expression = expression_from_input_values(&ExpressionOperator::Add, "10", "32").unwrap();
        assert_eq!(
            expression,
            definy_event::event::Expression::Add(definy_event::event::AddExpression {
                left: 10,
                right: 32
            })
        );
        assert!(expression_from_input_values(&ExpressionOperator::Add, "x", "1").is_err());
    }
}
