//! Cloudflare Workers で definy のパーツを実行するための Wasm モジュール。
//!
//! Workers は実行時に生成した Wasm をコンパイルできないため、definy-core の Wasm コンパイラと
//! Wasm インタプリタ（wasmi）をまとめてこのモジュールにし、Worker に事前アップロードします。
//! 式の評価は Rust サーバーと同じく「Wasm にコンパイル → 実行」で行うので、評価器の実装は 1 つです。
//!
//! JavaScript とのやりとりは JSON（[`Request`] / [`Response`]）で、[`Runtime::handle`] が処理します。
//! wasm32 では C ABI の `definy_alloc` / `definy_free` / `definy_call` をエクスポートします
//! （TypeScript 側は `worker/definy_runtime.ts`）。

use std::collections::HashMap;

use base64::Engine as _;
use definy_core::EventWithHash;
use definy_event::EventHashId;
use definy_event::event::{EventContent, Expression};

fn b64_encode(bytes: &[u8]) -> String {
    base64::engine::general_purpose::STANDARD.encode(bytes)
}

fn b64_decode(text: &str) -> Result<Vec<u8>, String> {
    base64::engine::general_purpose::STANDARD
        .decode(text)
        .map_err(|e| format!("invalid base64: {e}"))
}

/// JavaScript から送られる要求
#[derive(Debug, serde::Deserialize)]
#[serde(tag = "op", rename_all = "camelCase")]
pub enum Request {
    /// 署名付きイベント（base64）を読み込む。読み込み済みのものは無視する。
    LoadEvents { events: Vec<String> },
    /// CAS のコンテンツ（式の CBOR、base64）を読み込む。
    LoadContents { contents: HashMap<String, String> },
    /// 読み込んだイベントのパーツが参照しているが、まだ読み込まれていないコンテンツのハッシュ一覧。
    MissingContents,
    /// パーツを評価して値を返す（JSON 表現）。
    #[serde(rename_all = "camelCase")]
    Evaluate { part_id: String },
    /// パーツ（またはその `definy.deploy` ハンドラ）を Wasm バイナリにコンパイルして base64 で返す。
    #[serde(rename_all = "camelCase")]
    CompilePart { part_id: String },
    /// 式（`Expression` の JSON 表現）を評価して値を返す。読み込んだイベントのパーツを参照できる。
    EvaluateExpression { expression: Box<Expression> },
}

/// JavaScript へ返す応答
#[derive(Debug, PartialEq, serde::Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Response {
    Ok,
    MissingContents {
        hashes: Vec<String>,
    },
    Value {
        value: serde_json::Value,
    },
    #[serde(rename_all = "camelCase")]
    CompiledPart {
        wasm: String,
        cloudflare_worker_name: Option<String>,
        cloudflare_token: Option<String>,
        evaluated_result: Option<String>,
    },
    Error {
        message: String,
    },
}

/// 読み込んだイベント・コンテンツを保持する実行環境。
///
/// Worker の isolate が生きている間は同じインスタンスを使い回すので、イベントの検証・デコードは
/// 1 回だけで済みます。
#[derive(Default)]
pub struct Runtime {
    events: Vec<EventWithHash>,
    event_hashes: std::collections::HashSet<EventHashId>,
    contents: HashMap<String, Expression>,
}

impl Runtime {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// JSON の要求を処理して JSON の応答を返します。
    pub fn handle_json(&mut self, request: &[u8]) -> Vec<u8> {
        let response = match serde_json::from_slice::<Request>(request) {
            Ok(request) => self.handle(request),
            Err(error) => Response::Error {
                message: format!("invalid request: {error}"),
            },
        };
        serde_json::to_vec(&response).unwrap_or_else(|error| {
            format!(r#"{{"type":"error","message":"failed to encode response: {error}"}}"#)
                .into_bytes()
        })
    }

    /// 要求を処理します。
    pub fn handle(&mut self, request: Request) -> Response {
        self.try_handle(request)
            .unwrap_or_else(|message| Response::Error { message })
    }

    fn try_handle(&mut self, request: Request) -> Result<Response, String> {
        match request {
            Request::LoadEvents { events } => {
                for event in events {
                    self.load_event(&b64_decode(&event)?);
                }
                self.events.sort_by_key(|(_hash, result)| {
                    result.as_ref().ok().map(|(_sig, event)| event.time)
                });
                self.hydrate_events();
                Ok(Response::Ok)
            }
            Request::LoadContents { contents } => {
                for (hash, bytes) in contents {
                    let expression: Expression = serde_cbor::from_slice(&b64_decode(&bytes)?)
                        .map_err(|e| format!("content {hash} is not an expression: {e}"))?;
                    self.contents.insert(hash, expression);
                }
                self.hydrate_events();
                Ok(Response::Ok)
            }
            Request::MissingContents => Ok(Response::MissingContents {
                hashes: self.missing_contents(),
            }),
            Request::Evaluate { part_id } => {
                let expression = self.find_expression(&part_id)?;
                let wasm = definy_core::wasm_emitter::compile_expression_to_wasm(
                    &expression,
                    &self.events,
                )?;
                let value = definy_core::wasm_emitter::wasmi_backend::execute_wasm(&wasm)?;
                Ok(Response::Value {
                    value: value_to_json(&value),
                })
            }
            Request::CompilePart { part_id } => {
                let raw_expression = self.find_expression(&part_id)?;
                let detected = definy_core::detect_deploy_in_expression(&raw_expression);
                let target_expression = definy_core::http_app::resolve_http_handler(raw_expression);
                let wasm = definy_core::wasm_emitter::compile_expression_to_wasm(
                    &target_expression,
                    &self.events,
                )?;
                let evaluated_result =
                    definy_core::wasm_emitter::wasmi_backend::execute_wasm(&wasm)
                        .ok()
                        .map(|val| match val {
                            definy_core::Value::String(s) => s,
                            other => other.to_string(),
                        });
                Ok(Response::CompiledPart {
                    wasm: b64_encode(&wasm),
                    cloudflare_worker_name: detected
                        .as_ref()
                        .map(|d| d.cloudflare_worker_name.clone()),
                    cloudflare_token: detected.and_then(|d| d.cloudflare_token),
                    evaluated_result,
                })
            }
            Request::EvaluateExpression { expression } => {
                let wasm = definy_core::wasm_emitter::compile_expression_to_wasm(
                    &expression,
                    &self.events,
                )?;
                let value = definy_core::wasm_emitter::wasmi_backend::execute_wasm(&wasm)?;
                Ok(Response::Value {
                    value: value_to_json(&value),
                })
            }
        }
    }

    /// パーツ ID・`module.part`・パーツ名、または読み込んだコンテンツのハッシュから式を探します。
    fn find_expression(&self, part_id: &str) -> Result<Expression, String> {
        definy_core::http_app::find_part_expression(part_id, &self.events)
            .or_else(|error| self.contents.get(part_id.trim()).cloned().ok_or(error))
    }

    fn load_event(&mut self, bytes: &[u8]) {
        let hash = EventHashId::from_bytes(bytes);
        if self.event_hashes.insert(hash.clone()) {
            self.events
                .push((hash, definy_event::verify_and_deserialize(bytes)));
        }
    }

    fn missing_contents(&self) -> Vec<String> {
        let mut missing = Vec::new();
        for (_hash, result) in &self.events {
            let Ok((_sig, event)) = result else { continue };
            let EventContent::ModuleCommit(commit) = &event.content else {
                continue;
            };
            for part in &commit.parts {
                if part.expression.is_some() {
                    continue;
                }
                if let Some(content_hash) = &part.content_hash {
                    let key = content_hash.to_string();
                    if !self.contents.contains_key(&key) && !missing.contains(&key) {
                        missing.push(key);
                    }
                }
            }
        }
        missing
    }

    /// content hash だけのパーツの式を、読み込んだコンテンツで埋めます。
    fn hydrate_events(&mut self) {
        for (_hash, result) in &mut self.events {
            let Ok((_sig, event)) = result else { continue };
            let EventContent::ModuleCommit(commit) = &mut event.content else {
                continue;
            };
            for part in &mut commit.parts {
                if part.expression.is_none()
                    && let Some(content_hash) = &part.content_hash
                {
                    part.expression = self.contents.get(&content_hash.to_string()).cloned();
                }
            }
        }
    }
}

/// 評価結果の値を JSON にします（適合テストの期待値と同じ正規化表現）。
#[must_use]
pub fn value_to_json(value: &definy_core::Value) -> serde_json::Value {
    use definy_core::Value;
    match value {
        Value::Number(n) => serde_json::json!(n),
        Value::String(s) => serde_json::json!(s),
        Value::Bool(b) => serde_json::json!(b),
        Value::List(items) => serde_json::Value::Array(items.iter().map(value_to_json).collect()),
        Value::Record(fields) => serde_json::json!({
            "$record": fields
                .iter()
                .map(|(key, item)| serde_json::json!([key, value_to_json(item)]))
                .collect::<Vec<_>>()
        }),
        Value::Function => serde_json::json!({ "$function": true }),
        Value::Variant { tag, payload } => serde_json::json!({
            "$variant": tag,
            "payload": payload.as_deref().map_or(serde_json::Value::Null, value_to_json),
        }),
    }
}

#[cfg(target_arch = "wasm32")]
mod ffi {
    //! JavaScript から呼ぶ C ABI。メモリは `definy_alloc` で確保し、`definy_call` の戻り値は
    //! 「先頭 4 バイトが長さ (LE) + JSON」のバッファで、`definy_free(ptr, 4 + len)` で解放する。

    use super::Runtime;
    use std::cell::RefCell;

    thread_local! {
        static RUNTIME: RefCell<Runtime> = RefCell::new(Runtime::new());
    }

    /// `len` バイトのバッファを確保してポインタを返す。
    #[unsafe(no_mangle)]
    pub extern "C" fn definy_alloc(len: usize) -> *mut u8 {
        let mut buffer = Vec::<u8>::with_capacity(len);
        let ptr = buffer.as_mut_ptr();
        std::mem::forget(buffer);
        ptr
    }

    /// `definy_alloc` または `definy_call` が返したバッファを解放する。
    ///
    /// # Safety
    ///
    /// `ptr` は `definy_alloc(len)` が返したポインタ、または `definy_call` が返したポインタ
    /// （`len` は 4 + JSON の長さ）であること。
    #[unsafe(no_mangle)]
    pub unsafe extern "C" fn definy_free(ptr: *mut u8, len: usize) {
        if !ptr.is_null() {
            // SAFETY: 呼び出し側の契約により、ptr は容量 len で確保した Vec のポインタ
            drop(unsafe { Vec::from_raw_parts(ptr, 0, len) });
        }
    }

    /// JSON の要求（`ptr` から `len` バイト）を処理し、応答のバッファを返す。
    ///
    /// # Safety
    ///
    /// `ptr` から `len` バイトが読み取り可能であること。
    #[unsafe(no_mangle)]
    pub unsafe extern "C" fn definy_call(ptr: *const u8, len: usize) -> *mut u8 {
        // SAFETY: 呼び出し側の契約により ptr..ptr+len は有効
        let request = unsafe { std::slice::from_raw_parts(ptr, len) };
        let response = RUNTIME.with(|runtime| runtime.borrow_mut().handle_json(request));
        let mut buffer = Vec::with_capacity(4 + response.len());
        buffer.extend_from_slice(&(response.len() as u32).to_le_bytes());
        buffer.extend_from_slice(&response);
        let ptr = buffer.as_mut_ptr();
        std::mem::forget(buffer);
        ptr
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_invalid_request_returns_error() {
        let mut runtime = Runtime::new();
        let response: serde_json::Value =
            serde_json::from_slice(&runtime.handle_json(b"{\"op\":\"nope\"}")).unwrap();
        assert_eq!(response["type"], "error");
    }

    #[test]
    fn test_unknown_part_is_error() {
        let mut runtime = Runtime::new();
        let response = runtime.handle(Request::Evaluate {
            part_id: "sample.missing".into(),
        });
        assert!(matches!(response, Response::Error { .. }));
    }

    #[test]
    fn test_missing_contents_is_empty_without_events() {
        let mut runtime = Runtime::new();
        assert_eq!(
            runtime.handle(Request::MissingContents),
            Response::MissingContents { hashes: vec![] }
        );
    }
}
