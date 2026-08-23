use narumincho_vdom::*;

use crate::page_context::PageContext;
use crate::{AppState, Location};

pub fn header(state: &AppState, context: &PageContext) -> Node {
    let mut children = vec![header_main(state, context)];
    if state.current_key.is_some() {
        children.push(popover(state, context));
    }
    Div::new().children(children).into_node()
}

fn header_main(state: &AppState, context: &PageContext) -> Node {
    Header::new()
        .class("app-header")
        .style(
            Style::new()
                .set("display", "flex")
                .set("justify-content", "space-between")
                .set("align-items", "center")
                .set("padding", "0.65rem 1.2rem")
                .set("background", "rgb(16 22 27 / 0.8)")
                .set("backdrop-filter", "var(--glass-blur)")
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
                        .set("gap", "1rem"),
                )
                .children([
                    A::<Location>::new()
                        .href(context.href_with_lang(Location::Home))
                        .style(
                            Style::new()
                                .set("text-decoration", "none")
                                .set("display", "inline-flex")
                                .set("align-items", "center")
                                .set("margin-right", "0.3rem"),
                        )
                        .children([H1::new()
                            .style(
                                Style::new()
                                    .set("font-size", "1.45rem")
                                    .set("font-weight", "700")
                                    .set("color", "var(--primary)")
                                    .set("letter-spacing", "-0.03em"),
                            )
                            .children([text("definy")])
                            .into_node()])
                        .into_node(),
                    nav_link(context, Location::PartList, "Parts", "パーツ", "Partoj"),
                    nav_link(
                        context,
                        Location::ModuleList,
                        "Modules",
                        "モジュール",
                        "Moduloj",
                    ),
                    nav_link(
                        context,
                        Location::LocalEventQueue,
                        "Local Events",
                        "ローカルイベント",
                        "Lokaj eventoj",
                    ),
                    nav_link(
                        context,
                        Location::AccountList,
                        "Accounts",
                        "アカウント",
                        "Kontoj",
                    ),
                ])
                .into_node(),
            Div::new()
                .style(
                    Style::new()
                        .set("flex-grow", "1")
                        .set("display", "flex")
                        .set("justify-content", "center")
                        .set("padding", "0 0.8rem"),
                )
                .children([Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "0.86rem")
                            .set("color", "var(--text-secondary)")
                            .set("max-width", "36vw")
                            .set("overflow", "hidden")
                            .set("text-overflow", "ellipsis")
                            .set("white-space", "nowrap"),
                    )
                    .children([text(crate::page_title::page_title_text(state, context))])
                    .into_node()])
                .into_node(),
            {
                let account_button = match &state.current_key {
                    Some(secret_key) => {
                        let account_id = definy_event::event::AccountId(secret_key.verifying_key());
                        let account_name = state.account_name_map().get(&account_id).cloned();

                        Button::new()
                            .type_("button")
                            .command_for("header-popover")
                            .command("show-popover")
                            .style(
                                Style::new()
                                    .set("font-family", "'JetBrains Mono', monospace")
                                    .set("font-size", "0.76rem")
                                    .set("background", "rgb(255 255 255 / 0.06)")
                                    .set("color", "var(--text)")
                                    .set("border", "1px solid var(--border)")
                                    .set("padding", "0.38rem 0.75rem")
                                    .set("border-radius", "var(--radius-sm)")
                                    .set("cursor", "pointer")
                                    .set("max-width", "min(46vw, 360px)")
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
                        .style(
                            Style::new()
                                .set("font-size", "0.84rem")
                                .set("font-weight", "600")
                                .set("background", "var(--primary)")
                                .set("color", "#0e1720")
                                .set("border", "none")
                                .set("padding", "0.4rem 0.88rem")
                                .set("border-radius", "var(--radius-sm)")
                                .set("cursor", "pointer")
                                .set("box-shadow", "0 2px 8px rgb(124 192 216 / 0.22)")
                                .set("transition", "opacity 0.15s ease"),
                        )
                        .children([text(context.language.label(
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
                            .set("gap", "0.65rem"),
                    )
                    .children([language_dropdown(state, context), account_button])
                    .into_node()
            },
        ])
        .into_node()
}

fn nav_link(
    context: &PageContext,
    target: Location,
    label: &'static str,
    label_ja: &'static str,
    label_eo: &'static str,
) -> Node {
    let is_active = match (&context.location, &target) {
        (Some(Location::PartList), Location::PartList) => true,
        (Some(Location::Part(_)), Location::PartList) => true,
        (Some(Location::ModuleList), Location::ModuleList) => true,
        (Some(Location::Module(_)), Location::ModuleList) => true,
        (Some(Location::LocalEventQueue), Location::LocalEventQueue) => true,
        (Some(Location::AccountList), Location::AccountList) => true,
        (Some(Location::Account(_)), Location::AccountList) => true,
        _ => false,
    };
    let mut style = Style::new()
        .set("font-size", "0.88rem")
        .set("padding", "0.3rem 0.6rem")
        .set("border-radius", "var(--radius-sm)")
        .set("transition", "all 0.15s ease")
        .set("text-decoration", "none");
    if is_active {
        style = style
            .set("color", "var(--text)")
            .set("background", "rgb(255 255 255 / 0.08)")
            .set("font-weight", "500");
    } else {
        style = style
            .set("color", "var(--text-secondary)")
            .set("font-weight", "400");
    }
    A::<Location>::new()
        .href(context.href_with_lang(target))
        .style(style)
        .children([text(context.language.label(label, label_ja, label_eo))])
        .into_node()
}

fn language_dropdown(state: &AppState, context: &PageContext) -> Node {
    let location = context.location.clone().unwrap_or(Location::Home);
    let event_type = context.filter_event_type;
    let dropdown = crate::dropdown::searchable_dropdown(
        state,
        "language",
        context.language.to_code(),
        crate::language::SUPPORTED_LANGUAGES
            .iter()
            .map(|language| {
                (
                    language.to_code().to_string(),
                    language.native_name().to_string(),
                )
            })
            .collect::<Vec<_>>()
            .as_slice(),
        std::rc::Rc::new(move |value, label, is_selected| {
            let url = crate::language::Language::from_code(value)
                .map(|language| PageContext::build_url(&location, language.to_code(), event_type))
                .unwrap_or_default();
            Anchor::<Location>::new()
                .href(Href::External(url))
                .style(
                    crate::dropdown::option_style(is_selected)
                        .set("display", "block")
                        .set("text-decoration", "none"),
                )
                .children([text(label)])
                .into_node()
        }),
    );
    match &context.language_requested_code {
        Some(notice) => Div::new()
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
                        notice,
                        context.language.native_name()
                    ))])
                    .into_node(),
            ])
            .into_node(),
        None => dropdown,
    }
}

fn popover(state: &AppState, context: &PageContext) -> Node {
    let account_link = state.current_key.as_ref().map(|key| {
        let account_id = definy_event::event::AccountId(key.verifying_key());
        let account_name =
            crate::app_state::account_display_name(&state.account_name_map(), &account_id);
        A::<Location>::new()
            .href(context.href_with_lang(Location::Account(account_id)))
            .style(
                Style::new()
                    .set("padding", "0.4rem 0.5rem")
                    .set("border-radius", "0.4rem")
                    .set("background", "rgb(255 255 255 / 0.04)")
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
        .popover()
        .style(
            Style::new()
                .set("position-anchor", "--header-popover-button")
                .set("top", "anchor(bottom)")
                .set("left", "auto")
                .set("right", "anchor(right)")
                .set("margin", "4px")
                .set("padding", "0.42rem")
                .set("border", "1px solid var(--border)")
                .set("background", "var(--surface)")
                .set("color", "var(--text)")
                .set("backdrop-filter", "var(--glass-blur)")
                .set("border-radius", "var(--radius-md)")
                .set("box-shadow", "var(--shadow-lg)"),
        )
        .children({
            let mut children = Vec::new();
            if let Some(account_link) = account_link {
                children.push(account_link);
            }
            children.push(
                Button::new()
                    .type_("button")
                    .on_click(EventHandler::new(async |set_state| {
                        set_state(Box::new(|state: AppState| -> AppState {
                            AppState {
                                force_offline: !state.force_offline,
                                ..state.clone()
                            }
                        }));
                    }))
                    .children([text(if state.force_offline {
                        context
                            .language
                            .label("Offline: On", "オフライン: オン", "Senkonekte: En")
                    } else {
                        context.language.label(
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
                            .set("border", "none")
                            .set("cursor", "pointer")
                            .set("padding", "0.4rem 0.5rem")
                            .set("text-align", "left")
                            .set("display", "flex")
                            .set("justify-content", "flex-start"),
                    )
                    .into_node(),
            );
            children.push(
                Button::new()
                    .type_("button")
                    .command("hide-popover")
                    .command_for("header-popover")
                    .children([text(context.language.label(
                        "Log Out",
                        "ログアウト",
                        "Elsaluti",
                    ))])
                    .style(
                        Style::new()
                            .set("width", "100%")
                            .set("background-color", "transparent")
                            .set("color", "#fca5a5")
                            .set("border", "none")
                            .set("cursor", "pointer")
                            .set("padding", "0.4rem 0.5rem")
                            .set("text-align", "left")
                            .set("display", "flex")
                            .set("justify-content", "flex-start"),
                    )
                    .into_node(),
            );
            children
        })
        .into_node()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::app_state::build_initial_state;
    use crate::language::Language;

    #[test]
    fn test_language_dropdown_highlights_selected_language() {
        let state = build_initial_state(vec![], false, false, None, None);

        // 1. 日本語 (ja) の PageContext
        let context_ja = PageContext::from_path_and_query("/", "?lang=ja", None);
        let html_ja = narumincho_vdom::to_html(&header(&state, &context_ja));
        assert_eq!(context_ja.language, Language::Japanese);

        // 日本語リンクにハイライト (var(--primary) と background:rgb(255 255 255 / 0.1))
        let ja_link = html_ja
            .split("<a ")
            .find(|s| s.contains("日本語</a>"))
            .unwrap();
        assert!(ja_link.contains("color:var(--primary)"));
        assert!(ja_link.contains("background:rgb(255 255 255 / 0.1)"));
        // 英語リンクは非選択 (var(--text) と background:transparent)
        let en_link_in_ja = html_ja
            .split("<a ")
            .find(|s| s.contains("English</a>"))
            .unwrap();
        assert!(en_link_in_ja.contains("color:var(--text)"));
        assert!(en_link_in_ja.contains("background:transparent"));

        // 2. エスペラント (eo) の PageContext
        let context_eo = PageContext::from_path_and_query("/", "?lang=eo", None);
        let html_eo = narumincho_vdom::to_html(&header(&state, &context_eo));
        assert_eq!(context_eo.language, Language::Esperanto);
        let eo_link = html_eo
            .split("<a ")
            .find(|s| s.contains("Esperanto</a>"))
            .unwrap();
        assert!(eo_link.contains("color:var(--primary)"));
        assert!(eo_link.contains("background:rgb(255 255 255 / 0.1)"));
        let ja_link_in_eo = html_eo
            .split("<a ")
            .find(|s| s.contains("日本語</a>"))
            .unwrap();
        assert!(ja_link_in_eo.contains("color:var(--text)"));
        assert!(ja_link_in_eo.contains("background:transparent"));

        // 3. 英語 (en) の PageContext
        let context_en = PageContext::from_path_and_query("/", "?lang=en", None);
        let html_en = narumincho_vdom::to_html(&header(&state, &context_en));
        assert_eq!(context_en.language, Language::English);
        let en_link = html_en
            .split("<a ")
            .find(|s| s.contains("English</a>"))
            .unwrap();
        assert!(en_link.contains("color:var(--primary)"));
        assert!(en_link.contains("background:rgb(255 255 255 / 0.1)"));
        let ja_link_in_en = html_en
            .split("<a ")
            .find(|s| s.contains("日本語</a>"))
            .unwrap();
        assert!(ja_link_in_en.contains("color:var(--text)"));
        assert!(ja_link_in_en.contains("background:transparent"));
    }
}
