use std::str::FromStr;

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::Location;
use crate::app_state::AppState;
use crate::expression_editor::part_type_to_expression_type;
use crate::expression_eval::evaluate_expression;
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
                PartHistoryCard {
                    state: state.clone(),
                    context: context.clone(),
                    part_name: snapshot.part_name.clone(),
                    related_events,
                }
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
    let mut part_type_expr = use_signal(|| {
        snapshot
            .part_type
            .as_ref()
            .map(definy_event::event::PartType::to_expression)
    });
    let expression = use_signal(|| snapshot.expression.clone());
    let mut module_hash = use_signal(|| Some(snapshot.module_definition_event_hash));
    let mut commit_message = use_signal(String::new);
    let mut eval_result = use_signal(|| None::<String>);
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

    let is_logged_in = state.current_key.is_some();
    let expected_type = part_type_expr
        .read()
        .as_ref()
        .and_then(definy_event::event::PartType::from_expression)
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
                                    span {
                                        class: "mono",
                                        style: "font-size: 0.76rem; color: #38bdf8; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); padding: 0.15rem 0.5rem; border-radius: var(--radius-xs); display: inline-flex; align-items: center; gap: 0.25rem;",
                                        title: "ContentHash: {hash_str}",
                                        span { "📌" }
                                        span { "{short_h}" }
                                    }
                                }
                            }
                        }
                        span { style: "font-size: 0.76rem; color: var(--text-muted);",
                            "{updated_at_label}"
                        }
                    }
                    div { style: "display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;",
                        button {
                            r#type: "button",
                            class: "btn-secondary",
                            style: if show_wasm_inspector() { "background: rgba(56, 189, 248, 0.16); border-color: var(--primary); color: var(--primary); box-shadow: 0 0 12px rgba(56, 189, 248, 0.25);" } else { "" },
                            onclick: move |_| show_wasm_inspector.toggle(),
                            span { style: "font-size: 0.9em;", "🔍" }
                            span {
                                "{context.language.label(\"Wasm Inspector\", \"Wasm インスペクタ\", \"Wasm-inspektilo\")}"
                            }
                        }
                        button {
                            r#type: "button",
                            class: "btn-secondary",
                            onclick: on_evaluate,
                            span { style: "font-size: 0.9em;", "▶" }
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
                            class: "btn-secondary",
                            style: "padding: 0.2rem 0.55rem; font-size: 0.76rem;",
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
                div { style: "display: flex; justify-content: space-between; align-items: center;",
                    span { style: "font-size: 1.05rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.01em;",
                        "{context.language.label(\"Expression\", \"式\", \"Esprimo\")}"
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
                                    class: "mono",
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

fn resolve_part_commit_info(
    language: crate::language::Language,
    part_name: &str,
    ev: &definy_event::event::Event,
) -> (
    String,
    Option<EventHashId>,
    Option<definy_event::ContentHash>,
) {
    match &ev.content {
        definy_event::event::EventContent::ModuleCommit(mc) => {
            let msg = if mc.message.trim().is_empty() {
                language
                    .label(
                        "Commit (no message)",
                        "コミット (メッセージなし)",
                        "Enmeto (sen mesaĝo)",
                    )
                    .to_string()
            } else {
                mc.message.to_string()
            };
            let p_hash = mc.parent_commit_hash.clone();
            let p_entry = mc.parts.iter().find(|p| p.name.as_ref() == part_name);
            let ch = p_entry
                .and_then(|p| p.expression.as_ref())
                .and_then(|e| definy_event::ContentHash::from_expression(e).ok());
            (msg, p_hash, ch)
        }
        _ => (
            crate::event_presenter::event_kind_label(language, ev).to_string(),
            None,
            None,
        ),
    }
}

#[component]
fn PartHistoryCard(
    state: AppState,
    context: PageContext,
    part_name: String,
    related_events: Vec<(EventHashId, definy_event::event::Event)>,
) -> Element {
    let account_name_map = state.account_name_map();
    let language = context.language;

    rsx! {
        div {
            class: "event-detail-card",
            style: "display: grid; gap: 0.75rem; padding: 1.1rem 1.25rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);",
            div { style: "display: flex; align-items: center; justify-content: space-between;",
                div { style: "font-size: 0.95rem; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 0.4rem;",
                    span { "📜" }
                    span {
                        "{language.label(\"Version & Commit History\", \"バージョン・コミット履歴\", \"Versia kaj enmeta historio\")}"
                    }
                }
                span { style: "font-size: 0.75rem; color: var(--text-secondary);",
                    "{related_events.len()} {language.label(\"commits\", \"コミット\", \"enmetoj\")}"
                }
            }
            if related_events.is_empty() {
                div { style: "color: var(--text-secondary); font-size: 0.85rem; padding: 0.5rem 0;",
                    "{language.label(\"No history found.\", \"履歴はありません。\", \"Neniu historio trovita.\")}"
                }
            } else {
                div { style: "display: grid; gap: 0.6rem;",
                    for (index, (event_hash, ev)) in related_events.iter().enumerate() {
                        PartCommitHistoryItem {
                            key: "{event_hash}",
                            context: context.clone(),
                            account_name_map: account_name_map.clone(),
                            part_name: part_name.clone(),
                            index,
                            event_hash: event_hash.clone(),
                            event: ev.clone(),
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn PartCommitHistoryItem(
    context: PageContext,
    account_name_map: std::collections::HashMap<definy_event::event::AccountId, Box<str>>,
    part_name: String,
    index: usize,
    event_hash: EventHashId,
    event: definy_event::event::Event,
) -> Element {
    let language = context.language;
    let time_str = event.time.format("%Y-%m-%d %H:%M:%S").to_string();
    let hash_str = event_hash.to_string();
    let short_event_hash = if hash_str.len() > 7 {
        format!("#{}", &hash_str[..7])
    } else {
        format!("#{}", hash_str)
    };
    let author_name = crate::app_state::account_display_name(&account_name_map, &event.account_id);
    let (commit_message, parent_hash, part_content_hash) =
        resolve_part_commit_info(language, &part_name, &event);
    let is_latest = index == 0;
    let ch_display = part_content_hash.as_ref().map(|h| {
        let s = h.to_string();
        if s.len() > 7 {
            format!("#{}", &s[..7])
        } else {
            format!("#{}", s)
        }
    });
    let ch_full_title = format!(
        "ContentHash: {}",
        part_content_hash
            .as_ref()
            .map(ToString::to_string)
            .unwrap_or_default(),
    );
    let parent_short = parent_hash.as_ref().map(|p| {
        let s = p.to_string();
        if s.len() > 7 {
            format!("#{}", &s[..7])
        } else {
            format!("#{}", s)
        }
    });
    let parent_title = parent_hash.as_ref().map(ToString::to_string);

    rsx! {
        div { style: "display: grid; gap: 0.45rem; padding: 0.65rem 0.85rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: rgb(255 255 255 / 0.02);",
            div { style: "display: flex; align-items: flex-start; justify-content: space-between; gap: 0.6rem; flex-wrap: wrap;",
                div { style: "display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;",
                    if is_latest {
                        span {
                            class: "badge",
                            style: "font-size: 0.68rem; font-weight: 600; color: #34d399; background: rgba(52, 211, 153, 0.15); border: 1px solid rgba(52, 211, 153, 0.3); padding: 0.05rem 0.4rem; border-radius: var(--radius-full);",
                            "HEAD"
                        }
                    }
                    span { style: "font-size: 0.88rem; font-weight: 600; color: var(--text);",
                        "{commit_message}"
                    }
                }
                div { style: "display: flex; align-items: center; gap: 0.5rem; font-size: 0.76rem; color: var(--text-secondary);",
                    span { "👤 {author_name}" }
                    span { "•" }
                    span { "{time_str}" }
                }
            }
            div { style: "display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-size: 0.75rem;",
                a {
                    href: context.href_with_lang(Location::Event(event_hash.clone())),
                    class: "mono",
                    style: "color: var(--primary); text-decoration: none; display: inline-flex; align-items: center; gap: 0.2rem; background: rgb(124 192 216 / 0.08); padding: 0.1rem 0.4rem; border-radius: var(--radius-xs); border: 1px solid var(--border);",
                    title: "{event_hash}",
                    span { "Commit:" }
                    span { "{short_event_hash}" }
                }
                if let Some(ch_str) = ch_display {
                    div {
                        class: "mono",
                        style: "color: #38bdf8; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); padding: 0.1rem 0.45rem; border-radius: var(--radius-xs); display: inline-flex; align-items: center; gap: 0.25rem;",
                        title: "{ch_full_title}",
                        span { "📌 Part Hash:" }
                        span { "{ch_str}" }
                    }
                }
                if let (Some(p_hash), Some(p_short)) = (parent_hash, parent_short) {
                    a {
                        href: context.href_with_lang(Location::Event(p_hash)),
                        class: "mono",
                        style: "color: var(--text-secondary); text-decoration: none; display: inline-flex; align-items: center; gap: 0.2rem; background: rgb(255 255 255 / 0.04); padding: 0.1rem 0.4rem; border-radius: var(--radius-xs); border: 1px solid var(--border);",
                        title: parent_title.as_deref().unwrap_or_default(),
                        span { "Parent:" }
                        span { "{p_short}" }
                    }
                } else {
                    span { style: "color: #a78bfa; font-size: 0.72rem; background: rgba(167, 139, 250, 0.1); border: 1px solid rgba(167, 139, 250, 0.25); padding: 0.1rem 0.4rem; border-radius: var(--radius-xs);",
                        "🌱 Initial Commit"
                    }
                }
            }
        }
    }
}
