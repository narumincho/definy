use std::str::FromStr;

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::app_state::AppState;
use crate::expression_editor::part_type_to_expression_type;
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
    let is_logged_in = state.current_key.is_some()
        || try_use_context::<Signal<AppState>>()
            .map(|sig| sig.read().current_key.is_some())
            .unwrap_or(false);

    let on_create = move |_| {
        let Some(state_sig) = try_use_context::<Signal<AppState>>() else {
            return;
        };
        let state_val = state_sig.read().clone();
        let key = if let Some(key) = &state_val.current_key {
            key.clone()
        } else {
            eval_result.set(Some(
                language
                    .label(
                        "Error: log in to create parts",
                        "エラー: パーツを作成・保存するにはログインしてください",
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
        let selected_module = module_hash()
            .and_then(|h| {
                modules
                    .iter()
                    .find(|m| m.definition_event_hash == h)
                    .cloned()
            })
            .or_else(|| modules.first().cloned());

        let (module_name, module_desc, parent_commit, mut parts) = if let Some(m) = selected_module
        {
            let existing_parts = crate::part_projection::collect_part_snapshots(&state_val);
            let parts_list: Vec<definy_event::event::ModulePartEntry> = existing_parts
                .into_iter()
                .filter(|p| {
                    p.module_definition_event_hash == m.definition_event_hash
                        && p.part_name != name_str
                })
                .map(|p| definy_event::event::ModulePartEntry {
                    name: p.part_name.into(),
                    part_type: p.part_type,
                    description: p.part_description,
                    content_hash: p.content_hash,
                    expression: p.expression,
                })
                .collect();
            (
                m.module_name,
                m.module_description,
                Some(m.latest_event_hash),
                parts_list,
            )
        } else {
            (
                "main".to_string(),
                definy_event::event::Description::localized(vec![
                    ("en", "Default main module"),
                    ("ja", "デフォルトのメインモジュール"),
                ]),
                None,
                vec![],
            )
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
        let content_hash = expr_val
            .as_ref()
            .and_then(|e| definy_event::ContentHash::from_expression(e).ok());
        parts.push(definy_event::event::ModulePartEntry {
            name: name_str.clone().into(),
            part_type: type_val,
            description: desc_str.into(),
            content_hash,
            expression: expr_val,
        });

        let force_offline = state_val.force_offline;
        spawn(async move {
            let record_opt = crate::event_submit::submit_event(
                definy_event::event::EventContent::ModuleCommit(
                    definy_event::event::ModuleCommitEvent {
                        module_name: module_name.into(),
                        module_description: module_desc,
                        parent_commit_hash: parent_commit,
                        message: format!("Add part '{}'", name_str).into(),
                        parts,
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
            div { style: "display: grid; gap: 0.4rem; padding-top: 0.2rem;",
                div { style: "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;",
                    div { style: "display: flex; align-items: baseline; gap: 0.6rem;",
                        span { style: "font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);",
                            {
                                context
                                    .language
                                    .label(
                                        "Expression (Initial Value)",
                                        "式 (初期値)",
                                        "Esprimo (Komenca Valoro)",
                                    )
                            }
                        }
                        if !is_logged_in {
                            span { style: "font-size: 0.74rem; color: var(--text-muted);",
                                "{context.language.label(\"(Editable & Evaluatable without login)\", \"(未ログインでも自由に編集・評価可能)\", \"(Redaktebla kaj taksebla sen ensaluto)\")}"
                            }
                        }
                    }
                    div { style: "display: flex; align-items: center; gap: 0.5rem;",
                        if composing_expression.read().is_some() {
                            button {
                                r#type: "button",
                                class: "btn-secondary",
                                style: "padding: 0.2rem 0.55rem; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 0.3rem;",
                                onclick: {
                                    let state = state.clone();
                                    move |_| {
                                        crate::part_detail::evaluate_and_set_result(
                                            &*composing_expression.read(),
                                            &state,
                                            language,
                                            eval_result,
                                        );
                                    }
                                },
                                span { "▶" }
                                span { "{context.language.label(\"Evaluate\", \"評価\", \"Taksi\")}" }
                            }
                            button {
                                r#type: "button",
                                style: "background: none; border: none; color: var(--text-muted); font-size: 0.75rem; cursor: pointer;",
                                onclick: move |_| composing_expression.set(None),
                                {
                                    context
                                        .language
                                        .label(
                                            "Clear (no expression)",
                                            "クリア (式なし)",
                                            "Forigi (sen esprimo)",
                                        )
                                }
                            }
                        }
                    }
                }
                if composing_expression.read().is_none() {
                    div { style: "display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.2rem;",
                        span { style: "font-size: 0.74rem; color: var(--text-muted);",
                            {context.language.label("Templates:", "テンプレート:", "Ŝablonoj:")}
                        }
                        button {
                            r#type: "button",
                            class: "btn-secondary",
                            style: "padding: 0.18rem 0.5rem; font-size: 0.75rem;",
                            onclick: move |_| {
                                composing_expression
                                    .set(
                                        Some(
                                            definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                                                value: 0,
                                            }),
                                        ),
                                    )
                            },
                            "0 (Number)"
                        }
                        button {
                            r#type: "button",
                            class: "btn-secondary",
                            style: "padding: 0.18rem 0.5rem; font-size: 0.75rem;",
                            onclick: move |_| {
                                composing_expression
                                    .set(
                                        Some(
                                            definy_event::event::Expression::String(definy_event::event::StringExpression {
                                                value: "".into(),
                                            }),
                                        ),
                                    )
                            },
                            "\"\" (String)"
                        }
                        button {
                            r#type: "button",
                            class: "btn-secondary",
                            style: "padding: 0.18rem 0.5rem; font-size: 0.75rem;",
                            onclick: move |_| {
                                composing_expression
                                    .set(
                                        Some(
                                            definy_event::event::Expression::Boolean(definy_event::event::BooleanExpression {
                                                value: true,
                                            }),
                                        ),
                                    )
                            },
                            "true (Bool)"
                        }
                    }
                }
                {
                    let expected_type = part_type_expr
                        .read()
                        .as_ref()
                        .and_then(definy_event::event::PartType::from_expression)
                        .as_ref()
                        .map(part_type_to_expression_type);
                    rsx! {
                        crate::tree_layout::ExpressionTreeEditor {
                            state: state.clone(),
                            context: context.clone(),
                            expression: composing_expression,
                            expected_type,
                            max_width: 700.0,
                        }
                    }
                }
            }
            {
                eval_result()
                    .map(|result| {
                        let is_error = result.starts_with("Error")
                            || result.starts_with("エラー");
                        let (bg, border, text_color) = if is_error {
                            ("var(--error-bg)", "var(--error)", "#fca5a5")
                        } else {
                            ("rgba(56, 189, 248, 0.12)", "var(--primary)", "#e0f2fe")
                        };
                        rsx! {
                            div {
                                class: "mono eval-result",
                                "data-eval-result": "true",
                                style: "padding: 0.5rem 0.8rem; font-size: 0.84rem; background: {bg}; border: 1px solid {border}; color: {text_color}; border-radius: var(--radius-sm); word-break: break-word;",
                                "{result}"
                            }
                        }
                    })
            }
            div { style: "display: flex; justify-content: space-between; align-items: center; gap: 0.6rem; flex-wrap: wrap; padding-top: 0.3rem;",
                div { style: "display: flex; gap: 0.45rem; align-items: center;",
                    if composing_expression.read().is_some() {
                        button {
                            r#type: "button",
                            class: "btn-secondary",
                            style: "padding: 0.35rem 0.75rem; font-size: 0.84rem; display: inline-flex; align-items: center; gap: 0.35rem;",
                            onclick: {
                                let state = state.clone();
                                move |_| {
                                    crate::part_detail::evaluate_and_set_result(
                                        &*composing_expression.read(),
                                        &state,
                                        language,
                                        eval_result,
                                    );
                                }
                            },
                            span { "▶" }
                            span { "{context.language.label(\"Evaluate\", \"評価\", \"Taksi\")}" }
                        }
                    }
                    button {
                        r#type: "button",
                        class: if is_logged_in { "btn-primary" } else { "btn-secondary" },
                        style: "padding: 0.35rem 0.85rem; font-size: 0.84rem; font-weight: 600;",
                        onclick: on_create,
                        "{context.language.label(\"Create\", \"作成\", \"Krei\")}"
                    }
                }
                if !is_logged_in {
                    div { style: "display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: var(--text-secondary);",
                        span {
                            "{context.language.label(\"Login required to save.\", \"保存にはログインが必要です。\", \"Ensaluto necesas por konservi.\")}"
                        }
                        button {
                            r#type: "button",
                            "commandfor": "login-or-create-account-dialog",
                            "command": "show-modal",
                            class: "btn-secondary",
                            style: "padding: 0.2rem 0.55rem; font-size: 0.76rem; border-color: var(--primary); color: var(--primary);",
                            "{context.language.label(\"Log In\", \"ログイン\", \"Ensaluti\")}"
                        }
                    }
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
            crate::tree_layout::ExpressionTreeEditor {
                state: state.clone(),
                context: context.clone(),
                expression: part_type_expr,
                expected_type: Some(crate::expression_editor::ExpressionType::Type),
                max_width: 700.0,
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
