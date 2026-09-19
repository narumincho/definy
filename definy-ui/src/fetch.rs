use definy_event::EventHashId;
use wasm_bindgen::JsValue;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FetchError {
    /// Failed to connect to the API server (network error, refused, DNS failure)
    ServerDisconnected(String),
    /// API server is connected, but database is unavailable (HTTP 503)
    DatabaseUnavailable,
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

pub async fn get_events_raw(
    event_type: Option<definy_event::event::EventType>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<u8>, FetchError> {
    let base = api_base_url();
    let mut url = format!("{}/events", base);
    let mut params = Vec::new();
    if let Some(event_type) = event_type {
        params.push(format!("event_type={}", event_type));
    }
    if let Some(limit) = limit {
        params.push(format!("limit={}", limit));
    }
    if let Some(offset) = offset {
        params.push(format!("offset={}", offset));
    }
    if !params.is_empty() {
        url.push('?');
        url.push_str(&params.join("&"));
    }
    let window = web_sys::window().ok_or_else(|| FetchError::Other("no window".to_string()))?;
    let response_raw = match wasm_bindgen_futures::JsFuture::from(window.fetch_with_str(&url)).await
    {
        Ok(val) => val,
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
        return Err(FetchError::DatabaseUnavailable);
    }

    if !response.ok() {
        return Err(FetchError::HttpError(response.status()));
    }

    let array_buffer_promise = response
        .array_buffer()
        .map_err(|e| FetchError::Other(js_error_to_string(e)))?;
    let response_body: js_sys::ArrayBuffer =
        match wasm_bindgen_futures::JsFuture::from(array_buffer_promise).await {
            Ok(val) => match wasm_bindgen::JsCast::dyn_into(val) {
                Ok(ab) => ab,
                Err(_) => return Err(FetchError::Other("failed to cast ArrayBuffer".to_string())),
            },
            Err(e) => return Err(FetchError::Other(js_error_to_string(e))),
        };
    let response_body_bytes = js_sys::Uint8Array::new(&response_body).to_vec();
    Ok(response_body_bytes)
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
    let response_body_bytes = get_events_raw(event_type, limit, offset).await?;

    let value =
        serde_cbor::from_slice::<definy_event::response::EventsResponse>(&response_body_bytes)
            .map_err(|e| FetchError::DeserializeError(e.to_string()))?;

    let event_pairs = value.events.into_iter().collect::<Vec<Vec<u8>>>();

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
    let base = api_base_url();
    let url = format!("{}/events/{}", base, hash);
    let window = web_sys::window().ok_or_else(|| FetchError::Other("no window".to_string()))?;
    let response_raw = match wasm_bindgen_futures::JsFuture::from(window.fetch_with_str(&url)).await
    {
        Ok(v) => v,
        Err(e) => return Err(FetchError::ServerDisconnected(js_error_to_string(e))),
    };

    let response: web_sys::Response = match wasm_bindgen::JsCast::dyn_into(response_raw) {
        Ok(r) => r,
        Err(_) => return Err(FetchError::Other("failed to cast Response".to_string())),
    };

    if response.status() == 404 {
        return Ok(None);
    }
    if response.status() == 503 {
        return Err(FetchError::DatabaseUnavailable);
    }
    if !response.ok() {
        return Err(FetchError::HttpError(response.status()));
    }

    let array_buffer_promise = response
        .array_buffer()
        .map_err(|e| FetchError::Other(js_error_to_string(e)))?;
    let response_body: js_sys::ArrayBuffer =
        match wasm_bindgen_futures::JsFuture::from(array_buffer_promise).await {
            Ok(v) => match wasm_bindgen::JsCast::dyn_into(v) {
                Ok(ab) => ab,
                Err(_) => return Err(FetchError::Other("failed to cast ArrayBuffer".to_string())),
            },
            Err(e) => return Err(FetchError::Other(js_error_to_string(e))),
        };
    let bytes = js_sys::Uint8Array::new(&response_body).to_vec();

    if let Err(error) = crate::indexed_db::store_events(std::slice::from_ref(&bytes)).await {
        web_sys::console::warn_1(&error);
    }

    let decoded = definy_event::verify_and_deserialize(&bytes);
    let hash_id = EventHashId::from_bytes(&bytes);
    Ok(Some((hash_id, decoded)))
}

pub async fn post_event(signated_event: &[u8]) -> Result<u16, anyhow::Error> {
    let headers = web_sys::Headers::new().map_err(js_error_to_anyhow)?;
    headers
        .set("Content-Type", "application/cbor")
        .map_err(js_error_to_anyhow)?;
    let request_init = web_sys::RequestInit::new();
    request_init.set_method("POST");
    request_init.set_headers(&headers);
    request_init.set_body(&js_sys::Uint8Array::from(signated_event));
    let window = web_sys::window().ok_or_else(|| anyhow::anyhow!("no window"))?;
    let base = api_base_url();
    let url = format!("{}/events", base);
    let response_raw = match wasm_bindgen_futures::JsFuture::from(
        window.fetch_with_str_and_init(&url, &request_init),
    )
    .await
    {
        Ok(val) => val,
        Err(err) => {
            web_sys::console::error_1(&format!("fetch POST {} failed: {:?}", url, err).into());
            return Err(js_error_to_anyhow(err));
        }
    };

    let response: web_sys::Response =
        wasm_bindgen::JsCast::dyn_into(response_raw).map_err(js_error_to_anyhow)?;
    web_sys::console::log_1(
        &format!("fetch POST {} returned status: {}", url, response.status()).into(),
    );
    Ok(response.status())
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
