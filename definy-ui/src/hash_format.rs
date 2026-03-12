pub fn encode_hash32(hash: &[u8; 32]) -> String {
    base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, hash)
}

pub fn encode_bytes(bytes: &[u8]) -> String {
    base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, bytes)
}

pub fn short_hash32(hash: &[u8; 32]) -> String {
    encode_hash32(hash).chars().take(10).collect()
}

pub fn decode_hash32(value: &str) -> Option<[u8; 32]> {
    let bytes =
        base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, value).ok()?;
    if bytes.len() == 32 {
        let mut result = [0u8; 32];
        result.copy_from_slice(&bytes);
        Some(result)
    } else {
        None
    }
}
