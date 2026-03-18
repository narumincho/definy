use definy_event::EventHashId;
use definy_event::event::{Event, EventContent};
use narumincho_vdom::*;

use crate::Location;
use crate::app_state::AppState;
use crate::expression_eval::{evaluate_expression, expression_to_source};
use crate::i18n;

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

pub fn event_detail_view(
    state: &AppState,
    target_hash: &definy_event::EventHashId,
) -> Node<AppState> {
    let account_name_map = state.account_name_map();
    let mut target_event_opt = None;

    for (hash, event_result) in &state.event_cache {
        if let Ok((_, event)) = event_result
            && hash == target_hash
        {
            target_event_opt = Some(event);
        }
    }

    let inner_content = match target_event_opt {
        Some(event) => render_event_detail(state, target_hash, event, &account_name_map),
        None => Div::new()
            .style(
                Style::new()
                    .set("color", "var(--text-secondary)")
                    .set("text-align", "center")
                    .set("padding", "1.8rem"),
            )
            .children([text(i18n::tr(
                state,
                "Event not found",
                "イベントが見つかりません",
                "Evento ne trovita",
            ))])
            .into_node(),
    };

    Div::new()
        .class("page-shell")
        .style(crate::layout::page_shell_style("1.2rem"))
        .children([
            A::<AppState, Location>::new()
                .class("back-link")
                .href(state.href_with_lang(Location::Home))
                .style(
                    Style::new()
                        .set("display", "inline-flex")
                        .set("align-items", "center")
                        .set("gap", "0.5rem")
                        .set("color", "var(--primary)")
                        .set("text-decoration", "none")
                        .set("font-weight", "500"),
                )
                .children([text(i18n::tr(
                    state,
                    "← Back to Home",
                    "← ホームへ戻る",
                    "← Reen al hejmo",
                ))])
                .into_node(),
            inner_content,
        ])
        .into_node()
}

fn render_event_detail(
    state: &AppState,
    hash: &definy_event::EventHashId,
    event: &Event,
    account_name_map: &std::collections::HashMap<definy_event::event::AccountId, Box<str>>,
) -> Node<AppState> {
    let account_name = crate::app_state::account_display_name(account_name_map, &event.account_id);
    let root_part_definition_hash = root_part_definition_hash(hash, &event.content);

    Div::new()
        .class("event-detail-card")
        .style(
            Style::new()
                .set("background", "rgba(255, 255, 255, 0.02)")
                .set("backdrop-filter", "var(--glass-blur)")
                .set("-webkit-backdrop-filter", "var(--glass-blur)")
                .set("border", "1px solid var(--border)")
                .set("border-radius", "var(--radius-lg)")
                .set("padding", "1.25rem")
                .set("box-shadow", "var(--shadow-lg)")
                .set("display", "grid")
                .set("gap", "0.85rem"),
        )
        .children([
            Div::new()
                .style(
                    Style::new()
                        .set("font-size", "0.875rem")
                        .set("color", "var(--text-secondary)")
                        .set("display", "flex")
                        .set("justify-content", "space-between")
                        .set("border-bottom", "1px solid var(--border)")
                        .set("padding-bottom", "0.65rem")
                        .set("align-items", "center"),
                )
                .children([
                    Div::new()
                        .children([text(event.time.format("%Y-%m-%d %H:%M:%S").to_string())])
                        .into_node(),
                    Div::new()
                        .class("mono")
                        .style(Style::new().set("opacity", "0.6"))
                        .children([text(event.account_id.to_string())])
                        .into_node(),
                ])
                .into_node(),
            A::<AppState, Location>::new()
                .href(state.href_with_lang(Location::Account(event.account_id.clone())))
                .style(
                    Style::new()
                        .set("width", "fit-content")
                        .set("font-size", "0.9rem")
                        .set("color", "var(--primary)")
                        .set("font-weight", "600"),
                )
                .children([text(account_name)])
                .into_node(),
            match &event.content {
                EventContent::CreateAccount(create_account_event) => Div::new()
                    .style(
                        Style::new()
                            .set("color", "var(--primary)")
                            .set("font-size", "1.06rem")
                            .set("font-weight", "600"),
                    )
                    .children([
                        text(i18n::tr(
                            state,
                            "Account created:",
                            "アカウント作成:",
                            "Konto kreita:",
                        )),
                        text(create_account_event.account_name.as_ref()),
                    ])
                    .into_node(),
                EventContent::ChangeProfile(change_profile_event) => Div::new()
                    .style(
                        Style::new()
                            .set("color", "var(--primary)")
                            .set("font-size", "1.06rem")
                            .set("font-weight", "600"),
                    )
                    .children([
                        text(i18n::tr(
                            state,
                            "Profile changed:",
                            "プロフィール変更:",
                            "Profilo ŝanĝita:",
                        )),
                        text(change_profile_event.account_name.as_ref()),
                    ])
                    .into_node(),
                EventContent::PartDefinition(part_definition_event) => Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "1.15rem")
                            .set("line-height", "1.6"),
                    )
                    .children([
                        text(format!(
                            "{}: {} = {}",
                            part_definition_event.part_name,
                            optional_part_type_text(&part_definition_event.part_type),
                            expression_to_source(&part_definition_event.expression)
                        )),
                        if part_definition_event.description.is_empty() {
                            Div::new().children([]).into_node()
                        } else {
                            Div::new()
                                .style(
                                    Style::new()
                                        .set("font-size", "0.86rem")
                                        .set("color", "var(--text-secondary)")
                                        .set("white-space", "pre-wrap"),
                                )
                                .children([text(part_definition_event.description.as_ref())])
                                .into_node()
                        },
                        {
                            let expression = part_definition_event.expression.clone();
                            Button::new()
                                .type_("button")
                                .on_click(EventHandler::new(move |set_state| {
                                    let expression = expression.clone();
                                    async move {
                                        set_state(Box::new(move |state: AppState| {
                                            let events_vec: Vec<_> = state
                                                .event_cache
                                                .iter()
                                                .map(|(h, e)| (h.clone(), e.clone()))
                                                .collect();
                                            let eval_result = evaluate_message_result(
                                                state.language.code,
                                                &expression,
                                                &events_vec,
                                            );
                                            AppState {
                                                event_detail_eval_result: Some(eval_result),
                                                ..state.clone()
                                            }
                                        }));
                                    }
                                }))
                                .style(Style::new().set("margin-top", "0.65rem"))
                                .children([text(i18n::tr(state, "Evaluate", "評価", "Taksi"))])
                                .into_node()
                        },
                        A::<AppState, Location>::new()
                            .href(state.href_with_lang(Location::Part(hash.clone())))
                            .style(
                                Style::new()
                                    .set("margin-top", "0.45rem")
                                    .set("display", "inline-flex")
                                    .set("color", "var(--primary)")
                                    .set("text-decoration", "none"),
                            )
                            .children([text(i18n::tr(
                                state,
                                "Open part detail",
                                "パーツ詳細を開く",
                                "Malfermi partajn detalojn",
                            ))])
                            .into_node(),
                        match &state.event_detail_eval_result {
                            Some(result) => Div::new()
                                .class("mono")
                                .style(
                                    Style::new()
                                        .set("margin-top", "0.35rem")
                                        .set("font-size", "0.85rem")
                                        .set("word-break", "break-word"),
                                )
                                .children([text(result)])
                                .into_node(),
                            None => Div::new().children([]).into_node(),
                        },
                    ])
                    .into_node(),
                EventContent::PartUpdate(part_update_event) => Div::new()
                    .style(
                        Style::new()
                            .set("display", "grid")
                            .set("gap", "0.55rem")
                            .set("line-height", "1.6"),
                    )
                    .children([
                        Div::new()
                            .style(Style::new().set("font-size", "1.08rem"))
                            .children([text(format!(
                                "{} {}",
                                i18n::tr(
                                    state,
                                    "Part updated:",
                                    "パーツ更新:",
                                    "Parto ĝisdatigita:"
                                ),
                                part_update_event.part_name
                            ))])
                            .into_node(),
                        if part_update_event.part_description.is_empty() {
                            Div::new().children([]).into_node()
                        } else {
                            Div::new()
                                .style(
                                    Style::new()
                                        .set("font-size", "0.86rem")
                                        .set("color", "var(--text-secondary)")
                                        .set("white-space", "pre-wrap"),
                                )
                                .children([text(part_update_event.part_description.as_ref())])
                                .into_node()
                        },
                        Div::new()
                            .class("mono")
                            .style(
                                Style::new()
                                    .set("font-size", "0.8rem")
                                    .set("opacity", "0.85"),
                            )
                            .children([text(format!(
                                "{} {}",
                                i18n::tr(state, "expression:", "式:", "esprimo:"),
                                expression_to_source(&part_update_event.expression)
                            ))])
                            .into_node(),
                        Div::new()
                            .class("mono")
                            .style(
                                Style::new()
                                    .set("font-size", "0.8rem")
                                    .set("opacity", "0.85"),
                            )
                            .children([text(format!(
                                "{} {}",
                                i18n::tr(
                                    state,
                                    "partDefinitionEventHash:",
                                    "partDefinitionEventHash:",
                                    "partDefinitionEventHash:"
                                ),
                                part_update_event.part_definition_event_hash,
                            ))])
                            .into_node(),
                        A::<AppState, Location>::new()
                            .href(state.href_with_lang(Location::Event(
                                part_update_event.part_definition_event_hash.clone(),
                            )))
                            .children([text(i18n::tr(
                                state,
                                "Open definition event",
                                "定義イベントを開く",
                                "Malfermi difinan eventon",
                            ))])
                            .into_node(),
                        A::<AppState, Location>::new()
                            .href(state.href_with_lang(Location::Part(
                                part_update_event.part_definition_event_hash.clone(),
                            )))
                            .children([text(i18n::tr(
                                state,
                                "Open part detail",
                                "パーツ詳細を開く",
                                "Malfermi partajn detalojn",
                            ))])
                            .into_node(),
                    ])
                    .into_node(),
                EventContent::ModuleDefinition(module_definition_event) => Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "1.1rem")
                            .set("line-height", "1.6"),
                    )
                    .children([
                        text(format!(
                            "{} {}",
                            i18n::tr(
                                state,
                                "Module created:",
                                "モジュール作成:",
                                "Modulo kreita:"
                            ),
                            module_definition_event.module_name
                        )),
                        if module_definition_event.description.is_empty() {
                            Div::new().children([]).into_node()
                        } else {
                            Div::new()
                                .style(
                                    Style::new()
                                        .set("font-size", "0.86rem")
                                        .set("color", "var(--text-secondary)")
                                        .set("white-space", "pre-wrap"),
                                )
                                .children([text(module_definition_event.description.as_ref())])
                                .into_node()
                        },
                        A::<AppState, Location>::new()
                            .href(state.href_with_lang(Location::Module(hash.clone())))
                            .children([text(i18n::tr(
                                state,
                                "Open module detail",
                                "モジュール詳細を開く",
                                "Malfermi modulajn detalojn",
                            ))])
                            .into_node(),
                    ])
                    .into_node(),
                EventContent::ModuleUpdate(module_update_event) => Div::new()
                    .style(
                        Style::new()
                            .set("display", "grid")
                            .set("gap", "0.55rem")
                            .set("line-height", "1.6"),
                    )
                    .children([
                        Div::new()
                            .style(Style::new().set("font-size", "1.08rem"))
                            .children([text(format!(
                                "{} {}",
                                i18n::tr(
                                    state,
                                    "Module updated:",
                                    "モジュール更新:",
                                    "Modulo ĝisdatigita:"
                                ),
                                module_update_event.module_name
                            ))])
                            .into_node(),
                        if module_update_event.module_description.is_empty() {
                            Div::new().children([]).into_node()
                        } else {
                            Div::new()
                                .style(
                                    Style::new()
                                        .set("font-size", "0.86rem")
                                        .set("color", "var(--text-secondary)")
                                        .set("white-space", "pre-wrap"),
                                )
                                .children([text(module_update_event.module_description.as_ref())])
                                .into_node()
                        },
                        Div::new()
                            .class("mono")
                            .style(
                                Style::new()
                                    .set("font-size", "0.8rem")
                                    .set("opacity", "0.85"),
                            )
                            .children([text(format!(
                                "{} {}",
                                i18n::tr(
                                    state,
                                    "moduleDefinitionEventHash:",
                                    "moduleDefinitionEventHash:",
                                    "moduleDefinitionEventHash:"
                                ),
                                module_update_event.module_definition_event_hash,
                            ))])
                            .into_node(),
                        A::<AppState, Location>::new()
                            .href(state.href_with_lang(Location::Event(
                                module_update_event.module_definition_event_hash.clone(),
                            )))
                            .children([text(i18n::tr(
                                state,
                                "Open definition event",
                                "定義イベントを開く",
                                "Malfermi difinan eventon",
                            ))])
                            .into_node(),
                        A::<AppState, Location>::new()
                            .href(state.href_with_lang(Location::Module(
                                module_update_event.module_definition_event_hash.clone(),
                            )))
                            .children([text(i18n::tr(
                                state,
                                "Open module detail",
                                "モジュール詳細を開く",
                                "Malfermi modulajn detalojn",
                            ))])
                            .into_node(),
                    ])
                    .into_node(),
            },
            if let Some(root_hash) = root_part_definition_hash {
                related_part_events_section(state, &root_hash)
            } else {
                Div::new().children([]).into_node()
            },
            Div::new()
                .class("mono")
                .style(
                    Style::new()
                        .set("font-size", "0.75rem")
                        .set("color", "var(--text-secondary)")
                        .set("margin-top", "1.4rem")
                        .set("word-break", "break-all")
                        .set("opacity", "0.6"),
                )
                .children([
                    text(i18n::tr(
                        state,
                        "Event Hash: ",
                        "イベントハッシュ: ",
                        "Evento-hako: ",
                    )),
                    text(hash.to_string()),
                ])
                .into_node(),
        ])
        .into_node()
}

fn related_part_events_section(
    state: &AppState,
    root_part_definition_hash: &EventHashId,
) -> Node<AppState> {
    let related_events = collect_related_part_events(state, root_part_definition_hash);
    let hash_as_base64 = root_part_definition_hash.to_string();

    Div::new()
        .class("event-detail-card")
        .style(
            Style::new()
                .set("display", "grid")
                .set("gap", "0.7rem")
                .set("padding", "1rem"),
        )
        .children([
            Div::new()
                .style(Style::new().set("font-weight", "600"))
                .children([text(i18n::tr(
                    state,
                    "Events linked by partDefinitionEventHash",
                    "partDefinitionEventHash に紐づくイベント",
                    "Eventoj ligitaj per partDefinitionEventHash",
                ))])
                .into_node(),
            Div::new()
                .class("mono")
                .style(
                    Style::new()
                        .set("font-size", "0.78rem")
                        .set("opacity", "0.8")
                        .set("word-break", "break-all"),
                )
                .children([text(hash_as_base64)])
                .into_node(),
            Div::new()
                .style(Style::new().set("display", "grid").set("gap", "0.4rem"))
                .children(
                    related_events
                        .into_iter()
                        .map(|(event_hash, event)| {
                            let label = crate::event_presenter::event_kind_label(state, &event);
                            A::<AppState, Location>::new()
                                .href(state.href_with_lang(Location::Event(event_hash)))
                                .style(
                                    Style::new()
                                        .set("display", "grid")
                                        .set("gap", "0.2rem")
                                        .set("padding", "0.55rem 0.7rem")
                                        .set("border", "1px solid var(--border)")
                                        .set("border-radius", "var(--radius-md)"),
                                )
                                .children([
                                    Div::new().children([text(label)]).into_node(),
                                    Div::new()
                                        .style(
                                            Style::new()
                                                .set("font-size", "0.82rem")
                                                .set("color", "var(--text-secondary)"),
                                        )
                                        .children([text(
                                            event.time.format("%Y-%m-%d %H:%M:%S").to_string(),
                                        )])
                                        .into_node(),
                                ])
                                .into_node()
                        })
                        .collect::<Vec<Node<AppState>>>(),
                )
                .into_node(),
        ])
        .into_node()
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
    events.sort_by(|(_, a), (_, b)| b.time.cmp(&a.time));
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
    lang_code: &str,
    expression: &definy_event::event::Expression,
    events: &[crate::app_state::EventWithHash],
) -> String {
    match evaluate_expression(expression, events) {
        Ok(value) => format!(
            "{} {}",
            i18n::tr_lang(lang_code, "Result:", "結果:", "Rezulto:"),
            value
        ),
        Err(error) => format!(
            "{} {}",
            i18n::tr_lang(lang_code, "Error:", "エラー:", "Eraro:"),
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
            evaluate_message_result("en", &expression, &[]),
            "Result: 42"
        );
    }
}
