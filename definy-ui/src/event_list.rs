use definy_event::EventHashId;
use definy_event::event::{EventContent, EventType};
use narumincho_vdom::*;

use crate::app_state::AppState;
use crate::expression_eval::expression_to_source;
use crate::page_context::PageContext;

fn part_type_text(part_type: &definy_event::event::PartType) -> String {
    match part_type {
        definy_event::event::PartType::Number => "Number".to_string(),
        definy_event::event::PartType::String => "String".to_string(),
        definy_event::event::PartType::Boolean => "Boolean".to_string(),
        definy_event::event::PartType::Type => "Type".to_string(),
        definy_event::event::PartType::TypePart(hash) => {
            format!("TypePart({})", hash)
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

pub fn event_list_view(state: &AppState, context: &PageContext) -> Node {
    let state = state.clone();
    let filter_options = vec![
        (
            "".to_string(),
            context
                .language
                .label("All Events", "すべてのイベント", "Ĉiuj eventoj")
                .to_string(),
        ),
        (
            "create_account".to_string(),
            context
                .language
                .label("Create Account", "アカウント作成", "Krei konton")
                .to_string(),
        ),
        (
            "change_profile".to_string(),
            context
                .language
                .label("Change Profile", "プロフィール変更", "Ŝanĝi profilon")
                .to_string(),
        ),
        (
            "part_definition".to_string(),
            context
                .language
                .label("Part Definition", "パーツ定義", "Parto-difino")
                .to_string(),
        ),
        (
            "part_update".to_string(),
            context
                .language
                .label("Part Update", "パーツ更新", "Parto-ĝisdatigo")
                .to_string(),
        ),
        (
            "module_definition".to_string(),
            context
                .language
                .label("Module Definition", "モジュール定義", "Modulo-difino")
                .to_string(),
        ),
        (
            "module_update".to_string(),
            context
                .language
                .label("Module Update", "モジュール更新", "Modulo-ĝisdatigo")
                .to_string(),
        ),
    ];

    let current_filter = context
        .filter_event_type
        .as_ref()
        .map(|et| et.to_string())
        .unwrap_or_default();

    let filter_dropdown = crate::dropdown::searchable_dropdown(
        &state,
        "event_filter",
        &current_filter,
        &filter_options,
        std::rc::Rc::new({
            let context = context.clone();
            move |value, label, is_selected| {
                let event_type = match value {
                    "create_account" => Some(EventType::CreateAccount),
                    "change_profile" => Some(EventType::ChangeProfile),
                    "part_definition" => Some(EventType::PartDefinition),
                    "part_update" => Some(EventType::PartUpdate),
                    "module_definition" => Some(EventType::ModuleDefinition),
                    "module_update" => Some(EventType::ModuleUpdate),
                    _ => None,
                };
                Anchor::<crate::Location>::new()
                    .href(narumincho_vdom::Href::External(
                        context.home_url_with_lang(event_type),
                    ))
                    .style(
                        crate::dropdown::option_style(is_selected)
                            .set("display", "block")
                            .set("text-decoration", "none"),
                    )
                    .children([text(label)])
                    .into_node()
            }
        }),
    );

    Div::new()
        .class("page-shell")
        .style(crate::layout::page_shell_style("0.8rem"))
        .children({
            let mut children = Vec::new();
            children.push(filter_dropdown);
            children.push(
                Div::new()
                    .class("event-list")
                    .style(Style::new().set("display", "grid").set("gap", "0.45rem"))
                    .children({
                        let account_name_map = state.account_name_map();
                        let hashes: Vec<EventHashId> =
                            if !state.event_list_state.event_hashes.is_empty() {
                                state.event_list_state.event_hashes.clone()
                            } else {
                                let mut entries: Vec<_> = state
                                    .event_cache
                                    .iter()
                                    .filter_map(|(hash, event_res)| {
                                        event_res.as_ref().ok().and_then(|(_, event)| {
                                            if let Some(filter) = &context.filter_event_type {
                                                if EventType::from(&event.content) != *filter {
                                                    return None;
                                                }
                                            }
                                            Some((hash.clone(), event.time))
                                        })
                                    })
                                    .collect();
                                entries.sort_by(|a, b| b.1.cmp(&a.1));
                                entries.into_iter().map(|(h, _)| h).collect()
                            };

                        hashes
                            .iter()
                            .filter_map(|hash| {
                                state.event_cache.get(hash).map(|event| (hash, event))
                            })
                            .map(|(hash, event)| {
                                event_view(&state, context, hash, event, &account_name_map)
                            })
                            .collect::<Vec<Node>>()
                    })
                    .into_node(),
            );
            if state.event_list_state.is_loading {
                children.push(
                    Div::new()
                        .style(
                            Style::new()
                                .set("text-align", "center")
                                .set("padding", "1.5rem 1rem")
                                .set("color", "var(--text-secondary)")
                                .set("font-size", "0.85rem"),
                        )
                        .children([text(context.language.label(
                            "Loading events...",
                            "イベントを読み込み中...",
                            "Ŝargado de eventoj...",
                        ))])
                        .into_node(),
                );
            } else if state.event_list_state.has_more {
                let button_text = if state.event_list_state.event_hashes.is_empty() {
                    context
                        .language
                        .label("Load Events", "イベントを読み込む", "Ŝargi eventojn")
                } else {
                    context.language.label(
                        "Load More Events",
                        "さらに読み込む",
                        "Ŝargi pliajn eventojn",
                    )
                };
                children.push(
                    Div::new()
                        .style(
                            Style::new()
                                .set("display", "flex")
                                .set("justify-content", "center")
                                .set("padding", "0.4rem 0 0.8rem"),
                        )
                        .children([Button::new()
                            .type_("button")
                            .style(
                                Style::new()
                                    .set("display", "inline-flex")
                                    .set("align-items", "center")
                                    .set("justify-content", "center")
                                    .set("padding", "0.45rem 1.2rem")
                                    .set("background", "rgb(255 255 255 / 0.05)")
                                    .set("border", "1px solid var(--border)")
                                    .set("border-radius", "var(--radius-full)")
                                    .set("color", "var(--text)")
                                    .set("font-size", "0.85rem")
                                    .set("font-weight", "500")
                                    .set("cursor", "pointer")
                                    .set("transition", "all 0.2s ease")
                                    .set("box-shadow", "var(--shadow-sm)"),
                            )
                            .on_click(EventHandler::new(move |set_state| {
                                let state = state.clone();
                                async move {
                                    let set_state = std::rc::Rc::new(set_state);
                                    crate::app_state::load_more_events(state, set_state).await;
                                }
                            }))
                            .children([text(button_text)])
                            .into_node()])
                        .into_node(),
                );
            } else if state.event_list_state.event_hashes.is_empty()
                && !state.event_list_state.is_loading
            {
                children.push(
                    Div::new()
                        .class("event-detail-card")
                        .style(
                            Style::new()
                                .set("padding", "2rem 1.5rem")
                                .set("text-align", "center")
                                .set("display", "grid")
                                .set("gap", "0.5rem")
                                .set("justify-items", "center")
                                .set("color", "var(--text-secondary)"),
                        )
                        .children([
                            Div::new()
                                .style(
                                    Style::new()
                                        .set("font-size", "1.5rem")
                                        .set("opacity", "0.5"),
                                )
                                .children([text("📋")])
                                .into_node(),
                            Div::new()
                                .style(
                                    Style::new()
                                        .set("font-size", "0.95rem")
                                        .set("color", "var(--text)"),
                                )
                                .children([text(context.language.label(
                                    "No events found",
                                    "イベントが見つかりません",
                                    "Neniuj eventoj trovitaj",
                                ))])
                                .into_node(),
                        ])
                        .into_node(),
                );
            }
            children
        })
        .into_node()
}

fn event_view(
    _state: &AppState,
    context: &PageContext,
    hash: &EventHashId,
    event_result: &Result<
        (ed25519_dalek::Signature, definy_event::event::Event),
        definy_event::VerifyAndDeserializeError,
    >,
    account_name_map: &std::collections::HashMap<definy_event::event::AccountId, Box<str>>,
) -> Node {
    match event_result {
        Ok((_, event)) => A::<crate::Location>::new()
            .class("event-card")
            .style(
                Style::new()
                    .set("background", "rgb(255 255 255 / 0.02)")
                    .set("backdrop-filter", "var(--glass-blur)")
                    .set("border", "1px solid var(--border)")
                    .set("border-radius", "var(--radius-md)")
                    .set("padding", "0.65rem 0.85rem")
                    .set("box-shadow", "var(--shadow-sm)")
                    .set("transition", "all 0.2s ease")
                    .set("display", "grid")
                    .set("gap", "0.4rem"),
            )
            .href(context.href_with_lang(crate::Location::Event(hash.clone())))
            .children([
                Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "0.76rem")
                            .set("color", "var(--text-secondary)")
                            .set("display", "flex")
                            .set("justify-content", "space-between")
                            .set("align-items", "center"),
                    )
                    .children([
                        Div::new()
                            .children([text(event.time.format("%Y-%m-%d %H:%M:%S").to_string())])
                            .into_node(),
                        Div::new()
                            .class("badge")
                            .style(
                                Style::new()
                                    .set("font-size", "0.72rem")
                                    .set("font-weight", "500")
                                    .set("color", "var(--primary)")
                                    .set("background", "rgb(124 192 216 / 0.1)")
                                    .set("padding", "0.15rem 0.45rem")
                                    .set("border-radius", "var(--radius-full)"),
                            )
                            .children([text(event_type_label(&event.content, context))])
                            .into_node(),
                    ])
                    .into_node(),
                event_content_view(event, context, hash, account_name_map),
            ])
            .into_node(),
        Err(err) => Div::new()
            .class("event-card")
            .style(
                Style::new()
                    .set("padding", "0.65rem 0.85rem")
                    .set("border-left", "3px solid var(--error)")
                    .set("display", "grid")
                    .set("gap", "0.3rem"),
            )
            .children([
                Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "0.85rem")
                            .set("font-weight", "600")
                            .set("color", "var(--error)"),
                    )
                    .children([text(format!(
                        "{} ({})",
                        context.language.label(
                            "Invalid event",
                            "無効なイベント",
                            "Nevalida evento",
                        ),
                        hash
                    ))])
                    .into_node(),
                Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "0.8rem")
                            .set("color", "var(--text-secondary)"),
                    )
                    .children([text(format!("{:?}", err))])
                    .into_node(),
            ])
            .into_node(),
    }
}

fn event_content_view(
    event: &definy_event::event::Event,
    context: &PageContext,
    hash: &EventHashId,
    account_name_map: &std::collections::HashMap<definy_event::event::AccountId, Box<str>>,
) -> Node {
    match &event.content {
        EventContent::CreateAccount(create_account_event) => Div::new()
            .style(
                Style::new()
                    .set("display", "grid")
                    .set("gap", "0.25rem")
                    .set("font-size", "0.95rem"),
            )
            .children([
                A::<crate::Location>::new()
                    .href(
                        context.href_with_lang(crate::Location::Account(event.account_id.clone())),
                    )
                    .style(
                        Style::new()
                            .set("font-size", "0.82rem")
                            .set("color", "var(--primary)")
                            .set("font-weight", "600")
                            .set("text-decoration", "none"),
                    )
                    .children([text(create_account_event.account_name.as_ref())])
                    .into_node(),
                text(format!(
                    "{} {}",
                    context.language.label(
                        "Created account:",
                        "アカウントを作成しました:",
                        "Kreis konton:"
                    ),
                    create_account_event.account_name
                )),
            ])
            .into_node(),
        EventContent::ChangeProfile(change_profile_event) => Div::new()
            .style(
                Style::new()
                    .set("display", "grid")
                    .set("gap", "0.25rem")
                    .set("font-size", "0.95rem"),
            )
            .children([
                A::<crate::Location>::new()
                    .href(
                        context.href_with_lang(crate::Location::Account(event.account_id.clone())),
                    )
                    .style(
                        Style::new()
                            .set("font-size", "0.82rem")
                            .set("color", "var(--primary)")
                            .set("font-weight", "600")
                            .set("text-decoration", "none"),
                    )
                    .children([text(crate::app_state::account_display_name(
                        account_name_map,
                        &event.account_id,
                    ))])
                    .into_node(),
                text(format!(
                    "{} {}",
                    context.language.label(
                        "Changed account name to:",
                        "アカウント名を変更しました:",
                        "Ŝanĝis kontonomon al:"
                    ),
                    change_profile_event.account_name
                )),
            ])
            .into_node(),
        EventContent::PartDefinition(part_definition_event) => {
            let mut content_children = vec![
                A::<crate::Location>::new()
                    .href(
                        context.href_with_lang(crate::Location::Account(event.account_id.clone())),
                    )
                    .style(
                        Style::new()
                            .set("font-size", "0.82rem")
                            .set("color", "var(--primary)")
                            .set("font-weight", "600")
                            .set("text-decoration", "none"),
                    )
                    .children([text(crate::app_state::account_display_name(
                        account_name_map,
                        &event.account_id,
                    ))])
                    .into_node(),
                text(if let Some(expr) = &part_definition_event.expression {
                    format!(
                        "{}: {} = {}",
                        part_definition_event.part_name,
                        optional_part_type_text(&part_definition_event.part_type),
                        expression_to_source(expr)
                    )
                } else {
                    format!(
                        "{}: {}",
                        part_definition_event.part_name,
                        optional_part_type_text(&part_definition_event.part_type),
                    )
                }),
            ];
            if !part_definition_event.description.is_empty() {
                content_children.push(
                    Div::new()
                        .style(
                            Style::new()
                                .set("font-size", "0.78rem")
                                .set("color", "var(--text-secondary)")
                                .set("white-space", "pre-wrap"),
                        )
                        .children([text(part_definition_event.description.as_ref())])
                        .into_node(),
                );
            }
            content_children.push(
                A::<crate::Location>::new()
                    .href(context.href_with_lang(crate::Location::Part(hash.clone())))
                    .style(
                        Style::new()
                            .set("font-size", "0.78rem")
                            .set("color", "var(--primary)")
                            .set("text-decoration", "none"),
                    )
                    .children([text(context.language.label(
                        "Open part detail",
                        "パーツ詳細を開く",
                        "Malfermi partajn detalojn",
                    ))])
                    .into_node(),
            );
            Div::new()
                .style(
                    Style::new()
                        .set("display", "grid")
                        .set("gap", "0.25rem")
                        .set("font-size", "0.95rem"),
                )
                .children(content_children)
                .into_node()
        }
        EventContent::PartUpdate(part_update_event) => Div::new()
            .style(
                Style::new()
                    .set("display", "grid")
                    .set("gap", "0.25rem")
                    .set("font-size", "0.95rem"),
            )
            .children([
                A::<crate::Location>::new()
                    .href(
                        context.href_with_lang(crate::Location::Account(event.account_id.clone())),
                    )
                    .style(
                        Style::new()
                            .set("font-size", "0.82rem")
                            .set("color", "var(--primary)")
                            .set("font-weight", "600")
                            .set("text-decoration", "none"),
                    )
                    .children([text(crate::app_state::account_display_name(
                        account_name_map,
                        &event.account_id,
                    ))])
                    .into_node(),
                text(format!(
                    "{} {}",
                    context
                        .language
                        .label("Part updated:", "パーツ更新:", "Parto ĝisdatigita:"),
                    part_update_event.part_name
                )),
                Div::new()
                    .class("mono")
                    .style(
                        Style::new()
                            .set("font-size", "0.78rem")
                            .set("opacity", "0.85"),
                    )
                    .children([text(
                        part_update_event
                            .expression
                            .as_ref()
                            .map(expression_to_source)
                            .unwrap_or_else(|| {
                                context
                                    .language
                                    .label("(none)", "(なし)", "(neniu)")
                                    .to_string()
                            }),
                    )])
                    .into_node(),
                Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "0.78rem")
                            .set("color", "var(--text-secondary)"),
                    )
                    .children([text(format!(
                        "base: {}",
                        part_update_event.part_definition_event_hash
                    ))])
                    .into_node(),
                A::<crate::Location>::new()
                    .href(context.href_with_lang(crate::Location::Part(
                        part_update_event.part_definition_event_hash.clone(),
                    )))
                    .style(
                        Style::new()
                            .set("font-size", "0.78rem")
                            .set("color", "var(--primary)")
                            .set("text-decoration", "none"),
                    )
                    .children([text(context.language.label(
                        "Open part detail",
                        "パーツ詳細を開く",
                        "Malfermi partajn detalojn",
                    ))])
                    .into_node(),
            ])
            .into_node(),
        EventContent::ModuleDefinition(module_definition_event) => {
            let mut content_children = vec![
                A::<crate::Location>::new()
                    .href(
                        context.href_with_lang(crate::Location::Account(event.account_id.clone())),
                    )
                    .style(
                        Style::new()
                            .set("font-size", "0.82rem")
                            .set("color", "var(--primary)")
                            .set("font-weight", "600")
                            .set("text-decoration", "none"),
                    )
                    .children([text(crate::app_state::account_display_name(
                        account_name_map,
                        &event.account_id,
                    ))])
                    .into_node(),
                text(format!(
                    "{} {}",
                    context
                        .language
                        .label("Module created:", "モジュール作成:", "Modulo kreita:"),
                    module_definition_event.module_name
                )),
            ];
            if !module_definition_event.description.is_empty() {
                content_children.push(
                    Div::new()
                        .style(
                            Style::new()
                                .set("font-size", "0.78rem")
                                .set("color", "var(--text-secondary)")
                                .set("white-space", "pre-wrap"),
                        )
                        .children([text(module_definition_event.description.as_ref())])
                        .into_node(),
                );
            }
            Div::new()
                .style(
                    Style::new()
                        .set("display", "grid")
                        .set("gap", "0.25rem")
                        .set("font-size", "0.95rem"),
                )
                .children(content_children)
                .into_node()
        }
        EventContent::ModuleUpdate(module_update_event) => {
            let mut content_children = vec![
                A::<crate::Location>::new()
                    .href(
                        context.href_with_lang(crate::Location::Account(event.account_id.clone())),
                    )
                    .style(
                        Style::new()
                            .set("font-size", "0.82rem")
                            .set("color", "var(--primary)")
                            .set("font-weight", "600")
                            .set("text-decoration", "none"),
                    )
                    .children([text(crate::app_state::account_display_name(
                        account_name_map,
                        &event.account_id,
                    ))])
                    .into_node(),
                text(format!(
                    "{} {}",
                    context.language.label(
                        "Module updated:",
                        "モジュール更新:",
                        "Modulo ĝisdatigita:"
                    ),
                    module_update_event.module_name
                )),
            ];
            if !module_update_event.module_description.is_empty() {
                content_children.push(
                    Div::new()
                        .style(
                            Style::new()
                                .set("font-size", "0.78rem")
                                .set("color", "var(--text-secondary)")
                                .set("white-space", "pre-wrap"),
                        )
                        .children([text(module_update_event.module_description.as_ref())])
                        .into_node(),
                );
            }
            content_children.push(
                Div::new()
                    .style(
                        Style::new()
                            .set("font-size", "0.78rem")
                            .set("color", "var(--text-secondary)"),
                    )
                    .children([text(format!(
                        "base: {}",
                        module_update_event.module_definition_event_hash,
                    ))])
                    .into_node(),
            );
            content_children.push(
                A::<crate::Location>::new()
                    .href(context.href_with_lang(crate::Location::Event(
                        module_update_event.module_definition_event_hash.clone(),
                    )))
                    .style(
                        Style::new()
                            .set("font-size", "0.78rem")
                            .set("color", "var(--primary)")
                            .set("text-decoration", "none"),
                    )
                    .children([text(context.language.label(
                        "Open module detail",
                        "モジュール詳細を開く",
                        "Malfermi modulajn detalojn",
                    ))])
                    .into_node(),
            );
            Div::new()
                .style(
                    Style::new()
                        .set("display", "grid")
                        .set("gap", "0.25rem")
                        .set("font-size", "0.95rem"),
                )
                .children(content_children)
                .into_node()
        }
    }
}

fn event_type_label(content: &EventContent, context: &PageContext) -> String {
    match content {
        EventContent::CreateAccount(_) => context
            .language
            .label("Create Account", "アカウント作成", "Krei konton")
            .to_string(),
        EventContent::ChangeProfile(_) => context
            .language
            .label("Change Profile", "プロフィール変更", "Ŝanĝi profilon")
            .to_string(),
        EventContent::PartDefinition(_) => context
            .language
            .label("Part Definition", "パーツ定義", "Parto-difino")
            .to_string(),
        EventContent::PartUpdate(_) => context
            .language
            .label("Part Update", "パーツ更新", "Parto-ĝisdatigo")
            .to_string(),
        EventContent::ModuleDefinition(_) => context
            .language
            .label("Module Definition", "モジュール定義", "Modulo-difino")
            .to_string(),
        EventContent::ModuleUpdate(_) => context
            .language
            .label("Module Update", "モジュール更新", "Modulo-ĝisdatigo")
            .to_string(),
    }
}
