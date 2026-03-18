use narumincho_vdom::*;

use crate::{
    LoginOrCreateAccountDialogState,
    app_state::{AppState, CreatingAccountState},
    fetch, i18n,
};

/// ログインまたはアカウント作成ダイアログ
pub fn login_or_create_account_dialog(state: &AppState) -> Node<AppState> {
    Dialog::new()
        .class("auth-dialog")
        .id("login-or-create-account-dialog")
        .children([
            Div::new()
                .style(
                    Style::new()
                        .set("display", "flex")
                        .set("justify-content", "space-between")
                        .set("align-items", "center")
                        .set("margin-bottom", "1.5rem"),
                )
                .children([
                    H2::new()
                        .style(Style::new().set("font-size", "1.25rem"))
                        .children([text(
                            match state.login_or_create_account_dialog_state.state {
                                CreatingAccountState::LogIn => {
                                    i18n::tr(state, "Log In", "ログイン", "Ensaluti")
                                }
                                CreatingAccountState::CreateAccount => {
                                    i18n::tr(state, "Sign Up", "サインアップ", "Registriĝi")
                                }
                                _ => i18n::tr(state, "Account", "アカウント", "Konto"),
                            },
                        )])
                        .into_node(),
                    Button::new()
                        .command(CommandValue::Close)
                        .command_for("login-or-create-account-dialog")
                        .type_("button")
                        .style(
                            Style::new()
                                .set("padding", "0.25rem")
                                .set("min-width", "2rem")
                                .set("width", "2rem")
                                .set("height", "2rem")
                                .set("border-radius", "50%")
                                .set("background-color", "transparent")
                                .set("border", "none")
                                .set("color", "var(--text-secondary)"),
                        )
                        .children([text("✕")])
                        .into_node(),
                ])
                .into_node(),
            Div::new()
                .class("auth-tabs")
                .style(
                    Style::new()
                        .set("display", "grid")
                        .set("grid-template-columns", "1fr 1fr")
                        .set("gap", "0.5rem")
                        .set("background", "rgba(0, 0, 0, 0.2)")
                        .set("padding", "0.3rem")
                        .set("border-radius", "var(--radius-md)")
                        .set("margin-bottom", "1.5rem"),
                )
                .children([
                    Button::new()
                        .type_("button")
                        .style(
                            Style::new()
                                .set(
                                    "background",
                                    if let CreatingAccountState::LogIn =
                                        state.login_or_create_account_dialog_state.state
                                    {
                                        "rgba(255, 255, 255, 0.05)"
                                    } else {
                                        "transparent"
                                    },
                                )
                                .set(
                                    "color",
                                    if let CreatingAccountState::LogIn =
                                        state.login_or_create_account_dialog_state.state
                                    {
                                        "var(--text)"
                                    } else {
                                        "var(--text-secondary)"
                                    },
                                )
                                .set("border", "none")
                                .set(
                                    "box-shadow",
                                    if let CreatingAccountState::LogIn =
                                        state.login_or_create_account_dialog_state.state
                                    {
                                        "0 2px 5px rgba(0, 0, 0, 0.2)"
                                    } else {
                                        "none"
                                    },
                                ),
                        )
                        .on_click(create_login_event_handler())
                        .children([text(i18n::tr(state, "Log In", "ログイン", "Ensaluti"))])
                        .into_node(),
                    Button::new()
                        .type_("button")
                        .style(
                            Style::new()
                                .set(
                                    "background",
                                    if let CreatingAccountState::CreateAccount =
                                        state.login_or_create_account_dialog_state.state
                                    {
                                        "rgba(255, 255, 255, 0.05)"
                                    } else {
                                        "transparent"
                                    },
                                )
                                .set(
                                    "color",
                                    if let CreatingAccountState::CreateAccount =
                                        state.login_or_create_account_dialog_state.state
                                    {
                                        "var(--text)"
                                    } else {
                                        "var(--text-secondary)"
                                    },
                                )
                                .set("border", "none")
                                .set(
                                    "box-shadow",
                                    if let CreatingAccountState::CreateAccount =
                                        state.login_or_create_account_dialog_state.state
                                    {
                                        "0 2px 5px rgba(0, 0, 0, 0.2)"
                                    } else {
                                        "none"
                                    },
                                ),
                        )
                        .on_click(EventHandler::new(async |set_state| {
                            set_state(Box::new(|state: AppState| -> AppState {
                                AppState {
                                    login_or_create_account_dialog_state:
                                        LoginOrCreateAccountDialogState {
                                            generated_key: Some(generate_key()),
                                            state: CreatingAccountState::CreateAccount,
                                            username: String::new(),
                                            current_password: String::new(),
                                            create_account_result_message: None,
                                        },
                                    ..state.clone()
                                }
                            }));
                        }))
                        .children([text(i18n::tr(
                            state,
                            "Sign Up",
                            "サインアップ",
                            "Registriĝi",
                        ))])
                        .into_node(),
                ])
                .into_node(),
            match state.login_or_create_account_dialog_state.state {
                CreatingAccountState::LogIn => login_view(state),
                CreatingAccountState::CreateAccount => {
                    create_account_view(state, state.force_offline)
                }
                _ => Div::new().children([]).into_node(),
            },
        ])
        .into_node()
}

fn login_view(state: &AppState) -> Node<AppState> {
    Form::new()
        .on_submit(EventHandler::new(async |set_state| {
            let password = wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(
                web_sys::window()
                    .unwrap()
                    .document()
                    .unwrap()
                    .query_selector("input[name='password']")
                    .unwrap()
                    .unwrap(),
            )
            .unwrap()
            .value();

            if let Some(signing_key) = crate::navigator_credential::parse_password(password) {
                dialog_close();

                set_state(Box::new(|state: AppState| -> AppState {
                    AppState {
                        current_key: Some(signing_key),
                        ..state.clone()
                    }
                }));
            }
        }))
        .style(Style::new().set("display", "grid").set("gap", "1.5rem"))
        .children([
            Div::new()
                .class("form-group")
                .children([
                    Label::new()
                        .children([text(i18n::tr(
                            state,
                            "Secret Key",
                            "秘密鍵",
                            "Sekreta ŝlosilo",
                        ))])
                        .into_node(),
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
                .style(Style::new().set("width", "100%"))
                .children([text(i18n::tr(state, "Log In", "ログイン", "Ensaluti"))])
                .into_node(),
        ])
        .into_node()
}

fn generate_key() -> ed25519_dalek::SigningKey {
    let mut csprng = rand::rngs::OsRng;
    ed25519_dalek::SigningKey::generate(&mut csprng)
}

fn create_account_view(state: &AppState, force_offline: bool) -> Node<AppState> {
    let dialog_state = &state.login_or_create_account_dialog_state;
    let lang_code = state.language.code;
    let mut password_input = Input::new()
        .type_("password")
        .name("password")
        .autocomplete("new-password")
        .required()
        .readonly();

    if let Some(key) = &dialog_state.generated_key {
        password_input = password_input.value(&base64::Engine::encode(
            &base64::engine::general_purpose::URL_SAFE_NO_PAD,
            key.to_bytes(),
        ));
    }

    let requesting = dialog_state.state == CreatingAccountState::CreateAccountRequesting
        || dialog_state.state == CreatingAccountState::Success;

    let generated_key_for_submit = dialog_state.generated_key.clone();
    let generated_key_for_copy = dialog_state.generated_key.clone();

    Form::new()
        .on_submit(EventHandler::new(move |set_state| {
            let set_state = std::rc::Rc::new(set_state);
            let set_state_for_async = set_state.clone();
            let generated_key = generated_key_for_submit.clone();
            async move {
                let username = wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(
                    web_sys::window()
                        .unwrap()
                        .document()
                        .unwrap()
                        .query_selector("input[name='username']")
                        .unwrap()
                        .unwrap(),
                )
                .unwrap()
                .value();

                if let Some(key) = &generated_key {
                    let key = key.clone();

                    wasm_bindgen_futures::spawn_local(async move {
                        let event_binary = definy_event::sign_and_serialize(
                            definy_event::event::Event {
                                account_id: definy_event::event::AccountId(key.verifying_key()),
                                time: chrono::Utc::now(),
                                content: definy_event::event::EventContent::CreateAccount(
                                    definy_event::event::CreateAccountEvent {
                                        account_name: username.into(),
                                    },
                                ),
                            },
                            &key,
                        )
                        .unwrap();
                        let result =
                            fetch::post_event_with_queue(event_binary.as_slice(), force_offline)
                                .await;
                        if let Ok(record) = result {
                            let status = record.status.clone();
                            let status_for_state = status.clone();
                            let message = match status {
                                crate::local_event::LocalEventStatus::Sent => i18n::tr_lang(
                                    lang_code,
                                    "Account created",
                                    "アカウントを作成しました",
                                    "Konto kreita",
                                )
                                .to_string(),
                                crate::local_event::LocalEventStatus::Queued => i18n::tr_lang(
                                    lang_code,
                                    "Queued: network unavailable",
                                    "キュー済み: ネットワーク未接続",
                                    "En vico: reto nedisponebla",
                                )
                                .to_string(),
                                crate::local_event::LocalEventStatus::Failed => {
                                    record.last_error.clone().unwrap_or_else(|| {
                                        i18n::tr_lang(
                                            lang_code,
                                            "Failed to send",
                                            "送信に失敗しました",
                                            "Sendado malsukcesis",
                                        )
                                        .to_string()
                                    })
                                }
                            };
                            set_state_for_async(Box::new(move |state: AppState| {
                                let mut next = state.clone();
                                crate::app_state::upsert_local_event_record(&mut next, record);
                                next.login_or_create_account_dialog_state.state =
                                    match status_for_state {
                                        crate::local_event::LocalEventStatus::Sent => {
                                            CreatingAccountState::Success
                                        }
                                        crate::local_event::LocalEventStatus::Queued => {
                                            CreatingAccountState::Error
                                        }
                                        crate::local_event::LocalEventStatus::Failed => {
                                            CreatingAccountState::Error
                                        }
                                    };
                                next.login_or_create_account_dialog_state
                                    .create_account_result_message = Some(message);
                                next
                            }));
                            if status == crate::local_event::LocalEventStatus::Sent {
                                dialog_close();
                            }
                        }
                    });
                }

                set_state(Box::new(|state: AppState| -> AppState {
                    AppState {
                        login_or_create_account_dialog_state: LoginOrCreateAccountDialogState {
                            state: CreatingAccountState::CreateAccountRequesting,
                            create_account_result_message: None,
                            ..state.login_or_create_account_dialog_state.clone()
                        },
                        ..state.clone()
                    }
                }));
            }
        }))
        .style(Style::new().set("display", "grid").set("gap", "1.5rem"))
        .children([
            Div::new()
                .class("form-group")
                .children([
                    Label::new()
                        .children([text(i18n::tr(state, "Username", "ユーザー名", "Uzantnomo"))])
                        .into_node(),
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
                    Label::new()
                        .children([text(i18n::tr(
                            state,
                            "User ID (Public Key)",
                            "ユーザーID (公開鍵)",
                            "Uzanto-ID (publika ŝlosilo)",
                        ))])
                        .into_node(),
                    Div::new()
                        .style(
                            Style::new()
                                .set("font-family", "monospace")
                                .set("font-size", "0.80rem")
                                .set("background-color", "var(--background)")
                                .set("padding", "0.5rem")
                                .set("border-radius", "var(--radius-sm)")
                                .set("border", "1px solid var(--border)")
                                .set("word-break", "break-all"),
                        )
                        .children(match &dialog_state.generated_key {
                            Some(key) => vec![text(base64::Engine::encode(
                                &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                                key.verifying_key().to_bytes(),
                            ))],
                            None => vec![],
                        })
                        .into_node(),
                ])
                .into_node(),
            Div::new()
                .class("form-group")
                .children([
                    Label::new()
                        .children([text(i18n::tr(
                            state,
                            "Secret Key",
                            "秘密鍵",
                            "Sekreta ŝlosilo",
                        ))])
                        .into_node(),
                    Div::new()
                        .class("hint")
                        .style(Style::new().set("margin-bottom", "0.5rem"))
                        .children([text(i18n::tr(
                            state,
                            "If you lose your secret key, you will not be able to log in again.",
                            "秘密鍵を失うと再ログインできません。",
                            "Se vi perdas la sekretan ŝlosilon, vi ne povos denove ensaluti.",
                        ))])
                        .into_node(),
                    Div::new()
                        .style(Style::new().set("display", "flex").set("gap", "0.5rem"))
                        .children([
                            password_input
                                .style(Style::new().set("flex", "1"))
                                .into_node(),
                            Button::new()
                                .on_click(EventHandler::new(move |_set_state| {
                                    let window =
                                        web_sys::window().expect("no global `window` exists");
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
                                .children([text(i18n::tr(state, "Copy", "コピー", "Kopii"))])
                                .into_node(),
                            Button::new()
                                .on_click(EventHandler::new(async |set_state| {
                                    set_state(Box::new(|state: AppState| -> AppState {
                                        AppState {
                                            login_or_create_account_dialog_state:
                                                LoginOrCreateAccountDialogState {
                                                    generated_key: Some(generate_key()),
                                                    ..state
                                                        .login_or_create_account_dialog_state
                                                        .clone()
                                                },
                                            ..state.clone()
                                        }
                                    }));
                                }))
                                .type_("button")
                                .disabled(requesting)
                                .children([text(i18n::tr(state, "Regen", "再生成", "Regeneri"))])
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
                        .children([text(i18n::tr(state, "Cancel", "キャンセル", "Nuligi"))])
                        .into_node(),
                    Button::new()
                        .type_("submit")
                        .disabled(requesting)
                        .children([text(match dialog_state.state {
                            CreatingAccountState::LogIn => {
                                i18n::tr(state, "Log In", "ログイン", "Ensaluti")
                            }
                            CreatingAccountState::CreateAccount => {
                                i18n::tr(state, "Sign Up", "サインアップ", "Registriĝi")
                            }
                            CreatingAccountState::CreateAccountRequesting => i18n::tr(
                                state,
                                "Signing Up...",
                                "サインアップ中...",
                                "Registriĝante...",
                            ),
                            CreatingAccountState::Success => {
                                i18n::tr(state, "Success", "成功", "Sukceso")
                            }
                            CreatingAccountState::Error => {
                                i18n::tr(state, "Error", "エラー", "Eraro")
                            }
                        })])
                        .into_node(),
                ])
                .into_node(),
            match &dialog_state.create_account_result_message {
                Some(message) => Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "0.82rem")
                            .set("color", "var(--text-secondary)"),
                    )
                    .children([text(message)])
                    .into_node(),
                None => Div::new().children([]).into_node(),
            },
        ])
        .into_node()
}

fn create_login_event_handler() -> EventHandler<AppState> {
    EventHandler::new(async |set_state| {
        set_state(Box::new(|state: AppState| -> AppState {
            AppState {
                login_or_create_account_dialog_state: LoginOrCreateAccountDialogState {
                    generated_key: None,
                    state: CreatingAccountState::LogIn,
                    username: String::new(),
                    current_password: String::new(),
                    create_account_result_message: None,
                },
                ..state.clone()
            }
        }));
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
