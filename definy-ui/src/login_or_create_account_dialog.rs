use narumincho_vdom::*;

use crate::{
    LoginOrCreateAccountDialogState,
    app_state::{AppState, CreatingAccountState}, fetch,
};

/// ログインまたはアカウント作成ダイアログ
pub fn login_or_create_account_dialog(state: &AppState) -> Node<AppState> {
    Dialog::new()
        .id("login-or-create-account-dialog")
        .children([
            Div::new()
                .style("display: flex; justify-content: end;")
                .children([Button::new()
                    .command(CommandValue::Close)
                    .command_for("login-or-create-account-dialog")
                    .children([text("X")])
                    .into_node()])
                .into_node(),
            Div::new()
                .style("display: flex; justify-content: space-between;")
                .children([
                    Button::new()
                        .type_("button")
                        .style("font-size: 1.5rem;")
                        .on_click(create_login_event_handler())
                        .children([text("ログイン")])
                        .into_node(),
                    Button::new()
                        .type_("button")
                        .style("font-size: 1.5rem;")
                        .on_click(EventHandler::new(async |set_state| {
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
                ])
                .into_node(),
            match state.login_or_create_account_dialog_state.state {
                CreatingAccountState::LogIn => login_view(),
                CreatingAccountState::CreateAccount => {
                    create_account_view(&state.login_or_create_account_dialog_state)
                }
                _ => Div::new().children([]).into_node(),
            },
        ])
        .into_node()
}

fn login_view() -> Node<AppState> {
    Form::new()
        .on_submit(EventHandler::new(async |set_state| {
            let password = wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(web_sys::window()
                .unwrap()
                .document()
                .unwrap()
                .query_selector("input[name='password']")
                .unwrap()
                .unwrap()).unwrap()
                .value();

            match crate::navigator_credential::parse_password(password) {
                Some(signing_key) => {
                    dialog_close();

                    set_state(Box::new(|state: AppState| -> AppState {
                        AppState {
                            current_key: Some(signing_key),
                            ..state.clone()
                        }
                    }));
                },
                None => {}
            }
        }))
        .style("display: grid; gap: 1rem;")
        .children([
            // Label::new()
            //     .children([
            //         text("ユーザー名"),
            //         text("パスワードマネージャーを機能させるためのダミーのユーザー名入力欄です"),
            //         Input::new()
            //             .type_("text")
            //             .name("username")
            //             .autocomplete("username")
            //             .into_node(),
            //     ])
            //     .into_node(),
            Label::new()
                .children([
                    text("秘密鍵"),
                    Input::new()
                        .type_("password")
                        .name("password")
                        .autocomplete("current-password")
                        .required()
                    .into_node(),
                ])
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

        let generated_key_for_submit = state.generated_key.clone();
        let generated_key_for_copy = state.generated_key.clone();

    Form::new()
    .on_submit(EventHandler::new(move |set_state| {
        let generated_key = generated_key_for_submit.clone();
        async move {
            let username = wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(
                web_sys::window()
                    .unwrap()
                    .document()
                    .unwrap()
                    .query_selector("input[name='username']")
                    .unwrap().unwrap(),
            )
            .unwrap().value();

            if let Some(key) = &generated_key {
                let key = key.clone();

                wasm_bindgen_futures::spawn_local(async move {
                    let event_binary = definy_event::sign_and_serialize(
                        definy_event::event::Event {

                        account_id: definy_event::event::AccountId(Box::new(
                            key.verifying_key().to_bytes(),
                            )), time: chrono::Utc::now(),
                            content: definy_event::event::EventContent::CreateAccount(definy_event::event::CreateAccountEvent {
                                account_name: username.into(),
                               
                            }),
                        },
                        
                        &key,
                    )
                    .unwrap();
                let status = fetch::post_event(
                    event_binary.as_slice(),
                ).await;

                if status.is_ok() {
                    dialog_close();
                }
            });
        }

        set_state(Box::new(|state: AppState| -> AppState {
            AppState {
                login_or_create_account_dialog_state: LoginOrCreateAccountDialogState {
                    state: CreatingAccountState::CreateAccountRequesting,
                    ..state.login_or_create_account_dialog_state.clone()
                },
                ..state.clone()
            }
        }));
    }
    }))
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
                    .on_change(EventHandler::new(async |_set_state| {}))
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
                            .on_click(EventHandler::new(move |_set_state| {
                                let window = web_sys::window().expect("no global `window` exists");
                                let generated_key = generated_key_for_copy.clone();
                                async move {
                                if let Some(key) = generated_key.clone() {
                                    let _ = window
                                        .navigator()
                                        .clipboard()
                                        .write_text(&base64::Engine::encode(
                                            &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                                            key.to_scalar_bytes(),
                                        ));
                                    };
                                }
                            }))
                            .type_("button")
                            .children([text("コピー")])
                            .into_node(),
                        Button::new()
                            .on_click(EventHandler::new(async |set_state| {
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
                    .command(CommandValue::Close) 
                    .type_("button")
                    .on_click(EventHandler::new(async |_set_state| {}))
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

fn create_login_event_handler() -> EventHandler<AppState> {
    EventHandler::new(async |set_state| {
        let password = crate::navigator_credential::credential_get().await;
        match password {
            Some(secret_key) => {
                dialog_close();

                set_state(Box::new(|state: AppState| -> AppState  {
                    AppState {
                        current_key: Some(secret_key),
                        ..state.clone()
                    }
                }));
            },
            None => {
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
            }
        };
    })
}

fn dialog_close() {
    let popover = wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlDialogElement>(
        web_sys::window()
            .unwrap()
            .document()
            .unwrap()
            .get_element_by_id("login-or-create-account-dialog")
            .unwrap(),
    )
    .unwrap();

    popover.close();
}