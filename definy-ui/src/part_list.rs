use definy_event::event::PartType;
use dioxus::prelude::*;

use crate::Location;
use crate::app_state::AppState;
use crate::expression_eval::expression_to_source;
#[cfg(target_arch = "wasm32")]
use crate::module_projection::collect_module_snapshots;
use crate::page_context::PageContext;
use crate::part_create_form::PartDefinitionFormView;
use crate::part_projection::collect_part_snapshots;

#[component]
pub fn PartListView(state: AppState, context: PageContext) -> Element {
    let snapshots = collect_part_snapshots(&state);
    let account_name_map = state.account_name_map();
    let page_shell_style = crate::layout::page_shell_style("0.8rem");

    use_effect(move || {
        #[cfg(target_arch = "wasm32")]
        spawn(async move {
            let mut state_sig = use_context::<Signal<AppState>>();
            if collect_module_snapshots(&state_sig.read()).is_empty() {
                if let Ok(events) = crate::fetch::get_events(
                    Some(definy_event::event::EventType::ModuleDefinition),
                    Some(100),
                    Some(0),
                )
                .await
                {
                    let mut next = state_sig.read().clone();
                    for (hash, event) in events {
                        next.event_cache.insert(hash, event);
                    }
                    state_sig.set(next);
                }
            }
        });
    });

    let mut is_form_open = use_signal(|| false);
    let eval_result = use_signal(|| None::<String>);
    let mut search_query = use_signal(String::new);

    let query = search_query().trim().to_lowercase();
    let filtered_snapshots: Vec<_> = snapshots
        .into_iter()
        .filter(|part| {
            if query.is_empty() {
                return true;
            }
            let module_snapshot = crate::module_projection::find_module_snapshot(
                &state,
                &part.module_definition_event_hash,
            );
            let module_name = module_snapshot
                .as_ref()
                .map(|m| m.module_name.as_str())
                .unwrap_or("module");
            let part_name_lower = part.part_name.to_lowercase();
            let module_name_lower = module_name.to_lowercase();
            let full_name = format!("{}.{}", module_name_lower, part_name_lower);
            let type_str = PartType::optional_to_string(&part.part_type).to_lowercase();
            let author_str =
                crate::app_state::account_display_name(&account_name_map, &part.account_id)
                    .to_lowercase();

            part_name_lower.contains(&query)
                || module_name_lower.contains(&query)
                || full_name.contains(&query)
                || type_str.contains(&query)
                || author_str.contains(&query)
        })
        .collect();

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            div { style: "display: flex; justify-content: space-between; align-items: center; gap: 0.6rem; flex-wrap: wrap;",
                h2 { style: "font-size: 1.25rem; font-weight: 600; margin: 0;",
                    "{context.language.label(\"Parts\", \"パーツ\", \"Partoj\")}"
                }
                if !is_form_open() {
                    button {
                        r#type: "button",
                        style: "padding: 0.35rem 0.75rem; font-size: 0.85rem; background: var(--primary); color: #0e1720; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;",
                        onclick: move |_| {
                            let state_sig = use_context::<Signal<AppState>>();
                            if state_sig.read().current_key.is_none() {
                                crate::login_or_create_account_dialog::dialog_open();
                            } else {
                                is_form_open.set(true);
                            }
                        },
                        "{context.language.label(\"+ Create Part\", \"+ パーツを作成\", \"+ Krei parton\")}"
                    }
                }
            }
            // 検索入力バー
            div { style: "position: relative; width: 100%; display: flex; align-items: center;",
                span { style: "position: absolute; left: 0.7rem; color: var(--text-secondary); font-size: 0.82rem; pointer-events: none;",
                    "🔍"
                }
                input {
                    r#type: "text",
                    placeholder: "{context.language.label(\"Search parts by name, module, type...\", \"パーツ名・モジュール名・型で検索...\", \"Serĉi partojn laŭ nomo, modulo, tipo...\")}",
                    value: "{search_query()}",
                    oninput: move |evt: FormEvent| {
                        search_query.set(evt.value());
                    },
                    style: "width: 100%; padding: 0.4rem 2rem 0.4rem 2.1rem; font-size: 0.84rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text);",
                }
                if !search_query().is_empty() {
                    button {
                        r#type: "button",
                        style: "position: absolute; right: 0.5rem; background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 0.15rem 0.35rem; font-size: 0.75rem;",
                        onclick: move |_| search_query.set(String::new()),
                        "✕"
                    }
                }
            }
            if state.current_key.is_none() && !is_form_open() {
                div { style: "padding: 0.5rem 0.8rem; font-size: 0.82rem; background: rgb(124 192 216 / 0.08); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center;",
                    span {
                        "{context.language.label(\"Log in or sign up to create and edit parts.\", \"パーツの作成や編集を行うにはログインまたはサインアップが必要です。\", \"Ensalutu aŭ registriĝu por krei kaj redakti partojn.\")}"
                    }
                    button {
                        r#type: "button",
                        "commandfor": "login-or-create-account-dialog",
                        "command": "show-modal",
                        style: "padding: 0.25rem 0.6rem; font-size: 0.78rem; font-weight: 600; background: var(--primary); color: #0e1720; border: none; border-radius: var(--radius-sm); cursor: pointer;",
                        "{context.language.label(\"Log In\", \"ログイン\", \"Ensaluti\")}"
                    }
                }
            }
            if state.current_key.is_some() && is_form_open() {
                PartDefinitionFormView {
                    state: state.clone(),
                    context: context.clone(),
                    is_form_open,
                    eval_result,
                }
            }
            if let Some(result) = eval_result() {
                div {
                    class: "event-detail-card",
                    style: "padding: 0.75rem 1rem; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; background: rgb(124 192 216 / 0.1); border-color: var(--primary); word-break: break-word;",
                    "{result}"
                }
            }
            if filtered_snapshots.is_empty() {
                if !search_query().is_empty() {
                    div {
                        class: "event-detail-card",
                        style: "padding: 2.2rem 1.5rem; text-align: center; display: grid; gap: 0.4rem; justify-items: center; color: var(--text-secondary);",
                        div { style: "font-size: 1.4rem; opacity: 0.5;", "🔍" }
                        div { style: "font-size: 0.9rem; color: var(--text);",
                            "{context.language.label(\"No matching parts found\", \"一致するパーツが見つかりません\", \"Neniuj kongruaj partoj trovitaj\")}"
                        }
                        button {
                            r#type: "button",
                            style: "margin-top: 0.3rem; padding: 0.25rem 0.65rem; font-size: 0.78rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer;",
                            onclick: move |_| search_query.set(String::new()),
                            "{context.language.label(\"Clear search\", \"検索をクリア\", \"Vakigi serĉon\")}"
                        }
                    }
                } else {
                    div {
                        class: "event-detail-card",
                        style: "padding: 3rem 1.5rem; text-align: center; display: grid; gap: 0.5rem; justify-items: center; color: var(--text-secondary);",
                        div { style: "font-size: 1.5rem; opacity: 0.5;", "🧩" }
                        div { style: "font-size: 0.95rem; color: var(--text);",
                            "{context.language.label(\"No parts yet\", \"まだパーツがありません\", \"Ankoraŭ neniuj partoj\")}"
                        }
                    }
                }
            } else {
                div {
                    class: "event-list",
                    style: "display: grid; gap: 0.45rem;",
                    for part in filtered_snapshots {
                        {
                            let account_name = crate::app_state::account_display_name(
                                &account_name_map,
                                &part.account_id,
                            );
                            let def_hash = part.definition_event_hash.clone();
                            let time_str = part.updated_at.format("%Y-%m-%d %H:%M:%S").to_string();
                            let expr_str = part
                                .expression
                                .as_ref()
                                .map(expression_to_source)
                                .unwrap_or_else(|| {
                                    context.language.label("(none)", "(なし)", "(neniu)").to_string()
                                });
                            let module_snapshot = crate::module_projection::find_module_snapshot(
                                &state,
                                &part.module_definition_event_hash,
                            );
                            let module_name = module_snapshot
                                .as_ref()
                                .map(|m| m.module_name.as_str())
                                .unwrap_or("module");
                            rsx! {
                                div {
                                    key: "{def_hash}",
                                    class: "event-card",
                                    style: "display: grid; gap: 0.35rem; padding: 0.55rem 0.8rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);",
                                    // Row 1: モジュール名.パーツ名 : 型 作成者 最終更新日時
                                    div { style: "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.45rem; font-size: 0.84rem;",
                                        div { style: "display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; min-width: 0;",
                                            // モジュール名.パーツ名
                                            span { style: "display: inline-flex; align-items: baseline; gap: 0.12rem;",
                                                a {
                                                    href: context.href_with_lang(Location::Module(part.module_definition_event_hash.clone())),
                                                    style: "color: var(--text-secondary); font-weight: 500; text-decoration: none;",
                                                    "{module_name}"
                                                }
                                                span { style: "color: var(--text-secondary); opacity: 0.5;", "." }
                                                a {
                                                    href: context.href_with_lang(Location::Part(def_hash.clone())),
                                                    style: "font-weight: 600; font-size: 0.95rem; color: var(--text); text-decoration: none;",
                                                    "{part.part_name}"
                                                }
                                            }
                                            // : 型
                                            span { style: "color: var(--text-secondary); opacity: 0.6; margin-left: 0.1rem;",
                                                ":"
                                            }
                                            span {
                                                class: "mono",
                                                style: "font-size: 0.74rem; color: var(--primary); background: rgb(124 192 216 / 0.12); padding: 0.08rem 0.4rem; border-radius: var(--radius-xs); white-space: nowrap;",
                                                "{PartType::optional_to_string(&part.part_type)}"
                                            }
                                            // 作成者
                                            a {
                                                href: context.href_with_lang(Location::Account(part.account_id.clone())),
                                                style: "color: var(--text-secondary); font-size: 0.78rem; text-decoration: none; margin-left: 0.25rem;",
                                                "{account_name}"
                                            }
                                        }
                                        // 最終更新日時
                                        span { style: "color: var(--text-secondary); font-size: 0.74rem; opacity: 0.75; white-space: nowrap; margin-left: auto;",
                                            "{time_str}"
                                        }
                                    }
                                    // Row 2: 内容
                                    div { style: "display: grid; gap: 0.2rem;",
                                        if !part.has_definition {
                                            div { style: "font-size: 0.76rem; color: var(--error);",
                                                "{context.language.label(\"definition event missing\", \"定義イベントが見つかりません\", \"difina evento mankas\")}"
                                            }
                                        }
                                        if part.expression.is_some() {
                                            div {
                                                class: "mono",
                                                style: "font-size: 0.78rem; color: #a5f3fc; background: rgb(0 0 0 / 0.22); border: 1px solid var(--border); border-radius: var(--radius-xs); padding: 0.22rem 0.5rem; overflow-x: auto; white-space: nowrap; max-width: 100%;",
                                                "{expr_str}"
                                            }
                                        }
                                        {
                                            let desc = part.description_for(context.language);
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
