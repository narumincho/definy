//! wasmi バックエンド（Cloudflare Workers 向けの Wasm インタプリタ）が、wasmtime と同じ結果を
//! 返すことを検証します。
//!
//! - `conformance/eval_cases.json` の全ケースを wasmi で実行して期待値と比べる
//! - HTTP サーバーのサンプル（`sample.self-hosted-definy-server`）に複数のリクエストを送り、
//!   wasmtime と wasmi のレスポンス（ステータス・ヘッダー・本文）が一致することを確認する

use definy_core::Value;
use definy_event::event::Expression;
use serde_json::{Value as Json, json};

const CASES_JSON: &str = include_str!("../../conformance/eval_cases.json");

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

/// `{"$part": "module.name"}` を、式の位置なら PartReference、ハッシュの位置ならパーツ ID に置き換える
fn resolve_placeholders(json: Json) -> Json {
    match json {
        Json::Array(items) => Json::Array(items.into_iter().map(resolve_placeholders).collect()),
        Json::Object(map) => {
            if let Some(Json::String(qualified)) = map.get("$part") {
                let (module_name, part_name) = qualified.split_once('.').expect("module.part");
                let account = definy_server::seed::builtin_system_account_id();
                let hash = definy_event::event::derive_module_part_id(
                    &definy_event::event::derive_module_id(&account, module_name),
                    part_name,
                );
                return serde_json::to_value(Expression::PartReference(
                    definy_event::event::PartReferenceExpression::new(hash),
                ))
                .expect("serialize PartReference");
            }
            Json::Object(
                map.into_iter()
                    .map(|(key, value)| (key, resolve_placeholders(value)))
                    .collect(),
            )
        }
        other => other,
    }
}

#[test]
fn test_wasmi_backend_passes_eval_conformance_cases() {
    let cases: Json = serde_json::from_str(CASES_JSON).expect("parse eval_cases.json");
    let events = definy_server::builtin_migration::build_builtin_verified_events();

    let mut failures = Vec::new();
    let cases = cases["cases"].as_array().expect("cases array");
    for case in cases {
        let name = case["name"].as_str().expect("case name");
        let expression: Expression =
            serde_json::from_value(resolve_placeholders(case["expression"].clone()))
                .unwrap_or_else(|e| panic!("{name}: invalid expression: {e}"));
        let wasm = match definy_core::wasm_emitter::compile_expression_to_wasm(&expression, &events)
        {
            Ok(wasm) => wasm,
            Err(error) => {
                failures.push(format!("{name}: compile failed: {error}"));
                continue;
            }
        };
        match definy_core::wasm_emitter::wasmi_backend::execute_wasm(&wasm) {
            Ok(value) => {
                let actual = normalize(&value);
                if actual != case["expected"] {
                    failures.push(format!(
                        "{name}: expected {}, got {actual}",
                        case["expected"]
                    ));
                }
            }
            Err(error) => failures.push(format!("{name}: wasmi execution failed: {error}")),
        }
    }

    assert!(
        failures.is_empty(),
        "{} of {} cases failed on wasmi: {}",
        failures.len(),
        cases.len(),
        failures.join(" | ")
    );
}

#[test]
fn test_wasmi_backend_matches_wasmtime_for_http_server_sample() {
    let events = definy_server::builtin_migration::build_builtin_verified_events();
    let part =
        definy_server::seed::find_builtin_part("self-hosted-definy-server").expect("sample part");
    let expression = part.expression.as_ref().expect("sample expression");
    let handler = definy_core::detect_preview_in_expression(expression)
        .and_then(|detected| detected.handler_expression)
        .expect("preview handler");

    for path in ["/", "/api/self-host", "/healthz", "/not-found"] {
        let url = format!("http://self-definy.localhost:8000{path}");
        let headers = vec![("host".to_string(), "self-definy.localhost:8000".to_string())];
        let wasm = definy_server::self_hosted_wasm_compiler::compile_http_request_to_wasm(
            &handler,
            &events,
            "GET",
            &url,
            &headers,
            &[],
        )
        .unwrap_or_else(|e| panic!("{path}: compile failed: {e:?}"));

        let mut by_wasmtime = definy_core::wasm_emitter::execute_wasm_http_response(&wasm)
            .unwrap_or_else(|e| panic!("{path}: wasmtime failed: {e}"));
        let mut by_wasmi =
            definy_core::wasm_emitter::wasmi_backend::execute_wasm_http_response(&wasm)
                .unwrap_or_else(|e| panic!("{path}: wasmi failed: {e}"));

        assert_eq!(by_wasmi.status, by_wasmtime.status, "{path}: status");
        assert_eq!(by_wasmi.headers, by_wasmtime.headers, "{path}: headers");
        let body_wasmtime = by_wasmtime.body_stream.collect_all_bytes().unwrap();
        let body_wasmi = by_wasmi.body_stream.collect_all_bytes().unwrap();
        assert!(
            body_wasmi == body_wasmtime,
            "{path}: body differs (wasmi {} bytes, wasmtime {} bytes)",
            body_wasmi.len(),
            body_wasmtime.len()
        );
    }
}
