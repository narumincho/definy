mod db;
mod event;

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use http_body_util::Full;
use hyper::body::Bytes;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::rt::TokioIo;
use narumincho_vdom::Route;
use sha2::Digest;
use tokio::net::TcpListener;
use tokio::sync::RwLock;

#[derive(Clone)]
struct AppState {
    pool: Arc<RwLock<Option<sqlx::postgres::PgPool>>>,
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    println!("Starting definy server...");
    let state = AppState {
        pool: Arc::new(RwLock::new(None)),
    };

    let state_for_retry = state.clone();
    tokio::spawn(async move {
        loop {
            let current_pool = state_for_retry.pool.read().await.clone();

            match current_pool {
                Some(pool) => {
                    if let Err(error) = sqlx::query("select 1").execute(&pool).await {
                        eprintln!(
                            "Database health check failed. Switching to reconnect mode... {:?}",
                            error
                        );
                        let mut guard = state_for_retry.pool.write().await;
                        *guard = None;
                    }
                }
                None => match db::init_db().await {
                    Ok(pool) => {
                        {
                            let mut guard = state_for_retry.pool.write().await;
                            *guard = Some(pool);
                        }
                        println!("Database is available. API requests will use the database.");
                    }
                    Err(error) => {
                        eprintln!(
                            "Failed to connect to database. Retrying in 5 seconds... {:?}",
                            error
                        );
                    }
                },
            }
            tokio::time::sleep(Duration::from_secs(5)).await;
        }
    });

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

const JAVASCRIPT_HASH: &'static str =
    include_str!("../../web-distribution/definy_client.js.sha256");

const WASM_CONTENT: &[u8] = include_bytes!("../../web-distribution/definy_client_bg.wasm");

const WASM_HASH: &'static str = include_str!("../../web-distribution/definy_client_bg.wasm.sha256");

const ICON_CONTENT: &[u8] = include_bytes!("../../assets/icon.png");

const ICON_HASH: &'static str = include_str!("../../web-distribution/icon.png.sha256");

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
        let language = definy_ui::language::language_from_query(uri.query())
            .unwrap_or_else(definy_ui::language::default_language);
        let pool = state.pool.read().await.clone();
        return match pool {
            Some(pool) => handle_html(&uri, &pool, language).await,
            None => db_unavailable_response(true),
        };
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
            let pool = state.pool.read().await.clone();
            match pool {
                Some(pool) => event::handle_events(request, address, &pool).await,
                None => db_unavailable_response(false),
            }
        }
        path => {
            if let Some(event_binary_hash_hex) = path.strip_prefix("events/") {
                let event_binary_hash_hex = event_binary_hash_hex.to_string();
                let pool = state.pool.read().await.clone();
                match pool {
                    Some(pool) => {
                        event::handle_event_get(request, pool, &event_binary_hash_hex).await
                    }
                    None => db_unavailable_response(false),
                }
            } else {
                match path {
                    _ => Response::builder()
                        .status(404)
                        .header("Content-Type", "text/html; charset=utf-8")
                        .body(Full::new(Bytes::from("404 Not Found"))),
                }
            }
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
    pool: &sqlx::postgres::PgPool,
    language: definy_ui::language::Language,
) -> Result<Response<Full<Bytes>>, hyper::http::Error> {
    let path = uri.path();
    let query = uri.query();
    let location = definy_ui::Location::from_url(path);
    if let Some(ref location) = location {
        if location.to_url() != path {
            let mut redirect_url = location.to_url();
            if let Some(query) = query {
                if !query.is_empty() {
                    redirect_url.push('?');
                    redirect_url.push_str(query);
                }
            }
            return Response::builder()
                .status(301)
                .header("Location", redirect_url)
                .body(Full::new(Bytes::from("Redirecting...")));
        }
    }

    let filter_event_type = definy_ui::event_filter_from_query(query);
    let event_binary_array =
        match db::get_events(pool, filter_event_type, Some(20), Some(0)).await {
        Ok(events) => events,
        Err(error) => {
            eprintln!("Failed to get events for SSR: {:?}", error);
            return db_unavailable_response(true);
        }
    };

    let events = event_binary_array
        .iter()
        .into_iter()
        .map(|event_binary| {
            let hash: [u8; 32] = sha2::Sha256::digest(event_binary.as_slice()).into();
            (
                hash,
                definy_event::verify_and_deserialize(event_binary.as_slice()),
            )
        })
        .collect::<Vec<_>>();
    let has_more = events.len() == 20;
    let ssr_initial_state_json =
        definy_ui::encode_ssr_state(&event_binary_array.into_vec(), has_more);

    Response::builder()
        .header("Content-Type", "text/html; charset=utf-8")
        .body(Full::new(Bytes::from(narumincho_vdom::to_html(
            &definy_ui::render(
                &definy_ui::build_initial_state(
                    location,
                    events,
                    false,
                    has_more,
                    None,
                    filter_event_type,
                    language,
                ),
                &Some(definy_ui::ResourceHash {
                    js: JAVASCRIPT_HASH.to_string(),
                    wasm: WASM_HASH.to_string(),
                }),
                ssr_initial_state_json.as_deref(),
            ),
        ))))
}

fn lang_redirect_url(request: &Request<impl hyper::body::Body>) -> Option<String> {
    if definy_ui::language::language_from_query(request.uri().query()).is_some() {
        return None;
    }
    let accept_language = request
        .headers()
        .get("accept-language")
        .and_then(|value| value.to_str().ok());
    let best = definy_ui::language::best_language_from_accept_language(accept_language);
    Some(build_url_with_lang(request.uri(), best.code))
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
