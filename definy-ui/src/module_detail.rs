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
    let module_snapshot = find_module_snapshot(&state, &definition_event_hash);
    let page_shell_style = crate::layout::page_shell_style("1.2rem");

    if let Some(module_snapshot) = module_snapshot {
        let parts_in_module = collect_part_snapshots(&state)
            .into_iter()
            .filter(|snapshot| snapshot.module_definition_event_hash == definition_event_hash)
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

        let related_events =
            crate::module_projection::collect_related_module_events(&state, &definition_event_hash);

        rsx! {
            div { class: "page-shell", style: "{page_shell_style}",
                a {
                    class: "back-link",
                    href: context.href_with_lang(Location::ModuleList),
                    style: "display: inline-flex; align-items: center; gap: 0.4rem; color: var(--primary); font-size: 0.88rem; font-weight: 500; text-decoration: none;",
                    "{context.language.label(\"← Back to Modules\", \"← モジュール一覧へ戻る\", \"← Reen al moduloj\")}"
                }
                ModuleEditorCard {
                    state: state.clone(),
                    context: context.clone(),
                    definition_event_hash: definition_event_hash.clone(),
                    module_snapshot,
                    author_label,
                }
                div { style: "margin-top: 1rem; font-weight: 600;",
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
                            ModulePartItem {
                                key: "{part.definition_event_hash}",
                                account_name: crate::app_state::account_display_name(&account_name_map, &part.account_id),
                                part,
                                context: context.clone(),
                            }
                        }
                    }
                }
                ModuleHistoryCard {
                    state: state.clone(),
                    context: context.clone(),
                    related_events,
                }
            }
        }
    } else {
        let not_found_style = crate::layout::page_shell_style("1rem");
        let not_found_msg = context.language.label(
            "Module not found",
            "モジュールが見つかりません",
            "Modulo ne trovita",
        );
        rsx! {
            div { class: "page-shell", style: "{not_found_style}",
                h2 { style: "font-size: 1.3rem;", "{not_found_msg}" }
            }
        }
    }
}

#[component]
fn ModulePartItem(
    part: crate::part_projection::PartSnapshot,
    account_name: String,
    context: PageContext,
) -> Element {
    let def_hash = part.definition_event_hash.clone();
    let time_str = part.updated_at.format("%Y-%m-%d %H:%M:%S").to_string();
    let author_label = format!(
        "{} {account_name}",
        context
            .language
            .label("latest author:", "最新の投稿者:", "lasta aŭtoro:")
    );

    let (ch_str, short_ch) = if let Some(ch) = &part.content_hash {
        let s = ch.to_string();
        let short = if s.len() > 7 {
            format!("#{}", &s[..7])
        } else {
            format!("#{}", s)
        };
        (Some(s), Some(short))
    } else {
        (None, None)
    };

    rsx! {
        div {
            class: "event-card",
            style: "display: grid; gap: 0.5rem; padding: 0.85rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
            div { style: "font-size: 0.85rem; color: var(--text-secondary);", "{time_str}" }
            div { style: "display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;",
                a {
                    href: context.href_with_lang(Location::Part(def_hash)),
                    style: "font-size: 0.98rem; font-weight: 600; color: var(--text); text-decoration: none;",
                    "{part.part_name}"
                }
                if let (Some(full_ch), Some(short_ch)) = (ch_str, short_ch) {
                    span {
                        class: "mono",
                        style: "font-size: 0.72rem; color: #38bdf8; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); padding: 0.1rem 0.35rem; border-radius: var(--radius-xs); display: inline-flex; align-items: center; gap: 0.2rem;",
                        title: "ContentHash: {full_ch}",
                        span { "📌" }
                        span { "{short_ch}" }
                    }
                }
            }
            {
                let desc = part.description_for(context.language);
                if !desc.is_empty() {
                    rsx! {
                        div { style: "white-space: pre-wrap; font-size: 0.88rem; color: var(--text-secondary);",
                            "{desc}"
                        }
                    }
                } else {
                    rsx! {}
                }
            }
            div { style: "font-size: 0.85rem; color: var(--primary);", "{author_label}" }
        }
    }
}

#[component]
fn ModuleEditorCard(
    state: AppState,
    context: PageContext,
    definition_event_hash: EventHashId,
    module_snapshot: crate::module_projection::ModuleSnapshot,
    author_label: String,
) -> Element {
    let language = context.language;
    let mut module_name = use_signal(|| module_snapshot.module_name.clone());
    let mut module_description = use_signal(|| module_snapshot.description_for(language));
    let mut commit_message = use_signal(String::new);
    let mut result_message = use_signal(|| None::<String>);

    let placeholder_text = language.label(
        "module description (supports multiple lines)",
        "モジュール説明 (複数行対応)",
        "modula priskribo (subtenas plurajn liniojn)",
    );

    let updated_at_str = module_snapshot
        .updated_at
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();
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
                div {
                    h2 { style: "font-size: 1.4rem; font-weight: 600; margin: 0;",
                        "{module_name}"
                    }
                    div { style: "font-size: 0.85rem; color: var(--primary); margin-top: 0.2rem;",
                        "{author_label}"
                    }
                }
                div { style: "font-size: 0.82rem; color: var(--text-secondary);", "{updated_at_label}" }
            }
            div { style: "display: grid; gap: 0.35rem;",
                div { style: "font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);",
                    "{context.language.label(\"Module Name\", \"モジュール名\", \"Modula nomo\")}"
                }
                input {
                    r#type: "text",
                    name: "module-update-name",
                    value: "{module_name}",
                    placeholder: "my-module",
                    style: "padding: 0.5rem 0.7rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font-size: 0.95rem;",
                    oninput: move |evt: FormEvent| {
                        module_name.set(evt.value());
                    },
                }
            }
            div { style: "display: grid; gap: 0.35rem;",
                div { style: "font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);",
                    "{context.language.label(\"Description\", \"説明文\", \"Priskribo\")}"
                }
                textarea {
                    name: "module-update-description",
                    value: "{module_description}",
                    placeholder: "{placeholder_text}",
                    style: "min-height: 4.5rem; padding: 0.5rem 0.7rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font-family: inherit; font-size: 0.92rem; resize: vertical;",
                    oninput: move |evt: FormEvent| {
                        module_description.set(evt.value());
                    },
                }
            }
            div { style: "display: grid; gap: 0.35rem;",
                div { style: "font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);",
                    {
                        context
                            .language
                            .label("Commit Message", "コミットメッセージ", "Enmeta mesaĝo")
                    }
                }
                input {
                    r#type: "text",
                    name: "module-update-commit-message",
                    value: "{commit_message}",
                    placeholder: context
                        .language
                        .label(
                            "e.g. Update module description",
                            "例: モジュール説明の更新",
                            "ekz. Ĝisdatigi modulan priskribon",
                        ),
                    style: "padding: 0.5rem 0.7rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font-size: 0.95rem;",
                    oninput: move |evt: FormEvent| {
                        commit_message.set(evt.value());
                    },
                }
            }
            div { style: "display: flex; align-items: center; gap: 0.8rem; margin-top: 0.3rem; flex-wrap: wrap;",
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
                            result_message
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
                        let name = module_name().trim().to_string();
                        let desc = module_description();
                        if name.is_empty() {
                            result_message
                                .set(
                                    Some(
                                        language
                                            .label(
                                                "Error: module name is required",
                                                "エラー: モジュール名は必須です",
                                                "Eraro: modulo-nomo estas bezonata",
                                            )
                                            .to_string(),
                                    ),
                                );
                            return;
                        }
                        if !definy_event::naming::is_valid_name(&name) {
                            result_message
                                .set(
                                    Some(
                                        language
                                            .label(
                                                "Error: module name must be lowercase alphanumeric with hyphens (e.g. my-module)",
                                                "エラー: モジュール名はアルファベット小文字・ハイフン区切りで入力してください (例: my-module)",
                                                "Eraro: modulo-nomo devas esti minusklaj literoj disigitaj per streketoj (ekz. my-module)",
                                            )
                                            .to_string(),
                                    ),
                                );
                            return;
                        }
                        let force_offline = state_val.force_offline;
                        let def_hash = definition_event_hash.clone();
                        let existing_parts = crate::part_projection::collect_part_snapshots(&state_val);
                        let parts: Vec<definy_event::event::ModulePartEntry> = existing_parts
                            .into_iter()
                            .filter(|p| p.module_definition_event_hash == def_hash)
                            .map(|p| definy_event::event::ModulePartEntry {
                                name: p.part_name.into(),
                                part_type: p.part_type,
                                description: p.part_description,
                                expression: p.expression,
                            })
                            .collect();
                        let commit_msg_trimmed = commit_message().trim().to_string();
                        let final_commit_msg = if commit_msg_trimmed.is_empty() {
                            "Update module info".to_string()
                        } else {
                            commit_msg_trimmed
                        };
                        let latest_commit = Some(module_snapshot.latest_event_hash.clone());
                        spawn(async move {
                            let record_opt = crate::event_submit::submit_event(
                                    definy_event::event::EventContent::ModuleCommit(definy_event::event::ModuleCommitEvent {
                                        module_name: name.into(),
                                        module_description: desc.into(),
                                        parent_commit_hash: latest_commit,
                                        message: final_commit_msg.into(),
                                        parts,
                                    }),
                                    key,
                                    force_offline,
                                    None,
                                    state_sig,
                                )
                                .await;
                            if let Some(record) = record_opt {
                                result_message
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
            if let Some(result) = result_message() {
                div {
                    class: "mono",
                    style: "font-size: 0.85rem; word-break: break-word; background: rgb(124 192 216 / 0.08); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); margin-top: 0.3rem;",
                    "{result}"
                }
            }
        }
    }
}

fn resolve_module_commit_info(
    language: crate::language::Language,
    ev: &definy_event::event::Event,
) -> (String, Option<EventHashId>, usize) {
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
            (msg, mc.parent_commit_hash.clone(), mc.parts.len())
        }
        _ => (
            crate::event_presenter::event_kind_label(language, ev).to_string(),
            None,
            0,
        ),
    }
}

#[component]
fn ModuleHistoryCard(
    state: AppState,
    context: PageContext,
    related_events: Vec<(EventHashId, definy_event::event::Event)>,
) -> Element {
    let account_name_map = state.account_name_map();
    let language = context.language;

    rsx! {
        div {
            class: "event-detail-card",
            style: "display: grid; gap: 0.75rem; padding: 1.1rem 1.25rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); margin-top: 1rem;",
            div { style: "display: flex; align-items: center; justify-content: space-between;",
                div { style: "font-size: 0.95rem; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 0.4rem;",
                    span { "📜" }
                    span {
                        "{language.label(\"Commit History\", \"コミット履歴\", \"Enmeta historio\")}"
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
                        {
                            let time_str = ev.time.format("%Y-%m-%d %H:%M:%S").to_string();
                            let hash_str = event_hash.to_string();
                            let short_event_hash = if hash_str.len() > 7 {
                                format!("#{}", &hash_str[..7])
                            } else {
                                format!("#{}", hash_str)
                            };
                            let author_name = crate::app_state::account_display_name(
                                &account_name_map,
                                &ev.account_id,
                            );
                            let (commit_message, parent_hash, parts_count) =
                                resolve_module_commit_info(language, ev);
                            let is_latest = index == 0;
                            let parent_short = parent_hash
                                .as_ref()
                                .map(|p| {
                                    let s = p.to_string();
                                    if s.len() > 7 { format!("#{}", &s[..7]) } else { format!("#{}", s) }
                                });
                            let parent_title = parent_hash.as_ref().map(ToString::to_string);
                            rsx! {
                                div {
                                    key: "{event_hash}",
                                    style: "display: grid; gap: 0.45rem; padding: 0.65rem 0.85rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: rgb(255 255 255 / 0.02);",
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
                                        span {
                                            class: "mono",
                                            style: "color: var(--text-secondary); background: rgb(255 255 255 / 0.04); border: 1px solid var(--border); padding: 0.1rem 0.4rem; border-radius: var(--radius-xs);",
                                            "{parts_count} {language.label(\"parts\", \"パーツ\", \"partoj\")}"
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
                    }
                }
            }
        }
    }
}
