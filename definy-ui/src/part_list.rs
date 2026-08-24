use std::str::FromStr;

use definy_event::EventHashId;
use narumincho_vdom::*;

use crate::Location;
use crate::app_state::AppState;
use crate::expression_editor::{EditorTarget, render_root_expression_editor};
use crate::expression_eval::{evaluate_expression, expression_to_source};
use crate::module_projection::collect_module_snapshots;
use crate::page_context::PageContext;
use crate::part_projection::collect_part_snapshots;

fn part_type_text(part_type: &definy_event::event::PartType) -> String {
    match part_type {
        definy_event::event::PartType::Number => "Number".to_string(),
        definy_event::event::PartType::String => "String".to_string(),
        definy_event::event::PartType::Boolean => "Boolean".to_string(),
        definy_event::event::PartType::Type => "Type".to_string(),
        definy_event::event::PartType::TypePart(hash) => format!("TypePart({})", hash),
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

fn part_definition_form_view(state: &AppState, context: &PageContext) -> Node {
    let language = context.language;
    Div::new()
        .class("composer")
        .style(
            Style::new()
                .set("display", "grid")
                .set("gap", "0.5rem")
                .set("background", "var(--surface)")
                .set("backdrop-filter", "var(--glass-blur)")
                .set("padding", "0.8rem 1rem")
                .set("border-radius", "var(--radius-md)")
                .set("box-shadow", "var(--shadow-sm)")
                .set("border", "1px solid var(--border)"),
        )
        .children([
            Div::new()
                .style(
                    Style::new()
                        .set("display", "flex")
                        .set("justify-content", "space-between")
                        .set("align-items", "center"),
                )
                .children([
                    Div::new()
                        .style(
                            Style::new()
                                .set("font-size", "0.95rem")
                                .set("font-weight", "600"),
                        )
                        .children([text(context.language.label(
                            "New Part",
                            "新規パーツ作成",
                            "Nova Parto",
                        ))])
                        .into_node(),
                    Button::new()
                        .type_("button")
                        .style(
                            Style::new()
                                .set("padding", "0.2rem 0.5rem")
                                .set("font-size", "0.75rem"),
                        )
                        .on_click(EventHandler::new(move |set_state| async move {
                            set_state(Box::new(move |state: AppState| {
                                let mut next = state.clone();
                                next.part_definition_form.is_form_open = false;
                                next
                            }));
                        }))
                        .children([text(context.language.label("Cancel", "閉じる", "Fermi"))])
                        .into_node(),
                ])
                .into_node(),
            part_name_input(state),
            module_selection_input(state, context),
            part_type_input(state, context),
            part_description_input(state),
            Div::new()
                .style(
                    Style::new()
                        .set("color", "var(--text-secondary)")
                        .set("font-size", "0.82rem"),
                )
                .children([text(context.language.label("Expression", "式", "Esprimo"))])
                .into_node(),
            render_root_expression_editor(
                state,
                context,
                &state.part_definition_form.composing_expression,
                EditorTarget::PartDefinition,
            ),
            Div::new()
                .class("mono")
                .style(
                    Style::new()
                        .set("font-size", "0.76rem")
                        .set("padding", "0.3rem 0.5rem")
                        .set("opacity", "0.85"),
                )
                .children([text(format!(
                    "{} {}",
                    context.language.label("Current:", "現在:", "Nuna:"),
                    state
                        .part_definition_form
                        .composing_expression
                        .as_ref()
                        .map(expression_to_source)
                        .unwrap_or_else(|| context
                            .language
                            .label("(none)", "(なし)", "(neniu)")
                            .to_string())
                ))])
                .into_node(),
            Div::new()
                .style(Style::new().set("display", "flex").set("gap", "0.45rem"))
                .children({
                    let mut buttons = Vec::new();
                    if state.part_definition_form.composing_expression.is_some() {
                        buttons.push(
                            Button::new()
                                .type_("button")
                                .on_click(EventHandler::new(move |set_state| async move {
                                    set_state(Box::new(move |state: AppState| {
                                        let events_vec: Vec<_> = state
                                            .event_list_state
                                            .event_hashes
                                            .iter()
                                            .filter_map(|hash| {
                                                state
                                                    .event_cache
                                                    .get(hash)
                                                    .map(|event| (hash.clone(), event.clone()))
                                            })
                                            .collect();
                                        let result = if let Some(expr) =
                                            &state.part_definition_form.composing_expression
                                        {
                                            match evaluate_expression(expr, &events_vec) {
                                                Ok(value) => format!(
                                                    "{} {}",
                                                    language.label("Result:", "結果:", "Rezulto:"),
                                                    value
                                                ),
                                                Err(error) => format!(
                                                    "{} {}",
                                                    language.label("Error:", "エラー:", "Eraro:"),
                                                    error
                                                ),
                                            }
                                        } else {
                                            language
                                                .label(
                                                    "No expression to evaluate",
                                                    "評価する式がありません",
                                                    "Neniu esprimo por taksi",
                                                )
                                                .to_string()
                                        };
                                        let mut next = state.clone();
                                        next.part_definition_form.eval_result = Some(result);
                                        next
                                    }));
                                }))
                                .children([text(context.language.label("Evaluate", "評価", "Taksi"))])
                                .into_node(),
                        );
                    }
                    buttons.push(
                        Button::new()
                            .on_click(EventHandler::new(move |set_state| async move {
                                let set_state = std::rc::Rc::new(set_state);
                                let set_state_for_async = set_state.clone();
                                set_state(Box::new(move |state: AppState| {
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
                                    let part_type = state.part_definition_form.part_type_input.clone();
                                    let module_definition_event_hash = state
                                        .part_definition_form
                                        .module_definition_event_hash
                                        .clone();
                                    if part_name.is_empty() {
                                        let mut next = state.clone();
                                        next.part_definition_form.eval_result = Some(
                                            language
                                                .label(
                                                    "Error: part name is required",
                                                    "エラー: パーツ名は必須です",
                                                    "Eraro: parto-nomo estas bezonata",
                                                )
                                                .to_string(),
                                        );
                                        return next;
                                    }
                                    let expression =
                                        state.part_definition_form.composing_expression.clone();
                                    let key_for_async = key.clone();
                                    let force_offline = state.force_offline;
                                    wasm_bindgen_futures::spawn_local(
                                        crate::event_submit::submit_event(
                                            definy_event::event::EventContent::PartDefinition(
                                                definy_event::event::PartDefinitionEvent {
                                                    part_name: part_name.into(),
                                                    description: description.into(),
                                                    part_type,
                                                    expression,
                                                    module_definition_event_hash,
                                                },
                                            ),
                                            key_for_async,
                                            force_offline,
                                            None,
                                            set_state_for_async,
                                            move |next, record| {
                                                if record.status
                                                    == crate::local_event::LocalEventStatus::Sent
                                                {
                                                    next.part_definition_form.eval_result = None;
                                                } else {
                                                    next.part_definition_form.eval_result = Some(
                                                        match record.status {
                                                            crate::local_event::LocalEventStatus::Queued => {
                                                                language.label(
                                                                    "PartDefinition queued (offline)",
                                                                    "PartDefinition をキューに追加しました (オフライン)",
                                                                    "PartDefinition envicigita (senkonekte)",
                                                                )
                                                                .to_string()
                                                            }
                                                            crate::local_event::LocalEventStatus::Failed => {
                                                                language.label(
                                                                    "PartDefinition failed to send",
                                                                    "PartDefinition の送信に失敗しました",
                                                                    "PartDefinition sendado malsukcesis",
                                                                )
                                                                .to_string()
                                                            }
                                                            crate::local_event::LocalEventStatus::Sent => unreachable!(),
                                                        },
                                                    );
                                                }
                                            },
                                        ),
                                    );
                                    let mut next = state.clone();
                                    next.part_definition_form.is_form_open = false;
                                    next.part_definition_form.part_name_input = String::new();
                                    next.part_definition_form.part_description_input = String::new();
                                    next.part_definition_form.composing_expression = None;
                                    next.part_definition_form.eval_result = None;
                                    next
                                }));
                            }))
                            .children([text(context.language.label("Create", "作成", "Krei"))])
                            .into_node(),
                    );
                    buttons
                })
                .into_node(),
        ])
        .into_node()
}

pub fn part_list_view(state: &AppState, context: &PageContext) -> Node {
    let snapshots = collect_part_snapshots(state);
    let account_name_map = state.account_name_map();

    let mut action_children = vec![
        H2::new()
            .style(
                Style::new()
                    .set("font-size", "1.25rem")
                    .set("font-weight", "600")
                    .set("margin", "0"),
            )
            .children([text(context.language.label("Parts", "パーツ", "Partoj"))])
            .into_node(),
    ];
    if state.current_key.is_some() && !state.part_definition_form.is_form_open {
        action_children.push(
            Button::new()
                .type_("button")
                .style(
                    Style::new()
                        .set("padding", "0.35rem 0.75rem")
                        .set("font-size", "0.85rem"),
                )
                .on_click(EventHandler::new(move |set_state| async move {
                    set_state(Box::new(move |state: AppState| {
                        let mut next = state.clone();
                        next.part_definition_form.is_form_open = true;
                        next
                    }));
                }))
                .children([text(context.language.label(
                    "+ Create Part",
                    "+ パーツを作成",
                    "+ Krei parton",
                ))])
                .into_node(),
        );
    }

    let mut children = Vec::new();
    children.push(
        Div::new()
            .style(
                Style::new()
                    .set("display", "flex")
                    .set("justify-content", "space-between")
                    .set("align-items", "center"),
            )
            .children(action_children)
            .into_node(),
    );
    if state.current_key.is_some() && state.part_definition_form.is_form_open {
        children.push(part_definition_form_view(state, context));
    }
    if let Some(result) = &state.part_definition_form.eval_result {
        children.push(
            Div::new()
                .class("event-detail-card")
                .style(
                    Style::new()
                        .set("padding", "0.75rem 1rem")
                        .set("font-family", "'JetBrains Mono', monospace")
                        .set("font-size", "0.85rem")
                        .set("background", "rgb(124 192 216 / 0.1)")
                        .set("border-color", "var(--primary)")
                        .set("word-break", "break-word"),
                )
                .children([text(result)])
                .into_node(),
        );
    }
    if snapshots.is_empty() {
        children.push(
            Div::new()
                .class("event-detail-card")
                .style(
                    Style::new()
                        .set("padding", "3rem 1.5rem")
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
                        .children([text("🧩")])
                        .into_node(),
                    Div::new()
                        .style(
                            Style::new()
                                .set("font-size", "0.95rem")
                                .set("color", "var(--text)"),
                        )
                        .children([text(context.language.label(
                            "No parts yet",
                            "まだパーツがありません",
                            "Ankoraŭ neniuj partoj",
                        ))])
                        .into_node(),
                ])
                .into_node(),
        );
    } else {
        children.push(
            Div::new()
                .class("event-list")
                .style(Style::new().set("display", "grid").set("gap", "0.45rem"))
                .children(
                    snapshots
                        .into_iter()
                        .map(|part| {
                            let account_name = crate::app_state::account_display_name(
                                &account_name_map,
                                &part.account_id,
                            );
                            let mut card_children = Vec::new();
                            card_children.push(
                                Div::new()
                                    .style(
                                        Style::new()
                                            .set("display", "flex")
                                            .set("justify-content", "space-between")
                                            .set("align-items", "center"),
                                    )
                                    .children([
                                        A::<Location>::new()
                                            .href(context.href_with_lang(Location::Part(
                                                part.definition_event_hash.clone(),
                                            )))
                                            .style(
                                                Style::new()
                                                    .set("font-size", "1rem")
                                                    .set("font-weight", "600")
                                                    .set("color", "var(--text)")
                                                    .set("text-decoration", "none"),
                                            )
                                            .children([text(part.part_name)])
                                            .into_node(),
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.75rem")
                                                    .set("font-weight", "500")
                                                    .set("color", "var(--primary)")
                                                    .set("background", "rgb(124 192 216 / 0.12)")
                                                    .set("padding", "0.15rem 0.45rem")
                                                    .set("border-radius", "var(--radius-full)"),
                                            )
                                            .children([text(format!(
                                                "{}",
                                                optional_part_type_text(&part.part_type)
                                            ))])
                                            .into_node(),
                                    ])
                                    .into_node(),
                            );
                            card_children.push(
                                Div::new()
                                    .style(
                                        Style::new()
                                            .set("font-size", "0.76rem")
                                            .set("color", "var(--text-secondary)"),
                                    )
                                    .children([text(
                                        part.updated_at.format("%Y-%m-%d %H:%M:%S").to_string(),
                                    )])
                                    .into_node(),
                            );
                            if !part.has_definition {
                                card_children.push(
                                    Div::new()
                                        .style(
                                            Style::new()
                                                .set("font-size", "0.78rem")
                                                .set("color", "var(--error)"),
                                        )
                                        .children([text(context.language.label(
                                            "definition event missing",
                                            "定義イベントが見つかりません",
                                            "difina evento mankas",
                                        ))])
                                        .into_node(),
                                );
                            }
                            if !part.part_description.is_empty() {
                                card_children.push(
                                    Div::new()
                                        .style(
                                            Style::new()
                                                .set("white-space", "pre-wrap")
                                                .set("font-size", "0.84rem")
                                                .set("color", "var(--text-secondary)"),
                                        )
                                        .children([text(part.part_description)])
                                        .into_node(),
                                );
                            }
                            card_children.push(
                                Div::new()
                                    .style(
                                        Style::new()
                                            .set("display", "flex")
                                            .set("gap", "0.5rem")
                                            .set("align-items", "center")
                                            .set("margin-top", "0.1rem"),
                                    )
                                    .children([A::<Location>::new()
                                        .href(context.href_with_lang(Location::Part(
                                            part.definition_event_hash.clone(),
                                        )))
                                        .style(
                                            Style::new()
                                                .set("font-size", "0.78rem")
                                                .set("font-weight", "500")
                                                .set("color", "var(--primary)")
                                                .set("background", "rgb(124 192 216 / 0.1)")
                                                .set("padding", "0.2rem 0.5rem")
                                                .set("border-radius", "var(--radius-sm)")
                                                .set("text-decoration", "none"),
                                        )
                                        .children([text(context.language.label(
                                            "Open part detail",
                                            "パーツ詳細を開く",
                                            "Malfermi partajn detalojn",
                                        ))])
                                        .into_node()])
                                    .into_node(),
                            );
                            card_children.push(
                                Div::new()
                                    .class("mono")
                                    .style(
                                        Style::new()
                                            .set("font-size", "0.78rem")
                                            .set("opacity", "0.8"),
                                    )
                                    .children([text(
                                        part.expression
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
                            );
                            card_children.push(
                                Div::new()
                                    .style(
                                        Style::new()
                                            .set("font-size", "0.8rem")
                                            .set("color", "var(--primary)"),
                                    )
                                    .children([text(account_name)])
                                    .into_node(),
                            );
                            card_children.push(
                                Div::new()
                                    .style(
                                        Style::new().set("display", "flex").set("gap", "0.45rem"),
                                    )
                                    .children([
                                        A::<Location>::new()
                                            .href(context.href_with_lang(Location::Event(
                                                part.latest_event_hash,
                                            )))
                                            .children([text(context.language.label(
                                                "Latest event",
                                                "最新イベント",
                                                "Lasta evento",
                                            ))])
                                            .into_node(),
                                        A::<Location>::new()
                                            .href(context.href_with_lang(Location::Event(
                                                part.definition_event_hash,
                                            )))
                                            .children([text(context.language.label(
                                                "Definition event",
                                                "定義イベント",
                                                "Difina evento",
                                            ))])
                                            .into_node(),
                                    ])
                                    .into_node(),
                            );

                            Div::new()
                                .class("event-card")
                                .style(
                                    Style::new()
                                        .set("display", "grid")
                                        .set("gap", "0.35rem")
                                        .set("padding", "0.65rem 0.85rem"),
                                )
                                .children(card_children)
                                .into_node()
                        })
                        .collect::<Vec<Node>>(),
                )
                .into_node(),
        );
    }

    Div::new()
        .class("page-shell")
        .style(crate::layout::page_shell_style("0.8rem"))
        .children(children)
        .into_node()
}

fn part_name_input(state: &AppState) -> Node {
    Input::new()
        .name("part-name")
        .type_("text")
        .value(&state.part_definition_form.part_name_input)
        .placeholder("part name (e.g. a)")
        .on_input(EventHandler::new(move |set_state| async move {
            let value = crate::dom::get_input_value("input[name='part-name']");
            set_state(Box::new(move |state: AppState| {
                let mut next = state.clone();
                next.part_definition_form.part_name_input = value;
                next
            }));
        }))
        .into_node()
}

fn part_description_input(state: &AppState) -> Node {
    Textarea::new()
        .name("part-description")
        .value(&state.part_definition_form.part_description_input)
        .placeholder("description (supports multiple lines)")
        .style(Style::new().set("min-height", "6rem"))
        .on_input(EventHandler::new(move |set_state| async move {
            let value = crate::dom::get_textarea_value("textarea[name='part-description']");
            set_state(Box::new(move |state: AppState| {
                let mut next = state.clone();
                next.part_definition_form.part_description_input = value;
                next
            }));
        }))
        .into_node()
}

fn part_type_input(state: &AppState, context: &PageContext) -> Node {
    Div::new()
        .style(Style::new().set("display", "grid").set("gap", "0.35rem"))
        .children([
            Div::new()
                .style(
                    Style::new()
                        .set("font-size", "0.85rem")
                        .set("color", "var(--text-secondary)"),
                )
                .children([text(context.language.label(
                    "Part Type",
                    "パーツ型",
                    "Parto-tipo",
                ))])
                .into_node(),
            render_part_type_editor(
                state,
                context,
                &state.part_definition_form.part_type_input,
                0,
            ),
        ])
        .into_node()
}

fn module_selection_input(state: &AppState, context: &PageContext) -> Node {
    let mut options = vec![(
        "".to_string(),
        context
            .language
            .label("No module", "モジュールなし", "Neniu modulo")
            .to_string(),
    )];
    options.extend(
        collect_module_snapshots(state)
            .into_iter()
            .map(|module| (module.definition_event_hash.to_string(), module.module_name)),
    );

    let current_value: String = state
        .part_definition_form
        .module_definition_event_hash
        .clone()
        .map(|hash| hash.to_string())
        .unwrap_or_default();

    let dropdown = crate::dropdown::searchable_dropdown(
        state,
        "part-definition-module",
        &current_value,
        &options,
        crate::dropdown::button_option_renderer(
            "part-definition-module",
            std::rc::Rc::new(|value| {
                Box::new(move |state: AppState| {
                    let mut next = state.clone();
                    next.part_definition_form.module_definition_event_hash =
                        EventHashId::from_str(&value).ok();
                    next
                })
            }),
        ),
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
                .children([text(context.language.label(
                    "Module",
                    "モジュール",
                    "Modulo",
                ))])
                .into_node(),
            dropdown,
        ])
        .into_node()
}

fn render_part_type_editor(
    state: &AppState,
    context: &PageContext,
    part_type: &Option<definy_event::event::PartType>,
    depth: usize,
) -> Node {
    let name = format!("part-definition-type-{}", depth);
    let selected = current_part_type_selection(part_type);

    let mut options = Vec::new();
    if depth == 0 {
        options.push((
            "none".to_string(),
            context.language.label("None", "なし", "Neniu").to_string(),
        ));
    }

    options.extend([
        (
            "number".to_string(),
            context
                .language
                .label("Number", "数値", "Nombro")
                .to_string(),
        ),
        (
            "string".to_string(),
            context
                .language
                .label("String", "文字列", "Teksto")
                .to_string(),
        ),
        (
            "boolean".to_string(),
            context
                .language
                .label("Boolean", "真偽値", "Bulea")
                .to_string(),
        ),
        (
            "type".to_string(),
            context.language.label("Type", "型", "Tipo").to_string(),
        ),
        (
            "list".to_string(),
            context
                .language
                .label("List<...>", "リスト<...>", "Listo<...>")
                .to_string(),
        ),
    ]);

    options.extend(
        collect_part_snapshots(state)
            .into_iter()
            .filter(|snapshot| snapshot.part_type == Some(definy_event::event::PartType::Type))
            .map(|snapshot| {
                let value = format!("type_part:{}", snapshot.definition_event_hash);
                (
                    value,
                    format!(
                        "{} {}",
                        context
                            .language
                            .label("Type Part:", "型パーツ:", "Tipo-parto:"),
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
        crate::dropdown::button_option_renderer(name.clone(), on_change),
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
                        .children([text(context.language.label(
                            "Item Type",
                            "要素型",
                            "Ero-tipo",
                        ))])
                        .into_node(),
                    render_part_type_editor(
                        state,
                        context,
                        &Some(item_type.as_ref().clone()),
                        depth + 1,
                    ),
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
    if let Some(encoded) = selected.strip_prefix("type_part:")
        && let Ok(hash) = EventHashId::from_str(encoded)
    {
        return Some(definy_event::event::PartType::TypePart(hash));
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
    if let Some(encoded) = selected.strip_prefix("type_part:")
        && let Ok(hash) = EventHashId::from_str(encoded)
    {
        return definy_event::event::PartType::TypePart(hash);
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
            format!("type_part:{}", hash)
        }
        Some(definy_event::event::PartType::List(_)) => "list".to_string(),
    }
}
