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

fn read_body(runtime: &mut Runtime, handle: u32) -> Vec<u8> {
    use base64::Engine as _;
    let mut body = Vec::new();
    loop {
        match runtime.handle(Request::HttpPull { handle }) {
            Response::HttpChunk { chunk: Some(chunk) } => body.extend(
                base64::engine::general_purpose::STANDARD
                    .decode(chunk)
                    .unwrap(),
            ),
            Response::HttpChunk { chunk: None } => return body,
            other => panic!("unexpected response: {other:?}"),
        }
    }
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
fn test_http_self_hosted_definy_server_sample() {
    let mut runtime = runtime_with_seed_bundle();
    let response = runtime.handle(Request::HttpStart {
        part_id: "sample.self-hosted-definy-server".into(),
        method: "GET".into(),
        url: "http://self-definy.localhost:8000/healthz".into(),
        headers: vec![("host".into(), "self-definy.localhost:8000".into())],
        body: String::new(),
    });
    let Response::HttpStarted { handle, status, .. } = response else {
        panic!("unexpected response: {response:?}");
    };
    assert_eq!(status, 200);
    let body: serde_json::Value = serde_json::from_slice(&read_body(&mut runtime, handle)).unwrap();
    assert_eq!(body["status"], "ok");
    assert_eq!(body["service"], "self-hosted-definy-server");

    // 読み終わったストリームは破棄されている
    assert!(matches!(
        runtime.handle(Request::HttpPull { handle }),
        Response::Error { .. }
    ));
}
