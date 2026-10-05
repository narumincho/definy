use std::net::SocketAddr;
use std::str::FromStr;

use axum::body::Bytes;
use axum::extract::{ConnectInfo, State};
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

#[utoipa::path(
    post,
    path = "/definy.v1.DeployService/DeployInstance",
    tag = "connect-rpc",
    request_body(
        content = DeployInstanceRequest,
        content_type = "application/json",
        description = "Connect-RPC DeployInstance request payload"
    ),
    responses(
        (status = 200, description = "Connect-RPC DeployInstance response", body = DeployInstanceResponse, content_type = "application/json"),
        (status = 400, description = "Bad Request", body = ConnectError, content_type = "application/json"),
        (status = 503, description = "Service Unavailable / Not Configured", body = ConnectError, content_type = "application/json")
    )
)]
pub async fn handle_deploy_instance(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: DeployInstanceRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    let fly_client = match &state.fly_client {
        Some(client) => client,
        None => {
            return error_to_response(ConnectError::unavailable(
                "fly.io is not configured: FLY_API_TOKEN is missing on server",
            ));
        }
    };

    let (image, port, env_vars) = if let Some(ref wasm_hash) = req.wasm_hash {
        // 仮想 Wasm 配信 & 共通 runner モード (Docker ビルド不要)
        let runner_image = std::env::var("FLY_RUNNER_IMAGE")
            .unwrap_or_else(|_| "ghcr.io/narumincho/definy-runner:latest".to_string());
        let server_url =
            std::env::var("DEFINY_SERVER_URL").unwrap_or_else(|_| fly_client.app_url());
        let mut vars = std::collections::HashMap::new();
        vars.insert("PORT".to_string(), "8080".to_string());
        vars.insert("DEFINY_SERVER_URL".to_string(), server_url);
        vars.insert("DEFINY_WASM_HASH".to_string(), wasm_hash.clone());
        (runner_image, 8080, vars)
    } else {
        // 従来のコミットハッシュベースモード
        let img = std::env::var("FLY_IMAGE")
            .unwrap_or_else(|_| "registry.fly.io/definy:latest".to_string());
        let mut vars = std::collections::HashMap::new();
        vars.insert("PORT".to_string(), "8000".to_string());
        if let Some(ref commit_hash) = req.commit_hash {
            vars.insert("DEFINY_COMMIT_HASH".to_string(), commit_hash.clone());
        }
        (img, 8000, vars)
    };

    let machine_config =
        crate::fly_machines::create_default_definy_machine_config(&image, env_vars, port);

    let create_req = crate::fly_machines::CreateMachineRequest {
        name: req.machine_name.clone(),
        region: req.region.clone(),
        config: machine_config,
    };

    match fly_client.create_machine(&create_req).await {
        Ok(machine) => {
            let app_url = fly_client.app_url();

            if let Some(db) = crate::ensure_db(&state).await {
                let deployment_record = crate::db::DeploymentRecord {
                    machine_id: machine.id.clone(),
                    commit_hash: req.commit_hash.clone(),
                    status: machine.state.clone(),
                    url: app_url.clone(),
                    app_url: app_url.clone(),
                    region: machine.region.clone(),
                    created_at: chrono::Utc::now(),
                    wasm_hash: req.wasm_hash.clone(),
                };
                if let Err(e) = crate::db::save_deployment(&db, deployment_record).await {
                    eprintln!("Failed to save deployment to DB: {:?}", e);
                }
            }

            let response = DeployInstanceResponse {
                machine_id: machine.id,
                status: machine.state,
                url: app_url.clone(),
                app_url,
            };
            match encode_response(codec, &response) {
                Ok(res) => res,
                Err(err) => error_to_response(err),
            }
        }
        Err(err) => {
            eprintln!("Failed to create fly.io machine: {:?}", err);
            error_to_response(ConnectError::internal(format!("Deploy failed: {err}")))
        }
    }
}

#[utoipa::path(
    post,
    path = "/definy.v1.DeployService/GetDeployStatus",
    tag = "connect-rpc",
    request_body(
        content = GetDeployStatusRequest,
        content_type = "application/json",
        description = "Connect-RPC GetDeployStatus request payload"
    ),
    responses(
        (status = 200, description = "Connect-RPC GetDeployStatus response", body = GetDeployStatusResponse, content_type = "application/json"),
        (status = 400, description = "Bad Request", body = ConnectError, content_type = "application/json"),
        (status = 404, description = "Machine Not Found", body = ConnectError, content_type = "application/json"),
        (status = 503, description = "Service Unavailable / Not Configured", body = ConnectError, content_type = "application/json")
    )
)]
pub async fn handle_get_deploy_status(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: GetDeployStatusRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    let fly_client = match &state.fly_client {
        Some(client) => client,
        None => {
            return error_to_response(ConnectError::unavailable(
                "fly.io is not configured: FLY_API_TOKEN is missing on server",
            ));
        }
    };

    match fly_client.get_machine(&req.machine_id).await {
        Ok(machine) => {
            let app_url = fly_client.app_url();
            let response = GetDeployStatusResponse {
                machine_id: machine.id,
                status: machine.state,
                region: machine.region,
                url: app_url,
            };
            match encode_response(codec, &response) {
                Ok(res) => res,
                Err(err) => error_to_response(err),
            }
        }
        Err(err) => {
            if let Some(db) = crate::ensure_db(&state).await
                && let Ok(Some(cached)) = crate::db::get_deployment(&db, &req.machine_id).await
            {
                let response = GetDeployStatusResponse {
                    machine_id: cached.machine_id,
                    status: cached.status,
                    region: cached.region,
                    url: cached.url,
                };
                return match encode_response(codec, &response) {
                    Ok(res) => res,
                    Err(err) => error_to_response(err),
                };
            }
            eprintln!("Failed to get fly.io machine: {:?}", err);
            error_to_response(ConnectError::internal(format!(
                "Get deploy status failed: {err}"
            )))
        }
    }
}

#[utoipa::path(
    post,
    path = "/definy.v1.DeployService/ListDeployments",
    tag = "connect-rpc",
    request_body(
        content = ListDeploymentsRequest,
        content_type = "application/json",
        description = "Connect-RPC ListDeployments request payload"
    ),
    responses(
        (status = 200, description = "Connect-RPC ListDeployments response", body = ListDeploymentsResponse, content_type = "application/json"),
        (status = 503, description = "Database Unavailable", body = ConnectError, content_type = "application/json")
    )
)]
pub async fn handle_list_deployments(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: ListDeploymentsRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    let db = match crate::ensure_db(&state).await {
        Some(db) => db,
        None => {
            return error_to_response(ConnectError::unavailable("Database is unavailable"));
        }
    };

    let records = match crate::db::get_deployments(&db, req.limit.map(|v| v as usize)).await {
        Ok(recs) => recs,
        Err(e) => {
            eprintln!("Failed to get deployments from DB: {:?}", e);
            return error_to_response(ConnectError::internal("Failed to retrieve deployments"));
        }
    };

    let items = records
        .into_iter()
        .map(|r| DeploymentItem {
            machine_id: r.machine_id,
            commit_hash: r.commit_hash,
            status: r.status,
            url: r.url,
            app_url: r.app_url,
            region: r.region,
            created_at_rfc3339: r.created_at.to_rfc3339(),
            wasm_hash: r.wasm_hash,
        })
        .collect();

    let response = ListDeploymentsResponse { deployments: items };
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
        .route(
            PATH_DEPLOY_INSTANCE,
            axum::routing::post(handle_deploy_instance),
        )
        .route(
            PATH_GET_DEPLOY_STATUS,
            axum::routing::post(handle_get_deploy_status),
        )
        .route(
            PATH_LIST_DEPLOYMENTS,
            axum::routing::post(handle_list_deployments),
        )
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
mod tests;
