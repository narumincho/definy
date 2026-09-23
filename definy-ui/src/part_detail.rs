use std::str::FromStr;

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::Location;
use crate::app_state::AppState;
use crate::expression_eval::{evaluate_expression, expression_to_source};
use crate::module_projection::collect_module_snapshots;
use crate::page_context::PageContext;
use crate::part_projection::{collect_related_part_events, find_part_snapshot};
use crate::tree_layout::ExpressionTreeViewer;

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
                div {
                    class: "event-detail-card",
                    style: "display: grid; gap: 0.45rem; padding: 0.85rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
                    div { style: "font-weight: 600;",
                        "{context.language.label(\"History\", \"履歴\", \"Historio\")}"
                    }
                    div { style: "display: grid; gap: 0.4rem;",
                        for (event_hash, ev) in related_events {
                            {
                                let label = crate::event_presenter::event_kind_label(context.language, &ev);
                                let time_str = ev.time.format("%Y-%m-%d %H:%M:%S").to_string();
                                rsx! {
                                    a {
                                        key: "{event_hash}",
                                        href: context.href_with_lang(Location::Event(event_hash)),
                                        style: "display: grid; gap: 0.2rem; padding: 0.44rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-md); text-decoration: none; color: var(--text); background: rgb(255 255 255 / 0.02);",
                                        div { "{label}" }
                                        div { style: "font-size: 0.82rem; color: var(--text-secondary);", "{time_str}" }
                                    }
                                }
                            }
                        }
                    }
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
    let expression = use_signal(|| snapshot.expression.clone());
    let mut module_hash = use_signal(|| Some(snapshot.module_definition_event_hash));
    let mut eval_result = use_signal(|| None::<String>);
    let mut submit_result = use_signal(|| None::<String>);
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

    rsx! {
        div {
            class: "event-detail-card",
            style: "display: grid; gap: 1rem; padding: 1.2rem 1.3rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
            div { style: "display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;",
                h2 { style: "font-size: 1.4rem; font-weight: 600; margin: 0;", "{part_name}" }
                div { style: "font-size: 0.82rem; color: var(--text-secondary);", "{updated_at_label}" }
            }
            div { style: "display: grid; gap: 0.35rem;",
                div { style: "font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);",
                    "{context.language.label(\"Part Name\", \"パーツ名\", \"Parto-nomo\")}"
                }
                input {
                    r#type: "text",
                    name: "part-update-name",
                    value: "{part_name}",
                    style: "padding: 0.5rem 0.7rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font-size: 0.95rem;",
                    oninput: move |evt: FormEvent| {
                        part_name.set(evt.value());
                    },
                }
            }
            div { style: "display: grid; gap: 0.35rem;",
                div { style: "font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);",
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
            div { style: "display: grid; gap: 0.35rem;",
                div { style: "font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);",
                    "{context.language.label(\"Description\", \"説明文\", \"Priskribo\")}"
                }
                textarea {
                    name: "part-update-description",
                    value: "{part_description}",
                    placeholder: "{context.language.label(\"Enter part description...\", \"パーツの説明を入力...\", \"Enigu partan priskribon...\")}",
                    style: "min-height: 4.5rem; padding: 0.5rem 0.7rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font-family: inherit; font-size: 0.92rem; resize: vertical;",
                    oninput: move |evt: FormEvent| {
                        part_description.set(evt.value());
                    },
                }
            }
            div { style: "display: grid; gap: 0.5rem;",
                div { style: "font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);",
                    "{context.language.label(\"Expression\", \"式\", \"Esprimo\")}"
                }
                ExpressionTreeViewer { expression: expression.read().clone() }
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
                            style: "font-size: 0.85rem; opacity: 0.85; background: rgb(0 0 0 / 0.2); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); overflow-x: auto;",
                            "{expr_str}"
                        }
                    }
                }
            }
            div { style: "display: flex; align-items: center; gap: 0.8rem; margin-top: 0.3rem; flex-wrap: wrap;",
                button {
                    r#type: "button",
                    style: "padding: 0.5rem 1.1rem; background: rgb(255 255 255 / 0.08); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); font-weight: 600; cursor: pointer; transition: background 0.15s ease;",
                    onclick: move |_| {
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
                    },
                    "{context.language.label(\"Evaluate\", \"評価\", \"Taksi\")}"
                }
                button {
                    r#type: "button",
                    disabled: !is_logged_in,
                    style: if is_logged_in { "padding: 0.5rem 1.2rem; background: var(--primary); color: #0e1720; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;" } else { "padding: 0.5rem 1.2rem; background: var(--surface); color: var(--text-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); font-weight: 600; cursor: not-allowed; opacity: 0.6;" },
                    onclick: move |_| {
                        let state_sig = use_context::<Signal<AppState>>();
                        let state_val = state_sig.read().clone();
                        let key = if let Some(key) = &state_val.current_key {
                            key.clone()
                        } else {
                            submit_result
                                .set(
                                    Some(
                                        language
                                            .label(
                                                "Error: login required",
                                                "エラー: ログインが必要です",
                                                "Eraro: ensaluto necesas",
                                            )
                                            .to_string(),
                                    ),
                                );
                            return;
                        };
                        let name = part_name().trim().to_string();
                        if name.is_empty() {
                            submit_result
                                .set(
                                    Some(
                                        language
                                            .label(
                                                "Error: part name is required",
                                                "エラー: パーツ名は必須です",
                                                "Eraro: parto-nomo estas bezonata",
                                            )
                                            .to_string(),
                                    ),
                                );
                            return;
                        }
                        let desc = part_description();
                        let expr_val = expression();
                        let Some(mod_hash) = module_hash() else {
                            submit_result
                                .set(
                                    Some(
                                        language
                                            .label(
                                                "Error: module is required",
                                                "エラー: モジュールを選択してください",
                                                "Eraro: modulo estas bezonata",
                                            )
                                            .to_string(),
                                    ),
                                );
                            return;
                        };
                        let force_offline = state_val.force_offline;
                        let def_hash = definition_event_hash.clone();
                        spawn(async move {
                            let record_opt = crate::event_submit::submit_event(
                                    definy_event::event::EventContent::PartUpdate(definy_event::event::PartUpdateEvent {
                                        part_name: name.into(),
                                        part_description: desc.into(),
                                        part_definition_event_hash: def_hash,
                                        expression: expr_val,
                                        module_definition_event_hash: mod_hash,
                                    }),
                                    key,
                                    force_offline,
                                    None,
                                    state_sig,
                                )
                                .await;
                            if let Some(record) = record_opt {
                                submit_result
                                    .set(
                                        Some(
                                            match record.status {
                                                crate::local_event::LocalEventStatus::Sent => {
                                                    language
                                                        .label(
                                                            "Changes saved successfully",
                                                            "変更を保存しました",
                                                            "Ŝanĝoj konservitaj",
                                                        )
                                                        .to_string()
                                                }
                                                crate::local_event::LocalEventStatus::Queued => {
                                                    language
                                                        .label(
                                                            "Changes queued (offline)",
                                                            "変更をキューに追加しました (オフライン)",
                                                            "Ŝanĝoj envicigitaj (senkonekte)",
                                                        )
                                                        .to_string()
                                                }
                                                crate::local_event::LocalEventStatus::Failed => {
                                                    language
                                                        .label(
                                                            "Failed to save changes",
                                                            "変更の保存に失敗しました",
                                                            "Konservado de ŝanĝoj malsukcesis",
                                                        )
                                                        .to_string()
                                                }
                                            },
                                        ),
                                    );
                            }
                        });
                    },
                    "{context.language.label(\"Save changes\", \"編集を保存\", \"Konservi ŝanĝojn\")}"
                }
                if !is_logged_in {
                    span { style: "font-size: 0.84rem; color: var(--text-secondary);",
                        "{context.language.label(\"Login required to save changes.\", \"編集を保存するにはログインが必要です。\", \"Ensaluto necesas por konservi ŝanĝojn.\")}"
                    }
                }
            }
            if let Some(eval) = eval_result() {
                div {
                    class: "mono",
                    style: "font-size: 0.88rem; word-break: break-word; background: rgb(124 192 216 / 0.1); border: 1px solid rgb(124 192 216 / 0.3); color: var(--text); padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); margin-top: 0.3rem;",
                    "{eval}"
                }
            }
            if let Some(result) = submit_result() {
                div {
                    class: "mono",
                    style: "font-size: 0.85rem; word-break: break-word; background: rgb(124 192 216 / 0.08); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); margin-top: 0.3rem;",
                    "{result}"
                }
            }
        }
    }
}
