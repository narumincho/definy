use std::str::FromStr;

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::app_state::AppState;
use crate::expression_editor::part_type_to_expression_type;
use crate::expression_eval::evaluate_expression;
use crate::module_projection::collect_module_snapshots;
use crate::page_context::PageContext;

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
    let mut part_type_expr = use_signal(|| None::<definy_event::event::Expression>);
    let module_hash = use_signal(|| None::<EventHashId>);
    let mut composing_expression = use_signal(|| None::<definy_event::event::Expression>);

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
        let type_val = part_type_expr
            .read()
            .as_ref()
            .and_then(definy_event::event::PartType::from_expression);
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
                    part_type_expr.set(None);
                    composing_expression.set(None);
                } else {
                    eval_result.set(Some(match record.status {
                        crate::local_event::LocalEventStatus::Queued => {
                            is_form_open.set(false);
                            part_name.set(String::new());
                            part_description.set(String::new());
                            part_type_expr.set(None);
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
                part_type_expr,
            }
            PartDescriptionInput { part_description }
            div { style: "color: var(--text-secondary); font-size: 0.82rem; font-weight: 500;",
                {context.language.label("Expression", "式", "Esprimo")}
            }
            {
                let expected_type = part_type_expr
                    .read()
                    .as_ref()
                    .and_then(definy_event::event::PartType::from_expression)
                    .as_ref()
                    .map(part_type_to_expression_type);
                rsx! {
                    crate::expression_editor::ExpressionEditorContainer {
                        state: state.clone(),
                        context: context.clone(),
                        expression: composing_expression,
                        expected_type,
                    }
                }
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
    mut part_type_expr: Signal<Option<definy_event::event::Expression>>,
) -> Element {
    rsx! {
        div { style: "display: grid; gap: 0.35rem;",
            div { style: "display: flex; justify-content: space-between; align-items: center;",
                span { style: "font-size: 0.85rem; color: var(--text-secondary);",
                    "{context.language.label(\"Part Type\", \"パーツ型\", \"Parto-tipo\")}"
                }
                if part_type_expr.read().is_some() {
                    button {
                        r#type: "button",
                        style: "background: none; border: none; color: var(--text-muted); font-size: 0.75rem; cursor: pointer;",
                        onclick: move |_| part_type_expr.set(None),
                        "{context.language.label(\"Clear (no type)\", \"クリア (型指定なし)\", \"Forigi (sen tipo)\")}"
                    }
                }
            }
            crate::expression_editor::ExpressionEditorContainer {
                state: state.clone(),
                context: context.clone(),
                expression: part_type_expr,
                expected_type: Some(crate::expression_editor::ExpressionType::Type),
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
