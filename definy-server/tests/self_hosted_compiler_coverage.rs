//! definy 製の Wasm コンパイラ (`core.compile-to-wasm`) が, Rust 製コンパイラ (stage0) と比べて
//! どこまで式をコンパイルできるかを測る.
//!
//! - `self_hosted_compiler_conformance`: 評価器の適合テスト (`conformance/eval_cases.json`) を
//!   definy 製コンパイラでコンパイル・実行し, 期待値と比べる. 式の種類ごとの通過数を表示する
//! - `self_hosted_compiler_self_compile_gaps`: definy 製コンパイラ自身 (`core.compile-to-wasm` と
//!   そこから参照するパーツ) が使う式の種類のうち, definy 製コンパイラが扱えないものを表示する
//!
//! 結果は docs/self-hosting.md の「definy 製コンパイラの対応状況」にまとめている.
//! `cargo test -p definy-server --test self_hosted_compiler_coverage -- --nocapture` で表が見える

use std::collections::{BTreeMap, BTreeSet};

use definy_core::Value;
use definy_event::event::{Expression, derive_module_id, derive_module_part_id};
use definy_server::self_hosted_wasm_compiler::{
    compile_with_self_hosted_compiler, evaluate_compiled_wasm,
};
use serde_json::{Value as Json, json};

const CASES_JSON: &str = include_str!("../../conformance/eval_cases.json");

/// 期待値どおりの結果になったケースの数の下限. 対応範囲を広げたら上げる
const MIN_PASSING_CASES: usize = 28;

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

/// `Expression` の serde 表現から, 使われている式の種類 (`Add`, `ListLiteral` など) を集める.
/// definy 製コンパイラは Bool の match しか扱えないので, それ以外の match は `MatchUnion` として分ける
fn expression_kinds(expression: &Json, kinds: &mut BTreeSet<String>) {
    match expression {
        Json::Object(fields) => {
            for (key, value) in fields {
                if key == "Match" {
                    let bool_only = value["arms"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .all(|arm| matches!(arm["tag"].as_str(), Some("true" | "false")))
                        && value["default"].is_null();
                    kinds.insert(if bool_only { "Match" } else { "MatchUnion" }.to_string());
                } else if key.starts_with(|c: char| c.is_ascii_uppercase()) {
                    kinds.insert(key.clone());
                }
                expression_kinds(value, kinds);
            }
        }
        Json::Array(items) => items.iter().for_each(|item| expression_kinds(item, kinds)),
        // `TypeNumber` などのペイロードの無い種類は文字列になる
        Json::String(value) if value.starts_with("Type") => {
            kinds.insert(value.clone());
        }
        _ => {}
    }
}

/// Rust の式の種類を `core.expression` のタグにする (`definy_core::self_hosted_ast` と同じ対応)
fn self_hosted_tag(kind: &str) -> String {
    match kind {
        "ListLiteral" => "list".to_string(),
        "TypeLiteral" => "record".to_string(),
        "TypeLiteralItem" => "record".to_string(),
        _ => {
            let mut tag = String::new();
            for (index, c) in kind.chars().enumerate() {
                if c.is_ascii_uppercase() {
                    if index > 0 {
                        tag.push('_');
                    }
                    tag.push(c.to_ascii_lowercase());
                } else {
                    tag.push(c);
                }
            }
            tag
        }
    }
}

fn core_part(name: &str) -> &'static definy_event::event::ModulePartEntry {
    definy_server::seed::find_builtin_part(name)
        .unwrap_or_else(|| panic!("builtin part {name} not found"))
}

/// `core.expression` のタグのうち, `core.compile-expr-instructions` が個別に扱うもの.
/// それ以外は `_` アームで `i64.const 0` になる (エラーにならない)
fn compiled_tags() -> BTreeSet<String> {
    fn find_expression_match(value: &Json) -> Option<BTreeSet<String>> {
        match value {
            Json::Object(fields) => {
                if let Some(Json::Object(match_expression)) = fields.get("Match") {
                    let tags = match_expression["arms"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .filter_map(|arm| arm["tag"].as_str())
                        .map(str::to_string)
                        .collect::<BTreeSet<_>>();
                    if tags.contains("number") && tags.contains("add") {
                        return Some(tags.into_iter().filter(|tag| tag != "_").collect());
                    }
                }
                fields.values().find_map(find_expression_match)
            }
            Json::Array(items) => items.iter().find_map(find_expression_match),
            _ => None,
        }
    }
    let expression = serde_json::to_value(
        core_part("compile-expr-instructions")
            .expression
            .as_ref()
            .expect("compile-expr-instructions has expression"),
    )
    .expect("serialize");
    find_expression_match(&expression).expect("match on core.expression tags")
}

enum Outcome {
    Pass,
    /// コンパイル・実行はできたが, 結果が期待値と違う
    WrongResult(Json),
    CompileFailed(String),
    RunFailed(String),
}

#[test]
fn self_hosted_compiler_conformance() {
    let cases: Json = serde_json::from_str(CASES_JSON).expect("parse eval_cases.json");
    let account_id = definy_server::seed::builtin_system_account_id();
    let cases = cases["cases"].as_array().expect("cases array");

    let mut results = Vec::new();
    for case in cases {
        let name = case["name"].as_str().expect("case name").to_string();
        let mut expression_json = case["expression"].clone();
        definy_server::seed::resolve_part_references(&mut expression_json, &account_id)
            .expect("resolve part references");
        let mut kinds = BTreeSet::new();
        expression_kinds(&expression_json, &mut kinds);
        let expression: Expression =
            serde_json::from_value(expression_json).expect("valid expression");
        let outcome = match compile_with_self_hosted_compiler(&expression) {
            Err(error) => Outcome::CompileFailed(error.to_string()),
            Ok(wasm) => match evaluate_compiled_wasm(&wasm) {
                Err(error) => Outcome::RunFailed(error.to_string()),
                Ok(value) => {
                    let actual = normalize(&value);
                    if actual == case["expected"] {
                        Outcome::Pass
                    } else {
                        Outcome::WrongResult(actual)
                    }
                }
            },
        };
        results.push((name, kinds, case["expected"].clone(), outcome));
    }

    let passed = results
        .iter()
        .filter(|(.., outcome)| matches!(outcome, Outcome::Pass))
        .count();
    println!(
        "definy 製コンパイラ: {passed} / {} ケースが期待値どおり",
        results.len()
    );
    for (name, kinds, expected, outcome) in &results {
        let detail = match outcome {
            Outcome::Pass => continue,
            Outcome::WrongResult(actual) => {
                format!("wrong result: expected {expected}, got {actual}")
            }
            Outcome::CompileFailed(error) => format!("compile failed: {}", first_line(error)),
            Outcome::RunFailed(error) => format!("run failed: {}", first_line(error)),
        };
        let kinds = kinds.iter().cloned().collect::<Vec<_>>().join(", ");
        println!("  NG {name} [{kinds}]: {detail}");
    }

    // 式の種類ごとに, その種類を含むケースの通過数
    let mut per_kind = BTreeMap::<&str, (usize, usize)>::new();
    for (_, kinds, _, outcome) in &results {
        for kind in kinds {
            let entry = per_kind.entry(kind).or_default();
            entry.1 += 1;
            if matches!(outcome, Outcome::Pass) {
                entry.0 += 1;
            }
        }
    }
    println!("式の種類ごとの通過数 (その種類を含むケースのうち):");
    for (kind, (pass, total)) in &per_kind {
        println!("  {kind}: {pass} / {total}");
    }

    assert!(
        passed >= MIN_PASSING_CASES,
        "definy 製コンパイラで期待値どおりになるケースが減った: {passed} < {MIN_PASSING_CASES}"
    );
}

#[test]
fn self_hosted_compiler_self_compile_gaps() {
    // core.compile-to-wasm から PartReference をたどって, 定義が式のパーツを集める
    let account_id = definy_server::seed::builtin_system_account_id();
    let part_names = definy_server::seed::get_builtin_module_seeds()
        .iter()
        .flat_map(|seed| {
            let module_id = derive_module_id(&account_id, &seed.module_name);
            seed.parts.iter().map(move |part| {
                (
                    derive_module_part_id(&module_id, &part.name).to_string(),
                    format!("{}.{}", seed.module_name, part.name),
                )
            })
        })
        .collect::<BTreeMap<_, _>>();

    let mut visited = BTreeSet::new();
    let mut queue = vec!["core.compile-to-wasm".to_string()];
    let mut kinds_by_part = BTreeMap::<String, BTreeSet<String>>::new();
    while let Some(qualified) = queue.pop() {
        if !visited.insert(qualified.clone()) {
            continue;
        }
        let name = qualified
            .split_once('.')
            .map_or(qualified.as_str(), |(_, name)| name);
        let Some(expression) = core_part(name).expression.as_ref() else {
            continue;
        };
        let json = serde_json::to_value(expression).expect("serialize");
        let mut kinds = BTreeSet::new();
        expression_kinds(&json, &mut kinds);
        collect_references(&json, &part_names, &mut queue);
        kinds_by_part.insert(qualified, kinds);
    }

    let compiled = compiled_tags();
    let mut gaps = BTreeMap::<String, BTreeSet<String>>::new();
    for (part, kinds) in &kinds_by_part {
        for kind in kinds {
            // 型の式 (TypeNumber など) は実行時の値にならないので除く
            if kind.starts_with("Type") && kind != "TypeLiteral" {
                continue;
            }
            if !compiled.contains(&self_hosted_tag(kind)) {
                gaps.entry(kind.clone()).or_default().insert(part.clone());
            }
        }
    }

    println!(
        "definy 製コンパイラが個別に扱う core.expression のタグ: {}",
        compiled.iter().cloned().collect::<Vec<_>>().join(", ")
    );
    println!(
        "definy 製コンパイラ自身のパーツ ({} 個): {}",
        kinds_by_part.len(),
        kinds_by_part.keys().cloned().collect::<Vec<_>>().join(", ")
    );
    println!("自分自身をコンパイルするのに足りない式の種類:");
    for (kind, parts) in &gaps {
        println!(
            "  {kind} ({}): {}",
            self_hosted_tag(kind),
            parts.iter().cloned().collect::<Vec<_>>().join(", ")
        );
    }
    assert!(!kinds_by_part.is_empty());
}

fn collect_references(
    value: &Json,
    part_names: &BTreeMap<String, String>,
    queue: &mut Vec<String>,
) {
    match value {
        Json::Object(fields) => {
            if let Some(reference) = fields.get("PartReference") {
                let hash: definy_event::EventHashId =
                    serde_json::from_value(reference["part_definition_event_hash"].clone())
                        .expect("part hash");
                if let Some(name) = part_names.get(&hash.to_string()) {
                    queue.push(name.clone());
                }
            }
            fields
                .values()
                .for_each(|value| collect_references(value, part_names, queue));
        }
        Json::Array(items) => items
            .iter()
            .for_each(|item| collect_references(item, part_names, queue)),
        _ => {}
    }
}

fn first_line(text: &str) -> String {
    text.lines()
        .next()
        .unwrap_or_default()
        .chars()
        .take(200)
        .collect()
}
