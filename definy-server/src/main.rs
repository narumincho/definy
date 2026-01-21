use std::net::SocketAddr;

use http_body_util::{BodyExt, Full};
use hyper::body::Bytes;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::rt::TokioIo;
use sqlx::Connection;
use tokio::net::TcpListener;

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    println!("Starting definy server...");

    println!("Connecting to postgresql...");

    let mut pool = sqlx::postgres::PgConnection::connect(
        std::env::var("DATABASE_URL")
            .expect("environment variable DATABASE_URL must be set")
            .as_str(),
    )
    .await?;

    let rows = sqlx::query("select * from version()")
        .fetch_all(&mut pool)
        .await?;
    for row in rows {
        println!("{:?}", row);
    }

    println!("Connecting to postgresql... done");

    let addr = SocketAddr::from(([127, 0, 0, 1], 8000));

    let listener = TcpListener::bind(addr).await?;

    println!("Listening on http://{}", addr);

    loop {
        let (stream, _) = listener.accept().await?;

        let io = TokioIo::new(stream);

        tokio::task::spawn(async move {
            if let Err(err) = http1::Builder::new()
                .serve_connection(io, service_fn(handler))
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
) -> Result<Response<Full<Bytes>>, hyper::http::Error> {
    let path = request.uri().path();
    println!("Received request for path: {}", path);
    match path.trim_start_matches('/') {
        "" => Response::builder()
            .header("Content-Type", "text/html; charset=utf-8")
            .body(Full::new(Bytes::from(narumincho_vdom::to_html(
                &definy_ui::app(
                    &definy_ui::AppState {
                        count: 0,
                        generated_key: None,
                        generated_public_key: None,
                        username: String::new(),
                    },
                    &Some(definy_ui::ResourceHash {
                        js: JAVASCRIPT_HASH.to_string(),
                        wasm: WASM_HASH.to_string(),
                    }),
                ),
            )))),
        "samplePost" => {
            let body = request.into_body();
            match body.collect().await {
                Ok(collected) => {
                    let bytes = collected.to_bytes();
                    match serde_cbor::from_slice::<definy_event::CreateAccountEvent>(&bytes) {
                        Ok(data) => {
                            println!("Received CBOR data: {:?}", data);
                            Response::builder().body(Full::new(Bytes::from("Data received")))
                        }
                        Err(e) => {
                            eprintln!("Failed to parse CBOR: {:?}", e);
                            Response::builder()
                                .status(400)
                                .body(Full::new(Bytes::from("Invalid CBOR")))
                        }
                    }
                }
                Err(_) => Response::builder()
                    .status(500)
                    .body(Full::new(Bytes::from("Failed to read body"))),
            }
        }
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
