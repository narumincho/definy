use definy_event::EventHashId;
use wasm_bindgen::JsValue;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FetchError {
    /// Failed to connect to the API server (network error, refused, DNS failure)
    ServerDisconnected(String),
    /// API server is connected, but database is unavailable (HTTP 503)
    DatabaseUnavailable,
    /// API server is connected, but database is initializing (HTTP 503)
    DatabaseInitializing,
    /// Other HTTP error
    HttpError(u16),
    /// Failed to deserialize CBOR response
    DeserializeError(String),
    /// Other error
    Other(String),
}

impl std::fmt::Display for FetchError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ServerDisconnected(e) => write!(f, "Cannot connect to API server: {e}"),
            Self::DatabaseUnavailable => write!(f, "Database is unavailable"),
            Self::DatabaseInitializing => write!(f, "Database is initializing"),
            Self::HttpError(status) => write!(f, "HTTP error: status {status}"),
            Self::DeserializeError(e) => write!(f, "Deserialize error: {e}"),
            Self::Other(e) => write!(f, "{e}"),
        }
    }
}

impl std::error::Error for FetchError {}

impl FetchError {
    pub fn to_connection_status(&self) -> crate::app_state::ConnectionStatus {
        match self {
            Self::ServerDisconnected(_) => crate::app_state::ConnectionStatus::ServerDisconnected,
            Self::DatabaseUnavailable => crate::app_state::ConnectionStatus::DatabaseUnavailable,
            Self::DatabaseInitializing => crate::app_state::ConnectionStatus::DatabaseInitializing,
            _ => crate::app_state::ConnectionStatus::ServerDisconnected,
        }
    }
}

pub fn api_base_url() -> String {
    // 1. Check compile-time environment variable DEFINY_API_URL
    if let Some(url) = option_env!("DEFINY_API_URL") {
        let trimmed = url.trim();
        if !trimmed.is_empty() {
            return trimmed.trim_end_matches('/').to_string();
        }
    }

    // 2. In browser runtime, check query parameter
    #[cfg(target_arch = "wasm32")]
    if let Some(window) = web_sys::window() {
        if let Ok(search) = window.location().search() {
            for part in search.trim_start_matches('?').split('&') {
                if let Some(api_val) = part.strip_prefix("api=") {
                    if let Ok(decoded) = js_sys::decode_uri_component(api_val) {
                        let decoded_str = String::from(decoded);
                        let trimmed = decoded_str.trim();
                        if !trimmed.is_empty() {
                            return trimmed.trim_end_matches('/').to_string();
                        }
                    }
                }
            }
        }
    }

    "".to_string()
}

use definy_event::rpc::{
    CONNECT_HEADER_PROTOCOL_VERSION, CONNECT_PROTOCOL_VERSION, CheckMissingHashesRequest,
    CheckMissingHashesResponse, ConnectError, ContentItem, GetContentRequest, GetContentResponse,
    GetEventRequest, GetEventResponse, GetEventsRequest, GetEventsResponse,
    PATH_CHECK_MISSING_HASHES, PATH_GET_CONTENT, PATH_GET_EVENT, PATH_GET_EVENTS,
    PATH_SUBMIT_EVENT, PATH_UPLOAD_CONTENT, SubmitEventRequest, SubmitEventResponse,
    UploadContentRequest, UploadContentResponse,
};

async fn connect_rpc_post<Req: serde::Serialize, Res: serde::de::DeserializeOwned>(
    path: &str,
    req: &Req,
) -> Result<Res, FetchError> {
    let base = api_base_url();
    let url = format!("{}{}", base, path);
    let window = web_sys::window().ok_or_else(|| FetchError::Other("no window".to_string()))?;

    let headers = web_sys::Headers::new().map_err(|e| FetchError::Other(js_error_to_string(e)))?;
    headers
        .set("Content-Type", "application/json")
        .map_err(|e| FetchError::Other(js_error_to_string(e)))?;
    headers
        .set(CONNECT_HEADER_PROTOCOL_VERSION, CONNECT_PROTOCOL_VERSION)
        .map_err(|e| FetchError::Other(js_error_to_string(e)))?;

    let json_body = serde_json::to_string(req)
        .map_err(|e| FetchError::Other(format!("serialize request error: {e}")))?;

    let request_init = web_sys::RequestInit::new();
    request_init.set_method("POST");
    request_init.set_headers(&headers);
    request_init.set_body(&wasm_bindgen::JsValue::from_str(&json_body));

    let response_raw = match wasm_bindgen_futures::JsFuture::from(
        window.fetch_with_str_and_init(&url, &request_init),
    )
    .await
    {
        Ok(v) => v,
        Err(err) => {
            let msg = js_error_to_string(err);
            return Err(FetchError::ServerDisconnected(msg));
        }
    };

    let response: web_sys::Response = match wasm_bindgen::JsCast::dyn_into(response_raw) {
        Ok(r) => r,
        Err(_) => return Err(FetchError::Other("failed to cast Response".to_string())),
    };

    if response.status() == 503 {
        let text_promise = response.text().ok();
        if let Some(tp) = text_promise
            && let Ok(text_val) = wasm_bindgen_futures::JsFuture::from(tp).await
            && let Some(txt) = text_val.as_string()
            && let Ok(connect_err) = serde_json::from_str::<ConnectError>(&txt)
            && connect_err.message.to_lowercase().contains("initializing")
        {
            return Err(FetchError::DatabaseInitializing);
        }
        return Err(FetchError::DatabaseUnavailable);
    }

    if !response.ok() {
        let status = response.status();
        let text_promise = response.text().ok();
        if let Some(tp) = text_promise
            && let Ok(text_val) = wasm_bindgen_futures::JsFuture::from(tp).await
            && let Some(txt) = text_val.as_string()
            && let Ok(connect_err) = serde_json::from_str::<ConnectError>(&txt)
        {
            return Err(FetchError::Other(format!(
                "{}: {}",
                connect_err.code, connect_err.message
            )));
        }
        return Err(FetchError::HttpError(status));
    }

    let text_promise = response
        .text()
        .map_err(|e| FetchError::Other(js_error_to_string(e)))?;
    let text_value = wasm_bindgen_futures::JsFuture::from(text_promise)
        .await
        .map_err(|e| FetchError::Other(js_error_to_string(e)))?;
    let text = text_value.as_string().unwrap_or_default();

    serde_json::from_str::<Res>(&text).map_err(|e| FetchError::DeserializeError(e.to_string()))
}

pub async fn get_events(
    event_type: Option<definy_event::event::EventType>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<
    Vec<(
        definy_event::EventHashId,
        Result<
            (ed25519_dalek::Signature, definy_event::event::Event),
            definy_event::VerifyAndDeserializeError,
        >,
    )>,
    FetchError,
> {
    let req = GetEventsRequest {
        event_type: event_type.map(|t| t.to_string()),
        limit: limit.map(|l| l as u64),
        offset: offset.map(|o| o as u64),
    };

    let res: GetEventsResponse = connect_rpc_post(PATH_GET_EVENTS, &req).await?;

    let event_pairs = res
        .events
        .into_iter()
        .map(|item| item.signed_event_bytes)
        .collect::<Vec<Vec<u8>>>();

    if let Err(error) = crate::indexed_db::store_events(&event_pairs).await {
        web_sys::console::warn_1(&error);
    }

    Ok(event_pairs
        .into_iter()
        .map(|bytes| {
            (
                EventHashId::from_bytes(&bytes),
                definy_event::verify_and_deserialize(&bytes),
            )
        })
        .collect::<Vec<_>>())
}

pub async fn get_event(
    hash: &definy_event::EventHashId,
) -> Result<
    Option<(
        definy_event::EventHashId,
        Result<
            (ed25519_dalek::Signature, definy_event::event::Event),
            definy_event::VerifyAndDeserializeError,
        >,
    )>,
    FetchError,
> {
    let req = GetEventRequest {
        event_hash: hash.to_string(),
    };

    let res: GetEventResponse = match connect_rpc_post(PATH_GET_EVENT, &req).await {
        Ok(r) => r,
        Err(FetchError::HttpError(404)) => return Ok(None),
        Err(FetchError::Other(msg)) if msg.starts_with("not_found:") => return Ok(None),
        Err(e) => return Err(e),
    };

    if let Some(item) = res.event {
        let bytes = item.signed_event_bytes;
        if let Err(error) = crate::indexed_db::store_events(std::slice::from_ref(&bytes)).await {
            web_sys::console::warn_1(&error);
        }

        let decoded = definy_event::verify_and_deserialize(&bytes);
        let hash_id = EventHashId::from_bytes(&bytes);
        Ok(Some((hash_id, decoded)))
    } else {
        Ok(None)
    }
}

pub async fn check_missing_hashes(hashes: &[String]) -> Result<Vec<String>, FetchError> {
    let req = CheckMissingHashesRequest {
        content_hashes: hashes.to_vec(),
    };
    let res: CheckMissingHashesResponse = connect_rpc_post(PATH_CHECK_MISSING_HASHES, &req).await?;
    Ok(res.missing_content_hashes)
}

pub async fn upload_content(items: Vec<ContentItem>) -> Result<Vec<String>, FetchError> {
    let req = UploadContentRequest { items };
    let res: UploadContentResponse = connect_rpc_post(PATH_UPLOAD_CONTENT, &req).await?;
    Ok(res.stored_content_hashes)
}

pub async fn get_content(hash: &str) -> Result<Option<Vec<u8>>, FetchError> {
    let req = GetContentRequest {
        content_hash: hash.to_string(),
    };
    let res: GetContentResponse = match connect_rpc_post(PATH_GET_CONTENT, &req).await {
        Ok(r) => r,
        Err(FetchError::HttpError(404)) => return Ok(None),
        Err(FetchError::Other(msg)) if msg.starts_with("not_found:") => return Ok(None),
        Err(e) => return Err(e),
    };
    Ok(res.item.map(|item| item.content_bytes))
}

pub async fn post_event(signated_event: &[u8]) -> Result<u16, anyhow::Error> {
    let req = SubmitEventRequest {
        signed_event_bytes: signated_event.to_vec(),
    };

    let res: Result<SubmitEventResponse, FetchError> =
        connect_rpc_post(PATH_SUBMIT_EVENT, &req).await;

    match res {
        Ok(submit_res) => {
            // 差分ハッシュ・ネゴシエーション: サーバー側で不足しているコンテンツがあれば自動アップロードして再試行
            if submit_res.status == "missing_content"
                && !submit_res.missing_content_hashes.is_empty()
            {
                let missing_set: std::collections::HashSet<&str> = submit_res
                    .missing_content_hashes
                    .iter()
                    .map(|s| s.as_str())
                    .collect();

                let mut upload_items = Vec::new();

                if let Ok((_sig, event)) = definy_event::verify_and_deserialize(signated_event)
                    && let definy_event::event::EventContent::ModuleCommit(mc) = event.content
                {
                    for part in mc.parts {
                        if let Some(ref expr) = part.expression
                            && let Ok(ch) = definy_event::ContentHash::from_expression(expr)
                        {
                            let ch_str = ch.to_string();
                            if missing_set.contains(ch_str.as_str())
                                && let Ok(bytes) = serde_cbor::to_vec(expr)
                            {
                                upload_items.push(ContentItem {
                                    content_hash: ch_str,
                                    content_bytes: bytes,
                                });
                            }
                        }
                    }
                }

                if !upload_items.is_empty() {
                    let _ = upload_content(upload_items).await?;
                    let retry_res: SubmitEventResponse =
                        connect_rpc_post(PATH_SUBMIT_EVENT, &req).await?;
                    if retry_res.status == "ok" {
                        return Ok(200);
                    }
                }
            }
            Ok(200)
        }
        Err(FetchError::HttpError(status)) => Ok(status),
        Err(FetchError::DatabaseUnavailable | FetchError::DatabaseInitializing) => Ok(503),
        Err(err) => Err(anyhow::anyhow!(err.to_string())),
    }
}

pub async fn post_event_with_queue(
    signated_event: &[u8],
    force_offline: bool,
) -> Result<crate::local_event::LocalEventRecord, anyhow::Error> {
    let hash = EventHashId::from_bytes(signated_event);
    let now_ms = chrono::Utc::now().timestamp_millis();

    let (status, last_error) = if force_offline {
        (crate::local_event::LocalEventStatus::Queued, None)
    } else {
        match post_event(signated_event).await {
            Ok(status_code) if (200..300).contains(&(status_code as i32)) => {
                (crate::local_event::LocalEventStatus::Sent, None)
            }
            Ok(status_code) => (
                crate::local_event::LocalEventStatus::Failed,
                Some(format!("HTTP status {status_code}")),
            ),
            Err(error) => (
                crate::local_event::LocalEventStatus::Failed,
                Some(format!("{error:?}")),
            ),
        }
    };

    let record = crate::local_event::LocalEventRecord {
        hash,
        event_binary: signated_event.to_vec(),
        status,
        updated_at_ms: now_ms,
        last_error,
    };

    crate::indexed_db::store_event_record(&record)
        .await
        .map_err(js_error_to_anyhow)?;

    Ok(record)
}

fn js_error_to_string(value: JsValue) -> String {
    if let Some(text) = value.as_string() {
        text
    } else {
        format!("{value:?}")
    }
}

fn js_error_to_anyhow(value: JsValue) -> anyhow::Error {
    anyhow::anyhow!(js_error_to_string(value))
}
