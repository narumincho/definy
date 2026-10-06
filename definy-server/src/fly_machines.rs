use std::collections::HashMap;

use serde::{Deserialize, Serialize};

/// fly.io Machines API の接続設定
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FlyConfig {
    /// fly.io API トークン (FLY_API_TOKEN)
    pub api_token: String,
    /// 対象の fly.io アプリケーション名
    pub app_name: String,
    /// Machines API のベース URL (デフォルト: `https://api.machines.dev/v1`)
    pub api_base_url: String,
}

impl FlyConfig {
    pub const DEFAULT_API_BASE_URL: &'static str = "https://api.machines.dev/v1";

    pub fn new(api_token: impl Into<String>, app_name: impl Into<String>) -> Self {
        Self {
            api_token: api_token.into(),
            app_name: app_name.into(),
            api_base_url: Self::DEFAULT_API_BASE_URL.to_string(),
        }
    }

    pub fn with_base_url(mut self, base_url: impl Into<String>) -> Self {
        self.api_base_url = base_url.into();
        self
    }

    /// 環境変数から設定を読み込む。
    /// - `FLY_API_TOKEN`: 必須
    /// - `FLY_APP_NAME`: 省略時は `"definy"`
    /// - `FLY_MACHINES_API_URL`: 省略時は `https://api.machines.dev/v1`
    pub fn from_env() -> Option<Self> {
        Self::from_env_getter(|key| std::env::var(key))
    }

    /// 任意の環境変数取得関数から設定を読み込む (テスト用)。
    pub fn from_env_getter<F>(mut get_var: F) -> Option<Self>
    where
        F: FnMut(&str) -> Result<String, std::env::VarError>,
    {
        let api_token = get_var("FLY_API_TOKEN").ok()?;
        let app_name = get_var("FLY_APP_NAME").unwrap_or_else(|_| "definy".to_string());
        let api_base_url = get_var("FLY_MACHINES_API_URL")
            .unwrap_or_else(|_| Self::DEFAULT_API_BASE_URL.to_string());
        Some(Self {
            api_token,
            app_name,
            api_base_url,
        })
    }
}

/// fly.io Machine のポート設定
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FlyMachinePort {
    pub port: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub handlers: Option<Vec<String>>,
}

/// fly.io Machine のサービス定義 (ルーティング設定)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FlyMachineService {
    pub protocol: String,
    pub internal_port: u16,
    pub ports: Vec<FlyMachinePort>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub autostop: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub autostart: Option<bool>,
}

/// fly.io Machine のスペック (CPU / メモリ)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct FlyMachineGuest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cpu_kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cpus: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory_mb: Option<u32>,
}

/// fly.io Machine のコンフィグ
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FlyMachineConfig {
    pub image: String,
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub env: HashMap<String, String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub services: Vec<FlyMachineService>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub guest: Option<FlyMachineGuest>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_destroy: Option<bool>,
}

/// マシン作成リクエスト
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreateMachineRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub region: Option<String>,
    pub config: FlyMachineConfig,
}

/// fly.io Machines API から返却されるマシン情報
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FlyMachine {
    pub id: String,
    pub name: String,
    pub state: String,
    #[serde(default)]
    pub region: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instance_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub private_ip: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
    pub config: FlyMachineConfig,
}

/// Machines API 呼び出し時のエラー型
#[derive(Debug)]
pub enum FlyApiError {
    Http(reqwest::Error),
    ApiError {
        status: reqwest::StatusCode,
        message: String,
    },
    Json(serde_json::Error),
}

impl std::fmt::Display for FlyApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Http(err) => write!(f, "fly.io HTTP request failed: {err}"),
            Self::ApiError { status, message } => {
                write!(f, "fly.io API error ({status}): {message}")
            }
            Self::Json(err) => write!(f, "JSON serialization/deserialization failed: {err}"),
        }
    }
}

impl std::error::Error for FlyApiError {}

impl From<reqwest::Error> for FlyApiError {
    fn from(err: reqwest::Error) -> Self {
        Self::Http(err)
    }
}

impl From<serde_json::Error> for FlyApiError {
    fn from(err: serde_json::Error) -> Self {
        Self::Json(err)
    }
}

/// fly.io Machines API クライアント
#[derive(Clone)]
pub struct FlyMachineClient {
    client: reqwest::Client,
    config: FlyConfig,
}

impl FlyMachineClient {
    pub fn new(config: FlyConfig) -> Self {
        Self {
            client: reqwest::Client::new(),
            config,
        }
    }

    pub fn from_env() -> Option<Self> {
        FlyConfig::from_env().map(Self::new)
    }

    pub fn config(&self) -> &FlyConfig {
        &self.config
    }

    /// アプリケーション全体の公開 URL (例: `https://definy.fly.dev`)
    pub fn app_url(&self) -> String {
        format!("https://{}.fly.dev", self.config.app_name)
    }

    /// 対象アプリのマシン一覧を取得する
    pub async fn list_machines(&self) -> Result<Vec<FlyMachine>, FlyApiError> {
        let url = format!(
            "{}/apps/{}/machines",
            self.config.api_base_url, self.config.app_name
        );
        let resp = self
            .client
            .get(&url)
            .bearer_auth(&self.config.api_token)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let message = resp.text().await.unwrap_or_default();
            return Err(FlyApiError::ApiError { status, message });
        }

        let machines = resp.json::<Vec<FlyMachine>>().await?;
        Ok(machines)
    }

    /// マシン詳細を取得する
    pub async fn get_machine(&self, machine_id: &str) -> Result<FlyMachine, FlyApiError> {
        let url = format!(
            "{}/apps/{}/machines/{}",
            self.config.api_base_url, self.config.app_name, machine_id
        );
        let resp = self
            .client
            .get(&url)
            .bearer_auth(&self.config.api_token)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let message = resp.text().await.unwrap_or_default();
            return Err(FlyApiError::ApiError { status, message });
        }

        let machine = resp.json::<FlyMachine>().await?;
        Ok(machine)
    }

    /// 新しいマシンを作成・起動する
    pub async fn create_machine(
        &self,
        req: &CreateMachineRequest,
    ) -> Result<FlyMachine, FlyApiError> {
        let url = format!(
            "{}/apps/{}/machines",
            self.config.api_base_url, self.config.app_name
        );
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
            return Err(FlyApiError::ApiError { status, message });
        }

        let machine = resp.json::<FlyMachine>().await?;
        Ok(machine)
    }

    /// マシンを停止する
    pub async fn stop_machine(&self, machine_id: &str) -> Result<(), FlyApiError> {
        let url = format!(
            "{}/apps/{}/machines/{}/stop",
            self.config.api_base_url, self.config.app_name, machine_id
        );
        let resp = self
            .client
            .post(&url)
            .bearer_auth(&self.config.api_token)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let message = resp.text().await.unwrap_or_default();
            return Err(FlyApiError::ApiError { status, message });
        }

        Ok(())
    }

    /// マシンを破棄する
    pub async fn destroy_machine(&self, machine_id: &str, force: bool) -> Result<(), FlyApiError> {
        let url = format!(
            "{}/apps/{}/machines/{}?force={}",
            self.config.api_base_url, self.config.app_name, machine_id, force
        );
        let resp = self
            .client
            .delete(&url)
            .bearer_auth(&self.config.api_token)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let message = resp.text().await.unwrap_or_default();
            return Err(FlyApiError::ApiError { status, message });
        }

        Ok(())
    }
}

/// definy サーバー用の標準的な Machine コンフィグを生成するヘルパー関数
pub fn create_default_definy_machine_config(
    image: &str,
    env_vars: HashMap<String, String>,
    internal_port: u16,
) -> FlyMachineConfig {
    FlyMachineConfig {
        image: image.to_string(),
        env: env_vars,
        services: vec![FlyMachineService {
            protocol: "tcp".to_string(),
            internal_port,
            ports: vec![
                FlyMachinePort {
                    port: 443,
                    handlers: Some(vec!["tls".to_string(), "http".to_string()]),
                },
                FlyMachinePort {
                    port: 80,
                    handlers: Some(vec!["http".to_string()]),
                },
            ],
            autostop: Some(true),
            autostart: Some(true),
        }],
        guest: Some(FlyMachineGuest {
            cpu_kind: Some("shared".to_string()),
            cpus: Some(1),
            memory_mb: Some(512),
        }),
        auto_destroy: Some(false),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::extract::{Json, Path};
    use axum::http::StatusCode;
    use axum::response::IntoResponse;
    use axum::routing::{get, post};
    use tokio::net::TcpListener;

    #[test]
    fn test_fly_config_from_env() {
        let mock_env = HashMap::from([
            ("FLY_API_TOKEN".to_string(), "test_token_123".to_string()),
            ("FLY_APP_NAME".to_string(), "my-definy-app".to_string()),
        ]);

        let config = FlyConfig::from_env_getter(|k| {
            mock_env
                .get(k)
                .cloned()
                .ok_or(std::env::VarError::NotPresent)
        })
        .expect("Should load config from env getter");

        assert_eq!(config.api_token, "test_token_123");
        assert_eq!(config.app_name, "my-definy-app");
        assert_eq!(config.api_base_url, FlyConfig::DEFAULT_API_BASE_URL);
    }

    #[test]
    fn test_create_default_definy_machine_config() {
        let mut env = HashMap::new();
        env.insert("PORT".to_string(), "8000".to_string());
        let config =
            create_default_definy_machine_config("registry.fly.io/definy:latest", env, 8000);

        assert_eq!(config.image, "registry.fly.io/definy:latest");
        assert_eq!(config.services.len(), 1);
        assert_eq!(config.services[0].internal_port, 8000);
        assert_eq!(config.services[0].ports.len(), 2);
    }

    #[tokio::test]
    async fn test_machines_api_mock_flow() {
        // ローカルにモック Axum サーバーを立てて疎通確認テストを行う
        let app = axum::Router::new()
            .route(
                "/apps/{app}/machines",
                get(|Path(app): Path<String>| async move {
                    assert_eq!(app, "test-app");
                    let sample_machine = FlyMachine {
                        id: "m_12345".to_string(),
                        name: "definy-worker-1".to_string(),
                        state: "started".to_string(),
                        region: "nrt".to_string(),
                        instance_id: Some("inst_abc".to_string()),
                        private_ip: Some("fdaa::1".to_string()),
                        created_at: Some("2026-10-05T00:00:00Z".to_string()),
                        updated_at: Some("2026-10-05T00:00:00Z".to_string()),
                        config: FlyMachineConfig {
                            image: "registry.fly.io/definy:latest".to_string(),
                            env: HashMap::new(),
                            services: vec![],
                            guest: None,
                            auto_destroy: Some(false),
                        },
                    };
                    Json(vec![sample_machine]).into_response()
                })
                .post(
                    |Path(app): Path<String>, Json(body): Json<CreateMachineRequest>| async move {
                        assert_eq!(app, "test-app");
                        let created = FlyMachine {
                            id: "m_new_678".to_string(),
                            name: body.name.unwrap_or_else(|| "auto-name".to_string()),
                            state: "created".to_string(),
                            region: body.region.unwrap_or_else(|| "nrt".to_string()),
                            instance_id: Some("inst_new".to_string()),
                            private_ip: Some("fdaa::2".to_string()),
                            created_at: Some("2026-10-05T01:00:00Z".to_string()),
                            updated_at: Some("2026-10-05T01:00:00Z".to_string()),
                            config: body.config,
                        };
                        (StatusCode::CREATED, Json(created)).into_response()
                    },
                ),
            )
            .route(
                "/apps/{app}/machines/{id}/stop",
                post(|Path((app, id)): Path<(String, String)>| async move {
                    assert_eq!(app, "test-app");
                    assert_eq!(id, "m_12345");
                    StatusCode::OK.into_response()
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
            FlyConfig::new("dummy_token", "test-app").with_base_url(format!("http://{local_addr}"));
        let client = FlyMachineClient::new(config);

        // 1. List machines
        let machines = client
            .list_machines()
            .await
            .expect("list_machines should succeed");
        assert_eq!(machines.len(), 1);
        assert_eq!(machines[0].id, "m_12345");
        assert_eq!(machines[0].state, "started");

        // 2. Create machine
        let req = CreateMachineRequest {
            name: Some("definy-new-instance".to_string()),
            region: Some("nrt".to_string()),
            config: create_default_definy_machine_config(
                "registry.fly.io/definy:latest",
                HashMap::new(),
                8000,
            ),
        };
        let created = client
            .create_machine(&req)
            .await
            .expect("create_machine should succeed");
        assert_eq!(created.id, "m_new_678");
        assert_eq!(created.name, "definy-new-instance");

        // 3. Stop machine
        client
            .stop_machine("m_12345")
            .await
            .expect("stop_machine should succeed");

        // 4. URL format
        assert_eq!(client.app_url(), "https://test-app.fly.dev");
    }

    #[tokio::test]
    #[ignore = "FLY_API_TOKEN が設定されている環境でのみ手動実行するライブテスト: cargo test -- --ignored test_live_fly_machines_api"]
    async fn test_live_fly_machines_api() {
        let client = FlyMachineClient::from_env()
            .expect("FLY_API_TOKEN が設定されていません。環境変数を指定して実行してください。");
        println!("Checking fly.io app: {}", client.config().app_name);
        println!("Public app URL: {}", client.app_url());

        let machines = client
            .list_machines()
            .await
            .expect("Failed to fetch machines from live fly.io Machines API");

        println!("Found {} machines:", machines.len());
        for m in machines {
            println!(
                "  - Machine: id={}, name={}, state={}, region={}",
                m.id, m.name, m.state, m.region
            );
        }
    }
}
