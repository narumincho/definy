use dioxus::prelude::*;

use crate::page_context::PageContext;
use crate::{AppState, Location};

#[component]
pub fn HeaderView(state: AppState, context: PageContext) -> Element {
    rsx! {
        div {
            HeaderMain { state: state.clone(), context: context.clone() }
            if state.current_key.is_some() {
                HeaderPopover { state, context }
            }
        }
    }
}

#[component]
fn HeaderMain(state: AppState, context: PageContext) -> Element {
    let title_text = crate::page_title::page_title_text(&state, &context);
    let current_key_opt = state.current_key.clone();

    rsx! {
        header {
            class: "app-header",
            style: "display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 1.2rem; background: rgb(16 22 27 / 0.8); backdrop-filter: var(--glass-blur); left: 0; right: 0; width: 100%; position: fixed; top: 0; z-index: 10; border-bottom: 1px solid var(--border); box-sizing: border-box;",
            div {
                style: "display: flex; align-items: center; gap: 1rem;",
                a {
                    href: context.href_with_lang(Location::Home),
                    style: "text-decoration: none; display: inline-flex; align-items: center; margin-right: 0.3rem;",
                    h1 {
                        style: "font-size: 1.45rem; font-weight: 700; color: var(--primary); letter-spacing: -0.03em; margin: 0;",
                        "definy"
                    }
                }
                NavLink { context: context.clone(), target: Location::Home, label: "Events", label_ja: "イベント", label_eo: "Eventoj" }
                NavLink { context: context.clone(), target: Location::PartList, label: "Parts", label_ja: "パーツ", label_eo: "Partoj" }
                NavLink { context: context.clone(), target: Location::ModuleList, label: "Modules", label_ja: "モジュール", label_eo: "Moduloj" }
                NavLink { context: context.clone(), target: Location::LocalEventQueue, label: "Local Events", label_ja: "ローカルイベント", label_eo: "Lokaj eventoj" }
                NavLink { context: context.clone(), target: Location::AccountList, label: "Accounts", label_ja: "アカウント", label_eo: "Kontoj" }
            }
            div {
                style: "flex-grow: 1; display: flex; justify-content: center; padding: 0 0.8rem;",
                div {
                    style: "font-size: 0.86rem; color: var(--text-secondary); max-width: 36vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;",
                    "{title_text}"
                }
            }
            div {
                style: "display: flex; align-items: center; gap: 0.65rem;",
                LanguageDropdown { state: state.clone(), context: context.clone() }
                if let Some(secret_key) = current_key_opt {
                    {
                        let account_id = definy_event::event::AccountId(secret_key.verifying_key());
                        let account_name = state.account_name_map().get(&account_id).cloned().map(|s| s.to_string()).unwrap_or_else(|| {
                            base64::Engine::encode(
                                &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                                secret_key.verifying_key().to_bytes(),
                            )
                        });

                        rsx! {
                            button {
                                r#type: "button",
                                "popovertarget": "header-popover",
                                "popovertargetaction": "show",
                                style: "font-family: 'JetBrains Mono', monospace; font-size: 0.76rem; background: rgb(255 255 255 / 0.06); color: var(--text); border: 1px solid var(--border); padding: 0.38rem 0.75rem; border-radius: var(--radius-sm); cursor: pointer; max-width: min(46vw, 360px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; anchor-name: --header-popover-button;",
                                "{account_name}"
                            }
                        }
                    }
                } else {
                    button {
                        r#type: "button",
                        onclick: move |_| {
                            let _ = web_sys::window()
                                .and_then(|w| w.document())
                                .and_then(|d| d.get_element_by_id("login-or-create-account-dialog"))
                                .and_then(|el| wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlDialogElement>(el).ok())
                                .map(|dlg| dlg.show_modal());
                        },
                        style: "font-size: 0.84rem; font-weight: 600; background: var(--primary); color: #0e1720; border: none; padding: 0.4rem 0.88rem; border-radius: var(--radius-sm); cursor: pointer; box-shadow: 0 2px 8px rgb(124 192 216 / 0.22); transition: opacity 0.15s ease;",
                        "{context.language.label(\"Log In / Sign Up\", \"ログイン / サインアップ\", \"Ensaluti / Registriĝi\")}"
                    }
                }
            }
        }
    }
}

#[component]
fn NavLink(
    context: PageContext,
    target: Location,
    label: &'static str,
    label_ja: &'static str,
    label_eo: &'static str,
) -> Element {
    let is_active = matches!(
        (&context.location, &target),
        (Some(Location::Home | Location::Event(_)), Location::Home)
            | (
                Some(Location::PartList | Location::Part(_)),
                Location::PartList
            )
            | (
                Some(Location::ModuleList | Location::Module(_)),
                Location::ModuleList
            )
            | (Some(Location::LocalEventQueue), Location::LocalEventQueue)
            | (
                Some(Location::AccountList | Location::Account(_)),
                Location::AccountList
            )
    );

    let class_name = if is_active {
        "nav-link active"
    } else {
        "nav-link"
    };

    rsx! {
        a {
            class: "{class_name}",
            href: context.href_with_lang(target),
            "{context.language.label(label, label_ja, label_eo)}"
        }
    }
}

#[component]
fn LanguageDropdown(state: AppState, context: PageContext) -> Element {
    let location = context.location.clone().unwrap_or(Location::Home);
    let event_type = context.filter_event_type;
    let current_code = context.language.to_code().to_string();
    let current_native = context.language.native_name().to_string();
    let requested_code = context.language_requested_code.clone();

    let supported = crate::language::SUPPORTED_LANGUAGES;

    rsx! {
        div {
            style: "display: grid; gap: 0.25rem; justify-items: start;",
            div {
                button {
                    r#type: "button",
                    "popovertarget": "dropdown-panel-language",
                    "popovertargetaction": "show",
                    style: "width: 100%; text-align: left; padding: 0.4rem 0.6rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer; display: flex; justify-content: space-between; align-items: center; white-space: nowrap; anchor-name: --dropdown-language;",
                    "{current_native}"
                    div {
                        style: "opacity: 0.5; font-size: 0.8rem; margin-left: 0.5rem;",
                        "▼"
                    }
                }
                div {
                    id: "dropdown-panel-language",
                    "popover": "auto",
                    style: "position-anchor: --dropdown-language; top: anchor(bottom); right: anchor(right); left: auto; width: max-content; min-width: 9rem; max-width: 14rem; margin: 4px 0 0 0; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-lg); box-sizing: border-box;",
                    div {
                        style: "display: flex; flex-direction: column;",
                        for lang in supported {
                            {
                                let is_selected = lang.to_code() == current_code;
                                let url = PageContext::build_url(&location, lang.to_code(), event_type);
                                let bg = if is_selected { "rgb(255 255 255 / 0.1)" } else { "transparent" };
                                let color = if is_selected { "var(--primary)" } else { "var(--text)" };

                                rsx! {
                                    a {
                                        key: "{lang.to_code()}",
                                        href: "{url}",
                                        style: "display: block; width: 100%; box-sizing: border-box; padding: 0.45rem 0.65rem; text-decoration: none; border-bottom: 1px solid rgb(255 255 255 / 0.04); background: {bg}; color: {color}; font-weight: 500;",
                                        "{lang.native_name()}"
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if let Some(notice) = requested_code {
                div {
                    style: "font-size: 0.75rem; color: var(--text-secondary); max-width: 22rem;",
                    "言語「{notice}」はサポートされていないため「{context.language.native_name()}」にフォールバックしました"
                }
            }
        }
    }
}

#[component]
fn HeaderPopover(mut state: AppState, context: PageContext) -> Element {
    let account_link = state.current_key.as_ref().map(|key| {
        let account_id = definy_event::event::AccountId(key.verifying_key());
        let account_name =
            crate::app_state::account_display_name(&state.account_name_map(), &account_id);
        (account_id, account_name)
    });

    rsx! {
        div {
            id: "header-popover",
            "popover": "auto",
            style: "position-anchor: --header-popover-button; top: anchor(bottom); left: auto; right: anchor(right); width: max-content; min-width: 10rem; max-width: 18rem; margin: 4px 0 0 0; padding: 0.42rem; border: 1px solid var(--border); background: var(--surface); color: var(--text); backdrop-filter: var(--glass-blur); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); box-sizing: border-box;",
            if let Some((account_id, account_name)) = account_link {
                a {
                    href: context.href_with_lang(Location::Account(account_id)),
                    style: "display: block; padding: 0.4rem 0.5rem; border-radius: 0.4rem; background: rgb(255 255 255 / 0.04); color: var(--text); text-decoration: none; font-size: 0.85rem; font-weight: 600;",
                    "{account_name}"
                }
            }
            button {
                r#type: "button",
                style: "width: 100%; background-color: transparent; color: var(--text); border: none; cursor: pointer; padding: 0.4rem 0.5rem; text-align: left; display: flex; justify-content: flex-start;",
                onclick: move |_| {
                    let mut dispatch = use_context::<Signal<AppState>>();
                    let current = dispatch.read().force_offline;
                    dispatch.write().force_offline = !current;
                },
                if state.force_offline {
                    {context.language.label("Offline: On", "オフライン: オン", "Senkonekte: En")}
                } else {
                    {context.language.label("Offline: Off", "オフライン: オフ", "Senkonekte: Malŝaltita")}
                }
            }
            button {
                r#type: "button",
                "popovertarget": "header-popover",
                "popovertargetaction": "hide",
                style: "width: 100%; background-color: transparent; color: #fca5a5; border: none; cursor: pointer; padding: 0.4rem 0.5rem; text-align: left; display: flex; justify-content: flex-start;",
                onclick: move |_| {
                    crate::navigator_credential::credential_clear();
                    let mut dispatch = use_context::<Signal<AppState>>();
                    dispatch.write().current_key = None;
                },
                "{context.language.label(\"Log Out\", \"ログアウト\", \"Elsaluti\")}"
            }
        }
    }
}
