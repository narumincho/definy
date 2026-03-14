use narumincho_vdom::*;

use crate::Location;
use crate::app_state::AppState;
use crate::expression_editor::{EditorTarget, render_root_expression_editor};
use crate::expression_eval::expression_to_source;
use crate::module_projection::collect_module_snapshots;
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
                    .style(Style::new().set("font-size", "1.3rem"))
                    .children([text(snapshot.part_name.clone())])
                    .into_node(),
                Div::new()
                    .class("event-detail-card")
                    .style(
                        Style::new()
                            .set("display", "grid")
                            .set("gap", "0.45rem")
                            .set("padding", "0.85rem"),
                    )
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
                            .style(
                                Style::new()
                                    .set("font-size", "0.85rem")
                                    .set("opacity", "0.9"),
                            )
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
                                    .href(Href::Internal(Location::Event(
                                        snapshot.latest_event_hash,
                                    )))
                                    .children([text("Latest event")])
                                    .into_node(),
                            ])
                            .into_node(),
                    ])
                    .into_node(),
                part_update_form(state, definition_event_hash),
                Div::new()
                    .class("event-detail-card")
                    .style(
                        Style::new()
                            .set("display", "grid")
                            .set("gap", "0.45rem")
                            .set("padding", "0.85rem"),
                    )
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
                                        let label =
                                            crate::event_presenter::event_kind_label(&event);
                                        A::<AppState, Location>::new()
                                            .href(Href::Internal(Location::Event(event_hash)))
                                            .style(
                                                Style::new()
                                                    .set("display", "grid")
                                                    .set("gap", "0.2rem")
                                                    .set("padding", "0.44rem 0.6rem")
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
                                                        event
                                                            .time
                                                            .format("%Y-%m-%d %H:%M:%S")
                                                            .to_string(),
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
    let (initial_name, initial_description, initial_expression, initial_module_hash) =
        effective_part_update_form(state, definition_event_hash);
    let dropdown_name = format!("part-update-module-{}", hash_as_base64);
    let mut module_options = vec![("".to_string(), "No module".to_string())];
    module_options.extend(collect_module_snapshots(state).into_iter().map(|module| {
        (
            crate::hash_format::encode_hash32(&module.definition_event_hash),
            module.module_name,
        )
    }));
    let current_module_value = initial_module_hash
        .map(|hash| crate::hash_format::encode_hash32(&hash))
        .unwrap_or_else(|| "".to_string());

    Div::new()
        .class("event-detail-card")
        .style(
            Style::new()
                .set("display", "grid")
                .set("gap", "0.45rem")
                .set("padding", "0.85rem"),
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
                        .set("font-size", "0.74rem")
                        .set("opacity", "0.8")
                        .set("word-break", "break-all"),
                )
                .children([text(format!("partDefinitionEventHash: {}", hash_as_base64))])
                .into_node(),
            Input::new()
                .type_("text")
                .name("part-update-name")
                .value(initial_name.as_str())
                .on_change(EventHandler::new(move |set_state| {
                    let root_part_definition_hash = root_part_definition_hash;
                    async move {
                        let value = web_sys::window()
                            .and_then(|window| window.document())
                            .and_then(|document| {
                                document
                                    .query_selector("input[name='part-update-name']")
                                    .ok()
                            })
                            .flatten()
                            .and_then(|element| {
                                wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(element)
                                    .ok()
                            })
                            .map(|input| input.value())
                            .unwrap_or_default();
                        set_state(Box::new(move |state: AppState| {
                            let mut next = state.clone();
                            next.part_update_form.part_definition_event_hash =
                                Some(root_part_definition_hash);
                            next.part_update_form.part_name_input = value;
                            next
                        }));
                    }
                }))
                .into_node(),
            Div::new()
                .style(Style::new().set("display", "grid").set("gap", "0.35rem"))
                .children([
                    Div::new()
                        .style(
                            Style::new()
                                .set("font-size", "0.85rem")
                                .set("color", "var(--text-secondary)"),
                        )
                        .children([text("Module")])
                        .into_node(),
                    crate::dropdown::searchable_dropdown(
                        state,
                        dropdown_name.as_str(),
                        &current_module_value,
                        &module_options,
                        std::rc::Rc::new(move |value| {
                            let root_part_definition_hash = root_part_definition_hash;
                            Box::new(move |state: AppState| {
                                let mut next = state.clone();
                                next.part_update_form.part_definition_event_hash =
                                    Some(root_part_definition_hash);
                                next.part_update_form.module_definition_event_hash =
                                    crate::hash_format::decode_hash32(&value);
                                next
                            })
                        }),
                    ),
                ])
                .into_node(),
            {
                let mut description = Textarea::new()
                    .name("part-update-description")
                    .value(initial_description.as_str())
                    .style(Style::new().set("min-height", "5rem"));
                description.attributes.push((
                    "placeholder".to_string(),
                    "part description (supports multiple lines)".to_string(),
                ));
                description.events.push((
                    "input".to_string(),
                    EventHandler::new(move |set_state| {
                        let root_part_definition_hash = root_part_definition_hash;
                        async move {
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
                                next.part_update_form.part_definition_event_hash =
                                    Some(root_part_definition_hash);
                                next.part_update_form.part_description_input = value;
                                next
                            }));
                        }
                    }),
                ));
                description.into_node()
            },
            Div::new()
                .style(
                    Style::new()
                        .set("color", "var(--text-secondary)")
                        .set("font-size", "0.9rem"),
                )
                .children([text("Expression Builder")])
                .into_node(),
            render_root_expression_editor(state, &initial_expression, EditorTarget::PartUpdate),
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
                    expression_to_source(&initial_expression)
                ))])
                .into_node(),
            {
                Button::new()
                    .type_("button")
                    .on_click(EventHandler::new(move |set_state| async move {
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
                            let (
                                current_part_name,
                                current_part_description,
                                current_expression,
                                current_module_hash,
                            ) =
                                effective_part_update_form(&state, &root_part_definition_hash);
                            let part_name = current_part_name.trim().to_string();
                            if part_name.is_empty() {
                                return AppState {
                                    event_detail_eval_result: Some(
                                        "Error: part name is required".to_string(),
                                    ),
                                    ..state.clone()
                                };
                            }
                            let part_description = current_part_description;
                            let expression = current_expression;
                            let module_definition_event_hash = current_module_hash;
                            let force_offline = state.force_offline;
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
                                                part_definition_event_hash:
                                                    root_part_definition_hash,
                                                expression,
                                                module_definition_event_hash,
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

                                match crate::fetch::post_event_with_queue(
                                    event_binary.as_slice(),
                                    force_offline,
                                )
                                .await
                                {
                                    Ok(record) => {
                                        let status = record.status.clone();
                                        if status == crate::local_event::LocalEventStatus::Sent {
                                            if let Ok(events) =
                                                crate::fetch::get_events(None, Some(20), Some(0)).await
                                            {
                                                set_state_for_async(Box::new(move |state| {
                                                    let events_len = events.len();
                                                    let mut event_cache = state.event_cache.clone();
                                                    let mut event_hashes = Vec::new();
                                                    for (hash, event) in events {
                                                        event_cache.insert(hash, event);
                                                        event_hashes.push(hash);
                                                    }
                                                    let mut next = state.clone();
                                                    next.event_cache = event_cache;
                                                    next.event_list_state = crate::EventListState {
                                                        event_hashes,
                                                        current_offset: 0,
                                                        page_size: 20,
                                                        is_loading: false,
                                                        has_more: events_len == 20,
                                                        filter_event_type: None,
                                                    };
                                                    crate::app_state::upsert_local_event_record(
                                                        &mut next,
                                                        record,
                                                    );
                                                    if let Some(snapshot) = find_part_snapshot(
                                                        &next,
                                                        &root_part_definition_hash,
                                                    ) {
                                                        next.part_update_form
                                                            .part_definition_event_hash =
                                                            Some(root_part_definition_hash);
                                                        next.part_update_form.part_name_input =
                                                            snapshot.part_name;
                                                        next.part_update_form
                                                            .part_description_input =
                                                            snapshot.part_description;
                                                        next.part_update_form.expression_input =
                                                            snapshot.expression;
                                                        next.part_update_form
                                                            .module_definition_event_hash =
                                                            snapshot.module_definition_event_hash;
                                                    } else {
                                                        next.part_update_form
                                                            .part_definition_event_hash = None;
                                                        next.part_update_form.part_name_input =
                                                            String::new();
                                                        next.part_update_form
                                                            .part_description_input =
                                                            String::new();
                                                        next.part_update_form.expression_input =
                                                            definy_event::event::Expression::Number(
                                                                definy_event::event::NumberExpression {
                                                                    value: 0,
                                                                },
                                                            );
                                                        next.part_update_form
                                                            .module_definition_event_hash = None;
                                                    }
                                                    next.event_detail_eval_result =
                                                        Some("PartUpdate event posted".to_string());
                                                    next
                                                }));
                                            }
                                        } else {
                                            set_state_for_async(Box::new(move |state| {
                                                let mut next = state.clone();
                                                crate::app_state::upsert_local_event_record(
                                                    &mut next,
                                                    record,
                                                );
                                                next.event_detail_eval_result = Some(match status {
                                                    crate::local_event::LocalEventStatus::Queued => {
                                                        "PartUpdate queued (offline)".to_string()
                                                    }
                                                    crate::local_event::LocalEventStatus::Failed => {
                                                        "PartUpdate failed to send".to_string()
                                                    }
                                                    crate::local_event::LocalEventStatus::Sent => {
                                                        "PartUpdate event posted".to_string()
                                                    }
                                                });
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

fn effective_part_update_form(
    state: &AppState,
    definition_event_hash: &[u8; 32],
) -> (String, String, definy_event::event::Expression, Option<[u8; 32]>) {
    if state.part_update_form.part_definition_event_hash == Some(*definition_event_hash) {
        return (
            state.part_update_form.part_name_input.clone(),
            state.part_update_form.part_description_input.clone(),
            state.part_update_form.expression_input.clone(),
            state.part_update_form.module_definition_event_hash,
        );
    }
    if let Some(snapshot) = find_part_snapshot(state, definition_event_hash) {
        return (
            snapshot.part_name,
            snapshot.part_description,
            snapshot.expression,
            snapshot.module_definition_event_hash,
        );
    }
    (
        state.part_update_form.part_name_input.clone(),
        state.part_update_form.part_description_input.clone(),
        state.part_update_form.expression_input.clone(),
        state.part_update_form.module_definition_event_hash,
    )
}
