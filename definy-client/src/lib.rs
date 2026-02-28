use definy_ui::AppState;
use definy_ui::{CreatingAccountState, LoginOrCreateAccountDialogState};
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
            let events = definy_ui::fetch::get_events().await.unwrap();
            fire(Box::new(move |state| AppState {
                created_account_events: events,
                ..state.clone()
            }));
            let password = definy_ui::navigator_credential::credential_get().await;
            if let Some(password) = password {
                fire(Box::new(move |state| AppState {
                    current_key: Some(password),
                    ..state.clone()
                }));
            }
        });

        AppState {
            login_or_create_account_dialog_state: LoginOrCreateAccountDialogState {
                state: CreatingAccountState::LogIn,
                username: String::new(),
                generated_key: None,
                current_password: String::new(),
            },
            created_account_events: Vec::new(),
            current_key: None,
            message_input: String::new(),
            location: {
                let initial_url = web_sys::window()
                    .unwrap()
                    .document()
                    .unwrap()
                    .url()
                    .unwrap_or_default();
                let url = web_sys::Url::new(&initial_url).unwrap();
                let pathname = url.pathname();
                use narumincho_vdom::Route;
                definy_ui::Location::from_url(&pathname).unwrap_or(definy_ui::Location::Home)
            },
        }
    }

    fn on_navigate(state: AppState, url: String) -> AppState {
        use narumincho_vdom::Route;
        if let Ok(web_url) = web_sys::Url::new(&url) {
            let pathname = web_url.pathname();
            if let Some(location) = definy_ui::Location::from_url(&pathname) {
                return AppState { location, ..state };
            }
        }
        state
    }

    fn render(state: &AppState) -> narumincho_vdom::Node<AppState> {
        definy_ui::render(state, &None)
    }
}
