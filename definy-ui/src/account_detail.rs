use narumincho_vdom::*;

use crate::{AppState, Location};

pub fn account_detail_view(state: &AppState, account_id_bytes: &[u8; 32]) -> Node<AppState> {
    let account_id = definy_event::event::AccountId(Box::new(*account_id_bytes));
    let account_name_map = state.account_name_map();
    let account_name = account_name_map
        .get(&account_id)
        .map(|name| name.as_ref())
        .unwrap_or("Unknown");
    let encoded_account_id = crate::hash_format::encode_hash32(account_id_bytes);

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
        .style(crate::layout::page_shell_style("1.25rem"))
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
                                        Div::new()
                                            .children([text(crate::event_presenter::event_summary_text(
                                                event,
                                            ))])
                                            .into_node(),
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
