use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::app_state::AppState;
use crate::app_state::Location;
use crate::module_projection::find_module_snapshot;
use crate::page_context::PageContext;
use crate::part_projection::collect_part_snapshots;

#[component]
pub fn ModuleDetailView(
    state: AppState,
    context: PageContext,
    definition_event_hash: EventHashId,
) -> Element {
    let Some(module_snapshot) = find_module_snapshot(&state, &definition_event_hash) else {
        return rsx! {
            div {
                class: "page-shell",
                style: crate::layout::page_shell_style("1rem"),
                h2 {
                    style: "font-size: 1.3rem;",
                    "{context.language.label(\"Module not found\", \"モジュールが見つかりません\", \"Modulo ne trovita\")}"
                }
            }
        };
    };

    let parts_in_module = collect_part_snapshots(&state)
        .into_iter()
        .filter(|snapshot| {
            snapshot.module_definition_event_hash == Some(definition_event_hash.clone())
        })
        .collect::<Vec<_>>();

    let account_name_map = state.account_name_map();
    let author_name =
        crate::app_state::account_display_name(&account_name_map, &module_snapshot.account_id);
    let author_label = format!(
        "{} {author_name}",
        context
            .language
            .label("latest author:", "最新の投稿者:", "lasta aŭtoro:")
    );
    let (initial_name, initial_description) =
        effective_module_update_form(&state, &definition_event_hash, Some(&module_snapshot));
    let page_shell_style = crate::layout::page_shell_style("1.2rem");

    rsx! {
        div {
            class: "page-shell",
            style: "{page_shell_style}",
            a {
                class: "back-link",
                href: context.href_with_lang(Location::ModuleList),
                style: "display: inline-flex; align-items: center; gap: 0.4rem; color: var(--primary); font-size: 0.88rem; font-weight: 500; text-decoration: none;",
                {context.language.label("← Back to Modules", "← モジュール一覧へ戻る", "← Reen al moduloj")}
            }
            div {
                class: "event-detail-card",
                style: "display: grid; gap: 0.6rem; padding: 1.2rem 1.3rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
                h2 {
                    style: "font-size: 1.4rem; font-weight: 600; margin: 0;",
                    "{module_snapshot.module_name}"
                }
                if !module_snapshot.module_description.is_empty() {
                    div {
                        style: "white-space: pre-wrap; font-size: 0.92rem; color: var(--text-secondary);",
                        "{module_snapshot.module_description}"
                    }
                }
                div {
                    style: "font-size: 0.85rem; color: var(--primary);",
                    "{author_label}"
                }
                div {
                    style: "display: flex; gap: 0.45rem; font-size: 0.84rem;",
                    a {
                        href: context.href_with_lang(Location::Event(module_snapshot.definition_event_hash.clone())),
                        style: "color: var(--primary); text-decoration: none;",
                        "{context.language.label(\"Definition event\", \"定義イベント\", \"Difina evento\")}"
                    }
                    a {
                        href: context.href_with_lang(Location::Event(module_snapshot.latest_event_hash)),
                        style: "color: var(--primary); text-decoration: none;",
                        "{context.language.label(\"Latest event\", \"最新イベント\", \"Lasta evento\")}"
                    }
                }
            }
            if state.current_key.is_some() {
                ModuleUpdateForm {
                    state: state.clone(),
                    context: context.clone(),
                    definition_event_hash: definition_event_hash.clone(),
                    initial_name: initial_name,
                    initial_description: initial_description,
                }
            } else {
                div {
                    class: "event-detail-card",
                    style: "padding: 0.9rem; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
                    "{context.language.label(\"Login required to update modules.\", \"モジュール更新にはログインが必要です。\", \"Ensaluto necesas por ĝisdatigi modulojn.\")}"
                }
            }
            div {
                style: "margin-top: 1rem; font-weight: 600;",
                "{context.language.label(\"Parts in this module\", \"このモジュールのパーツ\", \"Partoj en ĉi tiu modulo\")}"
            }
            if parts_in_module.is_empty() {
                div {
                    class: "event-detail-card",
                    style: "padding: 0.9rem; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
                    "{context.language.label(\"No parts in this module yet.\", \"このモジュールにはまだパーツがありません。\", \"Ankoraŭ neniuj partoj en ĉi tiu modulo.\")}"
                }
            } else {
                div {
                    class: "event-list",
                    style: "display: grid; gap: 0.65rem;",
                    for part in parts_in_module {
                        {
                            let part_author = crate::app_state::account_display_name(&account_name_map, &part.account_id);
                            let author_label = format!("{} {part_author}", context.language.label("latest author:", "最新の投稿者:", "lasta aŭtoro:"));
                            let def_hash = part.definition_event_hash.clone();
                            let latest_hash = part.latest_event_hash.clone();
                            let time_str = part.updated_at.format("%Y-%m-%d %H:%M:%S").to_string();

                            rsx! {
                                div {
                                    key: "{def_hash}",
                                    class: "event-card",
                                    style: "display: grid; gap: 0.5rem; padding: 0.85rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
                                    div {
                                        style: "font-size: 0.85rem; color: var(--text-secondary);",
                                        "{time_str}"
                                    }
                                    div {
                                        style: "font-size: 0.98rem; font-weight: 600;",
                                        "{part.part_name}"
                                    }
                                    if !part.part_description.is_empty() {
                                        div {
                                            style: "white-space: pre-wrap; color: var(--text-secondary);",
                                            "{part.part_description}"
                                        }
                                    }
                                    div {
                                        style: "font-size: 0.85rem; color: var(--primary);",
                                        "{author_label}"
                                    }
                                    div {
                                        style: "display: flex; gap: 0.45rem; font-size: 0.82rem;",
                                        a {
                                            href: context.href_with_lang(Location::Part(def_hash.clone())),
                                            style: "color: var(--primary); text-decoration: none;",
                                            {context.language.label("Open part detail", "パーツ詳細を開く", "Malfermi partajn detalojn")}
                                        }
                                        a {
                                            href: context.href_with_lang(Location::Event(latest_hash)),
                                            style: "color: var(--text-secondary); text-decoration: none;",
                                            "{context.language.label(\"Latest event\", \"最新イベント\", \"Lasta evento\")}"
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
fn ModuleUpdateForm(
    state: AppState,
    context: PageContext,
    definition_event_hash: EventHashId,
    initial_name: String,
    initial_description: String,
) -> Element {
    let language = context.language;
    let def_hash_clone = definition_event_hash.clone();

    rsx! {
        div {
            class: "event-detail-card",
            style: "display: grid; gap: 0.45rem; padding: 0.85rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
            div {
                style: "font-weight: 600;",
                "{context.language.label(\"Update module\", \"モジュールを更新\", \"Ĝisdatigi modulon\")}"
            }
            input {
                r#type: "text",
                name: "module-update-name",
                value: "{initial_name}",
                style: "padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
                oninput: {
                    let def_hash = definition_event_hash.clone();
                    move |evt: FormEvent| {
                        let mut state_sig = use_context::<Signal<AppState>>();
                        let mut next = state_sig.write();
                        next.module_update_form.module_definition_event_hash = Some(def_hash.clone());
                        next.module_update_form.module_name_input = evt.value();
                    }
                }
            }
            textarea {
                name: "module-update-description",
                value: "{initial_description}",
                placeholder: "{context.language.label(\"module description (supports multiple lines)\", \"モジュール説明 (複数行対応)\", \"modula priskribo (subtenas plurajn liniojn)\")}",
                style: "min-height: 5rem; padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
                oninput: {
                    let def_hash = definition_event_hash.clone();
                    move |evt: FormEvent| {
                        let mut state_sig = use_context::<Signal<AppState>>();
                        let mut next = state_sig.write();
                        next.module_update_form.module_definition_event_hash = Some(def_hash.clone());
                        next.module_update_form.module_description_input = evt.value();
                    }
                }
            }
            button {
                r#type: "button",
                style: "padding: 0.4rem 0.9rem; background: var(--primary); color: #0e1720; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; justify-self: start;",
                onclick: move |_| {
                    let mut state_sig = use_context::<Signal<AppState>>();
                    let state_val = state_sig.read().clone();
                    let key = if let Some(key) = &state_val.current_key {
                        key.clone()
                    } else {
                        state_sig.write().module_update_form.result_message = Some(
                            language.label("Error: login required", "エラー: ログインが必要です", "Eraro: ensaluto necesas").to_string(),
                        );
                        return;
                    };
                    let (module_name, module_description) = effective_module_update_form(
                        &state_val,
                        &def_hash_clone,
                        None,
                    );
                    let module_name = module_name.trim().to_string();
                    if module_name.is_empty() {
                        state_sig.write().module_update_form.result_message = Some(
                            language.label("Error: module name is required", "エラー: モジュール名は必須です", "Eraro: modulo-nomo estas bezonata").to_string(),
                        );
                        return;
                    }
                    let force_offline = state_val.force_offline;
                    let def_hash_for_cb = def_hash_clone.clone();

                    spawn(async move {
                        crate::event_submit::submit_event(
                            definy_event::event::EventContent::ModuleUpdate(
                                definy_event::event::ModuleUpdateEvent {
                                    module_name: module_name.into(),
                                    module_description: module_description.into(),
                                    module_definition_event_hash: def_hash_for_cb.clone(),
                                },
                            ),
                            key,
                            force_offline,
                            None,
                            state_sig,
                            move |next, record| {
                                if record.status == crate::local_event::LocalEventStatus::Sent {
                                    if let Some(snapshot) = find_module_snapshot(next, &def_hash_for_cb) {
                                        next.module_update_form.module_definition_event_hash = Some(def_hash_for_cb);
                                        next.module_update_form.module_name_input = snapshot.module_name;
                                        next.module_update_form.module_description_input = snapshot.module_description;
                                    }
                                    next.module_update_form.result_message = Some(
                                        language.label("ModuleUpdate event posted", "ModuleUpdate を投稿しました", "ModuleUpdate sendita").to_string(),
                                    );
                                } else {
                                    next.module_update_form.result_message = Some(
                                        match record.status {
                                            crate::local_event::LocalEventStatus::Queued => language.label("ModuleUpdate queued (offline)", "ModuleUpdate をキューに追加しました (オフライン)", "ModuleUpdate envicigita (senkonekte)").to_string(),
                                            crate::local_event::LocalEventStatus::Failed => language.label("ModuleUpdate failed to send", "ModuleUpdate の送信に失敗しました", "ModuleUpdate sendado malsukcesis").to_string(),
                                            crate::local_event::LocalEventStatus::Sent => unreachable!(),
                                        }
                                    );
                                }
                            },
                        ).await;
                    });
                },
                "{context.language.label(\"Send ModuleUpdate\", \"ModuleUpdate を送信\", \"Sendi ModuleUpdate\")}"
            }
            if let Some(result) = &state.module_update_form.result_message {
                div {
                    class: "mono",
                    style: "font-size: 0.85rem; word-break: break-word; background: rgb(124 192 216 / 0.08); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm);",
                    "{result}"
                }
            }
        }
    }
}

fn effective_module_update_form(
    state: &AppState,
    definition_event_hash: &EventHashId,
    snapshot: Option<&crate::module_projection::ModuleSnapshot>,
) -> (String, String) {
    if let Some(hash) = &state.module_update_form.module_definition_event_hash
        && hash == definition_event_hash
    {
        return (
            state.module_update_form.module_name_input.clone(),
            state.module_update_form.module_description_input.clone(),
        );
    }
    if let Some(snapshot) = snapshot {
        return (
            snapshot.module_name.clone(),
            snapshot.module_description.clone(),
        );
    }
    if let Some(snapshot) = find_module_snapshot(state, definition_event_hash) {
        return (snapshot.module_name, snapshot.module_description);
    }
    (
        state.module_update_form.module_name_input.clone(),
        state.module_update_form.module_description_input.clone(),
    )
}
