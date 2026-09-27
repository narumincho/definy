use std::net::SocketAddr;
use std::str::FromStr;

use axum::body::Bytes;
use axum::extract::ConnectInfo;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use definy_event::EventHashId;
use definy_event::rpc::*;
use prost::Message;

use crate::AppState;
use crate::extractor::Database;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ContentCodec {
    Json,
    Proto,
}

impl ContentCodec {
    fn from_headers(headers: &HeaderMap) -> Self {
        if let Some(content_type) = headers.get(axum::http::header::CONTENT_TYPE)
            && let Ok(val) = content_type.to_str()
            && val.contains("application/proto")
        {
            return ContentCodec::Proto;
        }
        ContentCodec::Json
    }

    fn content_type_header(self) -> &'static str {
        match self {
            ContentCodec::Json => "application/json",
            ContentCodec::Proto => "application/proto",
        }
    }
}

fn decode_request<M: Message + serde::de::DeserializeOwned + Default>(
    codec: ContentCodec,
    body: &Bytes,
) -> Result<M, ConnectError> {
    match codec {
        ContentCodec::Proto => {
            M::decode(body.as_ref()).map_err(|e| ConnectError::invalid_argument(e.to_string()))
        }
        ContentCodec::Json => {
            if body.is_empty() {
                Ok(M::default())
            } else {
                serde_json::from_slice(body)
                    .map_err(|e| ConnectError::invalid_argument(e.to_string()))
            }
        }
    }
}

fn encode_response<M: Message + serde::Serialize>(
    codec: ContentCodec,
    msg: &M,
) -> Result<Response, ConnectError> {
    let (body_bytes, content_type) = match codec {
        ContentCodec::Proto => {
            let mut buf = Vec::with_capacity(msg.encoded_len());
            msg.encode(&mut buf)
                .map_err(|e| ConnectError::internal(e.to_string()))?;
            (buf, ContentCodec::Proto.content_type_header())
        }
        ContentCodec::Json => {
            let buf = serde_json::to_vec(msg).map_err(|e| ConnectError::internal(e.to_string()))?;
            (buf, ContentCodec::Json.content_type_header())
        }
    };

    Ok((
        StatusCode::OK,
        [
            (axum::http::header::CONTENT_TYPE.as_str(), content_type),
            ("connect-protocol-version", CONNECT_PROTOCOL_VERSION),
        ],
        body_bytes,
    )
        .into_response())
}

fn error_to_response(err: ConnectError) -> Response {
    let status = match err.code.as_str() {
        "invalid_argument" => StatusCode::BAD_REQUEST,
        "not_found" => StatusCode::NOT_FOUND,
        "already_exists" => StatusCode::CONFLICT,
        "unavailable" => StatusCode::SERVICE_UNAVAILABLE,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    };

    let body = serde_json::to_vec(&err).unwrap_or_else(|_| b"{}".to_vec());
    (
        status,
        [
            (
                axum::http::header::CONTENT_TYPE.as_str(),
                "application/json",
            ),
            ("connect-protocol-version", CONNECT_PROTOCOL_VERSION),
        ],
        body,
    )
        .into_response()
}

pub async fn handle_get_events(
    Database(db): Database,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: GetEventsRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    let event_type = req
        .event_type
        .as_deref()
        .and_then(|s| s.parse::<definy_event::event::EventType>().ok());
    let limit = req.limit.map(|v| v as usize);
    let offset = req.offset.map(|v| v as usize);

    let raw_events = match crate::db::get_events(&db, event_type, limit, offset).await {
        Ok(ev) => ev,
        Err(e) => {
            eprintln!("Failed to get events from DB: {:?}", e);
            return error_to_response(ConnectError::unavailable("Database is unavailable"));
        }
    };

    let mut events = Vec::with_capacity(raw_events.len());
    for bytes in raw_events.into_vec() {
        match EventItem::from_signed_bytes(bytes) {
            Ok(item) => events.push(item),
            Err(e) => {
                eprintln!("Failed to parse stored event: {:?}", e);
            }
        }
    }

    let response = GetEventsResponse { events };
    match encode_response(codec, &response) {
        Ok(res) => res,
        Err(err) => error_to_response(err),
    }
}

pub async fn handle_get_event(Database(db): Database, headers: HeaderMap, body: Bytes) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: GetEventRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    let hash_bytes = if let Ok(id) = EventHashId::from_str(&req.event_hash) {
        id.as_bytes().to_vec()
    } else if let Ok(b) = base64::Engine::decode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        &req.event_hash,
    ) {
        b
    } else if let Ok(b) = hex::decode(&req.event_hash) {
        b
    } else {
        return error_to_response(ConnectError::invalid_argument(
            "Invalid event_hash format; expected base64 or hex",
        ));
    };

    let raw_event = match crate::db::get_event(&db, &hash_bytes).await {
        Ok(Some(ev)) => ev,
        Ok(None) => return error_to_response(ConnectError::not_found("Event not found")),
        Err(e) => {
            eprintln!("Failed to get event from DB: {:?}", e);
            return error_to_response(ConnectError::unavailable("Database is unavailable"));
        }
    };

    let item = match EventItem::from_signed_bytes(raw_event) {
        Ok(item) => item,
        Err(e) => {
            eprintln!("Failed to deserialize event: {:?}", e);
            return error_to_response(ConnectError::internal("Failed to deserialize event"));
        }
    };

    let response = GetEventResponse { event: Some(item) };
    match encode_response(codec, &response) {
        Ok(res) => res,
        Err(err) => error_to_response(err),
    }
}

pub async fn handle_submit_event(
    Database(db): Database,
    ConnectInfo(address): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: SubmitEventRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    if req.signed_event_bytes.is_empty() {
        return error_to_response(ConnectError::invalid_argument(
            "signed_event_bytes cannot be empty",
        ));
    }

    let (signature, data) = match definy_event::verify_and_deserialize(&req.signed_event_bytes) {
        Ok(res) => res,
        Err(e) => {
            eprintln!("Failed to parse or verify CBOR event: {:?}", e);
            return error_to_response(ConnectError::invalid_argument(format!(
                "Failed to parse or verify signed event: {:?}",
                e
            )));
        }
    };

    let event_hash = EventHashId::from_bytes(&req.signed_event_bytes);

    if let Err(e) =
        crate::db::save_event(&data, &signature, &req.signed_event_bytes, address, &db).await
    {
        eprintln!("Failed to save event to DB: {:?}", e);
        return error_to_response(ConnectError::internal(format!(
            "Failed to save event: {:?}",
            e
        )));
    }

    let response = SubmitEventResponse {
        event_hash: event_hash.to_string(),
        status: "ok".to_string(),
    };

    match encode_response(codec, &response) {
        Ok(res) => res,
        Err(err) => error_to_response(err),
    }
}

pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route(PATH_GET_EVENTS, axum::routing::post(handle_get_events))
        .route(PATH_GET_EVENT, axum::routing::post(handle_get_event))
        .route(PATH_SUBMIT_EVENT, axum::routing::post(handle_submit_event))
}

#[cfg(test)]
mod tests {
    use super::*;
    use definy_event::event::{AccountId, CreateAccountEvent, Event, EventContent};

    #[tokio::test]
    async fn test_connect_rpc_lifecycle() {
        let db = crate::db::init_db().await.unwrap();
        let database = Database(db);
        let mut headers = HeaderMap::new();
        headers.insert(
            axum::http::header::CONTENT_TYPE,
            axum::http::HeaderValue::from_static("application/json"),
        );
        headers.insert(
            axum::http::HeaderName::from_static("connect-protocol-version"),
            axum::http::HeaderValue::from_static("1"),
        );

        // 1. Initial GetEvents
        let res = handle_get_events(database.clone(), headers.clone(), Bytes::from("{}")).await;
        assert_eq!(res.status(), StatusCode::OK);

        // 2. Create signed event
        let signing_key = ed25519_dalek::SigningKey::generate(&mut rand::rngs::OsRng);
        let account_id = AccountId(signing_key.verifying_key());
        let event = Event {
            account_id: account_id.clone(),
            time: chrono::Utc::now(),
            content: EventContent::CreateAccount(CreateAccountEvent {
                account_name: "TestUser".into(),
            }),
        };
        let signed_bytes = definy_event::sign_and_serialize(event, &signing_key).unwrap();
        let expected_hash = EventHashId::from_bytes(&signed_bytes);

        // 3. SubmitEvent via Connect-RPC
        let submit_req = SubmitEventRequest {
            signed_event_bytes: signed_bytes.clone(),
        };
        let submit_body = serde_json::to_vec(&submit_req).unwrap();
        let client_addr = "127.0.0.1:8000".parse().unwrap();
        let submit_res = handle_submit_event(
            database.clone(),
            ConnectInfo(client_addr),
            headers.clone(),
            Bytes::from(submit_body),
        )
        .await;
        assert_eq!(submit_res.status(), StatusCode::OK);
        let submit_bytes = axum::body::to_bytes(submit_res.into_body(), 1024 * 1024)
            .await
            .unwrap();
        let submit_data: SubmitEventResponse = serde_json::from_slice(&submit_bytes).unwrap();
        assert_eq!(submit_data.event_hash, expected_hash.to_string());
        assert_eq!(submit_data.status, "ok");

        // 4. GetEvent via Connect-RPC
        let get_req = GetEventRequest {
            event_hash: expected_hash.to_string(),
        };
        let get_body = serde_json::to_vec(&get_req).unwrap();
        let get_res =
            handle_get_event(database.clone(), headers.clone(), Bytes::from(get_body)).await;
        assert_eq!(get_res.status(), StatusCode::OK);
        let get_bytes = axum::body::to_bytes(get_res.into_body(), 1024 * 1024)
            .await
            .unwrap();
        let get_data: GetEventResponse = serde_json::from_slice(&get_bytes).unwrap();
        let item = get_data.event.expect("Event should exist");
        assert_eq!(item.event_hash, expected_hash.to_string());
        assert_eq!(item.account_id, account_id.to_string());
        assert_eq!(item.event_type, "create_account");
        assert_eq!(item.signed_event_bytes, signed_bytes);

        // 5. Submit invalid event (tampered)
        let mut tampered = signed_bytes.clone();
        if let Some(last) = tampered.last_mut() {
            *last ^= 0xFF;
        }
        let bad_submit_req = SubmitEventRequest {
            signed_event_bytes: tampered,
        };
        let bad_body = serde_json::to_vec(&bad_submit_req).unwrap();
        let bad_res = handle_submit_event(
            database,
            ConnectInfo(client_addr),
            headers,
            Bytes::from(bad_body),
        )
        .await;
        assert_eq!(bad_res.status(), StatusCode::BAD_REQUEST);
    }
}
