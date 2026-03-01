use narumincho_vdom::*;

use crate::Location;
use crate::app_state::AppState;
use crate::expression_editor::{EditorTarget, render_root_expression_editor};
use crate::expression_eval::expression_to_source;
use crate::part_projection::{collect_related_part_events, find_part_snapshot};

pub fn part_detail_view(state: &AppState, definition_event_hash: &[u8; 32]) -> Node<AppState> {
    let snapshot = find_part_snapshot(state, definition_event_hash);
    let related_events = collect_related_part_events(state, definition_event_hash);

    Div::new()
        .class("page-shell")
        .style(crate::layout::page_shell_style("1rem"))
        .children(match snapshot {
            Some(snapshot) => vec![
                A::<AppState, Location>::new()
                    .href(Href::Internal(Location::PartList))
                    .children([text("← Back to Parts")])
                    .into_node(),
                H2::new()
                    .style(Style::new().set("font-size", "1.5rem"))
                    .children([text(snapshot.part_name.clone())])
                    .into_node(),
                Div::new()
                    .class("event-detail-card")
                    .style(Style::new().set("display", "grid").set("gap", "0.6rem").set("padding", "1rem"))
                    .children([
                        Div::new()
                            .style(
                                Style::new()
                                    .set("font-size", "0.86rem")
                                    .set("color", "var(--text-secondary)"),
                            )
                            .children([text(format!(
                                "Updated at: {}",
                                snapshot.updated_at.format("%Y-%m-%d %H:%M:%S")
                            ))])
                            .into_node(),
                        if snapshot.part_description.is_empty() {
                            Div::new()
                                .style(Style::new().set("color", "var(--text-secondary)"))
                                .children([text("(no description)")])
                                .into_node()
                        } else {
                            Div::new()
                                .style(Style::new().set("white-space", "pre-wrap"))
                                .children([text(snapshot.part_description)])
                                .into_node()
                        },
                        Div::new()
                            .class("mono")
                            .style(Style::new().set("font-size", "0.85rem").set("opacity", "0.9"))
                            .children([text(format!(
                                "expression: {}",
                                expression_to_source(&snapshot.expression)
                            ))])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("display", "flex").set("gap", "0.6rem"))
                            .children([
                                A::<AppState, Location>::new()
                                    .href(Href::Internal(Location::Event(*definition_event_hash)))
                                    .children([text("Definition event")])
                                    .into_node(),
                                A::<AppState, Location>::new()
                                    .href(Href::Internal(Location::Event(snapshot.latest_event_hash)))
                                    .children([text("Latest event")])
                                    .into_node(),
                            ])
                            .into_node(),
                    ])
                    .into_node(),
                part_update_form(state, definition_event_hash),
                Div::new()
                    .class("event-detail-card")
                    .style(Style::new().set("display", "grid").set("gap", "0.6rem").set("padding", "1rem"))
                    .children([
                        Div::new()
                            .style(Style::new().set("font-weight", "600"))
                            .children([text("History")])
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
                    .into_node(),
            ],
            None => vec![
                A::<AppState, Location>::new()
                    .href(Href::Internal(Location::PartList))
                    .children([text("← Back to Parts")])
                    .into_node(),
                Div::new()
                    .style(Style::new().set("color", "var(--text-secondary)"))
                    .children([text("Part not found")])
                    .into_node(),
            ],
        })
        .into_node()
}

fn part_update_form(state: &AppState, definition_event_hash: &[u8; 32]) -> Node<AppState> {
    let root_part_definition_hash = *definition_event_hash;
    let hash_as_base64 = crate::hash_format::encode_hash32(definition_event_hash);

    Div::new()
        .class("event-detail-card")
        .style(
            Style::new()
                .set("display", "grid")
                .set("gap", "0.6rem")
                .set("padding", "1rem"),
        )
        .children([
            Div::new()
                .style(Style::new().set("font-weight", "600"))
                .children([text("Create PartUpdate event")])
                .into_node(),
            Div::new()
                .class("mono")
                .style(
                    Style::new()
                        .set("font-size", "0.78rem")
                        .set("opacity", "0.8")
                        .set("word-break", "break-all"),
                )
                .children([text(format!("partDefinitionEventHash: {}", hash_as_base64))])
                .into_node(),
            Input::new()
                .type_("text")
                .name("part-update-name")
                .value(&state.part_update_form.part_name_input)
                .on_change(EventHandler::new(async |set_state| {
                    let value = web_sys::window()
                        .and_then(|window| window.document())
                        .and_then(|document| {
                            document.query_selector("input[name='part-update-name']").ok()
                        })
                        .flatten()
                        .and_then(|element| {
                            wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(element).ok()
                        })
                        .map(|input| input.value())
                        .unwrap_or_default();
                    set_state(Box::new(move |state: AppState| {
                        let mut next = state.clone();
                        next.part_update_form.part_name_input = value;
                        next
                    }));
                }))
                .into_node(),
            {
                let mut description = Textarea::new()
                    .name("part-update-description")
                    .value(&state.part_update_form.part_description_input)
                    .style(Style::new().set("min-height", "5rem"));
                description.attributes.push((
                    "placeholder".to_string(),
                    "part description (supports multiple lines)".to_string(),
                ));
                description.events.push((
                    "input".to_string(),
                    EventHandler::new(async |set_state| {
                        let value = web_sys::window()
                            .and_then(|window| window.document())
                            .and_then(|document| {
                                document
                                    .query_selector("textarea[name='part-update-description']")
                                    .ok()
                            })
                            .flatten()
                            .and_then(|element| {
                                wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlTextAreaElement>(
                                    element,
                                )
                                .ok()
                            })
                            .map(|textarea| textarea.value())
                            .unwrap_or_default();
                        set_state(Box::new(move |state: AppState| {
                            let mut next = state.clone();
                            next.part_update_form.part_description_input = value;
                            next
                        }));
                    }),
                ));
                description.into_node()
            },
            Div::new()
                .style(Style::new().set("color", "var(--text-secondary)").set("font-size", "0.9rem"))
                .children([text("Expression Builder")])
                .into_node(),
            render_root_expression_editor(
                &state.part_update_form.expression_input,
                EditorTarget::PartUpdate,
            ),
            Div::new()
                .class("mono")
                .style(
                    Style::new()
                        .set("font-size", "0.8rem")
                        .set("padding", "0.4rem 0.6rem")
                        .set("opacity", "0.85"),
                )
                .children([text(format!(
                    "Current: {}",
                    expression_to_source(&state.part_update_form.expression_input)
                ))])
                .into_node(),
            {
                Button::new()
                    .type_("button")
                    .on_click(EventHandler::new(move |set_state| {
                        async move {
                            let set_state = std::rc::Rc::new(set_state);
                            let set_state_for_async = set_state.clone();
                            set_state(Box::new(move |state: AppState| {
                                let key = if let Some(key) = &state.current_key {
                                    key.clone()
                                } else {
                                    return AppState {
                                        event_detail_eval_result: Some(
                                            "Error: login required".to_string(),
                                        ),
                                        ..state.clone()
                                    };
                                };
                                let part_name =
                                    state.part_update_form.part_name_input.trim().to_string();
                                if part_name.is_empty() {
                                    return AppState {
                                        event_detail_eval_result: Some(
                                            "Error: part name is required".to_string(),
                                        ),
                                        ..state.clone()
                                    };
                                }
                                let part_description =
                                    state.part_update_form.part_description_input.clone();
                                let expression = state.part_update_form.expression_input.clone();
                                wasm_bindgen_futures::spawn_local(async move {
                                    let event_binary = match definy_event::sign_and_serialize(
                                        definy_event::event::Event {
                                            account_id: definy_event::event::AccountId(Box::new(
                                                key.verifying_key().to_bytes(),
                                            )),
                                            time: chrono::Utc::now(),
                                            content: definy_event::event::EventContent::PartUpdate(
                                                definy_event::event::PartUpdateEvent {
                                                    part_name: part_name.into(),
                                                    part_description: part_description.into(),
                                                    part_definition_event_hash: root_part_definition_hash,
                                                    expression,
                                                },
                                            ),
                                        },
                                        &key,
                                    ) {
                                        Ok(value) => value,
                                        Err(error) => {
                                            set_state_for_async(Box::new(move |state| AppState {
                                                event_detail_eval_result: Some(format!(
                                                    "Error: failed to serialize PartUpdate: {:?}",
                                                    error
                                                )),
                                                ..state.clone()
                                            }));
                                            return;
                                        }
                                    };

                                    match crate::fetch::post_event(event_binary.as_slice()).await {
                                        Ok(_) => {
                                            if let Ok(events) = crate::fetch::get_events().await {
                                                set_state_for_async(Box::new(move |state| {
                                                    let mut next = state.clone();
                                                    next.events = events;
                                                    next.part_update_form.part_name_input =
                                                        String::new();
                                                    next.part_update_form.part_description_input =
                                                        String::new();
                                                    next.part_update_form.expression_input =
                                                        definy_event::event::Expression::Number(
                                                            definy_event::event::NumberExpression {
                                                                value: 0,
                                                            },
                                                        );
                                                    next.event_detail_eval_result =
                                                        Some("PartUpdate event posted".to_string());
                                                    next
                                                }));
                                            }
                                        }
                                        Err(error) => {
                                            set_state_for_async(Box::new(move |state| AppState {
                                                event_detail_eval_result: Some(format!(
                                                    "Error: failed to post PartUpdate: {:?}",
                                                    error
                                                )),
                                                ..state.clone()
                                            }));
                                        }
                                    }
                                });
                                state
                            }));
                        }
                    }))
                    .children([text("Send PartUpdate")])
                    .into_node()
            },
            match &state.event_detail_eval_result {
                Some(result) => Div::new()
                    .class("mono")
                    .style(
                        Style::new()
                            .set("font-size", "0.85rem")
                            .set("word-break", "break-word"),
                    )
                    .children([text(result)])
                    .into_node(),
                None => Div::new().children([]).into_node(),
            },
        ])
        .into_node()
}
