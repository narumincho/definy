//! Rust (definy-core) と TypeScript (worker/cbor_eval.ts) の評価器の挙動を揃えるための適合テスト。
//!
//! テストケースは `conformance/eval_cases.json` にあり、同じファイルを
//! `worker/eval_conformance_test.ts` も読み込んで検証する。

use definy_core::Value;
use definy_event::event::Expression;
use serde_json::{Value as Json, json};

const CASES_JSON: &str = include_str!("../../conformance/eval_cases.json");

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
    let account_id = definy_server::seed::builtin_system_account_id();

    let mut failures = Vec::new();
    let cases = cases["cases"].as_array().expect("cases array");
    for case in cases {
        let name = case["name"].as_str().expect("case name");
        let mut expression_json = case["expression"].clone();
        if let Err(error) =
            definy_server::seed::resolve_part_references(&mut expression_json, &account_id)
        {
            failures.push(format!("{name}: {error}"));
            continue;
        }
        let expression: Expression = match serde_json::from_value(expression_json) {
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
