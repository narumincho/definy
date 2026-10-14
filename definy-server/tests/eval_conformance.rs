//! Rust (definy-core) と TypeScript (worker/cbor_eval.ts) の評価器の挙動を揃えるための適合テスト。
//!
//! テストケースは `conformance/eval_cases.json` にあり、同じファイルを
//! `worker/eval_conformance_test.ts` も読み込んで検証する。

use definy_core::Value;
use definy_event::event::{
    Expression, PartReferenceExpression, derive_module_id, derive_module_part_id,
};
use serde_json::{Value as Json, json};

const CASES_JSON: &str = include_str!("../../conformance/eval_cases.json");

/// `{"$part": "module.name"}` をビルトインパーツへの PartReference 式（JSON）に置き換える
fn resolve_part_placeholders(json: Json) -> Json {
    match json {
        Json::Array(items) => {
            Json::Array(items.into_iter().map(resolve_part_placeholders).collect())
        }
        Json::Object(map) => {
            if let Some(Json::String(qualified)) = map.get("$part") {
                let (module_name, part_name) = qualified
                    .split_once('.')
                    .unwrap_or_else(|| panic!("invalid $part: {qualified}"));
                assert!(
                    definy_server::seed::get_builtin_module_seeds()
                        .iter()
                        .any(|seed| &*seed.module_name == module_name
                            && seed.parts.iter().any(|p| &*p.name == part_name)),
                    "unknown builtin part: {qualified}"
                );
                let account = definy_server::seed::builtin_system_account_id();
                let hash =
                    derive_module_part_id(&derive_module_id(&account, module_name), part_name);
                let reference = Expression::PartReference(PartReferenceExpression::new(hash));
                return serde_json::to_value(reference).expect("serialize PartReference");
            }
            Json::Object(
                map.into_iter()
                    .map(|(key, value)| (key, resolve_part_placeholders(value)))
                    .collect(),
            )
        }
        other => other,
    }
}

/// Rust 評価器の値を、テストケースの期待値と同じ正規化表現へ変換する
fn normalize(value: &Value) -> Json {
    match value {
        Value::Number(n) => json!(n),
        Value::String(s) => json!(s),
        Value::Bool(b) => json!(b),
        Value::List(items) => Json::Array(items.iter().map(normalize).collect()),
        Value::Record(fields) => json!({
            "$record": fields
                .iter()
                .map(|(key, item)| json!([key, normalize(item)]))
                .collect::<Vec<_>>()
        }),
        Value::Function => json!({ "$function": true }),
        Value::Variant { tag, payload } => json!({
            "$variant": tag,
            "payload": payload.as_deref().map_or(Json::Null, normalize),
        }),
    }
}

#[test]
fn test_eval_conformance_cases() {
    let cases: Json = serde_json::from_str(CASES_JSON).expect("parse eval_cases.json");
    let events = definy_server::builtin_migration::build_builtin_verified_events();

    let mut failures = Vec::new();
    let cases = cases["cases"].as_array().expect("cases array");
    for case in cases {
        let name = case["name"].as_str().expect("case name");
        let expression: Expression =
            match serde_json::from_value(resolve_part_placeholders(case["expression"].clone())) {
                Ok(expression) => expression,
                Err(error) => {
                    failures.push(format!("{name}: invalid expression: {error}"));
                    continue;
                }
            };
        match definy_core::evaluate_expression(&expression, &events) {
            Ok(value) => {
                let actual = normalize(&value);
                if actual != case["expected"] {
                    failures.push(format!(
                        "{name}: expected {}, got {actual}",
                        case["expected"]
                    ));
                }
            }
            Err(error) => failures.push(format!("{name}: evaluation failed: {error}")),
        }
    }

    assert!(
        failures.is_empty(),
        "{} of {} conformance cases failed: {}",
        failures.len(),
        cases.len(),
        failures.join(" | ")
    );
}
