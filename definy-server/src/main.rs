use std::net::SocketAddr;

use http_body_util::Full;
use hyper::body::Bytes;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::rt::TokioIo;
use tokio::net::TcpListener;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
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

async fn handler(
    request: Request<hyper::body::Incoming>,
) -> Result<Response<Full<Bytes>>, hyper::http::Error> {
    match request.uri().path() {
        "/" => Response::builder()
            .header("Content-Type", "text/html; charset=utf-8")
            .body(Full::new(Bytes::from(narumincho_vdom::to_html(
                &definy_ui::app(),
            )))),
        "/script.js" => Response::builder()
            .header("Content-Type", "application/javascript; charset=utf-8")
            .body(Full::new(Bytes::from(include_str!(
                "../../web-distribution/definy_client.js"
            )))),
        "/definy_client_bg.wasm" => Response::builder()
            .header("Content-Type", "application/wasm")
            .body(Full::new(Bytes::from_static(include_bytes!(
                "../../web-distribution/definy_client_bg.wasm"
            )))),
        _ => Response::builder()
            .status(404)
            .header("Content-Type", "text/html; charset=utf-8")
            .body(Full::new(Bytes::from("404 Not Found"))),
    }
}
