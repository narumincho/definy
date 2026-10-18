use definy_event::EventHashId;
use dioxus::prelude::*;

use super::banners::DeployBanner;
use crate::Location;
use crate::app_state::AppState;
use crate::expression_editor::part_type_to_expression_type;
use crate::expression_eval::evaluate_expression;
use crate::page_context::PageContext;

#[component]
pub(crate) fn PartEditorCard(
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
    let mut expression = use_signal(|| snapshot.expression.clone());
    let mut module_hash = use_signal(|| Some(snapshot.module_definition_event_hash.clone()));
    // 説明は表示中の言語の分だけ編集するので, 他の言語の説明はこれから引き継ぐ
    let mut base_description = use_signal(|| snapshot.part_description.clone());
    let mut eval_result = use_signal(|| None::<String>);
    let mut show_wasm_inspector = use_signal(|| false);

    // 編集はその都度 作業中の変更 (localStorage) に記録する. コミット済みと同じ内容に戻したら記録から消す.
    // 作業中の変更の読み込みが終わってから, 記録してある変更があればそれで編集欄を置き換える
    let mut restored = use_signal(|| false);
    // フックなので use_effect の中ではなく, ここで取る
    let state_sig_for_record = try_use_context::<Signal<AppState>>();
    {
        let definition_event_hash = definition_event_hash.clone();
        use_effect(move || {
            if !crate::working_changes::WORKING_CHANGES_LOADED() {
                return;
            }
            if !*restored.peek() {
                restored.set(true);
                let pending = crate::working_changes::WORKING_CHANGES
                    .peek()
                    .find(&definition_event_hash)
                    .cloned();
                if let Some(change) = pending {
                    part_name.set(change.entry.name.to_string());
                    part_description.set(
                        change
                            .entry
                            .description
                            .to_display_string(language.to_code()),
                    );
                    part_type_expr.set(
                        change
                            .entry
                            .part_type
                            .as_ref()
                            .map(definy_event::event::PartType::to_expression),
                    );
                    expression.set(change.entry.expression.clone());
                    module_hash.set(Some(change.module_definition_event_hash.clone()));
                    base_description.set(change.entry.description.clone());
                }
            }
            let name = part_name();
            let description = base_description
                .peek()
                .with_text(language.to_code(), &part_description());
            let part_type = part_type_expr
                .read()
                .as_ref()
                .and_then(definy_event::event::PartType::from_expression);
            let expr = expression();
            let Some(module) = module_hash() else {
                return;
            };
            let Some(state_sig) = state_sig_for_record else {
                return;
            };
            let state = state_sig.peek();
            record_edit(
                &state,
                &definition_event_hash,
                &module,
                definy_event::event::ModulePartEntry {
                    name: name.trim().into(),
                    part_type,
                    description,
                    content_hash: expr
                        .as_ref()
                        .and_then(|e| definy_event::ContentHash::from_expression(e).ok()),
                    expression: expr,
                },
            );
        });
    }
    let has_change = crate::working_changes::WORKING_CHANGES
        .read()
        .contains(&definition_event_hash);
    let total_change_count = crate::working_changes::WORKING_CHANGES.read().len();

    let on_discard = {
        let definition_event_hash = definition_event_hash.clone();
        let snapshot = snapshot.clone();
        move |_| {
            crate::working_changes::update(|changes| changes.remove(&definition_event_hash));
            part_name.set(snapshot.part_name.clone());
            part_description.set(snapshot.description_for(language));
            part_type_expr.set(
                snapshot
                    .part_type
                    .as_ref()
                    .map(definy_event::event::PartType::to_expression),
            );
            expression.set(snapshot.expression.clone());
            module_hash.set(Some(snapshot.module_definition_event_hash.clone()));
            base_description.set(snapshot.part_description.clone());
        }
    };

    let updated_at_str = snapshot.updated_at.format("%Y-%m-%d %H:%M:%S").to_string();
    let updated_at_label = format!(
        "{} {updated_at_str}",
        context
            .language
            .label("Updated at:", "更新日時:", "Ĝisdatigita je:"),
    );

    let expected_type = part_type_expr
        .read()
        .as_ref()
        .and_then(definy_event::event::PartType::from_expression)
        .as_ref()
        .map(part_type_to_expression_type);

    let detected_deploy = expression
        .read()
        .as_ref()
        .and_then(definy_core::detect_deploy_in_expression);

    let mut is_deploying = use_signal(|| false);

    let on_deploy = {
        let language = context.language;
        let part_name_val = part_name.read().clone();
        let target_part_id = if !part_name_val.is_empty() {
            part_name_val
        } else {
            definition_event_hash.to_string()
        };
        let dep_opt = detected_deploy.clone();
        move |_| {
            let dep = dep_opt.clone();
            let part_id = target_part_id.clone();
            spawn(async move {
                is_deploying.set(true);
                eval_result.set(Some(
                    language
                        .label(
                            "🚀 Deploying to Cloudflare Workers via backend server...",
                            "🚀 サーバー経由で Cloudflare Workers へデプロイ中...",
                            "🚀 Deplojante sur Cloudflare Workers per servilo...",
                        )
                        .to_string(),
                ));

                let req = definy_event::rpc::DeployCloudflareRequest {
                    api_token: dep
                        .as_ref()
                        .and_then(|d| d.cloudflare_token.clone())
                        .unwrap_or_default(),
                    account_id: None,
                    script_name: dep.as_ref().map(|d| d.cloudflare_worker_name.clone()),
                    wasm_hash: None,
                    custom_script: None,
                    compile_self_hosted: Some(false),
                    part_id: Some(part_id),
                    skip_health_check: None,
                };

                match crate::fetch::deploy_cloudflare(&req).await {
                    Ok(res) => {
                        let health_info = if let Some(ref msg) = res.health_check_message {
                            format!(
                                "\n⚡ {} {msg}",
                                language.label(
                                    "Edge Health Check:",
                                    "エッジ稼働確認:",
                                    "Randa Sancirkonstanco:",
                                )
                            )
                        } else {
                            String::new()
                        };
                        eval_result.set(Some(format!(
                            "{} {} ({}){health_info}",
                            language.label(
                                "✅ Successfully deployed to Cloudflare Workers:",
                                "✅ Cloudflare Workers へのデプロイに成功しました:",
                                "✅ Sukcese deplojita al Cloudflare Workers:",
                            ),
                            res.url,
                            res.script_name,
                        )));
                    }
                    Err(err) => {
                        eval_result.set(Some(format!(
                            "{} {}",
                            language.label(
                                "❌ Deployment failed:",
                                "❌ デプロイに失敗しました:",
                                "❌ Deploja fiasko:",
                            ),
                            err,
                        )));
                    }
                }
                is_deploying.set(false);
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
                                    span { class: "hash-chip", title: "ContentHash: {hash_str}", "{short_h}" }
                                }
                            }
                        }
                        span { style: "font-size: 0.76rem; color: var(--text-muted);",
                            "{updated_at_label}"
                        }
                    }
                    div { style: "display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;",
                        if let Some(ref _dep) = detected_deploy {
                            {
                                rsx! {
                                    button {
                                        r#type: "button",
                                        class: "btn-primary",
                                        disabled: is_deploying(),
                                        style: "display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.85rem; font-size: 0.82rem; font-weight: 600; box-shadow: 0 0 10px var(--orange-border); background: var(--orange); border-color: var(--orange);",
                                        onclick: on_deploy.clone(),
                                        span {
                                            if is_deploying() {
                                                "{context.language.label(\"🚀 Deploying...\", \"🚀 デプロイ中...\", \"🚀 Deplojante...\")}"
                                            } else {
                                                "{context.language.label(\"🚀 Deploy to Cloudflare\", \"🚀 Cloudflare にデプロイ\", \"🚀 Deploji sur Cloudflare\")}"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        button {
                            r#type: "button",
                            class: "btn-secondary",
                            "aria-pressed": if show_wasm_inspector() { "true" } else { "false" },
                            onclick: move |_| show_wasm_inspector.toggle(),
                            crate::icon::SearchIcon {}
                            span {
                                "{context.language.label(\"Wasm Inspector\", \"Wasm インスペクタ\", \"Wasm-inspektilo\")}"
                            }
                        }
                        button {
                            r#type: "button",
                            class: "btn-secondary",
                            onclick: {
                                let state = state.clone();
                                let on_deploy_trigger = on_deploy.clone();
                                let has_deploy = detected_deploy.is_some();
                                move |evt| {
                                    if has_deploy {
                                        on_deploy_trigger(evt);
                                    } else {
                                        evaluate_and_set_result(
                                            &expression.read(),
                                            &state,
                                            language,
                                            eval_result,
                                        );
                                    }
                                }
                            },
                            crate::icon::PlayIcon {}
                            span { "{context.language.label(\"Evaluate\", \"評価\", \"Taksi\")}" }
                        }
                    }
                }
            }

            // デプロイバナーカード (definy:deploy 検出時)
            if let Some(ref dep) = detected_deploy {
                DeployBanner {
                    context: context.clone(),
                    deploy: dep.clone(),
                    is_deploying: is_deploying(),
                    on_deploy: on_deploy.clone(),
                }
            }

            // 2. パーツ定義 (名前・モジュール・説明・型・式) の木構造
            div {
                class: "event-detail-card",
                style: "display: grid; gap: 0.6rem; padding: 0.9rem 1rem;",
                super::definition_tree::PartDefinitionTree {
                    state: state.clone(),
                    context: context.clone(),
                    part_name,
                    part_description,
                    part_type_expr,
                    expression,
                    module_hash,
                    expected_type,
                }
                SelfHostedTypeCheckVerdict {
                    context: context.clone(),
                    expression,
                    part_type_expr,
                }
                {
                    eval_result()
                        .map(|eval| {
                            let is_error = eval.starts_with("Error")
                                || eval.starts_with("エラー");
                            let tone = if is_error { "error" } else { "info" };
                            rsx! {
                                div {
                                    class: "mono eval-result tone-message",
                                    "data-eval-result": "true",
                                    "data-tone": tone,
                                    "{eval}"
                                }
                            }
                        })
                }
                // 作業中の変更: 編集は自動で記録され, 変更ページでまとめてコミットする
                div {
                    class: "def-save-row",
                    "data-working-change": if has_change { "true" } else { "false" },
                    if has_change {
                        span { class: "def-change-status",
                            span { class: "change-badge", "M" }
                            "{context.language.label(\"Uncommitted changes (saved locally)\", \"未コミットの変更 (ローカルに記録済み)\", \"Neenmetitaj ŝanĝoj (konservitaj loke)\")}"
                        }
                        button {
                            r#type: "button",
                            class: "btn-secondary",
                            onclick: on_discard,
                            "{context.language.label(\"Discard changes\", \"変更を破棄\", \"Forĵeti ŝanĝojn\")}"
                        }
                    } else {
                        span { class: "def-change-status muted",
                            "{context.language.label(\"Edits are saved locally. Commit several parts together from Changes.\", \"編集はローカルに記録されます。変更ページで複数のパーツをまとめてコミットできます。\", \"Redaktoj estas konservitaj loke. Enmetu plurajn partojn kune el Ŝanĝoj.\")}"
                        }
                    }
                    if total_change_count > 0 {
                        a {
                            class: if has_change { "btn-primary" } else { "btn-secondary" },
                            href: context.href_with_lang(Location::Changes),
                            "{context.language.label(\"Commit changes\", \"変更をコミット\", \"Enmeti ŝanĝojn\")} ({total_change_count})"
                        }
                    }
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
                                    div { style: "padding: 0.8rem; background: var(--red-bg); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--red-text); font-size: 0.85rem;",
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

/// パーツの編集を作業中の変更に記録する. コミット済みのパーツと同じ内容なら記録から消す
fn record_edit(
    state: &AppState,
    part_id: &EventHashId,
    module_definition_event_hash: &EventHashId,
    entry: definy_event::event::ModulePartEntry,
) {
    let Some(module) =
        crate::module_projection::find_module_snapshot(state, module_definition_event_hash)
    else {
        return;
    };
    let committed = crate::working_changes::committed_part(state, &module, part_id);
    if committed
        .as_ref()
        .is_some_and(|committed| crate::working_changes::same_part_definition(committed, &entry))
    {
        if crate::working_changes::WORKING_CHANGES
            .peek()
            .contains(part_id)
        {
            crate::working_changes::update(|changes| changes.remove(part_id));
        }
        return;
    }
    let existing = crate::working_changes::WORKING_CHANGES
        .peek()
        .find(part_id)
        .cloned();
    if existing.as_ref().is_some_and(|existing| {
        existing.entry == entry
            && &existing.module_definition_event_hash == module_definition_event_hash
    }) {
        return;
    }
    let change = crate::working_changes::PartChange {
        module_definition_event_hash: module_definition_event_hash.clone(),
        part_id: part_id.clone(),
        is_new: committed.is_none(),
        // 最初に変更を記録したときのコミットを基準にする (あとで別のコミットが入ったことを知らせるため)
        base_commit_hash: existing
            .and_then(|existing| existing.base_commit_hash)
            .or(Some(module.latest_event_hash)),
        entry,
        updated_at_ms: chrono::Utc::now().timestamp_millis(),
    };
    crate::working_changes::update(|changes| changes.upsert(change));
}

pub(crate) fn evaluate_and_set_result(
    expression: &Option<definy_event::event::Expression>,
    state_fallback: &AppState,
    language: crate::language::Language,
    mut eval_result: Signal<Option<String>>,
) {
    let events_vec = try_use_context::<Signal<AppState>>()
        .map(|sig| sig.read().events_with_hash())
        .unwrap_or_else(|| state_fallback.events_with_hash());
    let result = if let Some(expr) = expression {
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
}

#[cfg(test)]
mod tests {
    use super::*;
    use definy_event::event::{AddExpression, Expression, NumberExpression};

    #[test]
    fn test_unauthenticated_expression_evaluation() {
        let evaluated = std::sync::Arc::new(std::sync::Mutex::new(None));
        let evaluated_clone = evaluated.clone();

        let mut dom = VirtualDom::new_with_props(
            move |eval_store: std::sync::Arc<std::sync::Mutex<Option<String>>>| {
                let eval_result = use_signal(|| None::<String>);
                let state = AppState {
                    current_key: None,
                    ..AppState::default()
                };
                let expr = Some(Expression::Add(AddExpression {
                    left: Box::new(Expression::Number(NumberExpression { value: 18 })),
                    right: Box::new(Expression::Number(NumberExpression { value: 24 })),
                }));

                if eval_result().is_none() {
                    evaluate_and_set_result(
                        &expr,
                        &state,
                        crate::language::Language::Japanese,
                        eval_result,
                    );
                }

                let val = eval_result();
                *eval_store.lock().unwrap() = val;

                rsx! {
                    div {}

                }
            },
            evaluated_clone,
        );

        dom.rebuild_in_place();
        let result = evaluated.lock().unwrap().clone();
        assert_eq!(result, Some("結果: 42".to_string()));
    }
}

/// 編集中の式を definy 製の型チェッカー (`core.type-check-against`) で検査した結果.
/// 検査は重いので, 編集が止まってから実行する
#[component]
fn SelfHostedTypeCheckVerdict(
    context: PageContext,
    expression: Signal<Option<definy_event::event::Expression>>,
    part_type_expr: Signal<Option<definy_event::event::Expression>>,
) -> Element {
    let language = context.language;
    // None: 検査中 (または検査前)
    let mut verdict = use_signal(|| None::<(bool, String)>);
    let mut check_task = use_signal(|| None::<dioxus::core::Task>);
    // フックなので use_effect の中ではなく, ここで取る
    let state_sig = use_context::<Signal<AppState>>();
    use_effect(move || {
        let expression = expression();
        let part_type = part_type_expr()
            .as_ref()
            .and_then(definy_event::event::PartType::from_expression);
        if let Some(task) = check_task.take() {
            task.cancel();
        }
        verdict.set(None);
        let (Some(expression), Some(part_type)) = (expression, part_type) else {
            return;
        };
        check_task.set(Some(spawn(async move {
            crate::self_hosted_type_check::sleep_ms(500).await;
            let state = state_sig.peek().clone();
            let Some(outcome) =
                crate::self_hosted_type_check::check_expression(&state, &expression, &part_type)
            else {
                return;
            };
            let snapshots = crate::part_projection::collect_part_snapshots(&state);
            verdict.set(Some((
                crate::self_hosted_type_check::is_error(&outcome),
                crate::self_hosted_type_check::outcome_message(&outcome, &snapshots, language),
            )));
        })));
    });

    let label = language.label(
        "Type check (definy):",
        "型チェック (definy 製):",
        "Tipkontrolo (definy):",
    );
    match verdict() {
        None => rsx! {},
        Some((is_error, message)) => rsx! {
            div {
                class: "mono eval-result tone-message",
                "data-self-hosted-type-check": "true",
                "data-tone": if is_error { "error" } else { "info" },
                "{label} {message}"
            }
        },
    }
}
