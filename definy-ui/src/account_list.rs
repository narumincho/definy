use narumincho_vdom::*;

use crate::page_context::PageContext;
use crate::{AppState, Location};

struct AccountRow {
    account_id: definy_event::event::AccountId,
    event_count: usize,
    latest_time: chrono::DateTime<chrono::Utc>,
}

pub fn account_list_view(state: &AppState, context: &PageContext) -> Node {
    let account_name_map = state.account_name_map();
    let mut rows = collect_account_rows(state);
    rows.sort_by_key(|b| std::cmp::Reverse(b.latest_time));

    Div::new()
        .class("page-shell")
        .style(crate::layout::page_shell_style("1.2rem"))
        .children([
            H2::new()
                .style(
                    Style::new()
                        .set("font-size", "1.4rem")
                        .set("font-weight", "600"),
                )
                .children([text(context.language.label(
                    "Accounts",
                    "アカウント",
                    "Kontoj",
                ))])
                .into_node(),
            if rows.is_empty() {
                Div::new()
                    .class("event-detail-card")
                    .style(
                        Style::new()
                            .set("padding", "3rem 1.5rem")
                            .set("text-align", "center")
                            .set("display", "grid")
                            .set("gap", "0.5rem")
                            .set("justify-items", "center")
                            .set("color", "var(--text-secondary)"),
                    )
                    .children([
                        Div::new()
                            .style(
                                Style::new()
                                    .set("font-size", "1.5rem")
                                    .set("opacity", "0.5"),
                            )
                            .children([text("👥")])
                            .into_node(),
                        Div::new()
                            .style(
                                Style::new()
                                    .set("font-size", "0.95rem")
                                    .set("color", "var(--text)"),
                            )
                            .children([text(context.language.label(
                                "No accounts yet",
                                "まだアカウントがありません",
                                "Ankoraŭ neniuj kontoj",
                            ))])
                            .into_node(),
                    ])
                    .into_node()
            } else {
                Div::new()
                    .class("event-list")
                    .style(Style::new().set("display", "grid").set("gap", "0.75rem"))
                    .children(
                        rows.into_iter()
                            .map(|row| {
                                let encoded = row.account_id.to_string();
                                let name = crate::app_state::account_display_name(
                                    &account_name_map,
                                    &row.account_id,
                                );
                                A::<Location>::new()
                                    .class("event-card")
                                    .href(context.href_with_lang(Location::Account(row.account_id)))
                                    .style(
                                        Style::new()
                                            .set("display", "grid")
                                            .set("gap", "0.6rem")
                                            .set("padding", "1rem 1.1rem")
                                            .set("text-decoration", "none"),
                                    )
                                    .children([
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("display", "flex")
                                                    .set("justify-content", "space-between")
                                                    .set("align-items", "center"),
                                            )
                                            .children([
                                                Div::new()
                                                    .style(
                                                        Style::new()
                                                            .set("font-size", "1.05rem")
                                                            .set("font-weight", "600")
                                                            .set("color", "var(--text)"),
                                                    )
                                                    .children([text(name)])
                                                    .into_node(),
                                                Div::new()
                                                    .style(
                                                        Style::new()
                                                            .set("font-size", "0.8rem")
                                                            .set("font-weight", "500")
                                                            .set("color", "var(--primary)")
                                                            .set(
                                                                "background",
                                                                "rgb(124 192 216 / 0.12)",
                                                            )
                                                            .set("padding", "0.2rem 0.55rem")
                                                            .set(
                                                                "border-radius",
                                                                "var(--radius-full)",
                                                            ),
                                                    )
                                                    .children([text(format!(
                                                        "{} {}",
                                                        row.event_count,
                                                        context.language.label(
                                                            "events",
                                                            "イベント",
                                                            "eventoj"
                                                        )
                                                    ))])
                                                    .into_node(),
                                            ])
                                            .into_node(),
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.84rem")
                                                    .set("color", "var(--text-secondary)"),
                                            )
                                            .children([text(format!(
                                                "{} {}",
                                                context
                                                    .language
                                                    .label("Latest:", "最新:", "Lasta:"),
                                                row.latest_time.format("%Y-%m-%d %H:%M:%S")
                                            ))])
                                            .into_node(),
                                        Div::new()
                                            .class("mono")
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.76rem")
                                                    .set("color", "var(--text-secondary)")
                                                    .set("border", "1px solid var(--border)")
                                                    .set("padding", "0.25rem 0.5rem")
                                                    .set("border-radius", "4px")
                                                    .set("word-break", "break-all"),
                                            )
                                            .children([text(encoded)])
                                            .into_node(),
                                    ])
                                    .into_node()
                            })
                            .collect::<Vec<Node>>(),
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
