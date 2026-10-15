use dioxus::prelude::*;

use crate::page_context::PageContext;
use crate::{AppState, Location};

#[component]
pub fn HeaderView(state: AppState, context: PageContext) -> Element {
    // ラッパー要素を挟むとワークベンチのグリッド配置が崩れるため, フラグメントで返す
    rsx! {
        HeaderMain { state: state.clone(), context: context.clone() }
        if state.current_key.is_some() {
            HeaderPopover { state, context }
        }
    }
}

/// IDE のタイトルバー. サイドバー開閉・ロゴ・現在のページ・言語・アカウントを並べる
#[component]
fn HeaderMain(state: AppState, context: PageContext) -> Element {
    let sidebar_toggle = try_use_context::<crate::workbench::SidebarToggle>();
    let command_palette = try_use_context::<crate::command_palette::CommandPaletteOpen>();
    let palette_label = context.language.label(
        "Search parts, modules and pages",
        "パーツ・モジュール・ページを検索",
        "Serĉi partojn, modulojn kaj paĝojn",
    );
    let title_text = crate::page_title::page_title_text(&state, &context);
    let current_key_opt = state.current_key.clone();
    let toggle_label = context.language.label(
        "Toggle Explorer",
        "エクスプローラーの表示切替",
        "Baskuligi esplorilon",
    );

    rsx! {
        header { class: "app-header",
            button {
                r#type: "button",
                class: "titlebar-icon-button",
                title: "{toggle_label}",
                "aria-label": "{toggle_label}",
                onclick: move |_| {
                    if let Some(crate::workbench::SidebarToggle(mut toggled)) = sidebar_toggle {
                        let current = toggled();
                        toggled.set(!current);
                    }
                },
                crate::icon::Icon {
                    kind: crate::icon::IconKind::Sidebar,
                    class: "titlebar-icon",
                }
            }
            a {
                class: "app-logo",
                href: context.href_with_lang(Location::Home),
                h1 { class: "logo-text", "definy" }
            }
            div { class: "header-title-container",
                // コマンドパレットを開く (Cmd/Ctrl+P でも開ける)
                button {
                    r#type: "button",
                    class: "header-title",
                    title: "{palette_label} (⌘P / Ctrl+P)",
                    "aria-label": "{palette_label}",
                    onclick: move |_| {
                        if let Some(crate::command_palette::CommandPaletteOpen(mut open)) = command_palette {
                            open.set(true);
                        }
                    },
                    crate::icon::SearchIcon { class: "header-title-icon" }
                    span { class: "header-title-text", "{title_text}" }
                    kbd { class: "header-title-kbd", "⌘P" }
                }
            }
            div { class: "header-actions",
                LanguageDropdown { state: state.clone(), context: context.clone() }
                if state.is_auth_loading {
                    div {
                        class: "auth-loading-placeholder header-control",
                        style: "color: var(--text-muted); letter-spacing: 0.02em;",
                        span {
                            "{context.language.label(\"Checking...\", \"確認中...\", \"Kontrolante...\")}"
                        }
                    }
                } else if let Some(secret_key) = current_key_opt {
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
                                class: "header-control",
                                "popovertarget": "header-popover",
                                "popovertargetaction": "show",
                                style: "max-width: min(40vw, 280px); anchor-name: --header-popover-button;",
                                span { class: "header-account-avatar", "{account_name.chars().next().unwrap_or('?')}" }
                                span { style: "overflow: hidden; text-overflow: ellipsis;", "{account_name}" }
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

/// IDE 下端のステータスバー. 接続状態と未送信ローカルイベントを表示する
#[component]
pub fn StatusBarView(state: AppState, context: PageContext) -> Element {
    let title_text = crate::page_title::page_title_text(&state, &context);
    rsx! {
        footer { class: "status-bar",
            ConnectionStatusIndicator { state: state.clone(), context: context.clone() }
            div { class: "status-bar-spacer" }
            span { class: "status-bar-item status-bar-location", "{title_text}" }
            span { class: "status-bar-item", "{context.language.native_name()}" }
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

    let (tone, status_text, tooltip) = if state.force_offline {
        (
            "warning",
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
                "ok",
                context.language.label("Connected", "接続中", "Konektita"),
                context.language.label(
                    "Connected to server (Click to go offline)",
                    "サーバーに接続されています（クリックでオフライン）",
                    "Konektita al servilo (Alklaku por malkonekti)",
                ),
            ),
            crate::app_state::ConnectionStatus::ServerDisconnected => (
                "error",
                context
                    .language
                    .label("Disconnected", "未接続", "Malkonektita"),
                context.language.label(
                    "Server disconnected",
                    "サーバーに接続できません",
                    "Servilo malkonektita",
                ),
            ),
            crate::app_state::ConnectionStatus::DatabaseInitializing => (
                "info",
                context
                    .language
                    .label("DB Initializing", "DB初期化中", "DB Inicializiĝas"),
                context.language.label(
                    "Database is initializing",
                    "データベースを初期化中です",
                    "Datumbazo estas inicializiĝanta",
                ),
            ),
            crate::app_state::ConnectionStatus::DatabaseUnavailable => (
                "error",
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
        button {
            r#type: "button",
            class: "status-bar-item status-bar-button connection-status-button status-{tone}",
            title: "{tooltip}",
            "aria-label": "{tooltip}",
            onclick: move |_| {
                let mut dispatch = use_context::<Signal<AppState>>();
                let cur = dispatch.read().force_offline;
                dispatch.write().force_offline = !cur;
            },
            span { class: "connection-dot" }
            span { class: "connection-status-label", "{status_text}" }
        }
        // 未送信ローカルイベントがある場合の表示
        if queued_count > 0 || failed_count > 0 {
            {
                let (tone, chip_text) = if failed_count > 0 {
                    (
                        "error",
                        format!(
                            "{}: {}",
                            context.language.label("Failed", "送信失敗", "Malsukcesis"),
                            failed_count,
                        ),
                    )
                } else {
                    (
                        "warning",
                        format!(
                            "{}: {}",
                            context.language.label("Unsent", "未送信", "Nesendita"),
                            queued_count,
                        ),
                    )
                };
                rsx! {
                    a {
                        class: "status-bar-item status-bar-button status-{tone}",
                        href: context.href_with_lang(Location::LocalEventQueue),
                        title: "{context.language.label(\"View local event queue\", \"ローカルイベントキューを確認\", \"Vidi lokan eventovicon\")}",
                        "↑ {chip_text}"
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
                    class: "header-control",
                    "popovertarget": "dropdown-panel-language",
                    "popovertargetaction": "show",
                    style: "anchor-name: --dropdown-language;",
                    "{current_native}"
                    span { class: "header-control-caret", "▼" }
                }
                div {
                    id: "dropdown-panel-language",
                    "popover": "auto",
                    class: "dropdown-popover-panel",
                    style: "position: absolute; inset: auto; position-anchor: --dropdown-language; position-area: bottom span-left; position-try-fallbacks: flip-inline, flip-block, flip-block flip-inline; width: max-content; min-width: 9rem; max-width: 14rem; margin: 4px 0 0 0; background-color: var(--surface-opaque); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-lg); box-sizing: border-box; overflow: hidden;",
                    div { style: "display: flex; flex-direction: column;",
                        for lang in supported {
                            {
                                let is_selected = lang.to_code() == current_code;
                                let url = PageContext::build_url(&location, lang.to_code(), event_type);

                                rsx! {
                                    a {
                                        key: "{lang.to_code()}",
                                        href: "{url}",
                                        class: "lang-option",
                                        "aria-current": if is_selected { "true" } else { "false" },
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
            class: "dropdown-popover-panel",
            style: "position: absolute; inset: auto; position-anchor: --header-popover-button; position-area: bottom span-left; position-try-fallbacks: flip-inline, flip-block, flip-block flip-inline; width: max-content; min-width: 10rem; max-width: 18rem; margin: 4px 0 0 0; padding: 0.42rem; border: 1px solid var(--border); background-color: var(--surface-opaque); color: var(--text); backdrop-filter: var(--glass-blur); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); box-sizing: border-box; overflow: hidden;",
            if let Some((account_id, account_name)) = account_link {
                a {
                    href: context.href_with_lang(Location::Account(account_id)),
                    style: "display: block; padding: 0.4rem 0.5rem; border-radius: 0.4rem; background: var(--overlay-2); color: var(--text); text-decoration: none; font-size: 0.85rem; font-weight: 600;",
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
                style: "width: 100%; background-color: transparent; color: var(--red-text); border: none; cursor: pointer; padding: 0.4rem 0.5rem; text-align: left; display: flex; justify-content: flex-start;",
                onclick: move |_| {
                    crate::navigator_credential::credential_clear();
                    let mut dispatch = use_context::<Signal<AppState>>();
                    let mut next = dispatch.read().clone();
                    next.current_key = None;
                    next.is_auth_loading = false;
                    dispatch.set(next);
                },
                "{context.language.label(\"Log Out\", \"ログアウト\", \"Elsaluti\")}"
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_header_initial_state_shows_checking() {
        let state = crate::build_initial_state(vec![], false, false, None, None, true, false);
        assert!(state.is_auth_loading);
        assert!(state.current_key.is_none());

        let context = crate::PageContext::from_path_and_query("/", "", Some("ja"));
        let mut renderer = dioxus_ssr::Renderer::new();
        let html = renderer.render_element(rsx! {
            HeaderView { state, context }
        });

        assert!(
            html.contains("auth-loading-placeholder") || html.contains("確認中..."),
            "Initial SSR header should display checking placeholder, got: {}",
            html
        );
        assert!(
            !html.contains("commandfor=\"login-or-create-account-dialog\""),
            "Initial SSR header must not display login button immediately, got: {}",
            html
        );
    }

    #[test]
    fn test_header_unauthenticated_shows_login_button() {
        let mut state = crate::build_initial_state(vec![], false, false, None, None, true, false);
        state.is_auth_loading = false;
        state.current_key = None;

        let context = crate::PageContext::from_path_and_query("/", "", Some("ja"));
        let mut renderer = dioxus_ssr::Renderer::new();
        let html = renderer.render_element(rsx! {
            HeaderView { state, context }
        });

        assert!(
            html.contains("ログイン")
                && html.contains("commandfor=\"login-or-create-account-dialog\""),
            "Resolved unauthenticated header should display login button, got: {}",
            html
        );
    }
}
