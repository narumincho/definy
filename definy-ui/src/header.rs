use narumincho_vdom::*;

use crate::AppState;

pub fn header(state: &AppState) -> Node<AppState> {
    Header::new()
        .style("display: flex; background-color: #222222; padding: 0.5rem;")
        .children([
            H1::new().children([text("definy")]).into_node(),
            Div::new().style("flex-grow: 1;").into_node(),
            match &state.current_key {
                Some(secret_key) => Div::new()
                    .style("font-family: monospace; font-size: 0.9rem;")
                    .children([text(&base64::Engine::encode(
                        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                        secret_key.verifying_key().to_bytes(),
                    ))])
                    .into_node(),
                None => Button::new()
                    .command_for("login-or-create-account-dialog")
                    .command("show-modal")
                    .children([text("ログインまたはアカウント作成")])
                    .into_node(),
            },
        ])
        .into_node()
}
