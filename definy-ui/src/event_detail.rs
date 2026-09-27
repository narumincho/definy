use definy_event::EventHashId;
use definy_event::event::{Event, EventContent};
use dioxus::prelude::*;

use crate::Location;
use crate::app_state::AppState;
use crate::expression_eval::expression_to_source;
use crate::page_context::PageContext;

#[component]
pub fn EventDetailView(state: AppState, context: PageContext, target_hash: EventHashId) -> Element {
    let account_name_map = state.account_name_map();
    let mut target_event_opt = None;

    for (hash, event_result) in &state.event_cache {
        if let Ok((_, event)) = event_result
            && hash == &target_hash
        {
            target_event_opt = Some(event.clone());
        }
    }

    let page_shell_style = crate::layout::page_shell_style("1.2rem");

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            if let Some(event) = target_event_opt {
                RenderEventDetail {
                    state: state.clone(),
                    context: context.clone(),
                    hash: target_hash.clone(),
                    event: event.clone(),
                    account_name_map: account_name_map.clone(),
                }
            } else {
                div { style: "color: var(--text-secondary); text-align: center; padding: 1.8rem;",
                    "{context.language.label(\"Event not found\", \"イベントが見つかりません\", \"Evento ne trovita\")}"
                }
            }
        }
    }
}

#[component]
fn RenderEventDetail(
    state: AppState,
    context: PageContext,
    hash: EventHashId,
    event: Event,
    account_name_map: std::collections::HashMap<definy_event::event::AccountId, Box<str>>,
) -> Element {
    let account_name = crate::app_state::account_display_name(&account_name_map, &event.account_id);
    let hash_str = hash.to_string();
    let time_str = event.time.format("%Y-%m-%d %H:%M:%S").to_string();

    rsx! {
        div { style: "display: grid; gap: 1rem;",
            div {
                class: "event-detail-card",
                style: "display: grid; gap: 1rem; padding: 1.2rem 1.4rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
                div { style: "display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.8rem; flex-wrap: wrap; gap: 0.5rem;",
                    div { style: "display: flex; align-items: center; gap: 0.75rem;",
                        div { style: "font-size: 1.25rem; font-weight: 600;",
                            "{crate::event_presenter::event_kind_label(context.language, &event)}"
                        }
                    }
                    a {
                        href: context.href_with_lang(Location::ApiExplorer(Some(hash.clone()))),
                        style: "text-decoration: none; padding: 0.35rem 0.75rem; font-size: 0.8rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--primary); display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 500;",
                        "🔬 {context.language.label(\"Inspect RPC & CBOR\", \"RPC & CBOR を検査\", \"Inspekti RPC & CBOR\")}"
                    }
                }
                div { style: "display: grid; gap: 0.75rem;",
                    div { style: "display: grid; gap: 0.25rem;",
                        div { style: "font-size: 0.76rem; color: var(--text-secondary);",
                            "Event ID (Hash)"
                        }
                        div {
                            class: "mono",
                            style: "font-size: 0.84rem; color: var(--primary); background: rgb(0 0 0 / 0.2); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); overflow-x: auto;",
                            "{hash_str}"
                        }
                    }
                    div { style: "display: grid; gap: 0.25rem;",
                        div { style: "font-size: 0.76rem; color: var(--text-secondary);",
                            "{context.language.label(\"Created At\", \"作成日時\", \"Kreita je\")}"
                        }
                        div { style: "font-size: 0.88rem;", "{time_str}" }
                    }
                    div { style: "display: grid; gap: 0.25rem;",
                        div { style: "font-size: 0.76rem; color: var(--text-secondary);",
                            "{context.language.label(\"Author\", \"作成者\", \"Aŭtoro\")}"
                        }
                        a {
                            href: context.href_with_lang(Location::Account(event.account_id.clone())),
                            style: "color: var(--primary); text-decoration: none; font-weight: 600;",
                            "{account_name}"
                        }
                    }
                }
                div { style: "border-top: 1px solid var(--border); padding-top: 0.8rem;",
                    RenderDetailContent {
                        state: state.clone(),
                        context: context.clone(),
                        event: event.clone(),
                        hash: hash.clone(),
                    }
                }
            }
        }
    }
}

#[component]
fn RenderDetailContent(
    state: AppState,
    context: PageContext,
    event: Event,
    hash: EventHashId,
) -> Element {
    match event.content {
        EventContent::CreateAccount(create_account_event) => rsx! {
            div { style: "display: grid; gap: 0.4rem;",
                div { style: "font-size: 0.8rem; color: var(--text-secondary);",
                    "{context.language.label(\"Account Name\", \"アカウント名\", \"Kontonomo\")}"
                }
                div { style: "font-size: 1.1rem; font-weight: 600;",
                    "{create_account_event.account_name}"
                }
            }
        },
        EventContent::ChangeProfile(change_profile_event) => rsx! {
            div { style: "display: grid; gap: 0.4rem;",
                div { style: "font-size: 0.8rem; color: var(--text-secondary);",
                    "{context.language.label(\"New Account Name\", \"新しいアカウント名\", \"Nova kontonomo\")}"
                }
                div { style: "font-size: 1.1rem; font-weight: 600;",
                    "{change_profile_event.account_name}"
                }
            }
        },
        EventContent::ModuleCommit(module_commit_event) => {
            let module_id = definy_event::event::derive_module_id(
                &event.account_id,
                &module_commit_event.module_name,
            );
            let open_detail_label = context.language.label(
                "Open module detail →",
                "モジュール詳細を開く →",
                "Malfermi modulajn detalojn →",
            );
            let parts_label = context.language.label(
                "Committed parts:",
                "コミットされたパーツ:",
                "Enmetitaj partoj:",
            );
            let parts_count = module_commit_event.parts.len();
            let commit_message = if module_commit_event.message.trim().is_empty() {
                context.language.label(
                    "(no commit message)",
                    "(コミットメッセージなし)",
                    "(sen enmeta mesaĝo)",
                )
            } else {
                &module_commit_event.message
            };
            let parent_commit_hash = module_commit_event.parent_commit_hash.clone();
            let parent_short = parent_commit_hash.as_ref().map(|p| {
                let s = p.to_string();
                if s.len() > 7 {
                    format!("#{}", &s[..7])
                } else {
                    format!("#{}", s)
                }
            });
            let parent_title = parent_commit_hash.as_ref().map(ToString::to_string);

            rsx! {
                div { style: "display: flex; flex-direction: column; gap: 0.8rem;",
                    div { style: "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;",
                        div { style: "display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap;",
                            div { style: "font-size: 1.15rem; font-weight: 700;",
                                "{module_commit_event.module_name}"
                            }
                            div { style: "font-size: 0.95rem; color: var(--text-secondary);",
                                "{commit_message}"
                            }
                        }
                        a {
                            href: context.href_with_lang(Location::Module(module_id.clone())),
                            style: "font-size: 0.84rem; color: var(--primary); text-decoration: none; font-weight: 500;",
                            "{open_detail_label}"
                        }
                    }
                    div { style: "display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;",
                        if let (Some(p_hash), Some(p_short)) = (parent_commit_hash, parent_short) {
                            div { style: "display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem;",
                                span { style: "color: var(--text-secondary);",
                                    {context.language.label("Parent commit:", "親コミット:", "Gepatra enmeto:")}
                                }
                                a {
                                    href: context.href_with_lang(Location::Event(p_hash)),
                                    class: "mono",
                                    style: "color: var(--primary); text-decoration: none; background: rgb(124 192 216 / 0.1); padding: 0.1rem 0.4rem; border-radius: var(--radius-xs); border: 1px solid var(--border);",
                                    title: parent_title.as_deref().unwrap_or_default(),
                                    "{p_short}"
                                }
                            }
                        } else {
                            span { style: "color: #a78bfa; font-size: 0.75rem; background: rgba(167, 139, 250, 0.1); border: 1px solid rgba(167, 139, 250, 0.25); padding: 0.15rem 0.45rem; border-radius: var(--radius-xs);",
                                "🌱 Initial Commit (root)"
                            }
                        }
                    }
                    div { style: "font-size: 0.86rem; color: var(--text-secondary); font-weight: 600; margin-top: 0.3rem;",
                        "{parts_label} ({parts_count})"
                    }
                    div { style: "display: flex; flex-direction: column; gap: 0.4rem;",
                        for part in &module_commit_event.parts {
                            {
                                let part_id = definy_event::event::derive_module_part_id(&module_id, &part.name);
                                let content_hash = part
                                    .expression
                                    .as_ref()
                                    .and_then(|e| definy_event::ContentHash::from_expression(e).ok());
                                let (ch_str, short_ch) = if let Some(ch) = &content_hash {
                                    let s = ch.to_string();
                                    let short = if s.len() > 7 {
                                        format!("#{}", &s[..7])
                                    } else {
                                        format!("#{}", s)
                                    };
                                    (Some(s), Some(short))
                                } else {
                                    (None, None)
                                };
                                let expr_source = part.expression.as_ref().map(expression_to_source);
                                rsx! {
                                    div {
                                        key: "{part.name}",
                                        style: "display: flex; align-items: center; justify-content: space-between; padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); background: var(--bg-surface); border: 1px solid var(--border); gap: 0.6rem; flex-wrap: wrap;",
                                        div { style: "display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;",
                                            a {
                                                href: context.href_with_lang(Location::Part(part_id)),
                                                style: "font-weight: 600; font-size: 0.9rem; color: var(--primary); text-decoration: none;",
                                                "{part.name}"
                                            }
                                            if let Some(pt) = &part.part_type {
                                                span { class: "badge badge-type mono", style: "font-size: 0.72rem;", "{pt}" }
                                            }
                                            if let (Some(full_ch), Some(short_ch)) = (ch_str, short_ch) {
                                                span {
                                                    class: "mono",
                                                    style: "font-size: 0.72rem; color: #38bdf8; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); padding: 0.1rem 0.35rem; border-radius: var(--radius-xs); display: inline-flex; align-items: center; gap: 0.2rem;",
                                                    title: "ContentHash: {full_ch}",
                                                    span { "📌" }
                                                    span { "{short_ch}" }
                                                }
                                            }
                                        }
                                        if let Some(expr_str) = expr_source {
                                            div {
                                                class: "mono",
                                                style: "font-size: 0.8rem; color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;",
                                                "{expr_str}"
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

#[cfg(test)]
mod tests {
    use crate::expression_eval::evaluate_expression;

    fn evaluate_message_result(
        language: &crate::language::Language,
        expression: &definy_event::event::Expression,
        events: &[crate::app_state::EventWithHash],
    ) -> String {
        match evaluate_expression(expression, events) {
            Ok(value) => format!(
                "{} {}",
                language.label("Result:", "結果:", "Rezulto:"),
                value
            ),
            Err(error) => format!(
                "{} {}",
                language.label("Error:", "エラー:", "Eraro:"),
                error
            ),
        }
    }

    #[test]
    fn evaluate_message_in_detail() {
        let expression = definy_event::event::Expression::Add(definy_event::event::AddExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 10 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 32 },
            )),
        });
        assert_eq!(
            evaluate_message_result(&crate::language::Language::English, &expression, &[]),
            "Result: 42"
        );
    }
}
