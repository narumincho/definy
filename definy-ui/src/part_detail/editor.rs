use std::str::FromStr;

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::app_state::AppState;
use crate::expression_editor::part_type_to_expression_type;
use crate::expression_eval::evaluate_expression;
use crate::module_projection::collect_module_snapshots;
use crate::page_context::PageContext;

#[component]
pub(crate) fn PartEditorCard(
    state: AppState,
    context: PageContext,
    definition_event_hash: EventHashId,
    snapshot: crate::part_projection::PartSnapshot,
) -> Element {
    let language = context.language;
    let mut part_name = use_signal(|| snapshot.part_name.clone());
    let mut part_description = use_signal(|| snapshot.description_for(language));
    let mut part_type_expr = use_signal(|| {
        snapshot
            .part_type
            .as_ref()
            .map(definy_event::event::PartType::to_expression)
    });
    let expression = use_signal(|| snapshot.expression.clone());
    let mut module_hash = use_signal(|| Some(snapshot.module_definition_event_hash));
    let mut commit_message = use_signal(String::new);
    let eval_result = use_signal(|| None::<String>);
    let mut submit_result = use_signal(|| None::<String>);
    let mut show_wasm_inspector = use_signal(|| false);

    let hash_as_base64 = definition_event_hash.to_string();
    let dropdown_name = format!("part-update-module-{}", hash_as_base64);
    let modules = collect_module_snapshots(&state);
    let module_options: Vec<(String, String)> = modules
        .iter()
        .map(|module| {
            (
                module.definition_event_hash.to_string(),
                module.module_name.clone(),
            )
        })
        .collect();
    let current_module_value = module_hash()
        .map(|hash| hash.to_string())
        .unwrap_or_else(|| {
            modules
                .first()
                .map(|m| m.definition_event_hash.to_string())
                .unwrap_or_default()
        });

    let updated_at_str = snapshot.updated_at.format("%Y-%m-%d %H:%M:%S").to_string();
    let updated_at_label = format!(
        "{} {updated_at_str}",
        context
            .language
            .label("Updated at:", "更新日時:", "Ĝisdatigita je:"),
    );

    let is_logged_in = state.current_key.is_some()
        || try_use_context::<Signal<AppState>>()
            .map(|sig| sig.read().current_key.is_some())
            .unwrap_or(false);
    let expected_type = part_type_expr
        .read()
        .as_ref()
        .and_then(definy_event::event::PartType::from_expression)
        .as_ref()
        .map(part_type_to_expression_type);

    let on_save = {
        let definition_event_hash = definition_event_hash.clone();
        move |_| {
            let state_sig = use_context::<Signal<AppState>>();
            let state_val = state_sig.read().clone();
            let key = if let Some(key) = &state_val.current_key {
                key.clone()
            } else {
                submit_result.set(Some(
                    language
                        .label(
                            "Error: login required",
                            "エラー: ログインが必要です",
                            "Eraro: ensaluto necesas",
                        )
                        .to_string(),
                ));
                return;
            };
            let name = part_name().trim().to_string();
            if name.is_empty() {
                submit_result.set(Some(
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
            if !definy_event::naming::is_valid_name(&name) {
                submit_result.set(Some(
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
            let desc = part_description();
            let type_val = part_type_expr
                .read()
                .as_ref()
                .and_then(definy_event::event::PartType::from_expression);
            let expr_val = expression();
            let Some(mod_hash) = module_hash() else {
                submit_result.set(Some(
                    language
                        .label(
                            "Error: module is required",
                            "エラー: モジュールを選択してください",
                            "Eraro: modulo estas bezonata",
                        )
                        .to_string(),
                ));
                return;
            };
            let module_snapshot =
                crate::module_projection::find_module_snapshot(&state_val, &mod_hash);
            let Some(m) = module_snapshot else {
                submit_result.set(Some("Module not found".to_string()));
                return;
            };

            let existing_parts = crate::part_projection::collect_part_snapshots(&state_val);
            let target_id = definition_event_hash.clone();
            let mut parts: Vec<definy_event::event::ModulePartEntry> = existing_parts
                .into_iter()
                .filter(|p| {
                    p.module_definition_event_hash == m.definition_event_hash
                        && p.definition_event_hash != target_id
                })
                .map(|p| definy_event::event::ModulePartEntry {
                    name: p.part_name.into(),
                    part_type: p.part_type,
                    description: p.part_description,
                    content_hash: p.content_hash,
                    expression: p.expression,
                })
                .collect();

            let content_hash = expr_val
                .as_ref()
                .and_then(|e| definy_event::ContentHash::from_expression(e).ok());
            parts.push(definy_event::event::ModulePartEntry {
                name: name.clone().into(),
                part_type: type_val,
                description: desc.into(),
                content_hash,
                expression: expr_val,
            });

            let commit_msg = commit_message().trim().to_string();
            let final_message = if commit_msg.is_empty() {
                format!("Update part '{}'", name)
            } else {
                commit_msg
            };
            let force_offline = state_val.force_offline;
            spawn(async move {
                let record_opt = crate::event_submit::submit_event(
                    definy_event::event::EventContent::ModuleCommit(
                        definy_event::event::ModuleCommitEvent {
                            module_name: m.module_name.into(),
                            module_description: m.module_description,
                            parent_commit_hash: Some(m.latest_event_hash),
                            message: final_message.into(),
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
                    submit_result.set(Some(match record.status {
                        crate::local_event::LocalEventStatus::Sent => language
                            .label(
                                "Changes saved successfully",
                                "変更を保存しました",
                                "Ŝanĝoj konservitaj",
                            )
                            .to_string(),
                        crate::local_event::LocalEventStatus::Queued => language
                            .label(
                                "Changes queued (offline)",
                                "変更をキューに追加しました (オフライン)",
                                "Ŝanĝoj envicigitaj (senkonekte)",
                            )
                            .to_string(),
                        crate::local_event::LocalEventStatus::Failed => language
                            .label(
                                "Failed to save changes",
                                "変更の保存に失敗しました",
                                "Konservado de ŝanĝoj malsukcesis",
                            )
                            .to_string(),
                    }));
                }
            });
        }
    };

    rsx! {
        div { style: "display: grid; gap: 0.85rem;",
            // 1. メタ情報＆アクションヘッダーカード
            div {
                class: "event-detail-card",
                style: "display: grid; gap: 1rem; padding: 1.25rem 1.4rem;",
                // 上部バー：タイトルとアクションボタン
                div { style: "display: flex; justify-content: space-between; align-items: center; gap: 0.8rem; flex-wrap: wrap;",
                    div { style: "display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap;",
                        h2 { style: "font-size: 1.4rem; font-weight: 700; margin: 0; color: var(--text-primary);",
                            "{part_name}"
                        }
                        if let Some(ref ch) = snapshot.content_hash {
                            {
                                let hash_str = ch.to_string();
                                let short_h = if hash_str.len() > 10 {
                                    format!("#{}", &hash_str[..10])
                                } else {
                                    format!("#{}", hash_str)
                                };
                                rsx! {
                                    span { class: "hash-chip", title: "ContentHash: {hash_str}", "{short_h}" }
                                }
                            }
                        }
                        span { style: "font-size: 0.76rem; color: var(--text-muted);",
                            "{updated_at_label}"
                        }
                    }
                    div { style: "display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;",
                        button {
                            r#type: "button",
                            class: "btn-secondary",
                            "aria-pressed": if show_wasm_inspector() { "true" } else { "false" },
                            style: if show_wasm_inspector() { "background: rgba(56, 189, 248, 0.16); border-color: var(--primary); color: var(--primary); box-shadow: 0 0 12px rgba(56, 189, 248, 0.25);" } else { "" },
                            onclick: move |_| show_wasm_inspector.toggle(),
                            crate::icon::SearchIcon {}
                            span {
                                "{context.language.label(\"Wasm Inspector\", \"Wasm インスペクタ\", \"Wasm-inspektilo\")}"
                            }
                        }
                        button {
                            r#type: "button",
                            class: "btn-secondary",
                            onclick: {
                                let state = state.clone();
                                move |_| {
                                    evaluate_and_set_result(&expression.read(), &state, language, eval_result);
                                }
                            },
                            crate::icon::PlayIcon {}
                            span { "{context.language.label(\"Evaluate\", \"評価\", \"Taksi\")}" }
                        }
                        button {
                            r#type: "button",
                            class: if is_logged_in { "btn-primary" } else { "btn-secondary" },
                            disabled: !is_logged_in,
                            onclick: on_save,
                            "{context.language.label(\"Save changes\", \"編集を保存\", \"Konservi ŝanĝojn\")}"
                        }
                    }
                }
                // 入力グリッド：パーツ名とモジュール（2カラム）
                div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem;",
                    div { style: "display: grid; gap: 0.3rem;",
                        label { style: "font-size: 0.8rem; font-weight: 500; color: var(--text-secondary);",
                            "{context.language.label(\"Part Name\", \"パーツ名\", \"Parto-nomo\")}"
                        }
                        input {
                            r#type: "text",
                            name: "part-update-name",
                            value: "{part_name}",
                            placeholder: "my-part",
                            style: "padding: 0.42rem 0.65rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font-size: 0.9rem;",
                            oninput: move |evt: FormEvent| {
                                part_name.set(evt.value());
                            },
                        }
                    }
                    div { style: "display: grid; gap: 0.3rem;",
                        label { style: "font-size: 0.8rem; font-weight: 500; color: var(--text-secondary);",
                            "{context.language.label(\"Module\", \"所属モジュール\", \"Modulo\")}"
                        }
                        crate::dropdown::SearchableDropdown {
                            name: dropdown_name,
                            current_value: current_module_value,
                            options: module_options,
                            on_change: move |val: String| {
                                module_hash.set(EventHashId::from_str(&val).ok());
                            },
                        }
                    }
                }
                // 説明文
                div { style: "display: grid; gap: 0.3rem;",
                    label { style: "font-size: 0.8rem; font-weight: 500; color: var(--text-secondary);",
                        "{context.language.label(\"Description\", \"説明文\", \"Priskribo\")}"
                    }
                    textarea {
                        name: "part-update-description",
                        value: "{part_description}",
                        placeholder: "{context.language.label(\"Enter part description...\", \"パーツの説明を入力...\", \"Enigu partan priskribon...\")}",
                        style: "min-height: 3.2rem; padding: 0.42rem 0.65rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font-family: inherit; font-size: 0.85rem; resize: vertical;",
                        oninput: move |evt: FormEvent| {
                            part_description.set(evt.value());
                        },
                    }
                }
                // コミットメッセージ
                div { style: "display: grid; gap: 0.3rem;",
                    label { style: "font-size: 0.8rem; font-weight: 500; color: var(--text-secondary);",
                        {
                            context
                                .language
                                .label("Commit Message", "コミットメッセージ", "Enmeta mesaĝo")
                        }
                    }
                    input {
                        r#type: "text",
                        name: "part-update-commit-message",
                        value: "{commit_message}",
                        placeholder: context
                            .language
                            .label(
                                "e.g. Update part expression or type",
                                "例: パーツの式や型を更新",
                                "ekz. Ĝisdatigi partan esprimon aŭ tipon",
                            ),
                        style: "padding: 0.42rem 0.65rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font-size: 0.9rem;",
                        oninput: move |evt: FormEvent| {
                            commit_message.set(evt.value());
                        },
                    }
                }
                if !is_logged_in {
                    div { style: "font-size: 0.78rem; color: var(--text-secondary); background: rgb(255 255 255 / 0.03); padding: 0.35rem 0.6rem; border-radius: var(--radius-xs);",
                        "{context.language.label(\"Login required to save changes.\", \"編集を保存するにはログインが必要です。\", \"Ensaluto necesas por konservi ŝanĝojn.\")}"
                    }
                }
                if let Some(result) = submit_result() {
                    div {
                        class: "mono",
                        style: "font-size: 0.82rem; word-break: break-word; background: rgb(124 192 216 / 0.1); border: 1px solid var(--border); color: var(--text); padding: 0.4rem 0.65rem; border-radius: var(--radius-sm);",
                        "{result}"
                    }
                }
            }

            // 2. パーツ型エディタカード
            div {
                class: "event-detail-card",
                style: "display: grid; gap: 0.85rem; padding: 1.25rem 1.4rem;",
                div { style: "display: flex; justify-content: space-between; align-items: center;",
                    span { style: "font-size: 1.05rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.01em;",
                        "{context.language.label(\"Part Type\", \"パーツ型\", \"Parto-tipo\")}"
                    }
                    if part_type_expr.read().is_some() {
                        button {
                            r#type: "button",
                            class: "btn-secondary btn-sm",
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
                    max_width: 800.0,
                }
            }

            // 3. 式エディタカード（メインワークスペース）
            div {
                class: "event-detail-card",
                style: "display: grid; gap: 0.85rem; padding: 1.25rem 1.4rem;",
                div { style: "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;",
                    div { style: "display: flex; align-items: baseline; gap: 0.6rem;",
                        span { style: "font-size: 1.05rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.01em;",
                            "{context.language.label(\"Expression\", \"式\", \"Esprimo\")}"
                        }
                        if !is_logged_in {
                            span {
                                "data-unauthenticated-badge": "true",
                                style: "font-size: 0.74rem; color: var(--text-muted);",
                                "{context.language.label(\"(Editable & Evaluatable without login)\", \"(未ログインでも自由に編集・評価可能)\", \"(Redaktebla kaj taksebla sen ensaluto)\")}"
                            }
                        }
                    }
                    button {
                        r#type: "button",
                        class: "btn-secondary btn-sm",
                        onclick: {
                            let state = state.clone();
                            move |_| {
                                evaluate_and_set_result(&expression.read(), &state, language, eval_result);
                            }
                        },
                        crate::icon::PlayIcon {}
                        span { "{context.language.label(\"Evaluate\", \"評価\", \"Taksi\")}" }
                    }
                }
                crate::tree_layout::ExpressionTreeEditor {
                    state: state.clone(),
                    context: context.clone(),
                    expression,
                    expected_type,
                    max_width: 800.0,
                }
                {
                    eval_result()
                        .map(|eval| {
                            let is_error = eval.starts_with("Error")
                                || eval.starts_with("エラー");
                            let (bg, border, text_color) = if is_error {
                                ("var(--error-bg)", "var(--error)", "#fca5a5")
                            } else {
                                ("rgba(56, 189, 248, 0.12)", "var(--primary)", "#e0f2fe")
                            };
                            rsx! {
                                div {
                                    class: "mono eval-result",
                                    "data-eval-result": "true",
                                    style: "font-size: 0.86rem; word-break: break-word; background: {bg}; border: 1px solid {border}; color: {text_color}; padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); box-shadow: 0 0 12px rgba(56, 189, 248, 0.15);",
                                    "{eval}"
                                }
                            }
                        })
                }
            }

            if show_wasm_inspector() {
                {
                    if let Some(expr) = &*expression.read() {
                        let events_vec = state.events_with_hash();
                        match crate::wasm_emitter::compile_expression_to_wasm(expr, &events_vec) {
                            Ok(wasm_bytes) => {
                                rsx! {
                                    crate::wasm_inspector::WasmInspectorCard { language, part_name: part_name(), wasm_bytes }
                                }
                            }
                            Err(err) => {
                                let err_msg = format!(
                                    "{}: {}",
                                    language
                                        .label(
                                            "Failed to compile to WebAssembly",
                                            "WebAssembly へのコンパイルに失敗しました",
                                            "Kompilado al WebAssembly malsukcesis",
                                        ),
                                    err,
                                );
                                rsx! {
                                    div { style: "padding: 0.8rem; background: rgb(239 68 68 / 0.1); border: 1px solid var(--border); border-radius: var(--radius-sm); color: #fca5a5; font-size: 0.85rem;",
                                        "{err_msg}"
                                    }
                                }
                            }
                        }
                    } else {
                        rsx! {
                            div { style: "padding: 0.8rem; color: var(--text-secondary); font-size: 0.85rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm);",
                                "{language.label(\"No expression to compile to WebAssembly.\", \"WebAssembly にコンパイルする式がありません。\", \"Neniu esprimo por kompili al WebAssembly.\")}"
                            }
                        }
                    }
                }
            }
        }
    }
}

pub(crate) fn evaluate_and_set_result(
    expression: &Option<definy_event::event::Expression>,
    state_fallback: &AppState,
    language: crate::language::Language,
    mut eval_result: Signal<Option<String>>,
) {
    let events_vec = try_use_context::<Signal<AppState>>()
        .map(|sig| sig.read().events_with_hash())
        .unwrap_or_else(|| state_fallback.events_with_hash());
    let result = if let Some(expr) = expression {
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
}

#[cfg(test)]
mod tests {
    use super::*;
    use definy_event::event::{AddExpression, Expression, NumberExpression};

    #[test]
    fn test_unauthenticated_expression_evaluation() {
        let evaluated = std::sync::Arc::new(std::sync::Mutex::new(None));
        let evaluated_clone = evaluated.clone();

        let mut dom = VirtualDom::new_with_props(
            move |eval_store: std::sync::Arc<std::sync::Mutex<Option<String>>>| {
                let eval_result = use_signal(|| None::<String>);
                let state = AppState {
                    current_key: None,
                    ..AppState::default()
                };
                let expr = Some(Expression::Add(AddExpression {
                    left: Box::new(Expression::Number(NumberExpression { value: 18 })),
                    right: Box::new(Expression::Number(NumberExpression { value: 24 })),
                }));

                if eval_result().is_none() {
                    evaluate_and_set_result(
                        &expr,
                        &state,
                        crate::language::Language::Japanese,
                        eval_result,
                    );
                }

                let val = eval_result();
                *eval_store.lock().unwrap() = val;

                rsx! {
                    div {}

                }
            },
            evaluated_clone,
        );

        dom.rebuild_in_place();
        let result = evaluated.lock().unwrap().clone();
        assert_eq!(result, Some("結果: 42".to_string()));
    }
}
