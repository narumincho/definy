use definy_event::event::EventContent;
use narumincho_vdom::*;

use crate::app_state::AppState;

pub fn event_list_view(state: &AppState) -> Node<AppState> {
    Div::new()
        .style(
            Style::new()
                .set("display", "grid")
                .set("gap", "2rem")
                .set("width", "100%")
                .set("max-width", "800px")
                .set("margin", "0 auto")
                .set("padding", "2rem 1rem"),
        )
        .children([
            Div::new()
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
                    {
                        let mut input = Input::new().value(&state.message_input);
                        input.events.push((
                            "input".to_string(),
                            EventHandler::new(move |set_state| async move {
                                let value =
                                    wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(
                                        web_sys::window()
                                            .unwrap()
                                            .document()
                                            .unwrap()
                                            .active_element()
                                            .unwrap(),
                                    )
                                    .unwrap()
                                    .value();
                                set_state(Box::new(move |state: AppState| AppState {
                                    message_input: value,
                                    ..state.clone()
                                }));
                            }),
                        ));
                        input.style(Style::new().set("flex-grow", "1")).into_node()
                    },
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

                                let message = state.message_input.clone();
                                let key_for_async = key.clone();

                                wasm_bindgen_futures::spawn_local(async move {
                                    let event_binary = definy_event::sign_and_serialize(
                                        definy_event::event::Event {
                                            account_id: definy_event::event::AccountId(Box::new(
                                                key_for_async.verifying_key().to_bytes(),
                                            )),
                                            time: chrono::Utc::now(),
                                            content: definy_event::event::EventContent::Message(
                                                definy_event::event::MessageEvent {
                                                    message: message.into(),
                                                },
                                            ),
                                        },
                                        &key_for_async,
                                    )
                                    .unwrap();

                                    let status =
                                        crate::fetch::post_event(event_binary.as_slice()).await;
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
                                    message_input: String::new(),
                                    ..state.clone()
                                }
                            }));
                        }))
                        .children([text("Send")])
                        .into_node(),
                ])
                .into_node(),
            Div::new()
                .style(Style::new().set("display", "grid").set("gap", "1rem"))
                .children({
                    let mut account_name_map = std::collections::HashMap::new();
                    for (_, event_result) in &state.created_account_events {
                        if let Ok((_, event)) = event_result {
                            if let definy_event::event::EventContent::CreateAccount(e) =
                                &event.content
                            {
                                account_name_map
                                    .insert(event.account_id.clone(), e.account_name.clone());
                            }
                        }
                    }

                    state
                        .created_account_events
                        .iter()
                        .map(|(hash, event)| event_view(hash, event, &account_name_map))
                        .collect::<Vec<Node<AppState>>>()
                })
                .into_node(),
        ])
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
                            text(message_event.message.as_ref()),
                        ])
                        .into_node(),
                },
            ])
            .into_node(),
        Err(e) => Div::new()
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
