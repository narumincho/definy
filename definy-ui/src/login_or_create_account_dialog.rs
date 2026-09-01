use dioxus::prelude::*;
use wasm_bindgen::JsCast;

use crate::{
    LoginOrCreateAccountDialogState, PageContext,
    app_state::{AppState, CreatingAccountState},
    fetch,
};

#[component]
pub fn LoginOrCreateAccountDialog(state: AppState, context: PageContext) -> Element {
    let dialog_title = match state.login_or_create_account_dialog_state.state {
        CreatingAccountState::LogIn => context.language.label("Log In", "ログイン", "Ensaluti"),
        CreatingAccountState::CreateAccount => {
            context
                .language
                .label("Sign Up", "サインアップ", "Registriĝi")
        }
        _ => context.language.label("Account", "アカウント", "Konto"),
    };

    let is_login = matches!(
        state.login_or_create_account_dialog_state.state,
        CreatingAccountState::LogIn
    );
    let is_signup = matches!(
        state.login_or_create_account_dialog_state.state,
        CreatingAccountState::CreateAccount
    );

    let login_bg = if is_login {
        "rgb(255 255 255 / 0.05)"
    } else {
        "transparent"
    };
    let login_color = if is_login {
        "var(--text)"
    } else {
        "var(--text-secondary)"
    };
    let login_shadow = if is_login {
        "0 2px 5px rgb(0 0 0 / 0.2)"
    } else {
        "none"
    };

    let signup_bg = if is_signup {
        "rgb(255 255 255 / 0.05)"
    } else {
        "transparent"
    };
    let signup_color = if is_signup {
        "var(--text)"
    } else {
        "var(--text-secondary)"
    };
    let signup_shadow = if is_signup {
        "0 2px 5px rgb(0 0 0 / 0.2)"
    } else {
        "none"
    };

    rsx! {
        dialog { class: "auth-dialog", id: "login-or-create-account-dialog",
            div { style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;",
                h2 { style: "font-size: 1.25rem; margin: 0;", "{dialog_title}" }
                button {
                    r#type: "button",
                    style: "padding: 0.25rem; min-width: 2rem; width: 2rem; height: 2rem; border-radius: 50%; background-color: transparent; border: none; color: var(--text-secondary); cursor: pointer;",
                    onclick: move |_| {
                        dialog_close();
                    },
                    "✕"
                }
            }
            div {
                class: "auth-tabs",
                style: "display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; background: rgb(0 0 0 / 0.2); padding: 0.3rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;",
                button {
                    r#type: "button",
                    style: "background: {login_bg}; color: {login_color}; border: none; box-shadow: {login_shadow}; padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); cursor: pointer;",
                    onclick: move |_| {
                        let mut state_sig = use_context::<Signal<AppState>>();
                        let mut next = state_sig.write();
                        next.login_or_create_account_dialog_state = LoginOrCreateAccountDialogState {
                            generated_key: None,
                            state: CreatingAccountState::LogIn,
                            username: String::new(),
                            current_password: String::new(),
                            create_account_result_message: None,
                        };
                    },
                    "{context.language.label(\"Log In\", \"ログイン\", \"Ensaluti\")}"
                }
                button {
                    r#type: "button",
                    style: "background: {signup_bg}; color: {signup_color}; border: none; box-shadow: {signup_shadow}; padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); cursor: pointer;",
                    onclick: move |_| {
                        let mut state_sig = use_context::<Signal<AppState>>();
                        let mut next = state_sig.write();
                        next.login_or_create_account_dialog_state = LoginOrCreateAccountDialogState {
                            generated_key: Some(generate_key()),
                            state: CreatingAccountState::CreateAccount,
                            username: String::new(),
                            current_password: String::new(),
                            create_account_result_message: None,
                        };
                    },
                    "{context.language.label(\"Sign Up\", \"サインアップ\", \"Registriĝi\")}"
                }
            }
            match state.login_or_create_account_dialog_state.state {
                CreatingAccountState::LogIn => rsx! {
                    LoginView { context: context.clone() }
                },
                CreatingAccountState::CreateAccount
                | CreatingAccountState::CreateAccountRequesting
                | CreatingAccountState::Success
                | CreatingAccountState::Error => rsx! {
                    CreateAccountView { state: state.clone(), context: context.clone() }
                },
            }
        }
    }
}

#[component]
fn LoginView(context: PageContext) -> Element {
    let mut password_val = use_signal(String::new);

    rsx! {
        form {
            style: "display: grid; gap: 1.5rem;",
            onsubmit: move |evt: FormEvent| {
                evt.prevent_default();
                let password = password_val();
                if let Some(signing_key) = crate::navigator_credential::parse_password(
                    password,
                ) {
                    dialog_close();
                    let mut state_sig = use_context::<Signal<AppState>>();
                    state_sig.write().current_key = Some(signing_key);
                }
            },
            div { class: "form-group", style: "display: grid; gap: 0.4rem;",
                label { "{context.language.label(\"Secret Key\", \"秘密鍵\", \"Sekreta ŝlosilo\")}" }
                input {
                    r#type: "password",
                    name: "password",
                    autocomplete: "current-password",
                    required: true,
                    style: "padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
                    oninput: move |evt: FormEvent| {
                        password_val.set(evt.value());
                    },
                }
            }
            button {
                r#type: "submit",
                style: "width: 100%; padding: 0.5rem; background: var(--primary); color: #0e1720; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;",
                "{context.language.label(\"Log In\", \"ログイン\", \"Ensaluti\")}"
            }
        }
    }
}

fn generate_key() -> ed25519_dalek::SigningKey {
    let mut csprng = rand_core::OsRng;
    ed25519_dalek::SigningKey::generate(&mut csprng)
}

#[component]
fn CreateAccountView(state: AppState, context: PageContext) -> Element {
    let dialog_state = state.login_or_create_account_dialog_state.clone();
    let language = context.language;
    let requesting = dialog_state.state == CreatingAccountState::CreateAccountRequesting
        || dialog_state.state == CreatingAccountState::Success;

    let encoded_public_key = dialog_state
        .generated_key
        .as_ref()
        .map(|key| {
            base64::Engine::encode(
                &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                key.verifying_key().to_bytes(),
            )
        })
        .unwrap_or_default();

    let encoded_secret_key = dialog_state
        .generated_key
        .as_ref()
        .map(|key| {
            base64::Engine::encode(
                &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                key.to_bytes(),
            )
        })
        .unwrap_or_default();

    let mut username_val = use_signal(String::new);

    rsx! {
        form {
            style: "display: grid; gap: 1.5rem;",
            onsubmit: move |evt: FormEvent| {
                evt.prevent_default();
                let username_raw = username_val();
                let username = if username_raw.trim().is_empty() {
                    "user".to_string()
                } else {
                    username_raw
                };

                let mut state_sig = use_context::<Signal<AppState>>();
                let state_val = state_sig.read().clone();
                let generated_key = state_val
                    .login_or_create_account_dialog_state
                    .generated_key
                    .clone();
                let force_offline = state_val.force_offline;
                if let Some(key) = generated_key {
                    state_sig.write().login_or_create_account_dialog_state.state = CreatingAccountState::CreateAccountRequesting;
                    state_sig
                        .write()
                        .login_or_create_account_dialog_state
                        .create_account_result_message = None;
                    spawn(async move {
                        let event_binary = definy_event::sign_and_serialize(
                                definy_event::event::Event {
                                    account_id: definy_event::event::AccountId(
                                        key.verifying_key(),
                                    ),
                                    time: chrono::Utc::now(),
                                    content: definy_event::event::EventContent::CreateAccount(definy_event::event::CreateAccountEvent {
                                        account_name: username.clone().into(),
                                    }),
                                },
                                &key,
                            )
                            .unwrap();
                        let event_hash = definy_event::EventHashId::from_bytes(&event_binary);
                        let decoded_event = definy_event::verify_and_deserialize(
                            event_binary.as_slice(),
                        );
                        let result = fetch::post_event_with_queue(
                                event_binary.as_slice(),
                                force_offline,
                            )
                            .await;
                        if let Ok(record) = result {
                            let status = record.status.clone();
                            let message = match status {
                                crate::local_event::LocalEventStatus::Sent => {
                                    language
                                        .label(
                                            "Account created",
                                            "アカウントを作成しました",
                                            "Konto kreita",
                                        )
                                        .to_string()
                                }
                                crate::local_event::LocalEventStatus::Queued => {
                                    language
                                        .label(
                                            "Queued: network unavailable",
                                            "キュー済み: ネットワーク未接続",
                                            "En vico: reto nedisponebla",
                                        )
                                        .to_string()
                                }
                                crate::local_event::LocalEventStatus::Failed => {
                                    record
                                        .last_error
                                        .clone()
                                        .unwrap_or_else(|| {
                                            language
                                                .label(
                                                    "Failed to send",
                                                    "送信に失敗しました",
                                                    "Sendado malsukcesis",
                                                )
                                                .to_string()
                                        })
                                }
                            };
                            let _ = crate::navigator_credential::credential_store(
                                    &username,
                                    &key,
                                )
                                .await;
                            let _ = crate::indexed_db::store_events(
                                    std::slice::from_ref(&event_binary),
                                )
                                .await;
                            let fetched_events = if status
                                == crate::local_event::LocalEventStatus::Sent
                            {
                                fetch::get_events(None, Some(20), Some(0)).await.ok()
                            } else {
                                None
                            };
                            let mut next = state_sig.read().clone();
                            next.current_key = Some(key.clone());
                            next.event_cache.insert(event_hash.clone(), decoded_event);
                            if !next.event_list_state.event_hashes.contains(&event_hash) {
                                next.event_list_state.event_hashes.insert(0, event_hash);
                            }
                            if let Some(events) = fetched_events {
                                next.apply_latest_events(events, None);
                            }
                            crate::app_state::upsert_local_event_record(&mut next, record);
                            next.login_or_create_account_dialog_state.state = match status {
                                crate::local_event::LocalEventStatus::Sent => {
                                    CreatingAccountState::Success
                                }
                                _ => CreatingAccountState::Error,
                            };
                            next
                                .login_or_create_account_dialog_state
                                .create_account_result_message = Some(message);
                            state_sig.set(next);
                            if status == crate::local_event::LocalEventStatus::Sent {
                                dialog_close();
                            }
                        }
                    });
                }
            },
            div { class: "form-group", style: "display: grid; gap: 0.4rem;",
                label { "{context.language.label(\"Username\", \"ユーザー名\", \"Uzantnomo\")}" }
                input {
                    r#type: "text",
                    name: "username",
                    autocomplete: "username",
                    required: true,
                    style: "padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
                    oninput: move |evt: FormEvent| {
                        username_val.set(evt.value());
                    },
                }
            }
            div { class: "form-group", style: "display: grid; gap: 0.4rem;",
                label {
                    "{context.language.label(\"User ID (Public Key)\", \"ユーザーID (公開鍵)\", \"Uzanto-ID (publika ŝlosilo)\")}"
                }
                div {
                    class: "mono",
                    style: "font-size: 0.80rem; background-color: var(--background); padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border); word-break: break-all;",
                    "{encoded_public_key}"
                }
            }
            div { class: "form-group", style: "display: grid; gap: 0.4rem;",
                label { "{context.language.label(\"Secret Key\", \"秘密鍵\", \"Sekreta ŝlosilo\")}" }
                div {
                    class: "hint",
                    style: "font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;",
                    "{context.language.label(\"If you lose your secret key, you will not be able to log in again.\", \"秘密鍵を失うと再ログインできません。\", \"Se vi perdas la sekretan ŝlosilon, vi ne povos denove ensaluti.\")}"
                }
                div { style: "display: flex; gap: 0.5rem;",
                    input {
                        r#type: "password",
                        name: "password",
                        autocomplete: "new-password",
                        required: true,
                        readonly: true,
                        value: "{encoded_secret_key}",
                        style: "flex: 1; padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
                    }
                    button {
                        r#type: "button",
                        style: "padding: 0.4rem 0.75rem; background: rgb(255 255 255 / 0.05); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer;",
                        onclick: {
                            let key_to_copy = dialog_state.generated_key.clone();
                            move |_| {
                                if let Some(window) = web_sys::window()
                                    && let Some(key) = &key_to_copy {
                                    let _ = window
                                        .navigator()
                                        .clipboard()
                                        .write_text(
                                            &base64::Engine::encode(
                                                &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                                                key.to_scalar_bytes(),
                                            ),
                                        );
                                }
                            }
                        },
                        "{context.language.label(\"Copy\", \"コピー\", \"Kopii\")}"
                    }
                    button {
                        r#type: "button",
                        disabled: requesting,
                        style: "padding: 0.4rem 0.75rem; background: rgb(255 255 255 / 0.05); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer;",
                        onclick: move |_| {
                            let mut state_sig = use_context::<Signal<AppState>>();
                            state_sig.write().login_or_create_account_dialog_state.generated_key = Some(
                                generate_key(),
                            );
                        },
                        "{context.language.label(\"Regen\", \"再生成\", \"Regeneri\")}"
                    }
                }
            }
            div {
                class: "dialog-buttons",
                style: "display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 1rem;",
                button {
                    r#type: "button",
                    style: "padding: 0.45rem 1rem; background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer;",
                    onclick: move |_| {
                        dialog_close();
                    },
                    "{context.language.label(\"Cancel\", \"キャンセル\", \"Nuligi\")}"
                }
                button {
                    r#type: "submit",
                    disabled: requesting,
                    style: "padding: 0.45rem 1.2rem; background: var(--primary); color: #0e1720; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;",
                    match dialog_state.state {
                        CreatingAccountState::LogIn => {
                            context.language.label("Log In", "ログイン", "Ensaluti")
                        }
                        CreatingAccountState::CreateAccount => {
                            context.language.label("Sign Up", "サインアップ", "Registriĝi")
                        }
                        CreatingAccountState::CreateAccountRequesting => {
                            context
                                .language
                                .label("Signing Up...", "サインアップ中...", "Registriĝante...")
                        }
                        CreatingAccountState::Success => {
                            context.language.label("Success", "成功", "Sukceso")
                        }
                        CreatingAccountState::Error => {
                            context.language.label("Error", "エラー", "Eraro")
                        }
                    }
                }
            }
            if let Some(message) = &dialog_state.create_account_result_message {
                div { style: "font-size: 0.82rem; color: var(--text-secondary);", "{message}" }
            }
        }
    }
}

fn dialog_close() {
    if let Some(dlg) = web_sys::window()
        .and_then(|w| w.document())
        .and_then(|d| d.get_element_by_id("login-or-create-account-dialog"))
        .and_then(|el| el.dyn_into::<web_sys::HtmlDialogElement>().ok())
    {
        dlg.close();
    }
}
