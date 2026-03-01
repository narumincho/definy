use definy_event::event::EventContent;
use narumincho_vdom::*;

use crate::app_state::AppState;
use crate::expression_editor::{EditorTarget, render_root_expression_editor};
use crate::expression_eval::{evaluate_expression, expression_to_source};

pub fn event_list_view(state: &AppState) -> Node<AppState> {
    let part_definition_form = if state.current_key.is_some() {
        Some(
            Div::new()
                .class("composer")
                .style(
                    Style::new()
                        .set("display", "grid")
                        .set("gap", "0.9rem")
                        .set("background", "var(--surface)")
                        .set("backdrop-filter", "var(--glass-blur)")
                        .set("-webkit-backdrop-filter", "var(--glass-blur)")
                        .set("padding", "1.5rem")
                        .set("border-radius", "var(--radius-lg)")
                        .set("box-shadow", "var(--shadow-md)")
                        .set("border", "1px solid var(--border)"),
                )
                .children([
                    part_name_input(state),
                    part_description_input(state),
                    Div::new()
                        .style(Style::new().set("color", "var(--text-secondary)").set("font-size", "0.9rem"))
                        .children([text("Expression Builder")])
                        .into_node(),
                    render_root_expression_editor(
                        &state.part_definition_form.composing_expression,
                        EditorTarget::PartDefinition,
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
                            expression_to_source(&state.part_definition_form.composing_expression)
                        ))])
                        .into_node(),
                    Div::new()
                        .style(Style::new().set("display", "flex").set("gap", "0.6rem"))
                        .children([
                            Button::new()
                                .type_("button")
                                .on_click(EventHandler::new(async |set_state| {
                                    set_state(Box::new(|state: AppState| {
                                        let result = match evaluate_expression(
                                            &state.part_definition_form.composing_expression,
                                        )
                                        {
                                            Ok(value) => format!("Result: {}", value),
                                            Err(error) => format!("Error: {}", error),
                                        };
                                        let mut next = state.clone();
                                        next.part_definition_form.eval_result = Some(result);
                                        next
                                    }));
                                }))
                                .children([text("Evaluate")])
                                .into_node(),
                            Button::new()
                                .on_click(EventHandler::new(async |set_state| {
                                    let set_state = std::rc::Rc::new(set_state);
                                    let set_state_for_async = set_state.clone();
                                    set_state(Box::new(|state: AppState| {
                                        let key: &ed25519_dalek::SigningKey =
                                            if let Some(key) = &state.current_key {
                                                key
                                            } else {
                                                web_sys::console::log_1(&"login required".into());
                                                return state;
                                            };

                                        let part_name =
                                            state.part_definition_form.part_name_input.trim().to_string();
                                        let description =
                                            state.part_definition_form.part_description_input.clone();
                                        if part_name.is_empty() {
                                            let mut next = state.clone();
                                            next.part_definition_form.eval_result =
                                                Some("Error: part name is required".to_string());
                                            return next;
                                        }
                                        let expression =
                                            state.part_definition_form.composing_expression.clone();
                                        let key_for_async = key.clone();

                                        wasm_bindgen_futures::spawn_local(async move {
                                            let event_binary = definy_event::sign_and_serialize(
                                                definy_event::event::Event {
                                                    account_id: definy_event::event::AccountId(Box::new(
                                                        key_for_async.verifying_key().to_bytes(),
                                                    )),
                                                    time: chrono::Utc::now(),
                                                    content:
                                                        definy_event::event::EventContent::PartDefinition(
                                                            definy_event::event::PartDefinitionEvent {
                                                                part_name: part_name.into(),
                                                                description: description.into(),
                                                                expression,
                                                            },
                                                        ),
                                                },
                                                &key_for_async,
                                            )
                                            .unwrap();

                                            let status = crate::fetch::post_event(event_binary.as_slice()).await;
                                            match status {
                                                Ok(_) => {
                                                    let events = crate::fetch::get_events().await;
                                                    if let Ok(events) = events {
                                                        set_state_for_async(Box::new(|state| AppState {
                                                            created_account_events: events,
                                                            ..state.clone()
                                                        }));
                                                    }
                                                }
                                                Err(e) => {
                                                    web_sys::console::log_1(
                                                        &format!("Failed to post event: {:?}", e).into(),
                                                    );
                                                }
                                            }
                                        });
                                        let mut next = state.clone();
                                        next.part_definition_form.part_name_input = String::new();
                                        next.part_definition_form.part_description_input = String::new();
                                        next.part_definition_form.eval_result = None;
                                        next.part_definition_form.composing_expression =
                                            definy_event::event::Expression::Number(
                                                definy_event::event::NumberExpression { value: 0 },
                                            );
                                        next
                                    }));
                                }))
                                .children([text("Send")])
                                .into_node(),
                        ])
                        .into_node(),
                ])
                .into_node(),
        )
    } else {
        None
    };

    Div::new()
        .class("page-shell")
        .style(
            Style::new()
                .set("display", "grid")
                .set("gap", "2rem")
                .set("width", "100%")
                .set("max-width", "800px")
                .set("margin", "0 auto")
                .set("padding", "2rem 1rem"),
        )
        .children({
            let mut children = Vec::new();
            if let Some(part_definition_form) = part_definition_form {
                children.push(part_definition_form);
            }
            if let Some(result) = &state.part_definition_form.eval_result {
                children.push(
                    Div::new()
                        .class("event-detail-card")
                        .style(
                            Style::new()
                                .set("padding", "0.9rem 1rem")
                                .set("font-family", "'JetBrains Mono', monospace")
                                .set("font-size", "0.9rem")
                                .set("word-break", "break-word"),
                        )
                        .children([text(result)])
                        .into_node(),
                );
            }
            children.push(
                Div::new()
                    .class("event-list")
                    .style(Style::new().set("display", "grid").set("gap", "1rem"))
                    .children({
                        let account_name_map = state.account_name_map();

                        state
                            .created_account_events
                            .iter()
                            .map(|(hash, event)| event_view(hash, event, &account_name_map))
                            .collect::<Vec<Node<AppState>>>()
                    })
                    .into_node(),
            );
            children
        })
        .into_node()
}

fn event_view(
    hash: &[u8; 32],
    event_result: &Result<
        (ed25519_dalek::Signature, definy_event::event::Event),
        definy_event::VerifyAndDeserializeError,
    >,
    account_name_map: &std::collections::HashMap<definy_event::event::AccountId, Box<str>>,
) -> Node<AppState> {
    match event_result {
        Ok((_, event)) => A::<AppState, crate::Location>::new()
            .class("event-card")
            .style(
                Style::new()
                    .set("background", "rgba(255, 255, 255, 0.02)")
                    .set("backdrop-filter", "var(--glass-blur)")
                    .set("-webkit-backdrop-filter", "var(--glass-blur)")
                    .set("border", "1px solid var(--border)")
                    .set("border-radius", "var(--radius-lg)")
                    .set("padding", "1.5rem")
                    .set("box-shadow", "0 4px 6px -1px rgba(0, 0, 0, 0.1)")
                    .set("transition", "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)")
                    .set("display", "grid")
                    .set("gap", "0.75rem"),
            )
            .href(narumincho_vdom::Href::Internal(crate::Location::Event(*hash)))
            .children([
                Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "0.875rem")
                            .set("color", "var(--text-secondary)")
                            .set("display", "flex")
                            .set("justify-content", "space-between")
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
                match &event.content {
                    EventContent::CreateAccount(create_account_event) => Div::new()
                        .style(Style::new().set("color", "var(--primary)"))
                        .children([
                            text("Account created: "),
                            text(create_account_event.account_name.as_ref()),
                        ])
                        .into_node(),
                    EventContent::ChangeProfile(change_profile_event) => Div::new()
                        .style(Style::new().set("color", "var(--primary)"))
                        .children([
                            text("Profile changed: "),
                            text(change_profile_event.account_name.as_ref()),
                        ])
                        .into_node(),
                    EventContent::PartDefinition(part_definition_event) => Div::new()
                        .style(Style::new().set("font-size", "1.125rem"))
                        .children([
                            Div::new()
                                .style(
                                    Style::new()
                                        .set("font-size", "0.85rem")
                                        .set("color", "var(--primary)")
                                        .set("font-weight", "600")
                                        .set("margin-bottom", "0.25rem"),
                                )
                                .children([text(
                                    account_name_map
                                        .get(&event.account_id)
                                        .map(|name: &Box<str>| name.as_ref())
                                        .unwrap_or("Unknown"),
                                )])
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
                                            .set("font-size", "0.9rem")
                                            .set("color", "var(--text-secondary)")
                                            .set("white-space", "pre-wrap"),
                                    )
                                    .children([text(part_definition_event.description.as_ref())])
                                    .into_node()
                            },
                        ])
                        .into_node(),
                    EventContent::PartUpdate(part_update_event) => Div::new()
                        .style(Style::new().set("font-size", "1.05rem"))
                        .children([
                            Div::new()
                                .style(
                                    Style::new()
                                        .set("font-size", "0.85rem")
                                        .set("color", "var(--primary)")
                                        .set("font-weight", "600")
                                        .set("margin-bottom", "0.25rem"),
                                )
                                .children([text(
                                    account_name_map
                                        .get(&event.account_id)
                                        .map(|name: &Box<str>| name.as_ref())
                                        .unwrap_or("Unknown"),
                                )])
                                .into_node(),
                            text(format!("Part updated: {}", part_update_event.part_name)),
                            Div::new()
                                .class("mono")
                                .style(
                                    Style::new()
                                        .set("font-size", "0.82rem")
                                        .set("opacity", "0.85"),
                                )
                                .children([text(format!(
                                    "expression: {}",
                                    expression_to_source(&part_update_event.expression)
                                ))])
                                .into_node(),
                            Div::new()
                                .style(
                                    Style::new()
                                        .set("font-size", "0.85rem")
                                        .set("color", "var(--text-secondary)"),
                                )
                                .children([text(format!(
                                    "base: {}",
                                    crate::hash_format::encode_hash32(
                                        &part_update_event.part_definition_event_hash,
                                    )
                                ))])
                                .into_node(),
                        ])
                        .into_node(),
                },
            ])
            .into_node(),
        Err(e) => Div::new()
            .class("error-card")
            .style(
                Style::new()
                    .set("background-color", "rgba(244, 63, 94, 0.1)")
                    .set("border", "1px solid var(--error)")
                    .set("border-radius", "var(--radius-md)")
                    .set("padding", "1rem")
                    .set("color", "var(--error)"),
            )
            .children([text(&format!("イベントの読み込みに失敗しました: {:?}", e))])
            .into_node(),
    }
}

fn part_name_input(state: &AppState) -> Node<AppState> {
    let mut input = Input::new()
        .name("part-name")
        .type_("text")
        .value(&state.part_definition_form.part_name_input);
    input
        .attributes
        .push(("placeholder".to_string(), "part name (e.g. a)".to_string()));
    input.events.push((
        "input".to_string(),
        EventHandler::new(move |set_state| async move {
            let value = web_sys::window()
                .and_then(|window| window.document())
                .and_then(|document| document.query_selector("input[name='part-name']").ok())
                .flatten()
                .and_then(|element| wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(element).ok())
                .map(|input| input.value())
                .unwrap_or_default();
            set_state(Box::new(move |state: AppState| {
                let mut next = state.clone();
                next.part_definition_form.part_name_input = value;
                next
            }));
        }),
    ));
    input.into_node()
}

fn part_description_input(state: &AppState) -> Node<AppState> {
    let mut textarea = Textarea::new()
        .name("part-description")
        .value(&state.part_definition_form.part_description_input)
        .style(Style::new().set("min-height", "6rem"));
    textarea.attributes.push((
        "placeholder".to_string(),
        "description (supports multiple lines)".to_string(),
    ));
    textarea.events.push((
        "input".to_string(),
        EventHandler::new(move |set_state| async move {
            let value = web_sys::window()
                .and_then(|window| window.document())
                .and_then(|document| document.query_selector("textarea[name='part-description']").ok())
                .flatten()
                .and_then(|element| {
                    wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlTextAreaElement>(element).ok()
                })
                .map(|textarea| textarea.value())
                .unwrap_or_default();
            set_state(Box::new(move |state: AppState| {
                let mut next = state.clone();
                next.part_definition_form.part_description_input = value;
                next
            }));
        }),
    ));
    textarea.into_node()
}
