use axum::http::StatusCode;
use base64::Engine;
use serde::{Deserialize, Serialize};

/// Cloudflare Workers REST API v4 の接続設定
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CloudflareWorkersConfig {
    /// Cloudflare API Token (Workers Scripts Write / Read 権限)
    pub api_token: String,
    /// Cloudflare Account ID (省略時は API から自動解決)
    pub account_id: Option<String>,
    /// Cloudflare REST API のベース URL (デフォルト: `https://api.cloudflare.com/client/v4`)
    pub api_base_url: String,
}

impl CloudflareWorkersConfig {
    pub const DEFAULT_API_BASE_URL: &'static str = "https://api.cloudflare.com/client/v4";

    pub fn new(api_token: impl Into<String>) -> Self {
        Self {
            api_token: api_token.into(),
            account_id: None,
            api_base_url: Self::DEFAULT_API_BASE_URL.to_string(),
        }
    }

    pub fn with_account_id(mut self, account_id: impl Into<String>) -> Self {
        self.account_id = Some(account_id.into());
        self
    }

    pub fn with_base_url(mut self, base_url: impl Into<String>) -> Self {
        self.api_base_url = base_url.into();
        self
    }
}

/// Cloudflare Workers エラー型
#[derive(Debug)]
pub enum CloudflareWorkersError {
    ApiError { status: StatusCode, message: String },
    Network(reqwest::Error),
    Json(serde_json::Error),
    InvalidToken,
    InvalidResponse(String),
}

impl std::fmt::Display for CloudflareWorkersError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ApiError { status, message } => {
                write!(
                    f,
                    "Cloudflare Workers API error (status: {status}): {message}"
                )
            }
            Self::Network(err) => write!(f, "Network request failed: {err}"),
            Self::Json(err) => write!(f, "JSON serialization/deserialization failed: {err}"),
            Self::InvalidToken => write!(f, "Invalid token: API token cannot be empty"),
            Self::InvalidResponse(msg) => write!(f, "Invalid API response: {msg}"),
        }
    }
}

impl std::error::Error for CloudflareWorkersError {}

impl From<reqwest::Error> for CloudflareWorkersError {
    fn from(err: reqwest::Error) -> Self {
        Self::Network(err)
    }
}

impl From<serde_json::Error> for CloudflareWorkersError {
    fn from(err: serde_json::Error) -> Self {
        Self::Json(err)
    }
}

/// Cloudflare API の標準ラッパーレスポンス
#[derive(Debug, Clone, Deserialize)]
#[serde(bound(deserialize = "T: Deserialize<'de>"))]
pub struct CloudflareApiResponse<T> {
    pub success: bool,
    #[serde(default)]
    pub errors: Vec<CloudflareApiErrorItem>,
    #[serde(default)]
    pub result: Option<T>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct CloudflareApiErrorItem {
    pub code: i64,
    pub message: String,
}

/// アカウント情報
#[derive(Debug, Clone, Default, Deserialize)]
pub struct CloudflareAccountItem {
    pub id: String,
    pub name: String,
}

/// workers.dev サブドメイン情報
#[derive(Debug, Clone, Default, Deserialize)]
pub struct CloudflareSubdomainItem {
    pub subdomain: String,
}

/// Worker スクリプト概要
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct CloudflareWorkerSummary {
    pub id: String,
    #[serde(default)]
    pub created_on: Option<String>,
    #[serde(default)]
    pub modified_on: Option<String>,
}

/// デプロイ結果
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DeployCloudflareResult {
    pub script_name: String,
    pub status: String,
    pub url: String,
}

/// Cloudflare Workers REST API クライアント
#[derive(Debug, Clone)]
pub struct CloudflareWorkersClient {
    client: reqwest::Client,
    config: CloudflareWorkersConfig,
}

impl CloudflareWorkersClient {
    pub fn new(config: CloudflareWorkersConfig) -> Self {
        Self {
            client: reqwest::Client::new(),
            config,
        }
    }

    pub fn config(&self) -> &CloudflareWorkersConfig {
        &self.config
    }

    fn auth_header_value(&self) -> Result<String, CloudflareWorkersError> {
        let token = self.config.api_token.trim();
        if token.is_empty() {
            return Err(CloudflareWorkersError::InvalidToken);
        }
        Ok(format!("Bearer {token}"))
    }

    /// アカウント ID を解決します。
    /// 設定に account_id が指定されていればそれを返し、なければ `GET /accounts` から自動取得します。
    pub async fn resolve_account_id(&self) -> Result<String, CloudflareWorkersError> {
        if let Some(ref acc_id) = self.config.account_id
            && !acc_id.trim().is_empty()
        {
            return Ok(acc_id.trim().to_string());
        }

        let auth_val = self.auth_header_value()?;
        let url = format!("{}/accounts", self.config.api_base_url);

        let resp = self
            .client
            .get(&url)
            .header("Authorization", auth_val)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(CloudflareWorkersError::ApiError {
                status,
                message: body,
            });
        }

        let parsed: CloudflareApiResponse<Vec<CloudflareAccountItem>> = resp.json().await?;
        if !parsed.success {
            let err_msg = parsed
                .errors
                .iter()
                .map(|e| e.message.clone())
                .collect::<Vec<_>>()
                .join(", ");
            return Err(CloudflareWorkersError::ApiError {
                status,
                message: err_msg,
            });
        }

        let accounts = parsed.result.unwrap_or_default();
        if let Some(first) = accounts.first() {
            Ok(first.id.clone())
        } else {
            Err(CloudflareWorkersError::InvalidResponse(
                "No Cloudflare accounts found for the provided API token".to_string(),
            ))
        }
    }

    /// `workers.dev` のアカウント共通サブドメインを取得します。
    pub async fn get_subdomain(&self, account_id: &str) -> Result<String, CloudflareWorkersError> {
        let auth_val = self.auth_header_value()?;
        let url = format!(
            "{}/accounts/{account_id}/workers/subdomain",
            self.config.api_base_url
        );

        let resp = self
            .client
            .get(&url)
            .header("Authorization", auth_val)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(CloudflareWorkersError::ApiError {
                status,
                message: body,
            });
        }

        let parsed: CloudflareApiResponse<CloudflareSubdomainItem> = resp.json().await?;
        if let Some(res) = parsed.result {
            Ok(res.subdomain)
        } else {
            Err(CloudflareWorkersError::InvalidResponse(
                "Failed to retrieve workers.dev subdomain".to_string(),
            ))
        }
    }

    /// アカウント内の Worker スクリプト一覧を取得します。
    pub async fn list_workers(
        &self,
        account_id: &str,
    ) -> Result<Vec<CloudflareWorkerSummary>, CloudflareWorkersError> {
        let auth_val = self.auth_header_value()?;
        let url = format!(
            "{}/accounts/{account_id}/workers/scripts",
            self.config.api_base_url
        );

        let resp = self
            .client
            .get(&url)
            .header("Authorization", auth_val)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(CloudflareWorkersError::ApiError {
                status,
                message: body,
            });
        }

        let parsed: CloudflareApiResponse<Vec<CloudflareWorkerSummary>> = resp.json().await?;
        if !parsed.success {
            let err_msg = parsed
                .errors
                .iter()
                .map(|e| e.message.clone())
                .collect::<Vec<_>>()
                .join(", ");
            return Err(CloudflareWorkersError::ApiError {
                status,
                message: err_msg,
            });
        }

        Ok(parsed.result.unwrap_or_default())
    }

    /// Worker スクリプトの `workers.dev` サブドメインでのルーティングを有効化します。
    pub async fn enable_subdomain(
        &self,
        account_id: &str,
        script_name: &str,
    ) -> Result<(), CloudflareWorkersError> {
        let auth_val = self.auth_header_value()?;
        let url = format!(
            "{}/accounts/{account_id}/workers/scripts/{script_name}/subdomain",
            self.config.api_base_url
        );

        let body = serde_json::json!({
            "enabled": true
        });

        let resp = self
            .client
            .post(&url)
            .header("Authorization", auth_val)
            .json(&body)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            eprintln!("Warning: failed to enable subdomain for worker '{script_name}': {err_text}");
        }

        Ok(())
    }

    /// Cloudflare Workers にスクリプトをアップロード・デプロイします。
    pub async fn deploy(
        &self,
        script_name: Option<&str>,
        wasm_bytes: Option<&[u8]>,
        custom_script: Option<&str>,
    ) -> Result<DeployCloudflareResult, CloudflareWorkersError> {
        let auth_val = self.auth_header_value()?;
        let account_id = self.resolve_account_id().await?;

        let script_name = match script_name {
            Some(name) if !name.trim().is_empty() => name.trim().to_string(),
            _ => format!("definy-worker-{:08x}", rand::random::<u32>()),
        };

        // 1. スクリプトの準備 (カスタムスクリプトまたはデフォルトの WASM 実行スクリプト)
        let script_content = match custom_script {
            Some(script) if !script.trim().is_empty() => script.to_string(),
            _ => default_cloudflare_worker_script(wasm_bytes),
        };

        // 2. multipart/form-data の構築
        let metadata = serde_json::json!({
            "main_module": "worker.js"
        });

        let metadata_part = reqwest::multipart::Part::text(metadata.to_string())
            .mime_str("application/json")
            .map_err(|e| CloudflareWorkersError::InvalidResponse(e.to_string()))?;

        let script_part = reqwest::multipart::Part::text(script_content)
            .file_name("worker.js")
            .mime_str("application/javascript+module")
            .map_err(|e| CloudflareWorkersError::InvalidResponse(e.to_string()))?;

        let form = reqwest::multipart::Form::new()
            .part("metadata", metadata_part)
            .part("worker.js", script_part);

        // 3. PUT /accounts/{account_id}/workers/scripts/{script_name}
        let url = format!(
            "{}/accounts/{account_id}/workers/scripts/{script_name}",
            self.config.api_base_url
        );

        let resp = self
            .client
            .put(&url)
            .header("Authorization", auth_val)
            .multipart(form)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(CloudflareWorkersError::ApiError {
                status,
                message: body,
            });
        }

        // 4. workers.dev サブドメインのルーティングを有効化
        let _ = self.enable_subdomain(&account_id, &script_name).await;

        // 5. workers.dev サブドメインの取得と公開 URL の生成
        let subdomain = self
            .get_subdomain(&account_id)
            .await
            .unwrap_or_else(|_| "workers.dev".to_string());

        let public_url = if subdomain == "workers.dev" {
            format!("https://{script_name}.workers.dev")
        } else {
            format!("https://{script_name}.{subdomain}.workers.dev")
        };

        Ok(DeployCloudflareResult {
            script_name,
            status: "succeeded".to_string(),
            url: public_url,
        })
    }
}

/// Cloudflare Workers (ES Module) で動作するデフォルトの edge HTTP サーバーコード
pub fn default_cloudflare_worker_script(wasm_bytes: Option<&[u8]>) -> String {
    let wasm_base64 = wasm_bytes
        .map(|bytes| base64::engine::general_purpose::STANDARD.encode(bytes))
        .unwrap_or_default();

    let has_wasm = wasm_bytes.is_some();

    let wasm_load_block = if has_wasm {
        format!(
            r#"
const WASM_BASE64 = "{wasm_base64}";
let wasmInstance = null;
let evalResult = null;

function readDefinyValue(mem, ptr) {{
  if (ptr < 0 || ptr >= mem.length) return null;
  const view = new DataView(mem.buffer, mem.byteOffset, mem.byteLength);
  const tag = mem[ptr];
  if (tag === 0) {{
    // Number (i64 at ptr + 8)
    return Number(view.getBigInt64(ptr + 8, true));
  }}
  if (tag === 1) {{
    // Bool (u8 at ptr + 8)
    return mem[ptr + 8] !== 0;
  }}
  if (tag === 2) {{
    // String (len at ptr + 4, bytes at ptr + 8)
    const len = view.getUint32(ptr + 4, true);
    return new TextDecoder().decode(mem.subarray(ptr + 8, ptr + 8 + len));
  }}
  if (tag === 3) {{
    // List (count at ptr + 4, elem_ptrs at ptr + 8)
    const count = view.getUint32(ptr + 4, true);
    const items = [];
    for (let i = 0; i < count; i++) {{
      const elemPtr = view.getUint32(ptr + 8 + i * 4, true);
      items.push(readDefinyValue(mem, elemPtr));
    }}
    return items;
  }}
  if (tag === 4) {{
    // Record (count at ptr + 4, items at ptr + 8)
    const count = view.getUint32(ptr + 4, true);
    const obj = {{}};
    for (let i = 0; i < count; i++) {{
      const itemBase = ptr + 8 + i * 16;
      const keyPtr = view.getUint32(itemBase, true);
      const valPtr = view.getUint32(itemBase + 8, true);
      const keyStr = readDefinyValue(mem, keyPtr);
      if (typeof keyStr === "string") {{
        obj[keyStr] = readDefinyValue(mem, valPtr);
      }}
    }}
    return obj;
  }}
  if (tag === 5) {{
    // Variant (tag at ptr + 8, payload at ptr + 16)
    const tagPtr = view.getUint32(ptr + 8, true);
    const payloadPtr = view.getUint32(ptr + 16, true);
    const tagName = readDefinyValue(mem, tagPtr);
    const payloadVal = payloadPtr !== 0 ? readDefinyValue(mem, payloadPtr) : null;
    return {{ tag: tagName, payload: payloadVal }};
  }}
  return null;
}}

async function initWasm() {{
  if (wasmInstance) return;
  try {{
    const binaryString = atob(WASM_BASE64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {{
      bytes[i] = binaryString.charCodeAt(i);
    }}
    const wasmModule = await WebAssembly.instantiate(bytes, {{
      env: {{
        print: (v) => console.log("wasm log:", v),
      }}
    }});
    wasmInstance = wasmModule.instance;
    const exports = wasmInstance.exports;
    if (typeof exports.main === "function") {{
      const rawRes = exports.main();
      if (exports.memory) {{
        const mem = new Uint8Array(exports.memory.buffer);
        evalResult = readDefinyValue(mem, rawRes) ?? rawRes;
      }} else {{
        evalResult = rawRes;
      }}
    }}
  }} catch (e) {{
    console.error("Wasm initialization error:", e);
    evalResult = String(e);
  }}
}}
"#
        )
    } else {
        r#"
let evalResult = null;
async function initWasm() {}
"#
        .to_string()
    };

    format!(
        r#"{wasm_load_block}

export default {{
  async fetch(request, env, ctx) {{
    await initWasm();

    const url = new URL(request.url);

    if (url.pathname === "/healthz") {{
      return new Response("OK", {{
        status: 200,
        headers: {{ "content-type": "text/plain" }}
      }});
    }}

    return new Response(JSON.stringify({{
      service: "definy-cloudflare-workers",
      message: "Hello from Definy on Cloudflare Workers!",
      evaluatedResult: evalResult,
      pathname: url.pathname,
      timestamp: new Date().toISOString()
    }}, null, 2), {{
      status: 200,
      headers: {{
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      }}
    }});
  }}
}};
"#
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cloudflare_config_defaults() {
        let config = CloudflareWorkersConfig::new("test_token_123");
        assert_eq!(config.api_token, "test_token_123");
        assert_eq!(
            config.api_base_url,
            CloudflareWorkersConfig::DEFAULT_API_BASE_URL
        );
        assert_eq!(config.account_id, None);

        let custom = config
            .with_account_id("my_account")
            .with_base_url("https://custom.api");
        assert_eq!(custom.account_id.as_deref(), Some("my_account"));
        assert_eq!(custom.api_base_url, "https://custom.api");
    }

    #[test]
    fn test_default_worker_script_generation() {
        let script_no_wasm = default_cloudflare_worker_script(None);
        assert!(script_no_wasm.contains("export default"));
        assert!(script_no_wasm.contains("async fetch"));
        assert!(!script_no_wasm.contains("WASM_BASE64"));

        let sample_wasm = b"\x00asm\x01\x00\x00\x00";
        let script_with_wasm = default_cloudflare_worker_script(Some(sample_wasm));
        assert!(script_with_wasm.contains("export default"));
        assert!(script_with_wasm.contains("WASM_BASE64"));
        assert!(script_with_wasm.contains("WebAssembly.instantiate"));
    }

    #[tokio::test]
    async fn test_mock_resolve_account_id_and_list_workers() {
        use axum::Json;
        use axum::routing::get;
        use serde_json::json;

        let app = axum::Router::new()
            .route(
                "/accounts",
                get(|| async {
                    Json(json!({
                        "success": true,
                        "errors": [],
                        "result": [
                            {
                                "id": "acc-123",
                                "name": "My Cloudflare Account"
                            }
                        ]
                    }))
                }),
            )
            .route(
                "/accounts/acc-123/workers/scripts",
                get(|| async {
                    Json(json!({
                        "success": true,
                        "errors": [],
                        "result": [
                            {
                                "id": "worker-demo",
                                "created_on": "2026-10-09T00:00:00Z",
                                "modified_on": "2026-10-10T00:00:00Z"
                            }
                        ]
                    }))
                }),
            );

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        let base_url = format!("http://127.0.0.1:{port}");
        let config = CloudflareWorkersConfig::new("valid_token").with_base_url(&base_url);
        let client = CloudflareWorkersClient::new(config);

        let account_id = client.resolve_account_id().await.unwrap();
        assert_eq!(account_id, "acc-123");

        let workers = client.list_workers(&account_id).await.unwrap();
        assert_eq!(workers.len(), 1);
        assert_eq!(workers[0].id, "worker-demo");
    }
}
