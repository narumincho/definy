use narumincho_vdom::*;

use crate::AppState;

pub fn header(state: &AppState) -> Node<AppState> {
    Div::new()
        .children([header_main(state), popover()])
        .into_node()
}

fn header_main(state: &AppState) -> Node<AppState> {
    Header::new()
        .style(
            Style::new()
                .set("display", "flex")
                .set("justify-content", "space-between")
                .set("align-items", "center")
                .set("padding", "0.75rem 1.5rem")
                .set("background-color", "rgba(24, 24, 27, 0.8)") /* var(--background) with opacity */
                .set("backdrop-filter", "blur(8px)")
                .set("position", "sticky")
                .set("top", "0")
                .set("z-index", "10")
                .set("border-bottom", "1px solid var(--border)"),
        )
        .children([
            H1::new()
                .style(Style::new().set("font-size", "1.25rem"))
                .children([text("definy")])
                .into_node(),
            Div::new().style(Style::new().set("flex-grow", "1")).into_node(),
            match &state.current_key {
                Some(secret_key) => {
                    let account_id = definy_event::event::AccountId(Box::new(
                        secret_key.verifying_key().to_bytes(),
                    ));
                    let account_name = state
                        .created_account_events
                        .iter()
                        .filter_map(|(_, result)| result.as_ref().ok())
                        .find(|(_, event)| event.account_id == account_id)
                        .and_then(|(_, event)| {
                            if let definy_event::event::EventContent::CreateAccount(content) =
                                &event.content
                            {
                                Some(content.account_name.clone())
                            } else {
                                None
                            }
                        });

                    Button::new()
                        .command(CommandValue::TogglePopover)
                        .command_for("header-popover")
                        .style(
                            Style::new()
                                .set("font-family", "monospace")
                                .set("font-size", "0.80rem")
                                .set("background-color", "var(--surface)")
                                .set("color", "var(--text)")
                                .set("border", "1px solid var(--border)")
                                .set("padding", "0.4rem 0.8rem")
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

fn popover() -> Node<AppState> {
    Div::new()
        .id("header-popover")
        .popover()
        .style(
            Style::new()
                .set("position-area", "block-end")
                .set("margin-top", "0.5rem")
                .set("padding", "0.5rem")
                .set("border", "1px solid var(--border)")
                .set("background-color", "var(--surface)")
                .set("border-radius", "var(--radius-sm)")
                .set("box-shadow", "var(--shadow-md)"),
        )
        .children([Button::new()
            .on_click(EventHandler::new(async |set_state| {
                let popover = wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlElement>(
                    web_sys::window()
                        .unwrap()
                        .document()
                        .unwrap()
                        .get_element_by_id("header-popover")
                        .unwrap(),
                )
                .unwrap();

                let _ = popover.hide_popover();

                set_state(Box::new(|state: AppState| -> AppState {
                    AppState {
                        current_key: None,
                        ..state.clone()
                    }
                }));
            }))
            .children([text("Log Out")])
            .style(
                Style::new()
                    .set("width", "100%")
                    .set("background-color", "transparent")
                    .set("color", "var(--error)")
                    .set("justify-content", "flex-start"),
            )
            .into_node()])
        .into_node()
}
