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
                .background_color("#222222")
                .set("padding", "0.5rem"),
        )
        .children([
            H1::new().children([text("definy")]).into_node(),
            Div::new()
                .style(Style::new().set("flex-grow", "1"))
                .into_node(),
            match &state.current_key {
                Some(secret_key) => Button::new()
                    .command(CommandValue::TogglePopover)
                    .command_for("header-popover")
                    .style(
                        Style::new()
                            .set("font-family", "monospace")
                            .set("font-size", "0.9rem")
                            .set("anchor-name", "--header-popover-button"),
                    )
                    .children([text(&base64::Engine::encode(
                        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                        secret_key.verifying_key().to_bytes(),
                    ))])
                    .into_node(),
                None => Button::new()
                    .command_for("login-or-create-account-dialog")
                    .command(CommandValue::ShowModal)
                    .children([text("ログインまたはアカウント作成")])
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
                .set("padding", "1rem"),
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
            .children([text("ログアウト")])
            .into_node()])
        .into_node()
}
