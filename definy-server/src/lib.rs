mod assets;
pub mod builtin_core_parts;
mod builtin_eval_match;
mod builtin_evaluator;
mod builtin_expression_type;
mod builtin_formatter;
mod builtin_list_ops;
pub mod builtin_migration;
mod builtin_optimizer;
pub mod builtin_sample_parts;
mod builtin_std_functions;
mod builtin_type_ast;
mod builtin_type_checker;
mod builtin_validator;
mod builtin_value_type;
pub mod builtin_wasi;
mod builtin_wasm_compiler;
mod connect_rpc;
mod db;
pub mod deno_deploy;
mod error;
mod extractor;
pub mod fly_machines;
mod html;
pub mod mcp;
pub mod seed;
mod self_hosted_ast;
#[cfg(test)]
mod self_hosting_tests;
pub mod virtual_file;

use std::net::SocketAddr;
use std::sync::Arc;

pub use crate::assets::{
    ResolvedAsset, resolve_client_js, resolve_client_wasm, resolve_icon, resolve_snippet,
    resolve_snippets_list,
};
use axum::body::Bytes;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode, Uri};
use axum::response::{IntoResponse, Redirect, Response};
use surrealdb::Surreal;
use surrealdb::engine::any::Any;
use tokio::net::TcpListener;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DbInitStatus {
    Initializing,
    Ready,
    Failed,
}

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<RwLock<Option<Surreal<Any>>>>,
    pub fly_client: Option<crate::fly_machines::FlyMachineClient>,
    pub virtual_file_store: Arc<RwLock<virtual_file::VirtualFileStore>>,
    pub last_db_failure: Arc<RwLock<Option<std::time::Instant>>>,
    pub db_init_status: Arc<RwLock<DbInitStatus>>,
}

impl AppState {
    #[must_use]
    pub fn new(
        db: Option<Surreal<Any>>,
        fly_client: Option<crate::fly_machines::FlyMachineClient>,
    ) -> Self {
        let db_init_status = if db.is_some() {
            DbInitStatus::Ready
        } else {
            DbInitStatus::Initializing
        };
        Self {
            db: Arc::new(RwLock::new(db)),
            fly_client,
            virtual_file_store: Arc::new(RwLock::new(virtual_file::VirtualFileStore::new())),
            last_db_failure: Arc::new(RwLock::new(None)),
            db_init_status: Arc::new(RwLock::new(db_init_status)),
        }
    }

    #[must_use]
    pub fn test_state() -> Self {
        Self {
            db: Arc::new(RwLock::new(None)),
            fly_client: None,
            virtual_file_store: Arc::new(RwLock::new(virtual_file::VirtualFileStore::new())),
            last_db_failure: Arc::new(RwLock::new(None)),
            db_init_status: Arc::new(RwLock::new(DbInitStatus::Ready)),
        }
    }
}

pub async fn start_server() -> Result<(), anyhow::Error> {
    let _ = rustls::crypto::ring::default_provider().install_default();
    println!("Starting definy server (Axum)...");
    let state = AppState::new(None, crate::fly_machines::FlyMachineClient::from_env());

    let state_for_db = state.clone();
    tokio::spawn(async move {
        println!("Initializing database connection and schema in background...");
        match db::init_db().await {
            Ok(db) => {
                *state_for_db.db.write().await = Some(db);
                *state_for_db.db_init_status.write().await = DbInitStatus::Ready;
                *state_for_db.last_db_failure.write().await = None;
                println!("Database initialized successfully on startup.");
            }
            Err(err) => {
                *state_for_db.db_init_status.write().await = DbInitStatus::Failed;
                *state_for_db.last_db_failure.write().await = Some(std::time::Instant::now());
                eprintln!(
                    "WARNING: Failed to initialize database on startup ({:?}). Will retry on demand.",
                    err
                );
            }
        }
    });

    let mcp_session_manager = mcp::McpSessionManager::new();

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8000);

    let ip: std::net::IpAddr = match std::env::var("FLY_APP_NAME") {
        Ok(_) => std::net::IpAddr::V6(std::net::Ipv6Addr::UNSPECIFIED),
        Err(_) => std::env::var("IP")
            .ok()
            .and_then(|ip| ip.parse().ok())
            .unwrap_or(std::net::IpAddr::V4(std::net::Ipv4Addr::LOCALHOST)),
    };

    let addr = SocketAddr::from((ip, port));

    let app = create_router(state, mcp_session_manager);

    let listener = TcpListener::bind(addr).await?;
    println!("Listening on http://{}", addr);

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}

pub fn create_router(state: AppState, mcp_session_manager: mcp::McpSessionManager) -> axum::Router {
    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
            axum::http::header::ACCEPT,
            axum::http::HeaderName::from_static("connect-protocol-version"),
            axum::http::HeaderName::from_static("connect-timeout-ms"),
        ])
        .max_age(std::time::Duration::from_secs(86400));

    axum::Router::new()
        .merge(utoipa_swagger_ui::SwaggerUi::new("/swagger-ui").url(
            "/api-docs/openapi.json",
            <ApiDoc as utoipa::OpenApi>::openapi(),
        ))
        .merge(connect_rpc::router())
        .merge(virtual_file::router())
        .merge(mcp::router(mcp_session_manager))
        .fallback(handle_fallback)
        .layer(cors)
        .with_state(state)
}

pub fn create_test_router() -> axum::Router {
    let state = AppState::test_state();
    let mcp_session_manager = mcp::McpSessionManager::new();
    create_router(state, mcp_session_manager)
}

pub async fn create_test_router_with_db() -> Result<axum::Router, anyhow::Error> {
    let db = db::init_db().await?;
    let state = AppState::new(Some(db), None);
    let mcp_session_manager = mcp::McpSessionManager::new();
    Ok(create_router(state, mcp_session_manager))
}

pub async fn ensure_db(state: &AppState) -> Option<Surreal<Any>> {
    if let Some(db) = state.db.read().await.clone() {
        return Some(db);
    }

    // If background initialization is currently in progress, do not start concurrent init_db!
    if *state.db_init_status.read().await == DbInitStatus::Initializing {
        return None;
    }

    // Cooldown check: if DB initialization failed recently (within 5 seconds),
    // skip retrying immediately to prevent request latency and server overload.
    if let Some(last_failure) = *state.last_db_failure.read().await
        && last_failure.elapsed() < std::time::Duration::from_secs(5)
    {
        return None;
    }

    let mut guard = state.db.write().await;
    if let Some(existing_db) = guard.clone() {
        return Some(existing_db);
    }

    // Re-check failure cooldown and initializing status after acquiring write lock
    if *state.db_init_status.read().await == DbInitStatus::Initializing {
        return None;
    }
    if let Some(last_failure) = *state.last_db_failure.read().await
        && last_failure.elapsed() < std::time::Duration::from_secs(5)
    {
        return None;
    }

    match db::init_db().await {
        Ok(db) => {
            *guard = Some(db.clone());
            *state.db_init_status.write().await = DbInitStatus::Ready;
            *state.last_db_failure.write().await = None;
            println!("Database is available. API requests will use the database.");
            Some(db)
        }
        Err(error) => {
            *state.db_init_status.write().await = DbInitStatus::Failed;
            *state.last_db_failure.write().await = Some(std::time::Instant::now());
            eprintln!(
                "Failed to connect to database while handling request: {:?}",
                error
            );
            None
        }
    }
}

async fn handle_fallback(State(state): State<AppState>, uri: Uri, headers: HeaderMap) -> Response {
    let path = uri.path();
    let trimmed_path = path.trim_start_matches('/');

    // 1. Direct static file serving from public directory candidates
    for dir in assets::get_public_dir_candidates() {
        let candidate = dir.join(trimmed_path);
        if candidate.is_file()
            && let Ok(bytes) = std::fs::read(&candidate)
        {
            let content_type = mime_type_from_path(&candidate);
            let is_hashed = trimmed_path.contains("-dxh")
                || trimmed_path.starts_with("assets/")
                || trimmed_path.ends_with(".wasm");
            let cache_control = if is_hashed {
                "public, max-age=31536000, immutable"
            } else {
                "no-cache, must-revalidate"
            };
            return (
                StatusCode::OK,
                [
                    ("Content-Type", content_type),
                    ("Cache-Control", cache_control),
                ],
                Bytes::from(bytes),
            )
                .into_response();
        }
    }

    let clean_path = trimmed_path
        .strip_prefix("pkg/")
        .or_else(|| trimmed_path.strip_prefix("wasm/"))
        .unwrap_or(trimmed_path);

    if let Some(pos) = trimmed_path.find("snippets/") {
        let snippet_path = &trimmed_path[pos + "snippets/".len()..];
        if let Some(contents) = resolve_snippet(snippet_path) {
            return (
                StatusCode::OK,
                [
                    ("Content-Type", "application/javascript; charset=utf-8"),
                    ("Cache-Control", "public, max-age=31536000, immutable"),
                ],
                Bytes::from(contents),
            )
                .into_response();
        } else {
            return (
                StatusCode::NOT_FOUND,
                [("Content-Type", "text/plain; charset=utf-8")],
                "Snippet Not Found",
            )
                .into_response();
        }
    }

    if let Some(js) = resolve_client_js() {
        let js_file_with_ext = format!("{}.js", js.hash);
        let is_hashed = clean_path == js.hash || clean_path == js_file_with_ext;
        if is_hashed
            || clean_path == "definy_client.js"
            || clean_path == js_file_with_ext
            || clean_path.ends_with("definy_client.js")
        {
            let cache_control = if is_hashed {
                "public, max-age=31536000, immutable"
            } else {
                "no-cache, must-revalidate"
            };
            return (
                StatusCode::OK,
                [
                    ("Content-Type", js.content_type),
                    ("Cache-Control", cache_control),
                ],
                Bytes::from(js.bytes),
            )
                .into_response();
        }
    }

    if let Some(wasm) = resolve_client_wasm() {
        let wasm_file_with_ext = format!("{}.wasm", wasm.hash);
        let is_hashed = clean_path == wasm.hash || clean_path == wasm_file_with_ext;
        if is_hashed
            || clean_path == "definy_client_bg.wasm"
            || clean_path == wasm_file_with_ext
            || clean_path.ends_with("definy_client_bg.wasm")
        {
            let cache_control = if is_hashed {
                "public, max-age=31536000, immutable"
            } else {
                "no-cache, must-revalidate"
            };
            return (
                StatusCode::OK,
                [
                    ("Content-Type", wasm.content_type),
                    ("Cache-Control", cache_control),
                ],
                Bytes::from(wasm.bytes),
            )
                .into_response();
        }
    }

    let icon = resolve_icon();
    if clean_path == icon.hash || clean_path == "icon.png" {
        let cache_control = if clean_path == icon.hash {
            "public, max-age=31536000, immutable"
        } else {
            "no-cache, must-revalidate"
        };
        return (
            StatusCode::OK,
            [
                ("Content-Type", icon.content_type),
                ("Cache-Control", cache_control),
            ],
            Bytes::from(icon.bytes.clone()),
        )
            .into_response();
    }

    let accepts_html = headers
        .get("accept")
        .and_then(|value| value.to_str().ok())
        .is_none_or(|value| value.contains("text/html") || value.contains("*/*"));

    if accepts_html {
        return handle_html_request(&state, &uri, &headers).await;
    }

    (
        StatusCode::NOT_FOUND,
        [("Content-Type", "text/html; charset=utf-8")],
        "404 Not Found",
    )
        .into_response()
}

pub(crate) async fn handle_html_request(
    state: &AppState,
    uri: &Uri,
    headers: &HeaderMap,
) -> Response {
    if let Some(redirect_url) = lang_redirect_url(uri, headers) {
        return Redirect::temporary(&redirect_url).into_response();
    }
    let accept_language = headers
        .get("accept-language")
        .and_then(|value| value.to_str().ok());
    let language_resolution = definy_ui::language::resolve_language(uri.query(), accept_language);
    let db = ensure_db(state).await;
    let is_initializing =
        db.is_none() && *state.db_init_status.read().await == DbInitStatus::Initializing;
    handle_html(
        uri,
        db.as_ref(),
        language_resolution.language,
        is_initializing,
    )
    .await
}

async fn handle_html(
    uri: &Uri,
    db: Option<&Surreal<Any>>,
    language: definy_ui::language::Language,
    is_db_initializing: bool,
) -> Response {
    let path = uri.path();
    let query = uri.query();
    let location = definy_ui::Location::from_url(path);
    if let Some(ref location) = location
        && location.to_url() != path
    {
        let mut redirect_url = location.to_url();
        if let Some(query) = query
            && !query.is_empty()
        {
            redirect_url.push('?');
            redirect_url.push_str(query);
        }
        return Redirect::permanent(&redirect_url).into_response();
    }

    let filter_event_type = definy_ui::event_filter_from_query(query);
    let (mut event_binary_vec, is_db_connected) = match db {
        Some(db) => match db::get_events(db, filter_event_type, Some(100), Some(0)).await {
            Ok(events) => (events.into_vec(), true),
            Err(error) => {
                eprintln!("Failed to get events for SSR: {:?}", error);
                (Vec::new(), false)
            }
        },
        None => (Vec::new(), false),
    };

    if let (
        Some(db),
        Some(
            definy_ui::Location::Part(hash)
            | definy_ui::Location::Event(hash)
            | definy_ui::Location::Module(hash),
        ),
    ) = (db, &location)
        && let Ok(Some(single_event)) = db::get_event(db, hash.as_ref()).await
        && !event_binary_vec.contains(&single_event)
    {
        event_binary_vec.push(single_event);
    }

    let events = event_binary_vec
        .iter()
        .map(|event_binary| {
            let hash = definy_event::EventHashId::from_bytes(event_binary.as_slice());
            (
                hash,
                definy_event::verify_and_deserialize(event_binary.as_slice()),
            )
        })
        .collect::<Vec<_>>();
    let has_more = events.len() == 100;
    let ssr_initial_state_json = definy_ui::encode_ssr_state(definy_ui::SsrState {
        event_binaries: event_binary_vec,
        has_more,
        is_db_connected,
        is_db_initializing,
    })
    .unwrap();

    let context = definy_ui::PageContext::from_path_and_query(
        path,
        query.unwrap_or_default(),
        Some(language.to_code()),
    );
    let initial_state = definy_ui::build_initial_state(
        events,
        false,
        has_more,
        None,
        filter_event_type,
        is_db_connected,
        is_db_initializing,
    );
    let js = resolve_client_js();
    let wasm = resolve_client_wasm();
    let icon = resolve_icon();
    let default_hash = "latest".to_string();
    let js_hash = js
        .as_ref()
        .map(|j| j.hash.as_str())
        .unwrap_or(&default_hash);
    let wasm_hash = wasm
        .as_ref()
        .map(|w| w.hash.as_str())
        .unwrap_or(&default_hash);
    let js_url = match js.as_ref() {
        Some(j) => {
            if j.relative_path.contains(&j.hash) || j.relative_path.contains("-dxh") {
                format!("/{}", j.relative_path)
            } else {
                format!("/{}?v={}", j.relative_path, j.hash)
            }
        }
        None => "/wasm/definy_client.js?v=latest".to_string(),
    };
    let html = html::render_to_html(
        &initial_state,
        &context,
        &html::ResourceHash {
            js: js_hash,
            wasm: wasm_hash,
            icon: &icon.hash,
            js_url: &js_url,
        },
        &ssr_initial_state_json,
    );

    (
        StatusCode::OK,
        [("Content-Type", "text/html; charset=utf-8")],
        html,
    )
        .into_response()
}

fn mime_type_from_path(p: &std::path::Path) -> &'static str {
    match p.extension().and_then(|ext| ext.to_str()) {
        Some("js" | "mjs") => "application/javascript; charset=utf-8",
        Some("wasm") => "application/wasm",
        Some("png") => "image/png",
        Some("svg") => "image/svg+xml",
        Some("css") => "text/css; charset=utf-8",
        Some("json") => "application/json",
        Some("html") => "text/html; charset=utf-8",
        Some("ico") => "image/x-icon",
        Some("txt") => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    }
}

fn lang_redirect_url(uri: &Uri, headers: &HeaderMap) -> Option<String> {
    if definy_ui::query::parse_query(uri.query()).lang.is_some() {
        return None;
    }
    let accept_language = headers
        .get("accept-language")
        .and_then(|value| value.to_str().ok());
    let best = definy_ui::language::best_language_from_accept_language(accept_language);
    Some(build_url_with_lang(uri, best.to_code()))
}

fn build_url_with_lang(uri: &Uri, lang_code: &str) -> String {
    let mut params = definy_ui::query::parse_query(uri.query());
    params.lang = Some(lang_code.to_string());
    let mut url = uri.path().to_string();
    if let Some(query) = definy_ui::query::build_query(params) {
        url.push('?');
        url.push_str(query.as_str());
    }
    url
}

#[derive(utoipa::OpenApi)]
#[openapi(
    paths(
        connect_rpc::handle_get_events,
        connect_rpc::handle_get_event,
        connect_rpc::handle_submit_event,
        connect_rpc::handle_check_missing_hashes,
        connect_rpc::handle_upload_content,
        connect_rpc::handle_get_content,
        connect_rpc::handle_deploy_instance,
        connect_rpc::handle_get_deploy_status,
        connect_rpc::handle_list_deployments,
        virtual_file::handle_get_virtual_wasm,
    ),
    components(
        schemas(
            definy_event::rpc::EventItem,
            definy_event::rpc::GetEventsRequest,
            definy_event::rpc::GetEventsResponse,
            definy_event::rpc::GetEventRequest,
            definy_event::rpc::GetEventResponse,
            definy_event::rpc::SubmitEventRequest,
            definy_event::rpc::SubmitEventResponse,
            definy_event::rpc::ContentItem,
            definy_event::rpc::CheckMissingHashesRequest,
            definy_event::rpc::CheckMissingHashesResponse,
            definy_event::rpc::UploadContentRequest,
            definy_event::rpc::UploadContentResponse,
            definy_event::rpc::GetContentRequest,
            definy_event::rpc::GetContentResponse,
            definy_event::rpc::DeployInstanceRequest,
            definy_event::rpc::DeployInstanceResponse,
            definy_event::rpc::GetDeployStatusRequest,
            definy_event::rpc::GetDeployStatusResponse,
            definy_event::rpc::DeploymentItem,
            definy_event::rpc::ListDeploymentsRequest,
            definy_event::rpc::ListDeploymentsResponse,
            definy_event::rpc::ConnectError,
        )
    ),
    tags(
        (name = "connect-rpc", description = "Definy Connect-RPC (Protobuf / JSON over HTTP) API"),
        (name = "virtual-files", description = "Virtual Content-Addressed Wasm and File Serving")
    ),
    info(
        title = "definy API",
        version = "0.1.0",
        description = "OpenAPI documentation for definy server (Connect-RPC)"
    )
)]
pub struct ApiDoc;

#[cfg(test)]
mod tests {
    use super::*;
    use utoipa::OpenApi;

    #[test]
    fn test_openapi_spec_generation() {
        let openapi = ApiDoc::openapi();
        let json = openapi
            .to_pretty_json()
            .expect("Failed to serialize OpenAPI spec to JSON");
        assert!(json.contains("definy API"));
        assert!(!json.contains("\"/events\""));
        assert!(!json.contains("\"/events/{hash}\""));
        assert!(json.contains("/definy.v1.EventService/GetEvents"));
        assert!(json.contains("/definy.v1.EventService/GetEvent"));
        assert!(json.contains("/definy.v1.EventService/SubmitEvent"));
        assert!(json.contains("/definy.v1.EventService/CheckMissingHashes"));
        assert!(json.contains("/definy.v1.EventService/UploadContent"));
        assert!(json.contains("/definy.v1.EventService/GetContent"));
        assert!(json.contains("/definy.v1.DeployService/DeployInstance"));
        assert!(json.contains("/definy.v1.DeployService/GetDeployStatus"));
        assert!(json.contains("/definy.v1.DeployService/ListDeployments"));
        assert!(json.contains("/virtual/wasm/{hash}"));
    }

    #[tokio::test]
    async fn test_handle_html_request_event_detail() {
        let state = AppState::test_state();
        let uri = axum::http::Uri::from_static(
            "/events/-5jktaWRZlN9SqpDYOvNnfSZ6_rz_tUMAzlZVCk0r6o?lang=ja",
        );
        let mut headers = axum::http::HeaderMap::new();
        headers.insert("accept", axum::http::HeaderValue::from_static("text/html"));

        let response = handle_html_request(&state, &uri, &headers).await;
        assert_eq!(response.status(), axum::http::StatusCode::OK);
        let body_bytes = axum::body::to_bytes(response.into_body(), 1024 * 1024)
            .await
            .expect("Failed to read body");
        let body_str = String::from_utf8(body_bytes.to_vec()).expect("Body is not UTF-8");
        assert_ne!(body_str, "todo");
        assert!(body_str.contains("<!DOCTYPE html>"));
        assert!(body_str.contains("-5jktaWRZlN9SqpDYOvNnfSZ6_rz_tUMAzlZVCk0r6o"));
    }

    #[tokio::test]
    async fn test_handle_html_request_home() {
        let state = AppState::test_state();
        let uri = axum::http::Uri::from_static("/?lang=en");
        let mut headers = axum::http::HeaderMap::new();
        headers.insert("accept", axum::http::HeaderValue::from_static("text/html"));

        let response = handle_html_request(&state, &uri, &headers).await;
        assert_eq!(response.status(), axum::http::StatusCode::OK);
        let body_bytes = axum::body::to_bytes(response.into_body(), 1024 * 1024)
            .await
            .expect("Failed to read body");
        let body_str = String::from_utf8(body_bytes.to_vec()).expect("Body is not UTF-8");
        assert!(body_str.contains("<!DOCTYPE html>"));
    }

    #[tokio::test]
    async fn test_handle_html_request_home_with_db() {
        let db = db::init_db().await.unwrap();
        let state = AppState::new(Some(db), None);
        let uri = axum::http::Uri::from_static("/?lang=en");
        let mut headers = axum::http::HeaderMap::new();
        headers.insert("accept", axum::http::HeaderValue::from_static("text/html"));

        let response = handle_html_request(&state, &uri, &headers).await;
        assert_eq!(response.status(), axum::http::StatusCode::OK);
        let body_bytes = axum::body::to_bytes(response.into_body(), 1024 * 1024)
            .await
            .expect("Failed to read body");
        let body_str = String::from_utf8(body_bytes.to_vec()).expect("Body is not UTF-8");
        assert!(body_str.contains("<!DOCTYPE html>"));
    }

    #[tokio::test]
    async fn test_handle_requests_with_broken_db() {
        let state = AppState::new(None, None);
        // Simulate that DB connection attempt just failed
        *state.last_db_failure.write().await = Some(std::time::Instant::now());
        let app = create_router(state, mcp::McpSessionManager::new());

        // 1. GET /?lang=en (returns fallback offline HTML without crashing)
        use tower::ServiceExt;
        let req = axum::http::Request::builder()
            .uri("/?lang=en")
            .header("accept", "text/html")
            .body(axum::body::Body::empty())
            .unwrap();
        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), axum::http::StatusCode::OK);

        // 2. POST Connect-RPC GetEvents (returns SERVICE_UNAVAILABLE)
        let req_rpc = axum::http::Request::builder()
            .method("POST")
            .uri("/definy.v1.EventService/GetEvents")
            .header("content-type", "application/json")
            .body(axum::body::Body::from("{}"))
            .unwrap();
        let res_rpc = app.clone().oneshot(req_rpc).await.unwrap();
        assert_eq!(
            res_rpc.status(),
            axum::http::StatusCode::SERVICE_UNAVAILABLE
        );

        // 3. POST Connect-RPC CheckMissingHashes (returns SERVICE_UNAVAILABLE)
        let req_cmh = axum::http::Request::builder()
            .method("POST")
            .uri("/definy.v1.EventService/CheckMissingHashes")
            .header("content-type", "application/json")
            .body(axum::body::Body::from(r#"{"contentHashes":[]}"#))
            .unwrap();
        let res_cmh = app.clone().oneshot(req_cmh).await.unwrap();
        assert_eq!(
            res_cmh.status(),
            axum::http::StatusCode::SERVICE_UNAVAILABLE
        );
    }

    #[tokio::test]
    async fn test_handle_html_request_when_db_is_initializing() {
        let state = AppState::new(None, None);
        // AppState::new(None, None) defaults db_init_status to DbInitStatus::Initializing
        assert_eq!(
            *state.db_init_status.read().await,
            DbInitStatus::Initializing
        );

        let uri = axum::http::Uri::from_static("/?lang=ja");
        let mut headers = axum::http::HeaderMap::new();
        headers.insert("accept", axum::http::HeaderValue::from_static("text/html"));

        let response = handle_html_request(&state, &uri, &headers).await;
        assert_eq!(response.status(), axum::http::StatusCode::OK);
        let body_bytes = axum::body::to_bytes(response.into_body(), 1024 * 1024)
            .await
            .expect("Failed to read body");
        let body_str = String::from_utf8(body_bytes.to_vec()).expect("Body is not UTF-8");
        assert!(body_str.contains("<!DOCTYPE html>"));
        assert!(body_str.contains("データベースを初期化中です"));
        assert!(body_str.contains("DB: 初期化中"));

        // Also test English
        let uri_en = axum::http::Uri::from_static("/?lang=en");
        let response_en = handle_html_request(&state, &uri_en, &headers).await;
        let body_bytes_en = axum::body::to_bytes(response_en.into_body(), 1024 * 1024)
            .await
            .expect("Failed to read body");
        let body_str_en = String::from_utf8(body_bytes_en.to_vec()).expect("Body is not UTF-8");
        assert!(body_str_en.contains("Database is initializing"));
        assert!(body_str_en.contains("Database: Initializing"));
    }

    #[test]
    fn test_resolve_client_js_and_wasm() {
        if let Some(js) = resolve_client_js() {
            assert!(!js.bytes.is_empty());
            assert!(!js.hash.is_empty());
        }
        if let Some(wasm) = resolve_client_wasm() {
            assert!(!wasm.bytes.is_empty());
            assert!(!wasm.hash.is_empty());
        }
    }
}
