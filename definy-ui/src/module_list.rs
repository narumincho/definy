use dioxus::prelude::*;

use crate::app_state::AppState;
use crate::module_projection::collect_module_snapshots;
use crate::page_context::PageContext;

#[component]
pub fn ModuleListView(state: AppState, context: PageContext) -> Element {
    let mut is_form_open = use_signal(|| false);
    let result_message = use_signal(|| None::<String>);
    let snapshots = collect_module_snapshots(&state);
    let account_name_map = state.account_name_map();
    let page_shell_style = crate::layout::page_shell_style("0.8rem");

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            div { style: "display: flex; justify-content: space-between; align-items: center;",
                h2 { style: "font-size: 1.25rem; font-weight: 600; margin: 0;",
                    "{context.language.label(\"Modules\", \"モジュール\", \"Moduloj\")}"
                }
                if !is_form_open() {
                    button {
                        r#type: "button",
                        style: "padding: 0.35rem 0.75rem; font-size: 0.85rem; background: var(--primary); color: #0e1720; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;",
                        onclick: move |_| {
                            let state_sig = use_context::<Signal<AppState>>();
                            if state_sig.read().current_key.is_none() {
                                #[cfg(target_arch = "wasm32")]
                                {
                                    let _ = web_sys::window()
                                        .and_then(|w| w.document())
                                        .and_then(|d| d.get_element_by_id("login-or-create-account-dialog"))
                                        .and_then(|el| {
                                            wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlDialogElement>(el)
                                                .ok()
                                        })
                                        .map(|dlg| dlg.show_modal());
                                }
                            } else {
                                is_form_open.set(true);
                            }
                        },
                        "{context.language.label(\"+ Create Module\", \"+ モジュールを作成\", \"+ Krei modulon\")}"
                    }
                }
            }
            if state.current_key.is_some() && is_form_open() {
                ModuleCreateForm {
                    state: state.clone(),
                    context: context.clone(),
                    is_form_open,
                    result_message,
                }
            }
            if let Some(message) = result_message() {
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
                            let time_str = module.updated_at.format("%Y-%m-%d %H:%M:%S").to_string();
                            rsx! {
                                div {
                                    key: "{def_hash}",
                                    class: "event-card",
                                    style: "display: grid; gap: 0.35rem; padding: 0.55rem 0.8rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);",
                                    // Row 1: モジュール名 作成者 最終更新日時
                                    div { style: "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.45rem; font-size: 0.84rem;",
                                        div { style: "display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; min-width: 0;",
                                            a {
                                                href: context.href_with_lang(crate::Location::Module(def_hash.clone())),
                                                style: "font-weight: 600; font-size: 0.95rem; color: var(--text); text-decoration: none;",
                                                "{module.module_name}"
                                            }
                                            a {
                                                href: context.href_with_lang(crate::Location::Account(module.account_id.clone())),
                                                style: "color: var(--text-secondary); font-size: 0.78rem; text-decoration: none; margin-left: 0.15rem;",
                                                "{account_name}"
                                            }
                                        }
                                        span { style: "color: var(--text-secondary); font-size: 0.74rem; opacity: 0.75; white-space: nowrap; margin-left: auto;",
                                            "{time_str}"
                                        }
                                    }
                                    // Row 2: 説明
                                    div { style: "display: grid; gap: 0.2rem;",
                                        if !module.has_definition {
                                            div { style: "font-size: 0.76rem; color: var(--error);",
                                                "{context.language.label(\"definition event missing\", \"定義イベントが見つかりません\", \"difina evento mankas\")}"
                                            }
                                        }
                                        {
                                            let desc = module.description_for(context.language);
                                            if !desc.is_empty() {
                                                rsx! {
                                                    div { style: "font-size: 0.78rem; color: var(--text-secondary); line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;",
                                                        "{desc}"
                                                    }
                                                }
                                            } else {
                                                rsx! {}
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

#[component]
fn ModuleCreateForm(
    state: AppState,
    context: PageContext,
    mut is_form_open: Signal<bool>,
    mut result_message: Signal<Option<String>>,
) -> Element {
    let language = context.language;
    let mut module_name = use_signal(String::new);
    let mut module_description = use_signal(String::new);

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
                        is_form_open.set(false);
                    },
                    "{context.language.label(\"Cancel\", \"閉じる\", \"Fermi\")}"
                }
            }
            input {
                name: "module-name",
                r#type: "text",
                value: "{module_name}",
                placeholder: "{context.language.label(\"module name\", \"モジュール名\", \"modula nomo\")}",
                style: "padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
                oninput: move |evt: FormEvent| {
                    module_name.set(evt.value());
                },
            }
            textarea {
                name: "module-description",
                value: "{module_description}",
                placeholder: "{context.language.label(\"description (optional)\", \"説明 (任意)\", \"priskribo (nedeviga)\")}",
                style: "min-height: 5rem; padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
                oninput: move |evt: FormEvent| {
                    module_description.set(evt.value());
                },
            }
            button {
                r#type: "button",
                style: "font-size: 0.84rem; font-weight: 600; background: var(--primary); color: #0e1720; border: none; padding: 0.4rem 0.9rem; border-radius: var(--radius-sm); cursor: pointer; justify-self: start;",
                onclick: move |_| {
                    let state_sig = use_context::<Signal<AppState>>();
                    let state_val = state_sig.read().clone();
                    let key = if let Some(key) = &state_val.current_key {
                        key.clone()
                    } else {
                        return;
                    };
                    let name_str = module_name().trim().to_string();
                    let desc_str = module_description();
                    if name_str.is_empty() {
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
                    let force_offline = state_val.force_offline;
                    spawn(async move {
                        let record_opt = crate::event_submit::submit_event(
                                definy_event::event::EventContent::ModuleDefinition(definy_event::event::ModuleDefinitionEvent {
                                    module_name: name_str.into(),
                                    description: desc_str.into(),
                                }),
                                key,
                                force_offline,
                                None,
                                state_sig,
                            )
                            .await;
                        if let Some(record) = record_opt {
                            if record.status == crate::local_event::LocalEventStatus::Sent {
                                result_message.set(None);
                                is_form_open.set(false);
                                module_name.set(String::new());
                                module_description.set(String::new());
                            } else {
                                result_message
                                    .set(
                                        Some(
                                            match record.status {
                                                crate::local_event::LocalEventStatus::Queued => {
                                                    is_form_open.set(false);
                                                    module_name.set(String::new());
                                                    module_description.set(String::new());
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
                                        ),
                                    );
                            }
                        }
                    });
                },
                "{context.language.label(\"Create\", \"作成\", \"Krei\")}"
            }
        }
    }
}
