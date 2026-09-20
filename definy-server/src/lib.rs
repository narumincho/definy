mod builtin_migration;
mod db;
mod error;
mod event;
mod extractor;
mod html;
pub mod mcp;

use std::net::SocketAddr;
use std::sync::Arc;

use axum::body::Bytes;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode, Uri};
use axum::response::{IntoResponse, Redirect, Response};
use axum::routing::get;
use base64::Engine;
use sha2::Digest;
use surrealdb::Surreal;
use surrealdb::engine::any::Any;
use tokio::net::TcpListener;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<RwLock<Option<Surreal<Any>>>>,
}

pub async fn start_server() -> Result<(), anyhow::Error> {
    println!("Starting definy server (Axum)...");
    let state = AppState {
        db: Arc::new(RwLock::new(None)),
    };
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
            .unwrap_or_else(|| std::net::IpAddr::V4(std::net::Ipv4Addr::LOCALHOST)),
    };

    let addr = SocketAddr::from((ip, port));

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
        ])
        .max_age(std::time::Duration::from_secs(86400));

    let app = axum::Router::new()
        .merge(utoipa_swagger_ui::SwaggerUi::new("/swagger-ui").url(
            "/api-docs/openapi.json",
            <ApiDoc as utoipa::OpenApi>::openapi(),
        ))
        .route(
            "/events",
            get(event::handle_events_get).post(event::handle_events_post),
        )
        .route("/events/{hash}", get(event::handle_event_get))
        .merge(mcp::router(mcp_session_manager))
        .fallback(handle_fallback)
        .layer(cors)
        .with_state(state);

    let listener = TcpListener::bind(addr).await?;
    println!("Listening on http://{}", addr);

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}

const ICON_CONTENT: &[u8] = include_bytes!("../../assets/icon.png");

static ICON_ASSET: std::sync::LazyLock<ResolvedAsset> = std::sync::LazyLock::new(|| {
    let bytes = std::fs::read("assets/icon.png").unwrap_or_else(|_| ICON_CONTENT.to_vec());
    let hash = sha2::Sha256::digest(&bytes);
    let hash_hex = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(hash);
    ResolvedAsset {
        bytes,
        hash: hash_hex,
        content_type: "image/png",
    }
});

pub struct ResolvedAsset {
    pub bytes: Vec<u8>,
    pub hash: String,
    pub content_type: &'static str,
}

fn get_public_dir_candidates() -> Vec<std::path::PathBuf> {
    let mut paths = Vec::new();
    if let Ok(custom) = std::env::var("DEFINY_PUBLIC_DIR") {
        paths.push(std::path::PathBuf::from(custom));
    }

    // Direct relative paths from current directory
    paths.push(std::path::PathBuf::from("public"));
    paths.push(std::path::PathBuf::from(
        "target/dx/definy_client/release/web/public",
    ));
    paths.push(std::path::PathBuf::from(
        "target/dx/definy_client/debug/web/public",
    ));

    // Also look from parent directory (if cwd is definy-server or definy-client)
    paths.push(std::path::PathBuf::from("../public"));
    paths.push(std::path::PathBuf::from(
        "../target/dx/definy_client/release/web/public",
    ));
    paths.push(std::path::PathBuf::from(
        "../target/dx/definy_client/debug/web/public",
    ));

    // Robust search: traverse up from current_dir to find workspace root (has Cargo.lock or workspace Cargo.toml)
    if let Ok(mut current) = std::env::current_dir() {
        loop {
            let cargo_toml = current.join("Cargo.toml");
            let is_workspace_root = cargo_toml.is_file()
                && std::fs::read_to_string(&cargo_toml)
                    .map(|c| c.contains("[workspace]"))
                    .unwrap_or(false);

            if is_workspace_root {
                let target_debug = current.join("target/dx/definy_client/debug/web/public");
                if target_debug.exists() && !paths.contains(&target_debug) {
                    paths.push(target_debug);
                }
                let target_release = current.join("target/dx/definy_client/release/web/public");
                if target_release.exists() && !paths.contains(&target_release) {
                    paths.push(target_release);
                }
                let pub_dir = current.join("public");
                if pub_dir.exists() && !paths.contains(&pub_dir) {
                    paths.push(pub_dir);
                }
                break;
            }

            if !current.pop() {
                break;
            }
        }
    }

    paths
}

pub fn resolve_client_js() -> Option<ResolvedAsset> {
    for dir in get_public_dir_candidates() {
        let p = dir.join("wasm").join("definy_client.js");
        if let Ok(bytes) = std::fs::read(&p) {
            let hash = sha2::Sha256::digest(&bytes);
            let hash_hex = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(hash);
            return Some(ResolvedAsset {
                bytes,
                hash: hash_hex,
                content_type: "application/javascript; charset=utf-8",
            });
        }
    }
    None
}

pub fn resolve_client_wasm() -> Option<ResolvedAsset> {
    for dir in get_public_dir_candidates() {
        let p = dir.join("wasm").join("definy_client_bg.wasm");
        if let Ok(bytes) = std::fs::read(&p) {
            let hash = sha2::Sha256::digest(&bytes);
            let hash_hex = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(hash);
            return Some(ResolvedAsset {
                bytes,
                hash: hash_hex,
                content_type: "application/wasm",
            });
        }
    }
    None
}

pub fn resolve_icon() -> &'static ResolvedAsset {
    &ICON_ASSET
}

pub fn resolve_snippet(snippet_path: &str) -> Option<Vec<u8>> {
    for dir in get_public_dir_candidates() {
        let full = dir.join("wasm").join("snippets").join(snippet_path);
        if let Ok(bytes) = std::fs::read(&full) {
            return Some(bytes);
        }
    }
    None
}

pub async fn ensure_db(state: &AppState) -> Option<Surreal<Any>> {
    if let Some(db) = state.db.read().await.clone() {
        return Some(db);
    }

    match db::init_db().await {
        Ok(db) => {
            let mut guard = state.db.write().await;
            if let Some(existing_db) = guard.clone() {
                return Some(existing_db);
            }
            *guard = Some(db.clone());
            drop(guard);
            println!("Database is available. API requests will use the database.");
            Some(db)
        }
        Err(error) => {
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
                    ("Cache-Control", "no-cache, no-store, must-revalidate"),
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
        if clean_path == js.hash
            || clean_path == "definy_client.js"
            || clean_path == js_file_with_ext
            || clean_path.ends_with("definy_client.js")
        {
            return (
                StatusCode::OK,
                [
                    ("Content-Type", js.content_type),
                    ("Cache-Control", "no-cache, no-store, must-revalidate"),
                ],
                Bytes::from(js.bytes),
            )
                .into_response();
        }
    }

    if let Some(wasm) = resolve_client_wasm() {
        let wasm_file_with_ext = format!("{}.wasm", wasm.hash);
        if clean_path == wasm.hash
            || clean_path == "definy_client_bg.wasm"
            || clean_path == wasm_file_with_ext
            || clean_path.ends_with("definy_client_bg.wasm")
        {
            return (
                StatusCode::OK,
                [
                    ("Content-Type", wasm.content_type),
                    ("Cache-Control", "no-cache, no-store, must-revalidate"),
                ],
                Bytes::from(wasm.bytes),
            )
                .into_response();
        }
    }

    let icon = resolve_icon();
    if clean_path == icon.hash || clean_path == "icon.png" {
        return (
            StatusCode::OK,
            [
                ("Content-Type", icon.content_type),
                ("Cache-Control", "no-cache, no-store, must-revalidate"),
            ],
            Bytes::from(icon.bytes.clone()),
        )
            .into_response();
    }

    let accepts_html = headers
        .get("accept")
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.contains("text/html"));

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
    handle_html(uri, db.as_ref(), language_resolution.language).await
}

async fn handle_html(
    uri: &Uri,
    db: Option<&Surreal<Any>>,
    language: definy_ui::language::Language,
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
    let html = html::render_to_html(
        &initial_state,
        &context,
        &html::ResourceHash {
            js: js_hash,
            wasm: wasm_hash,
            icon: &icon.hash,
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
        event::handle_events_get,
        event::handle_event_get,
        event::handle_events_post,
    ),
    components(
        schemas(
            event::EventsQuery,
            definy_event::event::EventType,
            definy_event::response::EventsResponse,
        )
    ),
    tags(
        (name = "events", description = "Definy event management API")
    ),
    info(
        title = "definy API",
        version = "0.1.0",
        description = "OpenAPI documentation for definy server"
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
        assert!(json.contains("/events"));
        assert!(json.contains("/events/{hash}"));
        assert!(json.contains("create_account"));
    }

    #[tokio::test]
    async fn test_handle_html_request_event_detail() {
        let state = AppState {
            db: Arc::new(RwLock::new(None)),
        };
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

    #[test]
    fn test_resolve_client_js_and_wasm() {
        let js = resolve_client_js();
        assert!(
            js.is_some(),
            "definy_client.js should be found after dx build --fullstack"
        );
        let wasm = resolve_client_wasm();
        assert!(
            wasm.is_some(),
            "definy_client_bg.wasm should be found after dx build --fullstack"
        );
    }
}
