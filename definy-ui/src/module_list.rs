use dioxus::prelude::*;

use crate::app_state::AppState;
use crate::module_projection::collect_module_snapshots;
use crate::page_context::PageContext;

#[component]
pub fn ModuleListView(state: AppState, context: PageContext) -> Element {
    let snapshots = collect_module_snapshots(&state);
    let account_name_map = state.account_name_map();
    let page_shell_style = crate::layout::page_shell_style("0.8rem");

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            div { style: "display: flex; justify-content: space-between; align-items: center;",
                h2 { style: "font-size: 1.25rem; font-weight: 600; margin: 0;",
                    "{context.language.label(\"Modules\", \"モジュール\", \"Moduloj\")}"
                }
                if state.current_key.is_some() && !state.module_definition_form.is_form_open {
                    button {
                        r#type: "button",
                        style: "padding: 0.35rem 0.75rem; font-size: 0.85rem; background: var(--primary); color: #0e1720; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;",
                        onclick: move |_| {
                            let mut state_sig = use_context::<Signal<AppState>>();
                            state_sig.write().module_definition_form.is_form_open = true;
                        },
                        "{context.language.label(\"+ Create Module\", \"+ モジュールを作成\", \"+ Krei modulon\")}"
                    }
                }
            }
            if state.current_key.is_some() && state.module_definition_form.is_form_open {
                ModuleCreateForm { state: state.clone(), context: context.clone() }
            }
            if let Some(message) = &state.module_definition_form.result_message {
                div {
                    class: "event-detail-card",
                    style: "padding: 0.6rem 0.8rem; font-size: 0.82rem; color: var(--text); background: rgb(124 192 216 / 0.1); border-color: var(--primary); word-break: break-word;",
                    "{message}"
                }
            }
            if snapshots.is_empty() {
                div {
                    class: "event-detail-card",
                    style: "padding: 2rem 1.5rem; text-align: center; display: grid; gap: 0.5rem; justify-items: center; color: var(--text-secondary);",
                    div { style: "font-size: 1.5rem; opacity: 0.5;", "📦" }
                    div { style: "font-size: 0.95rem; color: var(--text);",
                        "{context.language.label(\"No modules yet\", \"まだモジュールがありません\", \"Ankoraŭ neniuj moduloj\")}"
                    }
                }
            } else {
                div {
                    class: "event-list",
                    style: "display: grid; gap: 0.45rem;",
                    for module in snapshots {
                        {
                            let account_name = crate::app_state::account_display_name(
                                &account_name_map,
                                &module.account_id,
                            );
                            let def_hash = module.definition_event_hash.clone();
                            let latest_hash = module.latest_event_hash.clone();
                            let time_str = module.updated_at.format("%Y-%m-%d %H:%M:%S").to_string();
                            rsx! {
                                div {
                                    key: "{def_hash}",
                                    class: "event-card",
                                    style: "display: grid; gap: 0.35rem; padding: 0.65rem 0.85rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
                                    div { style: "display: flex; justify-content: space-between; align-items: center;",
                                        div { style: "font-size: 1rem; font-weight: 600; color: var(--text);", "{module.module_name}" }
                                        div { style: "font-size: 0.76rem; color: var(--text-secondary);", "{time_str}" }
                                    }
                                    if !module.has_definition {
                                        div { style: "font-size: 0.82rem; color: var(--error);",
                                            "{context.language.label(\"definition event missing\", \"定義イベントが見つかりません\", \"difina evento mankas\")}"
                                        }
                                    }
                                    if !module.module_description.is_empty() {
                                        div { style: "white-space: pre-wrap; font-size: 0.9rem; color: var(--text-secondary);",
                                            "{module.module_description}"
                                        }
                                    }
                                    div { style: "font-size: 0.84rem; color: var(--text-secondary);",
                                        "{context.language.label(\"Author\", \"作成者\", \"Aŭtoro\")}: {account_name}"
                                    }
                                    div { style: "display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.2rem; font-size: 0.78rem;",
                                        a {
                                            href: context.href_with_lang(crate::Location::Module(def_hash.clone())),
                                            style: "font-weight: 500; color: var(--primary); background: rgb(124 192 216 / 0.1); padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); text-decoration: none;",
                                            "{context.language.label(\"Open module detail\", \"モジュール詳細を開く\", \"Malfermi modulajn detalojn\")}"
                                        }
                                        a {
                                            href: context.href_with_lang(crate::Location::Event(latest_hash)),
                                            style: "color: var(--text-secondary); text-decoration: none;",
                                            "{context.language.label(\"Latest event\", \"最新イベント\", \"Lasta evento\")}"
                                        }
                                        a {
                                            href: context.href_with_lang(crate::Location::Event(def_hash)),
                                            style: "color: var(--text-secondary); text-decoration: none;",
                                            "{context.language.label(\"Definition event\", \"定義イベント\", \"Difina evento\")}"
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
fn ModuleCreateForm(state: AppState, context: PageContext) -> Element {
    let language = context.language;

    rsx! {
        div {
            class: "event-detail-card",
            style: "display: grid; gap: 0.5rem; padding: 0.8rem 1rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
            div { style: "display: flex; justify-content: space-between; align-items: center;",
                div { style: "font-size: 0.95rem; font-weight: 600;",
                    "{context.language.label(\"Create module\", \"新規モジュール作成\", \"Krei modulon\")}"
                }
                button {
                    r#type: "button",
                    style: "padding: 0.2rem 0.5rem; font-size: 0.75rem; background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer;",
                    onclick: move |_| {
                        let mut state_sig = use_context::<Signal<AppState>>();
                        state_sig.write().module_definition_form.is_form_open = false;
                    },
                    "{context.language.label(\"Cancel\", \"閉じる\", \"Fermi\")}"
                }
            }
            input {
                name: "module-name",
                r#type: "text",
                value: "{state.module_definition_form.module_name_input}",
                placeholder: "{context.language.label(\"module name\", \"モジュール名\", \"modula nomo\")}",
                style: "padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
                oninput: move |evt: FormEvent| {
                    let mut state_sig = use_context::<Signal<AppState>>();
                    state_sig.write().module_definition_form.module_name_input = evt.value();
                },
            }
            textarea {
                name: "module-description",
                value: "{state.module_definition_form.module_description_input}",
                placeholder: "{context.language.label(\"description (optional)\", \"説明 (任意)\", \"priskribo (nedeviga)\")}",
                style: "min-height: 5rem; padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
                oninput: move |evt: FormEvent| {
                    let mut state_sig = use_context::<Signal<AppState>>();
                    state_sig.write().module_definition_form.module_description_input = evt.value();
                },
            }
            button {
                r#type: "button",
                style: "font-size: 0.84rem; font-weight: 600; background: var(--primary); color: #0e1720; border: none; padding: 0.4rem 0.9rem; border-radius: var(--radius-sm); cursor: pointer; justify-self: start;",
                onclick: move |_| {
                    let mut state_sig = use_context::<Signal<AppState>>();
                    let state_val = state_sig.read().clone();
                    let key = if let Some(key) = &state_val.current_key {
                        key.clone()
                    } else {
                        return;
                    };
                    let module_name = state_val
                        .module_definition_form
                        .module_name_input
                        .trim()
                        .to_string();
                    let module_description = state_val
                        .module_definition_form
                        .module_description_input
                        .clone();
                    if module_name.is_empty() {
                        state_sig.write().module_definition_form.result_message = Some(
                            language
                                .label(
                                    "Error: module name is required",
                                    "エラー: モジュール名は必須です",
                                    "Eraro: modulo-nomo estas bezonata",
                                )
                                .to_string(),
                        );
                        return;
                    }
                    let force_offline = state_val.force_offline;
                    spawn(async move {
                        crate::event_submit::submit_event(
                                definy_event::event::EventContent::ModuleDefinition(definy_event::event::ModuleDefinitionEvent {
                                    module_name: module_name.into(),
                                    description: module_description.into(),
                                }),
                                key,
                                force_offline,
                                None,
                                state_sig,
                                move |next, record| {
                                    if record.status == crate::local_event::LocalEventStatus::Sent {
                                        next.module_definition_form.result_message = None;
                                    } else {
                                        next.module_definition_form.result_message = Some(
                                            match record.status {
                                                crate::local_event::LocalEventStatus::Queued => {
                                                    language
                                                        .label(
                                                            "ModuleDefinition queued (offline)",
                                                            "ModuleDefinition をキューに追加しました (オフライン)",
                                                            "ModuleDefinition envicigita (senkonekte)",
                                                        )
                                                        .to_string()
                                                }
                                                crate::local_event::LocalEventStatus::Failed => {
                                                    language
                                                        .label(
                                                            "ModuleDefinition failed to send",
                                                            "ModuleDefinition の送信に失敗しました",
                                                            "ModuleDefinition sendado malsukcesis",
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
                    let mut write_state = state_sig.write();
                    write_state.module_definition_form.is_form_open = false;
                    write_state.module_definition_form.module_name_input = String::new();
                    write_state.module_definition_form.module_description_input = String::new();
                    write_state.module_definition_form.result_message = None;
                },
                "{context.language.label(\"Create\", \"作成\", \"Krei\")}"
            }
        }
    }
}
