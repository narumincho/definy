use narumincho_vdom::*;

use crate::app_state::AppState;
use crate::module_projection::find_module_snapshot;
use crate::part_projection::collect_part_snapshots;
use crate::Location;

pub fn module_detail_view(state: &AppState, definition_event_hash: &[u8; 32]) -> Node<AppState> {
    let Some(module_snapshot) = find_module_snapshot(state, definition_event_hash) else {
        return Div::new()
            .class("page-shell")
            .style(crate::layout::page_shell_style("1rem"))
            .children([
                H2::new()
                    .style(Style::new().set("font-size", "1.3rem"))
                    .children([text("Module not found")])
                    .into_node(),
            ])
            .into_node();
    };

    let parts_in_module = collect_part_snapshots(state)
        .into_iter()
        .filter(|snapshot| snapshot.module_definition_event_hash == Some(*definition_event_hash))
        .collect::<Vec<_>>();

    let account_name_map = state.account_name_map();
    let author_name = crate::app_state::account_display_name(
        &account_name_map,
        &module_snapshot.account_id,
    );
    let (initial_name, initial_description) =
        effective_module_update_form(state, definition_event_hash, Some(&module_snapshot));

    Div::new()
        .class("page-shell")
        .style(crate::layout::page_shell_style("1rem"))
        .children([
            Div::new()
                .style(Style::new().set("display", "grid").set("gap", "0.4rem"))
                .children([
                    H2::new()
                        .style(Style::new().set("font-size", "1.3rem"))
                        .children([text(module_snapshot.module_name.clone())])
                        .into_node(),
                    if module_snapshot.module_description.is_empty() {
                        Div::new().children([]).into_node()
                    } else {
                        Div::new()
                            .style(
                                Style::new()
                                    .set("white-space", "pre-wrap")
                                    .set("color", "var(--text-secondary)"),
                            )
                            .children([text(module_snapshot.module_description.clone())])
                            .into_node()
                    },
                    Div::new()
                        .style(
                            Style::new()
                                .set("font-size", "0.85rem")
                                .set("color", "var(--primary)"),
                        )
                        .children([text(format!("latest author: {}", author_name))])
                        .into_node(),
                    Div::new()
                        .style(Style::new().set("display", "flex").set("gap", "0.45rem"))
                        .children([
                            A::<AppState, Location>::new()
                                .href(Href::Internal(Location::Event(
                                    module_snapshot.latest_event_hash,
                                )))
                                .children([text("Latest event")])
                                .into_node(),
                            A::<AppState, Location>::new()
                                .href(Href::Internal(Location::Event(
                                    module_snapshot.definition_event_hash,
                                )))
                                .children([text("Definition event")])
                                .into_node(),
                        ])
                        .into_node(),
                ])
                .into_node(),
            if state.current_key.is_some() {
                module_update_form(state, definition_event_hash, &initial_name, &initial_description)
            } else {
                Div::new()
                    .class("event-detail-card")
                    .style(
                        Style::new()
                            .set("padding", "0.9rem")
                            .set("color", "var(--text-secondary)"),
                    )
                    .children([text("Login required to update modules.")])
                    .into_node()
            },
            Div::new()
                .style(Style::new().set("margin-top", "1rem"))
                .children([text("Parts in this module")])
                .into_node(),
            if parts_in_module.is_empty() {
                Div::new()
                    .class("event-detail-card")
                    .style(
                        Style::new()
                            .set("padding", "0.9rem")
                            .set("color", "var(--text-secondary)"),
                    )
                    .children([text("No parts in this module yet.")])
                    .into_node()
            } else {
                Div::new()
                    .class("event-list")
                    .style(Style::new().set("display", "grid").set("gap", "0.65rem"))
                    .children(
                        parts_in_module
                            .into_iter()
                            .map(|part| {
                                let part_author = crate::app_state::account_display_name(
                                    &account_name_map,
                                    &part.account_id,
                                );
                                Div::new()
                                    .class("event-card")
                                    .style(
                                        Style::new()
                                            .set("display", "grid")
                                            .set("gap", "0.5rem")
                                            .set("padding", "0.85rem"),
                                    )
                                    .children([
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.85rem")
                                                    .set("color", "var(--text-secondary)"),
                                            )
                                            .children([text(
                                                part.updated_at
                                                    .format("%Y-%m-%d %H:%M:%S")
                                                    .to_string(),
                                            )])
                                            .into_node(),
                                        Div::new()
                                            .style(Style::new().set("font-size", "0.98rem"))
                                            .children([text(part.part_name)])
                                            .into_node(),
                                        if part.part_description.is_empty() {
                                            Div::new().children([]).into_node()
                                        } else {
                                            Div::new()
                                                .style(
                                                    Style::new()
                                                        .set("white-space", "pre-wrap")
                                                        .set("color", "var(--text-secondary)"),
                                                )
                                                .children([text(part.part_description)])
                                                .into_node()
                                        },
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.85rem")
                                                    .set("color", "var(--primary)"),
                                            )
                                            .children([text(format!(
                                                "latest author: {}",
                                                part_author
                                            ))])
                                            .into_node(),
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("display", "flex")
                                                    .set("gap", "0.45rem"),
                                            )
                                            .children([
                                                A::<AppState, Location>::new()
                                                    .href(Href::Internal(Location::Part(
                                                        part.definition_event_hash,
                                                    )))
                                                    .children([text("Open part detail")])
                                                    .into_node(),
                                                A::<AppState, Location>::new()
                                                    .href(Href::Internal(Location::Event(
                                                        part.latest_event_hash,
                                                    )))
                                                    .children([text("Latest event")])
                                                    .into_node(),
                                            ])
                                            .into_node(),
                                    ])
                                    .into_node()
                            })
                            .collect::<Vec<Node<AppState>>>(),
                    )
                    .into_node()
            },
        ])
        .into_node()
}

fn module_update_form(
    state: &AppState,
    definition_event_hash: &[u8; 32],
    initial_name: &str,
    initial_description: &str,
) -> Node<AppState> {
    let root_module_definition_hash = *definition_event_hash;

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
                .children([text("Update module")])
                .into_node(),
            Input::new()
                .type_("text")
                .name("module-update-name")
                .value(initial_name)
                .on_change(EventHandler::new(move |set_state| {
                    let root_module_definition_hash = root_module_definition_hash;
                    async move {
                        let value = web_sys::window()
                            .and_then(|window| window.document())
                            .and_then(|document| {
                                document
                                    .query_selector("input[name='module-update-name']")
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
                            next.module_update_form.module_definition_event_hash =
                                Some(root_module_definition_hash);
                            next.module_update_form.module_name_input = value;
                            next
                        }));
                    }
                }))
                .into_node(),
            {
                let mut description = Textarea::new()
                    .name("module-update-description")
                    .value(initial_description)
                    .style(Style::new().set("min-height", "5rem"));
                description.attributes.push((
                    "placeholder".to_string(),
                    "module description (supports multiple lines)".to_string(),
                ));
                description.events.push((
                    "input".to_string(),
                    EventHandler::new(move |set_state| {
                        let root_module_definition_hash = root_module_definition_hash;
                        async move {
                            let value = web_sys::window()
                                .and_then(|window| window.document())
                                .and_then(|document| {
                                    document
                                        .query_selector("textarea[name='module-update-description']")
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
                                next.module_update_form.module_definition_event_hash =
                                    Some(root_module_definition_hash);
                                next.module_update_form.module_description_input = value;
                                next
                            }));
                        }
                    }),
                ));
                description.into_node()
            },
            Button::new()
                .type_("button")
                .on_click(EventHandler::new(move |set_state| async move {
                    let set_state = std::rc::Rc::new(set_state);
                    let set_state_for_async = set_state.clone();
                    set_state(Box::new(move |state: AppState| {
                        let key = if let Some(key) = &state.current_key {
                            key.clone()
                        } else {
                            let mut next = state.clone();
                            next.module_update_form.result_message =
                                Some("Error: login required".to_string());
                            return next;
                        };
                        let (module_name, module_description) =
                            effective_module_update_form(&state, &root_module_definition_hash, None);
                        let module_name = module_name.trim().to_string();
                        if module_name.is_empty() {
                            let mut next = state.clone();
                            next.module_update_form.result_message =
                                Some("Error: module name is required".to_string());
                            return next;
                        }
                        let module_description = module_description;
                        let force_offline = state.force_offline;
                        wasm_bindgen_futures::spawn_local(async move {
                            let event_binary = match definy_event::sign_and_serialize(
                                definy_event::event::Event {
                                    account_id: definy_event::event::AccountId(Box::new(
                                        key.verifying_key().to_bytes(),
                                    )),
                                    time: chrono::Utc::now(),
                                    content: definy_event::event::EventContent::ModuleUpdate(
                                        definy_event::event::ModuleUpdateEvent {
                                            module_name: module_name.into(),
                                            module_description: module_description.into(),
                                            module_definition_event_hash:
                                                root_module_definition_hash,
                                        },
                                    ),
                                },
                                &key,
                            ) {
                                Ok(value) => value,
                                Err(error) => {
                                    set_state_for_async(Box::new(move |state| {
                                        let mut next = state.clone();
                                        next.module_update_form.result_message = Some(format!(
                                            "Error: failed to serialize ModuleUpdate: {:?}",
                                            error
                                        ));
                                        next
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
                                                if let Some(snapshot) = find_module_snapshot(
                                                    &next,
                                                    &root_module_definition_hash,
                                                ) {
                                                    next.module_update_form
                                                        .module_definition_event_hash =
                                                        Some(root_module_definition_hash);
                                                    next.module_update_form.module_name_input =
                                                        snapshot.module_name;
                                                    next.module_update_form
                                                        .module_description_input =
                                                        snapshot.module_description;
                                                } else {
                                                    next.module_update_form
                                                        .module_definition_event_hash = None;
                                                    next.module_update_form.module_name_input =
                                                        String::new();
                                                    next.module_update_form
                                                        .module_description_input =
                                                        String::new();
                                                }
                                                next.module_update_form.result_message =
                                                    Some("ModuleUpdate event posted".to_string());
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
                                            next.module_update_form.result_message = Some(
                                                match status {
                                                    crate::local_event::LocalEventStatus::Queued => {
                                                        "ModuleUpdate queued (offline)".to_string()
                                                    }
                                                    crate::local_event::LocalEventStatus::Failed => {
                                                        "ModuleUpdate failed to send".to_string()
                                                    }
                                                    crate::local_event::LocalEventStatus::Sent => {
                                                        "ModuleUpdate event posted".to_string()
                                                    }
                                                },
                                            );
                                            next
                                        }));
                                    }
                                }
                                Err(error) => {
                                    set_state_for_async(Box::new(move |state| {
                                        let mut next = state.clone();
                                        next.module_update_form.result_message = Some(format!(
                                            "Error: failed to post ModuleUpdate: {:?}",
                                            error
                                        ));
                                        next
                                    }));
                                }
                            }
                        });
                        state
                    }));
                }))
                .children([text("Send ModuleUpdate")])
                .into_node(),
            match &state.module_update_form.result_message {
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

fn effective_module_update_form(
    state: &AppState,
    definition_event_hash: &[u8; 32],
    snapshot: Option<&crate::module_projection::ModuleSnapshot>,
) -> (String, String) {
    if state.module_update_form.module_definition_event_hash == Some(*definition_event_hash) {
        return (
            state.module_update_form.module_name_input.clone(),
            state.module_update_form.module_description_input.clone(),
        );
    }
    if let Some(snapshot) = snapshot {
        return (
            snapshot.module_name.clone(),
            snapshot.module_description.clone(),
        );
    }
    if let Some(snapshot) = find_module_snapshot(state, definition_event_hash) {
        return (snapshot.module_name, snapshot.module_description);
    }
    (
        state.module_update_form.module_name_input.clone(),
        state.module_update_form.module_description_input.clone(),
    )
}
