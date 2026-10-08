use prost::Message;
use serde::{Deserialize, Serialize};

pub const CONNECT_PROTOCOL_VERSION: &str = "1";
pub const CONNECT_HEADER_PROTOCOL_VERSION: &str = "connect-protocol-version";

pub const SERVICE_NAME: &str = "definy.v1.EventService";
pub const METHOD_GET_EVENTS: &str = "GetEvents";
pub const METHOD_GET_EVENT: &str = "GetEvent";
pub const METHOD_SUBMIT_EVENT: &str = "SubmitEvent";
pub const METHOD_CHECK_MISSING_HASHES: &str = "CheckMissingHashes";
pub const METHOD_UPLOAD_CONTENT: &str = "UploadContent";
pub const METHOD_GET_CONTENT: &str = "GetContent";

pub const PATH_GET_EVENTS: &str = "/definy.v1.EventService/GetEvents";
pub const PATH_GET_EVENT: &str = "/definy.v1.EventService/GetEvent";
pub const PATH_SUBMIT_EVENT: &str = "/definy.v1.EventService/SubmitEvent";
pub const PATH_CHECK_MISSING_HASHES: &str = "/definy.v1.EventService/CheckMissingHashes";
pub const PATH_UPLOAD_CONTENT: &str = "/definy.v1.EventService/UploadContent";
pub const PATH_GET_CONTENT: &str = "/definy.v1.EventService/GetContent";

pub const DEPLOY_SERVICE_NAME: &str = "definy.v1.DeployService";
pub const METHOD_DEPLOY_INSTANCE: &str = "DeployInstance";
pub const METHOD_GET_DEPLOY_STATUS: &str = "GetDeployStatus";
pub const METHOD_LIST_DEPLOYMENTS: &str = "ListDeployments";
pub const METHOD_DEPLOY_DENO: &str = "DeployDeno";

pub const PATH_DEPLOY_INSTANCE: &str = "/definy.v1.DeployService/DeployInstance";
pub const PATH_GET_DEPLOY_STATUS: &str = "/definy.v1.DeployService/GetDeployStatus";
pub const PATH_LIST_DEPLOYMENTS: &str = "/definy.v1.DeployService/ListDeployments";
pub const PATH_DEPLOY_DENO: &str = "/definy.v1.DeployService/DeployDeno";

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

    /// 差分ハッシュ・ネゴシエーション: サーバー側で欠損しているコンテンツハッシュ一覧
    #[prost(string, repeated, tag = "3")]
    #[serde(default, alias = "missing_content_hashes")]
    pub missing_content_hashes: Vec<String>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct ContentItem {
    #[prost(string, tag = "1")]
    #[serde(default, alias = "content_hash")]
    pub content_hash: String,

    #[prost(bytes = "vec", tag = "2")]
    #[serde(with = "base64_bytes", alias = "content_bytes")]
    #[cfg_attr(feature = "utoipa", schema(value_type = String, format = Byte))]
    pub content_bytes: Vec<u8>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct CheckMissingHashesRequest {
    #[prost(string, repeated, tag = "1")]
    #[serde(default, alias = "content_hashes")]
    pub content_hashes: Vec<String>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct CheckMissingHashesResponse {
    #[prost(string, repeated, tag = "1")]
    #[serde(default, alias = "missing_content_hashes")]
    pub missing_content_hashes: Vec<String>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct UploadContentRequest {
    #[prost(message, repeated, tag = "1")]
    #[serde(default)]
    pub items: Vec<ContentItem>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct UploadContentResponse {
    #[prost(string, repeated, tag = "1")]
    #[serde(default, alias = "stored_content_hashes")]
    pub stored_content_hashes: Vec<String>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct GetContentRequest {
    #[prost(string, tag = "1")]
    #[serde(default, alias = "content_hash")]
    pub content_hash: String,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct GetContentResponse {
    #[prost(message, optional, tag = "1")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub item: Option<ContentItem>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct DeployInstanceRequest {
    #[prost(string, optional, tag = "1")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub commit_hash: Option<String>,

    #[prost(string, optional, tag = "2")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub machine_name: Option<String>,

    #[prost(string, optional, tag = "3")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub region: Option<String>,

    #[prost(string, optional, tag = "4")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub wasm_hash: Option<String>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct DeployInstanceResponse {
    #[prost(string, tag = "1")]
    #[serde(default)]
    pub machine_id: String,

    #[prost(string, tag = "2")]
    #[serde(default)]
    pub status: String,

    #[prost(string, tag = "3")]
    #[serde(default)]
    pub url: String,

    #[prost(string, tag = "4")]
    #[serde(default)]
    pub app_url: String,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct GetDeployStatusRequest {
    #[prost(string, tag = "1")]
    #[serde(default)]
    pub machine_id: String,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct GetDeployStatusResponse {
    #[prost(string, tag = "1")]
    #[serde(default)]
    pub machine_id: String,

    #[prost(string, tag = "2")]
    #[serde(default)]
    pub status: String,

    #[prost(string, tag = "3")]
    #[serde(default)]
    pub region: String,

    #[prost(string, tag = "4")]
    #[serde(default)]
    pub url: String,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct DeploymentItem {
    #[prost(string, tag = "1")]
    #[serde(default)]
    pub machine_id: String,

    #[prost(string, optional, tag = "2")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub commit_hash: Option<String>,

    #[prost(string, tag = "3")]
    #[serde(default)]
    pub status: String,

    #[prost(string, tag = "4")]
    #[serde(default)]
    pub url: String,

    #[prost(string, tag = "5")]
    #[serde(default)]
    pub app_url: String,

    #[prost(string, tag = "6")]
    #[serde(default)]
    pub region: String,

    #[prost(string, tag = "7")]
    #[serde(default)]
    pub created_at_rfc3339: String,

    #[prost(string, optional, tag = "8")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub wasm_hash: Option<String>,

    #[prost(string, optional, tag = "9")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct DeployDenoRequest {
    #[prost(string, tag = "1")]
    #[serde(default)]
    pub org_token: String,

    #[prost(string, optional, tag = "2")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub app_slug: Option<String>,

    #[prost(string, optional, tag = "3")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub wasm_hash: Option<String>,

    #[prost(string, optional, tag = "4")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub custom_script: Option<String>,

    #[prost(bool, optional, tag = "5")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub compile_self_hosted: Option<bool>,

    #[prost(string, optional, tag = "6")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub part_id: Option<String>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct DeployDenoResponse {
    #[prost(string, tag = "1")]
    #[serde(default)]
    pub app_id: String,

    #[prost(string, tag = "2")]
    #[serde(default)]
    pub app_slug: String,

    #[prost(string, tag = "3")]
    #[serde(default)]
    pub revision_id: String,

    #[prost(string, tag = "4")]
    #[serde(default)]
    pub status: String,

    #[prost(string, tag = "5")]
    #[serde(default)]
    pub url: String,

    #[prost(string, repeated, tag = "6")]
    #[serde(default)]
    pub hostnames: Vec<String>,

    #[prost(string, optional, tag = "7")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub evaluated_result: Option<String>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct ListDeploymentsRequest {
    #[prost(uint64, optional, tag = "1")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub limit: Option<u64>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct ListDeploymentsResponse {
    #[prost(message, repeated, tag = "1")]
    #[serde(default)]
    pub deployments: Vec<DeploymentItem>,
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
    fn test_negotiation_messages_roundtrip() {
        let req = CheckMissingHashesRequest {
            content_hashes: vec!["hash1".into(), "hash2".into()],
        };
        let mut buf = Vec::new();
        req.encode(&mut buf).unwrap();
        let decoded = CheckMissingHashesRequest::decode(&buf[..]).unwrap();
        assert_eq!(req, decoded);

        let upload_req = UploadContentRequest {
            items: vec![ContentItem {
                content_hash: "hash1".into(),
                content_bytes: vec![10, 20, 30],
            }],
        };
        let mut buf2 = Vec::new();
        upload_req.encode(&mut buf2).unwrap();
        let decoded_upload = UploadContentRequest::decode(&buf2[..]).unwrap();
        assert_eq!(upload_req, decoded_upload);
    }

    #[test]
    fn test_deploy_messages_roundtrip() {
        let req = DeployInstanceRequest {
            commit_hash: Some("commit_abc123".into()),
            machine_name: Some("test-machine".into()),
            region: Some("nrt".into()),
            wasm_hash: Some("wasm_hash_789".into()),
        };
        let mut buf = Vec::new();
        req.encode(&mut buf).unwrap();
        let decoded = DeployInstanceRequest::decode(&buf[..]).unwrap();
        assert_eq!(req, decoded);

        let res = DeployInstanceResponse {
            machine_id: "m_123".into(),
            status: "created".into(),
            url: "https://definy.fly.dev".into(),
            app_url: "https://definy.fly.dev".into(),
        };
        let mut buf_res = Vec::new();
        res.encode(&mut buf_res).unwrap();
        let decoded_res = DeployInstanceResponse::decode(&buf_res[..]).unwrap();
        assert_eq!(res, decoded_res);
    }
}
