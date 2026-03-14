use narumincho_vdom::*;

use crate::app_state::{replace_local_event_records, AppState};
use crate::local_event::LocalEventStatus;

fn status_label(status: &LocalEventStatus) -> &'static str {
    match status {
        LocalEventStatus::Queued => "送信待ち",
        LocalEventStatus::Sent => "送信済み",
        LocalEventStatus::Failed => "送信失敗",
    }
}

fn status_color(status: &LocalEventStatus) -> &'static str {
    match status {
        LocalEventStatus::Queued => "#fbbf24",
        LocalEventStatus::Sent => "#34d399",
        LocalEventStatus::Failed => "#f87171",
    }
}

fn format_time_ms(time_ms: i64) -> String {
    chrono::DateTime::<chrono::Utc>::from_timestamp_millis(time_ms)
        .map(|t| t.format("%Y-%m-%d %H:%M:%S").to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

pub fn local_event_queue_view(state: &AppState) -> Node<AppState> {
    let refresh_button = Button::new()
        .on_click(EventHandler::new(async |set_state| {
            let set_state = std::rc::Rc::new(set_state);
            let set_state_for_async = set_state.clone();
            set_state(Box::new(|state: AppState| {
                let mut next = state.clone();
                next.local_event_queue.is_loading = true;
                next
            }));
            let result = crate::indexed_db::load_event_send_records().await;
            set_state_for_async(Box::new(move |state: AppState| {
                let mut next = state.clone();
                match result {
                    Ok(records) => {
                        replace_local_event_records(&mut next, records);
                        next.local_event_queue.is_loading = false;
                        next.local_event_queue.last_error = None;
                    }
                    Err(error) => {
                        next.local_event_queue.is_loading = false;
                        next.local_event_queue.last_error =
                            Some(format!("Failed to load local events: {error:?}"));
                    }
                }
                next
            }));
        }))
        .style(
            Style::new()
                .set("background", "rgba(255, 255, 255, 0.08)")
                .set("border", "1px solid var(--border)")
                .set("color", "var(--text)")
                .set("padding", "0.4rem 0.8rem")
                .set("border-radius", "0.5rem"),
        )
        .children([text("Refresh")])
        .into_node();

    let offline_toggle = Button::new()
        .on_click(EventHandler::new(async |set_state| {
            set_state(Box::new(|state: AppState| {
                let mut next = state.clone();
                next.force_offline = !next.force_offline;
                next
            }));
        }))
        .style(
            Style::new()
                .set("background", "rgba(255, 255, 255, 0.08)")
                .set("border", "1px solid var(--border)")
                .set("color", "var(--text)")
                .set("padding", "0.4rem 0.8rem")
                .set("border-radius", "0.5rem"),
        )
        .children([text(if state.force_offline {
            "Offline: On"
        } else {
            "Offline: Off"
        })])
        .into_node();

    let mut list_items = Vec::new();
    if state.local_event_queue.items.is_empty() {
        list_items.push(
            Div::new()
                .style(Style::new().set("color", "var(--text-secondary)"))
                .children([text("No local events")])
                .into_node(),
        );
    } else {
        for record in &state.local_event_queue.items {
            let status = record.status.clone();
            let hash = record.hash;
            let status_badge = Div::new()
                .style(
                    Style::new()
                        .set("background", status_color(&status))
                        .set("color", "#0b0f19")
                        .set("padding", "0.12rem 0.5rem")
                        .set("border-radius", "999px")
                        .set("font-size", "0.75rem")
                        .set("font-weight", "600")
                        .set("display", "inline-flex"),
                )
                .children([text(status_label(&status))])
                .into_node();

            let summary = match definy_event::verify_and_deserialize(&record.event_binary) {
                Ok((_, event)) => crate::event_presenter::event_summary_text(&event),
                Err(_) => "Invalid event".to_string(),
            };

            let mut actions = Vec::new();
            if status != LocalEventStatus::Sent {
                let hash = hash;
                actions.push(
                    Button::new()
                        .on_click(EventHandler::new(move |set_state| {
                            let hash = hash;
                            async move {
                                let result =
                                    crate::indexed_db::remove_event_send_record(&hash).await;
                                set_state(Box::new(move |state: AppState| {
                                    let mut next = state.clone();
                                    match result {
                                        Ok(()) => {
                                            next.local_event_queue
                                                .items
                                                .retain(|item| item.hash != hash);
                                        }
                                        Err(error) => {
                                            next.local_event_queue.last_error = Some(format!(
                                                "Failed to cancel queued event: {error:?}"
                                            ));
                                        }
                                    }
                                    next
                                }));
                            }
                        }))
                        .style(
                            Style::new()
                                .set("background", "transparent")
                                .set("border", "1px solid var(--border)")
                                .set("color", "var(--text)")
                                .set("padding", "0.3rem 0.6rem")
                                .set("border-radius", "0.45rem"),
                        )
                        .children([text("Cancel")])
                        .into_node(),
                );
            }

            let error_note = record
                .last_error
                .as_ref()
                .map(|error| {
                    Div::new()
                        .style(
                            Style::new()
                                .set("color", "#fca5a5")
                                .set("font-size", "0.78rem")
                                .set("word-break", "break-word"),
                        )
                        .children([text(error)])
                        .into_node()
                })
                .unwrap_or_else(|| Div::new().children([]).into_node());

            list_items.push(
                Div::new()
                    .class("event-card")
                    .style(
                        Style::new()
                            .set("display", "grid")
                            .set("gap", "0.4rem"),
                    )
                    .children([
                        Div::new()
                            .style(
                                Style::new()
                                    .set("display", "flex")
                                    .set("justify-content", "space-between")
                                    .set("align-items", "center")
                                    .set("gap", "0.5rem"),
                            )
                            .children([
                                status_badge,
                                Div::new()
                                    .style(
                                        Style::new()
                                            .set("color", "var(--text-secondary)")
                                            .set("font-size", "0.78rem")
                                            .set("font-family", "'JetBrains Mono', monospace")
                                            .set("display", "inline-flex"),
                                    )
                                    .children([text(crate::hash_format::short_hash32(&hash))])
                                    .into_node(),
                            ])
                            .into_node(),
                        Div::new()
                            .style(
                                Style::new()
                                    .set("font-weight", "600")
                                    .set("font-size", "0.92rem"),
                            )
                            .children([text(summary)])
                            .into_node(),
                        Div::new()
                            .style(
                                Style::new()
                                    .set("color", "var(--text-secondary)")
                                    .set("font-size", "0.78rem"),
                            )
                            .children([text(format_time_ms(record.updated_at_ms))])
                            .into_node(),
                        error_note,
                        if actions.is_empty() {
                            Div::new().children([]).into_node()
                        } else {
                            Div::new()
                                .style(Style::new().set("display", "flex").set("gap", "0.4rem"))
                                .children(actions)
                                .into_node()
                        },
                    ])
                    .into_node(),
            );
        }
    }

    Div::new()
        .class("page-shell")
        .style(crate::layout::page_shell_style("1rem"))
        .children([
            Div::new()
                .style(
                    Style::new()
                        .set("display", "flex")
                        .set("justify-content", "space-between")
                        .set("align-items", "center")
                        .set("gap", "0.8rem"),
                )
                .children([
                    Div::new()
                        .style(Style::new().set("display", "grid").set("gap", "0.2rem"))
                        .children([
                            H2::new().children([text("Local Events")]).into_node(),
                            Div::new()
                                .style(
                                    Style::new()
                                        .set("color", "var(--text-secondary)")
                                        .set("font-size", "0.82rem")
                                        .set("display", "inline-flex"),
                                )
                                .children([text(
                                    "indexedDB に保存された送信履歴・送信待ちイベント",
                                )])
                                .into_node(),
                        ])
                        .into_node(),
                    Div::new()
                        .style(Style::new().set("display", "flex").set("gap", "0.5rem"))
                        .children([refresh_button, offline_toggle])
                        .into_node(),
                ])
                .into_node(),
            if state.local_event_queue.is_loading {
                Div::new()
                    .style(
                        Style::new()
                            .set("color", "var(--text-secondary)")
                            .set("font-size", "0.82rem"),
                    )
                    .children([text("Loading...")])
                    .into_node()
            } else if let Some(error) = &state.local_event_queue.last_error {
                Div::new()
                    .style(
                        Style::new()
                            .set("color", "#fca5a5")
                            .set("font-size", "0.84rem"),
                    )
                    .children([text(error)])
                    .into_node()
            } else {
                Div::new().children([]).into_node()
            },
            Div::new()
                .class("event-list")
                .style(Style::new().set("display", "grid").set("gap", "0.6rem"))
                .children(list_items)
                .into_node(),
        ])
        .into_node()
}
