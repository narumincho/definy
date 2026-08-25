mod db;
mod event;
mod html;

use std::net::SocketAddr;
use std::sync::Arc;

use http_body_util::Full;
use hyper::body::Bytes;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::rt::TokioIo;

use surrealdb::Surreal;
use surrealdb::engine::any::Any;
use tokio::net::TcpListener;
use tokio::sync::RwLock;

#[derive(Clone)]
struct AppState {
    db: Arc<RwLock<Option<Surreal<Any>>>>,
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    println!("Starting definy server...");
    let state = AppState {
        db: Arc::new(RwLock::new(None)),
    };

    let addr = SocketAddr::from((
        std::net::IpAddr::V6(match std::env::var("FLY_APP_NAME") {
            Ok(_) => std::net::Ipv6Addr::UNSPECIFIED,
            Err(_) => std::net::Ipv6Addr::LOCALHOST,
        }),
        8000,
    ));

    let listener = TcpListener::bind(addr).await?;

    println!("Listening on http://{}", addr);

    loop {
        let (stream, address) = listener.accept().await?;

        let io = TokioIo::new(stream);
        let state = state.clone();

        tokio::task::spawn(async move {
            if let Err(err) = http1::Builder::new()
                .serve_connection(
                    io,
                    service_fn(move |request| handler(request, address, state.clone())),
                )
                .await
            {
                eprintln!("Error serving connection: {:?}", err);
            }
        });
    }
}

const JAVASCRIPT_CONTENT: &[u8] = include_bytes!("../../web-distribution/definy_client.js");

const JAVASCRIPT_HASH: &str = include_str!("../../web-distribution/definy_client.js.sha256");

const WASM_CONTENT: &[u8] = include_bytes!("../../web-distribution/definy_client_bg.wasm");

const WASM_HASH: &str = include_str!("../../web-distribution/definy_client_bg.wasm.sha256");

const ICON_CONTENT: &[u8] = include_bytes!("../../assets/icon.png");

const ICON_HASH: &str = include_str!("../../web-distribution/icon.png.sha256");

static SNIPPETS_DIR: include_dir::Dir =
    include_dir::include_dir!("$CARGO_MANIFEST_DIR/../web-distribution/snippets");

async fn handler(
    request: Request<impl hyper::body::Body>,
    address: SocketAddr,
    state: AppState,
) -> Result<Response<Full<Bytes>>, hyper::http::Error> {
    let uri = request.uri().clone();
    let path = uri.path();
    println!(
        "Received request: {} {} from {}",
        request.method(),
        path,
        address
    );

    let accepts_html = request
        .headers()
        .get("accept")
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.contains("text/html"));

    if accepts_html {
        if let Some(redirect_url) = lang_redirect_url(&request) {
            return Response::builder()
                .status(302)
                .header("Location", redirect_url)
                .body(Full::new(Bytes::from("Redirecting...")));
        }
        let accept_language = request
            .headers()
            .get("accept-language")
            .and_then(|value| value.to_str().ok());
        let language_resolution =
            definy_ui::language::resolve_language(uri.query(), accept_language);
        let db = ensure_db(&state).await;
        return handle_html(&uri, db.as_ref(), language_resolution.language).await;
    }

    match path.trim_start_matches('/') {
        JAVASCRIPT_HASH => Response::builder()
            .header("Content-Type", "application/javascript; charset=utf-8")
            .header("Cache-Control", "public, max-age=31536000, immutable")
            .body(Full::new(Bytes::from_static(JAVASCRIPT_CONTENT))),
        WASM_HASH => Response::builder()
            .header("Content-Type", "application/wasm")
            .header("Cache-Control", "public, max-age=31536000, immutable")
            .body(Full::new(Bytes::from_static(WASM_CONTENT))),
        ICON_HASH => Response::builder()
            .header("Content-Type", "image/png")
            .header("Cache-Control", "public, max-age=31536000, immutable")
            .body(Full::new(Bytes::from_static(ICON_CONTENT))),
        "events" => {
            let db = ensure_db(&state).await;
            match db {
                Some(db) => event::handle_events(request, address, &db).await,
                None => db_unavailable_response(false),
            }
        }
        path => {
            if let Some(snippet_path) = path.strip_prefix("snippets/") {
                if let Some(file) = SNIPPETS_DIR.get_file(snippet_path) {
                    Response::builder()
                        .header("Content-Type", "application/javascript; charset=utf-8")
                        .header("Cache-Control", "public, max-age=31536000, immutable")
                        .body(Full::new(Bytes::from_static(file.contents())))
                } else {
                    Response::builder()
                        .status(404)
                        .header("Content-Type", "text/plain; charset=utf-8")
                        .body(Full::new(Bytes::from("Snippet Not Found")))
                }
            } else if let Some(event_binary_hash_hex) = path.strip_prefix("events/") {
                let event_binary_hash_hex = event_binary_hash_hex.to_string();
                let db = ensure_db(&state).await;
                match db {
                    Some(db) => event::handle_event_get(request, &db, &event_binary_hash_hex).await,
                    None => db_unavailable_response(false),
                }
            } else {
                Response::builder()
                    .status(404)
                    .header("Content-Type", "text/html; charset=utf-8")
                    .body(Full::new(Bytes::from("404 Not Found")))
            }
        }
    }
}

async fn ensure_db(state: &AppState) -> Option<Surreal<Any>> {
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

fn db_unavailable_response(wants_html: bool) -> Result<Response<Full<Bytes>>, hyper::http::Error> {
    if wants_html {
        return Response::builder()
            .status(503)
            .header("Content-Type", "text/html; charset=utf-8")
            .body(Full::new(Bytes::from(
                "<!doctype html><html><head><meta charset=\"utf-8\"><title>503 Service Unavailable</title></head><body><h1>データベースに接続できません</h1></body></html>",
            )));
    }

    Response::builder()
        .status(503)
        .header("Content-Type", "text/plain; charset=utf-8")
        .body(Full::new(Bytes::from("Database is unavailable")))
}

async fn handle_html(
    uri: &hyper::Uri,
    db: Option<&Surreal<Any>>,
    language: definy_ui::language::Language,
) -> Result<Response<Full<Bytes>>, hyper::http::Error> {
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
        return Response::builder()
            .status(301)
            .header("Location", redirect_url)
            .body(Full::new(Bytes::from("Redirecting...")));
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

    Response::builder()
        .header("Content-Type", "text/html; charset=utf-8")
        .body(Full::new(Bytes::from(html)))
}

fn lang_redirect_url(request: &Request<impl hyper::body::Body>) -> Option<String> {
    if definy_ui::query::parse_query(request.uri().query())
        .lang
        .is_some()
    {
        return None;
    }
    let accept_language = request
        .headers()
        .get("accept-language")
        .and_then(|value| value.to_str().ok());
    let best = definy_ui::language::best_language_from_accept_language(accept_language);
    Some(build_url_with_lang(request.uri(), best.to_code()))
}

fn build_url_with_lang(uri: &hyper::Uri, lang_code: &str) -> String {
    let mut params = definy_ui::query::parse_query(uri.query());
    params.lang = Some(lang_code.to_string());
    let mut url = uri.path().to_string();
    if let Some(query) = definy_ui::query::build_query(params) {
        url.push('?');
        url.push_str(query.as_str());
    }
    url
}
