use narumincho_vdom::*;

use crate::{AppState, Location};

struct AccountRow {
    account_id: definy_event::event::AccountId,
    event_count: usize,
    latest_time: chrono::DateTime<chrono::Utc>,
}

pub fn account_list_view(state: &AppState) -> Node<AppState> {
    let account_name_map = state.account_name_map();
    let mut rows = collect_account_rows(state);
    rows.sort_by(|a, b| b.latest_time.cmp(&a.latest_time));

    Div::new()
        .class("page-shell")
        .style(
            Style::new()
                .set("display", "grid")
                .set("gap", "1rem")
                .set("width", "100%")
                .set("max-width", "800px")
                .set("margin", "0 auto")
                .set("padding", "2rem 1rem"),
        )
        .children([
            H2::new()
                .style(Style::new().set("font-size", "1.5rem"))
                .children([text("Accounts")])
                .into_node(),
            if rows.is_empty() {
                Div::new()
                    .class("event-detail-card")
                    .style(Style::new().set("padding", "1.2rem"))
                    .children([text("No accounts yet.")])
                    .into_node()
            } else {
                Div::new()
                    .class("event-list")
                    .style(Style::new().set("display", "grid").set("gap", "0.75rem"))
                    .children(
                        rows.into_iter()
                            .map(|row| {
                                let account_id_bytes = *row.account_id.0.as_ref();
                                let encoded = crate::hash_format::encode_bytes(row.account_id.0.as_ref());
                                let name = account_name_map
                                    .get(&row.account_id)
                                    .map(|n| n.as_ref())
                                    .unwrap_or("Unknown");
                                A::<AppState, Location>::new()
                                    .class("event-card")
                                    .href(Href::Internal(Location::Account(account_id_bytes)))
                                    .style(
                                        Style::new()
                                            .set("display", "grid")
                                            .set("gap", "0.4rem")
                                            .set("padding", "1rem"),
                                    )
                                    .children([
                                        Div::new()
                                            .style(Style::new().set("font-size", "1.1rem"))
                                            .children([text(name)])
                                            .into_node(),
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.85rem")
                                                    .set("color", "var(--text-secondary)"),
                                            )
                                            .children([text(format!("{} events", row.event_count))])
                                            .into_node(),
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.85rem")
                                                    .set("color", "var(--text-secondary)"),
                                            )
                                            .children([text(format!(
                                                "latest: {}",
                                                row.latest_time.format("%Y-%m-%d %H:%M:%S")
                                            ))])
                                            .into_node(),
                                        Div::new()
                                            .class("mono")
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.75rem")
                                                    .set("opacity", "0.8")
                                                    .set("word-break", "break-all"),
                                            )
                                            .children([text(encoded)])
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

fn collect_account_rows(state: &AppState) -> Vec<AccountRow> {
    let mut map =
        std::collections::HashMap::<definy_event::event::AccountId, (usize, chrono::DateTime<chrono::Utc>)>::new();
    for (_, event_result) in &state.created_account_events {
        let (_, event) = if let Ok(v) = event_result {
            v
        } else {
            continue;
        };
        map.entry(event.account_id.clone())
            .and_modify(|(count, latest)| {
                *count += 1;
                if event.time > *latest {
                    *latest = event.time;
                }
            })
            .or_insert((1, event.time));
    }
    map.into_iter()
        .map(|(account_id, (event_count, latest_time))| AccountRow {
            account_id,
            event_count,
            latest_time,
        })
        .collect()
}
