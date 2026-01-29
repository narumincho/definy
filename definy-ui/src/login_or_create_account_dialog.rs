use narumincho_vdom::*;
use wasm_bindgen::{JsValue, prelude::wasm_bindgen};

use crate::{
    LoginOrCreateAccountDialogState,
    app_state::{AppState, CreatingAccountState},
};

/// ログインまたはアカウント作成ダイアログ
pub fn login_or_create_account_dialog(state: &AppState) -> Node<AppState> {
    Dialog::new()
        .id("login-or-create-account-dialog")
        .children({
            let mut children = vec![
                Button::new()
                    .type_("button")
                    .style("font-size: 1.5rem;")
                    .on_click(EventHandler::new(|set_state| {
                        set_state(Box::new(|state: AppState| -> AppState {
                            AppState {
                                login_or_create_account_dialog_state:
                                    LoginOrCreateAccountDialogState {
                                        generated_key: None,
                                        state: CreatingAccountState::LogIn,
                                        username: String::new(),
                                        current_password: String::new(),
                                    },
                                ..state.clone()
                            }
                        }));
                    }))
                    .children([text("ログイン")])
                    .into_node(),
                Button::new()
                    .type_("button")
                    .style("font-size: 1.5rem;")
                    .on_click(EventHandler::new(|set_state| {
                        set_state(Box::new(|state: AppState| -> AppState {
                            AppState {
                                login_or_create_account_dialog_state:
                                    LoginOrCreateAccountDialogState {
                                        generated_key: None,
                                        state: CreatingAccountState::CreateAccount,
                                        username: String::new(),
                                        current_password: String::new(),
                                    },
                                ..state.clone()
                            }
                        }));
                    }))
                    .children([text("アカウント作成")])
                    .into_node(),
            ];
            match state.login_or_create_account_dialog_state.state {
                CreatingAccountState::LogIn => {
                    children.push(login_view());
                }
                CreatingAccountState::CreateAccount => {
                    children.push(create_account_view(
                        &state.login_or_create_account_dialog_state,
                    ));
                }
                _ => {}
            }
            children
        })
        .into_node()
}

fn login_view() -> Node<AppState> {
    Form::new()
        .on_submit(EventHandler::new(|set_state| {}))
        .children([
            Input::new()
                .type_("text")
                .name("username")
                .autocomplete("username")
                .required()
                .on_change(EventHandler::new(|set_state| {}))
                .into_node(),
            Input::new()
                .type_("password")
                .name("password")
                .autocomplete("current-password")
                .required()
                .into_node(),
            Button::new()
                .type_("submit")
                .children([text("ログイン")])
                .into_node(),
        ])
        .into_node()
}

fn generate_key() -> ed25519_dalek::SigningKey {
    let mut csprng = rand::rngs::OsRng;
    ed25519_dalek::SigningKey::generate(&mut csprng)
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = "navigator.credentials")]
    fn get(s: &JsValue);
}

fn create_account_view(state: &LoginOrCreateAccountDialogState) -> Node<AppState> {
    let mut password_input = Input::new()
        .type_("password")
        .name("password")
        .autocomplete("new-password")
        .required()
        .readonly();

    if let Some(key) = &state.generated_key {
        password_input = password_input.value(&base64::Engine::encode(
            &base64::engine::general_purpose::URL_SAFE_NO_PAD,
            key.to_bytes(),
        ));
    }

    let requesting = state.state == CreatingAccountState::CreateAccountRequesting
        || state.state == CreatingAccountState::Success;

    let generated_key = state.generated_key.clone();

    Form::new()
    .on_submit(EventHandler::new(|set_state| {}))
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
                    .on_change(EventHandler::new(|set_state| {}))
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
                        match &state.generated_key {
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
                            .on_click(EventHandler::new(move |set_state| {
                                let window = web_sys::window().expect("no global `window` exists");
                                if let Some(key) = &generated_key {
                                    let _ = window
                                        .navigator()
                                        .clipboard()
                                        .write_text(&base64::Engine::encode(
                                            &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                                            key.to_scalar_bytes(),
                                        ));
                                };
                            }))
                            .type_("button")
                            .children([text("コピー")])
                            .into_node(),
                        Button::new()
                            .on_click(EventHandler::new(|set_state| {
                                set_state(Box::new(|state: AppState| -> AppState {
                                    AppState {
                                        login_or_create_account_dialog_state: LoginOrCreateAccountDialogState {
                                            generated_key: Some(generate_key()),
                                            ..state.login_or_create_account_dialog_state.clone()
                                        },
                                        ..state.clone()
                                    }
                                }));
                            }))
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
                    .on_click(EventHandler::new(|set_state| {}))
                    .children([text("キャンセル")])
                    .into_node(),
                Button::new()
                    .type_("submit") 
                    .disabled(requesting)
                    .children([text(match state.state {
                        CreatingAccountState::Init => "_",
                        CreatingAccountState::LogIn => "ログイン",
                        CreatingAccountState::CreateAccount => "登録",
                        CreatingAccountState::CreateAccountRequesting => "登録中...",
                        CreatingAccountState::Success => "登録成功",
                        CreatingAccountState::Error => "登録失敗",
                    })])
                    .into_node(),
            ])
            .into_node(),
    ])
    .into_node()
}
