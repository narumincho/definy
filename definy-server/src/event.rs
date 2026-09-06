use std::net::SocketAddr;

use axum::body::Bytes;
use axum::extract::{ConnectInfo, Path, Query};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use definy_event::event::EventType;
use definy_event::response::EventsResponse;
use utoipa::{IntoParams, ToSchema};

use crate::error::ApiError;
use crate::extractor::Database;

#[derive(serde::Deserialize, IntoParams, ToSchema)]
pub struct EventsQuery {
    /// Filter events by event type
    #[param(inline)]
    pub event_type: Option<EventType>,
    /// Maximum number of events to return
    pub limit: Option<usize>,
    /// Offset of events for pagination
    pub offset: Option<usize>,
}

#[utoipa::path(
    get,
    path = "/events/{hash}",
    tag = "events",
    params(
        ("hash" = String, Path, description = "URL-safe base64 encoded event binary hash")
    ),
    responses(
        (status = 200, description = "CBOR binary of the requested event", content_type = "application/cbor"),
        (status = 400, description = "Invalid event hash format"),
        (status = 404, description = "Event not found"),
        (status = 503, description = "Database is unavailable")
    )
)]
pub async fn handle_event_get(
    Database(db): Database,
    Path(event_binary_hash_base64): Path<String>,
    headers: HeaderMap,
) -> Result<Response, ApiError> {
    let event_binary_hash = base64::Engine::decode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        &event_binary_hash_base64,
    )
    .map_err(|_| ApiError::BadRequest("Invalid ID format".to_string()))?;

    let event_binary = crate::db::get_event(&db, &event_binary_hash)
        .await
        .map_err(|e| {
            eprintln!("Failed to get event: {:?}", e);
            ApiError::DatabaseUnavailable
        })?
        .ok_or(ApiError::NotFound)?;

    if let Some(accept) = headers.get("accept")
        && let Ok(accept_as_str) = accept.to_str()
        && accept_as_str.contains("text/html")
    {
        return Ok((
            StatusCode::OK,
            [("Content-Type", "text/html; charset=utf-8")],
            "todo",
        )
            .into_response());
    }

    Ok((
        StatusCode::OK,
        [("Content-Type", "application/cbor")],
        event_binary,
    )
        .into_response())
}

#[utoipa::path(
    get,
    path = "/events",
    tag = "events",
    params(EventsQuery),
    responses(
        (status = 200, description = "Events fetched successfully as CBOR", body = EventsResponse, content_type = "application/cbor"),
        (status = 500, description = "Failed to serialize events"),
        (status = 503, description = "Database is unavailable")
    )
)]
pub async fn handle_events_get(
    Database(db): Database,
    Query(query): Query<EventsQuery>,
) -> Result<Response, ApiError> {
    let events = crate::db::get_events(&db, query.event_type, query.limit, query.offset)
        .await
        .map_err(|e| {
            eprintln!("Failed to get events: {:?}", e);
            ApiError::DatabaseUnavailable
        })?;

    let response_data = definy_event::response::EventsResponse {
        events,
        next_cursor: None,
    };

    let cbor = serde_cbor::to_vec(&response_data).map_err(|e| {
        eprintln!("Failed to serialize events: {:?}", e);
        ApiError::Internal("Failed to serialize events".to_string())
    })?;

    Ok((StatusCode::OK, [("Content-Type", "application/cbor")], cbor).into_response())
}

#[utoipa::path(
    post,
    path = "/events",
    tag = "events",
    request_body(
        content = inline(Vec<u8>),
        content_type = "application/cbor",
        description = "Signed event serialized in CBOR format"
    ),
    responses(
        (status = 200, description = "Event saved successfully", body = String, content_type = "text/plain"),
        (status = 400, description = "Failed to parse or verify CBOR", body = String, content_type = "text/plain"),
        (status = 503, description = "Database is unavailable", body = String, content_type = "text/plain")
    )
)]
pub async fn handle_events_post(
    Database(db): Database,
    ConnectInfo(address): ConnectInfo<SocketAddr>,
    body: Bytes,
) -> Result<Response, ApiError> {
    let (signature, data) = definy_event::verify_and_deserialize(&body).map_err(|e| {
        eprintln!("Failed to parse or verify CBOR: {:?}", e);
        ApiError::BadRequest("Failed to parse or verify CBOR".to_string())
    })?;

    crate::db::save_event(&data, &signature, &body, address, &db)
        .await
        .map_err(|e| {
            eprintln!("Failed to save event: {:?}", e);
            ApiError::DatabaseUnavailable
        })?;

    Ok((
        StatusCode::OK,
        [("Content-Type", "text/plain; charset=utf-8")],
        "OK",
    )
        .into_response())
}
