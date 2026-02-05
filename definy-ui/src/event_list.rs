use definy_event::event::{Event, EventContent};
use narumincho_vdom::*;

use crate::app_state::AppState;

pub fn event_list_view(state: &AppState) -> Node<AppState> {
    Div::new()
        .children([
            Div::new()
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
                        input.into_node()
                    },
                    Button::new()
                        .on_click(EventHandler::new(async |set_state| {
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

                                    let _ = crate::fetch::post_event(event_binary.as_slice()).await;
                                });
                                AppState {
                                    message_input: String::new(),
                                    ..state.clone()
                                }
                            }));
                        }))
                        .children([text("送信")])
                        .into_node(),
                ])
                .into_node(),
            Div::new()
                .style("display: grid; gap: 0.5rem;")
                .children(
                    state
                        .created_account_events
                        .iter()
                        .map(|(_, event)| event_view(event))
                        .collect::<Vec<Node<AppState>>>(),
                )
                .into_node(),
        ])
        .into_node()
}

fn event_view(event: &Event) -> Node<AppState> {
    Div::new()
    .style("border: 1px solid var(--border); border-radius: 4px; padding: 0.5rem; color: var(--text); font-size: 1rem;")
    .children([
    match &event.content {
      EventContent::CreateAccount(create_account_event) => {
        Div::new()
        .children([
            text("アカウント「"),
            text(create_account_event.account_name.as_ref()),
            text("」が作成されました"),
        ])
        .into_node()
      },
      EventContent::Message(message_event) => {
        Div::new()
        .children([
            text("メッセージ「"),
            text(message_event.message.as_ref()),
            text("」が作成されました"),
        ])
        .into_node()
      },
    },
    Div::new()
        .children([
            text("アカウントID: "),
            text(&base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, event.account_id.0.as_slice()))
        ])
        .into_node(),
    Div::new()
        .children([text(&event.time.to_string())])
        .into_node(),
  ])
  .into_node()
}
