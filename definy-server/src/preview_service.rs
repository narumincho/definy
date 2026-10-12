//! Web アプリケーションのプレビュー実行機能 (localhost 的なインサーバー実行環境)。
//! サーバー起動時に指定した管理者 (`DEFINY_ADMIN_ACCOUNT_ID`) のみ実行可能とし、
//! クラウド環境やローカル開発環境でアプリごとのサブドメインまたはパスプレフィックス `/preview/:app_id/*` でホストします。

use std::collections::HashMap;

use axum::body::{Body, Bytes};
use axum::extract::{Path, State};
use axum::http::{HeaderMap, Method, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use chrono::Utc;
use definy_event::event::Expression;
use definy_event::rpc::*;

use crate::AppState;
use crate::connect_rpc::{
    ContentCodec, decode_request, encode_response_or_error, error_to_response,
};

/// 登録されたプレビューアプリ情報
#[derive(Clone, Debug)]
pub struct PreviewApp {
    pub app_id: String,
    pub display_name: String,
    pub part_id: String,
    pub owner_account_id: String,
    pub created_at: chrono::DateTime<Utc>,
    pub subdomain: String,
    pub wasm_bytes: Option<Vec<u8>>,
    pub cached_expression: Option<Expression>,
}

/// プレビューアプリをインメモリ管理するストア
#[derive(Default, Debug)]
pub struct PreviewAppStore {
    apps: HashMap<String, PreviewApp>,
}

impl PreviewAppStore {
    #[must_use]
    pub fn new() -> Self {
        Self {
            apps: HashMap::new(),
        }
    }

    /// プレビューアプリを登録または更新
    pub fn register(&mut self, app: PreviewApp) {
        self.apps.insert(app.app_id.clone(), app);
    }

    /// プレビューアプリを取得
    #[must_use]
    pub fn get(&self, app_id: &str) -> Option<&PreviewApp> {
        self.apps.get(app_id)
    }

    /// 登録済みの全プレビューアプリを取得
    #[must_use]
    pub fn list(&self) -> Vec<PreviewApp> {
        let mut list: Vec<PreviewApp> = self.apps.values().cloned().collect();
        list.sort_by_key(|a| std::cmp::Reverse(a.created_at));
        list
    }

    /// プレビューアプリを停止・削除
    pub fn remove(&mut self, app_id: &str) -> Option<PreviewApp> {
        self.apps.remove(app_id)
    }

    /// セルフホスト版 definy Studio (`self-definy`) をデフォルト起動アプリとして登録します
    pub fn register_default_self_hosted_app(&mut self, owner_account_id: &str) {
        self.register(PreviewApp {
            app_id: "self-definy".to_string(),
            display_name: "Self-Hosted definy Studio (definy in definy)".to_string(),
            part_id: "sample.self-hosted-definy-server".to_string(),
            owner_account_id: owner_account_id.to_string(),
            created_at: Utc::now(),
            subdomain: "self-definy".to_string(),
            wasm_bytes: None,
            cached_expression: None,
        });
    }
}

/// 起動時環境変数 `DEFINY_ADMIN_ACCOUNT_ID`（または `DEFINY_ADMIN_ACCOUNT_IDS`）と照合し、
/// 要求元アカウントが管理者権限を持つか判定します。未設定時は安全のため全員拒否します。
#[must_use]
pub fn is_admin_account(account_id_str: &str) -> bool {
    let admin_env = std::env::var("DEFINY_ADMIN_ACCOUNT_ID")
        .or_else(|_| std::env::var("DEFINY_ADMIN_ACCOUNT_IDS"))
        .unwrap_or_default();

    let trimmed = account_id_str.trim().to_lowercase();
    if trimmed.is_empty() {
        return false;
    }

    for admin in admin_env.split([',', ' ', ';']) {
        let admin_trimmed = admin.trim().to_lowercase();
        if !admin_trimmed.is_empty() && (admin_trimmed == "*" || admin_trimmed == trimmed) {
            return true;
        }
    }
    false
}

/// サーバーのベースルートドメインを決定します。
#[must_use]
pub fn get_root_domain() -> String {
    if let Ok(domain) = std::env::var("DEFINY_ROOT_DOMAIN") {
        let d = domain.trim();
        if !d.is_empty() {
            return d.to_string();
        }
    }
    "localhost:8000".to_string()
}

/// サブドメインURLを構築します
#[must_use]
pub fn build_preview_url(subdomain: &str) -> String {
    let root = get_root_domain();
    if root.starts_with("localhost") || root.contains("127.0.0.1") {
        format!("http://{subdomain}.{root}")
    } else {
        let clean_root = root
            .split(':')
            .next()
            .unwrap_or(&root)
            .trim()
            .to_lowercase();
        let use_hyphen =
            !clean_root.ends_with(".workers.dev") && clean_root.split('.').count() >= 3;
        if use_hyphen {
            format!("https://{subdomain}-{root}")
        } else {
            format!("https://{subdomain}.{root}")
        }
    }
}

/// パスベースURLを構築します
#[must_use]
pub fn build_path_url(app_id: &str) -> String {
    let root = get_root_domain();
    let protocol = if root.starts_with("localhost") || root.contains("127.0.0.1") {
        "http"
    } else {
        "https"
    };
    format!("{protocol}://{root}/preview/{app_id}/")
}

/// HTTP の Host ヘッダーからサブドメイン名を抽出します。
/// 例: `my-app-definy.narumincho.com` -> Some("my-app")
/// 例: `my-app.localhost:8000` -> Some("my-app")
/// 例: `my-app.definy.workers.dev` -> Some("my-app")
/// ルートドメインそのものや無関係なホスト名の場合は None を返します。
#[must_use]
pub fn extract_subdomain_from_host(host: &str) -> Option<String> {
    let host_without_port = host.split(':').next().unwrap_or(host).trim().to_lowercase();

    // 1. *.localhost 判定
    if let Some(sub) = host_without_port.strip_suffix(".localhost")
        && !sub.is_empty()
        && !sub.contains('.')
    {
        return Some(sub.to_string());
    }

    // 2. ルートドメイン判定
    let root_domain = get_root_domain();
    let root_without_port = root_domain
        .split(':')
        .next()
        .unwrap_or(&root_domain)
        .trim()
        .to_lowercase();

    let hyphen_suffix = format!("-{root_without_port}");
    if let Some(sub) = host_without_port.strip_suffix(&hyphen_suffix)
        && !sub.is_empty()
        && !sub.contains('.')
    {
        return Some(sub.to_string());
    }

    let expected_suffix = format!(".{root_without_port}");
    if let Some(sub) = host_without_port.strip_suffix(&expected_suffix)
        && !sub.is_empty()
        && !sub.contains('.')
    {
        return Some(sub.to_string());
    }

    None
}

/// Connect-RPC: RegisterPreviewApp
#[utoipa::path(
    post,
    path = "/definy.v1.PreviewService/RegisterPreviewApp",
    tag = "connect-rpc",
    request_body(
        content = RegisterPreviewAppRequest,
        content_type = "application/json",
        description = "Connect-RPC RegisterPreviewApp request payload"
    ),
    responses(
        (status = 200, description = "Connect-RPC RegisterPreviewApp response", body = RegisterPreviewAppResponse, content_type = "application/json"),
        (status = 400, description = "Bad Request", body = ConnectError, content_type = "application/json"),
        (status = 403, description = "Forbidden (Admin Only)", body = ConnectError, content_type = "application/json")
    )
)]
pub async fn handle_register_preview_app(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: RegisterPreviewAppRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    let app_id = req.app_id.trim().to_lowercase();
    if app_id.is_empty()
        || !app_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return error_to_response(ConnectError::invalid_argument(
            "app_id must be non-empty and contain only ascii alphanumeric, hyphen or underscore",
        ));
    }

    // 管理者ユーザー権限チェック
    if !is_admin_account(&req.account_id) {
        eprintln!(
            "Permission denied: account '{}' is not registered in DEFINY_ADMIN_ACCOUNT_ID",
            req.account_id
        );
        return error_to_response(ConnectError::permission_denied(
            "Only admin users specified in DEFINY_ADMIN_ACCOUNT_ID environment variable are allowed to start preview apps",
        ));
    }

    let subdomain = app_id.clone();
    let preview_url = build_preview_url(&subdomain);
    let path_url = build_path_url(&app_id);

    // Wasm バイト列の準備 (指定されている場合)
    let wasm_bytes = if let Some(ref wasm_hash) = req.wasm_hash {
        let store = state.virtual_file_store.read().await;
        store.get_wasm(wasm_hash)
    } else {
        None
    };

    let preview_app = PreviewApp {
        app_id: app_id.clone(),
        display_name: if req.display_name.is_empty() {
            app_id.clone()
        } else {
            req.display_name.clone()
        },
        part_id: req.part_id.clone(),
        owner_account_id: req.account_id.clone(),
        created_at: Utc::now(),
        subdomain: subdomain.clone(),
        wasm_bytes,
        cached_expression: None,
    };

    {
        let mut store = state.preview_store.write().await;
        store.register(preview_app);
    }

    let res = RegisterPreviewAppResponse {
        app_id,
        preview_url,
        path_url,
        status: "running".to_string(),
        subdomain,
    };

    encode_response_or_error(codec, &res)
}

/// Connect-RPC: ListPreviewApps
#[utoipa::path(
    post,
    path = "/definy.v1.PreviewService/ListPreviewApps",
    tag = "connect-rpc",
    request_body(
        content = ListPreviewAppsRequest,
        content_type = "application/json",
        description = "Connect-RPC ListPreviewApps request payload"
    ),
    responses(
        (status = 200, description = "Connect-RPC ListPreviewApps response", body = ListPreviewAppsResponse, content_type = "application/json")
    )
)]
pub async fn handle_list_preview_apps(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: ListPreviewAppsRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    let apps = {
        let store = state.preview_store.read().await;
        store.list()
    };

    let filter_account = req.account_id.as_deref().map(str::trim);

    let items: Vec<PreviewAppItem> = apps
        .into_iter()
        .filter(|app| {
            if let Some(filter) = filter_account
                && !filter.is_empty()
            {
                return app.owner_account_id.eq_ignore_ascii_case(filter);
            }
            true
        })
        .map(|app| PreviewAppItem {
            preview_url: build_preview_url(&app.subdomain),
            path_url: build_path_url(&app.app_id),
            app_id: app.app_id,
            display_name: app.display_name,
            part_id: app.part_id,
            owner_account_id: app.owner_account_id,
            created_at_rfc3339: app.created_at.to_rfc3339(),
            status: "running".to_string(),
            subdomain: app.subdomain,
        })
        .collect();

    let res = ListPreviewAppsResponse { apps: items };
    encode_response_or_error(codec, &res)
}

/// Connect-RPC: StopPreviewApp
#[utoipa::path(
    post,
    path = "/definy.v1.PreviewService/StopPreviewApp",
    tag = "connect-rpc",
    request_body(
        content = StopPreviewAppRequest,
        content_type = "application/json",
        description = "Connect-RPC StopPreviewApp request payload"
    ),
    responses(
        (status = 200, description = "Connect-RPC StopPreviewApp response", body = StopPreviewAppResponse, content_type = "application/json"),
        (status = 403, description = "Forbidden (Admin Only)", body = ConnectError, content_type = "application/json"),
        (status = 404, description = "Not Found", body = ConnectError, content_type = "application/json")
    )
)]
pub async fn handle_stop_preview_app(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: StopPreviewAppRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    // 管理者ユーザー権限チェック
    if !is_admin_account(&req.account_id) {
        return error_to_response(ConnectError::permission_denied(
            "Only admin users specified in DEFINY_ADMIN_ACCOUNT_ID environment variable are allowed to stop preview apps",
        ));
    }

    let removed = {
        let mut store = state.preview_store.write().await;
        store.remove(&req.app_id)
    };

    match removed {
        Some(_) => {
            let res = StopPreviewAppResponse {
                success: true,
                message: format!("Preview app '{}' stopped successfully", req.app_id),
            };
            encode_response_or_error(codec, &res)
        }
        None => error_to_response(ConnectError::not_found(format!(
            "Preview app '{}' not found",
            req.app_id
        ))),
    }
}

/// パスルーティングハンドラー: `/preview/:app_id`
pub async fn handle_preview_path_root(
    State(state): State<AppState>,
    Path(app_id): Path<String>,
    method: Method,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let uri = Uri::from_static("/");
    execute_preview_app(&state, &app_id, &uri, &method, &headers, &body).await
}

/// パスルーティングハンドラー: `/preview/:app_id/*subpath`
pub async fn handle_preview_path_subpath(
    State(state): State<AppState>,
    Path((app_id, subpath)): Path<(String, String)>,
    method: Method,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let path_str = if subpath.starts_with('/') {
        subpath
    } else {
        format!("/{subpath}")
    };
    let uri: Uri = path_str.parse().unwrap_or_else(|_| Uri::from_static("/"));
    execute_preview_app(&state, &app_id, &uri, &method, &headers, &body).await
}

async fn load_verified_events_for_preview(
    state: &AppState,
) -> Vec<crate::self_hosted_wasm_compiler::VerifiedCommitEvent> {
    if let Some(db) = crate::ensure_db(state).await
        && let Ok(events) = crate::db::get_events(&db, None, Some(500), Some(0)).await
    {
        let mut verified = Vec::new();
        // db::get_events returns ORDER BY time DESC (newest first); reverse so newest is last
        for bytes in events.into_vec().into_iter().rev() {
            let hash = definy_event::EventHashId::from_bytes(&bytes);
            let mut decoded = definy_event::verify_and_deserialize(&bytes);
            if let Ok((_sig, ref mut event)) = decoded
                && let definy_event::event::EventContent::ModuleCommit(ref mut mc) = event.content
            {
                for part in &mut mc.parts {
                    if part.expression.is_none()
                        && let Some(ref ch) = part.content_hash
                        && let Ok(Some(content_bytes)) =
                            crate::db::get_content(&db, &ch.to_string()).await
                        && let Ok(expr) = serde_cbor::from_slice::<Expression>(&content_bytes)
                    {
                        part.expression = Some(expr);
                    }
                }
            }
            verified.push((hash, decoded));
        }
        if !verified.is_empty() {
            return verified;
        }
    }
    crate::builtin_migration::build_builtin_verified_events()
}

/// サブドメインまたはパスプレフィックスからディスパッチされたプレビューアプリを実行します。
pub async fn execute_preview_app(
    state: &AppState,
    app_id: &str,
    uri: &Uri,
    method: &Method,
    headers: &HeaderMap,
    body: &Bytes,
) -> Response {
    let app = {
        let store = state.preview_store.read().await;
        store.get(app_id).cloned()
    };

    let app = match app {
        Some(a) => a,
        None => {
            return (
                StatusCode::NOT_FOUND,
                [("Content-Type", "text/html; charset=utf-8")],
                format!(
                    "<!DOCTYPE html><html><head><title>Preview App Not Found</title></head><body>\
                    <h1>404 Preview App Not Found</h1>\
                    <p>No active preview application registered for <code>{app_id}</code>.</p>\
                    </body></html>"
                ),
            )
                .into_response();
        }
    };

    // 1. Wasm バイナリが存在する場合は Wasmtime でストリーム実行
    if let Some(ref wasm) = app.wasm_bytes {
        match definy_core::wasm_emitter::execute_wasm_http_response(wasm) {
            Ok(evaluated) => return evaluated_http_response_to_axum_response(evaluated, app_id),
            Err(err) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    [("Content-Type", "text/plain; charset=utf-8")],
                    format!("Error executing Wasm for preview app '{app_id}': {err}"),
                )
                    .into_response();
            }
        }
    }

    let verified_events = load_verified_events_for_preview(state).await;

    // 2. part_id から式を探索して評価
    let expression = if let Some(ref expr) = app.cached_expression {
        Some(expr.clone())
    } else if let Ok(expr) = crate::self_hosted_wasm_compiler::find_part_expression_in_events(
        &app.part_id,
        &verified_events,
    ) {
        Some(expr)
    } else if let Some(db) = crate::ensure_db(state).await
        && let Ok(Some(content_bytes)) = crate::db::get_content(&db, app.part_id.trim()).await
        && let Ok(expr) = serde_cbor::from_slice::<Expression>(&content_bytes)
    {
        Some(expr)
    } else {
        None
    };

    if let Some(expr) = expression {
        let host = headers
            .get("host")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("localhost:8000");
        let full_url = format!("http://{host}{uri}");
        let header_pairs: Vec<(String, String)> = headers
            .iter()
            .filter_map(|(name, val)| {
                val.to_str()
                    .ok()
                    .map(|v| (name.as_str().to_string(), v.to_string()))
            })
            .collect();

        match crate::self_hosted_wasm_compiler::evaluate_part_expression_for_http_request_stream(
            &expr,
            &verified_events,
            method.as_str(),
            &full_url,
            &header_pairs,
            body.as_ref(),
        ) {
            Ok(evaluated) => evaluated_http_response_to_axum_response(evaluated, app_id),
            Err(err) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                [("Content-Type", "text/plain; charset=utf-8")],
                format!(
                    "Error executing part '{}' for preview app '{app_id}': {err}",
                    app.part_id
                ),
            )
                .into_response(),
        }
    } else {
        // デモ用 / フォールバックレスポンス: プレビュー稼働中の状態確認画面
        (
            StatusCode::OK,
            [
                ("Content-Type", "text/html; charset=utf-8"),
                ("X-Definy-Preview-App", app_id),
            ],
            format!(
                "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Preview: {}</title>\
                <style>body {{ font-family: sans-serif; padding: 2rem; background: #0f172a; color: #f8fafc; }} \
                .card {{ background: #1e293b; border-radius: 8px; padding: 1.5rem; max-width: 600px; margin: 0 auto; border: 1px solid #334155; }} \
                h1 {{ color: #38bdf8; margin-top: 0; }} code {{ background: #0f172a; padding: 2px 6px; border-radius: 4px; }}</style>\
                </head><body>\
                <div class=\"card\">\
                <h1>🚀 definy Preview Server</h1>\
                <p>Application <strong>{}</strong> (<code>{}</code>) is live!</p>\
                <p>Path: <code>{}</code></p>\
                <p>Owner: <code>{}</code></p>\
                <p>Target Part: <code>{}</code></p>\
                </div></body></html>",
                app.display_name,
                app.display_name,
                app.app_id,
                uri.path(),
                app.owner_account_id,
                app.part_id
            ),
        )
            .into_response()
    }
}

/// Wasm インスタンス内の Pull 型ストリーム (`{ initialState, next }`) を
/// Axum の `Body::from_stream` 用の `tokio_stream::Stream` に変換するアダプタ。
struct WasmBodyStream(definy_core::wasm_emitter::WasmPullStream);

impl tokio_stream::Stream for WasmBodyStream {
    type Item = Result<Bytes, std::io::Error>;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        _cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        match self.0.pull_next_chunk() {
            Ok(Some(chunk)) => std::task::Poll::Ready(Some(Ok(Bytes::from(chunk)))),
            Ok(None) => std::task::Poll::Ready(None),
            Err(err) => std::task::Poll::Ready(Some(Err(std::io::Error::other(err)))),
        }
    }
}

/// 評価された純粋関数型 HTTP レスポンス (`{ status, headers, body }`) を
/// Axum のストリーミング `Response` にマッピングします。
fn evaluated_http_response_to_axum_response(
    evaluated: definy_core::wasm_emitter::EvaluatedHttpResponse,
    app_id: &str,
) -> Response {
    let status_code = StatusCode::from_u16(evaluated.status).unwrap_or(StatusCode::OK);

    let mut header_map = HeaderMap::new();
    if let Ok(app_val) = axum::http::HeaderValue::from_str(app_id) {
        header_map.insert(
            axum::http::HeaderName::from_static("x-definy-preview-app"),
            app_val,
        );
    }

    for (name, val) in evaluated.headers {
        if let (Ok(h_name), Ok(h_val)) = (
            axum::http::HeaderName::from_bytes(name.trim().as_bytes()),
            axum::http::HeaderValue::from_str(&val),
        ) {
            header_map.append(h_name, h_val);
        }
    }

    let body = Body::from_stream(WasmBodyStream(evaluated.body_stream));
    (status_code, header_map, body).into_response()
}
