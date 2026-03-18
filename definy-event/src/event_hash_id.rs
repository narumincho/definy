#[derive(Debug, Clone, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub struct EventHashId([u8; 32]);

impl EventHashId {
    pub fn from_bytes(bytes: &[u8]) -> EventHashId {
        let hash: [u8; 32] = <sha2::Sha256 as sha2::Digest>::digest(bytes).into();
        EventHashId(hash)
    }
}

impl std::fmt::Display for EventHashId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&base64::Engine::encode(
            &base64::engine::general_purpose::URL_SAFE_NO_PAD,
            self.0,
        ))
    }
}

impl std::str::FromStr for EventHashId {
    type Err = EventHashIdFromStrError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let bytes = base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, s)
            .map_err(EventHashIdFromStrError::DecodeError)?;
        let bytes: [u8; 32] = bytes
            .try_into()
            .map_err(EventHashIdFromStrError::InvalidByteSize)?;
        Ok(EventHashId(bytes))
    }
}

#[derive(Debug)]
pub enum EventHashIdFromStrError {
    DecodeError(base64::DecodeError),
    InvalidByteSize(<[u8; 32] as TryFrom<Vec<u8>>>::Error),
}
