use definy_event::event::{Event, EventContent};
use narumincho_vdom::*;

use crate::Location;
use crate::app_state::AppState;
use crate::expression_eval::{evaluate_expression, expression_to_source};

pub fn event_detail_view(state: &AppState, target_hash: &[u8; 32]) -> Node<AppState> {
    let account_name_map = state.account_name_map();
    let mut target_event_opt = None;

    for (hash, event_result) in &state.created_account_events {
        if let Ok((_, event)) = event_result {
            if hash == target_hash {
                target_event_opt = Some(event);
            }
        }
    }

    let inner_content = match target_event_opt {
        Some(event) => render_event_detail(state, target_hash, event, &account_name_map),
        None => Div::new()
            .style(
                Style::new()
                    .set("color", "var(--text-secondary)")
                    .set("text-align", "center")
                    .set("padding", "3rem"),
            )
            .children([text("イベントが見つかりません (Event not found)")])
            .into_node(),
    };

    Div::new()
        .class("page-shell")
        .style(crate::layout::page_shell_style("2rem"))
        .children([
            A::<AppState, Location>::new()
                .class("back-link")
                .href(Href::Internal(Location::Home))
                .style(
                    Style::new()
                        .set("display", "inline-flex")
                        .set("align-items", "center")
                        .set("gap", "0.5rem")
                        .set("color", "var(--primary)")
                        .set("text-decoration", "none")
                        .set("font-weight", "500"),
                )
                .children([text("← Back to Home")])
                .into_node(),
            inner_content,
        ])
        .into_node()
}

fn render_event_detail(
    state: &AppState,
    hash: &[u8; 32],
    event: &Event,
    account_name_map: &std::collections::HashMap<definy_event::event::AccountId, Box<str>>,
) -> Node<AppState> {
    let account_id_bytes = *event.account_id.0.as_ref();
    let account_name = account_name_map
        .get(&event.account_id)
        .map(|name: &Box<str>| name.as_ref())
        .unwrap_or("Unknown");
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
                .set("padding", "2.5rem")
                .set("box-shadow", "var(--shadow-lg)")
                .set("display", "grid")
                .set("gap", "1.5rem"),
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
                        .set("padding-bottom", "1rem")
                        .set("align-items", "center"),
                )
                .children([
                    Div::new()
                        .children([text(&event.time.format("%Y-%m-%d %H:%M:%S").to_string())])
                        .into_node(),
                    Div::new()
                        .class("mono")
                        .style(Style::new().set("opacity", "0.6"))
                        .children([text(&crate::hash_format::encode_bytes(event.account_id.0.as_slice()))])
                        .into_node(),
                ])
                .into_node(),
            A::<AppState, Location>::new()
                .href(Href::Internal(Location::Account(account_id_bytes)))
                .style(
                    Style::new()
                        .set("width", "fit-content")
                        .set("font-size", "0.9rem")
                        .set("color", "var(--primary)")
                        .set("font-weight", "600"),
                )
                .children([text(format!("View account: {}", account_name))])
                .into_node(),
            match &event.content {
                EventContent::CreateAccount(create_account_event) => Div::new()
                    .style(
                        Style::new()
                            .set("color", "var(--primary)")
                            .set("font-size", "1.25rem")
                            .set("font-weight", "600"),
                    )
                    .children([
                        text("Account created: "),
                        text(create_account_event.account_name.as_ref()),
                    ])
                    .into_node(),
                EventContent::ChangeProfile(change_profile_event) => Div::new()
                    .style(
                        Style::new()
                            .set("color", "var(--primary)")
                            .set("font-size", "1.25rem")
                            .set("font-weight", "600"),
                    )
                    .children([
                        text("Profile changed: "),
                        text(change_profile_event.account_name.as_ref()),
                    ])
                    .into_node(),
                EventContent::PartDefinition(part_definition_event) => Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "1.5rem")
                            .set("line-height", "1.6"),
                    )
                    .children([
                        Div::new()
                            .style(
                                Style::new()
                                    .set("font-size", "1rem")
                                    .set("color", "var(--primary)")
                                    .set("font-weight", "600")
                                    .set("margin-bottom", "0.5rem"),
                            )
                            .children([text(account_name)])
                            .into_node(),
                        text(format!(
                            "{} = {}",
                            part_definition_event.part_name,
                            expression_to_source(&part_definition_event.expression)
                        )),
                        if part_definition_event.description.is_empty() {
                            Div::new().children([]).into_node()
                        } else {
                            Div::new()
                                .style(
                                    Style::new()
                                        .set("font-size", "1rem")
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
                                        set_state(Box::new(move |state: AppState| AppState {
                                            event_detail_eval_result: Some(
                                                evaluate_message_result(&expression),
                                            ),
                                            ..state.clone()
                                        }));
                                    }
                                }))
                                .style(Style::new().set("margin-top", "1rem"))
                                .children([text("Evaluate")])
                                .into_node()
                        },
                        match &state.event_detail_eval_result {
                            Some(result) => Div::new()
                                .class("mono")
                                .style(
                                    Style::new()
                                        .set("margin-top", "0.5rem")
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
                            .set("gap", "0.8rem")
                            .set("line-height", "1.6"),
                    )
                    .children([
                        Div::new()
                            .style(
                                Style::new()
                                    .set("font-size", "1rem")
                                    .set("color", "var(--primary)")
                                    .set("font-weight", "600"),
                            )
                            .children([text(account_name)])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("font-size", "1.35rem"))
                            .children([text(format!("Part updated: {}", part_update_event.part_name))])
                            .into_node(),
                        if part_update_event.part_description.is_empty() {
                            Div::new().children([]).into_node()
                        } else {
                            Div::new()
                                .style(
                                    Style::new()
                                        .set("font-size", "1rem")
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
                                "expression: {}",
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
                                "partDefinitionEventHash: {}",
                                crate::hash_format::encode_hash32(
                                    &part_update_event.part_definition_event_hash,
                                )
                            ))])
                            .into_node(),
                        A::<AppState, Location>::new()
                            .href(Href::Internal(Location::Event(
                                part_update_event.part_definition_event_hash,
                            )))
                            .children([text("Open definition event")])
                            .into_node(),
                    ])
                    .into_node(),
            },
            if let Some(root_hash) = root_part_definition_hash {
                related_part_events_section(state, root_hash)
            } else {
                Div::new().children([]).into_node()
            },
            Div::new()
                .class("mono")
                .style(
                    Style::new()
                        .set("font-size", "0.75rem")
                        .set("color", "var(--text-secondary)")
                        .set("margin-top", "2.5rem")
                        .set("word-break", "break-all")
                        .set("opacity", "0.6"),
                )
                .children([
                    text("Event Hash: "),
                    text(&crate::hash_format::encode_hash32(hash)),
                ])
                .into_node(),
        ])
        .into_node()
}

fn related_part_events_section(state: &AppState, root_part_definition_hash: [u8; 32]) -> Node<AppState> {
    let related_events = collect_related_part_events(state, root_part_definition_hash);
    let hash_as_base64 = crate::hash_format::encode_hash32(&root_part_definition_hash);

    Div::new()
        .class("event-detail-card")
        .style(Style::new().set("display", "grid").set("gap", "0.7rem").set("padding", "1rem"))
        .children([
            Div::new()
                .style(Style::new().set("font-weight", "600"))
                .children([text("Events linked by partDefinitionEventHash")])
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
                            let label = crate::event_presenter::event_kind_label(&event);
                            A::<AppState, Location>::new()
                                .href(Href::Internal(Location::Event(event_hash)))
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
    root_part_definition_hash: [u8; 32],
) -> Vec<([u8; 32], &Event)> {
    let mut events = state
        .created_account_events
        .iter()
        .filter_map(|(hash, event_result)| {
            let (_, event) = event_result.as_ref().ok()?;
            let is_related = match &event.content {
                EventContent::PartDefinition(_) => *hash == root_part_definition_hash,
                EventContent::PartUpdate(part_update) => {
                    part_update.part_definition_event_hash == root_part_definition_hash
                }
                _ => false,
            };
            if is_related {
                Some((*hash, event))
            } else {
                None
            }
        })
        .collect::<Vec<([u8; 32], &Event)>>();
    events.sort_by(|(_, a), (_, b)| b.time.cmp(&a.time));
    events
}

fn root_part_definition_hash(current_hash: &[u8; 32], content: &EventContent) -> Option<[u8; 32]> {
    match content {
        EventContent::PartDefinition(_) => Some(*current_hash),
        EventContent::PartUpdate(part_update) => Some(part_update.part_definition_event_hash),
        _ => None,
    }
}

fn evaluate_message_result(expression: &definy_event::event::Expression) -> String {
    match evaluate_expression(expression) {
        Ok(value) => format!("Result: {}", value),
        Err(error) => format!("Error: {}", error),
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
        assert_eq!(evaluate_message_result(&expression), "Result: 42");
    }
}
