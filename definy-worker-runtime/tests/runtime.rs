//! Worker 用ランタイムを、Cloudflare Workers 向け seed バンドルと同じイベントでネイティブ実行して検証します。

use std::collections::HashMap;

use definy_worker_runtime::{Request, Response, Runtime};

fn runtime_with_seed_bundle() -> Runtime {
    let bundle = definy_server::builtin_migration::build_builtin_seed_bundle().expect("bundle");
    let mut runtime = Runtime::new();
    let events = bundle
        .events
        .iter()
        .map(|e| e.signed_event_bytes.clone())
        .collect();
    assert_eq!(runtime.handle(Request::LoadEvents { events }), Response::Ok);
    let contents: HashMap<String, String> = bundle
        .contents
        .iter()
        .map(|c| (c.content_hash.clone(), c.content_bytes.clone()))
        .collect();
    assert_eq!(
        runtime.handle(Request::LoadContents { contents }),
        Response::Ok
    );
    runtime
}

#[test]
fn test_evaluate_sample_part() {
    let mut runtime = runtime_with_seed_bundle();
    assert_eq!(
        runtime.handle(Request::Evaluate {
            part_id: "sample.triangle-area".into()
        }),
        Response::Value {
            value: serde_json::json!(25)
        }
    );
    assert_eq!(
        runtime.handle(Request::MissingContents),
        Response::MissingContents { hashes: vec![] }
    );
}

#[test]
fn test_compile_part_self_hosted_definy_server_sample() {
    use base64::Engine as _;
    let mut runtime = runtime_with_seed_bundle();
    let response = runtime.handle(Request::CompilePart {
        part_id: "sample.self-hosted-definy-server".into(),
    });
    let Response::CompiledPart {
        wasm,
        cloudflare_worker_name,
        ..
    } = response
    else {
        panic!("unexpected response: {response:?}");
    };
    assert_eq!(cloudflare_worker_name.as_deref(), Some("self-definy"));
    let wasm_bytes = base64::engine::general_purpose::STANDARD
        .decode(wasm)
        .unwrap();
    assert_eq!(&wasm_bytes[..4], b"\0asm");
}
