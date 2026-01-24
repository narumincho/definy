
use narumincho_vdom::*;

use crate::message::Message;
use crate::app_state::AppState;

/// アカウント作成ダイアログ
pub fn create_account_dialog(
    state: &AppState,
    key: &Option<ed25519_dalek::SigningKey>,
) -> Node<Message> {
    let mut password_input = Input::new()
        .type_("password")
        .name("password")
        .autocomplete("new-password")
        .required()
        .readonly();

    if let Some(key) = key {
        password_input = password_input.attribute("value", 
        &"*".repeat(
            base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, key.to_bytes()).len()
        ));
    }

    let mut user_id_input = Input::new()
        .type_("text")
        .name("userId")
        .readonly()
        .disabled(state.creating_account)
        .attribute("style", "font-family: monospace; font-size: 0.9rem;");

    if let Some(key) = key {
        user_id_input = user_id_input.attribute("value", 
            &base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, key.verifying_key().to_bytes())
        );
    }

    Dialog::new()
        .id("create-account-dialog")
        .children([
            H1::new()
                .children([text("アカウント作成")])
                .attribute("style", "margin-top: 0; font-size: 1.5rem;")
                .into_node(),
            Form::new()
                .on_submit(Message::SubmitCreateAccountForm) 
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
                                .attribute("value", &state.username)
                                .on_change(Message::UpdateUsername(String::new()))
                                .into_node(),
                        ])
                        .into_node(),
                    Label::new()
                        .class("form-group")
                        .children([
                            text("ユーザーID (公開鍵)"),
                            user_id_input.into_node(),
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
                                .attribute("style", "display: flex; gap: 0.5rem;")
                                .children([
                                    password_input
                                        .attribute("style", "flex: 1;")
                                        .into_node(),
                                    Button::new()
                                        .on_click(Message::CopyPrivateKey)
                                        .type_("button")
                                        .children([text("コピー")])
                                        .into_node(),
                                    Button::new()
                                        .on_click(Message::RegenerateKey)
                                        .type_("button")
                                        .disabled(state.creating_account)
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
                                .command_for("create-account-dialog")
                                .command("close") 
                                .type_("button")
                                .on_click(Message::CloseCreateAccountDialog)
                                .children([text("キャンセル")])
                                .into_node(),
                            Button::new()
                                .type_("submit") 
                                .disabled(state.creating_account)
                                .children([text(if state.creating_account { "登録中..." } else { "登録" })])
                                .into_node(),
                        ])
                        .into_node(),
                ])
                .into_node(),
        ])
        .into_node()
}
