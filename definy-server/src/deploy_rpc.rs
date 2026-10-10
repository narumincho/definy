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

    // 自己記述コンパイラ (core.compile-to-wasm) によるオンデマンド Wasm 生成、
    // または指定された wasm_hash からバイナリを取得
    let (wasm_bytes, evaluated_result) = if let Some(ref part_id) = req.part_id {
        // 1. 指定された definy パーツ (Part) の式を自己記述コンパイラでオンデマンドコンパイル
        let db = crate::ensure_db(&state).await;
        let event_binaries = if let Some(db) = db {
            crate::db::get_events(&db, None, Some(1000), Some(0))
                .await
                .unwrap_or_default()
        } else {
            Box::new([])
        };

        match crate::self_hosted_wasm_compiler::find_part_expression_in_signed_events(
            part_id,
            &event_binaries,
        ) {
            Ok(expr) => match crate::self_hosted_wasm_compiler::compile_expression_to_wasm(&expr) {
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
            },
            Err(err) => {
                return error_to_response(ConnectError::not_found(format!(
                    "Part '{part_id}' was not found in commits: {err}"
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

    match client
        .deploy(
            req.script_name.as_deref(),
            wasm_bytes.as_deref(),
            req.custom_script.as_deref(),
        )
        .await
    {
        Ok(result) => {
            if let Some(db) = crate::ensure_db(&state).await {
                let deployment_record = crate::db::DeploymentRecord {
                    machine_id: format!("cf:{}", result.script_name),
                    commit_hash: None,
                    status: result.status.clone(),
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
