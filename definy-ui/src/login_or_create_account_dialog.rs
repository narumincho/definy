
use narumincho_vdom::*;

use crate::message::Message;
use crate::app_state::{AppState, CreatingAccountState};

/// ログインまたはアカウント作成ダイアログ
pub fn login_or_create_account_dialog(
    state: &AppState,
) -> Node {
    let mut password_input = Input::new()
        .type_("password")
        .name("password")
        .autocomplete("new-password")
        .required()
        .readonly();

    if let Some(key) = &state.login_or_create_account_dialog_state.generated_key {
        password_input = password_input.value(
            &base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, key.to_bytes())
        );
    }

    let requesting = state.login_or_create_account_dialog_state.creating_account == CreatingAccountState::Requesting
                                     || state.login_or_create_account_dialog_state.creating_account == CreatingAccountState::Success;

    Dialog::new()
        .id("login-or-create-account-dialog")
        .children([
            H1::new()
                .children([text("ログイン")])
                .style("margin-top: 0; font-size: 1.5rem;")
                .into_node(),
            Form::new().on_submit(&|| {}).children([
            Input::new()
                .type_("password")
                .name("password")
                .autocomplete("current-password")
                .required()
                .into_node(),
            Button::new()
                .type_("submit") 
                .disabled(requesting)
                .children([text("ログイン")])
                .into_node(),
            ]).into_node(),
            H1::new()
                .children([text("アカウント作成")])
                .style("margin-top: 0; font-size: 1.5rem;")
                .into_node(),
            Form::new()
                .on_submit(&|| {}) 
                .children([
                    Label::new()
                        .class("form-group")
                        .children([
                            text("ユーザー名"),
                            Input::new()
                                .type_("text")
                                .name("username")
                                .autocomplete("username")
                                .required()
                                .value(&state.login_or_create_account_dialog_state.username)
                                .on_change(&|| {})
                                .into_node(),
                        ])
                        .into_node(),
                    Div::new()
                        .class("form-group")
                        .children([
                            text("ユーザーID (公開鍵)"),
                           Div::new()
                                .style("font-family: monospace; font-size: 0.9rem;")
                                .children(
                                    match &state.login_or_create_account_dialog_state.generated_key {
                                        Some(key) => vec![text(&base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, key.verifying_key().to_bytes()))],
                                        None => vec![],
                                    })
                                .into_node(),
                        ])
                        .into_node(),
                    Label::new()
                        .class("form-group")
                        .children([
                            text("秘密鍵"),
                            Div::new()
                                .class("hint")
                                .children([
                                    text("分散システムのため秘密鍵を失うとログインすることができなくなってしまいます"),
                                ])
                                .into_node(),
                            Div::new()
                                .style("display: flex; gap: 0.5rem;")
                                .children([
                                    password_input
                                        .style("flex: 1;")
                                        .into_node(),
                                    Button::new()
                                        .on_click(&|| {})
                                        .type_("button")
                                        .children([text("コピー")])
                                        .into_node(),
                                    Button::new()
                                        .on_click(&|| {})
                                        .type_("button")
                                        .disabled(requesting)
                                        .children([text("再生成")])
                                        .into_node(),
                                ])
                                .into_node(),
                        ])
                        .into_node(),
                    Div::new()
                        .class("dialog-buttons")
                        .children([
                            Button::new()
                                .command_for("login-or-create-account-dialog")
                                .command("close") 
                                .type_("button")
                                .on_click(&|| {})
                                .children([text("キャンセル")])
                                .into_node(),
                            Button::new()
                                .type_("submit") 
                                .disabled(requesting)
                                .children([text(match state.login_or_create_account_dialog_state.creating_account {
                                    CreatingAccountState::NotStarted => "登録",
                                    CreatingAccountState::Requesting => "登録中...",
                                    CreatingAccountState::Success => "登録成功",
                                    CreatingAccountState::Error => "登録失敗",
                                })])
                                .into_node(),
                        ])
                        .into_node(),
                ])
                .into_node(),
        ])
        .into_node()
}
