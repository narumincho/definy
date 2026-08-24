use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = "navigator.credentials", js_name = "get")]
    fn navigator_credentials_get(s: js_sys::Object) -> js_sys::Promise;

    #[wasm_bindgen(js_namespace = "navigator.credentials", js_name = "store")]
    fn navigator_credentials_store(c: &wasm_bindgen::JsValue) -> js_sys::Promise;

    #[wasm_bindgen(js_name = "PasswordCredential")]
    type PasswordCredential;

    #[wasm_bindgen(constructor, js_name = "PasswordCredential")]
    fn new(data: &js_sys::Object) -> PasswordCredential;
}

const STORAGE_KEY: &str = "definy_current_key";

pub async fn credential_store(
    username: &str,
    key: &ed25519_dalek::SigningKey,
) -> Result<(), wasm_bindgen::JsValue> {
    let password_str = base64::Engine::encode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        key.to_bytes(),
    );

    if let Some(window) = web_sys::window()
        && let Ok(Some(storage)) = window.local_storage()
    {
        let _ = storage.set_item(STORAGE_KEY, &password_str);
    }

    // PasswordCredential might not be supported in all contexts (e.g. non-HTTPS / tests)
    // Check if the constructor exists before calling it
    if let Some(window) = web_sys::window() {
        let pc_exists = js_sys::Reflect::get(
            &window,
            &wasm_bindgen::JsValue::from_str("PasswordCredential"),
        )
        .ok()
        .is_some_and(|v| v.is_function());

        if pc_exists {
            let data = js_sys::Object::new();
            let _ = js_sys::Reflect::set(
                &data,
                &wasm_bindgen::JsValue::from_str("id"),
                &wasm_bindgen::JsValue::from_str(username),
            );
            let _ = js_sys::Reflect::set(
                &data,
                &wasm_bindgen::JsValue::from_str("name"),
                &wasm_bindgen::JsValue::from_str(username),
            );
            let _ = js_sys::Reflect::set(
                &data,
                &wasm_bindgen::JsValue::from_str("password"),
                &wasm_bindgen::JsValue::from_str(&password_str),
            );
            let credential = PasswordCredential::new(&data);
            let promise = navigator_credentials_store(&credential);
            let _ = wasm_bindgen_futures::JsFuture::from(promise).await;
        }
    }

    Ok(())
}

pub fn credential_get_sync() -> Option<ed25519_dalek::SigningKey> {
    if let Some(window) = web_sys::window()
        && let Ok(Some(storage)) = window.local_storage()
        && let Ok(Some(password_str)) = storage.get_item(STORAGE_KEY)
        && let Some(signing_key) = parse_password(password_str)
    {
        return Some(signing_key);
    }
    None
}

pub async fn credential_get() -> Option<ed25519_dalek::SigningKey> {
    if let Some(signing_key) = credential_get_sync() {
        return Some(signing_key);
    }

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

pub fn credential_clear() {
    if let Some(window) = web_sys::window()
        && let Ok(Some(storage)) = window.local_storage()
    {
        let _ = storage.remove_item(STORAGE_KEY);
    }
}

pub fn parse_password(password: String) -> Option<ed25519_dalek::SigningKey> {
    let password_as_bytes =
        &base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, password)
            .ok()?;
    let secret_key =
        ed25519_dalek::SigningKey::from_bytes(password_as_bytes.as_slice().try_into().ok()?);
    Some(secret_key)
}
