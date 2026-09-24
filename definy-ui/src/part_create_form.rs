use std::str::FromStr;

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::app_state::AppState;
use crate::expression_editor::{part_type_to_expression_type, render_root_expression_editor};
use crate::expression_eval::evaluate_expression;
use crate::module_projection::collect_module_snapshots;
use crate::page_context::PageContext;
use crate::part_projection::collect_part_snapshots;

#[component]
pub fn PartDefinitionFormView(
    state: AppState,
    context: PageContext,
    mut is_form_open: Signal<bool>,
    mut eval_result: Signal<Option<String>>,
) -> Element {
    let language = context.language;
    let mut part_name = use_signal(String::new);
    let mut part_description = use_signal(String::new);
    let part_type = use_signal(|| None::<definy_event::event::PartType>);
    let module_hash = use_signal(|| None::<EventHashId>);
    let mut composing_expression = use_signal(|| None::<definy_event::event::Expression>);
    use_context_provider(|| composing_expression);

    let on_evaluate = move |_| {
        let state_sig = use_context::<Signal<AppState>>();
        let events_vec: Vec<_> = state_sig.read().events_with_hash();
        let result = if let Some(expr) = &*composing_expression.read() {
            match evaluate_expression(expr, &events_vec) {
                Ok(value) => {
                    format!(
                        "{} {}",
                        language.label("Result:", "結果:", "Rezulto:"),
                        value,
                    )
                }
                Err(error) => {
                    format!(
                        "{} {}",
                        language.label("Error:", "エラー:", "Eraro:"),
                        error,
                    )
                }
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
        eval_result.set(Some(result));
    };

    let on_create = move |_| {
        let state_sig = use_context::<Signal<AppState>>();
        let state_val = state_sig.read().clone();
        let key = if let Some(key) = &state_val.current_key {
            key.clone()
        } else {
            eval_result.set(Some(
                language
                    .label(
                        "Error: log in to create parts",
                        "エラー: パーツを作成するにはログインしてください",
                        "Eraro: ensalutu por krei partojn",
                    )
                    .to_string(),
            ));
            return;
        };
        let name_str = part_name().trim().to_string();
        let desc_str = part_description();
        let type_val = part_type();
        let modules = collect_module_snapshots(&state_val);
        let mod_hash_opt =
            module_hash().or_else(|| modules.first().map(|m| m.definition_event_hash.clone()));
        let (final_module_hash, auto_create_module_binary) = if let Some(hash) = mod_hash_opt {
            (hash, None)
        } else {
            let module_event = definy_event::event::Event {
                account_id: definy_event::event::AccountId(key.verifying_key()),
                time: chrono::Utc::now(),
                content: definy_event::event::EventContent::ModuleDefinition(
                    definy_event::event::ModuleDefinitionEvent {
                        module_name: "main".into(),
                        description: definy_event::event::Description::localized(vec![
                            ("en", "Default main module"),
                            ("ja", "デフォルトのメインモジュール"),
                        ]),
                    },
                ),
            };
            match definy_event::sign_and_serialize(module_event, &key) {
                Ok(binary) => {
                    let hash = EventHashId::from_bytes(&binary);
                    (hash, Some(binary))
                }
                Err(err) => {
                    eval_result.set(Some(format!("Failed to create module: {err:?}")));
                    return;
                }
            }
        };
        if name_str.is_empty() {
            eval_result.set(Some(
                language
                    .label(
                        "Error: part name is required",
                        "エラー: パーツ名は必須です",
                        "Eraro: parto-nomo estas bezonata",
                    )
                    .to_string(),
            ));
            return;
        }
        if !definy_event::naming::is_valid_name(&name_str) {
            eval_result.set(Some(
                language
                    .label(
                        "Error: part name must be lowercase alphanumeric with hyphens (e.g. my-part)",
                        "エラー: パーツ名はアルファベット小文字・ハイフン区切りで入力してください (例: my-part)",
                        "Eraro: parto-nomo devas esti minusklaj literoj disigitaj per streketoj (ekz. my-part)",
                    )
                    .to_string(),
            ));
            return;
        }
        let expr_val = composing_expression();
        let force_offline = state_val.force_offline;
        spawn(async move {
            if let Some(module_binary) = auto_create_module_binary {
                let _res = crate::fetch::post_event_with_queue(&module_binary, force_offline).await;
            }
            let record_opt = crate::event_submit::submit_event(
                definy_event::event::EventContent::PartDefinition(
                    definy_event::event::PartDefinitionEvent {
                        part_name: name_str.into(),
                        description: desc_str.into(),
                        part_type: type_val,
                        expression: expr_val,
                        module_definition_event_hash: final_module_hash,
                    },
                ),
                key,
                force_offline,
                None,
                state_sig,
            )
            .await;
            if let Some(record) = record_opt {
                if record.status == crate::local_event::LocalEventStatus::Sent {
                    eval_result.set(None);
                    is_form_open.set(false);
                    part_name.set(String::new());
                    part_description.set(String::new());
                    composing_expression.set(None);
                } else {
                    eval_result.set(Some(match record.status {
                        crate::local_event::LocalEventStatus::Queued => {
                            is_form_open.set(false);
                            part_name.set(String::new());
                            part_description.set(String::new());
                            composing_expression.set(None);
                            language
                                .label(
                                    "PartDefinition queued (offline)",
                                    "PartDefinition をキューに追加しました (オフライン)",
                                    "PartDefinition envicigita (senkonekte)",
                                )
                                .to_string()
                        }
                        crate::local_event::LocalEventStatus::Failed => language
                            .label(
                                "PartDefinition failed to send",
                                "PartDefinition の送信に失敗しました",
                                "PartDefinition sendado malsukcesis",
                            )
                            .to_string(),
                        crate::local_event::LocalEventStatus::Sent => unreachable!(),
                    }));
                }
            }
        });
    };

    rsx! {
        div {
            class: "composer",
            style: "display: grid; gap: 0.5rem; background: var(--surface); backdrop-filter: var(--glass-blur); padding: 0.8rem 1rem; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); border: 1px solid var(--border);",
            div { style: "display: flex; justify-content: space-between; align-items: center;",
                div { style: "font-size: 0.95rem; font-weight: 600;",
                    "{context.language.label(\"New Part\", \"新規パーツ作成\", \"Nova Parto\")}"
                }
                button {
                    r#type: "button",
                    style: "padding: 0.2rem 0.5rem; font-size: 0.75rem; background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer;",
                    onclick: move |_| {
                        is_form_open.set(false);
                    },
                    "{context.language.label(\"Cancel\", \"閉じる\", \"Fermi\")}"
                }
            }
            PartNameInput { part_name }
            ModuleSelectionInput {
                state: state.clone(),
                context: context.clone(),
                module_hash,
            }
            PartTypeInput {
                state: state.clone(),
                context: context.clone(),
                part_type,
            }
            PartDescriptionInput { part_description }
            div { style: "color: var(--text-secondary); font-size: 0.82rem;",
                {context.language.label("Expression", "式", "Esprimo")}
            }
            {
                let expected_type = part_type.read().as_ref().map(part_type_to_expression_type);
                render_root_expression_editor(
                    &state,
                    &context,
                    &composing_expression.read(),
                    expected_type,
                )
            }
            if let Some(result) = eval_result() {
                div { style: "padding: 0.45rem 0.75rem; font-size: 0.82rem; color: var(--error); background: rgb(255 0 0 / 0.08); border: 1px solid var(--error); border-radius: var(--radius-sm); word-break: break-word;",
                    "{result}"
                }
            }
            div { style: "display: flex; gap: 0.45rem;",
                if composing_expression.read().is_some() {
                    button {
                        r#type: "button",
                        style: "padding: 0.35rem 0.75rem; background: rgb(255 255 255 / 0.06); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer;",
                        onclick: on_evaluate,
                        "{context.language.label(\"Evaluate\", \"評価\", \"Taksi\")}"
                    }
                }
                button {
                    r#type: "button",
                    style: "padding: 0.35rem 0.85rem; background: var(--primary); color: #0e1720; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;",
                    onclick: on_create,
                    "{context.language.label(\"Create\", \"作成\", \"Krei\")}"
                }
            }
        }
    }
}

#[component]
fn PartNameInput(mut part_name: Signal<String>) -> Element {
    rsx! {
        input {
            name: "part-name",
            r#type: "text",
            value: "{part_name}",
            placeholder: "part name (e.g. my-part)",
            style: "padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
            oninput: move |evt: FormEvent| {
                part_name.set(evt.value());
            },
        }
    }
}

#[component]
fn PartDescriptionInput(mut part_description: Signal<String>) -> Element {
    rsx! {
        textarea {
            name: "part-description",
            value: "{part_description}",
            placeholder: "description (supports multiple lines)",
            style: "min-height: 6rem; padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
            oninput: move |evt: FormEvent| {
                part_description.set(evt.value());
            },
        }
    }
}

#[component]
fn PartTypeInput(
    state: AppState,
    context: PageContext,
    part_type: Signal<Option<definy_event::event::PartType>>,
) -> Element {
    let current = part_type();
    rsx! {
        div { style: "display: grid; gap: 0.35rem;",
            div { style: "font-size: 0.85rem; color: var(--text-secondary);",
                "{context.language.label(\"Part Type\", \"パーツ型\", \"Parto-tipo\")}"
            }
            RenderPartTypeEditor {
                state: state.clone(),
                context: context.clone(),
                current_part_type: current,
                root_part_type: part_type,
                depth: 0,
            }
        }
    }
}

#[component]
fn ModuleSelectionInput(
    state: AppState,
    context: PageContext,
    mut module_hash: Signal<Option<EventHashId>>,
) -> Element {
    let modules = collect_module_snapshots(&state);
    let options: Vec<(String, String)> = modules
        .iter()
        .map(|module| {
            (
                module.definition_event_hash.to_string(),
                module.module_name.clone(),
            )
        })
        .collect();

    let current_value = module_hash()
        .map(|hash| hash.to_string())
        .unwrap_or_else(|| {
            modules
                .first()
                .map(|m| m.definition_event_hash.to_string())
                .unwrap_or_default()
        });

    rsx! {
        div { style: "display: grid; gap: 0.35rem;",
            div { style: "font-size: 0.85rem; color: var(--text-secondary);",
                "{context.language.label(\"Module\", \"モジュール\", \"Modulo\")}"
            }
            if modules.is_empty() {
                div { style: "font-size: 0.8rem; color: var(--text-secondary); padding: 0.3rem 0;",
                    "{context.language.label(\"No module found. A 'main' module will be created automatically.\", \"モジュールがありません。自動で 'main' モジュールが作成されます。\", \"Neniu modulo trovita. 'main' modulo estos kreita aŭtomate.\")}"
                }
            } else {
                crate::dropdown::SearchableDropdown {
                    name: "part-definition-module".to_string(),
                    current_value,
                    options,
                    on_change: move |val: String| {
                        module_hash.set(EventHashId::from_str(&val).ok());
                    },
                }
            }
        }
    }
}

#[component]
fn RenderPartTypeEditor(
    state: AppState,
    context: PageContext,
    current_part_type: Option<definy_event::event::PartType>,
    mut root_part_type: Signal<Option<definy_event::event::PartType>>,
    depth: usize,
) -> Element {
    let name = format!("part-definition-type-{}", depth);
    let selected = current_part_type_selection(&state, &current_part_type);

    let mut options = Vec::new();
    if depth == 0 {
        options.push((
            "none".to_string(),
            format!("{}\t\t", context.language.label("None", "なし", "Neniu")),
        ));
    }

    options.extend([
        (
            "number".to_string(),
            format!(
                "{}\tType\t",
                context.language.label("Number", "数値", "Nombro")
            ),
        ),
        (
            "string".to_string(),
            format!(
                "{}\tType\t",
                context.language.label("String", "文字列", "Ĉeno")
            ),
        ),
        (
            "boolean".to_string(),
            format!(
                "{}\tType\t",
                context.language.label("Boolean", "真偽値", "Bulea")
            ),
        ),
        (
            "list".to_string(),
            format!(
                "{}\tType\t",
                context.language.label("List", "リスト", "Listo")
            ),
        ),
        (
            "type".to_string(),
            format!("{}\tType\t", context.language.label("Type", "型", "Tipo")),
        ),
    ]);

    options.extend(
        collect_part_snapshots(&state)
            .into_iter()
            .filter(|snapshot| snapshot.part_type == Some(definy_event::event::PartType::Type))
            .filter(|snapshot| {
                !matches!(
                    snapshot.part_name.as_str(),
                    "number"
                        | "string"
                        | "boolean"
                        | "list"
                        | "type"
                        | "Number"
                        | "String"
                        | "Boolean"
                        | "List"
                        | "Type"
                )
            })
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

    let item_type_opt =
        if let Some(definy_event::event::PartType::List(item_type)) = &current_part_type {
            Some(item_type.as_ref().clone())
        } else {
            None
        };

    rsx! {
        div { style: "display: grid; gap: 0.45rem;",
            crate::dropdown::SearchableDropdown {
                name,
                current_value: selected,
                options,
                on_change: {
                    let state = state.clone();
                    move |val: String| {
                        let mut new_part_type = root_part_type();
                        update_part_type_at_depth(&state, &mut new_part_type, depth, val.as_str());
                        root_part_type.set(new_part_type);
                    }
                },
            }
            if let Some(item_type) = item_type_opt {
                div { style: "padding-left: 1rem; border-left: 2px solid var(--border);",
                    div { style: "font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.25rem;",
                        "{context.language.label(\"Item Type\", \"要素型\", \"Ero-tipo\")}"
                    }
                    RenderPartTypeEditor {
                        state: state.clone(),
                        context: context.clone(),
                        current_part_type: Some(item_type),
                        root_part_type,
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
        *part_type = if selected == "none" {
            None
        } else {
            Some(resolve_part_type(state, selected, part_type.as_ref()))
        };
        return;
    }

    let list_inner = match part_type {
        Some(definy_event::event::PartType::List(inner)) => inner,
        _ => {
            *part_type = Some(definy_event::event::PartType::List(Box::new(
                definy_event::event::PartType::Number,
            )));
            match part_type {
                Some(definy_event::event::PartType::List(inner)) => inner,
                _ => unreachable!(),
            }
        }
    };
    update_part_type_nested(state, list_inner.as_mut(), depth - 1, selected);
}

fn update_part_type_nested(
    state: &AppState,
    part_type: &mut definy_event::event::PartType,
    depth: usize,
    selected: &str,
) {
    if depth == 0 {
        *part_type = resolve_part_type(state, selected, Some(part_type));
        return;
    }

    let list_inner = match part_type {
        definy_event::event::PartType::List(inner) => inner,
        _ => {
            *part_type = definy_event::event::PartType::List(Box::new(
                definy_event::event::PartType::Number,
            ));
            match part_type {
                definy_event::event::PartType::List(inner) => inner,
                _ => unreachable!(),
            }
        }
    };
    update_part_type_nested(state, list_inner.as_mut(), depth - 1, selected);
}

fn resolve_part_type(
    state: &AppState,
    selected: &str,
    current: Option<&definy_event::event::PartType>,
) -> definy_event::event::PartType {
    if let Some(encoded) = selected.strip_prefix("type_part:")
        && let Ok(hash) = EventHashId::from_str(encoded)
    {
        if let Some(snapshot) = crate::part_projection::find_part_snapshot(state, &hash) {
            return match snapshot.part_name.as_str() {
                "number" | "Number" => definy_event::event::PartType::Number,
                "string" | "String" => definy_event::event::PartType::String,
                "boolean" | "Boolean" => definy_event::event::PartType::Boolean,
                "type" | "Type" => definy_event::event::PartType::Type,
                "list" | "List" => {
                    let sub = match current {
                        Some(definy_event::event::PartType::List(sub)) => sub.as_ref().clone(),
                        _ => definy_event::event::PartType::Number,
                    };
                    definy_event::event::PartType::List(Box::new(sub))
                }
                _ => definy_event::event::PartType::TypePart(hash),
            };
        }
        return definy_event::event::PartType::TypePart(hash);
    }
    match selected {
        "string" => definy_event::event::PartType::String,
        "boolean" => definy_event::event::PartType::Boolean,
        "type" => definy_event::event::PartType::Type,
        "list" => {
            let sub = match current {
                Some(definy_event::event::PartType::List(sub)) => sub.as_ref().clone(),
                _ => definy_event::event::PartType::Number,
            };
            definy_event::event::PartType::List(Box::new(sub))
        }
        _ => definy_event::event::PartType::Number,
    }
}

fn current_part_type_selection(
    state: &AppState,
    part_type: &Option<definy_event::event::PartType>,
) -> String {
    let find_type_part = |name: &str, alt_name: &str| {
        collect_part_snapshots(state)
            .into_iter()
            .find(|s| {
                (s.part_name == name || s.part_name == alt_name)
                    && s.part_type == Some(definy_event::event::PartType::Type)
            })
            .map(|s| format!("type_part:{}", s.definition_event_hash))
    };

    match part_type {
        None => "none".to_string(),
        Some(definy_event::event::PartType::Number) => {
            find_type_part("number", "Number").unwrap_or_else(|| "number".to_string())
        }
        Some(definy_event::event::PartType::String) => {
            find_type_part("string", "String").unwrap_or_else(|| "string".to_string())
        }
        Some(definy_event::event::PartType::Boolean) => {
            find_type_part("boolean", "Boolean").unwrap_or_else(|| "boolean".to_string())
        }
        Some(definy_event::event::PartType::Type) => {
            find_type_part("type", "Type").unwrap_or_else(|| "type".to_string())
        }
        Some(definy_event::event::PartType::TypePart(hash)) => {
            format!("type_part:{}", hash)
        }
        Some(definy_event::event::PartType::List(_)) => {
            find_type_part("list", "List").unwrap_or_else(|| "list".to_string())
        }
        Some(definy_event::event::PartType::Function { .. }) => {
            find_type_part("function", "Function").unwrap_or_else(|| "function".to_string())
        }
        Some(definy_event::event::PartType::Record(_)) => "record".to_string(),
        Some(definy_event::event::PartType::Union(_)) => "union".to_string(),
    }
}
