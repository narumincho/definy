mod fetch;

use std::rc::Rc;

use definy_ui::{AppState, Message};
use definy_ui::{CreatingAccountState, LoginOrCreateAccountDialogState};
use js_sys::Reflect;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
fn run() -> Result<(), JsValue> {
    narumincho_vdom_client::start::<AppState, Message, DefinyApp>();

    Ok(())
}

struct DefinyApp {}

impl narumincho_vdom_client::App<AppState, Message> for DefinyApp {
    fn initial_state(
        fire: &std::rc::Rc<dyn Fn(Box<dyn FnOnce(AppState) -> AppState>)>,
    ) -> AppState {
        let fire = std::rc::Rc::clone(fire);
        wasm_bindgen_futures::spawn_local(async move {
            let events = fetch::get_events().await.unwrap();
            fire(Box::new(move |state| AppState {
                created_account_events: events,
                ..state.clone()
            }));
        });
        AppState {
            login_or_create_account_dialog_state: LoginOrCreateAccountDialogState {
                creating_account: CreatingAccountState::NotStarted,
                username: String::new(),
                generated_key: None,
                current_password: String::new(),
            },
            created_account_events: Vec::new(),
        }
    }

    fn render(state: &AppState) -> narumincho_vdom::Node<Message> {
        definy_ui::app(state, &None)
    }

    fn update(state: &AppState, msg: &Message, fire: &std::rc::Rc<dyn Fn(Message)>) -> AppState {
        match msg {
            Message::ShowCreateAccountDialog => {
                let key = generate_key();
                AppState {
                    login_or_create_account_dialog_state: LoginOrCreateAccountDialogState {
                        generated_key: Some(key),
                        ..state.login_or_create_account_dialog_state.clone()
                    },
                    ..state.clone()
                }
            }
            Message::CloseCreateAccountDialog => state.clone(),
            Message::RegenerateKey => {
                let key = generate_key();
                AppState {
                    login_or_create_account_dialog_state: LoginOrCreateAccountDialogState {
                        generated_key: Some(key),
                        ..state.login_or_create_account_dialog_state.clone()
                    },
                    ..state.clone()
                }
            }
            Message::CopyPrivateKey => {
                let window = web_sys::window().expect("no global `window` exists");
                if let Some(key) = &state.login_or_create_account_dialog_state.generated_key {
                    let _ = window
                        .navigator()
                        .clipboard()
                        .write_text(&base64::Engine::encode(
                            &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                            key.to_scalar_bytes(),
                        ));
                }
                state.clone()
            }
            Message::SubmitCreateAccountForm => {
                let fire = Rc::clone(&fire);
                let username = state.login_or_create_account_dialog_state.username.clone();

                if let Some(key) = &state.login_or_create_account_dialog_state.generated_key {
                    let key = key.clone();

                    wasm_bindgen_futures::spawn_local(async move {
                        handle_submit_create_account_form(username.as_str(), &key, fire.as_ref())
                            .await;
                    });
                }

                AppState {
                    login_or_create_account_dialog_state: LoginOrCreateAccountDialogState {
                        creating_account: CreatingAccountState::Requesting,
                        ..state.login_or_create_account_dialog_state.clone()
                    },
                    ..state.clone()
                }
            }
            Message::UpdateUsername(_) => {
                let window = web_sys::window().expect("no global `window` exists");
                let document = window.document().expect("should have a document on window");
                if let Ok(Some(input_element)) = document.query_selector("input[name='username']") {
                    if let Ok(value) = Reflect::get(&input_element, &JsValue::from_str("value")) {
                        if let Some(username) = value.as_string() {
                            web_sys::console::log_1(
                                &format!("Username updated: {}", username).into(),
                            );
                            return AppState {
                                login_or_create_account_dialog_state:
                                    LoginOrCreateAccountDialogState {
                                        username,
                                        ..state.login_or_create_account_dialog_state.clone()
                                    },
                                ..state.clone()
                            };
                        }
                    }
                }
                state.clone()
            }
            Message::ResponseCreateAccount => AppState {
                login_or_create_account_dialog_state: LoginOrCreateAccountDialogState {
                    creating_account: CreatingAccountState::Success,
                    ..state.login_or_create_account_dialog_state.clone()
                },
                ..state.clone()
            },
            Message::SubmitLoginForm => {
                let window = web_sys::window().expect("no global `window` exists");
                let document = window.document().expect("should have a document on window");
                if let Ok(Some(input_element)) =
                    document.query_selector("input[autocomplete='current-password']")
                {
                    if let Ok(value) = Reflect::get(&input_element, &JsValue::from_str("value")) {
                        if let Some(password) = value.as_string() {
                            return AppState {
                                login_or_create_account_dialog_state:
                                    LoginOrCreateAccountDialogState {
                                        current_password: password,
                                        ..state.login_or_create_account_dialog_state.clone()
                                    },
                                ..state.clone()
                            };
                        }
                    }
                }
                state.clone()
            }
        }
    }
}

fn generate_key() -> ed25519_dalek::SigningKey {
    let mut csprng = rand::rngs::OsRng;
    ed25519_dalek::SigningKey::generate(&mut csprng)
}

async fn handle_submit_create_account_form(
    username: &str,
    generated_key: &ed25519_dalek::SigningKey,
    fire: &dyn Fn(Message),
) {
    let status = fetch::post_event(
        definy_event::sign_and_serialize(
            definy_event::CreateAccountEvent {
                account_id: definy_event::AccountId(Box::new(
                    generated_key.verifying_key().to_bytes(),
                )),
                account_name: username.into(),
                time: chrono::Utc::now(),
            },
            &generated_key,
        )
        .unwrap()
        .as_slice(),
    )
    .await
    .unwrap();

    web_sys::console::log_1(&JsValue::from_f64(status as f64));

    fire(Message::ResponseCreateAccount)
}
