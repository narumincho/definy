use sha2;
use wasm_bindgen::JsValue;

pub async fn get_events_raw(
    event_type: Option<definy_event::event::EventType>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<u8>, anyhow::Error> {
    let mut url = "/events".to_string();
    let mut params = Vec::new();
    if let Some(event_type) = event_type {
        params.push(format!(
            "event_type={}",
            serde_urlencoded::to_string(event_type)?
        ));
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
    let response_raw =
        wasm_bindgen_futures::JsFuture::from(web_sys::window().unwrap().fetch_with_str(&url))
            .await
            .unwrap();

    let response: web_sys::Response = wasm_bindgen::JsCast::dyn_into(response_raw).unwrap();
    let response_body: js_sys::ArrayBuffer = wasm_bindgen::JsCast::dyn_into(
        wasm_bindgen_futures::JsFuture::from(response.array_buffer().unwrap())
            .await
            .unwrap(),
    )
    .unwrap();
    let response_body_bytes = js_sys::Uint8Array::new(&response_body).to_vec();
    Ok(response_body_bytes)
}

pub async fn get_events(
    event_type: Option<definy_event::event::EventType>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> anyhow::Result<
    Vec<(
        [u8; 32],
        Result<
            (ed25519_dalek::Signature, definy_event::event::Event),
            definy_event::VerifyAndDeserializeError,
        >,
    )>,
> {
    let response_body_bytes = get_events_raw(event_type, limit, offset).await?;

    let value =
        serde_cbor::from_slice::<definy_event::response::EventsResponse>(&response_body_bytes)?;

    let event_pairs = value
        .events
        .into_iter()
        .filter_map(|bytes| {
            let hash: [u8; 32] = <sha2::Sha256 as sha2::Digest>::digest(&bytes).into();
            Some((hash, bytes))
        })
        .collect::<Vec<([u8; 32], Vec<u8>)>>();

    if let Err(error) = crate::indexed_db::store_events(&event_pairs).await {
        web_sys::console::warn_1(&error);
    }

    Ok(event_pairs
        .into_iter()
        .map(|(hash, bytes)| (hash, definy_event::verify_and_deserialize(&bytes)))
        .collect::<Vec<(
            [u8; 32],
            Result<
                (ed25519_dalek::Signature, definy_event::event::Event),
                definy_event::VerifyAndDeserializeError,
            >,
        )>>())
}

pub async fn post_event(signated_event: &[u8]) -> Result<u16, anyhow::Error> {
    let headers = web_sys::Headers::new().unwrap();
    headers.set("Content-Type", "application/cbor").unwrap();
    let request_init = web_sys::RequestInit::new();
    request_init.set_method("POST");
    request_init.set_headers(&headers);
    request_init.set_body(&js_sys::Uint8Array::from(signated_event));
    let response_raw = wasm_bindgen_futures::JsFuture::from(
        web_sys::window()
            .unwrap()
            .fetch_with_str_and_init("/events", &request_init),
    )
    .await
    .map_err(js_error_to_anyhow)?;

    let response: web_sys::Response =
        wasm_bindgen::JsCast::dyn_into(response_raw).map_err(js_error_to_anyhow)?;
    Ok(response.status())
}

pub async fn post_event_with_queue(
    signated_event: &[u8],
    force_offline: bool,
) -> Result<crate::local_event::LocalEventRecord, anyhow::Error> {
    let hash: [u8; 32] = <sha2::Sha256 as sha2::Digest>::digest(signated_event).into();
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

    crate::indexed_db::store_event_send_record(&record)
        .await
        .map_err(js_error_to_anyhow)?;

    Ok(record)
}

fn js_error_to_anyhow(value: JsValue) -> anyhow::Error {
    if let Some(text) = value.as_string() {
        anyhow::anyhow!(text)
    } else {
        anyhow::anyhow!("{value:?}")
    }
}
