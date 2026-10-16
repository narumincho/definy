//! definy 製の型チェッカー (`core.type-check-against`) で UI のパーツを検査する.
//!
//! エクスプローラーの型エラーの印とパーツ詳細の型検査結果は, サーバーや seed の検証と同じ
//! セルフホスト型チェッカーの判定を表示する. Rust 製の型チェッカー (`expression_editor::diagnostics`)
//! は編集補助 (ノードごとの期待型やヒント) にだけ使う.
//!
//! 1 回の検査は式を Wasm にコンパイルして実行するため重い (数百 ms). そのため
//! - エクスプローラーは数パーツずつ検査し, 合間にブラウザへ処理を返す
//! - パーツ詳細は編集が止まってから検査する

use std::collections::{HashMap, HashSet};

use definy_core::expression_eval::Value;
use definy_core::self_hosted_type_check::{
    PartToCheck, PartTypeEntry, SelfHostedCoreParts, SelfHostedTypeCheckOutcome,
    SelfHostedTypeError, check_parts,
};
use definy_event::event::{Expression, PartType, derive_module_id, derive_module_part_id};
use definy_event::{ContentHash, EventHashId};
use dioxus::prelude::*;

use crate::AppState;
use crate::language::Language;
use crate::part_projection::{PartSnapshot, collect_part_snapshots};

/// 取得済みのイベントから `core` モジュールの型チェッカーのパーツを探す.
/// `core.type-check-against` が無ければ (イベントの読み込み前など) `None`
pub fn find_core_parts(snapshots: &[PartSnapshot]) -> Option<SelfHostedCoreParts> {
    snapshots.iter().find_map(|snapshot| {
        let core_module_id = derive_module_id(&snapshot.account_id, "core");
        (snapshot.module_definition_event_hash == core_module_id
            && snapshot.definition_event_hash
                == derive_module_part_id(&core_module_id, "type-check-against"))
        .then(|| SelfHostedCoreParts::from_core_module_id(&core_module_id))
    })
}

fn type_env_entries(snapshots: &[PartSnapshot]) -> Vec<PartTypeEntry<'_>> {
    snapshots
        .iter()
        .filter_map(|snapshot| {
            let part_type = snapshot.part_type.as_ref()?;
            Some(PartTypeEntry {
                part_definition_event_hash: &snapshot.definition_event_hash,
                part_type,
                type_declaration: (part_type == &PartType::Type)
                    .then_some(snapshot.expression.as_ref())
                    .flatten(),
            })
        })
        .collect()
}

/// 型エラーの印を付けるかどうか. 型エラーと型チェッカーの実行失敗を印の対象にする
pub fn is_error(outcome: &SelfHostedTypeCheckOutcome) -> bool {
    matches!(
        outcome,
        SelfHostedTypeCheckOutcome::TypeError(_) | SelfHostedTypeCheckOutcome::CheckerFailed(_)
    )
}

/// 1 つの式を検査する. 型チェッカーのパーツが無ければ `None`
pub fn check_expression(
    state: &AppState,
    expression: &Expression,
    part_type: &PartType,
) -> Option<SelfHostedTypeCheckOutcome> {
    let snapshots = collect_part_snapshots(state);
    let core = find_core_parts(&snapshots)?;
    let env = type_env_entries(&snapshots);
    let events = state.events_with_hash();
    check_parts(
        &[PartToCheck {
            expression,
            part_type,
        }],
        &env,
        &core,
        &events,
    )
    .pop()
}

/// パーツごとの検査結果. 検査に使った型環境と式が同じなら結果を使い回す
#[derive(Default, Clone, PartialEq)]
pub struct PartCheckResults {
    /// 検査したときの全パーツの型. 変わったら全パーツを検査し直す
    env_part_types: Vec<(EventHashId, Option<PartType>)>,
    results: HashMap<EventHashId, (Option<ContentHash>, SelfHostedTypeCheckOutcome)>,
    /// まだ検査していないパーツの数 (検査中の表示と E2E の待ち合わせに使う)
    pub pending: usize,
}

impl PartCheckResults {
    pub fn error_parts(&self) -> HashSet<EventHashId> {
        self.results
            .iter()
            .filter(|(_, (_, outcome))| is_error(outcome))
            .map(|(hash, _)| hash.clone())
            .collect()
    }
}

/// エクスプローラーと共有する, 全パーツの検査結果
pub static PART_CHECK_RESULTS: GlobalSignal<PartCheckResults> =
    Signal::global(PartCheckResults::default);

/// 1 回にまとめて検査するパーツの数. 多いほど速いが, その間ブラウザが応答しなくなる
const PARTS_PER_STEP: usize = 4;

/// 取得済みのすべてのパーツを検査し, [`PART_CHECK_RESULTS`] を更新する.
/// 式と型環境が前回の検査から変わっていないパーツは検査しない
pub async fn check_all_parts(state_sig: Signal<AppState>) {
    let state = state_sig.peek().clone();
    let snapshots = collect_part_snapshots(&state);
    let Some(core) = find_core_parts(&snapshots) else {
        return;
    };
    let mut env_part_types = snapshots
        .iter()
        .map(|snapshot| {
            (
                snapshot.definition_event_hash.clone(),
                snapshot.part_type.clone(),
            )
        })
        .collect::<Vec<_>>();
    env_part_types.sort_by(|a, b| a.0.cmp(&b.0));

    {
        let mut results = PART_CHECK_RESULTS.write();
        if results.env_part_types != env_part_types {
            *results = PartCheckResults {
                env_part_types,
                results: HashMap::new(),
                pending: 0,
            };
        }
        let existing = snapshots
            .iter()
            .map(|snapshot| &snapshot.definition_event_hash)
            .collect::<HashSet<_>>();
        results.results.retain(|hash, _| existing.contains(hash));
    }

    let to_check = {
        let results = PART_CHECK_RESULTS.peek();
        snapshots
            .iter()
            .filter(|snapshot| snapshot.expression.is_some() && snapshot.part_type.is_some())
            .filter(|snapshot| {
                results
                    .results
                    .get(&snapshot.definition_event_hash)
                    .is_none_or(|(content_hash, _)| content_hash != &snapshot.content_hash)
            })
            .collect::<Vec<_>>()
    };
    PART_CHECK_RESULTS.write().pending = to_check.len();
    if to_check.is_empty() {
        return;
    }
    let env = type_env_entries(&snapshots);
    let events = state.events_with_hash();
    for chunk in to_check.chunks(PARTS_PER_STEP) {
        // 検査の前にブラウザへ処理を返し, 画面の描画や入力を先に済ませる
        yield_to_browser().await;
        let parts = chunk
            .iter()
            .filter_map(|snapshot| {
                Some(PartToCheck {
                    expression: snapshot.expression.as_ref()?,
                    part_type: snapshot.part_type.as_ref()?,
                })
            })
            .collect::<Vec<_>>();
        let outcomes = check_parts(&parts, &env, &core, &events);
        let mut results = PART_CHECK_RESULTS.write();
        results.pending = results.pending.saturating_sub(chunk.len());
        for (snapshot, outcome) in chunk.iter().zip(outcomes) {
            results.results.insert(
                snapshot.definition_event_hash.clone(),
                (snapshot.content_hash.clone(), outcome),
            );
        }
    }
}

/// ブラウザのイベントループに一度処理を返す (`setTimeout(0)`)
pub async fn yield_to_browser() {
    sleep_ms(0).await;
}

/// `ms` ミリ秒待つ. ブラウザ以外では待たない
pub async fn sleep_ms(ms: i32) {
    #[cfg(target_arch = "wasm32")]
    {
        let promise = js_sys::Promise::new(&mut |resolve, _| {
            if let Some(window) = web_sys::window() {
                let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(&resolve, ms);
            }
        });
        let _ = wasm_bindgen_futures::JsFuture::from(promise).await;
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        let _ = ms;
    }
}

/// 検査結果を表示用の文に変換する. 型の中のパーツ参照はパーツ名で表す
pub fn outcome_message(
    outcome: &SelfHostedTypeCheckOutcome,
    snapshots: &[PartSnapshot],
    language: Language,
) -> String {
    let part_names = snapshots
        .iter()
        .map(|snapshot| {
            (
                snapshot.definition_event_hash.to_string(),
                snapshot.part_name.clone(),
            )
        })
        .collect::<HashMap<_, _>>();
    match outcome {
        SelfHostedTypeCheckOutcome::Ok => language
            .label("No type errors", "型エラーなし", "Neniu tiperaro")
            .to_string(),
        SelfHostedTypeCheckOutcome::TypeError(error) => type_error_message(error, &part_names),
        SelfHostedTypeCheckOutcome::Unsupported(message) => format!(
            "{} ({message})",
            language.label("Not checked", "検査できない式です", "Ne kontrolita",)
        ),
        SelfHostedTypeCheckOutcome::CheckerFailed(message) => format!(
            "{}: {}",
            language.label(
                "Type checker failed",
                "型チェッカーの実行に失敗しました",
                "Tipkontrolilo malsukcesis",
            ),
            message.lines().next().unwrap_or_default()
        ),
    }
}

fn type_error_message(error: &SelfHostedTypeError, part_names: &HashMap<String, String>) -> String {
    let field = |key: &str| match &error.detail {
        Some(Value::Record(fields)) => fields
            .iter()
            .find(|(field_key, _)| field_key == key)
            .map(|(_, value)| value),
        _ => None,
    };
    let type_text = |key: &str| {
        field(key)
            .map(|value| type_ast_text(value, part_names))
            .unwrap_or_else(|| "?".to_string())
    };
    match error.tag.as_str() {
        "type_mismatch" => format!(
            "type_mismatch: expected {}, actual {}",
            type_text("expected"),
            type_text("actual")
        ),
        "not_a_function" | "not_a_record" | "not_a_union" | "not_a_list" => {
            format!("{}: {}", error.tag, type_text("actual"))
        }
        "unexpected_function" => format!("{}: expected {}", error.tag, type_text("expected")),
        _ => match &error.detail {
            Some(detail) => format!("{} {detail}", error.tag),
            None => error.tag.clone(),
        },
    }
}

/// `core.type-ast` の値を `List<{ name: String }>` のような文字列にする
pub fn type_ast_text(value: &Value, part_names: &HashMap<String, String>) -> String {
    let Value::Variant { tag, payload } = value else {
        return value.to_string();
    };
    let payload = payload.as_deref();
    let field = |value: Option<&Value>, key: &str| match value {
        Some(Value::Record(fields)) => fields
            .iter()
            .find(|(field_key, _)| field_key == key)
            .map(|(_, value)| value.clone()),
        _ => None,
    };
    let text = |value: Option<Value>| {
        value
            .map(|value| type_ast_text(&value, part_names))
            .unwrap_or_else(|| "?".to_string())
    };
    let string = |value: Option<Value>| match value {
        Some(Value::String(value)) => value,
        _ => "?".to_string(),
    };
    let items = |value: Option<&Value>| match value {
        Some(Value::List(items)) => items.clone(),
        _ => Vec::new(),
    };
    match tag.as_str() {
        "type" => "Type".to_string(),
        "number" => "Number".to_string(),
        "string" => "String".to_string(),
        "boolean" => "Boolean".to_string(),
        "list" => format!("List<{}>", text(field(payload, "item_type"))),
        "record" => format!(
            "{{ {} }}",
            items(payload)
                .iter()
                .map(|item| format!(
                    "{}: {}",
                    string(field(Some(item), "key")),
                    text(field(Some(item), "field_type"))
                ))
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "union" => items(payload)
            .iter()
            .map(|item| {
                let tag = string(field(Some(item), "tag"));
                match field(Some(item), "payload_type") {
                    Some(Value::Variant {
                        tag: option_tag,
                        payload: Some(payload_type),
                    }) if option_tag == "some" => {
                        format!("{tag}({})", type_ast_text(&payload_type, part_names))
                    }
                    _ => tag,
                }
            })
            .collect::<Vec<_>>()
            .join(" | "),
        "function" => format!(
            "({}) -> {}",
            items(field(payload, "parameters").as_ref())
                .iter()
                .map(|parameter| format!(
                    "{}: {}",
                    string(field(Some(parameter), "name")),
                    text(field(Some(parameter), "type"))
                ))
                .collect::<Vec<_>>()
                .join(", "),
            text(field(payload, "return_type"))
        ),
        "reference" => {
            let hash = string(field(payload, "part_hash"));
            part_names.get(&hash).cloned().unwrap_or(hash)
        }
        _ => value.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn variant(tag: &str, payload: Option<Value>) -> Value {
        Value::Variant {
            tag: tag.to_string(),
            payload: payload.map(Box::new),
        }
    }

    fn record(fields: Vec<(&str, Value)>) -> Value {
        Value::Record(
            fields
                .into_iter()
                .map(|(key, value)| (key.to_string(), value))
                .collect(),
        )
    }

    #[test]
    fn type_ast_text_shows_part_names_for_references() {
        let part_names = HashMap::from([("abc".to_string(), "user".to_string())]);
        let list_of_user = variant(
            "list",
            Some(record(vec![(
                "item_type",
                variant(
                    "reference",
                    Some(record(vec![("part_hash", Value::String("abc".into()))])),
                ),
            )])),
        );
        assert_eq!(type_ast_text(&list_of_user, &part_names), "List<user>");

        let option = variant(
            "union",
            Some(Value::List(vec![
                record(vec![
                    ("tag", Value::String("none".into())),
                    ("payload_type", variant("none", None)),
                ]),
                record(vec![
                    ("tag", Value::String("some".into())),
                    (
                        "payload_type",
                        variant("some", Some(variant("number", None))),
                    ),
                ]),
            ])),
        );
        assert_eq!(type_ast_text(&option, &part_names), "none | some(Number)");
    }
}
