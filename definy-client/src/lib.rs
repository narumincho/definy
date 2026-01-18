use definy_ui::{AppState, Message};
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
    fn initial_state() -> AppState {
        AppState {
            count: 0,
            generated_key: None,
            generated_public_key: None,
            username: String::new(),
        }
    }

    fn render(state: &AppState) -> narumincho_vdom::Node<Message> {
        definy_ui::app(state)
    }

    fn update(state: &AppState, msg: &Message) -> AppState {
        match msg {
            Message::Increment => AppState {
                count: state.count + 1,
                generated_key: state.generated_key.clone(),
                generated_public_key: state.generated_public_key.clone(),
                username: state.username.clone(),
            },
            Message::ShowCreateAccountDialog => {
                let key = generate_key();
                AppState {
                    generated_key: Some(key.encoded_secret),
                    generated_public_key: Some(key.encoded_public),
                    ..state.clone()
                }
            }
            Message::CloseCreateAccountDialog => state.clone(),
            Message::RegenerateKey => {
                let key = generate_key();
                AppState {
                    generated_key: Some(key.encoded_secret),
                    generated_public_key: Some(key.encoded_public),
                    ..state.clone()
                }
            }
            Message::CopyPrivateKey => {
                let window = web_sys::window().expect("no global `window` exists");
                if let Some(key) = &state.generated_key {
                    let _ = window.navigator().clipboard().write_text(key);
                }
                state.clone()
            }
            Message::SubmitCreateAccountForm => {
                web_sys::console::log_1(&"SubmitCreateAccountForm called".into());
                // アカウント作成フォームの送信処理（未実装）
                state.clone()
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
                                count: state.count,
                                generated_key: state.generated_key.clone(),
                                generated_public_key: state.generated_public_key.clone(),
                                username,
                            };
                        }
                    }
                }
                state.clone()
            }
        }
    }
}

struct Key {
    encoded_secret: String,
    encoded_public: String,
}

fn generate_key() -> Key {
    let mut csprng = rand::rngs::OsRng;
    let signing_key: ed25519_dalek::SigningKey = ed25519_dalek::SigningKey::generate(&mut csprng);
    let secret = signing_key.to_bytes();
    let public = signing_key.verifying_key().to_bytes();

    use base64::{Engine as _, engine::general_purpose};
    let encoded_secret = general_purpose::URL_SAFE_NO_PAD.encode(secret);
    let encoded_public = general_purpose::URL_SAFE_NO_PAD.encode(public);

    Key {
        encoded_secret,
        encoded_public,
    }
}
