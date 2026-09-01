use dioxus::prelude::*;

use crate::app_state::{AppState, replace_local_event_records};
use crate::language::Language;
use crate::local_event::LocalEventStatus;
use crate::page_context::PageContext;

fn status_label(language: Language, status: &LocalEventStatus) -> &'static str {
    match status {
        LocalEventStatus::Queued => language.label("Queued", "送信待ち", "Atendanta"),
        LocalEventStatus::Sent => language.label("Sent", "送信済み", "Sendita"),
        LocalEventStatus::Failed => language.label("Failed", "送信失敗", "Malsukcesis"),
    }
}

fn status_color(status: &LocalEventStatus) -> &'static str {
    match status {
        LocalEventStatus::Queued => "#fbbf24",
        LocalEventStatus::Sent => "#34d399",
        LocalEventStatus::Failed => "#f87171",
    }
}

fn format_time_ms(language: Language, time_ms: i64) -> String {
    chrono::DateTime::<chrono::Utc>::from_timestamp_millis(time_ms)
        .map(|t| t.format("%Y-%m-%d %H:%M:%S").to_string())
        .unwrap_or_else(|| language.label("unknown", "不明", "nekonata").to_string())
}

#[component]
pub fn LocalEventQueueView(state: AppState, context: PageContext) -> Element {
    let language = context.language;
    let page_shell_style = crate::layout::page_shell_style("1.2rem");

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            div { style: "display: flex; justify-content: space-between; align-items: center; gap: 0.8rem; flex-wrap: wrap;",
                div { style: "display: grid; gap: 0.2rem;",
                    h2 { style: "font-size: 1.4rem; font-weight: 600; margin: 0;",
                        "{context.language.label(\"Local Events\", \"ローカルイベント\", \"Lokaj eventoj\")}"
                    }
                    div { style: "color: var(--text-secondary); font-size: 0.84rem; display: inline-flex;",
                        "{context.language.label(\"Queue and history stored in IndexedDB\", \"IndexedDB に保存された送信履歴・送信待ちイベント\", \"Vico kaj historio konservitaj en IndexedDB\")}"
                    }
                }
                div { style: "display: flex; gap: 0.5rem;",
                    button {
                        r#type: "button",
                        style: "background: rgb(255 255 255 / 0.08); border: 1px solid var(--border); color: var(--text); padding: 0.4rem 0.8rem; border-radius: 0.5rem; cursor: pointer;",
                        onclick: move |_| {
                            let mut state_sig = use_context::<Signal<AppState>>();
                            state_sig.write().local_event_queue.is_loading = true;
                            spawn(async move {
                                let result = crate::indexed_db::load_event_records().await;
                                let mut next = state_sig.read().clone();
                                match result {
                                    Ok(records) => {
                                        replace_local_event_records(&mut next, records);
                                        next.local_event_queue.is_loading = false;
                                        next.local_event_queue.last_error = None;
                                    }
                                    Err(error) => {
                                        next.local_event_queue.is_loading = false;
                                        next.local_event_queue.last_error = Some(
                                            format!(
                                                "{}: {error:?}",
                                                language
                                                    .label(
                                                        "Failed to load local events",
                                                        "ローカルイベントの読み込みに失敗しました",
                                                        "Malsukcesis ŝargi lokajn eventojn",
                                                    ),
                                            ),
                                        );
                                    }
                                }
                                state_sig.set(next);
                            });
                        },
                        "{context.language.label(\"Refresh\", \"更新\", \"Refreŝigi\")}"
                    }
                    button {
                        r#type: "button",
                        style: "background: rgb(255 255 255 / 0.08); border: 1px solid var(--border); color: var(--text); padding: 0.4rem 0.8rem; border-radius: 0.5rem; cursor: pointer;",
                        onclick: move |_| {
                            let mut state_sig = use_context::<Signal<AppState>>();
                            let current = state_sig.read().force_offline;
                            state_sig.write().force_offline = !current;
                        },
                        if state.force_offline {
                            {
                                context
                                    .language
                                    .label("Offline: On", "オフライン: オン", "Senkonekte: En")
                            }
                        } else {
                            {
                                context
                                    .language
                                    .label("Offline: Off", "オフライン: オフ", "Senkonekte: Malŝaltita")
                            }
                        }
                    }
                }
            }
            if state.local_event_queue.is_loading {
                div { style: "color: var(--text-secondary); font-size: 0.88rem; text-align: center; padding: 1.5rem;",
                    "{context.language.label(\"Loading...\", \"読み込み中...\", \"Ŝargado...\")}"
                }
            } else if let Some(error) = &state.local_event_queue.last_error {
                div {
                    class: "error-card",
                    style: "font-size: 0.86rem; color: var(--error); padding: 0.8rem; background: rgb(248 113 113 / 0.1); border-radius: var(--radius-sm);",
                    "{error}"
                }
            }
            if state.local_event_queue.items.is_empty() && !state.local_event_queue.is_loading {
                div {
                    class: "event-detail-card",
                    style: "padding: 3rem 1.5rem; text-align: center; display: grid; gap: 0.5rem; justify-items: center; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
                    div { style: "font-size: 1.5rem; opacity: 0.5;", "⚡" }
                    div { style: "font-size: 0.95rem; color: var(--text);",
                        "{context.language.label(\"No local events in queue\", \"キューにローカルイベントはありません\", \"Neniuj lokaj eventoj en vico\")}"
                    }
                }
            } else {
                div {
                    class: "event-list",
                    style: "display: grid; gap: 0.75rem;",
                    for record in &state.local_event_queue.items {
                        {
                            let status = record.status.clone();
                            let hash = record.hash.clone();
                            let summary = match definy_event::verify_and_deserialize(&record.event_binary) {
                                Ok((_, event)) => {
                                    crate::event_presenter::event_summary_text(context.language, &event)
                                }
                                Err(_) => {
                                    context
                                        .language
                                        .label("Invalid event", "無効なイベント", "Nevalida evento")
                                        .to_string()
                                }
                            };
                            let time_formatted = format_time_ms(context.language, record.updated_at_ms);
                            let bg_color = status_color(&status);
                            let lbl = status_label(context.language, &status);
                            let err_msg = record.last_error.clone();
                            rsx! {
                                div {
                                    key: "{hash}",
                                    class: "event-card",
                                    style: "display: grid; gap: 0.4rem; padding: 0.85rem 1rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
                                    div { style: "display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;",
                                        div { style: "background: {bg_color}; color: #0b0f19; padding: 0.12rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; display: inline-flex;",
                                            "{lbl}"
                                        }
                                        div {
                                            class: "mono",
                                            style: "color: var(--text-secondary); font-size: 0.78rem;",
                                            "{hash}"
                                        }
                                    }
                                    div { style: "font-weight: 600; font-size: 0.92rem;", "{summary}" }
                                    div { style: "color: var(--text-secondary); font-size: 0.78rem;", "{time_formatted}" }
                                    if let Some(err) = err_msg {
                                        div { style: "color: #fca5a5; font-size: 0.78rem; word-break: break-word;",
                                            "{err}"
                                        }
                                    }
                                    if status != LocalEventStatus::Sent {
                                        div { style: "display: flex; gap: 0.4rem;",
                                            button {
                                                r#type: "button",
                                                style: "background: transparent; border: 1px solid var(--border); color: var(--text); padding: 0.3rem 0.6rem; border-radius: 0.45rem; cursor: pointer;",
                                                onclick: {
                                                    let hash_c = hash.clone();
                                                    move |_| {
                                                        let hash_c = hash_c.clone();
                                                        let mut state_sig = use_context::<Signal<AppState>>();
                                                        spawn(async move {
                                                            let result = crate::indexed_db::remove_event_record(&hash_c).await;
                                                            let mut next = state_sig.read().clone();
                                                            match result {
                                                                Ok(()) => {
                                                                    next.local_event_queue.items.retain(|item| item.hash != hash_c);
                                                                }
                                                                Err(error) => {
                                                                    next.local_event_queue.last_error = Some(
                                                                        format!(
                                                                            "{}: {error:?}",
                                                                            language
                                                                                .label(
                                                                                    "Failed to cancel queued event",
                                                                                    "キュー済みイベントのキャンセルに失敗しました",
                                                                                    "Malsukcesis nuligi envicigitan eventon",
                                                                                ),
                                                                        ),
                                                                    );
                                                                }
                                                            }
                                                            state_sig.set(next);
                                                        });
                                                    }
                                                },
                                                "{context.language.label(\"Cancel\", \"キャンセル\", \"Nuligi\")}"
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
    }
}
