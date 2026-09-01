use definy_event::EventHashId;
use definy_event::event::{Event, EventContent};
use dioxus::prelude::*;

use crate::Location;
use crate::app_state::AppState;
use crate::expression_eval::{evaluate_expression, expression_to_source};
use crate::page_context::PageContext;

fn part_type_text(part_type: &definy_event::event::PartType) -> String {
    match part_type {
        definy_event::event::PartType::Number => "Number".to_string(),
        definy_event::event::PartType::String => "String".to_string(),
        definy_event::event::PartType::Boolean => "Boolean".to_string(),
        definy_event::event::PartType::Type => "Type".to_string(),
        definy_event::event::PartType::TypePart(hash) => format!("TypePart({})", hash),
        definy_event::event::PartType::List(item_type) => {
            format!("list<{}>", part_type_text(item_type.as_ref()))
        }
    }
}

fn optional_part_type_text(part_type: &Option<definy_event::event::PartType>) -> String {
    part_type
        .as_ref()
        .map(part_type_text)
        .unwrap_or_else(|| "None".to_string())
}

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
    let root_part_definition_hash = root_part_definition_hash(&hash, &event.content);
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
                    div {
                        class: "badge",
                        style: "font-size: 0.8rem; color: var(--primary); background: rgb(124 192 216 / 0.1); padding: 0.2rem 0.6rem; border-radius: var(--radius-full);",
                        "{crate::event_presenter::event_kind_label(context.language, &event)}"
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
            if let Some(root_part_hash) = root_part_definition_hash {
                RelatedPartEvents {
                    state: state.clone(),
                    context: context.clone(),
                    root_part_definition_hash: root_part_hash,
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
    let events_list: Vec<crate::app_state::EventWithHash> = state.events_with_hash();

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
        EventContent::PartDefinition(part_definition_event) => {
            let eval_result = part_definition_event
                .expression
                .as_ref()
                .map(|expr| evaluate_message_result(&context.language, expr, &events_list));
            let module_hash = part_definition_event.module_definition_event_hash.clone();
            let module_snapshot =
                crate::module_projection::find_module_snapshot(&state, &module_hash);
            let module_name = module_snapshot
                .as_ref()
                .map(|m| m.module_name.as_str())
                .unwrap_or("module");
            let open_part_label = context.language.label(
                "Open part detail →",
                "パーツ詳細を開く →",
                "Malfermi partajn detalojn →",
            );
            let module_label = context.language.label("Module:", "モジュール:", "Modulo:");
            let expr_body_label =
                context
                    .language
                    .label("Expression Body", "本体の式", "Esprimo korpo");

            rsx! {
                div { style: "display: grid; gap: 0.75rem;",
                    div { style: "display: flex; align-items: center; justify-content: space-between;",
                        div { style: "display: flex; align-items: center; gap: 0.6rem;",
                            div { style: "font-size: 1.15rem; font-weight: 600;",
                                "{part_definition_event.part_name}"
                            }
                            div {
                                class: "badge",
                                style: "font-size: 0.74rem; color: var(--primary); background: rgb(124 192 216 / 0.12); padding: 0.15rem 0.5rem; border-radius: var(--radius-full);",
                                "{optional_part_type_text(&part_definition_event.part_type)}"
                            }
                        }
                        a {
                            href: context.href_with_lang(Location::Part(hash.clone())),
                            style: "font-size: 0.84rem; color: var(--primary); text-decoration: none; font-weight: 500;",
                            "{open_part_label}"
                        }
                    }
                    div { style: "display: flex; align-items: center; gap: 0.5rem; font-size: 0.86rem;",
                        span { style: "color: var(--text-secondary);", "{module_label}" }
                        a {
                            href: context.href_with_lang(Location::Module(module_hash)),
                            style: "color: var(--primary); font-weight: 500; text-decoration: none;",
                            "{module_name}"
                        }
                    }
                    if !part_definition_event.description.is_empty() {
                        div { style: "font-size: 0.88rem; color: var(--text-secondary); white-space: pre-wrap;",
                            "{part_definition_event.description}"
                        }
                    }
                    if let Some(expr) = &part_definition_event.expression {
                        div { style: "display: grid; gap: 0.35rem;",
                            div { style: "font-size: 0.76rem; color: var(--text-secondary);",
                                "{expr_body_label}"
                            }
                            div {
                                class: "mono",
                                style: "font-size: 0.85rem; background: rgb(0 0 0 / 0.25); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.5rem 0.7rem; overflow-x: auto; white-space: nowrap;",
                                "{expression_to_source(expr)}"
                            }
                        }
                    }
                    if let Some(eval_text) = eval_result {
                        div { style: "font-size: 0.85rem; color: var(--text); font-weight: 500; background: rgb(124 192 216 / 0.08); padding: 0.45rem 0.7rem; border-radius: var(--radius-sm);",
                            "{eval_text}"
                        }
                    }
                }
            }
        }
        EventContent::PartUpdate(part_update_event) => {
            let base_hash = part_update_event.part_definition_event_hash.clone();
            let eval_result = part_update_event
                .expression
                .as_ref()
                .map(|expr| evaluate_message_result(&context.language, expr, &events_list));
            let module_hash = part_update_event.module_definition_event_hash.clone();
            let module_snapshot =
                crate::module_projection::find_module_snapshot(&state, &module_hash);
            let module_name = module_snapshot
                .as_ref()
                .map(|m| m.module_name.as_str())
                .unwrap_or("module");
            let open_part_label = context.language.label(
                "Open part detail →",
                "パーツ詳細を開く →",
                "Malfermi partajn detalojn →",
            );
            let module_label = context.language.label("Module:", "モジュール:", "Modulo:");
            let expr_body_label =
                context
                    .language
                    .label("Expression Body", "本体の式", "Esprimo korpo");

            rsx! {
                div { style: "display: grid; gap: 0.75rem;",
                    div { style: "display: flex; align-items: center; justify-content: space-between;",
                        div { style: "font-size: 1.15rem; font-weight: 600;",
                            "{part_update_event.part_name}"
                        }
                        a {
                            href: context.href_with_lang(Location::Part(base_hash.clone())),
                            style: "font-size: 0.84rem; color: var(--primary); text-decoration: none; font-weight: 500;",
                            "{open_part_label}"
                        }
                    }
                    div { style: "display: flex; align-items: center; gap: 0.5rem; font-size: 0.86rem;",
                        span { style: "color: var(--text-secondary);", "{module_label}" }
                        a {
                            href: context.href_with_lang(Location::Module(module_hash)),
                            style: "color: var(--primary); font-weight: 500; text-decoration: none;",
                            "{module_name}"
                        }
                    }
                    div { style: "display: grid; gap: 0.25rem;",
                        div { style: "font-size: 0.76rem; color: var(--text-secondary);",
                            "Base Part Definition ID"
                        }
                        div {
                            class: "mono",
                            style: "font-size: 0.8rem; color: var(--text-secondary);",
                            "{base_hash}"
                        }
                    }
                    if let Some(expr) = &part_update_event.expression {
                        div { style: "display: grid; gap: 0.35rem;",
                            div { style: "font-size: 0.76rem; color: var(--text-secondary);",
                                "{expr_body_label}"
                            }
                            div {
                                class: "mono",
                                style: "font-size: 0.85rem; background: rgb(0 0 0 / 0.25); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.5rem 0.7rem; overflow-x: auto; white-space: nowrap;",
                                "{expression_to_source(expr)}"
                            }
                        }
                    }
                    if let Some(eval_text) = eval_result {
                        div { style: "font-size: 0.85rem; color: var(--text); font-weight: 500; background: rgb(124 192 216 / 0.08); padding: 0.45rem 0.7rem; border-radius: var(--radius-sm);",
                            "{eval_text}"
                        }
                    }
                }
            }
        }
        EventContent::ModuleDefinition(module_definition_event) => rsx! {
            div { style: "display: grid; gap: 0.6rem;",
                div { style: "display: flex; align-items: center; justify-content: space-between;",
                    div { style: "font-size: 1.15rem; font-weight: 600;",
                        "{module_definition_event.module_name}"
                    }
                    a {
                        href: context.href_with_lang(Location::Module(hash.clone())),
                        style: "font-size: 0.84rem; color: var(--primary); text-decoration: none; font-weight: 500;",
                        "{context.language.label(\"Open module detail →\", \"モジュール詳細を開く →\", \"Malfermi modulajn detalojn →\")}"
                    }
                }
                if !module_definition_event.description.is_empty() {
                    div { style: "font-size: 0.88rem; color: var(--text-secondary); white-space: pre-wrap;",
                        "{module_definition_event.description}"
                    }
                }
            }
        },
        EventContent::ModuleUpdate(module_update_event) => {
            let base_hash = module_update_event.module_definition_event_hash.clone();
            rsx! {
                div { style: "display: grid; gap: 0.6rem;",
                    div { style: "display: flex; align-items: center; justify-content: space-between;",
                        div { style: "font-size: 1.15rem; font-weight: 600;",
                            "{module_update_event.module_name}"
                        }
                        a {
                            href: context.href_with_lang(Location::Module(base_hash.clone())),
                            style: "font-size: 0.84rem; color: var(--primary); text-decoration: none; font-weight: 500;",
                            "{context.language.label(\"Open module detail →\", \"モジュール詳細を開く →\", \"Malfermi modulajn detalojn →\")}"
                        }
                    }
                    if !module_update_event.module_description.is_empty() {
                        div { style: "font-size: 0.88rem; color: var(--text-secondary); white-space: pre-wrap;",
                            "{module_update_event.module_description}"
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn RelatedPartEvents(
    state: AppState,
    context: PageContext,
    root_part_definition_hash: EventHashId,
) -> Element {
    let related_events = collect_related_part_events(&state, &root_part_definition_hash);

    rsx! {
        div {
            class: "event-detail-card",
            style: "display: grid; gap: 0.6rem; padding: 1.2rem 1.4rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
            div { style: "font-size: 0.95rem; font-weight: 600;",
                "{context.language.label(\"History & Related Events\", \"変更履歴・関連イベント\", \"Historio kaj rilataj eventoj\")}"
            }
            div { style: "display: grid; gap: 0.4rem;",
                for (event_hash, ev) in related_events {
                    {
                        let label = crate::event_presenter::event_kind_label(context.language, &ev);
                        let time_str = ev.time.format("%Y-%m-%d %H:%M:%S").to_string();
                        rsx! {
                            a {
                                key: "{event_hash}",
                                href: context.href_with_lang(Location::Event(event_hash.clone())),
                                style: "display: flex; justify-content: space-between; align-items: center; padding: 0.55rem 0.7rem; border: 1px solid var(--border); border-radius: var(--radius-sm); text-decoration: none; color: var(--text); background: rgb(255 255 255 / 0.02);",
                                div { style: "font-weight: 500;", "{label}" }
                                div { style: "font-size: 0.8rem; color: var(--text-secondary);", "{time_str}" }
                            }
                        }
                    }
                }
            }
        }
    }
}

fn collect_related_part_events(
    state: &AppState,
    root_part_definition_hash: &EventHashId,
) -> Vec<(EventHashId, Event)> {
    let mut events = state
        .event_cache
        .iter()
        .filter_map(|(hash, event_result)| {
            let (_, event) = event_result.as_ref().ok()?;
            let is_related = match &event.content {
                EventContent::PartDefinition(_) => hash == root_part_definition_hash,
                EventContent::PartUpdate(part_update) => {
                    part_update.part_definition_event_hash == *root_part_definition_hash
                }
                _ => false,
            };
            if is_related {
                Some((hash.clone(), event.clone()))
            } else {
                None
            }
        })
        .collect::<Vec<(definy_event::EventHashId, Event)>>();
    events.sort_by_key(|(_, b)| std::cmp::Reverse(b.time));
    events
}

fn root_part_definition_hash(
    current_hash: &definy_event::EventHashId,
    content: &EventContent,
) -> Option<definy_event::EventHashId> {
    match content {
        EventContent::PartDefinition(_) => Some(current_hash.clone()),
        EventContent::PartUpdate(part_update) => {
            Some(part_update.part_definition_event_hash.clone())
        }
        _ => None,
    }
}

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

#[cfg(test)]
mod tests {
    use super::evaluate_message_result;

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
