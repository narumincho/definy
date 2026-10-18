//! 本番のコンパイルの入口 `self_hosted_wasm_compiler::compile_expression_to_wasm` が stage1
//! (Wasm にした definy 製コンパイラ) を使うようにしたので, 結果が Rust 製コンパイラと同じことを確かめる.
//!
//! - `entry_matches_rust_compiler_on_conformance_cases`: 適合テスト (`conformance/eval_cases.json`) の各ケースを
//!   stage1 を渡した入口と Rust 製コンパイラでコンパイル・実行し, 値が同じで期待値どおりなことを確かめる
//! - `entry_falls_back_to_rust_compiler`: `core.expression` で表せない式や definy 製コンパイラが unreachable にする式は
//!   Rust 製コンパイラにフォールバックする
//! - `stage1_compiles_http_app`: HTTP アプリ (プレビューのハンドラ) を stage1 でコンパイルしても
//!   `execute_wasm_http_response` で Rust 製と同じレスポンスになる
//!
//! stage1 は `self_hosted_compiler()` でプロセスに 1 つだけ作る (debug ビルドで十数秒)

use definy_core::Value;
use definy_event::event::{
    BitAndExpression, Expression, NumberExpression, PartReferenceExpression, derive_module_id,
    derive_module_part_id,
};
use definy_server::self_hosted_wasm_compiler::{
    UsedCompiler, compile_expression_to_wasm_with, evaluate_compiled_wasm, self_hosted_compiler,
};
use serde_json::{Value as Json, json};

const CASES_JSON: &str = include_str!("../../conformance/eval_cases.json");

/// 適合テストのうち stage1 でコンパイルされるケースの数の下限. フォールバックが増えたら気づけるように
const MIN_SELF_HOSTED_CASES: usize = 65;

/// 評価器の値を, テストケースの期待値と同じ正規化表現へ変換する (`eval_conformance.rs` と同じ)
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
fn entry_matches_rust_compiler_on_conformance_cases() {
    let compiler = self_hosted_compiler().expect("stage1");
    let events = definy_server::builtin_migration::build_builtin_verified_events();
    let account_id = definy_server::seed::builtin_system_account_id();
    let cases: Json = serde_json::from_str(CASES_JSON).expect("parse eval_cases.json");
    let cases = cases["cases"].as_array().expect("cases array");

    let mut self_hosted = 0;
    let mut failures = Vec::new();
    for case in cases {
        let name = case["name"].as_str().expect("case name");
        let mut expression_json = case["expression"].clone();
        definy_server::seed::resolve_part_references(&mut expression_json, &account_id)
            .expect("resolve part references");
        let expression: Expression =
            serde_json::from_value(expression_json).expect("valid expression");

        let (wasm, used) = compile_expression_to_wasm_with(Some(compiler), &expression, &events)
            .unwrap_or_else(|e| panic!("{name}: entry failed: {e}"));
        if used == UsedCompiler::SelfHosted {
            self_hosted += 1;
        }
        let by_entry = evaluate_compiled_wasm(&wasm).map(|value| normalize(&value));
        let by_rust = definy_core::wasm_emitter::compile_expression_to_wasm(&expression, &events)
            .map_err(|e| e.to_string())
            .and_then(|wasm| evaluate_compiled_wasm(&wasm).map_err(|e| e.to_string()))
            .map(|value| normalize(&value));
        match (by_entry, by_rust) {
            (Ok(entry), Ok(rust)) if entry == rust && entry == case["expected"] => {}
            (entry, rust) => failures.push(format!(
                "{name} ({used:?}): entry {entry:?}, rust {rust:?}, expected {}",
                case["expected"]
            )),
        }
    }
    println!(
        "入口: {self_hosted} / {} ケースを stage1 でコンパイル",
        cases.len()
    );
    assert!(failures.is_empty(), "{}", failures.join("\n"));
    assert!(
        self_hosted >= MIN_SELF_HOSTED_CASES,
        "stage1 でコンパイルされたケースが減った: {self_hosted} < {MIN_SELF_HOSTED_CASES}"
    );
}

#[test]
fn entry_falls_back_to_rust_compiler() {
    let compiler = self_hosted_compiler().expect("stage1");
    let events = definy_server::builtin_migration::build_builtin_verified_events();

    // core.expression で表せない式 (ビット演算)
    let bit_and = Expression::BitAnd(BitAndExpression {
        left: Box::new(Expression::Number(NumberExpression { value: 6 })),
        right: Box::new(Expression::Number(NumberExpression { value: 3 })),
    });
    let (wasm, used) =
        compile_expression_to_wasm_with(Some(compiler), &bit_and, &events).expect("bit_and");
    assert_eq!(used, UsedCompiler::Rust);
    assert_eq!(
        evaluate_compiled_wasm(&wasm).expect("run"),
        Value::Number(2)
    );

    // 見つからないパーツへの参照 (definy 製コンパイラは unreachable にする)
    let missing = Expression::PartReference(PartReferenceExpression::new(derive_module_part_id(
        &derive_module_id(&definy_server::seed::builtin_system_account_id(), "core"),
        "no-such-part",
    )));
    let (_, used) = compile_expression_to_wasm_with(Some(compiler), &missing, &events)
        .unwrap_or((Vec::new(), UsedCompiler::Rust));
    assert_eq!(used, UsedCompiler::Rust);

    // stage1 が無いとき
    let number = Expression::Number(NumberExpression { value: 1 });
    let (_, used) = compile_expression_to_wasm_with(None, &number, &events).expect("number");
    assert_eq!(used, UsedCompiler::Rust);
    let (_, used) =
        compile_expression_to_wasm_with(Some(compiler), &number, &events).expect("number");
    assert_eq!(used, UsedCompiler::SelfHosted);
}

#[test]
fn stage1_compiles_http_app() {
    let compiler = self_hosted_compiler().expect("stage1");
    let events = definy_server::builtin_migration::build_builtin_verified_events();
    let part =
        definy_server::seed::find_builtin_part("self-hosted-definy-server").expect("sample part");
    let expression = part.expression.as_ref().expect("sample expression");
    let handler = definy_core::detect_deploy_in_expression(expression)
        .and_then(|detected| detected.handler_expression)
        .expect("deploy handler");

    for path in ["/", "/api/self-host", "/healthz", "/not-found"] {
        let url = format!("http://self-definy.localhost:8000{path}");
        let headers = vec![("host".to_string(), "self-definy.localhost:8000".to_string())];
        let target = definy_core::http_app::build_http_request_target_expression(
            &handler,
            &events,
            "GET",
            &url,
            &headers,
            &[],
        )
        .unwrap_or_else(|e| panic!("{path}: target expression: {e}"));

        let (by_stage1, used) = compile_expression_to_wasm_with(Some(compiler), &target, &events)
            .unwrap_or_else(|e| panic!("{path}: stage1 compile failed: {e}"));
        assert_eq!(used, UsedCompiler::SelfHosted, "{path}: stage1 を使う");
        let by_rust = definy_core::wasm_emitter::compile_expression_to_wasm(&target, &events)
            .unwrap_or_else(|e| panic!("{path}: rust compile failed: {e}"));

        let mut stage1_response = definy_core::wasm_emitter::execute_wasm_http_response(&by_stage1)
            .unwrap_or_else(|e| panic!("{path}: stage1 output failed: {e}"));
        let mut rust_response = definy_core::wasm_emitter::execute_wasm_http_response(&by_rust)
            .unwrap_or_else(|e| panic!("{path}: rust output failed: {e}"));
        assert_eq!(
            stage1_response.status, rust_response.status,
            "{path}: status"
        );
        assert_eq!(
            stage1_response.headers, rust_response.headers,
            "{path}: headers"
        );
        let stage1_body = stage1_response.body_stream.collect_all_bytes().unwrap();
        let rust_body = rust_response.body_stream.collect_all_bytes().unwrap();
        assert!(
            stage1_body == rust_body,
            "{path}: body differs (stage1 {} bytes, rust {} bytes)",
            stage1_body.len(),
            rust_body.len()
        );

        // Cloudflare Workers 向けの wasmi でも動く
        let mut by_wasmi =
            definy_core::wasm_emitter::wasmi_backend::execute_wasm_http_response(&by_stage1)
                .unwrap_or_else(|e| panic!("{path}: wasmi failed: {e}"));
        assert_eq!(
            by_wasmi.status, rust_response.status,
            "{path}: wasmi status"
        );
        assert!(by_wasmi.body_stream.collect_all_bytes().unwrap() == rust_body);
        println!(
            "{path}: stage1 {} バイト, rust {} バイト",
            by_stage1.len(),
            by_rust.len()
        );
    }
}
