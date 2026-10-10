use prost::Message;
use serde::{Deserialize, Serialize};

pub const PREVIEW_SERVICE_NAME: &str = "definy.v1.PreviewService";
pub const METHOD_REGISTER_PREVIEW_APP: &str = "RegisterPreviewApp";
pub const METHOD_LIST_PREVIEW_APPS: &str = "ListPreviewApps";
pub const METHOD_STOP_PREVIEW_APP: &str = "StopPreviewApp";

pub const PATH_REGISTER_PREVIEW_APP: &str = "/definy.v1.PreviewService/RegisterPreviewApp";
pub const PATH_LIST_PREVIEW_APPS: &str = "/definy.v1.PreviewService/ListPreviewApps";
pub const PATH_STOP_PREVIEW_APP: &str = "/definy.v1.PreviewService/StopPreviewApp";

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct RegisterPreviewAppRequest {
    #[prost(string, tag = "1")]
    #[serde(default, alias = "app_id")]
    pub app_id: String,

    #[prost(string, tag = "2")]
    #[serde(default, alias = "display_name")]
    pub display_name: String,

    #[prost(string, tag = "3")]
    #[serde(default, alias = "part_id")]
    pub part_id: String,

    #[prost(string, tag = "4")]
    #[serde(default, alias = "account_id")]
    pub account_id: String,

    #[prost(string, optional, tag = "5")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub signature: Option<String>,

    #[prost(string, optional, tag = "6")]
    #[serde(default, skip_serializing_if = "Option::is_none", alias = "wasm_hash")]
    pub wasm_hash: Option<String>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct RegisterPreviewAppResponse {
    #[prost(string, tag = "1")]
    #[serde(default, alias = "app_id")]
    pub app_id: String,

    #[prost(string, tag = "2")]
    #[serde(default, alias = "preview_url")]
    pub preview_url: String,

    #[prost(string, tag = "3")]
    #[serde(default, alias = "path_url")]
    pub path_url: String,

    #[prost(string, tag = "4")]
    #[serde(default)]
    pub status: String,

    #[prost(string, tag = "5")]
    #[serde(default)]
    pub subdomain: String,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct PreviewAppItem {
    #[prost(string, tag = "1")]
    #[serde(default, alias = "app_id")]
    pub app_id: String,

    #[prost(string, tag = "2")]
    #[serde(default, alias = "display_name")]
    pub display_name: String,

    #[prost(string, tag = "3")]
    #[serde(default, alias = "part_id")]
    pub part_id: String,

    #[prost(string, tag = "4")]
    #[serde(default, alias = "preview_url")]
    pub preview_url: String,

    #[prost(string, tag = "5")]
    #[serde(default, alias = "path_url")]
    pub path_url: String,

    #[prost(string, tag = "6")]
    #[serde(default, alias = "owner_account_id")]
    pub owner_account_id: String,

    #[prost(string, tag = "7")]
    #[serde(default, alias = "created_at_rfc3339")]
    pub created_at_rfc3339: String,

    #[prost(string, tag = "8")]
    #[serde(default)]
    pub status: String,

    #[prost(string, tag = "9")]
    #[serde(default)]
    pub subdomain: String,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct ListPreviewAppsRequest {
    #[prost(string, optional, tag = "1")]
    #[serde(default, skip_serializing_if = "Option::is_none", alias = "account_id")]
    pub account_id: Option<String>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct ListPreviewAppsResponse {
    #[prost(message, repeated, tag = "1")]
    #[serde(default)]
    pub apps: Vec<PreviewAppItem>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct StopPreviewAppRequest {
    #[prost(string, tag = "1")]
    #[serde(default, alias = "app_id")]
    pub app_id: String,

    #[prost(string, tag = "2")]
    #[serde(default, alias = "account_id")]
    pub account_id: String,

    #[prost(string, optional, tag = "3")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub signature: Option<String>,
}

#[derive(Clone, PartialEq, Message, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct StopPreviewAppResponse {
    #[prost(bool, tag = "1")]
    #[serde(default)]
    pub success: bool,

    #[prost(string, tag = "2")]
    #[serde(default)]
    pub message: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_preview_rpc_serde_and_protobuf() {
        let req = RegisterPreviewAppRequest {
            app_id: "test-app".to_string(),
            display_name: "Test App".to_string(),
            part_id: "part-123".to_string(),
            account_id: "0123456789abcdef".to_string(),
            signature: Some("sig-xyz".to_string()),
            wasm_hash: Some("wasm-abc".to_string()),
        };

        // 1. JSON
        let json = serde_json::to_string(&req).expect("serialize json");
        let decoded_json: RegisterPreviewAppRequest =
            serde_json::from_str(&json).expect("deserialize json");
        assert_eq!(req, decoded_json);

        // 2. Protobuf
        let mut buf = Vec::new();
        req.encode(&mut buf).expect("encode protobuf");
        let decoded_pb = RegisterPreviewAppRequest::decode(&buf[..]).expect("decode protobuf");
        assert_eq!(req, decoded_pb);
    }
}
