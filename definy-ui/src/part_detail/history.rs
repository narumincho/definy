use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::Location;
use crate::app_state::AppState;
use crate::page_context::PageContext;

pub(crate) fn resolve_part_commit_info(
    language: crate::language::Language,
    part_name: &str,
    ev: &definy_event::event::Event,
) -> (
    String,
    Option<EventHashId>,
    Option<definy_event::ContentHash>,
) {
    match &ev.content {
        definy_event::event::EventContent::ModuleCommit(mc) => {
            let msg = if mc.message.trim().is_empty() {
                language
                    .label(
                        "Commit (no message)",
                        "コミット (メッセージなし)",
                        "Enmeto (sen mesaĝo)",
                    )
                    .to_string()
            } else {
                mc.message.to_string()
            };
            let p_hash = mc.parent_commit_hash.clone();
            let p_entry = mc.parts.iter().find(|p| p.name.as_ref() == part_name);
            let ch = p_entry
                .and_then(|p| p.expression.as_ref())
                .and_then(|e| definy_event::ContentHash::from_expression(e).ok());
            (msg, p_hash, ch)
        }
        _ => (
            crate::event_presenter::event_kind_label(language, ev).to_string(),
            None,
            None,
        ),
    }
}

#[component]
pub(crate) fn PartHistoryCard(
    state: AppState,
    context: PageContext,
    part_name: String,
    related_events: Vec<(EventHashId, definy_event::event::Event)>,
) -> Element {
    let account_name_map = state.account_name_map();
    let language = context.language;

    rsx! {
        div {
            class: "event-detail-card",
            style: "display: grid; gap: 0.75rem; padding: 1.1rem 1.25rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);",
            div { style: "display: flex; align-items: center; justify-content: space-between;",
                div { style: "font-size: 0.95rem; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 0.4rem;",
                    span { "📜" }
                    span {
                        "{language.label(\"Version & Commit History\", \"バージョン・コミット履歴\", \"Versia kaj enmeta historio\")}"
                    }
                }
                span { style: "font-size: 0.75rem; color: var(--text-secondary);",
                    "{related_events.len()} {language.label(\"commits\", \"コミット\", \"enmetoj\")}"
                }
            }
            if related_events.is_empty() {
                div { style: "color: var(--text-secondary); font-size: 0.85rem; padding: 0.5rem 0;",
                    "{language.label(\"No history found.\", \"履歴はありません。\", \"Neniu historio trovita.\")}"
                }
            } else {
                div { style: "display: grid; gap: 0.6rem;",
                    for (index, (event_hash, ev)) in related_events.iter().enumerate() {
                        PartCommitHistoryItem {
                            key: "{event_hash}",
                            context: context.clone(),
                            account_name_map: account_name_map.clone(),
                            part_name: part_name.clone(),
                            index,
                            event_hash: event_hash.clone(),
                            event: ev.clone(),
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn PartCommitHistoryItem(
    context: PageContext,
    account_name_map: std::collections::HashMap<definy_event::event::AccountId, Box<str>>,
    part_name: String,
    index: usize,
    event_hash: EventHashId,
    event: definy_event::event::Event,
) -> Element {
    let language = context.language;
    let time_str = event.time.format("%Y-%m-%d %H:%M:%S").to_string();
    let hash_str = event_hash.to_string();
    let short_event_hash = if hash_str.len() > 7 {
        format!("#{}", &hash_str[..7])
    } else {
        format!("#{}", hash_str)
    };
    let author_name = crate::app_state::account_display_name(&account_name_map, &event.account_id);
    let (commit_message, parent_hash, part_content_hash) =
        resolve_part_commit_info(language, &part_name, &event);
    let is_latest = index == 0;
    let ch_display = part_content_hash.as_ref().map(|h| {
        let s = h.to_string();
        if s.len() > 7 {
            format!("#{}", &s[..7])
        } else {
            format!("#{}", s)
        }
    });
    let ch_full_title = format!(
        "ContentHash: {}",
        part_content_hash
            .as_ref()
            .map(ToString::to_string)
            .unwrap_or_default(),
    );
    let parent_short = parent_hash.as_ref().map(|p| {
        let s = p.to_string();
        if s.len() > 7 {
            format!("#{}", &s[..7])
        } else {
            format!("#{}", s)
        }
    });
    let parent_title = parent_hash.as_ref().map(ToString::to_string);

    rsx! {
        div { style: "display: grid; gap: 0.45rem; padding: 0.65rem 0.85rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: rgb(255 255 255 / 0.02);",
            div { style: "display: flex; align-items: flex-start; justify-content: space-between; gap: 0.6rem; flex-wrap: wrap;",
                div { style: "display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;",
                    if is_latest {
                        span {
                            class: "badge",
                            style: "font-size: 0.68rem; font-weight: 600; color: #34d399; background: rgba(52, 211, 153, 0.15); border: 1px solid rgba(52, 211, 153, 0.3); padding: 0.05rem 0.4rem; border-radius: var(--radius-full);",
                            "HEAD"
                        }
                    }
                    span { style: "font-size: 0.88rem; font-weight: 600; color: var(--text);",
                        "{commit_message}"
                    }
                }
                div { style: "display: flex; align-items: center; gap: 0.5rem; font-size: 0.76rem; color: var(--text-secondary);",
                    span { "👤 {author_name}" }
                    span { "•" }
                    span { "{time_str}" }
                }
            }
            div { style: "display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-size: 0.75rem;",
                a {
                    href: context.href_with_lang(Location::Event(event_hash.clone())),
                    class: "mono",
                    style: "color: var(--primary); text-decoration: none; display: inline-flex; align-items: center; gap: 0.2rem; background: rgb(124 192 216 / 0.08); padding: 0.1rem 0.4rem; border-radius: var(--radius-xs); border: 1px solid var(--border);",
                    title: "{event_hash}",
                    span { "Commit:" }
                    span { "{short_event_hash}" }
                }
                if let Some(ch_str) = ch_display {
                    div {
                        class: "mono",
                        style: "color: #38bdf8; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); padding: 0.1rem 0.45rem; border-radius: var(--radius-xs); display: inline-flex; align-items: center; gap: 0.25rem;",
                        title: "{ch_full_title}",
                        span { "📌 Part Hash:" }
                        span { "{ch_str}" }
                    }
                }
                if let (Some(p_hash), Some(p_short)) = (parent_hash, parent_short) {
                    a {
                        href: context.href_with_lang(Location::Event(p_hash)),
                        class: "mono",
                        style: "color: var(--text-secondary); text-decoration: none; display: inline-flex; align-items: center; gap: 0.2rem; background: rgb(255 255 255 / 0.04); padding: 0.1rem 0.4rem; border-radius: var(--radius-xs); border: 1px solid var(--border);",
                        title: parent_title.as_deref().unwrap_or_default(),
                        span { "Parent:" }
                        span { "{p_short}" }
                    }
                } else {
                    span { style: "color: #a78bfa; font-size: 0.72rem; background: rgba(167, 139, 250, 0.1); border: 1px solid rgba(167, 139, 250, 0.25); padding: 0.1rem 0.4rem; border-radius: var(--radius-xs);",
                        "🌱 Initial Commit"
                    }
                }
            }
        }
    }
}
