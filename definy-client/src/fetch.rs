pub async fn get_events_raw() -> Result<Vec<u8>, anyhow::Error> {
    let response_raw =
        wasm_bindgen_futures::JsFuture::from(web_sys::window().unwrap().fetch_with_str("events"))
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

pub async fn get_events()
-> Result<Vec<(ed25519_dalek::Signature, definy_event::CreateAccountEvent)>, anyhow::Error> {
    let response_body_bytes = get_events_raw().await?;

    let value = serde_cbor::from_slice::<serde_cbor::Value>(&response_body_bytes)?;

    match value {
        serde_cbor::Value::Array(events) => events
            .into_iter()
            .map(|event| match event {
                serde_cbor::Value::Bytes(bytes) => {
                    let (event, signature) = definy_event::verify_and_deserialize(&bytes)?;
                    Ok((signature, event))
                }
                _ => Err(anyhow::anyhow!("Invalid response")),
            })
            .collect(),
        _ => Err(anyhow::anyhow!("Invalid response")),
    }
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
            .fetch_with_str_and_init("events", &request_init),
    )
    .await
    .unwrap();

    let response: web_sys::Response = wasm_bindgen::JsCast::dyn_into(response_raw).unwrap();
    Ok(response.status())
}
