use definy_ui::{AppState, Message};
use js_sys::Reflect;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
fn run() -> Result<(), JsValue> {
    let state = AppState {
        count: 0,
        generated_key: None,
        generated_public_key: None,
        username: String::new(),
    };

    narumincho_vdom_client::start(&state, definy_ui::app, update);

    Ok(())
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
            let mut new_state = state.clone();
            generate_key(&mut new_state);
            new_state
        }
        Message::CloseCreateAccountDialog => state.clone(),
        Message::RegenerateKey => {
            let mut new_state = state.clone();
            generate_key(&mut new_state);
            new_state
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
                        web_sys::console::log_1(&format!("Username updated: {}", username).into());
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

fn generate_key(state: &mut AppState) {
    let mut csprng = rand::rngs::OsRng;
    let signing_key: ed25519_dalek::SigningKey = ed25519_dalek::SigningKey::generate(&mut csprng);
    let secret = signing_key.to_bytes();
    let public = signing_key.verifying_key().to_bytes();

    use base64::{Engine as _, engine::general_purpose};
    let encoded_secret = general_purpose::URL_SAFE_NO_PAD.encode(secret);
    let encoded_public = general_purpose::URL_SAFE_NO_PAD.encode(public);

    state.generated_key = Some(encoded_secret);
    state.generated_public_key = Some(encoded_public);
}
