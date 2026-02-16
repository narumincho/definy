use std::net::SocketAddr;

use http_body_util::{BodyExt, Full};
use hyper::body::Bytes;
use hyper::{Request, Response};

pub async fn handle_event_get(
    request: Request<impl hyper::body::Body>,
    pool: sqlx::postgres::PgPool,
    event_binary_hash_base64: &str,
) -> Result<Response<Full<Bytes>>, hyper::http::Error> {
    if request.method() != hyper::Method::GET {
        return Response::builder()
            .status(405)
            .header("Content-Type", "text/html; charset=utf-8")
            .body(Full::new(Bytes::from("405 Method Not Allowed")));
    }

    let event_binary_hash = match base64::Engine::decode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        event_binary_hash_base64,
    ) {
        Ok(event_binary_hash) => event_binary_hash,
        Err(_) => {
            return Response::builder()
                .status(400)
                .header("Content-Type", "text/html; charset=utf-8")
                .body(Full::new(Bytes::from("400 Bad Request: Invalid ID format")));
        }
    };

    match crate::db::get_event(&pool, &event_binary_hash).await {
        Ok(Some(event_binary)) => Response::builder()
            .status(200)
            .header("Content-Type", "application/cbor")
            .body(Full::new(Bytes::from(event_binary))),
        Ok(None) => Response::builder()
            .status(404)
            .header("Content-Type", "text/html; charset=utf-8")
            .body(Full::new(Bytes::from("404 Not Found"))),
        Err(e) => {
            eprintln!("Failed to get event: {:?}", e);
            Response::builder()
                .status(500)
                .header("Content-Type", "text/html; charset=utf-8")
                .body(Full::new(Bytes::from("Internal Server Error")))
        }
    }
}

#[derive(serde::Deserialize)]
struct EventsQuery {
    event_type: Option<definy_event::event::EventType>,
}

pub async fn handle_events(
    request: Request<impl hyper::body::Body>,
    address: SocketAddr,
    pool: &sqlx::postgres::PgPool,
) -> Result<Response<Full<Bytes>>, hyper::http::Error> {
    match request.method() {
        &hyper::Method::GET => handle_events_get(request.uri().query(), pool).await,
        &hyper::Method::POST => handle_events_post(request, address, pool).await,
        _ => Response::builder()
            .status(405)
            .header("Content-Type", "text/html; charset=utf-8")
            .body(Full::new(Bytes::from("405 Method Not Allowed"))),
    }
}

async fn handle_events_get(
    query: Option<&str>,
    pool: &sqlx::postgres::PgPool,
) -> Result<Response<Full<Bytes>>, hyper::http::Error> {
    match serde_urlencoded::from_str::<EventsQuery>(query.unwrap_or("")) {
        Err(_) => Response::builder()
            .status(400)
            .header("Content-Type", "text/html; charset=utf-8")
            .body(Full::new(Bytes::from(
                "400 Bad Request: Invalid query format",
            ))),
        Ok(query) => match crate::db::get_events(pool, query.event_type).await {
            Err(e) => {
                eprintln!("Failed to get events: {:?}", e);
                Response::builder()
                    .status(500)
                    .header("Content-Type", "text/html; charset=utf-8")
                    .body(Full::new(Bytes::from("Internal Server Error")))
            }
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
        },
    }
}

async fn handle_events_post(
    request: Request<impl hyper::body::Body>,
    address: SocketAddr,
    pool: &sqlx::postgres::PgPool,
) -> Result<Response<Full<Bytes>>, hyper::http::Error> {
    let body = request.into_body();
    match body.collect().await {
        Ok(collected) => {
            let bytes = collected.to_bytes();
            match definy_event::verify_and_deserialize(&bytes) {
                Ok((data, signature)) => {
                    match crate::db::save_event(&data, &signature, &bytes, address, pool).await {
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
