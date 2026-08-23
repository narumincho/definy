use narumincho_vdom::*;

use crate::app_state::AppState;
use crate::module_projection::collect_module_snapshots;
use crate::page_context::PageContext;

pub fn module_list_view(state: &AppState, context: &PageContext) -> Node {
    let snapshots = collect_module_snapshots(state);
    let account_name_map = state.account_name_map();

    let create_form = if state.current_key.is_some() {
        Some(module_create_form(state, context))
    } else {
        Some(
            Div::new()
                .class("event-detail-card")
                .style(
                    Style::new()
                        .set("padding", "0.9rem")
                        .set("color", "var(--text-secondary)"),
                )
                .children([text(context.language.label(
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
                    .children([text(context.language.label(
                        "Modules",
                        "モジュール",
                        "Moduloj",
                    ))])
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
                        .children([text(context.language.label(
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
                                                    .children([text(context.language.label(
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
                                                    A::<crate::Location>::new()
                                                        .href(
                                                            context.href_with_lang(
                                                                crate::Location::Module(
                                                                    module
                                                                        .definition_event_hash
                                                                        .clone(),
                                                                ),
                                                            ),
                                                        )
                                                        .children([text(context.language.label(
                                                            "Open module detail",
                                                            "モジュール詳細を開く",
                                                            "Malfermi modulajn detalojn",
                                                        ))])
                                                        .into_node(),
                                                    A::<crate::Location>::new()
                                                        .href(context.href_with_lang(
                                                            crate::Location::Event(
                                                                module.latest_event_hash,
                                                            ),
                                                        ))
                                                        .children([text(context.language.label(
                                                            "Latest event",
                                                            "最新イベント",
                                                            "Lasta evento",
                                                        ))])
                                                        .into_node(),
                                                    A::<crate::Location>::new()
                                                        .href(context.href_with_lang(
                                                            crate::Location::Event(
                                                                module.definition_event_hash,
                                                            ),
                                                        ))
                                                        .children([text(context.language.label(
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
                                .collect::<Vec<Node>>(),
                        )
                        .into_node(),
                );
            }
            children
        })
        .into_node()
}

fn module_create_form(state: &AppState, context: &PageContext) -> Node {
    let language = context.language;
    Div::new()
        .class("event-detail-card")
        .style(Style::new().set("display", "grid").set("gap", "0.6rem"))
        .children([
            Div::new()
                .style(Style::new().set("font-size", "0.9rem"))
                .children([text(context.language.label(
                    "Create module",
                    "モジュールを作成",
                    "Krei modulon",
                ))])
                .into_node(),
            module_name_input(state, context),
            module_description_input(state, context),
            Button::new()
                .type_("button")
                .on_click(EventHandler::new(move |set_state| {
                    let set_state = std::rc::Rc::new(set_state);
                    let set_state_for_async = set_state.clone();
                    async move {
                        set_state(Box::new(move |state: AppState| {
                            let key: &ed25519_dalek::SigningKey =
                                if let Some(key) = &state.current_key {
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
                                next.module_definition_form.result_message = Some(
                                    language
                                        .label(
                                            "Error: module name is required",
                                            "エラー: モジュール名は必須です",
                                            "Eraro: modulo-nomo estas bezonata",
                                        )
                                        .to_string(),
                                );
                                return next;
                            }
                            let key_for_async = key.clone();
                            let force_offline = state.force_offline;
                            wasm_bindgen_futures::spawn_local(
                                crate::event_submit::submit_event(
                                    definy_event::event::EventContent::ModuleDefinition(
                                        definy_event::event::ModuleDefinitionEvent {
                                            module_name: module_name.into(),
                                            description: module_description.into(),
                                        },
                                    ),
                                    key_for_async,
                                    force_offline,
                                    None,
                                    set_state_for_async,
                                move |next, record| {
                                    if record.status == crate::local_event::LocalEventStatus::Sent {
                                        next.module_definition_form.result_message = None;
                                    } else {
                                        next.module_definition_form.result_message = Some(
                                            match record.status {
                                                crate::local_event::LocalEventStatus::Queued => {
                                                    language.label(
                                                        "ModuleDefinition queued (offline)",
                                                        "ModuleDefinition をキューに追加しました (オフライン)",
                                                        "ModuleDefinition envicigita (senkonekte)",
                                                    )
                                                    .to_string()
                                                }
                                                crate::local_event::LocalEventStatus::Failed => {
                                                    language.label(
                                                        "ModuleDefinition failed to send",
                                                        "ModuleDefinition の送信に失敗しました",
                                                        "ModuleDefinition sendado malsukcesis",
                                                    )
                                                    .to_string()
                                                }
                                                crate::local_event::LocalEventStatus::Sent => unreachable!(),
                                            },
                                        );
                                    }
                                },
                            ));
                            let mut next = state.clone();
                            next.module_definition_form.module_name_input = String::new();
                            next.module_definition_form.module_description_input = String::new();
                            next.module_definition_form.result_message = None;
                            next
                        }));
                    }
                }))
                .children([text(context.language.label("Create", "作成", "Krei"))])
                .into_node(),
        ])
        .into_node()
}

fn module_name_input(state: &AppState, context: &PageContext) -> Node {
    Input::new()
        .name("module-name")
        .type_("text")
        .value(&state.module_definition_form.module_name_input)
        .placeholder(
            context
                .language
                .label("module name", "モジュール名", "modula nomo"),
        )
        .on_input(EventHandler::new(move |set_state| async move {
            let value = crate::dom::get_input_value("input[name='module-name']");
            set_state(Box::new(move |state: AppState| {
                let mut next = state.clone();
                next.module_definition_form.module_name_input = value;
                next
            }));
        }))
        .into_node()
}

fn module_description_input(state: &AppState, context: &PageContext) -> Node {
    Textarea::new()
        .name("module-description")
        .value(&state.module_definition_form.module_description_input)
        .style(Style::new().set("min-height", "5rem"))
        .placeholder(context.language.label(
            "description (optional)",
            "説明 (任意)",
            "priskribo (nedeviga)",
        ))
        .on_input(EventHandler::new(move |set_state| async move {
            let value = crate::dom::get_textarea_value("textarea[name='module-description']");
            set_state(Box::new(move |state: AppState| {
                let mut next = state.clone();
                next.module_definition_form.module_description_input = value;
                next
            }));
        }))
        .into_node()
}
