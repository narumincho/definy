//! Connect-RPC デプロイサービス (`DeployService`) のハンドラー実装。
//! fly.io および Deno Deploy REST API v2 を用いたエッジインスタンスへの動的配備を担当します。

use axum::body::Bytes;
use axum::extract::State;
use axum::http::HeaderMap;
use axum::response::Response;
use base64::Engine;
use definy_event::rpc::*;

use crate::AppState;
use crate::connect_rpc::{
    ContentCodec, decode_request, encode_response_or_error, error_to_response,
};

#[utoipa::path(
    post,
    path = "/definy.v1.DeployService/DeployInstance",
    tag = "connect-rpc",
    request_body(
        content = DeployInstanceRequest,
        content_type = "application/json",
        description = "Connect-RPC DeployInstance request payload"
    ),
    responses(
        (status = 200, description = "Connect-RPC DeployInstance response", body = DeployInstanceResponse, content_type = "application/json"),
        (status = 400, description = "Bad Request", body = ConnectError, content_type = "application/json"),
        (status = 503, description = "Service Unavailable / Not Configured", body = ConnectError, content_type = "application/json")
    )
)]
pub async fn handle_deploy_instance(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: DeployInstanceRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    let fly_client = match &state.fly_client {
        Some(client) => client,
        None => {
            return error_to_response(ConnectError::unavailable(
                "fly.io is not configured: FLY_API_TOKEN is missing on server",
            ));
        }
    };

    let (image, port, env_vars, files) = if let Some(ref wasm_hash) = req.wasm_hash {
        // 仮想 Wasm 配信 & 共通 runner モード (Docker ビルド不要 / デプロイ時直接注入)
        let runner_image = std::env::var("FLY_RUNNER_IMAGE")
            .unwrap_or_else(|_| "ghcr.io/narumincho/definy-runner:latest".to_string());
        let server_url =
            std::env::var("DEFINY_SERVER_URL").unwrap_or_else(|_| fly_client.app_url());
        let mut vars = std::collections::HashMap::new();
        vars.insert("PORT".to_string(), "8080".to_string());
        vars.insert("DEFINY_SERVER_URL".to_string(), server_url);
        vars.insert("DEFINY_WASM_HASH".to_string(), wasm_hash.clone());

        // 1. VirtualFileStore から検索
        let wasm_bytes = {
            let store = state.virtual_file_store.read().await;
            store.get_wasm(wasm_hash)
        };

        // 2. DB (ContentStore) からフォールバック検索
        let wasm_bytes = match wasm_bytes {
            Some(bytes) => Some(bytes),
            None => {
                if let Some(db) = crate::ensure_db(&state).await {
                    crate::db::get_content(&db, wasm_hash).await.ok().flatten()
                } else {
                    None
                }
            }
        };

        // 3. resolve_client_wasm からフォールバック検索
        let wasm_bytes = match wasm_bytes {
            Some(bytes) => Some(bytes),
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

        let files = if let Some(bytes) = wasm_bytes {
            vars.insert("WASM_FILE".to_string(), "/app/definy_core.wasm".to_string());
            vec![crate::fly_machines::FlyMachineFile {
                guest_path: "/app/definy_core.wasm".to_string(),
                raw_value: base64::engine::general_purpose::STANDARD.encode(bytes),
            }]
        } else {
            vec![]
        };

        (runner_image, 8080, vars, files)
    } else {
        // 従来のコミットハッシュベースモード
        let img = std::env::var("FLY_IMAGE")
            .unwrap_or_else(|_| "registry.fly.io/definy:latest".to_string());
        let mut vars = std::collections::HashMap::new();
        vars.insert("PORT".to_string(), "8000".to_string());
        if let Some(ref commit_hash) = req.commit_hash {
            vars.insert("DEFINY_COMMIT_HASH".to_string(), commit_hash.clone());
        }
        (img, 8000, vars, vec![])
    };

    let mut machine_config =
        crate::fly_machines::create_default_definy_machine_config(&image, env_vars, port);
    machine_config.files = files;

    let create_req = crate::fly_machines::CreateMachineRequest {
        name: req.machine_name.clone(),
        region: req.region.clone(),
        config: machine_config,
    };

    match fly_client.create_machine(&create_req).await {
        Ok(machine) => {
            let app_url = fly_client.app_url();

            if let Some(db) = crate::ensure_db(&state).await {
                let deployment_record = crate::db::DeploymentRecord {
                    machine_id: machine.id.clone(),
                    commit_hash: req.commit_hash.clone(),
                    status: machine.state.clone(),
                    url: app_url.clone(),
                    app_url: app_url.clone(),
                    region: machine.region.clone(),
                    created_at: chrono::Utc::now(),
                    wasm_hash: req.wasm_hash.clone(),
                    provider: Some("flyio".to_string()),
                };
                if let Err(e) = crate::db::save_deployment(&db, deployment_record).await {
                    eprintln!("Failed to save deployment to DB: {:?}", e);
                }
            }

            let response = DeployInstanceResponse {
                machine_id: machine.id,
                status: machine.state,
                url: app_url.clone(),
                app_url,
            };
            encode_response_or_error(codec, &response)
        }
        Err(err) => {
            eprintln!("Failed to create fly.io machine: {:?}", err);
            error_to_response(ConnectError::internal(format!("Deploy failed: {err}")))
        }
    }
}

#[utoipa::path(
    post,
    path = "/definy.v1.DeployService/GetDeployStatus",
    tag = "connect-rpc",
    request_body(
        content = GetDeployStatusRequest,
        content_type = "application/json",
        description = "Connect-RPC GetDeployStatus request payload"
    ),
    responses(
        (status = 200, description = "Connect-RPC GetDeployStatus response", body = GetDeployStatusResponse, content_type = "application/json"),
        (status = 400, description = "Bad Request", body = ConnectError, content_type = "application/json"),
        (status = 404, description = "Machine Not Found", body = ConnectError, content_type = "application/json"),
        (status = 503, description = "Service Unavailable / Not Configured", body = ConnectError, content_type = "application/json")
    )
)]
pub async fn handle_get_deploy_status(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: GetDeployStatusRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    let fly_client = match &state.fly_client {
        Some(client) => client,
        None => {
            return error_to_response(ConnectError::unavailable(
                "fly.io is not configured: FLY_API_TOKEN is missing on server",
            ));
        }
    };

    match fly_client.get_machine(&req.machine_id).await {
        Ok(machine) => {
            let app_url = fly_client.app_url();
            let response = GetDeployStatusResponse {
                machine_id: machine.id,
                status: machine.state,
                region: machine.region,
                url: app_url,
            };
            encode_response_or_error(codec, &response)
        }
        Err(err) => {
            if let Some(db) = crate::ensure_db(&state).await
                && let Ok(Some(cached)) = crate::db::get_deployment(&db, &req.machine_id).await
            {
                let response = GetDeployStatusResponse {
                    machine_id: cached.machine_id,
                    status: cached.status,
                    region: cached.region,
                    url: cached.url,
                };
                return encode_response_or_error(codec, &response);
            }
            eprintln!("Failed to get fly.io machine: {:?}", err);
            error_to_response(ConnectError::internal(format!(
                "Get deploy status failed: {err}"
            )))
        }
    }
}

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
    path = "/definy.v1.DeployService/DeployDeno",
    tag = "connect-rpc",
    request_body(
        content = DeployDenoRequest,
        content_type = "application/json",
        description = "Connect-RPC DeployDeno request payload"
    ),
    responses(
        (status = 200, description = "Connect-RPC DeployDeno response", body = DeployDenoResponse, content_type = "application/json"),
        (status = 400, description = "Bad Request", body = ConnectError, content_type = "application/json"),
        (status = 500, description = "Internal Server Error", body = ConnectError, content_type = "application/json")
    )
)]
pub async fn handle_deploy_deno(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let codec = ContentCodec::from_headers(&headers);
    let req: DeployDenoRequest = match decode_request(codec, &body) {
        Ok(r) => r,
        Err(err) => return error_to_response(err),
    };

    let token = if !req.org_token.trim().is_empty() {
        req.org_token.trim().to_string()
    } else if let Ok(env_token) = std::env::var("DENO_DEPLOY_TOKEN") {
        env_token.trim().to_string()
    } else {
        return error_to_response(ConnectError::invalid_argument(
            "Deno Deploy token (org_token) is required",
        ));
    };

    if token.is_empty() {
        return error_to_response(ConnectError::invalid_argument(
            "Deno Deploy token cannot be empty",
        ));
    }

    let mut config = crate::deno_deploy::DenoDeployConfig::new(token);
    if let Ok(base_url) = std::env::var("DENO_DEPLOY_API_URL")
        && !base_url.trim().is_empty()
    {
        config = config.with_base_url(base_url.trim());
    }

    let client = crate::deno_deploy::DenoDeployClient::new(config);

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
            req.app_slug.as_deref(),
            wasm_bytes.as_deref(),
            req.custom_script.as_deref(),
        )
        .await
    {
        Ok(result) => {
            if let Some(db) = crate::ensure_db(&state).await {
                let deployment_record = crate::db::DeploymentRecord {
                    machine_id: format!("deno:{}", result.revision_id),
                    commit_hash: None,
                    status: result.status.clone(),
                    url: result.url.clone(),
                    app_url: result.url.clone(),
                    region: "global-edge".to_string(),
                    created_at: chrono::Utc::now(),
                    wasm_hash: req.wasm_hash.clone(),
                    provider: Some("deno_deploy".to_string()),
                };
                if let Err(e) = crate::db::save_deployment(&db, deployment_record).await {
                    eprintln!("Failed to save Deno deployment to DB: {:?}", e);
                }
            }

            let response = DeployDenoResponse {
                app_id: result.app_id,
                app_slug: result.app_slug,
                revision_id: result.revision_id,
                status: result.status,
                url: result.url,
                hostnames: result.hostnames,
                evaluated_result,
            };
            encode_response_or_error(codec, &response)
        }
        Err(err) => {
            eprintln!("Failed to deploy to Deno Deploy: {:?}", err);
            error_to_response(ConnectError::internal(format!("Deno Deploy failed: {err}")))
        }
    }
}
