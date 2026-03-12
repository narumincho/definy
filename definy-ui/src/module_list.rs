use narumincho_vdom::*;
use sha2::Digest;

use crate::app_state::AppState;
use crate::module_projection::collect_module_snapshots;

pub fn module_list_view(state: &AppState) -> Node<AppState> {
    let snapshots = collect_module_snapshots(state);
    let account_name_map = state.account_name_map();

    let create_form = if state.current_key.is_some() {
        Some(module_create_form(state))
    } else {
        Some(
            Div::new()
                .class("event-detail-card")
                .style(
                    Style::new()
                        .set("padding", "0.9rem")
                        .set("color", "var(--text-secondary)"),
                )
                .children([text("Login required to create modules.")])
                .into_node(),
        )
    };

    Div::new()
        .class("page-shell")
        .style(crate::layout::page_shell_style("1rem"))
        .children({
            let mut children = Vec::new();
            children.push(
                H2::new()
                    .style(Style::new().set("font-size", "1.3rem"))
                    .children([text("Modules")])
                    .into_node(),
            );
            if let Some(form) = create_form {
                children.push(form);
            }
            if let Some(message) = &state.module_definition_form.result_message {
                children.push(
                    Div::new()
                        .class("event-detail-card")
                        .style(
                            Style::new()
                                .set("padding", "0.7rem 0.8rem")
                                .set("font-size", "0.82rem")
                                .set("color", "var(--text-secondary)")
                                .set("word-break", "break-word"),
                        )
                        .children([text(message)])
                        .into_node(),
                );
            }
            if snapshots.is_empty() {
                children.push(
                    Div::new()
                        .class("event-detail-card")
                        .style(
                            Style::new()
                                .set("padding", "0.95rem")
                                .set("color", "var(--text-secondary)"),
                        )
                        .children([text("No modules yet.")])
                        .into_node(),
                );
            } else {
                children.push(
                    Div::new()
                        .class("event-list")
                        .style(Style::new().set("display", "grid").set("gap", "0.65rem"))
                        .children(
                            snapshots
                                .into_iter()
                                .map(|module| {
                                    let account_name = crate::app_state::account_display_name(
                                        &account_name_map,
                                        &module.account_id,
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
                                                    module
                                                        .updated_at
                                                        .format("%Y-%m-%d %H:%M:%S")
                                                        .to_string(),
                                                )])
                                                .into_node(),
                                            Div::new()
                                                .style(Style::new().set("font-size", "0.98rem"))
                                                .children([text(module.module_name)])
                                                .into_node(),
                                            if module.has_definition {
                                                Div::new().children([]).into_node()
                                            } else {
                                                Div::new()
                                                    .style(
                                                        Style::new()
                                                            .set("font-size", "0.82rem")
                                                            .set("color", "var(--text-secondary)"),
                                                    )
                                                    .children([text("definition event missing")])
                                                    .into_node()
                                            },
                                            if module.module_description.is_empty() {
                                                Div::new().children([]).into_node()
                                            } else {
                                                Div::new()
                                                    .style(
                                                        Style::new()
                                                            .set("white-space", "pre-wrap")
                                                            .set("color", "var(--text-secondary)"),
                                                    )
                                                    .children([text(module.module_description)])
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
                                                    account_name
                                                ))])
                                                .into_node(),
                                            Div::new()
                                                .style(
                                                    Style::new()
                                                        .set("display", "flex")
                                                        .set("gap", "0.45rem"),
                                                )
                                                .children([
                                                    A::<AppState, crate::Location>::new()
                                                        .href(Href::Internal(
                                                            crate::Location::Event(
                                                                module.latest_event_hash,
                                                            ),
                                                        ))
                                                        .children([text("Latest event")])
                                                        .into_node(),
                                                    A::<AppState, crate::Location>::new()
                                                        .href(Href::Internal(
                                                            crate::Location::Event(
                                                                module.definition_event_hash,
                                                            ),
                                                        ))
                                                        .children([text("Definition event")])
                                                        .into_node(),
                                                ])
                                                .into_node(),
                                        ])
                                        .into_node()
                                })
                                .collect::<Vec<Node<AppState>>>(),
                        )
                        .into_node(),
                );
            }
            children
        })
        .into_node()
}

fn module_create_form(state: &AppState) -> Node<AppState> {
    Div::new()
        .class("event-detail-card")
        .style(Style::new().set("display", "grid").set("gap", "0.6rem"))
        .children([
            Div::new()
                .style(Style::new().set("font-size", "0.9rem"))
                .children([text("Create module")])
                .into_node(),
            module_name_input(state),
            module_description_input(state),
            Button::new()
                .type_("button")
                .on_click(EventHandler::new(async |set_state| {
                    let set_state = std::rc::Rc::new(set_state);
                    let set_state_for_async = set_state.clone();
                    set_state(Box::new(|state: AppState| {
                        let key: &ed25519_dalek::SigningKey = if let Some(key) = &state.current_key
                        {
                            key
                        } else {
                            web_sys::console::log_1(&"login required".into());
                            return state;
                        };

                        let module_name =
                            state.module_definition_form.module_name_input.trim().to_string();
                        let module_description =
                            state.module_definition_form.module_description_input.clone();
                        if module_name.is_empty() {
                            let mut next = state.clone();
                            next.module_definition_form.result_message =
                                Some("Error: module name is required".to_string());
                            return next;
                        }
                        let key_for_async = key.clone();

                        wasm_bindgen_futures::spawn_local(async move {
                            let event_binary = definy_event::sign_and_serialize(
                                definy_event::event::Event {
                                    account_id: definy_event::event::AccountId(Box::new(
                                        key_for_async.verifying_key().to_bytes(),
                                    )),
                                    time: chrono::Utc::now(),
                                    content: definy_event::event::EventContent::ModuleDefinition(
                                        definy_event::event::ModuleDefinitionEvent {
                                            module_name: module_name.into(),
                                            description: module_description.into(),
                                        },
                                    ),
                                },
                                &key_for_async,
                            )
                            .unwrap();

                            let status = crate::fetch::post_event(event_binary.as_slice()).await;
                            match status {
                                Ok(_) => {
                                    let hash: [u8; 32] =
                                        <sha2::Sha256 as Digest>::digest(&event_binary).into();
                                    let event = definy_event::verify_and_deserialize(
                                        event_binary.as_slice(),
                                    );
                                    set_state_for_async(Box::new(move |state| {
                                        let mut next = state.clone();
                                        next.event_cache.insert(hash, event);
                                        next.module_definition_form.result_message = None;
                                        next
                                    }));
                                }
                                Err(e) => {
                                    set_state_for_async(Box::new(move |state| {
                                        let mut next = state.clone();
                                        next.module_definition_form.result_message = Some(format!(
                                            "Error: failed to create module ({:?})",
                                            e
                                        ));
                                        next
                                    }));
                                }
                            }
                        });
                        let mut next = state.clone();
                        next.module_definition_form.module_name_input = String::new();
                        next.module_definition_form.module_description_input = String::new();
                        next.module_definition_form.result_message = None;
                        next
                    }));
                }))
                .children([text("Create")])
                .into_node(),
        ])
        .into_node()
}

fn module_name_input(state: &AppState) -> Node<AppState> {
    let mut input = Input::new()
        .name("module-name")
        .type_("text")
        .value(&state.module_definition_form.module_name_input);
    input
        .attributes
        .push(("placeholder".to_string(), "module name".to_string()));
    input.events.push((
        "input".to_string(),
        EventHandler::new(move |set_state| async move {
            let value = web_sys::window()
                .and_then(|window| window.document())
                .and_then(|document| document.query_selector("input[name='module-name']").ok())
                .flatten()
                .and_then(|element| {
                    wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(element).ok()
                })
                .map(|input| input.value())
                .unwrap_or_default();
            set_state(Box::new(move |state: AppState| {
                let mut next = state.clone();
                next.module_definition_form.module_name_input = value;
                next
            }));
        }),
    ));
    input.into_node()
}

fn module_description_input(state: &AppState) -> Node<AppState> {
    let mut textarea = Textarea::new()
        .name("module-description")
        .value(&state.module_definition_form.module_description_input)
        .style(Style::new().set("min-height", "5rem"));
    textarea.attributes.push((
        "placeholder".to_string(),
        "description (optional)".to_string(),
    ));
    textarea.events.push((
        "input".to_string(),
        EventHandler::new(move |set_state| async move {
            let value = web_sys::window()
                .and_then(|window| window.document())
                .and_then(|document| {
                    document
                        .query_selector("textarea[name='module-description']")
                        .ok()
                })
                .flatten()
                .and_then(|element| {
                    wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlTextAreaElement>(element).ok()
                })
                .map(|textarea| textarea.value())
                .unwrap_or_default();
            set_state(Box::new(move |state: AppState| {
                let mut next = state.clone();
                next.module_definition_form.module_description_input = value;
                next
            }));
        }),
    ));
    textarea.into_node()
}
