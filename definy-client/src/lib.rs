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

fn read_ssr_events() -> Option<
    Vec<(
        [u8; 32],
        Result<
            (ed25519_dalek::Signature, definy_event::event::Event),
            definy_event::VerifyAndDeserializeError,
        >,
    )>,
> {
    let text = web_sys::window()?
        .document()?
        .get_element_by_id(definy_ui::SSR_INITIAL_STATE_ELEMENT_ID)?
        .text_content()?;
    let event_binaries = definy_ui::decode_ssr_initial_state(text.as_str())?;
    Some(
        event_binaries
            .into_iter()
            .map(|bytes| {
                let hash: [u8; 32] = <sha2::Sha256 as sha2::Digest>::digest(&bytes).into();
                (hash, definy_event::verify_and_deserialize(&bytes))
            })
            .collect(),
    )
}

impl narumincho_vdom_client::App<AppState> for DefinyApp {
    fn initial_state(
        fire: &std::rc::Rc<dyn Fn(Box<dyn FnOnce(AppState) -> AppState>)>,
    ) -> AppState {
        let fire = std::rc::Rc::clone(fire);
        let ssr_events = read_ssr_events();
        let has_ssr_events = ssr_events.is_some();
        wasm_bindgen_futures::spawn_local(async move {
            if !has_ssr_events {
                let events = definy_ui::fetch::get_events().await.unwrap();
                fire(Box::new(move |state| AppState {
                    created_account_events: events,
                    ..state.clone()
                }));
            }
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
            created_account_events: ssr_events.unwrap_or_default(),
            current_key: None,
            message_input: String::new(),
            profile_name_input: String::new(),
            is_header_popover_open: false,
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
                definy_ui::Location::from_url(&pathname)
            },
        }
    }

    fn on_navigate(state: AppState, url: String) -> AppState {
        use narumincho_vdom::Route;
        if let Ok(web_url) = web_sys::Url::new(&url) {
            let pathname = web_url.pathname();
            let location = definy_ui::Location::from_url(&pathname);
            return AppState { location, ..state };
        }
        state
    }

    fn render(state: &AppState) -> narumincho_vdom::Node<AppState> {
        definy_ui::render(state, &None, None)
    }
}
