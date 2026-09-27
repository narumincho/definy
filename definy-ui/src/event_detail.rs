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
                div { style: "display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.8rem;",
                    div { style: "display: flex; align-items: center; gap: 0.75rem;",
                        div { style: "font-size: 1.25rem; font-weight: 600;",
                            "{crate::event_presenter::event_kind_label(context.language, &event)}"
                        }
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
            rsx! {
                div { style: "display: flex; flex-direction: column; gap: 0.8rem;",
                    div { style: "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;",
                        div { style: "display: flex; align-items: baseline; gap: 0.6rem;",
                            div { style: "font-size: 1.15rem; font-weight: 700;",
                                "{module_commit_event.module_name}"
                            }
                            div { style: "font-size: 0.95rem; color: var(--text-secondary);",
                                "{module_commit_event.message}"
                            }
                        }
                        a {
                            href: context.href_with_lang(Location::Module(module_id)),
                            style: "font-size: 0.84rem; color: var(--primary); text-decoration: none; font-weight: 500;",
                            "{open_detail_label}"
                        }
                    }
                    div { style: "font-size: 0.86rem; color: var(--text-secondary); font-weight: 600;",
                        "{parts_label} ({parts_count})"
                    }
                    div { style: "display: flex; flex-direction: column; gap: 0.4rem;",
                        for part in &module_commit_event.parts {
                            div {
                                key: "{part.name}",
                                style: "display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.7rem; border-radius: var(--radius-sm); background: var(--bg-surface); border: 1px solid var(--border);",
                                div { style: "display: flex; align-items: center; gap: 0.5rem;",
                                    span { style: "font-weight: 600; font-size: 0.9rem;",
                                        "{part.name}"
                                    }
                                    if let Some(pt) = &part.part_type {
                                        span {
                                            class: "badge badge-type mono",
                                            style: "font-size: 0.72rem;",
                                            "{pt}"
                                        }
                                    }
                                }
                                if let Some(expr) = &part.expression {
                                    div {
                                        class: "mono",
                                        style: "font-size: 0.8rem; color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;",
                                        "{expression_to_source(expr)}"
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
