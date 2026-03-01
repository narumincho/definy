pub fn encode_hash32(hash: &[u8; 32]) -> String {
    base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, hash)
}

pub fn encode_bytes(bytes: &[u8]) -> String {
    base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, bytes)
}

pub fn short_hash32(hash: &[u8; 32]) -> String {
    encode_hash32(hash).chars().take(10).collect()
}
