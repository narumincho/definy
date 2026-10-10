//! Web アプリケーションのプレビュー実行機能 (localhost 的なインサーバー実行環境)。
//! サーバー起動時に指定した管理者 (`DEFINY_ADMIN_ACCOUNT_ID`) のみ実行可能とし、
//! クラウド環境やローカル開発環境でアプリごとのサブドメインまたはパスプレフィックス `/preview/:app_id/*` でホストします。

use std::collections::HashMap;

use axum::body::Bytes;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, Method, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use chrono::Utc;
use definy_core::expression_eval::Value;
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
        if !admin_trimmed.is_empty() && admin_trimmed == trimmed {
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
    if let Ok(fly_app) = std::env::var("FLY_APP_NAME") {
        let f = fly_app.trim();
        if !f.is_empty() {
            return format!("{f}.fly.dev");
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
        format!("https://{subdomain}.{root}")
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
/// 例: `my-app.localhost:8000` -> Some("my-app")
/// 例: `my-app.definy.fly.dev` -> Some("my-app")
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

/// サブドメインまたはパスプレフィックスからディスパッチされたプレビューアプリを実行します。
pub async fn execute_preview_app(
    state: &AppState,
    app_id: &str,
    uri: &Uri,
    _method: &Method,
    _headers: &HeaderMap,
    _body: &Bytes,
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

    // 1. Wasm バイナリが存在する場合は Wasmtime で実行
    if let Some(ref wasm) = app.wasm_bytes {
        match crate::self_hosted_wasm_compiler::evaluate_compiled_wasm(wasm) {
            Ok(value) => return value_to_http_response(&value, app_id),
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

    // 2. part_id から式を探索して Wasm コンパイルまたは評価
    let expression = if let Some(ref expr) = app.cached_expression {
        Some(expr.clone())
    } else if let Some(db) = crate::ensure_db(state).await {
        // イベントストアからパーツの式を検索
        match crate::db::get_events(&db, None, Some(500), Some(0)).await {
            Ok(events) => {
                let verified = events
                    .into_vec()
                    .into_iter()
                    .map(|bytes| {
                        let hash = definy_event::EventHashId::from_bytes(&bytes);
                        (hash, definy_event::verify_and_deserialize(&bytes))
                    })
                    .collect::<Vec<_>>();
                crate::self_hosted_wasm_compiler::find_part_expression_in_events(
                    &app.part_id,
                    &verified,
                )
                .ok()
            }
            Err(_) => None,
        }
    } else {
        None
    };

    if let Some(expr) = expression {
        match crate::self_hosted_wasm_compiler::compile_expression_to_wasm(&expr) {
            Ok(wasm_bytes) => {
                match crate::self_hosted_wasm_compiler::evaluate_compiled_wasm(&wasm_bytes) {
                    Ok(value) => value_to_http_response(&value, app_id),
                    Err(err) => (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        [("Content-Type", "text/plain; charset=utf-8")],
                        format!("Error executing compiled Wasm for '{app_id}': {err}"),
                    )
                        .into_response(),
                }
            }
            Err(err) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                [("Content-Type", "text/plain; charset=utf-8")],
                format!("Failed to compile part '{app_id}' to Wasm: {err}"),
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

/// 評価された definy の Value を HTTP Response にマッピングします
fn value_to_http_response(value: &Value, app_id: &str) -> Response {
    match value {
        Value::String(html_or_text) => {
            let is_html = html_or_text.contains("<html")
                || html_or_text.contains("<div")
                || html_or_text.contains("<h1")
                || html_or_text.contains("<!DOCTYPE");
            let content_type = if is_html {
                "text/html; charset=utf-8"
            } else {
                "text/plain; charset=utf-8"
            };
            (
                StatusCode::OK,
                [
                    ("Content-Type", content_type),
                    ("X-Definy-Preview-App", app_id),
                ],
                html_or_text.clone(),
            )
                .into_response()
        }
        Value::Record(fields) => {
            let mut status_code = StatusCode::OK;
            let mut body_str = String::new();
            let mut content_type = "text/html; charset=utf-8".to_string();

            for (k, v) in fields {
                match k.as_str() {
                    "status" => {
                        if let Value::Number(num) = v
                            && let Ok(code) = u16::try_from(*num)
                            && let Ok(sc) = StatusCode::from_u16(code)
                        {
                            status_code = sc;
                        }
                    }
                    "body" => {
                        if let Value::String(s) = v {
                            body_str = s.clone();
                        } else {
                            body_str = format!("{v:?}");
                        }
                    }
                    "contentType" | "content_type" => {
                        if let Value::String(s) = v {
                            content_type = s.clone();
                        }
                    }
                    _ => {}
                }
            }

            if body_str.is_empty() {
                let json_val = value_to_json(value);
                let json = serde_json::to_string_pretty(&json_val).unwrap_or_default();
                (
                    status_code,
                    [
                        ("Content-Type", "application/json"),
                        ("X-Definy-Preview-App", app_id),
                    ],
                    json,
                )
                    .into_response()
            } else {
                (
                    status_code,
                    [
                        ("Content-Type", content_type.as_str()),
                        ("X-Definy-Preview-App", app_id),
                    ],
                    body_str,
                )
                    .into_response()
            }
        }
        other => {
            let json_val = value_to_json(other);
            let json = serde_json::to_string_pretty(&json_val).unwrap_or_default();
            (
                StatusCode::OK,
                [
                    ("Content-Type", "application/json"),
                    ("X-Definy-Preview-App", app_id),
                ],
                json,
            )
                .into_response()
        }
    }
}

/// definy の評価結果 `Value` を `serde_json::Value` にマッピングします
#[must_use]
pub fn value_to_json(val: &Value) -> serde_json::Value {
    match val {
        Value::Number(n) => serde_json::Value::Number((*n).into()),
        Value::String(s) => serde_json::Value::String(s.clone()),
        Value::Bool(b) => serde_json::Value::Bool(*b),
        Value::List(items) => serde_json::Value::Array(items.iter().map(value_to_json).collect()),
        Value::Record(items) => {
            let mut map = serde_json::Map::new();
            for (k, v) in items {
                map.insert(k.clone(), value_to_json(v));
            }
            serde_json::Value::Object(map)
        }
        Value::Function => serde_json::Value::String("<function>".to_string()),
        Value::Variant { tag, payload } => {
            let mut map = serde_json::Map::new();
            map.insert("tag".to_string(), serde_json::Value::String(tag.clone()));
            if let Some(p) = payload {
                map.insert("payload".to_string(), value_to_json(p));
            }
            serde_json::Value::Object(map)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    static ENV_MUTEX: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

    struct EnvGuard {
        key: &'static str,
        original: Option<String>,
    }

    impl EnvGuard {
        fn set(key: &'static str, val: &str) -> Self {
            let original = std::env::var(key).ok();
            unsafe { std::env::set_var(key, val) };
            Self { key, original }
        }

        fn unset(key: &'static str) -> Self {
            let original = std::env::var(key).ok();
            unsafe { std::env::remove_var(key) };
            Self { key, original }
        }
    }

    impl Drop for EnvGuard {
        fn drop(&mut self) {
            if let Some(ref val) = self.original {
                unsafe { std::env::set_var(self.key, val) };
            } else {
                unsafe { std::env::remove_var(self.key) };
            }
        }
    }

    #[test]
    fn test_admin_account_authorization() {
        let _lock = ENV_MUTEX.blocking_lock();

        {
            let _g1 = EnvGuard::set(
                "DEFINY_ADMIN_ACCOUNT_ID",
                "0123456789abcdef,feedbeefcafebabe",
            );
            let _g2 = EnvGuard::unset("DEFINY_ADMIN_ACCOUNT_IDS");
            assert!(is_admin_account("0123456789abcdef"));
            assert!(is_admin_account("FEEDBEEFCAFEBABE")); // case insensitive
            assert!(!is_admin_account("unauthorized_user"));
            assert!(!is_admin_account(""));
        }

        // 未設定時は誰も許可されない
        {
            let _g1 = EnvGuard::unset("DEFINY_ADMIN_ACCOUNT_ID");
            let _g2 = EnvGuard::unset("DEFINY_ADMIN_ACCOUNT_IDS");
            assert!(!is_admin_account("0123456789abcdef"));
        }
    }

    #[test]
    fn test_extract_subdomain_from_host() {
        let _lock = ENV_MUTEX.blocking_lock();

        {
            let _g = EnvGuard::set("DEFINY_ROOT_DOMAIN", "definy.fly.dev");
            assert_eq!(
                extract_subdomain_from_host("my-app.definy.fly.dev"),
                Some("my-app".to_string())
            );
            assert_eq!(
                extract_subdomain_from_host("my-app.definy.fly.dev:443"),
                Some("my-app".to_string())
            );
            assert_eq!(extract_subdomain_from_host("definy.fly.dev"), None);
            assert_eq!(extract_subdomain_from_host("other-domain.com"), None);
        }

        // localhost
        assert_eq!(
            extract_subdomain_from_host("sample-web.localhost:8000"),
            Some("sample-web".to_string())
        );
        assert_eq!(
            extract_subdomain_from_host("sample-web.localhost"),
            Some("sample-web".to_string())
        );
        assert_eq!(extract_subdomain_from_host("localhost:8000"), None);
    }

    #[test]
    fn test_preview_store_crud() {
        let mut store = PreviewAppStore::new();
        let app = PreviewApp {
            app_id: "demo".to_string(),
            display_name: "Demo App".to_string(),
            part_id: "part-1".to_string(),
            owner_account_id: "admin-1".to_string(),
            created_at: Utc::now(),
            subdomain: "demo".to_string(),
            wasm_bytes: None,
            cached_expression: None,
        };

        store.register(app.clone());
        assert!(store.get("demo").is_some());
        assert_eq!(store.list().len(), 1);

        let removed = store.remove("demo");
        assert!(removed.is_some());
        assert!(store.get("demo").is_none());
    }

    #[test]
    fn test_value_to_json() {
        let val = Value::Record(vec![
            ("title".to_string(), Value::String("My App".to_string())),
            ("count".to_string(), Value::Number(42)),
            ("active".to_string(), Value::Bool(true)),
            (
                "items".to_string(),
                Value::List(vec![Value::Number(1), Value::Number(2)]),
            ),
            (
                "status".to_string(),
                Value::Variant {
                    tag: "ok".to_string(),
                    payload: Some(Box::new(Value::String("success".to_string()))),
                },
            ),
        ]);

        let json = value_to_json(&val);
        assert_eq!(json["title"], "My App");
        assert_eq!(json["count"], 42);
        assert_eq!(json["active"], true);
        assert_eq!(json["items"][0], 1);
        assert_eq!(json["status"]["tag"], "ok");
        assert_eq!(json["status"]["payload"], "success");
    }

    #[tokio::test]
    async fn test_preview_connect_rpc_admin_permission_and_lifecycle() {
        use tower::ServiceExt;

        let _lock = ENV_MUTEX.lock().await;

        let admin_account = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        let non_admin_account = "9999999999abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

        let _guard = EnvGuard::set("DEFINY_ADMIN_ACCOUNT_ID", admin_account);
        let app = crate::create_test_router();

        // 1. 非管理者による登録 -> 権限エラー (HTTP 403 / permission_denied)
        let unauthorized_req = RegisterPreviewAppRequest {
            app_id: "test-app".to_string(),
            display_name: "Test App".to_string(),
            part_id: "part-123".to_string(),
            account_id: non_admin_account.to_string(),
            signature: None,
            wasm_hash: None,
        };
        let req_body = serde_json::to_vec(&unauthorized_req).unwrap();
        let req = axum::http::Request::builder()
            .method("POST")
            .uri(PATH_REGISTER_PREVIEW_APP)
            .header(axum::http::header::CONTENT_TYPE, "application/json")
            .header("connect-protocol-version", "1")
            .body(axum::body::Body::from(req_body))
            .unwrap();

        let res = app.clone().oneshot(req).await.unwrap();
        assert_ne!(res.status(), StatusCode::OK);
        let body_bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024)
            .await
            .unwrap();
        let err_json: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
        assert_eq!(err_json["code"], "permission_denied");

        // 2. 管理者による登録 -> 成功 (200 OK)
        let admin_req = RegisterPreviewAppRequest {
            app_id: "my-preview".to_string(),
            display_name: "My Preview App".to_string(),
            part_id: "part-web".to_string(),
            account_id: admin_account.to_string(),
            signature: None,
            wasm_hash: None,
        };
        let req_body = serde_json::to_vec(&admin_req).unwrap();
        let req = axum::http::Request::builder()
            .method("POST")
            .uri(PATH_REGISTER_PREVIEW_APP)
            .header(axum::http::header::CONTENT_TYPE, "application/json")
            .header("connect-protocol-version", "1")
            .body(axum::body::Body::from(req_body))
            .unwrap();

        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body_bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024)
            .await
            .unwrap();
        let register_res: RegisterPreviewAppResponse = serde_json::from_slice(&body_bytes).unwrap();
        assert_eq!(register_res.app_id, "my-preview");
        assert_eq!(register_res.status, "running");

        // 3. 一覧取得 (ListPreviewApps)
        let list_req = ListPreviewAppsRequest { account_id: None };
        let req_body = serde_json::to_vec(&list_req).unwrap();
        let req = axum::http::Request::builder()
            .method("POST")
            .uri(PATH_LIST_PREVIEW_APPS)
            .header(axum::http::header::CONTENT_TYPE, "application/json")
            .header("connect-protocol-version", "1")
            .body(axum::body::Body::from(req_body))
            .unwrap();

        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body_bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024)
            .await
            .unwrap();
        let list_res: ListPreviewAppsResponse = serde_json::from_slice(&body_bytes).unwrap();
        assert_eq!(list_res.apps.len(), 1);
        assert_eq!(list_res.apps[0].app_id, "my-preview");

        // 4. パスプレフィックス経由でプレビューアクセス (/preview/my-preview)
        let req = axum::http::Request::builder()
            .method("GET")
            .uri("/preview/my-preview")
            .body(axum::body::Body::empty())
            .unwrap();

        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let headers = res.headers();
        assert_eq!(headers.get("X-Definy-Preview-App").unwrap(), "my-preview");

        // 5. サブドメイン経由でプレビューアクセス (Host: my-preview.localhost:8000)
        let req = axum::http::Request::builder()
            .method("GET")
            .uri("/")
            .header("host", "my-preview.localhost:8000")
            .body(axum::body::Body::empty())
            .unwrap();

        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let headers = res.headers();
        assert_eq!(headers.get("X-Definy-Preview-App").unwrap(), "my-preview");

        // 6. アプリ停止 (StopPreviewApp)
        let stop_req = StopPreviewAppRequest {
            app_id: "my-preview".to_string(),
            account_id: admin_account.to_string(),
            signature: None,
        };
        let req_body = serde_json::to_vec(&stop_req).unwrap();
        let req = axum::http::Request::builder()
            .method("POST")
            .uri(PATH_STOP_PREVIEW_APP)
            .header(axum::http::header::CONTENT_TYPE, "application/json")
            .header("connect-protocol-version", "1")
            .body(axum::body::Body::from(req_body))
            .unwrap();

        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body_bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024)
            .await
            .unwrap();
        let stop_res: StopPreviewAppResponse = serde_json::from_slice(&body_bytes).unwrap();
        assert!(stop_res.success);

        // 停止後はプレビュー 404
        let req = axum::http::Request::builder()
            .method("GET")
            .uri("/preview/my-preview")
            .body(axum::body::Body::empty())
            .unwrap();

        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }
}
