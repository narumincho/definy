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

#[utoipa::path(
    post,
    path = "/definy.v1.EventService/GetEvents",
    tag = "connect-rpc",
    request_body(
        content = GetEventsRequest,
        content_type = "application/json",
        description = "Connect-RPC GetEvents request payload"
    ),
    responses(
        (status = 200, description = "Connect-RPC GetEvents response", body = GetEventsResponse, content_type = "application/json"),
        (status = 400, description = "Bad Request", body = ConnectError, content_type = "application/json"),
        (status = 503, description = "Service Unavailable", body = ConnectError, content_type = "application/json")
    )
)]
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

#[utoipa::path(
    post,
    path = "/definy.v1.EventService/GetEvent",
    tag = "connect-rpc",
    request_body(
        content = GetEventRequest,
        content_type = "application/json",
        description = "Connect-RPC GetEvent request payload with event_hash"
    ),
    responses(
        (status = 200, description = "Connect-RPC GetEvent response", body = GetEventResponse, content_type = "application/json"),
        (status = 400, description = "Bad Request", body = ConnectError, content_type = "application/json"),
        (status = 404, description = "Event Not Found", body = ConnectError, content_type = "application/json"),
        (status = 503, description = "Service Unavailable", body = ConnectError, content_type = "application/json")
    )
)]
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

#[utoipa::path(
    post,
    path = "/definy.v1.EventService/SubmitEvent",
    tag = "connect-rpc",
    request_body(
        content = SubmitEventRequest,
        content_type = "application/json",
        description = "Connect-RPC SubmitEvent request with signed_event_bytes (Deterministic CBOR base64)"
    ),
    responses(
        (status = 200, description = "Connect-RPC SubmitEvent response", body = SubmitEventResponse, content_type = "application/json"),
        (status = 400, description = "Bad Request", body = ConnectError, content_type = "application/json"),
        (status = 503, description = "Service Unavailable", body = ConnectError, content_type = "application/json")
    )
)]
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

    // Check if event is a ModuleCommit
    if let definy_event::event::EventContent::ModuleCommit(module_commit) = &data.content {
        let embedded_content_hashes: std::collections::HashSet<String> = module_commit
            .parts
            .iter()
            .filter_map(|part| part.expression.as_ref())
            .filter_map(|expr| definy_event::ContentHash::from_expression(expr).ok())
            .map(|hash| hash.to_string())
            .collect();

        // Collect all referenced content hashes (from parts that may have only content_hash)
        let referenced_hashes: Vec<String> = module_commit
            .referenced_content_hashes()
            .into_iter()
            .map(|h| h.to_string())
            .filter(|hash| !embedded_content_hashes.contains(hash))
            .collect();

        // Check if any referenced content hashes are missing
        let missing = crate::db::filter_missing_content_hashes(&db, &referenced_hashes)
            .await
            .unwrap_or_default();

        if !missing.is_empty() {
            // Diff hash negotiation: report missing content hashes to client
            let response = SubmitEventResponse {
                event_hash: event_hash.to_string(),
                status: "missing_content".to_string(),
                missing_content_hashes: missing,
            };
            return match encode_response(codec, &response) {
                Ok(res) => res,
                Err(err) => error_to_response(err),
            };
        }

        if let Err(error) =
            validate_module_commit(&db, module_commit, &data, &signature, &event_hash).await
        {
            return error_to_response(ConnectError::invalid_argument(error));
        }

        // Persist embedded expressions only after the self-hosted validation succeeds.
        for part in &module_commit.parts {
            if let Some(ref expr) = part.expression
                && let Ok(hash) = definy_event::ContentHash::from_expression(expr)
                && let Ok(bytes) = serde_cbor::to_vec(expr)
                && let Err(error) = crate::db::save_content(&db, &hash.to_string(), &bytes).await
            {
                return error_to_response(ConnectError::internal(format!(
                    "Failed to save module expression: {error}"
                )));
            }
        }
    }

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
        missing_content_hashes: vec![],
    };

    match encode_response(codec, &response) {
        Ok(res) => res,
        Err(err) => error_to_response(err),
    }
}

#[utoipa::path(
    post,
    path = "/definy.v1.EventService/CheckMissingHashes",
    tag = "connect-rpc",
    request_body(
        content = CheckMissingHashesRequest,
        content_type = "application/json",
        description = "Check which content hashes are missing on the server"
    ),
    responses(
        (status = 200, description = "CheckMissingHashes response", body = CheckMissingHashesResponse, content_type = "application/json"),
        (status = 400, description = "Bad Request", body = ConnectError, content_type = "application/json")
    )
)]
pub async fn handle_check_missing_hashes(
    Database(db): Database,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: CheckMissingHashesRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    let missing = match crate::db::filter_missing_content_hashes(&db, &req.content_hashes).await {
        Ok(m) => m,
        Err(e) => return error_to_response(ConnectError::internal(e.to_string())),
    };

    let response = CheckMissingHashesResponse {
        missing_content_hashes: missing,
    };

    match encode_response(codec, &response) {
        Ok(res) => res,
        Err(err) => error_to_response(err),
    }
}

#[utoipa::path(
    post,
    path = "/definy.v1.EventService/UploadContent",
    tag = "connect-rpc",
    request_body(
        content = UploadContentRequest,
        content_type = "application/json",
        description = "Upload missing content-addressed items"
    ),
    responses(
        (status = 200, description = "UploadContent response", body = UploadContentResponse, content_type = "application/json"),
        (status = 400, description = "Bad Request", body = ConnectError, content_type = "application/json")
    )
)]
pub async fn handle_upload_content(
    Database(db): Database,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: UploadContentRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    let mut stored = Vec::new();
    for item in req.items {
        // Validate hash integrity
        let computed = definy_event::ContentHash::from_bytes(&item.content_bytes).to_string();
        if computed != item.content_hash {
            return error_to_response(ConnectError::invalid_argument(format!(
                "Content hash mismatch: declared {} but computed {}",
                item.content_hash, computed
            )));
        }

        if let Err(e) = crate::db::save_content(&db, &item.content_hash, &item.content_bytes).await
        {
            return error_to_response(ConnectError::internal(e.to_string()));
        }
        stored.push(item.content_hash);
    }

    let response = UploadContentResponse {
        stored_content_hashes: stored,
    };

    match encode_response(codec, &response) {
        Ok(res) => res,
        Err(err) => error_to_response(err),
    }
}

#[utoipa::path(
    post,
    path = "/definy.v1.EventService/GetContent",
    tag = "connect-rpc",
    request_body(
        content = GetContentRequest,
        content_type = "application/json",
        description = "Get content item by content hash"
    ),
    responses(
        (status = 200, description = "GetContent response", body = GetContentResponse, content_type = "application/json"),
        (status = 400, description = "Bad Request", body = ConnectError, content_type = "application/json")
    )
)]
pub async fn handle_get_content(
    Database(db): Database,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: GetContentRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    let item = match crate::db::get_content(&db, &req.content_hash).await {
        Ok(Some(bytes)) => Some(ContentItem {
            content_hash: req.content_hash,
            content_bytes: bytes,
        }),
        Ok(None) => None,
        Err(e) => return error_to_response(ConnectError::internal(e.to_string())),
    };

    let response = GetContentResponse { item };

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
        .route(
            PATH_CHECK_MISSING_HASHES,
            axum::routing::post(handle_check_missing_hashes),
        )
        .route(
            PATH_UPLOAD_CONTENT,
            axum::routing::post(handle_upload_content),
        )
        .route(PATH_GET_CONTENT, axum::routing::post(handle_get_content))
}

async fn validate_module_commit(
    db: &surrealdb::Surreal<surrealdb::engine::any::Any>,
    module_commit: &definy_event::event::ModuleCommitEvent,
    candidate_event: &definy_event::event::Event,
    candidate_signature: &ed25519_dalek::Signature,
    candidate_hash: &EventHashId,
) -> Result<(), String> {
    let mut hydrated_commit = module_commit.clone();
    for part in &mut hydrated_commit.parts {
        if part.expression.is_none() {
            let content_hash = part
                .resolve_content_hash()
                .ok_or_else(|| format!("part '{}' has no expression", part.name))?;
            let content = crate::db::get_content(db, &content_hash.to_string())
                .await
                .map_err(|error| format!("failed to load part '{}': {error}", part.name))?
                .ok_or_else(|| format!("part '{}' expression is unavailable", part.name))?;
            part.expression = Some(serde_cbor::from_slice(&content).map_err(|error| {
                format!("part '{}' has invalid expression data: {error}", part.name)
            })?);
        }
    }

    let system_key =
        ed25519_dalek::SigningKey::from_bytes(&crate::builtin_migration::COMPILER_SYSTEM_KEY_SEED);
    let system_account = definy_event::event::AccountId(system_key.verifying_key());
    let core_module_id = definy_event::event::derive_module_id(&system_account, "core");
    let expression_type_hash =
        definy_event::event::derive_module_part_id(&core_module_id, "expression");
    let type_ast_hash = definy_event::event::derive_module_part_id(&core_module_id, "type-ast");
    let validate_module_hash =
        definy_event::event::derive_module_part_id(&core_module_id, "validate-module");
    let module_id = definy_event::event::derive_module_id(
        &candidate_event.account_id,
        &hydrated_commit.module_name,
    );
    let module_value = crate::self_hosted_ast::module_commit_to_self_hosted_ast(
        &hydrated_commit,
        &module_id,
        &expression_type_hash,
        &type_ast_hash,
    )?;

    let event_binaries = crate::db::get_events(db, None, None, None)
        .await
        .map_err(|error| format!("failed to load events for type checking: {error}"))?;
    let mut events: Vec<definy_core::EventWithHash> = event_binaries
        .into_vec()
        .into_iter()
        .map(|binary| {
            let hash = EventHashId::from_bytes(&binary);
            (hash, definy_event::verify_and_deserialize(&binary))
        })
        .collect();
    events.push((
        candidate_hash.clone(),
        Ok((*candidate_signature, candidate_event.clone())),
    ));

    let validation_call =
        definy_event::event::Expression::Call(definy_event::event::CallExpression {
            function: Box::new(definy_event::event::Expression::PartReference(
                definy_event::event::PartReferenceExpression::new(validate_module_hash),
            )),
            argument: Box::new(module_value),
        });
    match definy_core::evaluate_expression(&validation_call, &events) {
        Ok(definy_core::Value::Bool(true)) => Ok(()),
        Ok(definy_core::Value::Bool(false)) => {
            Err("self-hosted type checker rejected the module".into())
        }
        Ok(value) => Err(format!(
            "self-hosted validator returned unexpected value: {value}"
        )),
        Err(error) => Err(format!("self-hosted module validation failed: {error}")),
    }
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
            database.clone(),
            ConnectInfo(client_addr),
            headers.clone(),
            Bytes::from(bad_body),
        )
        .await;
        assert_eq!(bad_res.status(), StatusCode::BAD_REQUEST);

        let invalid_module_expression =
            definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                value: 123,
            });
        let invalid_module_content_hash =
            definy_event::ContentHash::from_expression(&invalid_module_expression).unwrap();
        let invalid_module_event = Event {
            account_id: account_id.clone(),
            time: chrono::Utc::now(),
            content: EventContent::ModuleCommit(definy_event::event::ModuleCommitEvent {
                module_name: "invalid-module".into(),
                module_description: "invalid module".into(),
                parent_commit_hash: None,
                message: "reject a type mismatch".into(),
                parts: vec![definy_event::event::ModulePartEntry {
                    name: "wrong-type".into(),
                    part_type: Some(definy_event::event::PartType::String),
                    description: "declares string but evaluates to number".into(),
                    content_hash: None,
                    expression: Some(invalid_module_expression),
                }],
            }),
        };
        let invalid_module_bytes =
            definy_event::sign_and_serialize(invalid_module_event, &signing_key).unwrap();
        let invalid_module_res = handle_submit_event(
            database.clone(),
            ConnectInfo(client_addr),
            headers.clone(),
            Bytes::from(
                serde_json::to_vec(&SubmitEventRequest {
                    signed_event_bytes: invalid_module_bytes,
                })
                .unwrap(),
            ),
        )
        .await;
        assert_eq!(invalid_module_res.status(), StatusCode::BAD_REQUEST);
        assert!(
            crate::db::get_content(&database.0, &invalid_module_content_hash.to_string())
                .await
                .unwrap()
                .is_none()
        );

        let unsupported_module_event = Event {
            account_id: account_id.clone(),
            time: chrono::Utc::now(),
            content: EventContent::ModuleCommit(definy_event::event::ModuleCommitEvent {
                module_name: "unsupported-module".into(),
                module_description: "unsupported module".into(),
                parent_commit_hash: None,
                message: "reject unrepresented syntax".into(),
                parts: vec![definy_event::event::ModulePartEntry {
                    name: "unsupported".into(),
                    part_type: Some(definy_event::event::PartType::Number),
                    description: "compiler expressions are outside core.expression".into(),
                    content_hash: None,
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Plus,
                    )),
                }],
            }),
        };
        let unsupported_module_bytes =
            definy_event::sign_and_serialize(unsupported_module_event, &signing_key).unwrap();
        let unsupported_module_res = handle_submit_event(
            database.clone(),
            ConnectInfo(client_addr),
            headers.clone(),
            Bytes::from(
                serde_json::to_vec(&SubmitEventRequest {
                    signed_event_bytes: unsupported_module_bytes,
                })
                .unwrap(),
            ),
        )
        .await;
        assert_eq!(unsupported_module_res.status(), StatusCode::BAD_REQUEST);

        let primitive_type_module = Event {
            account_id: account_id.clone(),
            time: chrono::Utc::now(),
            content: EventContent::ModuleCommit(definy_event::event::ModuleCommitEvent {
                module_name: "primitive-types".into(),
                module_description: "primitive type declarations".into(),
                parent_commit_hash: None,
                message: "submit a primitive type alias".into(),
                parts: vec![definy_event::event::ModulePartEntry {
                    name: "my-number".into(),
                    part_type: Some(definy_event::event::PartType::Type),
                    description: "the number type".into(),
                    content_hash: None,
                    expression: Some(definy_event::event::Expression::TypeNumber),
                }],
            }),
        };
        let primitive_type_bytes =
            definy_event::sign_and_serialize(primitive_type_module, &signing_key).unwrap();
        let primitive_type_res = handle_submit_event(
            database.clone(),
            ConnectInfo(client_addr),
            headers.clone(),
            Bytes::from(
                serde_json::to_vec(&SubmitEventRequest {
                    signed_event_bytes: primitive_type_bytes,
                })
                .unwrap(),
            ),
        )
        .await;
        assert_eq!(primitive_type_res.status(), StatusCode::OK);

        let union_type_module = Event {
            account_id: account_id.clone(),
            time: chrono::Utc::now(),
            content: EventContent::ModuleCommit(definy_event::event::ModuleCommitEvent {
                module_name: "union-types".into(),
                module_description: "union type declarations".into(),
                parent_commit_hash: None,
                message: "composite type declarations are not supported yet".into(),
                parts: vec![definy_event::event::ModulePartEntry {
                    name: "maybe-number".into(),
                    part_type: Some(definy_event::event::PartType::Type),
                    description: "an optional number".into(),
                    content_hash: None,
                    expression: Some(definy_event::event::Expression::TypeUnion(
                        definy_event::event::TypeUnionExpression {
                            variants: vec![
                                definy_event::event::TypeUnionVariant {
                                    tag: "none".into(),
                                    payload_type: None,
                                },
                                definy_event::event::TypeUnionVariant {
                                    tag: "some".into(),
                                    payload_type: Some(Box::new(
                                        definy_event::event::Expression::TypeNumber,
                                    )),
                                },
                            ],
                        },
                    )),
                }],
            }),
        };
        let union_type_bytes =
            definy_event::sign_and_serialize(union_type_module, &signing_key).unwrap();
        let union_type_res = handle_submit_event(
            database.clone(),
            ConnectInfo(client_addr),
            headers.clone(),
            Bytes::from(
                serde_json::to_vec(&SubmitEventRequest {
                    signed_event_bytes: union_type_bytes,
                })
                .unwrap(),
            ),
        )
        .await;
        assert_eq!(union_type_res.status(), StatusCode::OK);

        let composite_type_module = Event {
            account_id: account_id.clone(),
            time: chrono::Utc::now(),
            content: EventContent::ModuleCommit(definy_event::event::ModuleCommitEvent {
                module_name: "composite-types".into(),
                module_description: "composite type declarations".into(),
                parent_commit_hash: None,
                message: "submit composite type declarations".into(),
                parts: vec![
                    definy_event::event::ModulePartEntry {
                        name: "number-list".into(),
                        part_type: Some(definy_event::event::PartType::Type),
                        description: "a list of numbers".into(),
                        content_hash: None,
                        expression: Some(definy_event::event::Expression::TypeList(
                            definy_event::event::TypeListExpression {
                                item_type: Box::new(definy_event::event::Expression::TypeNumber),
                            },
                        )),
                    },
                    definy_event::event::ModulePartEntry {
                        name: "number-to-string".into(),
                        part_type: Some(definy_event::event::PartType::Type),
                        description: "a number to string function".into(),
                        content_hash: None,
                        expression: Some(definy_event::event::Expression::TypeFunction(
                            definy_event::event::TypeFunctionExpression {
                                parameter: Box::new(definy_event::event::Expression::TypeNumber),
                                return_type: Box::new(definy_event::event::Expression::TypeString),
                            },
                        )),
                    },
                    definy_event::event::ModulePartEntry {
                        name: "number-record".into(),
                        part_type: Some(definy_event::event::PartType::Type),
                        description: "a record containing a number".into(),
                        content_hash: None,
                        expression: Some(definy_event::event::Expression::TypeLiteral(
                            definy_event::event::TypeLiteralExpression {
                                items: vec![definy_event::event::TypeLiteralItemExpression {
                                    key: "value".into(),
                                    value: Box::new(definy_event::event::Expression::TypeNumber),
                                }],
                            },
                        )),
                    },
                    definy_event::event::ModulePartEntry {
                        name: "optional-string".into(),
                        part_type: Some(definy_event::event::PartType::Type),
                        description: "an optional string".into(),
                        content_hash: None,
                        expression: Some(definy_event::event::Expression::TypeUnion(
                            definy_event::event::TypeUnionExpression {
                                variants: vec![
                                    definy_event::event::TypeUnionVariant {
                                        tag: "none".into(),
                                        payload_type: None,
                                    },
                                    definy_event::event::TypeUnionVariant {
                                        tag: "some".into(),
                                        payload_type: Some(Box::new(
                                            definy_event::event::Expression::TypeString,
                                        )),
                                    },
                                ],
                            },
                        )),
                    },
                ],
            }),
        };
        let composite_type_bytes =
            definy_event::sign_and_serialize(composite_type_module, &signing_key).unwrap();
        let composite_type_res = handle_submit_event(
            database.clone(),
            ConnectInfo(client_addr),
            headers.clone(),
            Bytes::from(
                serde_json::to_vec(&SubmitEventRequest {
                    signed_event_bytes: composite_type_bytes,
                })
                .unwrap(),
            ),
        )
        .await;
        assert_eq!(composite_type_res.status(), StatusCode::OK);

        // 6. Test Diff Hash Negotiation
        let test_expr =
            definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                value: 999,
            });
        let test_content_bytes = serde_cbor::to_vec(&test_expr).unwrap();
        let test_content_hash = definy_event::ContentHash::from_expression(&test_expr).unwrap();
        let test_hash_str = test_content_hash.to_string();

        let commit_event = Event {
            account_id: account_id.clone(),
            time: chrono::Utc::now(),
            content: EventContent::ModuleCommit(definy_event::event::ModuleCommitEvent {
                module_name: "test-negotiation".into(),
                module_description: "test".into(),
                parent_commit_hash: None,
                message: "test negotiation".into(),
                parts: vec![definy_event::event::ModulePartEntry {
                    name: "test-part".into(),
                    part_type: Some(definy_event::event::PartType::Number),
                    description: "test".into(),
                    content_hash: Some(test_content_hash),
                    expression: None, // Only content_hash, expression not embedded
                }],
            }),
        };
        let commit_binary = definy_event::sign_and_serialize(commit_event, &signing_key).unwrap();

        // 6-a. SubmitEvent should return missing_content
        let submit_req = SubmitEventRequest {
            signed_event_bytes: commit_binary.clone(),
        };
        let res = handle_submit_event(
            database.clone(),
            ConnectInfo(client_addr),
            headers.clone(),
            Bytes::from(serde_json::to_vec(&submit_req).unwrap()),
        )
        .await;
        assert_eq!(res.status(), StatusCode::OK);
        let bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024)
            .await
            .unwrap();
        let submit_res: SubmitEventResponse = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(submit_res.status, "missing_content");
        assert_eq!(
            submit_res.missing_content_hashes,
            vec![test_hash_str.clone()]
        );

        // 6-b. CheckMissingHashes
        let check_req = CheckMissingHashesRequest {
            content_hashes: vec![test_hash_str.clone()],
        };
        let check_res = handle_check_missing_hashes(
            database.clone(),
            headers.clone(),
            Bytes::from(serde_json::to_vec(&check_req).unwrap()),
        )
        .await;
        assert_eq!(check_res.status(), StatusCode::OK);
        let check_bytes = axum::body::to_bytes(check_res.into_body(), 1024 * 1024)
            .await
            .unwrap();
        let check_data: CheckMissingHashesResponse = serde_json::from_slice(&check_bytes).unwrap();
        assert_eq!(
            check_data.missing_content_hashes,
            vec![test_hash_str.clone()]
        );

        // 6-c. UploadContent
        let upload_req = UploadContentRequest {
            items: vec![ContentItem {
                content_hash: test_hash_str.clone(),
                content_bytes: test_content_bytes.clone(),
            }],
        };
        let upload_res = handle_upload_content(
            database.clone(),
            headers.clone(),
            Bytes::from(serde_json::to_vec(&upload_req).unwrap()),
        )
        .await;
        assert_eq!(upload_res.status(), StatusCode::OK);

        // 6-d. GetContent
        let get_content_req = GetContentRequest {
            content_hash: test_hash_str.clone(),
        };
        let get_c_res = handle_get_content(
            database.clone(),
            headers.clone(),
            Bytes::from(serde_json::to_vec(&get_content_req).unwrap()),
        )
        .await;
        assert_eq!(get_c_res.status(), StatusCode::OK);
        let get_c_bytes = axum::body::to_bytes(get_c_res.into_body(), 1024 * 1024)
            .await
            .unwrap();
        let get_c_data: GetContentResponse = serde_json::from_slice(&get_c_bytes).unwrap();
        assert_eq!(get_c_data.item.unwrap().content_bytes, test_content_bytes);

        // 6-e. Re-submit: should now succeed with status "ok"
        let res2 = handle_submit_event(
            database.clone(),
            ConnectInfo(client_addr),
            headers.clone(),
            Bytes::from(serde_json::to_vec(&submit_req).unwrap()),
        )
        .await;
        assert_eq!(res2.status(), StatusCode::OK);
        let bytes2 = axum::body::to_bytes(res2.into_body(), 1024 * 1024)
            .await
            .unwrap();
        let submit_res2: SubmitEventResponse = serde_json::from_slice(&bytes2).unwrap();
        assert_eq!(submit_res2.status, "ok");
        assert!(submit_res2.missing_content_hashes.is_empty());
    }
}
