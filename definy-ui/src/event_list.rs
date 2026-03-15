use definy_event::event::{EventContent, EventType};
use narumincho_vdom::*;

use crate::app_state::AppState;
use crate::expression_editor::{EditorTarget, render_root_expression_editor};
use crate::expression_eval::{evaluate_expression, expression_to_source};
use crate::i18n;
use crate::module_projection::collect_module_snapshots;
use crate::part_projection::collect_part_snapshots;

fn update_event_filter_url(event_type: Option<EventType>, lang_code: &str) {
    let query = crate::query::build_query(crate::query::QueryParams {
        lang: Some(lang_code.to_string()),
        event_type,
    });
    let mut new_url = "/".to_string();
    if let Some(query) = query {
        new_url.push('?');
        new_url.push_str(query.as_str());
    }
    if let Some(window) = web_sys::window() {
        if let Ok(history) = window.history() {
            let _ = history.push_state_with_url(&wasm_bindgen::JsValue::NULL, "", Some(&new_url));
        }
    }
}

fn part_type_text(part_type: &definy_event::event::PartType) -> String {
    match part_type {
        definy_event::event::PartType::Number => "Number".to_string(),
        definy_event::event::PartType::String => "String".to_string(),
        definy_event::event::PartType::Boolean => "Boolean".to_string(),
        definy_event::event::PartType::Type => "Type".to_string(),
        definy_event::event::PartType::TypePart(hash) => {
            format!("TypePart({})", crate::hash_format::short_hash32(hash))
        }
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

pub fn event_list_view(state: &AppState) -> Node<AppState> {
    let state = state.clone();
    // Load events if needed
    let _filter = state.event_list_state.filter_event_type;
    let _page_size = state.event_list_state.page_size;

    let filter_options = vec![
        (
            "".to_string(),
            i18n::tr(&state, "All Events", "すべてのイベント", "Ĉiuj eventoj").to_string(),
        ),
        (
            "create_account".to_string(),
            i18n::tr(&state, "Create Account", "アカウント作成", "Krei konton").to_string(),
        ),
        (
            "change_profile".to_string(),
            i18n::tr(
                &state,
                "Change Profile",
                "プロフィール変更",
                "Ŝanĝi profilon",
            )
            .to_string(),
        ),
        (
            "part_definition".to_string(),
            i18n::tr(&state, "Part Definition", "パーツ定義", "Parto-difino").to_string(),
        ),
        (
            "part_update".to_string(),
            i18n::tr(&state, "Part Update", "パーツ更新", "Parto-ĝisdatigo").to_string(),
        ),
        (
            "module_definition".to_string(),
            i18n::tr(
                &state,
                "Module Definition",
                "モジュール定義",
                "Modulo-difino",
            )
            .to_string(),
        ),
        (
            "module_update".to_string(),
            i18n::tr(
                &state,
                "Module Update",
                "モジュール更新",
                "Modulo-ĝisdatigo",
            )
            .to_string(),
        ),
    ];

    let current_filter = state
        .event_list_state
        .filter_event_type
        .as_ref()
        .map(|et| et.to_string())
        .unwrap_or_else(|| "".to_string());

    let filter_dropdown = crate::dropdown::searchable_dropdown(
        &state,
        "event_filter",
        &current_filter,
        &filter_options,
        std::rc::Rc::new(|value| {
            Box::new(move |state: AppState| {
                let event_type = match value.as_str() {
                    "create_account" => Some(EventType::CreateAccount),
                    "change_profile" => Some(EventType::ChangeProfile),
                    "part_definition" => Some(EventType::PartDefinition),
                    "part_update" => Some(EventType::PartUpdate),
                    "module_definition" => Some(EventType::ModuleDefinition),
                    "module_update" => Some(EventType::ModuleUpdate),
                    _ => None,
                };
                update_event_filter_url(event_type, state.language.code);
                // Reset list and load first page with new filter
                let mut next = state.clone();
                next.event_list_state = crate::EventListState {
                    event_hashes: Vec::new(),
                    current_offset: 0,
                    page_size: 20,
                    is_loading: true,
                    has_more: true,
                    filter_event_type: event_type,
                };
                next
            })
        }),
    );

    let part_definition_form = if state.current_key.is_some() {
        Some(
            Div::new()
                .class("composer")
                .style(
                    Style::new()
                        .set("display", "grid")
                        .set("gap", "0.65rem")
                        .set("background", "var(--surface)")
                        .set("backdrop-filter", "var(--glass-blur)")
                        .set("-webkit-backdrop-filter", "var(--glass-blur)")
                        .set("padding", "1rem")
                        .set("border-radius", "var(--radius-lg)")
                        .set("box-shadow", "var(--shadow-md)")
                        .set("border", "1px solid var(--border)"),
                )
                .children([
                    part_name_input(&state),
                    module_selection_input(&state),
                    part_type_input(&state),
                    part_description_input(&state),
                    Div::new()
                    .style(Style::new().set("color", "var(--text-secondary)").set("font-size", "0.84rem"))
                        .children([text(i18n::tr(
                            &state,
                            "Expression Builder",
                            "式ビルダー",
                            "Esprimo-konstruilo",
                        ))])
                        .into_node(),
                    render_root_expression_editor(
                        &state,
                        &state.part_definition_form.composing_expression,
                        EditorTarget::PartDefinition,
                    ),
                    Div::new()
                        .class("mono")
                        .style(
                            Style::new()
                                .set("font-size", "0.76rem")
                                .set("padding", "0.4rem 0.6rem")
                                .set("opacity", "0.85"),
                        )
                        .children([text(format!(
                            "{} {}",
                            i18n::tr(&state, "Current:", "現在:", "Nuna:"),
                            expression_to_source(&state.part_definition_form.composing_expression)
                        ))])
                        .into_node(),
                    Div::new()
                        .style(Style::new().set("display", "flex").set("gap", "0.45rem"))
                        .children([
                            Button::new()
                                .type_("button")
                                .on_click(EventHandler::new(async |set_state| {
                                    set_state(Box::new(|state: AppState| {
                                        let events_vec: Vec<_> = state.event_list_state.event_hashes.iter().filter_map(|hash| state.event_cache.get(hash).map(|event| (*hash, event.clone()))).collect();
                                        let result = match evaluate_expression(
                                            &state.part_definition_form.composing_expression,
                                            &events_vec,
                                        )
                                        {
                                            Ok(value) => format!(
                                                "{} {}",
                                                i18n::tr(&state, "Result:", "結果:", "Rezulto:"),
                                                value
                                            ),
                                            Err(error) => format!(
                                                "{} {}",
                                                i18n::tr(&state, "Error:", "エラー:", "Eraro:"),
                                                error
                                            ),
                                        };
                                        let mut next = state.clone();
                                        next.part_definition_form.eval_result = Some(result);
                                        next
                                    }));
                                }))
                                .children([text(i18n::tr(&state, "Evaluate", "評価", "Taksi"))])
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
                                        let part_type =
                                            state.part_definition_form.part_type_input.clone();
                                        let module_definition_event_hash =
                                            state.part_definition_form.module_definition_event_hash;
                                        if part_name.is_empty() {
                                            let mut next = state.clone();
                                            next.part_definition_form.eval_result =
                                                Some(i18n::tr(
                            &state,
                                                    "Error: part name is required",
                                                    "エラー: パーツ名は必須です",
                                                    "Eraro: parto-nomo estas bezonata",
                                                ).to_string());
                                            return next;
                                        }
                                        let expression =
                                            state.part_definition_form.composing_expression.clone();
                                        let key_for_async = key.clone();
                                        let force_offline = state.force_offline;

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
                                                                part_type,
                                                                description: description.into(),
                                                                expression,
                                                                module_definition_event_hash,
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
                                                    if status
                                                        == crate::local_event::LocalEventStatus::Sent
                                                    {
                                                        let events = crate::fetch::get_events(
                                                            None,
                                                            Some(20),
                                                            Some(0),
                                                        )
                                                        .await;
                                                        if let Ok(events) = events {
                                                            set_state_for_async(Box::new(
                                                                move |state| {
                                                                    let events_len = events.len();
                                                                    let mut event_cache =
                                                                        state.event_cache.clone();
                                                                    let mut event_hashes =
                                                                        Vec::new();
                                                                    for (hash, event) in events {
                                                                        event_cache.insert(hash, event);
                                                                        event_hashes.push(hash);
                                                                    }
                                                                    let mut next = state.clone();
                                                                    next.event_cache = event_cache;
                                                                    next.event_list_state =
                                                                        crate::EventListState {
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
                                                                    next
                                                                },
                                                            ));
                                                        }
                                                    } else {
                                                        set_state_for_async(Box::new(move |state| {
                                                            let mut next = state.clone();
                                                            crate::app_state::upsert_local_event_record(
                                                                &mut next,
                                                                record,
                                                            );
                                                            next.part_definition_form.eval_result =
                                                                Some(match status {
                                                                    crate::local_event::LocalEventStatus::Queued => {
                                                                        i18n::tr(
                            &state,
                                                                            "PartDefinition queued (offline)",
                                                                            "PartDefinition をキューに追加しました (オフライン)",
                                                                            "PartDefinition envicigita (senkonekte)",
                                                                        )
                                                                        .to_string()
                                                                    }
                                                                    crate::local_event::LocalEventStatus::Failed => {
                                                                        i18n::tr(
                            &state,
                                                                            "PartDefinition failed to send",
                                                                            "PartDefinition の送信に失敗しました",
                                                                            "PartDefinition sendado malsukcesis",
                                                                        )
                                                                        .to_string()
                                                                    }
                                                                    crate::local_event::LocalEventStatus::Sent => {
                                                                        i18n::tr(
                            &state,
                                                                            "PartDefinition posted",
                                                                            "PartDefinition を投稿しました",
                                                                            "PartDefinition sendita",
                                                                        )
                                                                        .to_string()
                                                                    }
                                                                });
                                                            next
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
                                        next.part_definition_form.part_type_input =
                                            Some(definy_event::event::PartType::Number);
                                        next.part_definition_form.part_description_input = String::new();
                                        next.part_definition_form.module_definition_event_hash = None;
                                        next.part_definition_form.eval_result = None;
                                        next.part_definition_form.composing_expression =
                                            definy_event::event::Expression::Number(
                                                definy_event::event::NumberExpression { value: 0 },
                                            );
                                        next
                                    }));
                                }))
                                .children([text(i18n::tr(&state, "Send", "送信", "Sendi"))])
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
        .style(crate::layout::page_shell_style("1.25rem"))
        .children({
            let mut children = Vec::new();
            children.push(filter_dropdown);
            if let Some(part_definition_form) = part_definition_form {
                children.push(part_definition_form);
            }
            if let Some(result) = &state.part_definition_form.eval_result {
                children.push(
                    Div::new()
                        .class("event-detail-card")
                        .style(
                            Style::new()
                                .set("padding", "0.7rem 0.8rem")
                                .set("font-family", "'JetBrains Mono', monospace")
                                .set("font-size", "0.82rem")
                                .set("word-break", "break-word"),
                        )
                        .children([text(result)])
                        .into_node(),
                );
            }
            children.push(
                Div::new()
                    .class("event-list")
                    .style(Style::new().set("display", "grid").set("gap", "0.7rem"))
                    .children({
                        let account_name_map = state.account_name_map();

                        state
                            .event_list_state
                            .event_hashes
                            .iter()
                            .filter_map(|hash| {
                                state.event_cache.get(hash).map(|event| (hash, event))
                            })
                            .map(|(hash, event)| event_view(&state, hash, event, &account_name_map))
                            .collect::<Vec<Node<AppState>>>()
                    })
                    .into_node(),
            );
            if state.event_list_state.is_loading {
                children.push(
                    Div::new()
                        .style(
                            Style::new()
                                .set("text-align", "center")
                                .set("padding", "1rem"),
                        )
                        .children([text(i18n::tr(
                            &state,
                            "Loading events...",
                            "イベントを読み込み中...",
                            "Ŝargado de eventoj...",
                        ))])
                        .into_node(),
                );
            } else if state.event_list_state.has_more {
                let button_text = if state.event_list_state.event_hashes.is_empty() {
                    i18n::tr(
                        &state,
                        "Load Events",
                        "イベントを読み込む",
                        "Ŝargi eventojn",
                    )
                } else {
                    i18n::tr(
                        &state,
                        "Load More Events",
                        "さらに読み込む",
                        "Ŝargi pliajn eventojn",
                    )
                };
                children.push(
                    Button::new()
                        .type_("button")
                        .on_click(EventHandler::new(move |set_state| {
                            let state = state.clone();
                            async move {
                                let filter = state.event_list_state.filter_event_type;
                                let page_size = state.event_list_state.page_size;
                                let is_empty = state.event_list_state.event_hashes.is_empty();
                                let current_offset_base = state.event_list_state.current_offset;
                                let set_state = std::rc::Rc::new(set_state);
                                set_state(Box::new(|state: AppState| {
                                    let mut next = state.clone();
                                    next.event_list_state.is_loading = true;
                                    next
                                }));
                                let current_offset = if is_empty {
                                    0
                                } else {
                                    current_offset_base + page_size
                                };
                                let events = crate::fetch::get_events(
                                    filter,
                                    Some(page_size),
                                    Some(current_offset),
                                )
                                .await;
                                if let Ok(events) = events {
                                    let events_len = events.len();
                                    set_state(Box::new(move |state: AppState| {
                                        let mut event_cache = state.event_cache.clone();
                                        let mut event_hashes = if current_offset == 0 {
                                            Vec::new()
                                        } else {
                                            state.event_list_state.event_hashes.clone()
                                        };
                                        for (hash, event) in events {
                                            if !event_cache.contains_key(&hash) {
                                                event_cache.insert(hash, event);
                                                event_hashes.push(hash);
                                            }
                                        }
                                        AppState {
                                            event_cache,
                                            event_list_state: crate::EventListState {
                                                event_hashes,
                                                current_offset,
                                                page_size: state.event_list_state.page_size,
                                                is_loading: false,
                                                has_more: events_len
                                                    == state.event_list_state.page_size as usize,
                                                filter_event_type: state
                                                    .event_list_state
                                                    .filter_event_type,
                                            },
                                            ..state.clone()
                                        }
                                    }));
                                } else {
                                    set_state(Box::new(|state: AppState| {
                                        let mut next = state.clone();
                                        next.event_list_state.is_loading = false;
                                        next
                                    }));
                                }
                            }
                        }))
                        .children([text(button_text)])
                        .into_node(),
                );
            } else if state.event_list_state.event_hashes.is_empty()
                && !state.event_list_state.is_loading
            {
                children.push(
                    Div::new()
                        .style(
                            Style::new()
                                .set("text-align", "center")
                                .set("padding", "1rem")
                                .set("color", "var(--text-secondary)"),
                        )
                        .children([text(i18n::tr(
                            &state,
                            "No events found. Click 'Load Events' to fetch.",
                            "イベントが見つかりません。'Load Events' をクリックして取得します。",
                            "Neniuj eventoj trovitaj. Klaku 'Load Events' por ŝargi.",
                        ))])
                        .into_node(),
                );
            }
            children
        })
        .into_node()
}

fn event_view(
    state: &AppState,
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
                    .set("padding", "0.95rem")
                    .set("box-shadow", "0 4px 6px -1px rgba(0, 0, 0, 0.1)")
                    .set("transition", "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)")
                    .set("display", "grid")
                    .set("gap", "0.75rem"),
            )
            .href(state.href_with_lang(crate::Location::Event(*hash)))
            .children([
                Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "0.8rem")
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
                            .children([text(&crate::hash_format::encode_bytes(
                                event.account_id.0.as_slice(),
                            ))])
                            .into_node(),
                    ])
                    .into_node(),
                match &event.content {
                    EventContent::CreateAccount(create_account_event) => Div::new()
                        .style(Style::new().set("color", "var(--primary)"))
                        .children([
                            text(i18n::tr(
                                &state,
                                "Account created:",
                                "アカウント作成:",
                                "Konto kreita:",
                            )),
                            text(create_account_event.account_name.as_ref()),
                        ])
                        .into_node(),
                    EventContent::ChangeProfile(change_profile_event) => Div::new()
                        .style(Style::new().set("color", "var(--primary)"))
                        .children([
                            text(i18n::tr(
                                &state,
                                "Profile changed:",
                                "プロフィール変更:",
                                "Profilo ŝanĝita:",
                            )),
                            text(change_profile_event.account_name.as_ref()),
                        ])
                        .into_node(),
                    EventContent::PartDefinition(part_definition_event) => Div::new()
                        .style(Style::new().set("font-size", "0.98rem"))
                        .children([
                            A::<AppState, crate::Location>::new()
                                .href(state.href_with_lang(crate::Location::Account(
                                    event.account_id.clone(),
                                )))
                                .style(
                                    Style::new()
                                        .set("font-size", "0.78rem")
                                        .set("color", "var(--primary)")
                                        .set("font-weight", "600")
                                        .set("margin-bottom", "0.25rem")
                                        .set("text-decoration", "none"),
                                )
                                .children([text(crate::app_state::account_display_name(
                                    account_name_map,
                                    &event.account_id,
                                ))])
                                .into_node(),
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
                                            .set("font-size", "0.82rem")
                                            .set("color", "var(--text-secondary)")
                                            .set("white-space", "pre-wrap"),
                                    )
                                    .children([text(part_definition_event.description.as_ref())])
                                    .into_node()
                            },
                            A::<AppState, crate::Location>::new()
                                .href(state.href_with_lang(crate::Location::Part(*hash)))
                                .style(
                                    Style::new()
                                        .set("font-size", "0.82rem")
                                        .set("color", "var(--primary)")
                                        .set("text-decoration", "none"),
                                )
                                .children([text(i18n::tr(
                                    &state,
                                    "Open part detail",
                                    "パーツ詳細を開く",
                                    "Malfermi partajn detalojn",
                                ))])
                                .into_node(),
                        ])
                        .into_node(),
                    EventContent::PartUpdate(part_update_event) => Div::new()
                        .style(Style::new().set("font-size", "1.05rem"))
                        .children([
                            A::<AppState, crate::Location>::new()
                                .href(state.href_with_lang(crate::Location::Account(
                                    event.account_id.clone(),
                                )))
                                .style(
                                    Style::new()
                                        .set("font-size", "0.85rem")
                                        .set("color", "var(--primary)")
                                        .set("font-weight", "600")
                                        .set("margin-bottom", "0.25rem")
                                        .set("text-decoration", "none"),
                                )
                                .children([text(crate::app_state::account_display_name(
                                    account_name_map,
                                    &event.account_id,
                                ))])
                                .into_node(),
                            text(format!(
                                "{} {}",
                                i18n::tr(
                                    &state,
                                    "Part updated:",
                                    "パーツ更新:",
                                    "Parto ĝisdatigita:"
                                ),
                                part_update_event.part_name
                            )),
                            Div::new()
                                .class("mono")
                                .style(
                                    Style::new()
                                        .set("font-size", "0.82rem")
                                        .set("opacity", "0.85"),
                                )
                                .children([text(format!(
                                    "{} {}",
                                    i18n::tr(&state, "expression:", "式:", "esprimo:"),
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
                            A::<AppState, crate::Location>::new()
                                .href(state.href_with_lang(crate::Location::Part(
                                    part_update_event.part_definition_event_hash,
                                )))
                                .style(
                                    Style::new()
                                        .set("font-size", "0.82rem")
                                        .set("color", "var(--primary)")
                                        .set("text-decoration", "none"),
                                )
                                .children([text(i18n::tr(
                                    &state,
                                    "Open part detail",
                                    "パーツ詳細を開く",
                                    "Malfermi partajn detalojn",
                                ))])
                                .into_node(),
                        ])
                        .into_node(),
                    EventContent::ModuleDefinition(module_definition_event) => Div::new()
                        .style(Style::new().set("font-size", "1rem"))
                        .children([
                            A::<AppState, crate::Location>::new()
                                .href(state.href_with_lang(crate::Location::Account(
                                    event.account_id.clone(),
                                )))
                                .style(
                                    Style::new()
                                        .set("font-size", "0.78rem")
                                        .set("color", "var(--primary)")
                                        .set("font-weight", "600")
                                        .set("margin-bottom", "0.25rem")
                                        .set("text-decoration", "none"),
                                )
                                .children([text(crate::app_state::account_display_name(
                                    account_name_map,
                                    &event.account_id,
                                ))])
                                .into_node(),
                            text(format!(
                                "{} {}",
                                i18n::tr(
                                    &state,
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
                                            .set("font-size", "0.82rem")
                                            .set("color", "var(--text-secondary)")
                                            .set("white-space", "pre-wrap"),
                                    )
                                    .children([text(module_definition_event.description.as_ref())])
                                    .into_node()
                            },
                        ])
                        .into_node(),
                    EventContent::ModuleUpdate(module_update_event) => Div::new()
                        .style(Style::new().set("font-size", "1rem"))
                        .children([
                            A::<AppState, crate::Location>::new()
                                .href(state.href_with_lang(crate::Location::Account(
                                    event.account_id.clone(),
                                )))
                                .style(
                                    Style::new()
                                        .set("font-size", "0.78rem")
                                        .set("color", "var(--primary)")
                                        .set("font-weight", "600")
                                        .set("margin-bottom", "0.25rem")
                                        .set("text-decoration", "none"),
                                )
                                .children([text(crate::app_state::account_display_name(
                                    account_name_map,
                                    &event.account_id,
                                ))])
                                .into_node(),
                            text(format!(
                                "{} {}",
                                i18n::tr(
                                    &state,
                                    "Module updated:",
                                    "モジュール更新:",
                                    "Modulo ĝisdatigita:"
                                ),
                                module_update_event.module_name
                            )),
                            if module_update_event.module_description.is_empty() {
                                Div::new().children([]).into_node()
                            } else {
                                Div::new()
                                    .style(
                                        Style::new()
                                            .set("font-size", "0.82rem")
                                            .set("color", "var(--text-secondary)")
                                            .set("white-space", "pre-wrap"),
                                    )
                                    .children([text(
                                        module_update_event.module_description.as_ref(),
                                    )])
                                    .into_node()
                            },
                            Div::new()
                                .style(
                                    Style::new()
                                        .set("font-size", "0.85rem")
                                        .set("color", "var(--text-secondary)"),
                                )
                                .children([text(format!(
                                    "base: {}",
                                    crate::hash_format::encode_hash32(
                                        &module_update_event.module_definition_event_hash,
                                    )
                                ))])
                                .into_node(),
                            A::<AppState, crate::Location>::new()
                                .href(state.href_with_lang(crate::Location::Event(
                                    module_update_event.module_definition_event_hash,
                                )))
                                .style(
                                    Style::new()
                                        .set("font-size", "0.82rem")
                                        .set("color", "var(--primary)")
                                        .set("text-decoration", "none"),
                                )
                                .children([text(i18n::tr(
                                    &state,
                                    "Open module definition",
                                    "モジュール定義を開く",
                                    "Malfermi modulo-difinon",
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
            .children([text(&format!(
                "{}: {:?}",
                i18n::tr(
                    &state,
                    "Failed to load events",
                    "イベントの読み込みに失敗しました",
                    "Malsukcesis ŝargi eventojn",
                ),
                e
            ))])
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
                .and_then(|element| {
                    wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(element).ok()
                })
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
                .and_then(|document| {
                    document
                        .query_selector("textarea[name='part-description']")
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
                next.part_definition_form.part_description_input = value;
                next
            }));
        }),
    ));
    textarea.into_node()
}

fn part_type_input(state: &AppState) -> Node<AppState> {
    Div::new()
        .style(Style::new().set("display", "grid").set("gap", "0.35rem"))
        .children([
            Div::new()
                .style(
                    Style::new()
                        .set("font-size", "0.85rem")
                        .set("color", "var(--text-secondary)"),
                )
                .children([text(i18n::tr(
                    &state,
                    "Part Type",
                    "パーツ型",
                    "Parto-tipo",
                ))])
                .into_node(),
            render_part_type_editor(state, &state.part_definition_form.part_type_input, 0),
        ])
        .into_node()
}

fn module_selection_input(state: &AppState) -> Node<AppState> {
    let mut options = vec![(
        "".to_string(),
        i18n::tr(&state, "No module", "モジュールなし", "Neniu modulo").to_string(),
    )];
    options.extend(collect_module_snapshots(state).into_iter().map(|module| {
        (
            crate::hash_format::encode_hash32(&module.definition_event_hash),
            module.module_name,
        )
    }));

    let current_value = state
        .part_definition_form
        .module_definition_event_hash
        .map(|hash| crate::hash_format::encode_hash32(&hash))
        .unwrap_or_else(|| "".to_string());

    let dropdown = crate::dropdown::searchable_dropdown(
        state,
        "part-definition-module",
        &current_value,
        &options,
        std::rc::Rc::new(|value| {
            Box::new(move |state: AppState| {
                let mut next = state.clone();
                next.part_definition_form.module_definition_event_hash =
                    crate::hash_format::decode_hash32(&value);
                next
            })
        }),
    );

    Div::new()
        .style(Style::new().set("display", "grid").set("gap", "0.35rem"))
        .children([
            Div::new()
                .style(
                    Style::new()
                        .set("font-size", "0.85rem")
                        .set("color", "var(--text-secondary)"),
                )
                .children([text(i18n::tr(&state, "Module", "モジュール", "Modulo"))])
                .into_node(),
            dropdown,
        ])
        .into_node()
}

fn render_part_type_editor(
    state: &AppState,
    part_type: &Option<definy_event::event::PartType>,
    depth: usize,
) -> Node<AppState> {
    let name = format!("part-definition-type-{}", depth);
    let selected = current_part_type_selection(part_type);

    let mut options = Vec::new();
    if depth == 0 {
        options.push((
            "none".to_string(),
            i18n::tr(&state, "None", "なし", "Neniu").to_string(),
        ));
    }

    options.extend([
        (
            "number".to_string(),
            i18n::tr(&state, "Number", "数値", "Nombro").to_string(),
        ),
        (
            "string".to_string(),
            i18n::tr(&state, "String", "文字列", "Teksto").to_string(),
        ),
        (
            "boolean".to_string(),
            i18n::tr(&state, "Boolean", "真偽値", "Bulea").to_string(),
        ),
        (
            "type".to_string(),
            i18n::tr(&state, "Type", "型", "Tipo").to_string(),
        ),
        (
            "list".to_string(),
            i18n::tr(&state, "List<...>", "リスト<...>", "Listo<...>").to_string(),
        ),
    ]);

    options.extend(
        collect_part_snapshots(state)
            .into_iter()
            .filter(|snapshot| snapshot.part_type == Some(definy_event::event::PartType::Type))
            .map(|snapshot| {
                let value = format!(
                    "type_part:{}",
                    crate::hash_format::encode_hash32(&snapshot.definition_event_hash)
                );
                (
                    value,
                    format!(
                        "{} {}",
                        i18n::tr(&state, "Type Part:", "型パーツ:", "Tipo-parto:"),
                        snapshot.part_name
                    ),
                )
            }),
    );

    let on_change = std::rc::Rc::new(move |value: String| {
        let depth_clone = depth;
        let update_fn: Box<dyn FnOnce(AppState) -> AppState> = Box::new(move |state: AppState| {
            let mut next = state.clone();
            update_part_type_at_depth(
                &mut next.part_definition_form.part_type_input,
                depth_clone,
                value.as_str(),
            );
            next
        });
        update_fn
    });

    let mut children = vec![crate::dropdown::searchable_dropdown(
        state,
        name.as_str(),
        selected.as_str(),
        &options,
        on_change,
    )];

    if let Some(definy_event::event::PartType::List(item_type)) = part_type {
        children.push(
            Div::new()
                .style(
                    Style::new()
                        .set("padding-left", "1rem")
                        .set("border-left", "2px solid var(--border)"),
                )
                .children([
                    Div::new()
                        .style(
                            Style::new()
                                .set("font-size", "0.78rem")
                                .set("color", "var(--text-secondary)")
                                .set("margin-bottom", "0.25rem"),
                        )
                        .children([text(i18n::tr(&state, "Item Type", "要素型", "Ero-tipo"))])
                        .into_node(),
                    render_part_type_editor(state, &Some(item_type.as_ref().clone()), depth + 1),
                ])
                .into_node(),
        );
    }

    Div::new()
        .style(Style::new().set("display", "grid").set("gap", "0.45rem"))
        .children(children)
        .into_node()
}

fn update_part_type_at_depth(
    part_type: &mut Option<definy_event::event::PartType>,
    depth: usize,
    selected: &str,
) {
    if depth == 0 {
        *part_type = next_part_type_from_selected(selected, part_type);
        return;
    }

    match part_type {
        Some(definy_event::event::PartType::List(item_type)) => {
            update_part_type_nested(item_type.as_mut(), depth - 1, selected);
        }
        _ => {
            *part_type = Some(definy_event::event::PartType::List(Box::new(
                definy_event::event::PartType::Number,
            )));
            if let Some(definy_event::event::PartType::List(item_type)) = part_type {
                update_part_type_nested(item_type.as_mut(), depth - 1, selected);
            }
        }
    }
}

fn update_part_type_nested(
    part_type: &mut definy_event::event::PartType,
    depth: usize,
    selected: &str,
) {
    if depth == 0 {
        *part_type = next_nested_part_type_from_selected(selected, part_type);
        return;
    }

    match part_type {
        definy_event::event::PartType::List(item_type) => {
            update_part_type_nested(item_type.as_mut(), depth - 1, selected);
        }
        _ => {
            *part_type = definy_event::event::PartType::List(Box::new(
                definy_event::event::PartType::Number,
            ));
            if let definy_event::event::PartType::List(item_type) = part_type {
                update_part_type_nested(item_type.as_mut(), depth - 1, selected);
            }
        }
    }
}

fn next_part_type_from_selected(
    selected: &str,
    current: &Option<definy_event::event::PartType>,
) -> Option<definy_event::event::PartType> {
    if let Some(encoded) = selected.strip_prefix("type_part:") {
        if let Some(hash) = decode_hash32(encoded) {
            return Some(definy_event::event::PartType::TypePart(hash));
        }
    }
    match selected {
        "none" => None,
        "string" => Some(definy_event::event::PartType::String),
        "boolean" => Some(definy_event::event::PartType::Boolean),
        "type" => Some(definy_event::event::PartType::Type),
        "list" => match current {
            Some(definy_event::event::PartType::List(item_type)) => Some(
                definy_event::event::PartType::List(Box::new(item_type.as_ref().clone())),
            ),
            _ => Some(definy_event::event::PartType::List(Box::new(
                definy_event::event::PartType::Number,
            ))),
        },
        _ => Some(definy_event::event::PartType::Number),
    }
}

fn next_nested_part_type_from_selected(
    selected: &str,
    current: &definy_event::event::PartType,
) -> definy_event::event::PartType {
    if let Some(encoded) = selected.strip_prefix("type_part:") {
        if let Some(hash) = decode_hash32(encoded) {
            return definy_event::event::PartType::TypePart(hash);
        }
    }
    match selected {
        "string" => definy_event::event::PartType::String,
        "boolean" => definy_event::event::PartType::Boolean,
        "type" => definy_event::event::PartType::Type,
        "list" => match current {
            definy_event::event::PartType::List(item_type) => {
                definy_event::event::PartType::List(Box::new(item_type.as_ref().clone()))
            }
            _ => {
                definy_event::event::PartType::List(Box::new(definy_event::event::PartType::Number))
            }
        },
        _ => definy_event::event::PartType::Number,
    }
}

fn current_part_type_selection(part_type: &Option<definy_event::event::PartType>) -> String {
    match part_type {
        None => "none".to_string(),
        Some(definy_event::event::PartType::Number) => "number".to_string(),
        Some(definy_event::event::PartType::String) => "string".to_string(),
        Some(definy_event::event::PartType::Boolean) => "boolean".to_string(),
        Some(definy_event::event::PartType::Type) => "type".to_string(),
        Some(definy_event::event::PartType::TypePart(hash)) => {
            format!("type_part:{}", crate::hash_format::encode_hash32(hash))
        }
        Some(definy_event::event::PartType::List(_)) => "list".to_string(),
    }
}

fn decode_hash32(value: &str) -> Option<[u8; 32]> {
    let bytes =
        base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, value).ok()?;
    if bytes.len() == 32 {
        let mut result = [0u8; 32];
        result.copy_from_slice(&bytes);
        Some(result)
    } else {
        None
    }
}
