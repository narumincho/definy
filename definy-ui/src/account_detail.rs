use definy_event::event::EventContent;
use narumincho_vdom::*;

use crate::expression_eval::expression_to_source;
use crate::{AppState, Location};

pub fn account_detail_view(state: &AppState, account_id_bytes: &[u8; 32]) -> Node<AppState> {
    let account_id = definy_event::event::AccountId(Box::new(*account_id_bytes));
    let account_name_map = state.account_name_map();
    let account_name = account_name_map
        .get(&account_id)
        .map(|name| name.as_ref())
        .unwrap_or("Unknown");
    let encoded_account_id = base64::Engine::encode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        account_id_bytes,
    );

    let account_events = state
        .created_account_events
        .iter()
        .filter_map(|(hash, event_result)| {
            let (_, event) = event_result.as_ref().ok()?;
            if event.account_id.0.as_ref() == account_id_bytes {
                Some((*hash, event))
            } else {
                None
            }
        })
        .collect::<Vec<([u8; 32], &definy_event::event::Event)>>();

    Div::new()
        .class("page-shell")
        .style(
            Style::new()
                .set("display", "grid")
                .set("gap", "1.25rem")
                .set("width", "100%")
                .set("max-width", "800px")
                .set("margin", "0 auto")
                .set("padding", "2rem 1rem"),
        )
        .children([
            A::<AppState, Location>::new()
                .class("back-link")
                .href(Href::Internal(Location::AccountList))
                .style(
                    Style::new()
                        .set("display", "inline-flex")
                        .set("align-items", "center")
                        .set("gap", "0.5rem")
                        .set("color", "var(--primary)")
                        .set("font-weight", "500"),
                )
                .children([text("← Back to Accounts")])
                .into_node(),
            Div::new()
                .class("event-detail-card")
                .style(
                    Style::new()
                        .set("display", "grid")
                        .set("gap", "0.75rem")
                        .set("padding", "1.4rem"),
                )
                .children([
                    H2::new()
                        .style(Style::new().set("font-size", "1.4rem"))
                        .children([text(account_name)])
                        .into_node(),
                    Div::new()
                        .class("mono")
                        .style(
                            Style::new()
                                .set("font-size", "0.78rem")
                                .set("word-break", "break-all")
                                .set("opacity", "0.8"),
                        )
                        .children([text(encoded_account_id)])
                        .into_node(),
                    Div::new()
                        .style(Style::new().set("color", "var(--text-secondary)"))
                        .children([text(format!("{} events", account_events.len()))])
                        .into_node(),
                ])
                .into_node(),
            if account_events.is_empty() {
                Div::new()
                    .class("event-detail-card")
                    .style(
                        Style::new()
                            .set("padding", "1.25rem")
                            .set("color", "var(--text-secondary)"),
                    )
                    .children([text("This account has not posted any events yet.")])
                    .into_node()
            } else {
                Div::new()
                    .class("event-list")
                    .style(Style::new().set("display", "grid").set("gap", "0.75rem"))
                    .children(
                        account_events
                            .into_iter()
                            .map(|(hash, event)| {
                                A::<AppState, Location>::new()
                                    .class("event-card")
                                    .href(Href::Internal(Location::Event(hash)))
                                    .style(
                                        Style::new()
                                            .set("display", "grid")
                                            .set("gap", "0.5rem")
                                            .set("padding", "1rem"),
                                    )
                                    .children([
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.85rem")
                                                    .set("color", "var(--text-secondary)"),
                                            )
                                            .children([text(
                                                event.time.format("%Y-%m-%d %H:%M:%S").to_string(),
                                            )])
                                            .into_node(),
                                        Div::new().children([text(event_summary(event))]).into_node(),
                                    ])
                                    .into_node()
                            })
                            .collect::<Vec<Node<AppState>>>(),
                    )
                    .into_node()
            },
        ])
        .into_node()
}

fn event_summary(event: &definy_event::event::Event) -> String {
    match &event.content {
        EventContent::CreateAccount(create_account_event) => {
            format!("Account created: {}", create_account_event.account_name)
        }
        EventContent::ChangeProfile(change_profile_event) => {
            format!("Profile changed: {}", change_profile_event.account_name)
        }
        EventContent::PartDefinition(part_definition_event) => format!(
            "{} = {}{}",
            part_definition_event.part_name,
            expression_to_source(&part_definition_event.expression),
            if part_definition_event.description.is_empty() {
                String::new()
            } else {
                format!(" - {}", part_definition_event.description)
            }
        ),
        EventContent::PartUpdate(part_update_event) => format!(
            "Part updated: {}{} | {}",
            part_update_event.part_name,
            if part_update_event.part_description.is_empty() {
                String::new()
            } else {
                format!(" - {}", part_update_event.part_description)
            },
            expression_to_source(&part_update_event.expression)
        ),
    }
}
