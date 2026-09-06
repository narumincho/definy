use std::str::FromStr;

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::Location;
use crate::app_state::AppState;
use crate::expression_editor::{EditorTarget, render_root_expression_editor};
use crate::expression_eval::expression_to_source;
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
    let hash_as_base64 = definition_event_hash.to_string();
    let (initial_name, initial_description, initial_expression, initial_module_hash) =
        effective_part_update_form(&state, &definition_event_hash);
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
    let current_module_value = initial_module_hash
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
    let language = context.language;
    let def_hash_clone = definition_event_hash.clone();

    rsx! {
        div {
            class: "event-detail-card",
            style: "display: grid; gap: 1rem; padding: 1.2rem 1.3rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
            div { style: "display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;",
                h2 { style: "font-size: 1.4rem; font-weight: 600; margin: 0;", "{initial_name}" }
                div { style: "font-size: 0.82rem; color: var(--text-secondary);", "{updated_at_label}" }
            }
            div { style: "display: grid; gap: 0.35rem;",
                div { style: "font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);",
                    "{context.language.label(\"Part Name\", \"パーツ名\", \"Parto-nomo\")}"
                }
                input {
                    r#type: "text",
                    name: "part-update-name",
                    value: "{initial_name}",
                    style: "padding: 0.5rem 0.7rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font-size: 0.95rem;",
                    oninput: {
                        let def_hash = definition_event_hash.clone();
                        move |evt: FormEvent| {
                            let mut state_sig = use_context::<Signal<AppState>>();
                            let mut next = state_sig.write();
                            next.part_update_form.part_definition_event_hash = Some(def_hash.clone());
                            next.part_update_form.part_name_input = evt.value();
                        }
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
                    on_change: {
                        let def_hash = definition_event_hash.clone();
                        move |val: String| {
                            let mut state_sig = use_context::<Signal<AppState>>();
                            let mut next = state_sig.write();
                            next.part_update_form.part_definition_event_hash = Some(def_hash.clone());
                            next.part_update_form.module_definition_event_hash = EventHashId::from_str(
                                    &val,
                                )
                                .ok();
                        }
                    },
                }
            }
            div { style: "display: grid; gap: 0.35rem;",
                div { style: "font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);",
                    "{context.language.label(\"Description\", \"説明文\", \"Priskribo\")}"
                }
                textarea {
                    name: "part-update-description",
                    value: "{initial_description}",
                    placeholder: "{context.language.label(\"Enter part description...\", \"パーツの説明を入力...\", \"Enigu partan priskribon...\")}",
                    style: "min-height: 4.5rem; padding: 0.5rem 0.7rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font-family: inherit; font-size: 0.92rem; resize: vertical;",
                    oninput: {
                        let def_hash = definition_event_hash.clone();
                        move |evt: FormEvent| {
                            let mut state_sig = use_context::<Signal<AppState>>();
                            let mut next = state_sig.write();
                            next.part_update_form.part_definition_event_hash = Some(def_hash.clone());
                            next.part_update_form.part_description_input = evt.value();
                        }
                    },
                }
            }
            div { style: "display: grid; gap: 0.5rem;",
                div { style: "font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);",
                    "{context.language.label(\"Expression\", \"式 (プログラム)\", \"Esprimo\")}"
                }
                {
                    render_root_expression_editor(
                        &state,
                        &context,
                        &initial_expression,
                        EditorTarget::PartUpdate,
                    )
                }
                {
                    let expr_str = initial_expression
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
                    disabled: !is_logged_in,
                    style: if is_logged_in { "padding: 0.5rem 1.2rem; background: var(--primary); color: #0e1720; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;" } else { "padding: 0.5rem 1.2rem; background: var(--surface); color: var(--text-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); font-weight: 600; cursor: not-allowed; opacity: 0.6;" },
                    onclick: move |_| {
                        let mut state_sig = use_context::<Signal<AppState>>();
                        let state_val = state_sig.read().clone();
                        let key = if let Some(key) = &state_val.current_key {
                            key.clone()
                        } else {
                            state_sig.write().event_detail_eval_result = Some(
                                language
                                    .label(
                                        "Error: login required",
                                        "エラー: ログインが必要です",
                                        "Eraro: ensaluto necesas",
                                    )
                                    .to_string(),
                            );
                            return;
                        };
                        let (
                            current_part_name,
                            current_part_description,
                            current_expression,
                            current_module_hash,
                        ) = effective_part_update_form(&state_val, &def_hash_clone);
                        let part_name = current_part_name.trim().to_string();
                        if part_name.is_empty() {
                            state_sig.write().event_detail_eval_result = Some(
                                language
                                    .label(
                                        "Error: part name is required",
                                        "エラー: パーツ名は必須です",
                                        "Eraro: parto-nomo estas bezonata",
                                    )
                                    .to_string(),
                            );
                            return;
                        }
                        let part_description = current_part_description;
                        let expression = current_expression;
                        let Some(module_definition_event_hash) = current_module_hash else {
                            state_sig.write().event_detail_eval_result = Some(
                                language
                                    .label(
                                        "Error: module is required",
                                        "エラー: モジュールを選択してください",
                                        "Eraro: modulo estas bezonata",
                                    )
                                    .to_string(),
                            );
                            return;
                        };
                        let force_offline = state_val.force_offline;
                        let def_hash_for_cb = def_hash_clone.clone();
                        spawn(async move {
                            crate::event_submit::submit_event(
                                    definy_event::event::EventContent::PartUpdate(definy_event::event::PartUpdateEvent {
                                        part_name: part_name.into(),
                                        part_description: part_description.into(),
                                        part_definition_event_hash: def_hash_for_cb.clone(),
                                        expression,
                                        module_definition_event_hash,
                                    }),
                                    key,
                                    force_offline,
                                    None,
                                    state_sig,
                                    move |next, record| {
                                        if record.status == crate::local_event::LocalEventStatus::Sent {
                                            if let Some(snapshot) = find_part_snapshot(
                                                next,
                                                &def_hash_for_cb,
                                            ) {
                                                next.part_update_form.part_definition_event_hash = Some(
                                                    def_hash_for_cb.clone(),
                                                );
                                                let desc = snapshot.description_for(language);
                                                next.part_update_form.part_name_input = snapshot.part_name;
                                                next.part_update_form.part_description_input = desc;
                                                next.part_update_form.expression_input = snapshot
                                                    .expression;
                                                next.part_update_form.module_definition_event_hash = Some(
                                                    snapshot.module_definition_event_hash,
                                                );
                                            }
                                            next.event_detail_eval_result = Some(
                                                language
                                                    .label(
                                                        "Changes saved successfully",
                                                        "変更を保存しました",
                                                        "Ŝanĝoj konservitaj",
                                                    )
                                                    .to_string(),
                                            );
                                        } else {
                                            next.event_detail_eval_result = Some(
                                                match record.status {
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
                                                    crate::local_event::LocalEventStatus::Sent => unreachable!(),
                                                },
                                            );
                                        }
                                    },
                                )
                                .await;
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
            if let Some(result) = &state.event_detail_eval_result {
                div {
                    class: "mono",
                    style: "font-size: 0.85rem; word-break: break-word; background: rgb(124 192 216 / 0.08); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); margin-top: 0.3rem;",
                    "{result}"
                }
            }
        }
    }
}

fn effective_part_update_form(
    state: &AppState,
    definition_event_hash: &EventHashId,
) -> (
    String,
    String,
    Option<definy_event::event::Expression>,
    Option<EventHashId>,
) {
    if state.part_update_form.part_definition_event_hash == Some(definition_event_hash.clone()) {
        return (
            state.part_update_form.part_name_input.clone(),
            state.part_update_form.part_description_input.clone(),
            state.part_update_form.expression_input.clone(),
            state.part_update_form.module_definition_event_hash.clone(),
        );
    }
    if let Some(snapshot) = find_part_snapshot(state, definition_event_hash) {
        let desc = snapshot.description_for(crate::language::default_language());
        return (
            snapshot.part_name,
            desc,
            snapshot.expression,
            Some(snapshot.module_definition_event_hash),
        );
    }
    (
        state.part_update_form.part_name_input.clone(),
        state.part_update_form.part_description_input.clone(),
        state.part_update_form.expression_input.clone(),
        state.part_update_form.module_definition_event_hash.clone(),
    )
}
