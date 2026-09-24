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

    let queued_count = state
        .local_event_queue
        .items
        .iter()
        .filter(|i| i.status == crate::local_event::LocalEventStatus::Queued)
        .count();
    let failed_count = state
        .local_event_queue
        .items
        .iter()
        .filter(|i| i.status == crate::local_event::LocalEventStatus::Failed)
        .count();

    let local_events_badge = if queued_count > 0 || failed_count > 0 {
        let (bg, text_color, count) = if failed_count > 0 {
            ("#f87171", "#ffffff", failed_count)
        } else {
            ("#fbbf24", "#0f172a", queued_count)
        };
        Some(rsx! {
            span { style: "font-size: 0.68rem; font-weight: 700; background: {bg}; color: {text_color}; padding: 0.05rem 0.35rem; border-radius: 9999px; line-height: 1.2;",
                "{count}"
            }
        })
    } else {
        None
    };

    rsx! {
        header {
            class: "app-header",
            style: "display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 1.4rem; left: 0; right: 0; width: 100%; position: fixed; top: 0; z-index: 10; box-sizing: border-box;",
            div { style: "display: flex; align-items: center; gap: 0.8rem;",
                a {
                    href: context.href_with_lang(Location::Home),
                    style: "text-decoration: none; display: inline-flex; align-items: center; margin-right: 0.5rem;",
                    h1 { class: "logo-text", "definy" }
                }
                NavLink {
                    context: context.clone(),
                    target: Location::Home,
                    label: "Events",
                    label_ja: "イベント",
                    label_eo: "Eventoj",
                }
                NavLink {
                    context: context.clone(),
                    target: Location::PartList,
                    label: "Parts",
                    label_ja: "パーツ",
                    label_eo: "Partoj",
                }
                NavLink {
                    context: context.clone(),
                    target: Location::TreeLayout,
                    label: "Tree Layout",
                    label_ja: "ツリー表示",
                    label_eo: "Arba aranĝo",
                }
                NavLink {
                    context: context.clone(),
                    target: Location::ModuleList,
                    label: "Modules",
                    label_ja: "モジュール",
                    label_eo: "Moduloj",
                }
                NavLink {
                    context: context.clone(),
                    target: Location::LocalEventQueue,
                    label: "Local Events",
                    label_ja: "ローカルイベント",
                    label_eo: "Lokaj eventoj",
                    badge: local_events_badge,
                }
                NavLink {
                    context: context.clone(),
                    target: Location::AccountList,
                    label: "Accounts",
                    label_ja: "アカウント",
                    label_eo: "Kontoj",
                }
                a {
                    class: "nav-link",
                    href: "{crate::fetch::api_base_url()}/swagger-ui/",
                    "API"
                }
            }
            div { style: "flex-grow: 1; display: flex; justify-content: center; padding: 0 0.8rem;",
                div { style: "font-size: 0.84rem; font-weight: 500; color: var(--text-secondary); max-width: 36vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; letter-spacing: 0.01em;",
                    "{title_text}"
                }
            }
            div { style: "display: flex; align-items: center; gap: 0.65rem;",
                ConnectionStatusIndicator { state: state.clone(), context: context.clone() }
                LanguageDropdown { state: state.clone(), context: context.clone() }
                if let Some(secret_key) = current_key_opt {
                    {
                        let account_id = definy_event::event::AccountId(secret_key.verifying_key());
                        let account_name = state
                            .account_name_map()
                            .get(&account_id)
                            .cloned()
                            .map(|s| s.to_string())
                            .unwrap_or_else(|| {
                                base64::Engine::encode(
                                    &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                                    secret_key.verifying_key().to_bytes(),
                                )
                            });
                        rsx! {
                            button {
                                r#type: "button",
                                class: "btn-secondary",
                                "popovertarget": "header-popover",
                                "popovertargetaction": "show",
                                style: "font-family: 'JetBrains Mono', monospace; font-size: 0.76rem; max-width: min(46vw, 360px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; anchor-name: --header-popover-button;",
                                "{account_name}"
                            }
                        }
                    }
                } else {
                    button {
                        r#type: "button",
                        class: "btn-primary",
                        "commandfor": "login-or-create-account-dialog",
                        "command": "show-modal",
                        "{context.language.label(\"Log In\", \"ログイン\", \"Ensaluti\")}"
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
    #[props(default = None)] badge: Option<Element>,
) -> Element {
    let is_active = matches!(
        (&context.location, &target),
        (Some(Location::Home | Location::Event(_)), Location::Home)
            | (
                Some(Location::PartList | Location::Part(_)),
                Location::PartList
            )
            | (Some(Location::TreeLayout), Location::TreeLayout)
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
            style: "display: inline-flex; align-items: center; gap: 0.35rem;",
            span { "{context.language.label(label, label_ja, label_eo)}" }
            if let Some(b) = badge {
                {b}
            }
        }
    }
}

#[component]
fn ConnectionStatusIndicator(state: AppState, context: PageContext) -> Element {
    let queued_count = state
        .local_event_queue
        .items
        .iter()
        .filter(|i| i.status == crate::local_event::LocalEventStatus::Queued)
        .count();
    let failed_count = state
        .local_event_queue
        .items
        .iter()
        .filter(|i| i.status == crate::local_event::LocalEventStatus::Failed)
        .count();

    let (dot_color, status_text, tooltip) = if state.force_offline {
        (
            "#fbbf24",
            context
                .language
                .label("Offline", "オフライン", "Senkonekte"),
            context.language.label(
                "Offline mode is forced (Click to toggle)",
                "強制オフラインが有効です（クリックで切替）",
                "Deviga senkonekta reĝimo estas enŝaltita (Alklaku por ŝanĝi)",
            ),
        )
    } else {
        match state.connection_status {
            crate::app_state::ConnectionStatus::Connected => (
                "#34d399",
                context.language.label("Connected", "接続中", "Konektita"),
                context.language.label(
                    "Connected to server",
                    "サーバーに接続されています",
                    "Konektita al servilo",
                ),
            ),
            crate::app_state::ConnectionStatus::ServerDisconnected => (
                "#f87171",
                context
                    .language
                    .label("Disconnected", "未接続", "Malkonektita"),
                context.language.label(
                    "Server disconnected",
                    "サーバーに接続できません",
                    "Servilo malkonektita",
                ),
            ),
            crate::app_state::ConnectionStatus::DatabaseUnavailable => (
                "#f87171",
                context.language.label("DB Error", "DB停止", "DB Eraro"),
                context.language.label(
                    "Database is unavailable",
                    "データベースが利用できません",
                    "Datumbazo ne atingeblas",
                ),
            ),
        }
    };

    rsx! {
        div { style: "display: flex; align-items: center; gap: 0.35rem;",
            // 接続ステータスドット＆ラベル
            button {
                r#type: "button",
                style: "display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.28rem 0.65rem; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border); border-radius: var(--radius-full); font-size: 0.76rem; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease;",
                title: "{tooltip}",
                onclick: move |_| {
                    let mut dispatch = use_context::<Signal<AppState>>();
                    let cur = dispatch.read().force_offline;
                    dispatch.write().force_offline = !cur;
                },
                span { style: "display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: {dot_color}; box-shadow: 0 0 8px {dot_color}; flex-shrink: 0; animation: pulse-glow 2s infinite ease-in-out;" }
                span { style: "white-space: nowrap;", "{status_text}" }
            }
            // 未送信ローカルイベントがある場合のチップ表示
            if queued_count > 0 || failed_count > 0 {
                {
                    let total_unsent = queued_count + failed_count;
                    let (bg, border, text_color, chip_text) = if failed_count > 0 {
                        (
                            "rgb(239 68 68 / 0.15)",
                            "#ef4444",
                            "#fca5a5",
                            format!(
                                "{}: {}",
                                context
                                    .language
                                    .label("Failed", "送信失敗", "Malsukcesis"),
                                failed_count,
                            ),
                        )
                    } else {
                        (
                            "rgb(245 158 11 / 0.15)",
                            "#f59e0b",
                            "#fde68a",
                            format!(
                                "{}: {}",
                                context
                                    .language
                                    .label("Unsent", "未送信", "Nesendita"),
                                total_unsent,
                            ),
                        )
                    };
                    rsx! {
                        a {
                            href: context.href_with_lang(Location::LocalEventQueue),
                            style: "display: inline-flex; align-items: center; gap: 0.3rem; text-decoration: none; font-size: 0.74rem; background: {bg}; border: 1px solid {border}; color: {text_color}; padding: 0.22rem 0.5rem; border-radius: var(--radius-full); font-weight: 600; white-space: nowrap; transition: opacity 0.15s ease;",
                            title: "{context.language.label(\"View local event queue\", \"ローカルイベントキューを確認\", \"Vidi lokan eventovicon\")}",
                            span { style: "display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: {border};" }
                            span { "{chip_text}" }
                        }
                    }
                }
            }
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
        div { style: "display: grid; gap: 0.25rem; justify-items: start;",
            div {
                button {
                    r#type: "button",
                    "popovertarget": "dropdown-panel-language",
                    "popovertargetaction": "show",
                    style: "width: 100%; text-align: left; padding: 0.4rem 0.6rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer; display: flex; justify-content: space-between; align-items: center; white-space: nowrap; anchor-name: --dropdown-language;",
                    "{current_native}"
                    div { style: "opacity: 0.5; font-size: 0.8rem; margin-left: 0.5rem;",
                        "▼"
                    }
                }
                div {
                    id: "dropdown-panel-language",
                    "popover": "auto",
                    style: "position-anchor: --dropdown-language; top: anchor(bottom); right: anchor(right); left: auto; width: max-content; min-width: 9rem; max-width: 14rem; margin: 4px 0 0 0; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-lg); box-sizing: border-box;",
                    div { style: "display: flex; flex-direction: column;",
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
                div { style: "font-size: 0.75rem; color: var(--text-secondary); max-width: 22rem;",
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
                    {
                        context
                            .language
                            .label("Offline: On", "オフライン: オン", "Senkonekte: En")
                    }
                } else {
                    {
                        context
                            .language
                            .label("Offline: Off", "オフライン: オフ", "Senkonekte: Malŝaltita")
                    }
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
