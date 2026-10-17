//! Connect-RPC デプロイサービス (`DeployService`) のハンドラー実装。
//! Cloudflare Workers REST API v4 を用いたエッジインスタンスへの動的配備を担当します。

use axum::body::Bytes;
use axum::extract::State;
use axum::http::HeaderMap;
use axum::response::Response;
use definy_event::rpc::*;

use crate::AppState;
use crate::connect_rpc::{
    ContentCodec, decode_request, encode_response_or_error, error_to_response,
};

#[utoipa::path(
    post,
    path = "/definy.v1.DeployService/ListDeployments",
    tag = "connect-rpc",
    request_body(
        content = ListDeploymentsRequest,
        content_type = "application/json",
        description = "Connect-RPC ListDeployments request payload"
    ),
    responses(
        (status = 200, description = "Connect-RPC ListDeployments response", body = ListDeploymentsResponse, content_type = "application/json"),
        (status = 503, description = "Database Unavailable", body = ConnectError, content_type = "application/json")
    )
)]
pub async fn handle_list_deployments(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: ListDeploymentsRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    let db = match crate::ensure_db(&state).await {
        Some(db) => db,
        None => {
            let msg = if *state.db_init_status.read().await == crate::DbInitStatus::Initializing {
                "Database is initializing"
            } else {
                "Database is unavailable"
            };
            return error_to_response(ConnectError::unavailable(msg));
        }
    };

    let records = match crate::db::get_deployments(&db, req.limit.map(|v| v as usize)).await {
        Ok(recs) => recs,
        Err(e) => {
            eprintln!("Failed to get deployments from DB: {:?}", e);
            return error_to_response(ConnectError::internal("Failed to retrieve deployments"));
        }
    };

    let items = records
        .into_iter()
        .map(|r| DeploymentItem {
            machine_id: r.machine_id,
            commit_hash: r.commit_hash,
            status: r.status,
            url: r.url,
            app_url: r.app_url,
            region: r.region,
            created_at_rfc3339: r.created_at.to_rfc3339(),
            wasm_hash: r.wasm_hash,
            provider: r.provider,
        })
        .collect();

    let response = ListDeploymentsResponse { deployments: items };
    encode_response_or_error(codec, &response)
}

#[utoipa::path(
    post,
    path = "/definy.v1.DeployService/DeployCloudflare",
    tag = "connect-rpc",
    request_body(
        content = DeployCloudflareRequest,
        content_type = "application/json",
        description = "Connect-RPC DeployCloudflare request payload"
    ),
    responses(
        (status = 200, description = "Connect-RPC DeployCloudflare response", body = DeployCloudflareResponse, content_type = "application/json"),
        (status = 400, description = "Bad Request", body = ConnectError, content_type = "application/json"),
        (status = 500, description = "Internal Server Error", body = ConnectError, content_type = "application/json")
    )
)]
pub async fn handle_deploy_cloudflare(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: DeployCloudflareRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    // part_id が指定されている場合、あらかじめ式を探索して definy:deploy 設定を解決
    let mut resolved_part_expr = None;
    let mut detected_deploy = None;
    // パーツの式が参照するパーツをコンパイラが探すためのイベント (古い順)
    let mut part_events = Vec::new();
    if let Some(ref part_id) = req.part_id {
        let db = crate::ensure_db(&state).await;
        let event_binaries = if let Some(db) = db {
            crate::db::get_events(&db, None, Some(1000), Some(0))
                .await
                .unwrap_or_default()
        } else {
            Box::new([])
        };
        part_events = event_binaries
            .iter()
            .rev()
            .map(|bytes| {
                (
                    definy_event::EventHashId::from_bytes(bytes),
                    definy_event::verify_and_deserialize(bytes),
                )
            })
            .collect::<Vec<_>>();

        if let Ok(expr) = crate::self_hosted_wasm_compiler::find_part_expression_in_signed_events(
            part_id,
            &event_binaries,
        ) {
            detected_deploy = definy_core::detect_deploy_in_expression(&expr);
            resolved_part_expr = Some(expr);
        }
    }

    let token = match resolve_deploy_token(&req.api_token, detected_deploy.as_ref()) {
        Ok(t) => t,
        Err(err) => return error_to_response(err),
    };

    let mut config = crate::cloudflare_workers::CloudflareWorkersConfig::new(token);
    if let Some(ref acc_id) = req.account_id
        && !acc_id.trim().is_empty()
    {
        config = config.with_account_id(acc_id.trim());
    }
    if let Ok(base_url) = std::env::var("CLOUDFLARE_API_URL")
        && !base_url.trim().is_empty()
    {
        config = config.with_base_url(base_url.trim());
    }

    let client = crate::cloudflare_workers::CloudflareWorkersClient::new(config);

    // 自己記述コンパイラ (core.compile-to-wasm) によるオンデマンド Wasm 生成、
    // または指定された wasm_hash からバイナリを取得
    let (wasm_bytes, evaluated_result) = if let Some(ref part_id) = req.part_id {
        // 1. 指定された definy パーツ (Part) の式を自己記述コンパイラでオンデマンドコンパイル
        let target_expr = match resolve_deploy_target_expression(
            part_id,
            detected_deploy.as_ref(),
            resolved_part_expr.as_ref(),
        ) {
            Ok(expr) => expr,
            Err(err) => return error_to_response(err),
        };

        match crate::self_hosted_wasm_compiler::compile_expression_to_wasm(
            &target_expr,
            &part_events,
        ) {
            Ok(bytes) => {
                let eval_val = crate::self_hosted_wasm_compiler::evaluate_compiled_wasm(&bytes)
                    .ok()
                    .map(|val| match val {
                        definy_core::expression_eval::Value::String(s) => s,
                        other => other.to_string(),
                    });
                (Some(bytes), eval_val)
            }
            Err(err) => {
                return error_to_response(ConnectError::internal(format!(
                    "Failed to compile part '{part_id}' to Wasm: {err}"
                )));
            }
        }
    } else if req.compile_self_hosted.unwrap_or(false) {
        match crate::self_hosted_wasm_compiler::compile_sample_to_wasm() {
            Ok(bytes) => {
                let eval_val = crate::self_hosted_wasm_compiler::execute_compiled_wasm(&bytes)
                    .ok()
                    .map(|v| v.to_string());
                (Some(bytes), eval_val)
            }
            Err(err) => {
                return error_to_response(ConnectError::internal(format!(
                    "Self-hosted compilation to Wasm failed: {err}"
                )));
            }
        }
    } else if let Some(ref wasm_hash) = req.wasm_hash {
        // 1. VirtualFileStore から検索
        let bytes = {
            let store = state.virtual_file_store.read().await;
            store.get_wasm(wasm_hash)
        };

        // 2. DB (ContentStore) からフォールバック検索
        let bytes = match bytes {
            Some(b) => Some(b),
            None => {
                if let Some(db) = crate::ensure_db(&state).await {
                    crate::db::get_content(&db, wasm_hash).await.ok().flatten()
                } else {
                    None
                }
            }
        };

        // 3. resolve_client_wasm からフォールバック検索
        let resolved = match bytes {
            Some(b) => Some(b),
            None => {
                if let Some(client_wasm) = crate::resolve_client_wasm() {
                    if wasm_hash == &client_wasm.hash
                        || wasm_hash == "definy_client_bg"
                        || wasm_hash == "definy_client"
                    {
                        Some(client_wasm.bytes)
                    } else {
                        None
                    }
                } else {
                    None
                }
            }
        };
        (resolved, None)
    } else {
        (None, None)
    };

    let target_script_name = if let Some(ref name) = req.script_name
        && !name.trim().is_empty()
    {
        Some(name.trim())
    } else if let Some(ref dep) = detected_deploy
        && !dep.cloudflare_worker_name.trim().is_empty()
    {
        Some(dep.cloudflare_worker_name.as_str())
    } else {
        None
    };

    match client
        .deploy(
            target_script_name,
            wasm_bytes.as_deref(),
            req.custom_script.as_deref(),
        )
        .await
    {
        Ok(result) => {
            // デプロイ直後の健全性確認 (Health Check Ping)
            let (health_status, latency_ms, health_msg) =
                if req.skip_health_check.unwrap_or(false) || result.url.is_empty() {
                    (None, None, None)
                } else {
                    ping_deployed_worker(&result.url).await
                };

            let record_status = if let Some(ref msg) = health_msg {
                format!("{} (Health: {msg})", result.status)
            } else {
                result.status.clone()
            };

            if let Some(db) = crate::ensure_db(&state).await {
                let deployment_record = crate::db::DeploymentRecord {
                    machine_id: format!("cf:{}", result.script_name),
                    commit_hash: None,
                    status: record_status,
                    url: result.url.clone(),
                    app_url: result.url.clone(),
                    region: "global-edge".to_string(),
                    created_at: chrono::Utc::now(),
                    wasm_hash: req.wasm_hash.clone(),
                    provider: Some("cloudflare_workers".to_string()),
                };
                if let Err(e) = crate::db::save_deployment(&db, deployment_record).await {
                    eprintln!(
                        "Failed to save Cloudflare Workers deployment to DB: {:?}",
                        e
                    );
                }
            }

            let response = DeployCloudflareResponse {
                script_name: result.script_name,
                status: result.status,
                url: result.url,
                evaluated_result,
                health_check_status: health_status,
                health_check_latency_ms: latency_ms,
                health_check_message: health_msg,
            };
            encode_response_or_error(codec, &response)
        }
        Err(err) => {
            eprintln!("Failed to deploy to Cloudflare Workers: {:?}", err);
            error_to_response(ConnectError::internal(format!(
                "Cloudflare Workers deploy failed: {err}"
            )))
        }
    }
}

#[utoipa::path(
    post,
    path = "/definy.v1.DeployService/ListCloudflareWorkers",
    tag = "connect-rpc",
    request_body(
        content = ListCloudflareWorkersRequest,
        content_type = "application/json",
        description = "Connect-RPC ListCloudflareWorkers request payload"
    ),
    responses(
        (status = 200, description = "Connect-RPC ListCloudflareWorkers response", body = ListCloudflareWorkersResponse, content_type = "application/json"),
        (status = 400, description = "Bad Request", body = ConnectError, content_type = "application/json"),
        (status = 401, description = "Unauthorized", body = ConnectError, content_type = "application/json")
    )
)]
pub async fn handle_list_cloudflare_workers(headers: HeaderMap, body: Bytes) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: ListCloudflareWorkersRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    let token = if !req.api_token.trim().is_empty() {
        req.api_token.trim().to_string()
    } else if let Ok(env_token) =
        std::env::var("CLOUDFLARE_API_TOKEN").or_else(|_| std::env::var("CF_API_TOKEN"))
    {
        env_token.trim().to_string()
    } else {
        return error_to_response(ConnectError::invalid_argument(
            "Cloudflare API token (api_token) is required",
        ));
    };

    if token.is_empty() {
        return error_to_response(ConnectError::invalid_argument(
            "Cloudflare API token cannot be empty",
        ));
    }

    let mut config = crate::cloudflare_workers::CloudflareWorkersConfig::new(token);
    if let Some(ref acc_id) = req.account_id
        && !acc_id.trim().is_empty()
    {
        config = config.with_account_id(acc_id.trim());
    }
    if let Ok(base_url) = std::env::var("CLOUDFLARE_API_URL")
        && !base_url.trim().is_empty()
    {
        config = config.with_base_url(base_url.trim());
    }

    let client = crate::cloudflare_workers::CloudflareWorkersClient::new(config);

    let account_id = match client.resolve_account_id().await {
        Ok(id) => id,
        Err(err) => {
            eprintln!("Failed to resolve Cloudflare account ID: {:?}", err);
            return error_to_response(ConnectError::internal(format!(
                "Failed to resolve Cloudflare account ID: {err}"
            )));
        }
    };

    match client.list_workers(&account_id).await {
        Ok(workers) => {
            let response = ListCloudflareWorkersResponse {
                workers: workers
                    .into_iter()
                    .map(|w| CloudflareWorkerItem {
                        id: w.id,
                        created_on: w.created_on,
                        modified_on: w.modified_on,
                    })
                    .collect(),
            };
            encode_response_or_error(codec, &response)
        }
        Err(crate::cloudflare_workers::CloudflareWorkersError::ApiError { status, message })
            if status == axum::http::StatusCode::UNAUTHORIZED =>
        {
            error_to_response(ConnectError::unauthenticated(format!(
                "Invalid Cloudflare API token: {message}"
            )))
        }
        Err(err) => {
            eprintln!("Failed to list Cloudflare Workers: {:?}", err);
            error_to_response(ConnectError::internal(format!(
                "Failed to list Cloudflare Workers: {err}"
            )))
        }
    }
}

/// デプロイリクエスト、パーツ設定、環境変数から Cloudflare API トークンを解決します
fn resolve_deploy_token(
    req_token: &str,
    detected_deploy: Option<&definy_core::deploy_detector::DetectedDeploy>,
) -> Result<String, ConnectError> {
    if !req_token.trim().is_empty() {
        return Ok(req_token.trim().to_string());
    }

    if let Some(dep) = detected_deploy
        && let Some(ref t) = dep.cloudflare_token
        && !t.trim().is_empty()
    {
        return Ok(t.trim().to_string());
    }

    if let Ok(env_token) =
        std::env::var("CLOUDFLARE_API_TOKEN").or_else(|_| std::env::var("CF_API_TOKEN"))
        && !env_token.trim().is_empty()
    {
        return Ok(env_token.trim().to_string());
    }

    Err(ConnectError::invalid_argument(
        "Cloudflare API token (api_token or cloudflareToken in deploy part) is required",
    ))
}

/// デプロイ対象パーツから Wasm コンパイル対象のハンドラ式を解決します
fn resolve_deploy_target_expression(
    part_id: &str,
    detected_deploy: Option<&definy_core::deploy_detector::DetectedDeploy>,
    resolved_part_expr: Option<&definy_event::event::Expression>,
) -> Result<definy_event::event::Expression, ConnectError> {
    if let Some(dep) = detected_deploy
        && let Some(ref handler) = dep.handler_expression
    {
        return Ok(handler.clone());
    }

    if let Some(expr) = resolved_part_expr {
        return Ok(expr.clone());
    }

    Err(ConnectError::not_found(format!(
        "Part '{part_id}' was not found in commits"
    )))
}

/// デプロイ先のエッジ URL に対して健全性確認 (Health Check Ping) を行います。
async fn ping_deployed_worker(url: &str) -> (Option<u32>, Option<u64>, Option<String>) {
    if url.trim().is_empty() {
        return (None, None, None);
    }

    let http_client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
    {
        Ok(c) => c,
        Err(_) => {
            return (
                None,
                None,
                Some("Failed to initialize HTTP client for ping".to_string()),
            );
        }
    };

    let start = std::time::Instant::now();
    match http_client.get(url).send().await {
        Ok(resp) => {
            let latency_ms = start.elapsed().as_millis() as u64;
            let status = resp.status().as_u16() as u32;
            let status_text = resp.status().canonical_reason().unwrap_or("OK");
            let msg = format!("{status} {status_text} ({latency_ms}ms)");
            (Some(status), Some(latency_ms), Some(msg))
        }
        Err(err) => {
            let latency_ms = start.elapsed().as_millis() as u64;
            let msg = if err.is_timeout() {
                format!("Health check timed out after 5s ({latency_ms}ms)")
            } else {
                format!("Health check ping failed: {err}")
            };
            (None, Some(latency_ms), Some(msg))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use definy_core::deploy_detector::DetectedDeploy;
    use definy_event::event::{Expression, StringExpression};

    #[test]
    fn test_resolve_deploy_token_from_request() {
        let res = resolve_deploy_token("  my-request-token  ", None);
        assert_eq!(res.unwrap(), "my-request-token");
    }

    #[test]
    fn test_resolve_deploy_token_from_detected_deploy() {
        let dep = DetectedDeploy {
            cloudflare_token: Some("part-token-123".to_string()),
            cloudflare_worker_name: "test-worker".to_string(),
            handler_expression: None,
        };
        let res = resolve_deploy_token("", Some(&dep));
        assert_eq!(res.unwrap(), "part-token-123");
    }

    #[test]
    fn test_resolve_deploy_token_missing() {
        let res = resolve_deploy_token("", None);
        assert!(res.is_err());
    }

    #[test]
    fn test_resolve_deploy_target_expression_from_handler() {
        let handler = Expression::String(StringExpression {
            value: "handler-expr".into(),
        });
        let dep = DetectedDeploy {
            cloudflare_token: None,
            cloudflare_worker_name: "test-worker".to_string(),
            handler_expression: Some(handler.clone()),
        };
        let res = resolve_deploy_target_expression("my-part", Some(&dep), None);
        assert_eq!(res.unwrap(), handler);
    }

    #[test]
    fn test_resolve_deploy_target_expression_from_part_fallback() {
        let part_expr = Expression::String(StringExpression {
            value: "fallback-part-expr".into(),
        });
        let res = resolve_deploy_target_expression("my-part", None, Some(&part_expr));
        assert_eq!(res.unwrap(), part_expr);
    }

    #[test]
    fn test_resolve_deploy_target_expression_not_found() {
        let res = resolve_deploy_target_expression("nonexistent-part", None, None);
        assert!(res.is_err());
    }

    #[tokio::test]
    async fn test_ping_deployed_worker_empty_url() {
        let (status, latency, msg) = ping_deployed_worker("").await;
        assert_eq!(status, None);
        assert_eq!(latency, None);
        assert_eq!(msg, None);
    }
}
