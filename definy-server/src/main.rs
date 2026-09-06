mod builtin_migration;
mod db;
mod event;
mod html;

use std::net::SocketAddr;
use std::sync::Arc;

use axum::body::Bytes;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode, Uri};
use axum::response::{IntoResponse, Redirect, Response};
use axum::routing::get;
use surrealdb::Surreal;
use surrealdb::engine::any::Any;
use tokio::net::TcpListener;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<RwLock<Option<Surreal<Any>>>>,
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    println!("Starting definy server (Axum)...");
    let state = AppState {
        db: Arc::new(RwLock::new(None)),
    };

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8000);

    let addr = SocketAddr::from((
        std::net::IpAddr::V6(match std::env::var("FLY_APP_NAME") {
            Ok(_) => std::net::Ipv6Addr::UNSPECIFIED,
            Err(_) => std::net::Ipv6Addr::LOCALHOST,
        }),
        port,
    ));

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

const JAVASCRIPT_CONTENT: &[u8] = include_bytes!("../../web-distribution/definy_client.js");

const JAVASCRIPT_HASH: &str = include_str!("../../web-distribution/definy_client.js.sha256");

const WASM_CONTENT: &[u8] = include_bytes!("../../web-distribution/definy_client_bg.wasm");

const WASM_HASH: &str = include_str!("../../web-distribution/definy_client_bg.wasm.sha256");

const ICON_CONTENT: &[u8] = include_bytes!("../../assets/icon.png");

const ICON_HASH: &str = include_str!("../../web-distribution/icon.png.sha256");

static SNIPPETS_DIR: include_dir::Dir =
    include_dir::include_dir!("$CARGO_MANIFEST_DIR/../web-distribution/snippets");

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

    if trimmed_path == JAVASCRIPT_HASH {
        return (
            StatusCode::OK,
            [
                ("Content-Type", "application/javascript; charset=utf-8"),
                ("Cache-Control", "public, max-age=31536000, immutable"),
            ],
            Bytes::from_static(JAVASCRIPT_CONTENT),
        )
            .into_response();
    }

    if trimmed_path == WASM_HASH {
        return (
            StatusCode::OK,
            [
                ("Content-Type", "application/wasm"),
                ("Cache-Control", "public, max-age=31536000, immutable"),
            ],
            Bytes::from_static(WASM_CONTENT),
        )
            .into_response();
    }

    if trimmed_path == ICON_HASH {
        return (
            StatusCode::OK,
            [
                ("Content-Type", "image/png"),
                ("Cache-Control", "public, max-age=31536000, immutable"),
            ],
            Bytes::from_static(ICON_CONTENT),
        )
            .into_response();
    }

    if let Some(snippet_path) = trimmed_path.strip_prefix("snippets/") {
        if let Some(file) = SNIPPETS_DIR.get_file(snippet_path) {
            return (
                StatusCode::OK,
                [
                    ("Content-Type", "application/javascript; charset=utf-8"),
                    ("Cache-Control", "public, max-age=31536000, immutable"),
                ],
                Bytes::from_static(file.contents()),
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

    let accepts_html = headers
        .get("accept")
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.contains("text/html"));

    if accepts_html {
        if let Some(redirect_url) = lang_redirect_url(&uri, &headers) {
            return Redirect::temporary(&redirect_url).into_response();
        }
        let accept_language = headers
            .get("accept-language")
            .and_then(|value| value.to_str().ok());
        let language_resolution =
            definy_ui::language::resolve_language(uri.query(), accept_language);
        let db = ensure_db(&state).await;
        return handle_html(&uri, db.as_ref(), language_resolution.language).await;
    }

    (
        StatusCode::NOT_FOUND,
        [("Content-Type", "text/html; charset=utf-8")],
        "404 Not Found",
    )
        .into_response()
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
    let html = html::render_to_html(
        &initial_state,
        &context,
        &html::ResourceHash {
            js: JAVASCRIPT_HASH,
            wasm: WASM_HASH,
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
            event::EventTypeDoc,
            event::EventsResponseDoc,
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
}
