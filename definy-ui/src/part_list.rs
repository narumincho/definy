use dioxus::prelude::*;

use crate::Location;
use crate::app_state::AppState;
#[cfg(target_arch = "wasm32")]
use crate::module_projection::collect_module_snapshots;
use crate::page_context::PageContext;
use crate::part_create_form::PartDefinitionFormView;
use crate::part_projection::collect_part_snapshots;

#[component]
pub fn PartListView(state: AppState, context: PageContext) -> Element {
    let snapshots = collect_part_snapshots(&state);
    let part_names = crate::part_projection::part_names(&snapshots);
    let account_name_map = state.account_name_map();
    let page_shell_style = crate::layout::page_shell_style("0.8rem");

    // フックなので use_effect の中ではなく, ここで取る
    #[cfg_attr(not(target_arch = "wasm32"), allow(unused_variables, unused_mut))]
    let mut state_sig = use_context::<Signal<AppState>>();
    use_effect(move || {
        #[cfg(target_arch = "wasm32")]
        spawn(async move {
            if collect_module_snapshots(&state_sig.read()).is_empty() {
                if let Ok(events) = crate::fetch::get_events(
                    Some(definy_event::event::EventType::ModuleCommit),
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

    // `?tab=new` (エクスプローラーの「新しいパーツ」) で開いたときは作成フォームを開いておく.
    // `?tab=new:<モジュールのハッシュ>` ならそのモジュールを選んでおく
    let new_part_request = context
        .tab
        .as_deref()
        .and_then(|tab| tab.strip_prefix("new"));
    let initial_module = new_part_request
        .and_then(|rest| rest.strip_prefix(':'))
        .and_then(|hash| std::str::FromStr::from_str(hash).ok());
    let mut is_form_open = use_signal(|| new_part_request.is_some());
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
            let type_str =
                crate::part_projection::optional_part_type_text(&part.part_type, &part_names)
                    .to_lowercase();
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
                        class: "btn-primary",
                        onclick: move |_| {
                            is_form_open.set(true);
                        },
                        "{context.language.label(\"+ Create Part\", \"+ パーツを作成\", \"+ Krei parton\")}"
                    }
                }
            }
            // 検索入力バー
            div { class: "search-field",
                crate::icon::SearchIcon { class: "search-field-icon" }
                input {
                    r#type: "search",
                    "aria-label": "{context.language.label(\"Search parts\", \"パーツを検索\", \"Serĉi partojn\")}",
                    placeholder: "{context.language.label(\"Search parts by name, module, type...\", \"パーツ名・モジュール名・型で検索...\", \"Serĉi partojn laŭ nomo, modulo, tipo...\")}",
                    value: "{search_query()}",
                    oninput: move |evt: FormEvent| {
                        search_query.set(evt.value());
                    },
                }
                if !search_query().is_empty() {
                    button {
                        r#type: "button",
                        class: "search-field-clear",
                        "aria-label": "{context.language.label(\"Clear search\", \"検索をクリア\", \"Vakigi serĉon\")}",
                        onclick: move |_| search_query.set(String::new()),
                        "✕"
                    }
                }
            }
            if state.current_key.is_none() && !is_form_open() {
                div { style: "padding: 0.5rem 0.6rem 0.5rem 0.9rem; font-size: 0.82rem; background: var(--blue-bg); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;",
                    span {
                        "{context.language.label(\"Log in or sign up to create and edit parts.\", \"パーツの作成や編集を行うにはログインまたはサインアップが必要です。\", \"Ensalutu aŭ registriĝu por krei kaj redakti partojn.\")}"
                    }
                    button {
                        r#type: "button",
                        class: "btn-primary btn-sm",
                        "commandfor": "login-or-create-account-dialog",
                        "command": "show-modal",
                        "{context.language.label(\"Log In\", \"ログイン\", \"Ensaluti\")}"
                    }
                }
            }
            if is_form_open() {
                PartDefinitionFormView {
                    state: state.clone(),
                    context: context.clone(),
                    is_form_open,
                    eval_result,
                    initial_module,
                }
            }
            if let Some(result) = eval_result() {
                div {
                    class: "event-detail-card",
                    style: "padding: 0.75rem 1rem; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; background: var(--blue-bg); border-color: var(--primary); word-break: break-word;",
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
                            let module_snapshot = crate::module_projection::find_module_snapshot(
                                &state,
                                &part.module_definition_event_hash,
                            );
                            let module_name = module_snapshot
                                .as_ref()
                                .map(|m| m.module_name.as_str())
                                .unwrap_or("module");
                            let type_str = crate::part_projection::optional_part_type_text(
                                &part.part_type,
                                &part_names,
                            );
                            let type_badge_cls = crate::event_list::part_type_badge_class(&type_str);
                            rsx! {
                                div {
                                    key: "{def_hash}",
                                    class: "event-card",
                                    style: "display: grid; gap: 0.45rem;",
                                    // Row 1: モジュール名.パーツ名 : 型 作成者 最終更新日時
                                    div { style: "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; font-size: 0.86rem;",
                                        div { style: "display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; min-width: 0;",
                                            // モジュール名.パーツ名
                                            span { style: "display: inline-flex; align-items: baseline; gap: 0.15rem;",
                                                a {
                                                    href: context.href_with_lang(Location::Module(part.module_definition_event_hash.clone())),
                                                    style: "color: var(--primary); font-weight: 500; text-decoration: none;",
                                                    "{module_name}"
                                                }
                                                span { style: "color: var(--text-muted); opacity: 0.6;", "." }
                                                a {
                                                    href: context.href_with_lang(Location::Part(def_hash.clone())),
                                                    style: "font-weight: 700; font-size: 1rem; color: var(--text-primary); text-decoration: none;",
                                                    "{part.part_name}"
                                                }
                                            }
                                            // : 型
                                            span {
                                                class: "{type_badge_cls}",
                                                "{type_str}"
                                            }
                                            // プレビューリンク
                                            if let Some(prev) = part
                                                .expression
                                                .as_ref()
                                                .and_then(definy_core::detect_preview_in_expression)
                                            {
                                                {
                                                    let sub_url = crate::preview_apps::build_preview_subdomain_url(&prev.code);
                                                    rsx! {
                                                        a {
                                                            href: "{sub_url}",
                                                            target: "_blank",
                                                            rel: "noopener noreferrer", // 最終更新日時
                                                            title: "Preview Web App",
                                                            style: "display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.72rem; padding: 0.12rem 0.4rem; border-radius: 999px; background: var(--blue-bg-strong); color: var(--primary); text-decoration: none; border: 1px solid var(--blue-border); font-weight: 500;",
                                                            "🌐 {prev.code} ↗"
                                                        }
                                                    }
                                                }
                                            }
                                            // デプロイバッジ
                                            if let Some(dep) = part
                                                .expression
                                                .as_ref()
                                                .and_then(definy_core::detect_deploy_in_expression)
                                            {
                                                {
                                                    rsx! {
                                                        span {
                                                            title: "Cloudflare Workers Deploy Part",
                                                            style: "display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.72rem; padding: 0.12rem 0.4rem; border-radius: 999px; background: var(--orange-bg-strong); color: var(--orange); border: 1px solid var(--orange-border); font-weight: 500;",
                                                            "⚡ {dep.cloudflare_worker_name}"
                                                        }
                                                    }
                                                }
                                            }
                                            // 作成者
                                            a {
                                                href: context.href_with_lang(Location::Account(part.account_id.clone())),
                                                style: "color: var(--text-muted); font-size: 0.78rem; text-decoration: none; margin-left: 0.25rem;",
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
                                        crate::tree_layout::ExpressionTreeSummary {
                                            expression: part.expression.clone(),
                                            initial_expanded: false,
                                            max_width: 640.0,
                                            part_names: part_names.clone(),
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
