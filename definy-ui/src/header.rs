use narumincho_vdom::*;

use crate::{AppState, Location, fetch};

pub fn header(state: &AppState) -> Node<AppState> {
    let mut children = vec![header_main(state)];
    if state.current_key.is_some() && state.is_header_popover_open {
        children.push(popover(state));
    }
    Div::new().children(children).into_node()
}

fn header_main(state: &AppState) -> Node<AppState> {
    Header::new()
        .class("app-header")
        .style(
            Style::new()
                .set("display", "flex")
                .set("justify-content", "space-between")
                .set("align-items", "center")
                .set("padding", "1rem 2rem")
                .set("background", "rgba(11, 15, 25, 0.6)")
                .set("backdrop-filter", "var(--glass-blur)")
                .set("-webkit-backdrop-filter", "var(--glass-blur)")
                .set("left", "0")
                .set("right", "0")
                .set("width", "100%")
                .set("position", "fixed")
                .set("top", "0")
                .set("z-index", "10")
                .set("border-bottom", "1px solid var(--border)"),
        )
        .children([
            Div::new()
                .style(
                    Style::new()
                        .set("display", "flex")
                        .set("align-items", "center")
                        .set("gap", "0.75rem"),
                )
                .children([
                    A::<AppState, Location>::new()
                        .href(Href::Internal(Location::Home))
                        .style(
                            Style::new()
                                .set("text-decoration", "none")
                                .set("display", "inline-block"),
                        )
                        .children([
                            H1::new()
                                .style(
                                    Style::new()
                                        .set("font-size", "1.75rem")
                                        .set("font-weight", "700")
                                        .set("background", "var(--primary-gradient)")
                                        .set("-webkit-background-clip", "text")
                                        .set("-webkit-text-fill-color", "transparent")
                                        .set("letter-spacing", "-0.03em"),
                                )
                                .children([text("definy")])
                                .into_node(),
                        ])
                        .into_node(),
                    A::<AppState, Location>::new()
                        .href(Href::Internal(Location::PartList))
                        .style(
                            Style::new()
                                .set("font-size", "0.9rem")
                                .set("color", "var(--text-secondary)"),
                        )
                        .children([text("Parts")])
                        .into_node(),
                    A::<AppState, Location>::new()
                        .href(Href::Internal(Location::AccountList))
                        .style(
                            Style::new()
                                .set("font-size", "0.9rem")
                                .set("color", "var(--text-secondary)"),
                        )
                        .children([text("Accounts")])
                        .into_node(),
                ])
                .into_node(),
            Div::new()
                .style(
                    Style::new()
                        .set("flex-grow", "1")
                        .set("display", "flex")
                        .set("justify-content", "center"),
                )
                .children([
                    Div::new()
                        .style(
                            Style::new()
                                .set("font-size", "0.95rem")
                                .set("color", "var(--text-secondary)")
                                .set("max-width", "42vw")
                                .set("overflow", "hidden")
                                .set("text-overflow", "ellipsis")
                                .set("white-space", "nowrap"),
                        )
                        .children([text(crate::page_title::page_title_text(state))])
                        .into_node(),
                ])
                .into_node(),
            match &state.current_key {
                Some(secret_key) => {
                    let account_id = definy_event::event::AccountId(Box::new(
                        secret_key.verifying_key().to_bytes(),
                    ));
                    let account_name = state.account_name_map().get(&account_id).cloned();

                    Button::new()
                        .on_click(EventHandler::new(async |set_state| {
                            set_state(Box::new(|state: AppState| AppState {
                                is_header_popover_open: !state.is_header_popover_open,
                                ..state.clone()
                            }));
                        }))
                        .style(
                            Style::new()
                                .set("font-family", "'JetBrains Mono', monospace")
                                .set("font-size", "0.80rem")
                                .set("background", "rgba(255, 255, 255, 0.05)")
                                .set("color", "var(--text)")
                                .set("border", "1px solid var(--border)")
                                .set("padding", "0.5rem 1rem")
                                .set("max-width", "min(46vw, 420px)")
                                .set("overflow", "hidden")
                                .set("text-overflow", "ellipsis")
                                .set("white-space", "nowrap")
                                .set("anchor-name", "--header-popover-button"),
                        )
                        .children([text(&match account_name {
                            Some(name) => name.to_string(),
                            None => base64::Engine::encode(
                                &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                                secret_key.verifying_key().to_bytes(),
                            ),
                        })])
                        .into_node()
                }
                None => Button::new()
                    .command_for("login-or-create-account-dialog")
                    .command(CommandValue::ShowModal)
                    .children([text("Log In / Sign Up")])
                    .into_node(),
            },
        ])
        .into_node()
}

fn popover(state: &AppState) -> Node<AppState> {
    let profile_form = if state.current_key.is_some() {
        Some(
            Div::new()
                .style(Style::new().set("display", "grid").set("gap", "0.5rem"))
                .children([
                    Input::new()
                        .type_("text")
                        .name("profile-name")
                        .value(&state.profile_name_input)
                        .on_change(EventHandler::new(async |set_state| {
                            let value = web_sys::window()
                                .and_then(|window| window.document())
                                .and_then(|document| {
                                    document.query_selector("input[name='profile-name']").ok()
                                })
                                .flatten()
                                .and_then(|element| {
                                    wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(
                                        element,
                                    )
                                    .ok()
                                })
                                .map(|input| input.value())
                                .unwrap_or_default();
                            set_state(Box::new(move |state: AppState| AppState {
                                profile_name_input: value,
                                ..state.clone()
                            }));
                        }))
                        .into_node(),
                    Button::new()
                        .on_click(EventHandler::new(async |set_state| {
                            let set_state = std::rc::Rc::new(set_state);
                            let set_state_for_async = set_state.clone();
                            set_state(Box::new(move |state: AppState| {
                                let key = if let Some(key) = &state.current_key {
                                    key.clone()
                                } else {
                                    return state;
                                };
                                let new_name = state.profile_name_input.trim().to_string();
                                if new_name.is_empty() {
                                    return state;
                                }
                                wasm_bindgen_futures::spawn_local(async move {
                                    let event_binary = match definy_event::sign_and_serialize(
                                        definy_event::event::Event {
                                            account_id: definy_event::event::AccountId(Box::new(
                                                key.verifying_key().to_bytes(),
                                            )),
                                            time: chrono::Utc::now(),
                                            content:
                                                definy_event::event::EventContent::ChangeProfile(
                                                    definy_event::event::ChangeProfileEvent {
                                                        account_name: new_name.into(),
                                                    },
                                                ),
                                        },
                                        &key,
                                    ) {
                                        Ok(event_binary) => event_binary,
                                        Err(error) => {
                                            web_sys::console::log_1(
                                                &format!(
                                                    "Failed to serialize change profile event: {:?}",
                                                    error
                                                )
                                                .into(),
                                            );
                                            return;
                                        }
                                    };

                                    if fetch::post_event(event_binary.as_slice()).await.is_ok() {
                                        if let Ok(events) = fetch::get_events().await {
                                            set_state_for_async(Box::new(|state| AppState {
                                                events,
                                                profile_name_input: String::new(),
                                                is_header_popover_open: false,
                                                ..state.clone()
                                            }));
                                        }
                                    } else {
                                        web_sys::console::log_1(
                                            &"Failed to post change profile event".into(),
                                        );
                                    }
                                });
                                state
                            }));
                        }))
                        .children([text("Change Name")])
                        .into_node(),
                ])
                .into_node(),
        )
    } else {
        None
    };

    Div::new()
        .id("header-popover")
        .class("header-popover")
        .style(
            Style::new()
                .set("position", "fixed")
                .set("top", "4.25rem")
                .set("right", "1rem")
                .set("padding", "0.5rem")
                .set("border", "1px solid var(--border)")
                .set("background", "var(--surface)")
                .set("backdrop-filter", "var(--glass-blur)")
                .set("-webkit-backdrop-filter", "var(--glass-blur)")
                .set("display", "grid")
                .set("gap", "0.75rem")
                .set("border-radius", "var(--radius-md)")
                .set("z-index", "20")
                .set("min-width", "220px")
                .set("box-shadow", "var(--shadow-lg)"),
        )
        .children({
            let mut children = Vec::new();
            if let Some(profile_form) = profile_form {
                children.push(profile_form);
            }
            children.push(
                Button::new()
                    .on_click(EventHandler::new(async |set_state| {
                        set_state(Box::new(|state: AppState| -> AppState {
                            AppState {
                                current_key: None,
                                is_header_popover_open: false,
                                ..state.clone()
                            }
                        }));
                    }))
                    .children([text("Log Out")])
                    .style(
                        Style::new()
                            .set("width", "100%")
                            .set("background-color", "transparent")
                            .set("color", "#fca5a5")
                            .set("justify-content", "flex-start"),
                    )
                    .into_node(),
            );
            children
        })
        .into_node()
}
