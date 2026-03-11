use narumincho_vdom::*;

use crate::{AppState, Location, fetch};

pub fn account_detail_view(
    state: &AppState,
    account_id: &definy_event::event::AccountId,
) -> Node<AppState> {
    let account_name_map = state.account_name_map();
    let account_name =
        crate::app_state::account_display_name(&account_name_map, account_id);
    let encoded_account_id = crate::hash_format::encode_hash32(account_id.0.as_ref());

    let account_events = state
        .event_cache
        .iter()
        .filter_map(|(hash, event_result)| {
            let (_, event) = event_result.as_ref().ok()?;
            if event.account_id == *account_id {
                Some((*hash, event))
            } else {
                None
            }
        })
        .collect::<Vec<([u8; 32], &definy_event::event::Event)>>();

    let is_current_account = state.current_key.as_ref().is_some_and(|key| {
        key.verifying_key().to_bytes().as_slice() == account_id.0.as_ref()
    });

    let profile_form = if is_current_account {
        Some(
            Div::new()
                .class("event-detail-card")
                .style(Style::new().set("display", "grid").set("gap", "0.6rem"))
                .children([
                    Div::new()
                        .style(Style::new().set("font-weight", "600"))
                        .children([text("Change account name")])
                        .into_node(),
                    Input::new()
                        .type_("text")
                        .name("profile-name")
                        .value(&state.profile_name_input)
                        .on_change(EventHandler::new(async |set_state| {
                            let value = web_sys::window()
                                .and_then(|window| window.document())
                                .and_then(|document| {
                                    document.query_selector("input[name='profile-name']").ok()
                                })
                                .flatten()
                                .and_then(|element| {
                                    wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(
                                        element,
                                    )
                                    .ok()
                                })
                                .map(|input| input.value())
                                .unwrap_or_default();
                            set_state(Box::new(move |state: AppState| AppState {
                                profile_name_input: value,
                                ..state.clone()
                            }));
                        }))
                        .into_node(),
                    Button::new()
                        .on_click(EventHandler::new(async |set_state| {
                            let set_state = std::rc::Rc::new(set_state);
                            let set_state_for_async = set_state.clone();
                            set_state(Box::new(move |state: AppState| {
                                let key = if let Some(key) = &state.current_key {
                                    key.clone()
                                } else {
                                    return state;
                                };
                                let new_name = state.profile_name_input.trim().to_string();
                                if new_name.is_empty() {
                                    return state;
                                }
                                let filter = state.event_list_state.filter_event_type;
                                wasm_bindgen_futures::spawn_local(async move {
                                    let event_binary = match definy_event::sign_and_serialize(
                                        definy_event::event::Event {
                                            account_id: definy_event::event::AccountId(Box::new(
                                                key.verifying_key().to_bytes(),
                                            )),
                                            time: chrono::Utc::now(),
                                            content:
                                                definy_event::event::EventContent::ChangeProfile(
                                                    definy_event::event::ChangeProfileEvent {
                                                        account_name: new_name.into(),
                                                    },
                                                ),
                                        },
                                        &key,
                                    ) {
                                        Ok(event_binary) => event_binary,
                                        Err(error) => {
                                            web_sys::console::log_1(
                                                &format!(
                                                    "Failed to serialize change profile event: {:?}",
                                                    error
                                                )
                                                .into(),
                                            );
                                            return;
                                        }
                                    };

                                    if fetch::post_event(event_binary.as_slice()).await.is_ok() {
                                        if let Ok(events) =
                                            fetch::get_events(filter, Some(20), Some(0)).await
                                        {
                                            set_state_for_async(Box::new(|state| {
                                                let events_len = events.len();
                                                let mut event_cache = state.event_cache.clone();
                                                let mut event_hashes = Vec::new();
                                                for (hash, event) in events {
                                                    event_cache.insert(hash, event);
                                                    event_hashes.push(hash);
                                                }
                                                AppState {
                                                    event_cache,
                                                    event_list_state: crate::EventListState {
                                                        event_hashes,
                                                        current_offset: 0,
                                                        page_size: 20,
                                                        is_loading: false,
                                                        has_more: events_len == 20,
                                                        filter_event_type: filter,
                                                    },
                                                    profile_name_input: String::new(),
                                                    ..state.clone()
                                                }
                                            }));
                                        }
                                    } else {
                                        web_sys::console::log_1(
                                            &"Failed to post change profile event".into(),
                                        );
                                    }
                                });
                                state
                            }));
                        }))
                        .children([text("Change Name")])
                        .into_node(),
                ])
                .into_node(),
        )
    } else {
        None
    };

    Div::new()
        .class("page-shell")
        .style(crate::layout::page_shell_style("0.9rem"))
        .children([
            A::<AppState, Location>::new()
                .class("back-link")
                .href(Href::Internal(Location::AccountList))
                .style(
                    Style::new()
                        .set("display", "inline-flex")
                        .set("align-items", "center")
                        .set("gap", "0.5rem")
                        .set("color", "var(--primary)")
                        .set("font-weight", "500"),
                )
                .children([text("← Back to Accounts")])
                .into_node(),
            Div::new()
                .class("event-detail-card")
                .style(
                    Style::new()
                        .set("display", "grid")
                        .set("gap", "0.55rem")
                        .set("padding", "0.95rem"),
                )
                .children([
                    H2::new()
                        .style(Style::new().set("font-size", "1.15rem"))
                        .children([text(account_name)])
                        .into_node(),
                    Div::new()
                        .class("mono")
                        .style(
                            Style::new()
                                .set("font-size", "0.72rem")
                                .set("word-break", "break-all")
                                .set("opacity", "0.8"),
                        )
                        .children([text(encoded_account_id)])
                        .into_node(),
                    Div::new()
                        .style(Style::new().set("color", "var(--text-secondary)"))
                        .children([text(format!("{} events", account_events.len()))])
                        .into_node(),
                ])
                .into_node(),
            if let Some(profile_form) = profile_form {
                profile_form
            } else {
                Div::new().children([]).into_node()
            },
            if account_events.is_empty() {
                Div::new()
                    .class("event-detail-card")
                    .style(
                        Style::new()
                            .set("padding", "0.9rem")
                            .set("color", "var(--text-secondary)"),
                    )
                    .children([text("This account has not posted any events yet.")])
                    .into_node()
            } else {
                Div::new()
                    .class("event-list")
                    .style(Style::new().set("display", "grid").set("gap", "0.6rem"))
                    .children(
                        account_events
                            .into_iter()
                            .map(|(hash, event)| {
                                A::<AppState, Location>::new()
                                    .class("event-card")
                                    .href(Href::Internal(Location::Event(hash)))
                                    .style(
                                        Style::new()
                                            .set("display", "grid")
                                            .set("gap", "0.5rem")
                                            .set("padding", "0.8rem"),
                                    )
                                    .children([
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.85rem")
                                                    .set("color", "var(--text-secondary)"),
                                            )
                                            .children([text(
                                                event.time.format("%Y-%m-%d %H:%M:%S").to_string(),
                                            )])
                                            .into_node(),
                                        Div::new()
                                            .children([text(
                                                crate::event_presenter::event_summary_text(event),
                                            )])
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
