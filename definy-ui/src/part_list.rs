use std::str::FromStr;

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::Location;
use crate::app_state::AppState;
use crate::expression_eval::{evaluate_expression, expression_to_source};
use crate::module_projection::collect_module_snapshots;
use crate::page_context::PageContext;
use crate::part_projection::collect_part_snapshots;
use crate::tree_layout::ExpressionTreeEditor;

pub(crate) fn part_type_text(part_type: &definy_event::event::PartType) -> String {
    match part_type {
        definy_event::event::PartType::Number => "number".to_string(),
        definy_event::event::PartType::String => "string".to_string(),
        definy_event::event::PartType::Boolean => "boolean".to_string(),
        definy_event::event::PartType::Type => "type".to_string(),
        definy_event::event::PartType::TypePart(hash) => format!("type-part({})", hash),
        definy_event::event::PartType::List(item_type) => {
            format!("list<{}>", part_type_text(item_type.as_ref()))
        }
        definy_event::event::PartType::Function {
            parameter,
            return_type,
        } => {
            format!(
                "{} -> {}",
                part_type_text(parameter.as_ref()),
                part_type_text(return_type.as_ref())
            )
        }
        definy_event::event::PartType::Union(variants) => {
            let var_texts = variants
                .iter()
                .map(|v| match &v.payload {
                    Some(p) => format!("{}({})", v.tag, part_type_text(p.as_ref())),
                    None => v.tag.to_string(),
                })
                .collect::<Vec<String>>()
                .join(" | ");
            format!("union<{}>", var_texts)
        }
    }
}

fn optional_part_type_text(part_type: &Option<definy_event::event::PartType>) -> String {
    part_type
        .as_ref()
        .map(part_type_text)
        .unwrap_or_else(|| "none".to_string())
}

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
            let type_str = optional_part_type_text(&part.part_type).to_lowercase();
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
                                                "{optional_part_type_text(&part.part_type)}"
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

#[component]
fn PartDefinitionFormView(
    state: AppState,
    context: PageContext,
    mut is_form_open: Signal<bool>,
    mut eval_result: Signal<Option<String>>,
) -> Element {
    let language = context.language;
    let mut part_name = use_signal(String::new);
    let mut part_description = use_signal(String::new);
    let part_type = use_signal(|| None::<definy_event::event::PartType>);
    let module_hash = use_signal(|| None::<EventHashId>);
    let mut composing_expression = use_signal(|| None::<definy_event::event::Expression>);
    use_context_provider(|| composing_expression);

    let on_evaluate = move |_| {
        let state_sig = use_context::<Signal<AppState>>();
        let events_vec: Vec<_> = state_sig.read().events_with_hash();
        let result = if let Some(expr) = &*composing_expression.read() {
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

    let on_create = move |_| {
        let state_sig = use_context::<Signal<AppState>>();
        let state_val = state_sig.read().clone();
        let key = if let Some(key) = &state_val.current_key {
            key.clone()
        } else {
            eval_result.set(Some(
                language
                    .label(
                        "Error: log in to create parts",
                        "エラー: パーツを作成するにはログインしてください",
                        "Eraro: ensalutu por krei partojn",
                    )
                    .to_string(),
            ));
            return;
        };
        let name_str = part_name().trim().to_string();
        let desc_str = part_description();
        let type_val = part_type();
        let modules = collect_module_snapshots(&state_val);
        let mod_hash_opt =
            module_hash().or_else(|| modules.first().map(|m| m.definition_event_hash.clone()));
        let (final_module_hash, auto_create_module_binary) = if let Some(hash) = mod_hash_opt {
            (hash, None)
        } else {
            let module_event = definy_event::event::Event {
                account_id: definy_event::event::AccountId(key.verifying_key()),
                time: chrono::Utc::now(),
                content: definy_event::event::EventContent::ModuleDefinition(
                    definy_event::event::ModuleDefinitionEvent {
                        module_name: "main".into(),
                        description: definy_event::event::Description::localized(vec![
                            ("en", "Default main module"),
                            ("ja", "デフォルトのメインモジュール"),
                        ]),
                    },
                ),
            };
            match definy_event::sign_and_serialize(module_event, &key) {
                Ok(binary) => {
                    let hash = EventHashId::from_bytes(&binary);
                    (hash, Some(binary))
                }
                Err(err) => {
                    eval_result.set(Some(format!("Failed to create module: {err:?}")));
                    return;
                }
            }
        };
        if name_str.is_empty() {
            eval_result.set(Some(
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
        if !definy_event::naming::is_valid_name(&name_str) {
            eval_result.set(Some(
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
        let expr_val = composing_expression();
        let force_offline = state_val.force_offline;
        spawn(async move {
            if let Some(module_binary) = auto_create_module_binary {
                let _res = crate::fetch::post_event_with_queue(&module_binary, force_offline).await;
            }
            let record_opt = crate::event_submit::submit_event(
                definy_event::event::EventContent::PartDefinition(
                    definy_event::event::PartDefinitionEvent {
                        part_name: name_str.into(),
                        description: desc_str.into(),
                        part_type: type_val,
                        expression: expr_val,
                        module_definition_event_hash: final_module_hash,
                    },
                ),
                key,
                force_offline,
                None,
                state_sig,
            )
            .await;
            if let Some(record) = record_opt {
                if record.status == crate::local_event::LocalEventStatus::Sent {
                    eval_result.set(None);
                    is_form_open.set(false);
                    part_name.set(String::new());
                    part_description.set(String::new());
                    composing_expression.set(None);
                } else {
                    eval_result.set(Some(match record.status {
                        crate::local_event::LocalEventStatus::Queued => {
                            is_form_open.set(false);
                            part_name.set(String::new());
                            part_description.set(String::new());
                            composing_expression.set(None);
                            language
                                .label(
                                    "PartDefinition queued (offline)",
                                    "PartDefinition をキューに追加しました (オフライン)",
                                    "PartDefinition envicigita (senkonekte)",
                                )
                                .to_string()
                        }
                        crate::local_event::LocalEventStatus::Failed => language
                            .label(
                                "PartDefinition failed to send",
                                "PartDefinition の送信に失敗しました",
                                "PartDefinition sendado malsukcesis",
                            )
                            .to_string(),
                        crate::local_event::LocalEventStatus::Sent => unreachable!(),
                    }));
                }
            }
        });
    };

    rsx! {
        div {
            class: "composer",
            style: "display: grid; gap: 0.5rem; background: var(--surface); backdrop-filter: var(--glass-blur); padding: 0.8rem 1rem; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); border: 1px solid var(--border);",
            div { style: "display: flex; justify-content: space-between; align-items: center;",
                div { style: "font-size: 0.95rem; font-weight: 600;",
                    "{context.language.label(\"New Part\", \"新規パーツ作成\", \"Nova Parto\")}"
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
            PartNameInput { part_name }
            ModuleSelectionInput {
                state: state.clone(),
                context: context.clone(),
                module_hash,
            }
            PartTypeInput {
                state: state.clone(),
                context: context.clone(),
                part_type,
            }
            PartDescriptionInput { part_description }
            div { style: "color: var(--text-secondary); font-size: 0.82rem;",
                {context.language.label("Expression", "式", "Esprimo")}
            }
            ExpressionTreeEditor { expression: composing_expression }
            if let Some(result) = eval_result() {
                div { style: "padding: 0.45rem 0.75rem; font-size: 0.82rem; color: var(--error); background: rgb(255 0 0 / 0.08); border: 1px solid var(--error); border-radius: var(--radius-sm); word-break: break-word;",
                    "{result}"
                }
            }
            div { style: "display: flex; gap: 0.45rem;",
                if composing_expression.read().is_some() {
                    button {
                        r#type: "button",
                        style: "padding: 0.35rem 0.75rem; background: rgb(255 255 255 / 0.06); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer;",
                        onclick: on_evaluate,
                        "{context.language.label(\"Evaluate\", \"評価\", \"Taksi\")}"
                    }
                }
                button {
                    r#type: "button",
                    style: "padding: 0.35rem 0.85rem; background: var(--primary); color: #0e1720; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;",
                    onclick: on_create,
                    "{context.language.label(\"Create\", \"作成\", \"Krei\")}"
                }
            }
        }
    }
}

#[component]
fn PartNameInput(mut part_name: Signal<String>) -> Element {
    rsx! {
        input {
            name: "part-name",
            r#type: "text",
            value: "{part_name}",
            placeholder: "part name (e.g. my-part)",
            style: "padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
            oninput: move |evt: FormEvent| {
                part_name.set(evt.value());
            },
        }
    }
}

#[component]
fn PartDescriptionInput(mut part_description: Signal<String>) -> Element {
    rsx! {
        textarea {
            name: "part-description",
            value: "{part_description}",
            placeholder: "description (supports multiple lines)",
            style: "min-height: 6rem; padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
            oninput: move |evt: FormEvent| {
                part_description.set(evt.value());
            },
        }
    }
}

#[component]
fn PartTypeInput(
    state: AppState,
    context: PageContext,
    part_type: Signal<Option<definy_event::event::PartType>>,
) -> Element {
    let current = part_type();
    rsx! {
        div { style: "display: grid; gap: 0.35rem;",
            div { style: "font-size: 0.85rem; color: var(--text-secondary);",
                "{context.language.label(\"Part Type\", \"パーツ型\", \"Parto-tipo\")}"
            }
            RenderPartTypeEditor {
                state: state.clone(),
                context: context.clone(),
                current_part_type: current,
                root_part_type: part_type,
                depth: 0,
            }
        }
    }
}

#[component]
fn ModuleSelectionInput(
    state: AppState,
    context: PageContext,
    mut module_hash: Signal<Option<EventHashId>>,
) -> Element {
    let modules = collect_module_snapshots(&state);
    let options: Vec<(String, String)> = modules
        .iter()
        .map(|module| {
            (
                module.definition_event_hash.to_string(),
                module.module_name.clone(),
            )
        })
        .collect();

    let current_value = module_hash()
        .map(|hash| hash.to_string())
        .unwrap_or_else(|| {
            modules
                .first()
                .map(|m| m.definition_event_hash.to_string())
                .unwrap_or_default()
        });

    rsx! {
        div { style: "display: grid; gap: 0.35rem;",
            div { style: "font-size: 0.85rem; color: var(--text-secondary);",
                "{context.language.label(\"Module\", \"モジュール\", \"Modulo\")}"
            }
            if modules.is_empty() {
                div { style: "font-size: 0.8rem; color: var(--text-secondary); padding: 0.3rem 0;",
                    "{context.language.label(\"No module found. A 'main' module will be created automatically.\", \"モジュールがありません。自動で 'main' モジュールが作成されます。\", \"Neniu modulo trovita. 'main' modulo estos kreita aŭtomate.\")}"
                }
            } else {
                crate::dropdown::SearchableDropdown {
                    name: "part-definition-module".to_string(),
                    current_value,
                    options,
                    on_change: move |val: String| {
                        module_hash.set(EventHashId::from_str(&val).ok());
                    },
                }
            }
        }
    }
}

#[component]
fn RenderPartTypeEditor(
    state: AppState,
    context: PageContext,
    current_part_type: Option<definy_event::event::PartType>,
    mut root_part_type: Signal<Option<definy_event::event::PartType>>,
    depth: usize,
) -> Element {
    let name = format!("part-definition-type-{}", depth);
    let selected = current_part_type_selection(&state, &current_part_type);

    let mut options = Vec::new();
    if depth == 0 {
        options.push((
            "none".to_string(),
            format!("{}\t\t", context.language.label("None", "なし", "Neniu")),
        ));
    }

    options.extend([
        (
            "number".to_string(),
            format!(
                "{}\tType\t",
                context.language.label("Number", "数値", "Nombro")
            ),
        ),
        (
            "string".to_string(),
            format!(
                "{}\tType\t",
                context.language.label("String", "文字列", "Ĉeno")
            ),
        ),
        (
            "boolean".to_string(),
            format!(
                "{}\tType\t",
                context.language.label("Boolean", "真偽値", "Bulea")
            ),
        ),
        (
            "list".to_string(),
            format!(
                "{}\tType\t",
                context.language.label("List", "リスト", "Listo")
            ),
        ),
        (
            "type".to_string(),
            format!("{}\tType\t", context.language.label("Type", "型", "Tipo")),
        ),
    ]);

    options.extend(
        collect_part_snapshots(&state)
            .into_iter()
            .filter(|snapshot| snapshot.part_type == Some(definy_event::event::PartType::Type))
            .filter(|snapshot| {
                !matches!(
                    snapshot.part_name.as_str(),
                    "Number" | "String" | "Boolean" | "List" | "Type"
                )
            })
            .map(|snapshot| {
                let value = format!("type_part:{}", snapshot.definition_event_hash);
                (
                    value,
                    format!(
                        "{}\tType\t{}",
                        snapshot.part_name, snapshot.definition_event_hash
                    ),
                )
            }),
    );

    let item_type_opt =
        if let Some(definy_event::event::PartType::List(item_type)) = &current_part_type {
            Some(item_type.as_ref().clone())
        } else {
            None
        };

    rsx! {
        div { style: "display: grid; gap: 0.45rem;",
            crate::dropdown::SearchableDropdown {
                name,
                current_value: selected,
                options,
                on_change: {
                    let state = state.clone();
                    move |val: String| {
                        let mut new_part_type = root_part_type();
                        update_part_type_at_depth(&state, &mut new_part_type, depth, val.as_str());
                        root_part_type.set(new_part_type);
                    }
                },
            }
            if let Some(item_type) = item_type_opt {
                div { style: "padding-left: 1rem; border-left: 2px solid var(--border);",
                    div { style: "font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.25rem;",
                        "{context.language.label(\"Item Type\", \"要素型\", \"Ero-tipo\")}"
                    }
                    RenderPartTypeEditor {
                        state: state.clone(),
                        context: context.clone(),
                        current_part_type: Some(item_type),
                        root_part_type,
                        depth: depth + 1,
                    }
                }
            }
        }
    }
}

fn update_part_type_at_depth(
    state: &AppState,
    part_type: &mut Option<definy_event::event::PartType>,
    depth: usize,
    selected: &str,
) {
    if depth == 0 {
        *part_type = next_part_type_from_selected(state, selected, part_type);
        return;
    }

    match part_type {
        Some(definy_event::event::PartType::List(item_type)) => {
            update_part_type_nested(state, item_type.as_mut(), depth - 1, selected);
        }
        _ => {
            *part_type = Some(definy_event::event::PartType::List(Box::new(
                definy_event::event::PartType::Number,
            )));
            if let Some(definy_event::event::PartType::List(item_type)) = part_type {
                update_part_type_nested(state, item_type.as_mut(), depth - 1, selected);
            }
        }
    }
}

fn update_part_type_nested(
    state: &AppState,
    part_type: &mut definy_event::event::PartType,
    depth: usize,
    selected: &str,
) {
    if depth == 0 {
        *part_type = next_nested_part_type_from_selected(state, selected, part_type);
        return;
    }

    match part_type {
        definy_event::event::PartType::List(item_type) => {
            update_part_type_nested(state, item_type.as_mut(), depth - 1, selected);
        }
        _ => {
            *part_type = definy_event::event::PartType::List(Box::new(
                definy_event::event::PartType::Number,
            ));
            if let definy_event::event::PartType::List(item_type) = part_type {
                update_part_type_nested(state, item_type.as_mut(), depth - 1, selected);
            }
        }
    }
}

fn next_part_type_from_selected(
    state: &AppState,
    selected: &str,
    current: &Option<definy_event::event::PartType>,
) -> Option<definy_event::event::PartType> {
    if selected == "none" {
        return None;
    }
    if let Some(encoded) = selected.strip_prefix("type_part:")
        && let Ok(hash) = EventHashId::from_str(encoded)
    {
        if let Some(snapshot) = crate::part_projection::find_part_snapshot(state, &hash) {
            return match snapshot.part_name.as_str() {
                "Number" => Some(definy_event::event::PartType::Number),
                "String" => Some(definy_event::event::PartType::String),
                "Boolean" => Some(definy_event::event::PartType::Boolean),
                "Type" => Some(definy_event::event::PartType::Type),
                "List" => match current {
                    Some(definy_event::event::PartType::List(item_type)) => Some(
                        definy_event::event::PartType::List(Box::new(item_type.as_ref().clone())),
                    ),
                    _ => Some(definy_event::event::PartType::List(Box::new(
                        definy_event::event::PartType::Number,
                    ))),
                },
                _ => Some(definy_event::event::PartType::TypePart(hash)),
            };
        }
        return Some(definy_event::event::PartType::TypePart(hash));
    }
    match selected {
        "string" => Some(definy_event::event::PartType::String),
        "boolean" => Some(definy_event::event::PartType::Boolean),
        "type" => Some(definy_event::event::PartType::Type),
        "list" => match current {
            Some(definy_event::event::PartType::List(item_type)) => Some(
                definy_event::event::PartType::List(Box::new(item_type.as_ref().clone())),
            ),
            _ => Some(definy_event::event::PartType::List(Box::new(
                definy_event::event::PartType::Number,
            ))),
        },
        _ => Some(definy_event::event::PartType::Number),
    }
}

fn next_nested_part_type_from_selected(
    state: &AppState,
    selected: &str,
    current: &definy_event::event::PartType,
) -> definy_event::event::PartType {
    if let Some(encoded) = selected.strip_prefix("type_part:")
        && let Ok(hash) = EventHashId::from_str(encoded)
    {
        if let Some(snapshot) = crate::part_projection::find_part_snapshot(state, &hash) {
            return match snapshot.part_name.as_str() {
                "Number" => definy_event::event::PartType::Number,
                "String" => definy_event::event::PartType::String,
                "Boolean" => definy_event::event::PartType::Boolean,
                "Type" => definy_event::event::PartType::Type,
                "List" => match current {
                    definy_event::event::PartType::List(item_type) => {
                        definy_event::event::PartType::List(Box::new(item_type.as_ref().clone()))
                    }
                    _ => definy_event::event::PartType::List(Box::new(
                        definy_event::event::PartType::Number,
                    )),
                },
                _ => definy_event::event::PartType::TypePart(hash),
            };
        }
        return definy_event::event::PartType::TypePart(hash);
    }
    match selected {
        "string" => definy_event::event::PartType::String,
        "boolean" => definy_event::event::PartType::Boolean,
        "type" => definy_event::event::PartType::Type,
        "list" => match current {
            definy_event::event::PartType::List(item_type) => {
                definy_event::event::PartType::List(Box::new(item_type.as_ref().clone()))
            }
            _ => {
                definy_event::event::PartType::List(Box::new(definy_event::event::PartType::Number))
            }
        },
        _ => definy_event::event::PartType::Number,
    }
}

fn current_part_type_selection(
    state: &AppState,
    part_type: &Option<definy_event::event::PartType>,
) -> String {
    let find_type_part = |name: &str| {
        collect_part_snapshots(state)
            .into_iter()
            .find(|s| {
                s.part_name == name && s.part_type == Some(definy_event::event::PartType::Type)
            })
            .map(|s| format!("type_part:{}", s.definition_event_hash))
    };

    match part_type {
        None => "none".to_string(),
        Some(definy_event::event::PartType::Number) => {
            find_type_part("Number").unwrap_or_else(|| "number".to_string())
        }
        Some(definy_event::event::PartType::String) => {
            find_type_part("String").unwrap_or_else(|| "string".to_string())
        }
        Some(definy_event::event::PartType::Boolean) => {
            find_type_part("Boolean").unwrap_or_else(|| "boolean".to_string())
        }
        Some(definy_event::event::PartType::Type) => {
            find_type_part("Type").unwrap_or_else(|| "type".to_string())
        }
        Some(definy_event::event::PartType::TypePart(hash)) => {
            format!("type_part:{}", hash)
        }
        Some(definy_event::event::PartType::List(_)) => {
            find_type_part("List").unwrap_or_else(|| "list".to_string())
        }
        Some(definy_event::event::PartType::Function { .. }) => {
            find_type_part("Function").unwrap_or_else(|| "function".to_string())
        }
        Some(definy_event::event::PartType::Union(_)) => "union".to_string(),
    }
}
