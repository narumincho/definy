use dioxus::prelude::*;

use crate::page_context::PageContext;
use crate::{AppState, Location};

struct AccountRow {
    account_id: definy_event::event::AccountId,
    event_count: usize,
    latest_time: chrono::DateTime<chrono::Utc>,
}

#[component]
pub fn AccountListView(state: AppState, context: PageContext) -> Element {
    let account_name_map = state.account_name_map();
    let mut rows = collect_account_rows(&state);
    rows.sort_by_key(|b| std::cmp::Reverse(b.latest_time));
    let page_shell_style = crate::layout::page_shell_style("1.2rem");

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            h2 { style: "font-size: 1.4rem; font-weight: 600;",
                "{context.language.label(\"Accounts\", \"アカウント\", \"Kontoj\")}"
            }
            if rows.is_empty() {
                div {
                    class: "event-detail-card",
                    style: "padding: 3rem 1.5rem; text-align: center; display: grid; gap: 0.5rem; justify-items: center; color: var(--text-secondary);",
                    div { style: "font-size: 1.5rem; opacity: 0.5;", "👥" }
                    div { style: "font-size: 0.95rem; color: var(--text);",
                        "{context.language.label(\"No accounts yet\", \"まだアカウントがありません\", \"Ankoraŭ neniuj kontoj\")}"
                    }
                }
            } else {
                div {
                    class: "event-list",
                    style: "display: grid; gap: 0.45rem;",
                    for row in rows {
                        {
                            let encoded = row.account_id.to_string();
                            let name = crate::app_state::account_display_name(
                                &account_name_map,
                                &row.account_id,
                            );
                            let time_str = row.latest_time.format("%Y-%m-%d %H:%M:%S").to_string();
                            let ev_count = row.event_count;
                            let activity_label = format!(
                                "{} {}",
                                context
                                    .language
                                    .label(
                                        "Latest activity:",
                                        "最新のアクティビティ:",
                                        "Lasta aktiveco:",
                                    ),
                                time_str,
                            );
                            rsx! {
                                a {
                                    key: "{encoded}",
                                    class: "event-card",
                                    href: context.href_with_lang(Location::Account(row.account_id)),
                                    style: "display: grid; gap: 0.35rem; padding: 0.55rem 0.8rem; text-decoration: none; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);",
                                    div { style: "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.45rem; font-size: 0.84rem;",
                                        div { style: "display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; min-width: 0;",
                                            span { style: "font-size: 0.95rem; font-weight: 600; color: var(--text);",
                                                "{name}"
                                            }
                                            span {
                                                class: "badge",
                                                style: "font-size: 0.72rem; color: var(--primary); background: rgb(124 192 216 / 0.1); padding: 0.1rem 0.4rem; border-radius: var(--radius-full);",
                                                "{ev_count} events"
                                            }
                                        }
                                        span { style: "font-size: 0.74rem; color: var(--text-secondary); opacity: 0.75; margin-left: auto;",
                                            "{activity_label}"
                                        }
                                    }
                                    div {
                                        class: "mono",
                                        style: "font-size: 0.74rem; color: var(--text-secondary); opacity: 0.65; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;",
                                        "{encoded}"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

fn collect_account_rows(state: &AppState) -> Vec<AccountRow> {
    let mut map: std::collections::HashMap<
        definy_event::event::AccountId,
        (usize, chrono::DateTime<chrono::Utc>),
    > = std::collections::HashMap::new();

    for (_, event) in state.event_cache.values().flatten() {
        let entry = map
            .entry(event.account_id.clone())
            .or_insert((0, event.time));
        entry.0 += 1;
        if event.time > entry.1 {
            entry.1 = event.time;
        }
    }

    map.into_iter()
        .map(|(account_id, (event_count, latest_time))| AccountRow {
            account_id,
            event_count,
            latest_time,
        })
        .collect()
}
