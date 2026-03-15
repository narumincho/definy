use narumincho_vdom::*;

use crate::i18n;
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
        .style(crate::layout::page_shell_style("1rem"))
        .children([
            H2::new()
                .style(Style::new().set("font-size", "1.3rem"))
                .children([text(i18n::tr(state, "Accounts", "アカウント", "Kontoj"))])
                .into_node(),
            if rows.is_empty() {
                Div::new()
                    .class("event-detail-card")
                    .style(Style::new().set("padding", "0.9rem"))
                    .children([text(i18n::tr(
                        state,
                        "No accounts yet.",
                        "まだアカウントがありません。",
                        "Ankoraŭ neniuj kontoj.",
                    ))])
                    .into_node()
            } else {
                Div::new()
                    .class("event-list")
                    .style(Style::new().set("display", "grid").set("gap", "0.6rem"))
                    .children(
                        rows.into_iter()
                            .map(|row| {
                                let encoded =
                                    crate::hash_format::encode_bytes(row.account_id.0.as_ref());
                                let name = crate::app_state::account_display_name(
                                    &account_name_map,
                                    &row.account_id,
                                );
                                A::<AppState, Location>::new()
                                    .class("event-card")
                                    .href(state.href_with_lang(Location::Account(row.account_id)))
                                    .style(
                                        Style::new()
                                            .set("display", "grid")
                                            .set("gap", "0.4rem")
                                            .set("padding", "0.82rem"),
                                    )
                                    .children([
                                        Div::new()
                                            .style(Style::new().set("font-size", "0.96rem"))
                                            .children([text(name)])
                                            .into_node(),
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.85rem")
                                                    .set("color", "var(--text-secondary)"),
                                            )
                                            .children([text(format!(
                                                "{} {}",
                                                row.event_count,
                                                i18n::tr(state, "events", "イベント", "eventoj")
                                            ))])
                                            .into_node(),
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.85rem")
                                                    .set("color", "var(--text-secondary)"),
                                            )
                                            .children([text(format!(
                                                "{} {}",
                                                i18n::tr(state, "latest:", "最新:", "lasta:"),
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
    let mut map = std::collections::HashMap::<
        definy_event::event::AccountId,
        (usize, chrono::DateTime<chrono::Utc>),
    >::new();
    for event_result in state.event_cache.values() {
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
