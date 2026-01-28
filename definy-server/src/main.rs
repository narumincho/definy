mod db;

use std::net::SocketAddr;

use http_body_util::{BodyExt, Full};
use hyper::body::Bytes;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::rt::TokioIo;
use tokio::net::TcpListener;

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    println!("Starting definy server...");

    let pool = db::init_db().await?;

    let addr = SocketAddr::from(([127, 0, 0, 1], 8000));

    let listener = TcpListener::bind(addr).await?;

    println!("Listening on http://{}", addr);

    loop {
        let (stream, _) = listener.accept().await?;

        let io = TokioIo::new(stream);
        let pool = pool.clone();

        tokio::task::spawn(async move {
            if let Err(err) = http1::Builder::new()
                .serve_connection(
                    io,
                    service_fn(move |request| handler(request, pool.clone())),
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
    pool: sqlx::postgres::PgPool,
) -> Result<Response<Full<Bytes>>, hyper::http::Error> {
    let path = request.uri().path();
    println!("Received request: {} {}", request.method(), path);
    match path.trim_start_matches('/') {
        "" => Response::builder()
            .header("Content-Type", "text/html; charset=utf-8")
            .body(Full::new(Bytes::from(narumincho_vdom::to_html(
                &definy_ui::app(
                    &definy_ui::AppState {
                        login_or_create_account_dialog_state:
                            definy_ui::LoginOrCreateAccountDialogState {
                                generated_key: None,
                                creating_account: definy_ui::CreatingAccountState::NotStarted,
                                username: String::new(),
                                current_password: String::new(),
                            },
                        created_account_events: Vec::new(),
                    },
                    &Some(definy_ui::ResourceHash {
                        js: JAVASCRIPT_HASH.to_string(),
                        wasm: WASM_HASH.to_string(),
                    }),
                ),
            )))),
        "events" => handle_events(request, &pool).await,
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
        _ => Response::builder()
            .status(404)
            .header("Content-Type", "text/html; charset=utf-8")
            .body(Full::new(Bytes::from("404 Not Found"))),
    }
}

async fn handle_events(
    request: Request<impl hyper::body::Body>,
    pool: &sqlx::postgres::PgPool,
) -> Result<Response<Full<Bytes>>, hyper::http::Error> {
    match request.method() {
        &hyper::Method::GET => handle_events_get(pool).await,
        &hyper::Method::POST => handle_events_post(request, pool).await,
        _ => Response::builder()
            .status(405)
            .header("Content-Type", "text/html; charset=utf-8")
            .body(Full::new(Bytes::from("405 Method Not Allowed"))),
    }
}

async fn handle_events_get(
    pool: &sqlx::postgres::PgPool,
) -> Result<Response<Full<Bytes>>, hyper::http::Error> {
    match db::get_events(pool).await {
        Ok(events) => {
            let events_for_cbor = events
                .iter()
                .map(|event_raw| serde_cbor::Value::Bytes(event_raw.to_vec()))
                .collect::<Vec<serde_cbor::Value>>();
            match serde_cbor::to_vec(&events_for_cbor) {
                Ok(cbor) => Response::builder()
                    .status(200)
                    .header("Content-Type", "application/cbor")
                    .body(Full::new(Bytes::from(cbor))),
                Err(e) => {
                    eprintln!("Failed to serialize events: {:?}", e);
                    Response::builder()
                        .status(500)
                        .header("Content-Type", "text/html; charset=utf-8")
                        .body(Full::new(Bytes::from("Internal Server Error")))
                }
            }
        }
        Err(e) => {
            eprintln!("Failed to get events: {:?}", e);
            Response::builder()
                .status(500)
                .header("Content-Type", "text/html; charset=utf-8")
                .body(Full::new(Bytes::from("Internal Server Error")))
        }
    }
}

async fn handle_events_post(
    request: Request<impl hyper::body::Body>,
    pool: &sqlx::postgres::PgPool,
) -> Result<Response<Full<Bytes>>, hyper::http::Error> {
    let body = request.into_body();
    match body.collect().await {
        Ok(collected) => {
            let bytes = collected.to_bytes();
            match definy_event::verify_and_deserialize(&bytes) {
                Ok((data, signature)) => {
                    match db::save_create_account_event(&data, &signature, &bytes, pool).await {
                        Ok(()) => Response::builder()
                            .header("content-type", "text/plain; charset=utf-8")
                            .body(Full::new(Bytes::from("OK"))),
                        Err(e) => {
                            eprintln!("Failed to save event: {:?}", e);
                            Response::builder()
                                .status(500)
                                .header("content-type", "text/plain; charset=utf-8")
                                .body(Full::new(Bytes::from("Internal Server Error")))
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Failed to parse or verify CBOR: {:?}", e);
                    Response::builder()
                        .status(400)
                        .header("content-type", "text/plain; charset=utf-8")
                        .body(Full::new(Bytes::from("Failed to parse or verify CBOR")))
                }
            }
        }
        Err(_) => Response::builder()
            .status(500)
            .header("content-type", "text/plain; charset=utf-8")
            .body(Full::new(Bytes::from("Failed to read body"))),
    }
}
