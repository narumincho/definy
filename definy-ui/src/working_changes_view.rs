//! 変更ページ (`/changes`). 作業中の変更を一覧し, 選んだ変更をまとめてコミットする

use std::collections::{HashMap, HashSet};

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::Location;
use crate::app_state::AppState;
use crate::language::Language;
use crate::page_context::PageContext;
use crate::working_changes::{PartChange, WORKING_CHANGES, committed_part, is_outdated};

/// コミット済みのパーツと比べて, 変わった項目の名前
fn changed_fields(state: &AppState, change: &PartChange, language: Language) -> Vec<&'static str> {
    let committed =
        crate::module_projection::find_module_snapshot(state, &change.module_definition_event_hash)
            .and_then(|module| committed_part(state, &module, &change.part_id));
    let Some(committed) = committed else {
        return Vec::new();
    };
    let mut fields = Vec::new();
    if committed.name != change.entry.name {
        fields.push(language.label("name", "名前", "nomo"));
    }
    if crate::working_changes::normalize_part_type(&committed.part_type)
        != crate::working_changes::normalize_part_type(&change.entry.part_type)
    {
        fields.push(language.label("type", "型", "tipo"));
    }
    if committed.description != change.entry.description {
        fields.push(language.label("description", "説明", "priskribo"));
    }
    if committed.expression != change.entry.expression {
        fields.push(language.label("expression", "式", "esprimo"));
    }
    fields
}

#[component]
pub fn WorkingChangesView(state: AppState, context: PageContext) -> Element {
    let language = context.language;
    let page_shell_style = crate::layout::page_shell_style("1.2rem");
    let mut commit_message = use_signal(String::new);
    // git の add のように, コミットに含めない変更 (チェックを外した変更)
    let mut excluded = use_signal(HashSet::<EventHashId>::new);
    let mut result_message = use_signal(|| None::<(bool, String)>);
    let mut is_committing = use_signal(|| false);
    let precheck = use_precommit_check(language, excluded);

    let working_changes = WORKING_CHANGES.read().clone();
    let is_logged_in = state.current_key.is_some();
    let selected_count = working_changes
        .changes
        .iter()
        .filter(|change| !excluded.read().contains(&change.part_id))
        .count();
    let module_count = working_changes
        .modules()
        .into_iter()
        .filter(|module| {
            working_changes
                .changes_in_module(module)
                .any(|change| !excluded.read().contains(&change.part_id))
        })
        .count();

    let per_module_note = language.label(
        "Commits are per module, so this creates one commit for each module:",
        "コミットはモジュールごとなので、モジュールごとに 1 つずつコミットします:",
        "Unu enmeto por ĉiu modulo:",
    );

    let on_commit = move |_| {
        let Some(state_sig) = try_use_context::<Signal<AppState>>() else {
            return;
        };
        let Some(key) = state_sig.peek().current_key.clone() else {
            result_message.set(Some((
                true,
                language
                    .label(
                        "Error: login required",
                        "エラー: ログインが必要です",
                        "Eraro: ensaluto necesas",
                    )
                    .to_string(),
            )));
            return;
        };
        let changes = WORKING_CHANGES.peek().clone();
        let excluded_now = excluded.peek().clone();
        let selected = changes
            .changes
            .iter()
            .filter(|change| !excluded_now.contains(&change.part_id))
            .cloned()
            .collect::<Vec<_>>();
        if selected.is_empty() {
            return;
        }
        if let Some(invalid) = selected
            .iter()
            .find(|change| !definy_event::naming::is_valid_name(&change.entry.name))
        {
            result_message.set(Some((
                true,
                format!(
                    "{} '{}'",
                    language.label(
                        "Error: part name must be lowercase alphanumeric with hyphens (e.g. my-part):",
                        "エラー: パーツ名はアルファベット小文字・ハイフン区切りで入力してください (例: my-part):",
                        "Eraro: parto-nomo devas esti minusklaj literoj disigitaj per streketoj (ekz. my-part):",
                    ),
                    invalid.entry.name,
                ),
            )));
            return;
        }
        let modules = changes.modules();
        let message = commit_message.peek().clone();
        let force_offline = state_sig.peek().force_offline;
        is_committing.set(true);
        result_message.set(None);
        spawn(async move {
            let mut committed_modules = 0;
            let mut queued = false;
            let mut failure = None::<String>;
            for module in modules {
                let module_changes = selected
                    .iter()
                    .filter(|change| change.module_definition_event_hash == module)
                    .collect::<Vec<_>>();
                if module_changes.is_empty() {
                    continue;
                }
                // 前のモジュールのコミットで状態が変わるので, モジュールごとに最新の状態から作る
                let content = crate::working_changes::build_module_commit(
                    &state_sig.peek(),
                    &module,
                    &module_changes,
                    &message,
                );
                let Some(content) = content else {
                    failure = Some(
                        language
                            .label(
                                "Module not found",
                                "モジュールが見つかりません",
                                "Modulo ne trovita",
                            )
                            .to_string(),
                    );
                    break;
                };
                let record = crate::event_submit::submit_event(
                    content,
                    key.clone(),
                    force_offline,
                    None,
                    state_sig,
                )
                .await;
                match record.map(|record| (record.status, record.last_error)) {
                    Some((
                        status @ (crate::local_event::LocalEventStatus::Sent
                        | crate::local_event::LocalEventStatus::Queued),
                        _,
                    )) => {
                        queued |= status == crate::local_event::LocalEventStatus::Queued;
                        committed_modules += 1;
                        crate::working_changes::update(|changes| {
                            for change in &module_changes {
                                changes.remove(&change.part_id);
                            }
                        });
                    }
                    other => {
                        let label = language.label(
                            "Failed to commit changes",
                            "変更のコミットに失敗しました",
                            "Enmetado de ŝanĝoj malsukcesis",
                        );
                        // サーバーが拒否した理由 (型エラーなど) があれば併せて出す
                        failure = Some(match other.and_then(|(_, last_error)| last_error) {
                            Some(error) => format!("{label}: {error}"),
                            None => label.to_string(),
                        });
                        break;
                    }
                }
            }
            is_committing.set(false);
            match failure {
                Some(error) => result_message.set(Some((true, error))),
                None => {
                    commit_message.set(String::new());
                    excluded.set(HashSet::new());
                    let text = if queued {
                        language.label(
                            "Committed (queued while offline)",
                            "コミットしました (オフラインのため送信待ち)",
                            "Enmetita (envicigita senkonekte)",
                        )
                    } else {
                        language.label("Committed", "コミットしました", "Enmetita")
                    };
                    result_message.set(Some((false, format!("{text}: {committed_modules}"))));
                }
            }
        });
    };

    let groups = working_changes.modules().into_iter().map(|module_hash| {
        let module = crate::module_projection::find_module_snapshot(&state, &module_hash);
        let module_name = module
            .as_ref()
            .map(|module| module.module_name.clone())
            .unwrap_or_else(|| module_hash.to_string());
        let changes = working_changes
            .changes_in_module(&module_hash)
            .cloned()
            .collect::<Vec<_>>();
        let outdated = changes.iter().any(|change| is_outdated(&state, change));
        let problems = match &*precheck.read() {
            PrecommitCheck::Done(problems) => problems.get(&module_hash).cloned().unwrap_or_default(),
            _ => Vec::new(),
        };
        rsx! {
            section {
                key: "{module_hash}",
                class: "event-detail-card changes-module",
                div { class: "changes-module-header",
                    crate::icon::Icon {
                        kind: crate::icon::IconKind::Module,
                        class: "tree-icon tree-icon-module",
                    }
                    a { href: context.href_with_lang(Location::Module(module_hash.clone())),
                        "{module_name}"
                    }
                    span { class: "tree-count", "{changes.len()}" }
                }
                if outdated {
                    div { class: "tone-message", "data-tone": "warning",
                        "{language.label(\"This module has new commits since you started editing. Committing applies your changes on top of the latest commit.\", \"変更を記録したあとにこのモジュールへ新しいコミットが入りました。コミットすると最新のコミットに変更を重ねます。\", \"Ĉi tiu modulo havas novajn enmetojn. Enmeto aplikas viajn ŝanĝojn super la plej nova.\")}"
                    }
                }
                if !problems.is_empty() {
                    ul {
                        class: "changes-problems",
                        "data-precommit-problems": "true",
                        for problem in problems {
                            li {
                                class: "mono tone-message",
                                "data-tone": "error",
                                span { class: "changes-problem-part", "{problem.part_name}" }
                                " {problem.message}"
                            }
                        }
                    }
                }
                ul { class: "changes-list",
                    for change in changes {
                        {
                            let part_id = change.part_id.clone();
                            let toggle_id = part_id.clone();
                            let discard_id = part_id.clone();
                            let is_selected = !excluded.read().contains(&part_id);
                            let fields = changed_fields(&state, &change, language).join(", ");
                            let (badge, badge_title) = if change.is_new {
                                ("A", language.label("New part", "新しいパーツ", "Nova parto"))
                            } else {
                                ("M", language.label("Modified", "変更", "Modifita"))
                            };
                            rsx! {
                                li { key: "{part_id}", class: "changes-item",
                                    input {
                                        r#type: "checkbox",
                                        checked: is_selected,
                                        "aria-label": "{language.label(\"Include in commit\", \"コミットに含める\", \"Inkluzivi en enmeto\")}",
                                        onchange: move |_| {
                                            let mut excluded = excluded.write();
                                            if !excluded.remove(&toggle_id) {
                                                excluded.insert(toggle_id.clone());
                                            }
                                        },
                                    }
                                    span {
                                        class: "change-badge",
                                        "data-kind": if change.is_new { "added" } else { "modified" },
                                        title: "{badge_title}",
                                        "{badge}"
                                    }
                                    if change.is_new {
                                        span { class: "changes-item-name", "{change.entry.name}" }
                                    } else {
                                        a {
                                            class: "changes-item-name",
                                            href: context.href_with_lang(Location::Part(part_id.clone())),
                                            "{change.entry.name}"
                                        }
                                    }
                                    span { class: "changes-item-fields", "{fields}" }
                                    button {
                                        r#type: "button",
                                        class: "btn-secondary changes-item-discard",
                                        onclick: move |_| {
                                            crate::working_changes::update(|changes| changes.remove(&discard_id));
                                        },
                                        "{language.label(\"Discard\", \"破棄\", \"Forĵeti\")}"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            div { style: "display: grid; gap: 0.2rem;",
                h2 { style: "font-size: 1.4rem; font-weight: 600; margin: 0;",
                    "{language.label(\"Changes\", \"変更\", \"Ŝanĝoj\")}"
                }
                div { style: "color: var(--text-secondary); font-size: 0.84rem;",
                    "{language.label(\"Part edits are kept in this browser until you commit them. Select the changes to include and commit them together.\", \"パーツの編集はコミットするまでこのブラウザに記録されます。含める変更を選んで、まとめてコミットします。\", \"Redaktoj de partoj restas en ĉi tiu retumilo ĝis vi enmetas ilin.\")}"
                }
            }
            if working_changes.is_empty() {
                div { class: "event-detail-card changes-empty",
                    "{language.label(\"No uncommitted changes. Edit a part and it will appear here.\", \"未コミットの変更はありません。パーツを編集するとここに表示されます。\", \"Neniuj neenmetitaj ŝanĝoj.\")}"
                }
            } else {
                div { class: "event-detail-card changes-commit",
                    textarea {
                        name: "working-changes-commit-message",
                        class: "changes-commit-input",
                        rows: "2",
                        value: "{commit_message}",
                        placeholder: "{language.label(\"Commit message (optional)\", \"コミットメッセージ (省略可)\", \"Enmeta mesaĝo (nedeviga)\")}",
                        oninput: move |evt: FormEvent| commit_message.set(evt.value()),
                    }
                    div { class: "changes-commit-row",
                        button {
                            r#type: "button",
                            class: "btn-primary",
                            disabled: !is_logged_in || selected_count == 0 || is_committing()
                                || precheck.read().has_problems(),
                            onclick: on_commit,
                            "{language.label(\"Commit\", \"コミット\", \"Enmeti\")} ({selected_count})"
                        }
                        if module_count > 1 {
                            span { class: "changes-commit-note", "{per_module_note} {module_count}" }
                        }
                        match &*precheck.read() {
                            PrecommitCheck::Checking => rsx! {
                                span { class: "changes-commit-note", "data-precommit-check": "checking",
                                    "{language.label(\"Type checking…\", \"型検査中…\", \"Tipkontrolado…\")}"
                                }
                            },
                            PrecommitCheck::Done(problems) if problems.values().all(Vec::is_empty) => {
                                rsx! {
                                    span { class: "changes-commit-note", "data-precommit-check": "ok",
                                        "{language.label(\"No type errors\", \"型エラーなし\", \"Neniu tiperaro\")}"
                                    }
                                }
                            }
                            PrecommitCheck::Done(_) => rsx! {
                                span { class: "changes-commit-note", "data-precommit-check": "error",
                                    "{language.label(\"Fix the type errors below to commit.\", \"下の型エラーを直すとコミットできます。\", \"Riparu la tiperarojn sube por enmeti.\")}"
                                }
                            },
                            PrecommitCheck::NotReady => rsx! {},
                        }
                        if !is_logged_in {
                            span { class: "changes-commit-note",
                                "{language.label(\"Login required to commit.\", \"コミットするにはログインが必要です。\", \"Ensaluto necesas por enmeti.\")}"
                            }
                        }
                    }
                    if let Some((is_error, message)) = result_message() {
                        div {
                            class: "mono eval-result tone-message",
                            "data-tone": if is_error { "error" } else { "info" },
                            "{message}"
                        }
                    }
                }
                {groups}
            }
            if let Some((false, message)) = result_message().filter(|_| working_changes.is_empty()) {
                div {
                    class: "mono eval-result tone-message",
                    "data-tone": "info",
                    "{message}"
                }
            }
        }
    }
}

/// コミット前の検査 (サーバーと同じ型検査) の状態
#[derive(Debug, Clone, PartialEq, Default)]
pub enum PrecommitCheck {
    /// 型チェッカーのパーツが読み込まれていないなど, 検査できない
    #[default]
    NotReady,
    Checking,
    /// モジュールごとの問題. 問題が無いモジュールは空
    Done(HashMap<EventHashId, Vec<crate::self_hosted_type_check::CommitProblem>>),
}

impl PrecommitCheck {
    pub fn has_problems(&self) -> bool {
        matches!(self, PrecommitCheck::Done(problems) if problems.values().any(|problems| !problems.is_empty()))
    }
}

/// コミットに含める変更をモジュールごとのコミットにして, サーバーと同じ型検査をする.
/// 変更・選択・取得済みのイベント・ログイン中のアカウントが変わったら検査し直す.
/// 検査は重いので, 少し待ってからモジュールごとにブラウザへ処理を返しながら行う
fn use_precommit_check(
    language: crate::language::Language,
    excluded: Signal<HashSet<EventHashId>>,
) -> Signal<PrecommitCheck> {
    let state_sig = use_context::<Signal<AppState>>();
    let mut result = use_signal(PrecommitCheck::default);
    let mut task = use_signal(|| None::<dioxus::core::Task>);
    // AppState 全体を購読すると無関係な更新でも検査し直すので, 検査に影響する部分だけを見る
    let state_key = use_memo(move || {
        let state = state_sig.read();
        (
            state.event_cache.len(),
            state
                .current_key
                .as_ref()
                .map(|key| key.verifying_key().to_bytes()),
        )
    });
    use_effect(move || {
        let _ = state_key();
        let changes = WORKING_CHANGES.read().clone();
        let excluded = excluded.read().clone();
        if let Some(task) = task.take() {
            task.cancel();
        }
        let selected = changes
            .changes
            .iter()
            .filter(|change| !excluded.contains(&change.part_id))
            .cloned()
            .collect::<Vec<_>>();
        if selected.is_empty() {
            result.set(PrecommitCheck::NotReady);
            return;
        }
        result.set(PrecommitCheck::Checking);
        task.set(Some(spawn(async move {
            crate::self_hosted_type_check::sleep_ms(300).await;
            let mut problems = HashMap::new();
            for module in changes.modules() {
                let module_changes = selected
                    .iter()
                    .filter(|change| change.module_definition_event_hash == module)
                    .collect::<Vec<_>>();
                if module_changes.is_empty() {
                    continue;
                }
                crate::self_hosted_type_check::yield_to_browser().await;
                let state = state_sig.peek().clone();
                let Some(module_problems) = crate::self_hosted_type_check::check_module_changes(
                    &state,
                    &module,
                    &module_changes,
                    language,
                ) else {
                    result.set(PrecommitCheck::NotReady);
                    return;
                };
                problems.insert(module, module_problems);
            }
            result.set(PrecommitCheck::Done(problems));
        })));
    });
    result
}
