use narumincho_vdom::*;

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
                        .href(Href::Internal(Location::Home))
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
                                    .set("background", "var(--primary-gradient)")
                                    .set("-webkit-background-clip", "text")
                                    .set("-webkit-text-fill-color", "transparent")
                                    .set("letter-spacing", "-0.03em"),
                            )
                            .children([text("definy")])
                            .into_node()])
                        .into_node(),
                    A::<AppState, Location>::new()
                        .href(Href::Internal(Location::PartList))
                        .style(
                            Style::new()
                                .set("font-size", "0.9rem")
                                .set("color", "var(--text-secondary)"),
                        )
                        .children([text("Parts")])
                        .into_node(),
                    A::<AppState, Location>::new()
                        .href(Href::Internal(Location::ModuleList))
                        .style(
                            Style::new()
                                .set("font-size", "0.9rem")
                                .set("color", "var(--text-secondary)"),
                        )
                        .children([text("Modules")])
                        .into_node(),
                    A::<AppState, Location>::new()
                        .href(Href::Internal(Location::AccountList))
                        .style(
                            Style::new()
                                .set("font-size", "0.9rem")
                                .set("color", "var(--text-secondary)"),
                        )
                        .children([text("Accounts")])
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
            match &state.current_key {
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
                    .children([text("Log In / Sign Up")])
                    .into_node(),
            },
        ])
        .into_node()
}

fn popover(state: &AppState) -> Node<AppState> {
    let account_link = state.current_key.as_ref().map(|key| {
        let account_id = definy_event::event::AccountId(Box::new(key.verifying_key().to_bytes()));
        let account_name = crate::app_state::account_display_name(&state.account_name_map(), &account_id);
        A::<AppState, Location>::new()
            .href(Href::Internal(Location::Account(account_id)))
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
                                current_key: None,
                                is_header_popover_open: false,
                                ..state.clone()
                            }
                        }));
                    }))
                    .children([text("Log Out")])
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
