use std::rc::Rc;

use narumincho_vdom::*;

use crate::i18n;
use crate::{AppState, Location};

pub fn header(state: &AppState) -> Node<AppState> {
    let mut children = vec![header_main(state)];
    if state.current_key.is_some() && state.is_header_popover_open {
        children.push(popover(state));
    }
    Div::new().children(children).into_node()
}

fn header_main(state: &AppState) -> Node<AppState> {
    Header::new()
        .class("app-header")
        .style(
            Style::new()
                .set("display", "flex")
                .set("justify-content", "space-between")
                .set("align-items", "center")
                .set("padding", "0.72rem 1.2rem")
                .set("background", "rgba(11, 15, 25, 0.6)")
                .set("backdrop-filter", "var(--glass-blur)")
                .set("-webkit-backdrop-filter", "var(--glass-blur)")
                .set("left", "0")
                .set("right", "0")
                .set("width", "100%")
                .set("position", "fixed")
                .set("top", "0")
                .set("z-index", "10")
                .set("border-bottom", "1px solid var(--border)"),
        )
        .children([
            Div::new()
                .style(
                    Style::new()
                        .set("display", "flex")
                        .set("align-items", "center")
                        .set("gap", "0.75rem"),
                )
                .children([
                    A::<AppState, Location>::new()
                        .href(state.href_with_lang(Location::Home))
                        .style(
                            Style::new()
                                .set("text-decoration", "none")
                                .set("display", "inline-block"),
                        )
                        .children([H1::new()
                            .style(
                                Style::new()
                                    .set("font-size", "1.48rem")
                                    .set("font-weight", "700")
                                    .set("color", "var(--primary)")
                                    .set("letter-spacing", "-0.03em"),
                            )
                            .children([text("definy")])
                            .into_node()])
                        .into_node(),
                    A::<AppState, Location>::new()
                        .href(state.href_with_lang(Location::PartList))
                        .style(
                            Style::new()
                                .set("font-size", "0.9rem")
                                .set("color", "var(--text-secondary)"),
                        )
                        .children([text(i18n::tr(state, "Parts", "パーツ", "Partoj"))])
                        .into_node(),
                    A::<AppState, Location>::new()
                        .href(state.href_with_lang(Location::ModuleList))
                        .style(
                            Style::new()
                                .set("font-size", "0.9rem")
                                .set("color", "var(--text-secondary)"),
                        )
                        .children([text(i18n::tr(state, "Modules", "モジュール", "Moduloj"))])
                        .into_node(),
                    A::<AppState, Location>::new()
                        .href(state.href_with_lang(Location::LocalEventQueue))
                        .style(
                            Style::new()
                                .set("font-size", "0.9rem")
                                .set("color", "var(--text-secondary)"),
                        )
                        .children([text(i18n::tr(
                            state,
                            "Local Events",
                            "ローカルイベント",
                            "Lokaj eventoj",
                        ))])
                        .into_node(),
                    A::<AppState, Location>::new()
                        .href(state.href_with_lang(Location::AccountList))
                        .style(
                            Style::new()
                                .set("font-size", "0.9rem")
                                .set("color", "var(--text-secondary)"),
                        )
                        .children([text(i18n::tr(state, "Accounts", "アカウント", "Kontoj"))])
                        .into_node(),
                ])
                .into_node(),
            Div::new()
                .style(
                    Style::new()
                        .set("flex-grow", "1")
                        .set("display", "flex")
                        .set("justify-content", "center"),
                )
                .children([Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "0.88rem")
                            .set("color", "var(--text-secondary)")
                            .set("max-width", "42vw")
                            .set("overflow", "hidden")
                            .set("text-overflow", "ellipsis")
                            .set("white-space", "nowrap"),
                    )
                    .children([text(crate::page_title::page_title_text(state))])
                    .into_node()])
                .into_node(),
            {
                let account_button = match &state.current_key {
                    Some(secret_key) => {
                        let account_id = definy_event::event::AccountId(Box::new(
                            secret_key.verifying_key().to_bytes(),
                        ));
                        let account_name = state.account_name_map().get(&account_id).cloned();

                        Button::new()
                            .on_click(EventHandler::new(async |set_state| {
                                set_state(Box::new(|state: AppState| AppState {
                                    is_header_popover_open: !state.is_header_popover_open,
                                    ..state.clone()
                                }));
                            }))
                            .style(
                                Style::new()
                                    .set("font-family", "'JetBrains Mono', monospace")
                                    .set("font-size", "0.74rem")
                                    .set("background", "rgba(255, 255, 255, 0.05)")
                                    .set("color", "var(--text)")
                                    .set("border", "1px solid var(--border)")
                                    .set("padding", "0.38rem 0.8rem")
                                    .set("max-width", "min(46vw, 420px)")
                                    .set("overflow", "hidden")
                                    .set("text-overflow", "ellipsis")
                                    .set("white-space", "nowrap")
                                    .set("anchor-name", "--header-popover-button"),
                            )
                            .children([text(&match account_name {
                                Some(name) => name.to_string(),
                                None => base64::Engine::encode(
                                    &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                                    secret_key.verifying_key().to_bytes(),
                                ),
                            })])
                            .into_node()
                    }
                    None => Button::new()
                        .command_for("login-or-create-account-dialog")
                        .command(CommandValue::ShowModal)
                        .children([text(i18n::tr(
                            state,
                            "Log In / Sign Up",
                            "ログイン / サインアップ",
                            "Ensaluti / Registriĝi",
                        ))])
                        .into_node(),
                };

                Div::new()
                    .style(
                        Style::new()
                            .set("display", "flex")
                            .set("align-items", "center")
                            .set("gap", "0.6rem"),
                    )
                    .children([language_dropdown(state), account_button])
                    .into_node()
            },
        ])
        .into_node()
}

fn language_dropdown(state: &AppState) -> Node<AppState> {
    let languages = crate::language::preferred_languages();
    let mut options = Vec::with_capacity(languages.len());
    for language in languages {
        options.push((
            language.code.to_string(),
            crate::language::language_label(&language),
        ));
    }
    let current_code = state.language.code;
    let dropdown = crate::dropdown::searchable_dropdown(
        state,
        "language",
        current_code,
        options.as_slice(),
        Rc::new(|value| {
            Box::new(move |state: AppState| {
                let selected =
                    crate::language::language_from_tag(value.as_str()).unwrap_or(state.language);
                if selected.code == state.language.code {
                    return state;
                }
                let location = state.location.clone().unwrap_or(Location::Home);
                let url = AppState::build_url(
                    &location,
                    selected.code,
                    state.event_list_state.filter_event_type,
                );
                if let Some(window) = web_sys::window()
                    && let Ok(history) = window.history() {
                        let _ = history.push_state_with_url(
                            &wasm_bindgen::JsValue::NULL,
                            "",
                            Some(url.as_str()),
                        );
                    }
                AppState {
                    language: selected,
                    language_fallback_notice: None,
                    ..state
                }
            })
        }),
    );
    if let Some(notice) = &state.language_fallback_notice {
        Div::new()
            .style(
                Style::new()
                    .set("display", "grid")
                    .set("gap", "0.25rem")
                    .set("justify-items", "start"),
            )
            .children([
                dropdown,
                Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "0.75rem")
                            .set("color", "var(--text-secondary)")
                            .set("max-width", "22rem"),
                    )
                    .children([text(format!(
                        "言語「{}」はサポートされていないため「{}」にフォールバックしました",
                        notice.requested, notice.fallback_to_code
                    ))])
                    .into_node(),
            ])
            .into_node()
    } else {
        dropdown
    }
}

fn popover(state: &AppState) -> Node<AppState> {
    let account_link = state.current_key.as_ref().map(|key| {
        let account_id = definy_event::event::AccountId(Box::new(key.verifying_key().to_bytes()));
        let account_name =
            crate::app_state::account_display_name(&state.account_name_map(), &account_id);
        A::<AppState, Location>::new()
            .href(state.href_with_lang(Location::Account(account_id)))
            .style(
                Style::new()
                    .set("padding", "0.4rem 0.5rem")
                    .set("border-radius", "0.4rem")
                    .set("background", "rgba(255, 255, 255, 0.04)")
                    .set("color", "var(--text)")
                    .set("text-decoration", "none")
                    .set("font-size", "0.85rem")
                    .set("font-weight", "600"),
            )
            .children([text(account_name)])
            .into_node()
    });

    Div::new()
        .id("header-popover")
        .class("header-popover")
        .style(
            Style::new()
                .set("position", "fixed")
                .set("top", "3.5rem")
                .set("right", "1rem")
                .set("padding", "0.42rem")
                .set("border", "1px solid var(--border)")
                .set("background", "var(--surface)")
                .set("backdrop-filter", "var(--glass-blur)")
                .set("-webkit-backdrop-filter", "var(--glass-blur)")
                .set("display", "grid")
                .set("gap", "0.55rem")
                .set("border-radius", "var(--radius-md)")
                .set("z-index", "20")
                .set("min-width", "220px")
                .set("box-shadow", "var(--shadow-lg)"),
        )
        .children({
            let mut children = Vec::new();
            if let Some(account_link) = account_link {
                children.push(account_link);
            }
            children.push(
                Button::new()
                    .on_click(EventHandler::new(async |set_state| {
                        set_state(Box::new(|state: AppState| -> AppState {
                            AppState {
                                force_offline: !state.force_offline,
                                ..state.clone()
                            }
                        }));
                    }))
                    .children([text(if state.force_offline {
                        i18n::tr(state, "Offline: On", "オフライン: オン", "Senkonekte: En")
                    } else {
                        i18n::tr(
                            state,
                            "Offline: Off",
                            "オフライン: オフ",
                            "Senkonekte: Malŝaltita",
                        )
                    })])
                    .style(
                        Style::new()
                            .set("width", "100%")
                            .set("background-color", "transparent")
                            .set("color", "var(--text)")
                            .set("justify-content", "flex-start"),
                    )
                    .into_node(),
            );
            children.push(
                Button::new()
                    .on_click(EventHandler::new(async |set_state| {
                        set_state(Box::new(|state: AppState| -> AppState {
                            AppState {
                                current_key: None,
                                is_header_popover_open: false,
                                ..state.clone()
                            }
                        }));
                    }))
                    .children([text(i18n::tr(state, "Log Out", "ログアウト", "Elsaluti"))])
                    .style(
                        Style::new()
                            .set("width", "100%")
                            .set("background-color", "transparent")
                            .set("color", "#fca5a5")
                            .set("justify-content", "flex-start"),
                    )
                    .into_node(),
            );
            children
        })
        .into_node()
}
