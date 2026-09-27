use prost::Message;
use serde::{Deserialize, Serialize};

pub const CONNECT_PROTOCOL_VERSION: &str = "1";
pub const CONNECT_HEADER_PROTOCOL_VERSION: &str = "connect-protocol-version";

pub const SERVICE_NAME: &str = "definy.v1.EventService";
pub const METHOD_GET_EVENTS: &str = "GetEvents";
pub const METHOD_GET_EVENT: &str = "GetEvent";
pub const METHOD_SUBMIT_EVENT: &str = "SubmitEvent";

pub const PATH_GET_EVENTS: &str = "/definy.v1.EventService/GetEvents";
pub const PATH_GET_EVENT: &str = "/definy.v1.EventService/GetEvent";
pub const PATH_SUBMIT_EVENT: &str = "/definy.v1.EventService/SubmitEvent";

pub mod base64_bytes {
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(bytes: &[u8], serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, bytes);
        serializer.serialize_str(&encoded)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        if let Ok(b) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &s) {
            return Ok(b);
        }
        if let Ok(b) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD_NO_PAD, &s)
        {
            return Ok(b);
        }
        if let Ok(b) = base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE, &s) {
            return Ok(b);
        }
        base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, &s)
            .map_err(serde::de::Error::custom)
    }
}

/// An event item as transferred over Connect-RPC.
/// Contains the deterministic CBOR binary of the signed event, along with indexed fields.
use crate::event::EventContent;

/// An event item as transferred over Connect-RPC.
/// Contains the deterministic CBOR binary of the signed event, along with indexed fields.
#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct EventItem {
    /// URL-safe base64 encoded event hash (EventHashId)
    #[prost(string, tag = "1")]
    #[serde(default, alias = "event_hash")]
    pub event_hash: String,

    /// Raw signed event binary (Deterministic CBOR)
    #[prost(bytes = "vec", tag = "2")]
    #[serde(with = "base64_bytes", alias = "signed_event_bytes")]
    #[cfg_attr(feature = "utoipa", schema(value_type = String, format = Byte, example = "oWZhYXV0aG9y..."))]
    pub signed_event_bytes: Vec<u8>,

    /// Account ID of the author
    #[prost(string, tag = "3")]
    #[serde(default, alias = "account_id")]
    pub account_id: String,

    /// Event type name (e.g. "create_account", "change_profile", "module_commit")
    #[prost(string, tag = "4")]
    #[serde(default, alias = "event_type")]
    pub event_type: String,

    /// Timestamp in RFC 3339 format
    #[prost(string, tag = "5")]
    #[serde(default, alias = "created_at_rfc3339")]
    pub created_at_rfc3339: String,
}

impl EventItem {
    pub fn from_signed_bytes(bytes: Vec<u8>) -> Result<Self, crate::VerifyAndDeserializeError> {
        let (_sig, event) = crate::verify_and_deserialize(&bytes)?;
        let event_hash = crate::EventHashId::from_bytes(&bytes).to_string();
        let account_id = event.account_id.to_string();
        let event_type = match &event.content {
            EventContent::CreateAccount(_) => "create_account",
            EventContent::ChangeProfile(_) => "change_profile",
            EventContent::ModuleCommit(_) => "module_commit",
        }
        .to_string();
        let created_at_rfc3339 = event.time.to_rfc3339();

        Ok(Self {
            event_hash,
            signed_event_bytes: bytes,
            account_id,
            event_type,
            created_at_rfc3339,
        })
    }
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct GetEventsRequest {
    #[prost(string, optional, tag = "1")]
    #[serde(default, skip_serializing_if = "Option::is_none", alias = "event_type")]
    pub event_type: Option<String>,

    #[prost(uint64, optional, tag = "2")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub limit: Option<u64>,

    #[prost(uint64, optional, tag = "3")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub offset: Option<u64>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct GetEventsResponse {
    #[prost(message, repeated, tag = "1")]
    #[serde(default)]
    pub events: Vec<EventItem>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct GetEventRequest {
    #[prost(string, tag = "1")]
    #[serde(default, alias = "event_hash")]
    pub event_hash: String,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct GetEventResponse {
    #[prost(message, optional, tag = "1")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub event: Option<EventItem>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct SubmitEventRequest {
    /// Raw signed event binary (Deterministic CBOR containing Ed25519 signature + Tagged CBOR payload)
    #[prost(bytes = "vec", tag = "1")]
    #[serde(with = "base64_bytes", alias = "signed_event_bytes")]
    #[cfg_attr(feature = "utoipa", schema(value_type = String, format = Byte, example = "oWZhYXV0aG9y..."))]
    pub signed_event_bytes: Vec<u8>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct SubmitEventResponse {
    #[prost(string, tag = "1")]
    #[serde(default, alias = "event_hash")]
    pub event_hash: String,

    #[prost(string, tag = "2")]
    #[serde(default)]
    pub status: String,
}

/// Connect-RPC standard error format
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct ConnectError {
    pub code: String,
    pub message: String,
}

impl ConnectError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }

    pub fn invalid_argument(message: impl Into<String>) -> Self {
        Self::new("invalid_argument", message)
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new("not_found", message)
    }

    pub fn unavailable(message: impl Into<String>) -> Self {
        Self::new("unavailable", message)
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::new("internal", message)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_protobuf_roundtrip() {
        let req = SubmitEventRequest {
            signed_event_bytes: vec![1, 2, 3, 4, 5],
        };
        let mut buf = Vec::new();
        req.encode(&mut buf).unwrap();

        let decoded = SubmitEventRequest::decode(&buf[..]).unwrap();
        assert_eq!(req, decoded);
    }

    #[test]
    fn test_json_roundtrip() {
        let req = SubmitEventRequest {
            signed_event_bytes: vec![1, 2, 3, 4, 5],
        };
        let json_str = serde_json::to_string(&req).unwrap();
        let decoded: SubmitEventRequest = serde_json::from_str(&json_str).unwrap();
        assert_eq!(req, decoded);
    }
}
