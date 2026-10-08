use std::collections::HashMap;

use axum::http::StatusCode;
use base64::Engine;
use serde::{Deserialize, Serialize};

/// Deno Deploy REST API v2 の接続設定
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DenoDeployConfig {
    /// Deno Deploy Organization または Personal Access Token
    pub api_token: String,
    /// Deno Deploy REST API のベース URL (デフォルト: `https://api.deno.com/v2`)
    pub api_base_url: String,
}

impl DenoDeployConfig {
    pub const DEFAULT_API_BASE_URL: &'static str = "https://api.deno.com/v2";

    pub fn new(api_token: impl Into<String>) -> Self {
        Self {
            api_token: api_token.into(),
            api_base_url: Self::DEFAULT_API_BASE_URL.to_string(),
        }
    }

    pub fn with_base_url(mut self, base_url: impl Into<String>) -> Self {
        self.api_base_url = base_url.into();
        self
    }
}

/// Deno Deploy エラー型
#[derive(Debug)]
pub enum DenoDeployError {
    ApiError { status: StatusCode, message: String },
    Network(reqwest::Error),
    Json(serde_json::Error),
    InvalidToken,
    InvalidResponse(String),
}

impl std::fmt::Display for DenoDeployError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ApiError { status, message } => {
                write!(f, "Deno Deploy API error (status: {status}): {message}")
            }
            Self::Network(err) => write!(f, "Network request failed: {err}"),
            Self::Json(err) => write!(f, "JSON serialization/deserialization failed: {err}"),
            Self::InvalidToken => write!(f, "Invalid token: token cannot be empty"),
            Self::InvalidResponse(msg) => write!(f, "Invalid API response: {msg}"),
        }
    }
}

impl std::error::Error for DenoDeployError {}

impl From<reqwest::Error> for DenoDeployError {
    fn from(err: reqwest::Error) -> Self {
        Self::Network(err)
    }
}

impl From<serde_json::Error> for DenoDeployError {
    fn from(err: serde_json::Error) -> Self {
        Self::Json(err)
    }
}

/// Deno Deploy のアセット定義 (ファイルまたはシンボリックリンク)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum DenoAsset {
    #[serde(rename = "file")]
    File { encoding: String, content: String },
    #[serde(rename = "symlink")]
    Symlink { target: String },
}

impl DenoAsset {
    pub fn utf8_file(content: impl Into<String>) -> Self {
        Self::File {
            encoding: "utf-8".to_string(),
            content: content.into(),
        }
    }

    pub fn base64_file(bytes: &[u8]) -> Self {
        Self::File {
            encoding: "base64".to_string(),
            content: base64::engine::general_purpose::STANDARD.encode(bytes),
        }
    }
}

/// ランタイム設定
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DenoRuntimeConfig {
    pub r#type: String,
    pub entrypoint: String,
}

/// リビジョンコンフィグ
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct DenoRevisionConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub runtime: Option<DenoRuntimeConfig>,
}

/// POST /v2/apps リクエスト
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct CreateAppRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub slug: Option<String>,
}

/// Deno Deploy アプリ情報
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DenoApp {
    pub id: String,
    pub slug: String,
}

/// POST /v2/apps/{app}/deploy リクエスト
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreateRevisionRequest {
    pub assets: HashMap<String, DenoAsset>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub config: Option<DenoRevisionConfig>,
}

/// タイムラインのホスト名情報
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DenoRevisionTimeline {
    pub name: String,
    pub context: String,
    pub hostnames: Vec<String>,
}

/// POST /v2/apps/{app}/deploy レスポンス (Revision)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DenoRevision {
    pub id: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failure_reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timelines: Option<Vec<DenoRevisionTimeline>>,
}

/// デプロイの完了結果
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DenoDeployResult {
    pub app_id: String,
    pub app_slug: String,
    pub revision_id: String,
    pub status: String,
    pub url: String,
    pub hostnames: Vec<String>,
}

/// Deno Deploy REST API v2 クライアント
#[derive(Clone)]
pub struct DenoDeployClient {
    client: reqwest::Client,
    config: DenoDeployConfig,
}

impl DenoDeployClient {
    pub fn new(config: DenoDeployConfig) -> Self {
        Self {
            client: reqwest::Client::new(),
            config,
        }
    }

    pub fn with_token(token: impl Into<String>) -> Self {
        Self::new(DenoDeployConfig::new(token))
    }

    pub fn config(&self) -> &DenoDeployConfig {
        &self.config
    }

    /// アプリ情報を取得する (GET /v2/apps/{app})
    pub async fn get_app(&self, app_id_or_slug: &str) -> Result<DenoApp, DenoDeployError> {
        let url = format!("{}/apps/{}", self.config.api_base_url, app_id_or_slug);
        let resp = self
            .client
            .get(&url)
            .bearer_auth(&self.config.api_token)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let message = resp.text().await.unwrap_or_default();
            return Err(DenoDeployError::ApiError { status, message });
        }

        let app = resp.json::<DenoApp>().await?;
        Ok(app)
    }

    /// アプリを作成する (POST /v2/apps)
    pub async fn create_app(&self, slug: Option<&str>) -> Result<DenoApp, DenoDeployError> {
        let url = format!("{}/apps", self.config.api_base_url);
        let req = CreateAppRequest {
            slug: slug.map(String::from),
        };

        let resp = self
            .client
            .post(&url)
            .bearer_auth(&self.config.api_token)
            .json(&req)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let message = resp.text().await.unwrap_or_default();
            return Err(DenoDeployError::ApiError { status, message });
        }

        let app = resp.json::<DenoApp>().await?;
        Ok(app)
    }

    /// アプリを取得するか、存在しなければ新規作成する
    pub async fn create_or_get_app(&self, slug: Option<&str>) -> Result<DenoApp, DenoDeployError> {
        if let Some(target_slug) = slug {
            let trimmed = target_slug.trim();
            if !trimmed.is_empty() {
                // まず既存アプリの取得を試行
                match self.get_app(trimmed).await {
                    Ok(app) => return Ok(app),
                    Err(DenoDeployError::ApiError { status, .. })
                        if status == StatusCode::NOT_FOUND =>
                    {
                        // 存在しない場合は作成へ進む
                    }
                    Err(e) => return Err(e),
                }

                // 新規作成を試行
                match self.create_app(Some(trimmed)).await {
                    Ok(app) => return Ok(app),
                    Err(DenoDeployError::ApiError { status, .. })
                        if status == StatusCode::CONFLICT =>
                    {
                        // すでに作成済みの場合は再取得
                        return self.get_app(trimmed).await;
                    }
                    Err(e) => return Err(e),
                }
            }
        }

        // slug 指定なし、または空文字の場合は自動生成 slug で作成
        self.create_app(None).await
    }

    /// リビジョン (デプロイ) を作成する (POST /v2/apps/{app}/deploy)
    pub async fn deploy_revision(
        &self,
        app: &str,
        req: &CreateRevisionRequest,
    ) -> Result<DenoRevision, DenoDeployError> {
        let url = format!("{}/apps/{}/deploy", self.config.api_base_url, app);
        let resp = self
            .client
            .post(&url)
            .bearer_auth(&self.config.api_token)
            .json(req)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let message = resp.text().await.unwrap_or_default();
            return Err(DenoDeployError::ApiError { status, message });
        }

        let revision = resp.json::<DenoRevision>().await?;
        Ok(revision)
    }

    /// リビジョン情報を取得する (GET /v2/revisions/{revision})
    pub async fn get_revision(&self, revision_id: &str) -> Result<DenoRevision, DenoDeployError> {
        let url = format!("{}/revisions/{}", self.config.api_base_url, revision_id);
        let resp = self
            .client
            .get(&url)
            .bearer_auth(&self.config.api_token)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let message = resp.text().await.unwrap_or_default();
            return Err(DenoDeployError::ApiError { status, message });
        }

        let revision = resp.json::<DenoRevision>().await?;
        Ok(revision)
    }

    /// definy の標準アセット一式を構築し、Deno Deploy へデプロイする
    pub async fn deploy(
        &self,
        app_slug: Option<&str>,
        wasm_bytes: Option<&[u8]>,
        custom_script: Option<&str>,
    ) -> Result<DenoDeployResult, DenoDeployError> {
        if self.config.api_token.trim().is_empty() {
            return Err(DenoDeployError::InvalidToken);
        }

        // 1. App の確保
        let app = self.create_or_get_app(app_slug).await?;

        // 2. assets の構築
        let mut assets = HashMap::new();

        // main.ts (TypeScript エントリポイント)
        let main_ts = match custom_script {
            Some(script) if !script.trim().is_empty() => script.to_string(),
            _ => default_deno_serve_script(wasm_bytes.is_some()),
        };
        assets.insert("main.ts".to_string(), DenoAsset::utf8_file(main_ts));

        // deno.json
        assets.insert(
            "deno.json".to_string(),
            DenoAsset::utf8_file("{\n  \"imports\": {}\n}\n"),
        );

        // app.wasm (Wasm バイナリが存在する場合)
        if let Some(bytes) = wasm_bytes {
            assets.insert("app.wasm".to_string(), DenoAsset::base64_file(bytes));
        }

        // 3. リビジョンの作成
        let deploy_req = CreateRevisionRequest {
            assets,
            config: Some(DenoRevisionConfig {
                runtime: Some(DenoRuntimeConfig {
                    r#type: "dynamic".to_string(),
                    entrypoint: "main.ts".to_string(),
                }),
            }),
        };

        let mut revision = self.deploy_revision(&app.id, &deploy_req).await?;

        // 4. hostnames が確定するまで最大 5 秒間ポーリング
        for _ in 0..10 {
            let has_hostnames = revision
                .timelines
                .as_ref()
                .map(|tl| tl.iter().any(|t| !t.hostnames.is_empty()))
                .unwrap_or(false);

            if has_hostnames || revision.status == "failed" {
                break;
            }

            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            if let Ok(updated) = self.get_revision(&revision.id).await {
                revision = updated;
            }
        }

        // 5. URL および hostnames の導出
        let mut hostnames = Vec::new();
        if let Some(ref timelines) = revision.timelines {
            for timeline in timelines {
                for hostname in &timeline.hostnames {
                    if !hostnames.contains(hostname) {
                        hostnames.push(hostname.clone());
                    }
                }
            }
        }

        let primary_url = if let Some(first_host) = hostnames.first() {
            format!("https://{first_host}")
        } else {
            format!("https://{}.deno.net", app.slug)
        };

        Ok(DenoDeployResult {
            app_id: app.id,
            app_slug: app.slug,
            revision_id: revision.id,
            status: revision.status,
            url: primary_url,
            hostnames,
        })
    }
}

/// Deno Deploy で動作するデフォルトの edge HTTP サーバーコード
pub fn default_deno_serve_script(has_wasm: bool) -> String {
    let wasm_load_block = if has_wasm {
        r#"
let wasmInstance: WebAssembly.Instance | null = null;
try {
  const wasmUrl = new URL("./app.wasm", import.meta.url);
  const wasmBytes = await Deno.readFile(wasmUrl);
  const wasmModule = await WebAssembly.compile(wasmBytes);
  wasmInstance = await WebAssembly.instantiate(wasmModule, {});
  console.log("Wasm binary loaded and instantiated successfully.");
} catch (err) {
  console.warn("Wasm load notice:", err);
}
"#
    } else {
        r#"
const wasmInstance: WebAssembly.Instance | null = null;
"#
    };

    format!(
        r#"// definy edge runtime on Deno Deploy
// Bootstrapped deterministically via definy Deno Deploy REST API v2
{wasm_load_block}
Deno.serve((req: Request) => {{
  const url = new URL(req.url);

  if (url.pathname === "/healthz") {{
    return new Response("ok", {{
      status: 200,
      headers: {{ "Content-Type": "text/plain; charset=utf-8" }},
    }});
  }}

  if (url.pathname === "/api/info") {{
    return Response.json({{
      service: "definy",
      runtime: "deno-deploy",
      wasmLoaded: Boolean(wasmInstance),
      timestamp: new Date().toISOString(),
      url: req.url,
    }});
  }}

  const wasmBadge = wasmInstance
    ? `<span style="color:#4ade80;font-weight:600">Active (Injected & Ready)</span>`
    : `<span style="color:#38bdf8;font-weight:600">Pure Edge Handler</span>`;

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>definy Edge (Deno Deploy)</title>
  <style>
    :root {{
      --bg: #0b0f19;
      --card-bg: rgba(30, 41, 59, 0.85);
      --border: rgba(255, 255, 255, 0.12);
      --primary: #38bdf8;
      --text: #f8fafc;
      --subtext: #94a3b8;
    }}
    body {{
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 1.5rem;
    }}
    .card {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 1.25rem;
      padding: 2.5rem 2rem;
      max-width: 520px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      backdrop-filter: blur(16px);
    }}
    .badge {{
      display: inline-block;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 0.3rem 0.8rem;
      border-radius: 9999px;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.35);
      color: var(--primary);
      margin-bottom: 1.2rem;
    }}
    h1 {{
      margin: 0 0 0.8rem 0;
      font-size: 1.85rem;
      font-weight: 800;
      background: linear-gradient(135deg, #fff 40%, var(--primary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }}
    p {{
      color: var(--subtext);
      line-height: 1.6;
      margin: 0 0 1.5rem 0;
      font-size: 0.95rem;
    }}
    .status-row {{
      display: flex;
      justify-content: space-between;
      padding: 0.6rem 0.8rem;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.85rem;
    }}
    .status-label {{ color: var(--subtext); }}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Deno Deploy Edge Instance</div>
    <h1>🚀 definy Edge Instance</h1>
    <p>This definy instance was deployed deterministically via Deno Deploy REST API v2 without container or OS overhead.</p>
    <div class="status-row">
      <span class="status-label">Runtime Engine</span>
      <span style="font-weight:600;color:#38bdf8">Deno Deploy V8 Isolate</span>
    </div>
    <div class="status-row">
      <span class="status-label">Wasm Capability</span>
      <span>${{wasmBadge}}</span>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {{
    status: 200,
    headers: {{ "Content-Type": "text/html; charset=utf-8" }},
  }});
}});
"#
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::Router;
    use axum::extract::{Json, Path};
    use axum::response::IntoResponse;
    use axum::routing::{get, post};
    use tokio::net::TcpListener;

    #[tokio::test]
    async fn test_deno_deploy_mock_server() {
        let app = Router::new()
            .route(
                "/apps/{app}",
                get(|Path(app): Path<String>| async move {
                    if app == "existing-app" {
                        axum::Json(DenoApp {
                            id: "app-id-123".to_string(),
                            slug: "existing-app".to_string(),
                        })
                        .into_response()
                    } else {
                        StatusCode::NOT_FOUND.into_response()
                    }
                }),
            )
            .route(
                "/apps",
                post(|Json(req): Json<CreateAppRequest>| async move {
                    let slug = req.slug.unwrap_or_else(|| "random-app-slug".to_string());
                    axum::Json(DenoApp {
                        id: "app-id-new".to_string(),
                        slug,
                    })
                }),
            )
            .route(
                "/apps/{app}/deploy",
                post(
                    |Path(app): Path<String>, Json(req): Json<CreateRevisionRequest>| async move {
                        assert!(req.assets.contains_key("main.ts"));
                        assert!(req.assets.contains_key("deno.json"));
                        assert_eq!(app, "app-id-123");

                        axum::Json(DenoRevision {
                            id: "rev-abc".to_string(),
                            status: "succeeded".to_string(),
                            failure_reason: None,
                            timelines: Some(vec![DenoRevisionTimeline {
                                name: "Production".to_string(),
                                context: "production".to_string(),
                                hostnames: vec!["existing-app-123.deno.net".to_string()],
                            }]),
                        })
                    },
                ),
            )
            .route(
                "/revisions/{revision}",
                get(|Path(revision): Path<String>| async move {
                    axum::Json(DenoRevision {
                        id: revision,
                        status: "succeeded".to_string(),
                        failure_reason: None,
                        timelines: Some(vec![DenoRevisionTimeline {
                            name: "Production".to_string(),
                            context: "production".to_string(),
                            hostnames: vec!["existing-app-123.deno.net".to_string()],
                        }]),
                    })
                }),
            );

        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .expect("Failed to bind ephemeral port");
        let local_addr = listener.local_addr().unwrap();

        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        let config =
            DenoDeployConfig::new("dummy_org_token").with_base_url(format!("http://{local_addr}"));
        let client = DenoDeployClient::new(config);

        // 1. Existing App deploy
        let result = client
            .deploy(Some("existing-app"), None, None)
            .await
            .expect("Deploy should succeed");

        assert_eq!(result.app_id, "app-id-123");
        assert_eq!(result.app_slug, "existing-app");
        assert_eq!(result.revision_id, "rev-abc");
        assert_eq!(result.status, "succeeded");
        assert_eq!(result.url, "https://existing-app-123.deno.net");
        assert_eq!(result.hostnames, vec!["existing-app-123.deno.net"]);
    }

    #[tokio::test]
    async fn test_empty_token_returns_error() {
        let client = DenoDeployClient::with_token("");
        let err = client.deploy(None, None, None).await.unwrap_err();
        match err {
            DenoDeployError::InvalidToken => {}
            other => panic!("Expected InvalidToken error, got: {:?}", other),
        }
    }
}
