use definy_event::event::{Event, EventContent};
use narumincho_vdom::*;

use crate::Location;
use crate::app_state::AppState;

pub fn event_detail_view(state: &AppState, target_hash: &[u8; 32]) -> Node<AppState> {
    let account_name_map = state.account_name_map();
    let mut target_event_opt = None;

    for (hash, event_result) in &state.created_account_events {
        if let Ok((_, event)) = event_result {
            if hash == target_hash {
                target_event_opt = Some(event);
            }
        }
    }

    let inner_content = match target_event_opt {
        Some(event) => render_event_detail(target_hash, event, &account_name_map),
        None => Div::new()
            .style(
                Style::new()
                    .set("color", "var(--text-secondary)")
                    .set("text-align", "center")
                    .set("padding", "3rem"),
            )
            .children([text("イベントが見つかりません (Event not found)")])
            .into_node(),
    };

    Div::new()
        .style(
            Style::new()
                .set("display", "grid")
                .set("gap", "2rem")
                .set("width", "100%")
                .set("max-width", "800px")
                .set("margin", "0 auto")
                .set("padding", "2rem 1rem"),
        )
        .children([
            A::<AppState, Location>::new()
                .href(Href::Internal(Location::Home))
                .style(
                    Style::new()
                        .set("display", "inline-flex")
                        .set("align-items", "center")
                        .set("gap", "0.5rem")
                        .set("color", "var(--primary)")
                        .set("text-decoration", "none")
                        .set("font-weight", "500"),
                )
                .children([text("← Back to Home")])
                .into_node(),
            inner_content,
        ])
        .into_node()
}

fn render_event_detail(
    hash: &[u8; 32],
    event: &Event,
    account_name_map: &std::collections::HashMap<definy_event::event::AccountId, Box<str>>,
) -> Node<AppState> {
    let account_name = account_name_map
        .get(&event.account_id)
        .map(|name: &Box<str>| name.as_ref())
        .unwrap_or("Unknown");

    Div::new()
        .style(
            Style::new()
                .set("background", "rgba(255, 255, 255, 0.02)")
                .set("backdrop-filter", "var(--glass-blur)")
                .set("-webkit-backdrop-filter", "var(--glass-blur)")
                .set("border", "1px solid var(--border)")
                .set("border-radius", "var(--radius-lg)")
                .set("padding", "2.5rem")
                .set("box-shadow", "var(--shadow-lg)")
                .set("display", "grid")
                .set("gap", "1.5rem"),
        )
        .children([
            Div::new()
                .style(
                    Style::new()
                        .set("font-size", "0.875rem")
                        .set("color", "var(--text-secondary)")
                        .set("display", "flex")
                        .set("justify-content", "space-between")
                        .set("border-bottom", "1px solid var(--border)")
                        .set("padding-bottom", "1rem")
                        .set("align-items", "center"),
                )
                .children([
                    Div::new()
                        .children([text(&event.time.format("%Y-%m-%d %H:%M:%S").to_string())])
                        .into_node(),
                    Div::new()
                        .class("mono")
                        .style(Style::new().set("opacity", "0.6"))
                        .children([text(&base64::Engine::encode(
                            &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                            event.account_id.0.as_slice(),
                        ))])
                        .into_node(),
                ])
                .into_node(),
            match &event.content {
                EventContent::CreateAccount(create_account_event) => Div::new()
                    .style(
                        Style::new()
                            .set("color", "var(--primary)")
                            .set("font-size", "1.25rem")
                            .set("font-weight", "600"),
                    )
                    .children([
                        text("Account created: "),
                        text(create_account_event.account_name.as_ref()),
                    ])
                    .into_node(),
                EventContent::ChangeProfile(change_profile_event) => Div::new()
                    .style(
                        Style::new()
                            .set("color", "var(--primary)")
                            .set("font-size", "1.25rem")
                            .set("font-weight", "600"),
                    )
                    .children([
                        text("Profile changed: "),
                        text(change_profile_event.account_name.as_ref()),
                    ])
                    .into_node(),
                EventContent::Message(message_event) => Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "1.5rem")
                            .set("line-height", "1.6"),
                    )
                    .children([
                        Div::new()
                            .style(
                                Style::new()
                                    .set("font-size", "1rem")
                                    .set("color", "var(--primary)")
                                    .set("font-weight", "600")
                                    .set("margin-bottom", "0.5rem"),
                            )
                            .children([text(account_name)])
                            .into_node(),
                        text(message_event.message.as_ref()),
                    ])
                    .into_node(),
            },
            Div::new()
                .class("mono")
                .style(
                    Style::new()
                        .set("font-size", "0.75rem")
                        .set("color", "var(--text-secondary)")
                        .set("margin-top", "2.5rem")
                        .set("word-break", "break-all")
                        .set("opacity", "0.6"),
                )
                .children([
                    text("Event Hash: "),
                    text(&base64::Engine::encode(
                        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                        hash,
                    )),
                ])
                .into_node(),
        ])
        .into_node()
}
