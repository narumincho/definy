use narumincho_vdom::*;

use crate::AppState;

pub fn header(state: &AppState) -> Node<AppState> {
    Div::new()
        .children([header_main(state), popover()])
        .into_node()
}

fn header_main(state: &AppState) -> Node<AppState> {
    Header::new()
        .style("display: flex; background-color: #222222; padding: 0.5rem;")
        .children([
            H1::new().children([text("definy")]).into_node(),
            Div::new().style("flex-grow: 1;").into_node(),
            match &state.current_key {
                Some(secret_key) => Button::new()
                    .command(CommandValue::TogglePopover)
                    .command_for("header-popover")
                    .style("font-family: monospace; font-size: 0.9rem; anchor-name: --header-popover-button")
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
        .style("position-anchor: --header-popover-button")
        .children([Button::new()
            .on_click(EventHandler::new(async |set_state| {
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
