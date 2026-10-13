use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen(inline_js = r#"
export async function getSilentPasswordCredential(timeoutMs) {
    try {
        if (typeof window === "undefined" || !window.navigator || !window.navigator.credentials || !window.navigator.credentials.get) {
            return null;
        }
        if (typeof window.PasswordCredential === "undefined") {
            return null;
        }
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
        const credPromise = window.navigator.credentials.get({
            password: true,
            mediation: "silent"
        }).then((cred) => {
            if (cred && typeof cred.password === "string") {
                return cred.password;
            }
            return null;
        }).catch(() => null);

        return await Promise.race([credPromise, timeoutPromise]);
    } catch {
        return null;
    }
}

export async function storePasswordCredential(username, password) {
    try {
        if (typeof window === "undefined" || !window.navigator || !window.navigator.credentials || !window.navigator.credentials.store) {
            return false;
        }
        if (typeof window.PasswordCredential === "undefined") {
            return false;
        }
        const cred = new window.PasswordCredential({
            id: username,
            name: username,
            password: password
        });
        await window.navigator.credentials.store(cred);
        return true;
    } catch {
        return false;
    }
}
"#)]
extern "C" {
    #[wasm_bindgen(catch)]
    async fn getSilentPasswordCredential(
        timeout_ms: i32,
    ) -> Result<wasm_bindgen::JsValue, wasm_bindgen::JsValue>;

    #[wasm_bindgen(catch)]
    async fn storePasswordCredential(
        username: &str,
        password: &str,
    ) -> Result<wasm_bindgen::JsValue, wasm_bindgen::JsValue>;
}

const STORAGE_KEY: &str = "definy_current_key";

pub fn credential_save_sync(key: &ed25519_dalek::SigningKey) {
    if let Some(window) = web_sys::window()
        && let Ok(Some(storage)) = window.local_storage()
    {
        let encoded = base64::Engine::encode(
            &base64::engine::general_purpose::URL_SAFE_NO_PAD,
            key.to_bytes(),
        );
        let _ = storage.set_item(STORAGE_KEY, &encoded);
    }
}

pub async fn credential_store(
    username: &str,
    key: &ed25519_dalek::SigningKey,
) -> Result<(), wasm_bindgen::JsValue> {
    credential_save_sync(key);

    let password_str = base64::Engine::encode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        key.to_bytes(),
    );

    let _ = storePasswordCredential(username, &password_str).await;

    Ok(())
}

pub fn credential_get_sync() -> Option<ed25519_dalek::SigningKey> {
    let window = web_sys::window()?;
    let storage = window.local_storage().ok()??;
    let stored = storage.get_item(STORAGE_KEY).ok()??;
    parse_password(stored)
}

pub async fn credential_get() -> Option<ed25519_dalek::SigningKey> {
    if let Some(signing_key) = credential_get_sync() {
        return Some(signing_key);
    }

    // タイムアウト 300ms で silent モードで取得を試みる
    let password_js = getSilentPasswordCredential(300).await.ok()?;
    let password = password_js.as_string()?;
    let key = parse_password(password)?;
    credential_save_sync(&key);
    Some(key)
}

pub fn credential_clear() {
    if let Some(window) = web_sys::window()
        && let Ok(Some(storage)) = window.local_storage()
    {
        let _ = storage.remove_item(STORAGE_KEY);
    }
}

pub fn parse_password(password: String) -> Option<ed25519_dalek::SigningKey> {
    let trimmed = password.trim();
    if trimmed.is_empty() {
        return None;
    }

    // 1. URL_SAFE_NO_PAD
    if let Ok(bytes) =
        base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, trimmed)
        && let Ok(key) = try_bytes_to_signing_key(&bytes)
    {
        return Some(key);
    }

    // 2. URL_SAFE (with padding)
    if let Ok(bytes) = base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE, trimmed)
        && let Ok(key) = try_bytes_to_signing_key(&bytes)
    {
        return Some(key);
    }

    // 3. STANDARD_NO_PAD
    if let Ok(bytes) =
        base64::Engine::decode(&base64::engine::general_purpose::STANDARD_NO_PAD, trimmed)
        && let Ok(key) = try_bytes_to_signing_key(&bytes)
    {
        return Some(key);
    }

    // 4. STANDARD
    if let Ok(bytes) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, trimmed)
        && let Ok(key) = try_bytes_to_signing_key(&bytes)
    {
        return Some(key);
    }

    // 5. Hex representation (64 hex characters = 32 bytes)
    if let Ok(bytes) = hex::decode(trimmed)
        && let Ok(key) = try_bytes_to_signing_key(&bytes)
    {
        return Some(key);
    }

    None
}

fn try_bytes_to_signing_key(bytes: &[u8]) -> Result<ed25519_dalek::SigningKey, ()> {
    if bytes.len() == 32 {
        let arr: [u8; 32] = bytes.try_into().map_err(|_| ())?;
        Ok(ed25519_dalek::SigningKey::from_bytes(&arr))
    } else if bytes.len() == 64 {
        let arr: [u8; 32] = bytes[0..32].try_into().map_err(|_| ())?;
        Ok(ed25519_dalek::SigningKey::from_bytes(&arr))
    } else {
        Err(())
    }
}
