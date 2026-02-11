use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = "navigator.credentials", js_name = "get")]
    fn navigator_credentials_get(s: js_sys::Object) -> js_sys::Promise;
}

pub async fn credential_get() -> Option<ed25519_dalek::SigningKey> {
    let options = js_sys::Object::new();
    js_sys::Reflect::set(
        &options,
        &wasm_bindgen::JsValue::from_str("password"),
        &wasm_bindgen::JsValue::TRUE,
    )
    .ok()?;
    let credential = wasm_bindgen_futures::JsFuture::from(navigator_credentials_get(options))
        .await
        .ok()?;
    let password =
        js_sys::Reflect::get(&credential, &wasm_bindgen::JsValue::from_str("password")).ok()?;
    parse_password(password.as_string()?)
}

pub fn parse_password(password: String) -> Option<ed25519_dalek::SigningKey> {
    let password_as_bytes =
        &base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, password)
            .ok()?;
    let secret_key =
        ed25519_dalek::SigningKey::from_bytes(password_as_bytes.as_slice().try_into().ok()?);
    Some(secret_key)
}
