mod db;
mod event;

use std::net::SocketAddr;

use http_body_util::Full;
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
        let pool = pool.clone();

        tokio::task::spawn(async move {
            if let Err(err) = http1::Builder::new()
                .serve_connection(
                    io,
                    service_fn(move |request| handler(request, address, pool.clone())),
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
    pool: sqlx::postgres::PgPool,
) -> Result<Response<Full<Bytes>>, hyper::http::Error> {
    let path = request.uri().path();
    println!(
        "Received request: {} {} from {}",
        request.method(),
        path,
        address
    );
    match path.trim_start_matches('/') {
        "" => Response::builder()
            .header("Content-Type", "text/html; charset=utf-8")
            .body(Full::new(Bytes::from(narumincho_vdom::to_html(
                &definy_ui::render(
                    &definy_ui::AppState {
                        login_or_create_account_dialog_state:
                            definy_ui::LoginOrCreateAccountDialogState {
                                generated_key: None,
                                state: definy_ui::CreatingAccountState::LogIn,
                                username: String::new(),
                                current_password: String::new(),
                            },
                        created_account_events: Vec::new(),
                        current_key: None,
                        message_input: String::new(),
                        location: definy_ui::Location::Home,
                    },
                    &Some(definy_ui::ResourceHash {
                        js: JAVASCRIPT_HASH.to_string(),
                        wasm: WASM_HASH.to_string(),
                    }),
                ),
            )))),
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
        "events" => event::handle_events(request, address, &pool).await,
        path => {
            if let Some(event_binary_hash_hex) = path.strip_prefix("events/") {
                let event_binary_hash_hex = event_binary_hash_hex.to_string();
                event::handle_event_get(request, pool, &event_binary_hash_hex).await
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
