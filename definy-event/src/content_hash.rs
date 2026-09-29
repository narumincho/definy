use crate::event::{Expression, PartType};

#[derive(Debug, Clone, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub struct ContentHash([u8; 32]);

impl ContentHash {
    pub fn from_bytes(bytes: &[u8]) -> ContentHash {
        let hash: [u8; 32] = <sha2::Sha256 as sha2::Digest>::digest(bytes).into();
        ContentHash(hash)
    }

    pub fn from_expression(expr: &Expression) -> Result<ContentHash, serde_cbor::Error> {
        let bytes = serde_cbor::to_vec(expr)?;
        Ok(Self::from_bytes(&bytes))
    }

    pub fn from_part_type(part_type: &PartType) -> Result<ContentHash, serde_cbor::Error> {
        let bytes = serde_cbor::to_vec(part_type)?;
        Ok(Self::from_bytes(&bytes))
    }

    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }
}

impl AsRef<[u8]> for ContentHash {
    fn as_ref(&self) -> &[u8] {
        &self.0
    }
}

impl std::fmt::Display for ContentHash {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&base64::Engine::encode(
            &base64::engine::general_purpose::URL_SAFE_NO_PAD,
            self.0,
        ))
    }
}

impl std::str::FromStr for ContentHash {
    type Err = ContentHashFromStrError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let bytes = base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, s)
            .map_err(ContentHashFromStrError::DecodeError)?;
        let bytes: [u8; 32] = bytes
            .try_into()
            .map_err(ContentHashFromStrError::InvalidByteSize)?;
        Ok(ContentHash(bytes))
    }
}

#[derive(Debug)]
pub enum ContentHashFromStrError {
    DecodeError(base64::DecodeError),
    InvalidByteSize(<[u8; 32] as TryFrom<Vec<u8>>>::Error),
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::event::NumberExpression;

    #[test]
    fn test_content_hash_deterministic() {
        let expr1 = Expression::Number(NumberExpression { value: 42 });
        let expr2 = Expression::Number(NumberExpression { value: 42 });
        let expr3 = Expression::Number(NumberExpression { value: 43 });

        let hash1 = ContentHash::from_expression(&expr1).unwrap();
        let hash2 = ContentHash::from_expression(&expr2).unwrap();
        let hash3 = ContentHash::from_expression(&expr3).unwrap();

        assert_eq!(hash1, hash2);
        assert_ne!(hash1, hash3);
        assert_eq!(hash1.to_string(), hash2.to_string());
    }
}
