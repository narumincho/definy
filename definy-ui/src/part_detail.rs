use std::str::FromStr;

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::Location;
use crate::app_state::AppState;
use crate::expression_editor::{part_type_to_expression_type, render_root_expression_editor};
use crate::expression_eval::{evaluate_expression, expression_to_source};
use crate::module_projection::collect_module_snapshots;
use crate::page_context::PageContext;
use crate::part_projection::{collect_related_part_events, find_part_snapshot};

#[component]
pub fn PartDetailView(
    state: AppState,
    context: PageContext,
    definition_event_hash: EventHashId,
) -> Element {
    let snapshot = find_part_snapshot(&state, &definition_event_hash);
    let related_events = collect_related_part_events(&state, &definition_event_hash);
    let page_shell_style = crate::layout::page_shell_style("1.2rem");

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            if let Some(snapshot) = snapshot {
                a {
                    class: "back-link",
                    href: context.href_with_lang(Location::PartList),
                    style: "display: inline-flex; align-items: center; gap: 0.4rem; color: var(--primary); font-size: 0.88rem; font-weight: 500; text-decoration: none;",
                    {
                        context
                            .language
                            .label(
                                "← Back to Parts",
                                "← パーツ一覧へ戻る",
                                "← Reen al partoj",
                            )
                    }
                }
                PartEditorCard {
                    state: state.clone(),
                    context: context.clone(),
                    definition_event_hash: definition_event_hash.clone(),
                    snapshot: snapshot.clone(),
                }
                PartHistoryCard { context: context.clone(), related_events }
            } else {
                a {
                    href: context.href_with_lang(Location::PartList),
                    style: "color: var(--primary); text-decoration: none;",
                    "{context.language.label(\"← Back to Parts\", \"← パーツ一覧へ戻る\", \"← Reen al partoj\")}"
                }
                div { style: "color: var(--text-secondary); text-align: center; padding: 2rem;",
                    "{context.language.label(\"Part not found\", \"パーツが見つかりません\", \"Parto ne trovita\")}"
                }
            }
        }
    }
}

#[component]
fn PartEditorCard(
    state: AppState,
    context: PageContext,
    definition_event_hash: EventHashId,
    snapshot: crate::part_projection::PartSnapshot,
) -> Element {
    let language = context.language;
    let mut part_name = use_signal(|| snapshot.part_name.clone());
    let mut part_description = use_signal(|| snapshot.description_for(language));
    let expression = use_signal(|| snapshot.expression.clone());
    let mut module_hash = use_signal(|| Some(snapshot.module_definition_event_hash));
    let mut eval_result = use_signal(|| None::<String>);
    let mut submit_result = use_signal(|| None::<String>);
    let mut show_wasm_inspector = use_signal(|| false);
    use_context_provider(|| expression);

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

    let is_logged_in = state.current_key.is_some();
    let expected_type = snapshot
        .part_type
        .as_ref()
        .map(part_type_to_expression_type);

    let on_evaluate = move |_| {
        let state_sig = use_context::<Signal<AppState>>();
        let events_vec = state_sig.read().events_with_hash();
        let result = if let Some(expr) = &*expression.read() {
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
            let force_offline = state_val.force_offline;
            let def_hash = definition_event_hash.clone();
            spawn(async move {
                let record_opt = crate::event_submit::submit_event(
                    definy_event::event::EventContent::PartUpdate(
                        definy_event::event::PartUpdateEvent {
                            part_name: name.into(),
                            part_description: desc.into(),
                            part_definition_event_hash: def_hash,
                            expression: expr_val,
                            module_definition_event_hash: mod_hash,
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
                style: "display: grid; gap: 0.8rem; padding: 1rem 1.2rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);",
                // 上部バー：タイトルとアクションボタン
                div { style: "display: flex; justify-content: space-between; align-items: center; gap: 0.8rem; flex-wrap: wrap;",
                    div { style: "display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap;",
                        h2 { style: "font-size: 1.35rem; font-weight: 700; margin: 0; color: var(--text);",
                            "{part_name}"
                        }
                        span { style: "font-size: 0.76rem; color: var(--text-secondary); opacity: 0.8;",
                            "{updated_at_label}"
                        }
                    }
                    div { style: "display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;",
                        button {
                            r#type: "button",
                            style: if show_wasm_inspector() { "padding: 0.4rem 0.85rem; font-size: 0.82rem; background: rgb(124 192 216 / 0.18); border: 1px solid var(--primary); border-radius: var(--radius-sm); color: var(--primary); font-weight: 600; cursor: pointer;" } else { "padding: 0.4rem 0.85rem; font-size: 0.82rem; background: rgb(255 255 255 / 0.08); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); font-weight: 600; cursor: pointer; transition: background 0.15s ease;" },
                            onclick: move |_| show_wasm_inspector.toggle(),
                            "{context.language.label(\"Wasm Inspector\", \"Wasm インスペクタ\", \"Wasm-inspektilo\")}"
                        }
                        button {
                            r#type: "button",
                            style: "padding: 0.4rem 0.85rem; font-size: 0.82rem; background: rgb(255 255 255 / 0.08); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); font-weight: 600; cursor: pointer; transition: background 0.15s ease;",
                            onclick: on_evaluate,
                            "{context.language.label(\"Evaluate\", \"評価\", \"Taksi\")}"
                        }
                        button {
                            r#type: "button",
                            disabled: !is_logged_in,
                            style: if is_logged_in { "padding: 0.4rem 1.1rem; font-size: 0.82rem; background: var(--primary); color: #0e1720; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; box-shadow: var(--shadow-sm);" } else { "padding: 0.4rem 1.1rem; font-size: 0.82rem; background: var(--surface); color: var(--text-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); font-weight: 600; cursor: not-allowed; opacity: 0.5;" },
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
                if !is_logged_in {
                    div { style: "font-size: 0.78rem; color: var(--text-secondary); background: rgb(255 255 255 / 0.03); padding: 0.35rem 0.6rem; border-radius: var(--radius-xs);",
                        "{context.language.label(\"Login required to save changes.\", \"編集を保存するにはログインが必要です。\", \"Ensaluto necesas por表保存i ŝanĝojn.\")}"
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

            // 2. 式エディタカード（メインワークスペース）
            div {
                class: "event-detail-card",
                style: "display: grid; gap: 0.65rem; padding: 1rem 1.2rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);",
                div { style: "display: flex; justify-content: space-between; align-items: center;",
                    span { style: "font-size: 0.95rem; font-weight: 600; color: var(--text);",
                        "{context.language.label(\"Expression\", \"式\", \"Esprimo\")}"
                    }
                }
                {
                    render_root_expression_editor(
                        &state,
                        &context,
                        &expression.read(),
                        expected_type,
                    )
                }
                {
                    let expr_str = expression
                        .read()
                        .as_ref()
                        .map(expression_to_source)
                        .unwrap_or_else(|| {
                            context.language.label("(none)", "(なし)", "(neniu)").to_string()
                        });
                    rsx! {
                        div {
                            class: "mono",
                            style: "font-size: 0.8rem; color: #a5f3fc; background: rgb(0 0 0 / 0.22); border: 1px solid var(--border); padding: 0.35rem 0.6rem; border-radius: var(--radius-sm); overflow-x: auto; white-space: nowrap;",
                            "{expr_str}"
                        }
                    }
                }
                if let Some(eval) = eval_result() {
                    div {
                        class: "mono",
                        style: "font-size: 0.84rem; word-break: break-word; background: rgb(124 192 216 / 0.12); border: 1px solid var(--primary); color: var(--text); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);",
                        "{eval}"
                    }
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

#[component]
fn PartHistoryCard(
    context: PageContext,
    related_events: Vec<(EventHashId, definy_event::event::Event)>,
) -> Element {
    rsx! {
        div {
            class: "event-detail-card",
            style: "display: grid; gap: 0.45rem; padding: 0.85rem 1rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);",
            div { style: "font-size: 0.9rem; font-weight: 600; color: var(--text);",
                "{context.language.label(\"History\", \"履歴\", \"Historio\")}"
            }
            div { style: "display: grid; gap: 0.35rem;",
                for (event_hash, ev) in related_events {
                    {
                        let label = crate::event_presenter::event_kind_label(context.language, &ev);
                        let time_str = ev.time.format("%Y-%m-%d %H:%M:%S").to_string();
                        let hash_str = event_hash.to_string();
                        rsx! {
                            a {
                                key: "{event_hash}",
                                href: context.href_with_lang(Location::Event(event_hash)),
                                class: "event-card",
                                style: "display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; padding: 0.45rem 0.65rem; border: 1px solid var(--border); border-radius: var(--radius-sm); text-decoration: none; color: var(--text); background: rgb(255 255 255 / 0.02); font-size: 0.8rem; flex-wrap: wrap;",
                                div { style: "display: flex; align-items: center; gap: 0.5rem;",
                                    span {
                                        class: "badge",
                                        style: "font-size: 0.7rem; color: var(--primary); background: rgb(124 192 216 / 0.1); padding: 0.1rem 0.4rem; border-radius: var(--radius-full); white-space: nowrap;",
                                        "{label}"
                                    }
                                    span {
                                        class: "mono",
                                        style: "color: var(--text-secondary); opacity: 0.7; font-size: 0.74rem;",
                                        "{hash_str}"
                                    }
                                }
                                span { style: "font-size: 0.74rem; color: var(--text-secondary); opacity: 0.8; margin-left: auto;",
                                    "{time_str}"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
