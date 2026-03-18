use definy_event::EventHashId;
use narumincho_vdom::*;

use crate::Location;
use crate::app_state::AppState;
use crate::i18n;
use crate::module_projection::find_module_snapshot;
use crate::part_projection::collect_part_snapshots;

pub fn module_detail_view(state: &AppState, definition_event_hash: &EventHashId) -> Node<AppState> {
    let Some(module_snapshot) = find_module_snapshot(state, definition_event_hash) else {
        return Div::new()
            .class("page-shell")
            .style(crate::layout::page_shell_style("1rem"))
            .children([H2::new()
                .style(Style::new().set("font-size", "1.3rem"))
                .children([text(i18n::tr(
                    state,
                    "Module not found",
                    "モジュールが見つかりません",
                    "Modulo ne trovita",
                ))])
                .into_node()])
            .into_node();
    };

    let parts_in_module = collect_part_snapshots(state)
        .into_iter()
        .filter(|snapshot| {
            snapshot.module_definition_event_hash == Some(definition_event_hash.clone())
        })
        .collect::<Vec<_>>();

    let account_name_map = state.account_name_map();
    let author_name =
        crate::app_state::account_display_name(&account_name_map, &module_snapshot.account_id);
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
                        .children([text(format!(
                            "{} {}",
                            i18n::tr(state, "latest author:", "最新の投稿者:", "lasta aŭtoro:"),
                            author_name
                        ))])
                        .into_node(),
                    Div::new()
                        .style(Style::new().set("display", "flex").set("gap", "0.45rem"))
                        .children([
                            A::<AppState, Location>::new()
                                .href(state.href_with_lang(Location::Event(
                                    module_snapshot.latest_event_hash,
                                )))
                                .children([text(i18n::tr(
                                    state,
                                    "Latest event",
                                    "最新イベント",
                                    "Lasta evento",
                                ))])
                                .into_node(),
                            A::<AppState, Location>::new()
                                .href(state.href_with_lang(Location::Event(
                                    module_snapshot.definition_event_hash,
                                )))
                                .children([text(i18n::tr(
                                    state,
                                    "Definition event",
                                    "定義イベント",
                                    "Difina evento",
                                ))])
                                .into_node(),
                        ])
                        .into_node(),
                ])
                .into_node(),
            if state.current_key.is_some() {
                module_update_form(
                    state,
                    definition_event_hash,
                    &initial_name,
                    &initial_description,
                )
            } else {
                Div::new()
                    .class("event-detail-card")
                    .style(
                        Style::new()
                            .set("padding", "0.9rem")
                            .set("color", "var(--text-secondary)"),
                    )
                    .children([text(i18n::tr(
                        state,
                        "Login required to update modules.",
                        "モジュール更新にはログインが必要です。",
                        "Ensaluto necesas por ĝisdatigi modulojn.",
                    ))])
                    .into_node()
            },
            Div::new()
                .style(Style::new().set("margin-top", "1rem"))
                .children([text(i18n::tr(
                    state,
                    "Parts in this module",
                    "このモジュールのパーツ",
                    "Partoj en ĉi tiu modulo",
                ))])
                .into_node(),
            if parts_in_module.is_empty() {
                Div::new()
                    .class("event-detail-card")
                    .style(
                        Style::new()
                            .set("padding", "0.9rem")
                            .set("color", "var(--text-secondary)"),
                    )
                    .children([text(i18n::tr(
                        state,
                        "No parts in this module yet.",
                        "このモジュールにはまだパーツがありません。",
                        "Ankoraŭ neniuj partoj en ĉi tiu modulo.",
                    ))])
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
                                                "{} {}",
                                                i18n::tr(
                                                    state,
                                                    "latest author:",
                                                    "最新の投稿者:",
                                                    "lasta aŭtoro:"
                                                ),
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
                                                    .href(state.href_with_lang(Location::Part(
                                                        part.definition_event_hash,
                                                    )))
                                                    .children([text(i18n::tr(
                                                        state,
                                                        "Open part detail",
                                                        "パーツ詳細を開く",
                                                        "Malfermi partajn detalojn",
                                                    ))])
                                                    .into_node(),
                                                A::<AppState, Location>::new()
                                                    .href(state.href_with_lang(Location::Event(
                                                        part.latest_event_hash,
                                                    )))
                                                    .children([text(i18n::tr(
                                                        state,
                                                        "Latest event",
                                                        "最新イベント",
                                                        "Lasta evento",
                                                    ))])
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
    definition_event_hash: &EventHashId,
    initial_name: &str,
    initial_description: &str,
) -> Node<AppState> {
    let definition_event_hash_name = definition_event_hash.clone();
    let definition_event_hash_description = definition_event_hash.clone();
    let definition_event_hash_send_button = definition_event_hash.clone();

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
                .children([text(i18n::tr(
                            state,
                    "Update module",
                    "モジュールを更新",
                    "Ĝisdatigi modulon",
                ))])
                .into_node(),
            Input::new()
                .type_("text")
                .name("module-update-name")
                .value(initial_name)
                .on_change(EventHandler::new(move |set_state| {
                    let root_module_definition_hash = definition_event_hash_name.clone();
                    async move {
                        let value = crate::dom::get_input_value("input[name='module-update-name']");
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
            Textarea::new()
                    .name("module-update-description")
                    .value(initial_description)
                    .style(Style::new().set("min-height", "5rem"))
                    .attribute("placeholder", i18n::tr(
                            state,
                        "module description (supports multiple lines)",
                        "モジュール説明 (複数行対応)",
                        "modula priskribo (subtenas plurajn liniojn)",
                    ))
                    .on_input(EventHandler::new(move |set_state| {
                        let root_module_definition_hash = definition_event_hash_description.clone();
                        async move {
                            let value = crate::dom::get_textarea_value("textarea[name='module-update-description']");
                            set_state(Box::new(move |state: AppState| {
                                let mut next = state.clone();
                                next.module_update_form.module_definition_event_hash =
                                    Some(root_module_definition_hash);
                                next.module_update_form.module_description_input = value;
                                next
                            }));
                        }
                    })).into_node(),
            Button::new()
                .type_("button")
                .on_click(EventHandler::new(move |set_state| {
                    let root_module_definition_hash = definition_event_hash_send_button.clone();
                    async move {
                    let set_state = std::rc::Rc::new(set_state);
                    let set_state_for_async = set_state.clone();
                    set_state(Box::new(move |state: AppState| {
                        let key = if let Some(key) = &state.current_key {
                            key.clone()
                        } else {
                            let mut next = state.clone();
                            next.module_update_form.result_message =
                                Some(i18n::tr(
                            &state,
                                    "Error: login required",
                                    "エラー: ログインが必要です",
                                    "Eraro: ensaluto necesas",
                                ).to_string());
                            return next;
                        };
                        let (module_name, module_description) =
                            effective_module_update_form(&state, &root_module_definition_hash.clone(), None);
                        let module_name = module_name.trim().to_string();
                        if module_name.is_empty() {
                            let mut next = state.clone();
                            next.module_update_form.result_message =
                                Some(i18n::tr(
                            &state,
                                    "Error: module name is required",
                                    "エラー: モジュール名は必須です",
                                    "Eraro: modulo-nomo estas bezonata",
                                ).to_string());
                            return next;
                        }
                        let force_offline = state.force_offline;
                        wasm_bindgen_futures::spawn_local(async move {
                            let event_binary = match definy_event::sign_and_serialize(
                                definy_event::event::Event {
                                    account_id: definy_event::event::AccountId(key.verifying_key()),
                                    time: chrono::Utc::now(),
                                    content: definy_event::event::EventContent::ModuleUpdate(
                                        definy_event::event::ModuleUpdateEvent {
                                            module_name: module_name.into(),
                                            module_description: module_description.into(),
                                            module_definition_event_hash: root_module_definition_hash.clone(),
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
                                            "{}: {:?}",
                                            i18n::tr(
                            &state,
                                                "Error: failed to serialize ModuleUpdate",
                                                "エラー: ModuleUpdate のシリアライズに失敗しました",
                                                "Eraro: malsukcesis seriigi ModuleUpdate",
                                            ),
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
                                                let mut next = state.clone();
                                                next.apply_latest_events(events, None);
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
                                                    Some(i18n::tr(
                            &state,
                                                        "ModuleUpdate event posted",
                                                        "ModuleUpdate を投稿しました",
                                                        "ModuleUpdate sendita",
                                                    ).to_string());
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
                                                        i18n::tr(
                            &state,
                                                            "ModuleUpdate queued (offline)",
                                                            "ModuleUpdate をキューに追加しました (オフライン)",
                                                            "ModuleUpdate envicigita (senkonekte)",
                                                        )
                                                        .to_string()
                                                    }
                                                    crate::local_event::LocalEventStatus::Failed => {
                                                        i18n::tr(
                            &state,
                                                            "ModuleUpdate failed to send",
                                                            "ModuleUpdate の送信に失敗しました",
                                                            "ModuleUpdate sendado malsukcesis",
                                                        )
                                                        .to_string()
                                                    }
                                                    crate::local_event::LocalEventStatus::Sent => {
                                                        i18n::tr(
                            &state,
                                                            "ModuleUpdate event posted",
                                                            "ModuleUpdate を投稿しました",
                                                            "ModuleUpdate sendita",
                                                        )
                                                        .to_string()
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
                                            "{}: {:?}",
                                            i18n::tr(
                            &state,
                                                "Error: failed to post ModuleUpdate",
                                                "エラー: ModuleUpdate の送信に失敗しました",
                                                "Eraro: malsukcesis sendi ModuleUpdate",
                                            ),
                                            error
                                        ));
                                        next
                                    }));
                                }
                            }
                        });
                        state
                    }));
                }}))
                .children([text(i18n::tr(
                            state,
                    "Send ModuleUpdate",
                    "ModuleUpdate を送信",
                    "Sendi ModuleUpdate",
                ))])
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
    definition_event_hash: &EventHashId,
    snapshot: Option<&crate::module_projection::ModuleSnapshot>,
) -> (String, String) {
    if let Some(hash) = &state.module_update_form.module_definition_event_hash
        && hash == definition_event_hash
    {
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
