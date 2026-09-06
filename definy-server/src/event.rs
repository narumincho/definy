use std::net::SocketAddr;

use axum::body::Bytes;
use axum::extract::{ConnectInfo, Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};

use crate::AppState;

#[derive(serde::Deserialize)]
pub struct EventsQuery {
    pub event_type: Option<definy_event::event::EventType>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

pub async fn handle_event_get(
    State(state): State<AppState>,
    Path(event_binary_hash_base64): Path<String>,
    headers: HeaderMap,
) -> Response {
    let event_binary_hash = match base64::Engine::decode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        &event_binary_hash_base64,
    ) {
        Ok(event_binary_hash) => event_binary_hash,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                [("Content-Type", "text/html; charset=utf-8")],
                "400 Bad Request: Invalid ID format",
            )
                .into_response();
        }
    };

    let db = match crate::ensure_db(&state).await {
        Some(db) => db,
        None => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                [
                    ("Content-Type", "text/html; charset=utf-8"),
                    ("Access-Control-Allow-Origin", "*"),
                ],
                "Database is unavailable",
            )
                .into_response();
        }
    };

    match crate::db::get_event(&db, &event_binary_hash).await {
        Err(e) => {
            eprintln!("Failed to get event: {:?}", e);
            (
                StatusCode::SERVICE_UNAVAILABLE,
                [
                    ("Content-Type", "text/html; charset=utf-8"),
                    ("Access-Control-Allow-Origin", "*"),
                ],
                "Database is unavailable",
            )
                .into_response()
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            [
                ("Content-Type", "text/html; charset=utf-8"),
                ("Access-Control-Allow-Origin", "*"),
            ],
            "404 Not Found",
        )
            .into_response(),
        Ok(Some(event_binary)) => {
            if let Some(accept) = headers.get("accept")
                && let Ok(accept_as_str) = accept.to_str()
                && accept_as_str.contains("text/html")
            {
                return (
                    StatusCode::OK,
                    [
                        ("Content-Type", "text/html; charset=utf-8"),
                        ("Access-Control-Allow-Origin", "*"),
                    ],
                    "todo",
                )
                    .into_response();
            }
            (
                StatusCode::OK,
                [
                    ("Content-Type", "application/cbor"),
                    ("Access-Control-Allow-Origin", "*"),
                ],
                event_binary,
            )
                .into_response()
        }
    }
}

pub async fn handle_events_get(
    State(state): State<AppState>,
    Query(query): Query<EventsQuery>,
) -> Response {
    let db = match crate::ensure_db(&state).await {
        Some(db) => db,
        None => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                [
                    ("Content-Type", "text/html; charset=utf-8"),
                    ("Access-Control-Allow-Origin", "*"),
                ],
                "Database is unavailable",
            )
                .into_response();
        }
    };

    match crate::db::get_events(&db, query.event_type, query.limit, query.offset).await {
        Err(e) => {
            eprintln!("Failed to get events: {:?}", e);
            (
                StatusCode::SERVICE_UNAVAILABLE,
                [
                    ("Content-Type", "text/html; charset=utf-8"),
                    ("Access-Control-Allow-Origin", "*"),
                ],
                "Database is unavailable",
            )
                .into_response()
        }
        Ok(events) => {
            match serde_cbor::to_vec(&definy_event::response::EventsResponse {
                events,
                next_cursor: None,
            }) {
                Ok(cbor) => (
                    StatusCode::OK,
                    [
                        ("Content-Type", "application/cbor"),
                        ("Access-Control-Allow-Origin", "*"),
                    ],
                    cbor,
                )
                    .into_response(),
                Err(e) => {
                    eprintln!("Failed to serialize events: {:?}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        [
                            ("Content-Type", "text/html; charset=utf-8"),
                            ("Access-Control-Allow-Origin", "*"),
                        ],
                        "Internal Server Error",
                    )
                        .into_response()
                }
            }
        }
    }
}

pub async fn handle_events_post(
    State(state): State<AppState>,
    ConnectInfo(address): ConnectInfo<SocketAddr>,
    body: Bytes,
) -> Response {
    let db = match crate::ensure_db(&state).await {
        Some(db) => db,
        None => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                [
                    ("content-type", "text/plain; charset=utf-8"),
                    ("Access-Control-Allow-Origin", "*"),
                ],
                "Database is unavailable",
            )
                .into_response();
        }
    };

    match definy_event::verify_and_deserialize(&body) {
        Ok((signature, data)) => {
            match crate::db::save_event(&data, &signature, &body, address, &db).await {
                Ok(()) => (
                    StatusCode::OK,
                    [
                        ("content-type", "text/plain; charset=utf-8"),
                        ("Access-Control-Allow-Origin", "*"),
                    ],
                    "OK",
                )
                    .into_response(),
                Err(e) => {
                    eprintln!("Failed to save event: {:?}", e);
                    (
                        StatusCode::SERVICE_UNAVAILABLE,
                        [
                            ("content-type", "text/plain; charset=utf-8"),
                            ("Access-Control-Allow-Origin", "*"),
                        ],
                        "Database is unavailable",
                    )
                        .into_response()
                }
            }
        }
        Err(e) => {
            eprintln!("Failed to parse or verify CBOR: {:?}", e);
            (
                StatusCode::BAD_REQUEST,
                [
                    ("content-type", "text/plain; charset=utf-8"),
                    ("Access-Control-Allow-Origin", "*"),
                ],
                "Failed to parse or verify CBOR",
            )
                .into_response()
        }
    }
}
