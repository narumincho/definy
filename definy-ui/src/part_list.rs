use std::str::FromStr;

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::Location;
use crate::app_state::AppState;
use crate::expression_editor::{EditorTarget, render_root_expression_editor};
use crate::expression_eval::{evaluate_expression, expression_to_source};
use crate::module_projection::collect_module_snapshots;
use crate::page_context::PageContext;
use crate::part_projection::collect_part_snapshots;

pub(crate) fn part_type_text(part_type: &definy_event::event::PartType) -> String {
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

#[component]
pub fn PartListView(state: AppState, context: PageContext) -> Element {
    let snapshots = collect_part_snapshots(&state);
    let account_name_map = state.account_name_map();
    let page_shell_style = crate::layout::page_shell_style("0.8rem");

    rsx! {
        div {
            class: "page-shell",
            style: "{page_shell_style}",
            div {
                style: "display: flex; justify-content: space-between; align-items: center;",
                h2 {
                    style: "font-size: 1.25rem; font-weight: 600; margin: 0;",
                    "{context.language.label(\"Parts\", \"パーツ\", \"Partoj\")}"
                }
                if state.current_key.is_some() && !state.part_definition_form.is_form_open {
                    button {
                        r#type: "button",
                        style: "padding: 0.35rem 0.75rem; font-size: 0.85rem; background: var(--primary); color: #0e1720; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;",
                        onclick: move |_| {
                            let mut state_sig = use_context::<Signal<AppState>>();
                            state_sig.write().part_definition_form.is_form_open = true;
                        },
                        "{context.language.label(\"+ Create Part\", \"+ パーツを作成\", \"+ Krei parton\")}"
                    }
                }
            }
            if state.current_key.is_some() && state.part_definition_form.is_form_open {
                PartDefinitionFormView { state: state.clone(), context: context.clone() }
            }
            if let Some(result) = &state.part_definition_form.eval_result {
                div {
                    class: "event-detail-card",
                    style: "padding: 0.75rem 1rem; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; background: rgb(124 192 216 / 0.1); border-color: var(--primary); word-break: break-word;",
                    "{result}"
                }
            }
            if snapshots.is_empty() {
                div {
                    class: "event-detail-card",
                    style: "padding: 3rem 1.5rem; text-align: center; display: grid; gap: 0.5rem; justify-items: center; color: var(--text-secondary);",
                    div {
                        style: "font-size: 1.5rem; opacity: 0.5;",
                        "🧩"
                    }
                    div {
                        style: "font-size: 0.95rem; color: var(--text);",
                        "{context.language.label(\"No parts yet\", \"まだパーツがありません\", \"Ankoraŭ neniuj partoj\")}"
                    }
                }
            } else {
                div {
                    class: "event-list",
                    style: "display: grid; gap: 0.45rem;",
                    for part in snapshots {
                        {
                            let account_name = crate::app_state::account_display_name(&account_name_map, &part.account_id);
                            let def_hash = part.definition_event_hash.clone();
                            let latest_hash = part.latest_event_hash.clone();
                            let time_str = part.updated_at.format("%Y-%m-%d %H:%M:%S").to_string();
                            let expr_str = part.expression.as_ref().map(expression_to_source).unwrap_or_else(|| context.language.label("(none)", "(なし)", "(neniu)").to_string());

                            rsx! {
                                div {
                                    key: "{def_hash}",
                                    class: "event-card",
                                    style: "display: grid; gap: 0.35rem; padding: 0.65rem 0.85rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
                                    div {
                                        style: "display: flex; justify-content: space-between; align-items: center;",
                                        a {
                                            href: context.href_with_lang(Location::Part(def_hash.clone())),
                                            style: "font-size: 1rem; font-weight: 600; color: var(--text); text-decoration: none;",
                                            "{part.part_name}"
                                        }
                                        div {
                                            style: "font-size: 0.75rem; font-weight: 500; color: var(--primary); background: rgb(124 192 216 / 0.12); padding: 0.15rem 0.45rem; border-radius: var(--radius-full);",
                                            "{optional_part_type_text(&part.part_type)}"
                                        }
                                    }
                                    div {
                                        style: "font-size: 0.76rem; color: var(--text-secondary);",
                                        "{time_str}"
                                    }
                                    if !part.has_definition {
                                        div {
                                            style: "font-size: 0.78rem; color: var(--error);",
                                            "{context.language.label(\"definition event missing\", \"定義イベントが見つかりません\", \"difina evento mankas\")}"
                                        }
                                    }
                                    if !part.part_description.is_empty() {
                                        div {
                                            style: "white-space: pre-wrap; font-size: 0.84rem; color: var(--text-secondary);",
                                            "{part.part_description}"
                                        }
                                    }
                                    div {
                                        style: "display: flex; gap: 0.5rem; align-items: center; margin-top: 0.1rem;",
                                        a {
                                            href: context.href_with_lang(Location::Part(def_hash.clone())),
                                            style: "font-size: 0.78rem; font-weight: 500; color: var(--primary); background: rgb(124 192 216 / 0.1); padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); text-decoration: none;",
                                            "{context.language.label(\"Open part detail\", \"パーツ詳細を開く\", \"Malfermi partajn detalojn\")}"
                                        }
                                    }
                                    div {
                                        class: "mono",
                                        style: "font-size: 0.78rem; opacity: 0.8;",
                                        "{expr_str}"
                                    }
                                    div {
                                        style: "font-size: 0.8rem; color: var(--primary);",
                                        "{account_name}"
                                    }
                                    div {
                                        style: "display: flex; gap: 0.45rem; font-size: 0.78rem;",
                                        a {
                                            href: context.href_with_lang(Location::Event(latest_hash)),
                                            style: "color: var(--text-secondary); text-decoration: none;",
                                            "{context.language.label(\"Latest event\", \"最新イベント\", \"Lasta evento\")}"
                                        }
                                        a {
                                            href: context.href_with_lang(Location::Event(def_hash)),
                                            style: "color: var(--text-secondary); text-decoration: none;",
                                            "{context.language.label(\"Definition event\", \"定義イベント\", \"Difina evento\")}"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn PartDefinitionFormView(state: AppState, context: PageContext) -> Element {
    let language = context.language;

    rsx! {
        div {
            class: "composer",
            style: "display: grid; gap: 0.5rem; background: var(--surface); backdrop-filter: var(--glass-blur); padding: 0.8rem 1rem; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); border: 1px solid var(--border);",
            div {
                style: "display: flex; justify-content: space-between; align-items: center;",
                div {
                    style: "font-size: 0.95rem; font-weight: 600;",
                    "{context.language.label(\"New Part\", \"新規パーツ作成\", \"Nova Parto\")}"
                }
                button {
                    r#type: "button",
                    style: "padding: 0.2rem 0.5rem; font-size: 0.75rem; background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer;",
                    onclick: move |_| {
                        let mut state_sig = use_context::<Signal<AppState>>();
                        state_sig.write().part_definition_form.is_form_open = false;
                    },
                    "{context.language.label(\"Cancel\", \"閉じる\", \"Fermi\")}"
                }
            }
            PartNameInput { state: state.clone() }
            ModuleSelectionInput { state: state.clone(), context: context.clone() }
            PartTypeInput { state: state.clone(), context: context.clone() }
            PartDescriptionInput { state: state.clone() }
            div {
                style: "color: var(--text-secondary); font-size: 0.82rem;",
                {context.language.label("Expression", "式", "Esprimo")}
            }
            {render_root_expression_editor(
                &state,
                &context,
                &state.part_definition_form.composing_expression,
                EditorTarget::PartDefinition,
            )}
            {
                let expr_str = state.part_definition_form.composing_expression.as_ref().map(expression_to_source).unwrap_or_else(|| context.language.label("(none)", "(なし)", "(neniu)").to_string());
                let current_label = format!("{} {expr_str}", context.language.label("Current:", "現在:", "Nuna:"));
                rsx! {
                    div {
                        class: "mono",
                        style: "font-size: 0.76rem; padding: 0.3rem 0.5rem; opacity: 0.85;",
                        "{current_label}"
                    }
                }
            }
            div {
                style: "display: flex; gap: 0.45rem;",
                if state.part_definition_form.composing_expression.is_some() {
                    button {
                        r#type: "button",
                        style: "padding: 0.35rem 0.75rem; background: rgb(255 255 255 / 0.06); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer;",
                        onclick: move |_| {
                            let mut state_sig = use_context::<Signal<AppState>>();
                            let events_vec: Vec<_> = state_sig.read().events_with_hash();
                            let result = if let Some(expr) = &state_sig.read().part_definition_form.composing_expression {
                                match evaluate_expression(expr, &events_vec) {
                                    Ok(value) => format!("{} {}", language.label("Result:", "結果:", "Rezulto:"), value),
                                    Err(error) => format!("{} {}", language.label("Error:", "エラー:", "Eraro:"), error),
                                }
                            } else {
                                language.label("No expression to evaluate", "評価する式がありません", "Neniu esprimo por taksi").to_string()
                            };
                            state_sig.write().part_definition_form.eval_result = Some(result);
                        },
                        "{context.language.label(\"Evaluate\", \"評価\", \"Taksi\")}"
                    }
                }
                button {
                    r#type: "button",
                    style: "padding: 0.35rem 0.85rem; background: var(--primary); color: #0e1720; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;",
                    onclick: move |_| {
                        let mut state_sig = use_context::<Signal<AppState>>();
                        let state_val = state_sig.read().clone();
                        let key = if let Some(key) = &state_val.current_key {
                            key.clone()
                        } else {
                            return;
                        };
                        let part_name = state_val.part_definition_form.part_name_input.trim().to_string();
                        let description = state_val.part_definition_form.part_description_input.clone();
                        let part_type = state_val.part_definition_form.part_type_input.clone();
                        let module_definition_event_hash = state_val.part_definition_form.module_definition_event_hash.clone();
                        if part_name.is_empty() {
                            state_sig.write().part_definition_form.eval_result = Some(
                                language.label("Error: part name is required", "エラー: パーツ名は必須です", "Eraro: parto-nomo estas bezonata").to_string(),
                            );
                            return;
                        }
                        let expression = state_val.part_definition_form.composing_expression.clone();
                        let force_offline = state_val.force_offline;

                        spawn(async move {
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
                                key,
                                force_offline,
                                None,
                                state_sig,
                                move |next, record| {
                                    if record.status == crate::local_event::LocalEventStatus::Sent {
                                        next.part_definition_form.eval_result = None;
                                    } else {
                                        next.part_definition_form.eval_result = Some(
                                            match record.status {
                                                crate::local_event::LocalEventStatus::Queued => language.label("PartDefinition queued (offline)", "PartDefinition をキューに追加しました (オフライン)", "PartDefinition envicigita (senkonekte)").to_string(),
                                                crate::local_event::LocalEventStatus::Failed => language.label("PartDefinition failed to send", "PartDefinition の送信に失敗しました", "PartDefinition sendado malsukcesis").to_string(),
                                                crate::local_event::LocalEventStatus::Sent => unreachable!(),
                                            }
                                        );
                                    }
                                },
                            ).await;
                        });

                        let mut write_state = state_sig.write();
                        write_state.part_definition_form.is_form_open = false;
                        write_state.part_definition_form.part_name_input = String::new();
                        write_state.part_definition_form.part_description_input = String::new();
                        write_state.part_definition_form.composing_expression = None;
                        write_state.part_definition_form.eval_result = None;
                    },
                    "{context.language.label(\"Create\", \"作成\", \"Krei\")}"
                }
            }
        }
    }
}

#[component]
fn PartNameInput(state: AppState) -> Element {
    rsx! {
        input {
            name: "part-name",
            r#type: "text",
            value: "{state.part_definition_form.part_name_input}",
            placeholder: "part name (e.g. a)",
            style: "padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
            oninput: move |evt: FormEvent| {
                let mut state_sig = use_context::<Signal<AppState>>();
                state_sig.write().part_definition_form.part_name_input = evt.value();
            }
        }
    }
}

#[component]
fn PartDescriptionInput(state: AppState) -> Element {
    rsx! {
        textarea {
            name: "part-description",
            value: "{state.part_definition_form.part_description_input}",
            placeholder: "description (supports multiple lines)",
            style: "min-height: 6rem; padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
            oninput: move |evt: FormEvent| {
                let mut state_sig = use_context::<Signal<AppState>>();
                state_sig.write().part_definition_form.part_description_input = evt.value();
            }
        }
    }
}

#[component]
fn PartTypeInput(state: AppState, context: PageContext) -> Element {
    rsx! {
        div {
            style: "display: grid; gap: 0.35rem;",
            div {
                style: "font-size: 0.85rem; color: var(--text-secondary);",
                "{context.language.label(\"Part Type\", \"パーツ型\", \"Parto-tipo\")}"
            }
            RenderPartTypeEditor {
                state: state.clone(),
                context: context.clone(),
                part_type: state.part_definition_form.part_type_input.clone(),
                depth: 0,
            }
        }
    }
}

#[component]
fn ModuleSelectionInput(state: AppState, context: PageContext) -> Element {
    let mut options = vec![(
        "".to_string(),
        context
            .language
            .label("No module", "モジュールなし", "Neniu modulo")
            .to_string(),
    )];
    options.extend(
        collect_module_snapshots(&state)
            .into_iter()
            .map(|module| (module.definition_event_hash.to_string(), module.module_name)),
    );

    let current_value: String = state
        .part_definition_form
        .module_definition_event_hash
        .clone()
        .map(|hash| hash.to_string())
        .unwrap_or_default();

    rsx! {
        div {
            style: "display: grid; gap: 0.35rem;",
            div {
                style: "font-size: 0.85rem; color: var(--text-secondary);",
                "{context.language.label(\"Module\", \"モジュール\", \"Modulo\")}"
            }
            crate::dropdown::SearchableDropdown {
                name: "part-definition-module".to_string(),
                current_value: current_value,
                options: options,
                on_change: move |val: String| {
                    let mut state_sig = use_context::<Signal<AppState>>();
                    state_sig.write().part_definition_form.module_definition_event_hash = EventHashId::from_str(&val).ok();
                }
            }
        }
    }
}

#[component]
fn RenderPartTypeEditor(
    state: AppState,
    context: PageContext,
    part_type: Option<definy_event::event::PartType>,
    depth: usize,
) -> Element {
    let name = format!("part-definition-type-{}", depth);
    let selected = current_part_type_selection(&state, &part_type);

    let mut options = Vec::new();
    if depth == 0 {
        options.push((
            "none".to_string(),
            format!("{}\t\t", context.language.label("None", "なし", "Neniu")),
        ));
    }

    options.extend(
        collect_part_snapshots(&state)
            .into_iter()
            .filter(|snapshot| snapshot.part_type == Some(definy_event::event::PartType::Type))
            .map(|snapshot| {
                let value = format!("type_part:{}", snapshot.definition_event_hash);
                (
                    value,
                    format!(
                        "{}\tType\t{}",
                        snapshot.part_name, snapshot.definition_event_hash
                    ),
                )
            }),
    );

    let item_type_opt = if let Some(definy_event::event::PartType::List(item_type)) = &part_type {
        Some(item_type.as_ref().clone())
    } else {
        None
    };

    rsx! {
        div {
            style: "display: grid; gap: 0.45rem;",
            crate::dropdown::SearchableDropdown {
                name: name,
                current_value: selected,
                options: options,
                on_change: move |val: String| {
                    let mut state_sig = use_context::<Signal<AppState>>();
                    let state_val = state_sig.read().clone();
                    let mut new_part_type = state_val.part_definition_form.part_type_input.clone();
                    update_part_type_at_depth(
                        &state_val,
                        &mut new_part_type,
                        depth,
                        val.as_str(),
                    );
                    state_sig.write().part_definition_form.part_type_input = new_part_type;
                }
            }
            if let Some(item_type) = item_type_opt {
                div {
                    style: "padding-left: 1rem; border-left: 2px solid var(--border);",
                    div {
                        style: "font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.25rem;",
                        "{context.language.label(\"Item Type\", \"要素型\", \"Ero-tipo\")}"
                    }
                    RenderPartTypeEditor {
                        state: state.clone(),
                        context: context.clone(),
                        part_type: Some(item_type),
                        depth: depth + 1,
                    }
                }
            }
        }
    }
}

fn update_part_type_at_depth(
    state: &AppState,
    part_type: &mut Option<definy_event::event::PartType>,
    depth: usize,
    selected: &str,
) {
    if depth == 0 {
        *part_type = next_part_type_from_selected(state, selected, part_type);
        return;
    }

    match part_type {
        Some(definy_event::event::PartType::List(item_type)) => {
            update_part_type_nested(state, item_type.as_mut(), depth - 1, selected);
        }
        _ => {
            *part_type = Some(definy_event::event::PartType::List(Box::new(
                definy_event::event::PartType::Number,
            )));
            if let Some(definy_event::event::PartType::List(item_type)) = part_type {
                update_part_type_nested(state, item_type.as_mut(), depth - 1, selected);
            }
        }
    }
}

fn update_part_type_nested(
    state: &AppState,
    part_type: &mut definy_event::event::PartType,
    depth: usize,
    selected: &str,
) {
    if depth == 0 {
        *part_type = next_nested_part_type_from_selected(state, selected, part_type);
        return;
    }

    match part_type {
        definy_event::event::PartType::List(item_type) => {
            update_part_type_nested(state, item_type.as_mut(), depth - 1, selected);
        }
        _ => {
            *part_type = definy_event::event::PartType::List(Box::new(
                definy_event::event::PartType::Number,
            ));
            if let definy_event::event::PartType::List(item_type) = part_type {
                update_part_type_nested(state, item_type.as_mut(), depth - 1, selected);
            }
        }
    }
}

fn next_part_type_from_selected(
    state: &AppState,
    selected: &str,
    current: &Option<definy_event::event::PartType>,
) -> Option<definy_event::event::PartType> {
    if selected == "none" {
        return None;
    }
    if let Some(encoded) = selected.strip_prefix("type_part:")
        && let Ok(hash) = EventHashId::from_str(encoded)
    {
        if let Some(snapshot) = crate::part_projection::find_part_snapshot(state, &hash) {
            return match snapshot.part_name.as_str() {
                "Number" => Some(definy_event::event::PartType::Number),
                "String" => Some(definy_event::event::PartType::String),
                "Boolean" => Some(definy_event::event::PartType::Boolean),
                "Type" => Some(definy_event::event::PartType::Type),
                "List" => match current {
                    Some(definy_event::event::PartType::List(item_type)) => Some(
                        definy_event::event::PartType::List(Box::new(item_type.as_ref().clone())),
                    ),
                    _ => Some(definy_event::event::PartType::List(Box::new(
                        definy_event::event::PartType::Number,
                    ))),
                },
                _ => Some(definy_event::event::PartType::TypePart(hash)),
            };
        }
        return Some(definy_event::event::PartType::TypePart(hash));
    }
    match selected {
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
    state: &AppState,
    selected: &str,
    current: &definy_event::event::PartType,
) -> definy_event::event::PartType {
    if let Some(encoded) = selected.strip_prefix("type_part:")
        && let Ok(hash) = EventHashId::from_str(encoded)
    {
        if let Some(snapshot) = crate::part_projection::find_part_snapshot(state, &hash) {
            return match snapshot.part_name.as_str() {
                "Number" => definy_event::event::PartType::Number,
                "String" => definy_event::event::PartType::String,
                "Boolean" => definy_event::event::PartType::Boolean,
                "Type" => definy_event::event::PartType::Type,
                "List" => match current {
                    definy_event::event::PartType::List(item_type) => {
                        definy_event::event::PartType::List(Box::new(item_type.as_ref().clone()))
                    }
                    _ => definy_event::event::PartType::List(Box::new(
                        definy_event::event::PartType::Number,
                    )),
                },
                _ => definy_event::event::PartType::TypePart(hash),
            };
        }
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

fn current_part_type_selection(
    state: &AppState,
    part_type: &Option<definy_event::event::PartType>,
) -> String {
    let find_type_part = |name: &str| {
        collect_part_snapshots(state)
            .into_iter()
            .find(|s| {
                s.part_name == name && s.part_type == Some(definy_event::event::PartType::Type)
            })
            .map(|s| format!("type_part:{}", s.definition_event_hash))
    };

    match part_type {
        None => "none".to_string(),
        Some(definy_event::event::PartType::Number) => {
            find_type_part("Number").unwrap_or_else(|| "number".to_string())
        }
        Some(definy_event::event::PartType::String) => {
            find_type_part("String").unwrap_or_else(|| "string".to_string())
        }
        Some(definy_event::event::PartType::Boolean) => {
            find_type_part("Boolean").unwrap_or_else(|| "boolean".to_string())
        }
        Some(definy_event::event::PartType::Type) => {
            find_type_part("Type").unwrap_or_else(|| "type".to_string())
        }
        Some(definy_event::event::PartType::TypePart(hash)) => {
            format!("type_part:{}", hash)
        }
        Some(definy_event::event::PartType::List(_)) => {
            find_type_part("List").unwrap_or_else(|| "list".to_string())
        }
    }
}
