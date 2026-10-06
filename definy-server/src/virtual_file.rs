use std::collections::HashMap;

use axum::{
    Router,
    body::Bytes,
    extract::{Path, State},
    http::{StatusCode, header},
    response::{IntoResponse, Response},
    routing::get,
};
use base64::Engine;
use sha2::Digest;

use crate::AppState;

/// 仮想ファイル（Wasm バイナリ等）のインメモリストア。
/// コンテンツハッシュに基づき、ディスクに物理出力することなくメモリ上から直接 HTTP 配信します。
#[derive(Debug, Default, Clone)]
pub struct VirtualFileStore {
    /// キー: ハッシュ（Base64 または Hex） -> Wasm バイト列
    entries: HashMap<String, Vec<u8>>,
}

impl VirtualFileStore {
    #[must_use]
    pub fn new() -> Self {
        Self {
            entries: HashMap::new(),
        }
    }

    /// Wasm バイナリを登録し、URL-safe Base64 ハッシュ（no pad）を返します。
    /// Hex 表現でもルックアップできるように両方をキーとして保持します。
    pub fn register_wasm(&mut self, bytes: Vec<u8>) -> String {
        let digest = sha2::Sha256::digest(&bytes);
        let base64_hash = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(digest);
        let hex_hash = hex::encode(digest);

        self.entries.insert(base64_hash.clone(), bytes.clone());
        self.entries.insert(hex_hash, bytes);

        base64_hash
    }

    /// ハッシュ文字列（Base64 または Hex）から Wasm バイト列を取得します。
    /// 末尾の `.wasm` 拡張子は自動的にトリムされます。
    #[must_use]
    pub fn get_wasm(&self, hash_or_name: &str) -> Option<Vec<u8>> {
        let clean = hash_or_name.strip_suffix(".wasm").unwrap_or(hash_or_name);
        self.entries.get(clean).cloned()
    }
}

/// 仮想ファイル配信ルーターを生成します。
pub fn router() -> Router<AppState> {
    Router::new().route("/virtual/wasm/{hash}", get(handle_get_virtual_wasm))
}

/// 仮想 WebAssembly バイナリ配信ハンドラ。
///
/// ハッシュに紐づく Wasm バイト列を `Content-Type: application/wasm`
/// および不変キャッシュヘッダー付きで即座に返却します。
#[utoipa::path(
    get,
    path = "/virtual/wasm/{hash}",
    params(
        ("hash" = String, Path, description = "Content hash of WebAssembly binary (with optional .wasm extension)")
    ),
    responses(
        (status = 200, description = "Virtual WebAssembly binary served successfully", content_type = "application/wasm"),
        (status = 404, description = "Wasm binary not found")
    ),
    tag = "virtual-files"
)]
pub async fn handle_get_virtual_wasm(
    State(state): State<AppState>,
    Path(hash): Path<String>,
) -> Response {
    let clean = hash.strip_suffix(".wasm").unwrap_or(&hash);

    // 1. 仮想ファイルストアからの検索
    if let Some(bytes) = state.virtual_file_store.read().await.get_wasm(clean) {
        return serve_wasm_bytes(bytes);
    }

    // 2. definy クライアント Wasm のフォールバック解決
    if let Some(client_wasm) = crate::resolve_client_wasm()
        && (clean == client_wasm.hash || clean == "definy_client_bg" || clean == "definy_client")
    {
        return serve_wasm_bytes(client_wasm.bytes);
    }

    (
        StatusCode::NOT_FOUND,
        [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
        "Virtual WebAssembly binary not found for specified hash",
    )
        .into_response()
}

fn serve_wasm_bytes(bytes: Vec<u8>) -> Response {
    (
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "application/wasm"),
            (header::CACHE_CONTROL, "public, max-age=31536000, immutable"),
        ],
        Bytes::from(bytes),
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Request;
    use tower::ServiceExt;

    // 最小の有効な WebAssembly バイナリヘッダー: \0asm\1\0\0\0
    const MINIMAL_WASM: &[u8] = &[0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];

    #[tokio::test]
    async fn test_virtual_file_store_registration_and_lookup() {
        let mut store = VirtualFileStore::new();
        let b64_hash = store.register_wasm(MINIMAL_WASM.to_vec());

        // Base64 ハッシュでの取得 (.wasm 拡張子の有無両方)
        assert_eq!(store.get_wasm(&b64_hash).as_deref(), Some(MINIMAL_WASM));
        assert_eq!(
            store.get_wasm(&format!("{b64_hash}.wasm")).as_deref(),
            Some(MINIMAL_WASM)
        );

        // Hex ハッシュでの取得
        let hex_hash = hex::encode(sha2::Sha256::digest(MINIMAL_WASM));
        assert_eq!(store.get_wasm(&hex_hash).as_deref(), Some(MINIMAL_WASM));
        assert_eq!(
            store.get_wasm(&format!("{hex_hash}.wasm")).as_deref(),
            Some(MINIMAL_WASM)
        );

        // 存在しないハッシュ
        assert!(store.get_wasm("nonexistent").is_none());
    }

    #[tokio::test]
    async fn test_virtual_wasm_http_endpoint_success() {
        let state = AppState::test_state();
        let hash = state
            .virtual_file_store
            .write()
            .await
            .register_wasm(MINIMAL_WASM.to_vec());

        let router = crate::create_router(state, crate::mcp::McpSessionManager::new());

        let req = Request::builder()
            .uri(format!("/virtual/wasm/{hash}.wasm"))
            .method("GET")
            .body(axum::body::Body::empty())
            .unwrap();

        let res = router.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        assert_eq!(
            res.headers().get(header::CONTENT_TYPE).unwrap(),
            "application/wasm"
        );
        assert_eq!(
            res.headers().get(header::CACHE_CONTROL).unwrap(),
            "public, max-age=31536000, immutable"
        );

        let body = axum::body::to_bytes(res.into_body(), usize::MAX)
            .await
            .unwrap();
        assert_eq!(body.as_ref(), MINIMAL_WASM);
    }

    #[tokio::test]
    async fn test_virtual_wasm_http_endpoint_not_found() {
        let app = crate::create_test_router();

        let req = Request::builder()
            .uri("/virtual/wasm/unknown-hash-12345.wasm")
            .method("GET")
            .body(axum::body::Body::empty())
            .unwrap();

        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }

    /// 汎用 WASI runner (wasmtime runner) が起動時に仮想 Wasm を
    /// HTTP 取得し、整合性（SHA-256）と Wasm ヘッダーを検証してロードするシミュレーションテスト
    #[tokio::test]
    async fn test_runner_fetch_and_verify_simulation() {
        let state = AppState::test_state();

        // 1. definy-server 側で Wasm バイナリを登録
        let expected_wasm = MINIMAL_WASM.to_vec();
        let target_hash = state
            .virtual_file_store
            .write()
            .await
            .register_wasm(expected_wasm.clone());

        let router = crate::create_router(state, crate::mcp::McpSessionManager::new());

        // 2. runner (クライアント) が環境変数 DEFINY_SERVER_URL / DEFINY_WASM_HASH に基づいてフェッチ
        let fetch_uri = format!("/virtual/wasm/{target_hash}.wasm");
        let fetch_req = Request::builder()
            .uri(fetch_uri)
            .method("GET")
            .body(axum::body::Body::empty())
            .unwrap();

        let fetch_res = router.oneshot(fetch_req).await.unwrap();
        assert_eq!(fetch_res.status(), StatusCode::OK);

        let downloaded_bytes = axum::body::to_bytes(fetch_res.into_body(), 10 * 1024 * 1024)
            .await
            .unwrap();

        // 3. runner 側での整合性検証: ダウンロードしたバイト列のハッシュが期待値と一致するか
        let computed_digest = sha2::Sha256::digest(&downloaded_bytes);
        let computed_b64 = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(computed_digest);
        assert_eq!(computed_b64, target_hash);

        // 4. WebAssembly マジックナンバー (\0asm) のヘッダー検証
        assert!(downloaded_bytes.starts_with(b"\0asm"));
        assert_eq!(downloaded_bytes.as_ref(), expected_wasm.as_slice());
    }
}
