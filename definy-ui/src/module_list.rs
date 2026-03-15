use narumincho_vdom::*;
use sha2::Digest;

use crate::app_state::AppState;
use crate::i18n;
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
                .children([text(i18n::tr(
                    &state,
                    "Login required to create modules.",
                    "モジュール作成にはログインが必要です。",
                    "Ensaluto necesas por krei modulojn.",
                ))])
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
                    .children([text(i18n::tr(&state, "Modules", "モジュール", "Moduloj"))])
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
                        .children([text(i18n::tr(
                            &state,
                            "No modules yet.",
                            "まだモジュールがありません。",
                            "Ankoraŭ neniuj moduloj.",
                        ))])
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
                                                    .children([text(i18n::tr(
                                                        &state,
                                                        "definition event missing",
                                                        "定義イベントが見つかりません",
                                                        "difina evento mankas",
                                                    ))])
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
                                                        .href(state.href_with_lang(
                                                            crate::Location::Module(
                                                                module.definition_event_hash,
                                                            ),
                                                        ))
                                                        .children([text(i18n::tr(
                                                            &state,
                                                            "Open module detail",
                                                            "モジュール詳細を開く",
                                                            "Malfermi modulajn detalojn",
                                                        ))])
                                                        .into_node(),
                                                    A::<AppState, crate::Location>::new()
                                                        .href(state.href_with_lang(
                                                            crate::Location::Event(
                                                                module.latest_event_hash,
                                                            ),
                                                        ))
                                                        .children([text(i18n::tr(
                                                            &state,
                                                            "Latest event",
                                                            "最新イベント",
                                                            "Lasta evento",
                                                        ))])
                                                        .into_node(),
                                                    A::<AppState, crate::Location>::new()
                                                        .href(state.href_with_lang(
                                                            crate::Location::Event(
                                                                module.definition_event_hash,
                                                            ),
                                                        ))
                                                        .children([text(i18n::tr(
                                                            &state,
                                                            "Definition event",
                                                            "定義イベント",
                                                            "Difina evento",
                                                        ))])
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
                .children([text(i18n::tr(
                            &state,
                    "Create module",
                    "モジュールを作成",
                    "Krei modulon",
                ))])
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
                            next.module_definition_form.result_message = Some(i18n::tr(
                            &state,
                                "Error: module name is required",
                                "エラー: モジュール名は必須です",
                                "Eraro: modulo-nomo estas bezonata",
                            ).to_string());
                            return next;
                        }
                        let key_for_async = key.clone();
                        let force_offline = state.force_offline;

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

                            match crate::fetch::post_event_with_queue(
                                event_binary.as_slice(),
                                force_offline,
                            )
                            .await
                            {
                                Ok(record) => {
                                    let status = record.status.clone();
                                    set_state_for_async(Box::new(move |state| {
                                        let mut next = state.clone();
                                        crate::app_state::upsert_local_event_record(
                                            &mut next,
                                            record,
                                        );
                                        if status == crate::local_event::LocalEventStatus::Sent {
                                            let hash: [u8; 32] =
                                                <sha2::Sha256 as Digest>::digest(&event_binary)
                                                    .into();
                                            let event = definy_event::verify_and_deserialize(
                                                event_binary.as_slice(),
                                            );
                                            next.event_cache.insert(hash, event);
                                            next.module_definition_form.result_message = None;
                                        } else {
                                            next.module_definition_form.result_message = Some(
                                                match status {
                                                    crate::local_event::LocalEventStatus::Queued => {
                                                        i18n::tr(
                            &state,
                                                            "ModuleDefinition queued (offline)",
                                                            "ModuleDefinition をキューに追加しました (オフライン)",
                                                            "ModuleDefinition envicigita (senkonekte)",
                                                        )
                                                        .to_string()
                                                    }
                                                    crate::local_event::LocalEventStatus::Failed => {
                                                        i18n::tr(
                            &state,
                                                            "ModuleDefinition failed to send",
                                                            "ModuleDefinition の送信に失敗しました",
                                                            "ModuleDefinition sendado malsukcesis",
                                                        )
                                                        .to_string()
                                                    }
                                                    crate::local_event::LocalEventStatus::Sent => {
                                                        i18n::tr(
                            &state,
                                                            "ModuleDefinition posted",
                                                            "ModuleDefinition を投稿しました",
                                                            "ModuleDefinition sendita",
                                                        )
                                                        .to_string()
                                                    }
                                                },
                                            );
                                        }
                                        next
                                    }));
                                }
                                Err(e) => {
                                    set_state_for_async(Box::new(move |state| {
                                        let mut next = state.clone();
                                        next.module_definition_form.result_message = Some(format!(
                                            "{} ({:?})",
                                            i18n::tr(
                            &state,
                                                "Error: failed to create module",
                                                "エラー: モジュール作成に失敗しました",
                                                "Eraro: malsukcesis krei modulon",
                                            ),
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
                .children([text(i18n::tr(&state, "Create", "作成", "Krei"))])
                .into_node(),
        ])
        .into_node()
}

fn module_name_input(state: &AppState) -> Node<AppState> {
    let mut input = Input::new()
        .name("module-name")
        .type_("text")
        .value(&state.module_definition_form.module_name_input);
    input.attributes.push((
        "placeholder".to_string(),
        i18n::tr(&state, "module name", "モジュール名", "modula nomo").to_string(),
    ));
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
        i18n::tr(
            &state,
            "description (optional)",
            "説明 (任意)",
            "priskribo (nedeviga)",
        )
        .to_string(),
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
