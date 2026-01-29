mod fetch;

use std::rc::Rc;

use definy_ui::{AppState, Message};
use definy_ui::{CreatingAccountState, LoginOrCreateAccountDialogState};
use js_sys::Reflect;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
fn run() -> Result<(), JsValue> {
    narumincho_vdom_client::start::<AppState, DefinyApp>();

    Ok(())
}

struct DefinyApp {}

impl narumincho_vdom_client::App<AppState> for DefinyApp {
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

    fn render(state: &AppState) -> narumincho_vdom::Node<AppState> {
        definy_ui::app(state, &None)
    }
}

fn generate_key() -> ed25519_dalek::SigningKey {
    let mut csprng = rand::rngs::OsRng;
    ed25519_dalek::SigningKey::generate(&mut csprng)
}

// function removed
