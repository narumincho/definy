pub mod prompts;
pub mod protocol;
pub mod resources;
pub mod tools;

use std::collections::HashMap;
use std::convert::Infallible;
use std::sync::Arc;
use std::time::Duration;

use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::routing::{get, post};
use rand::Rng;
use serde::Deserialize;
use serde_json::{Value, json};
use surrealdb::Surreal;
use surrealdb::engine::any::Any;
use tokio::sync::{RwLock, mpsc};
use tokio_stream::StreamExt;
use tokio_stream::wrappers::ReceiverStream;

use crate::AppState;
use crate::ensure_db;
use protocol::*;

#[derive(Clone, Default)]
pub struct McpSessionManager {
    sessions: Arc<RwLock<HashMap<String, mpsc::Sender<String>>>>,
}

impl McpSessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn create_session(&self) -> (String, mpsc::Receiver<String>) {
        let session_id = generate_session_id();
        let (tx, rx) = mpsc::channel(32);
        self.sessions.write().await.insert(session_id.clone(), tx);
        (session_id, rx)
    }

    pub async fn remove_session(&self, session_id: &str) {
        self.sessions.write().await.remove(session_id);
    }

    pub async fn send_to_session(&self, session_id: &str, msg: String) -> bool {
        if let Some(tx) = self.sessions.read().await.get(session_id) {
            tx.send(msg).await.is_ok()
        } else {
            false
        }
    }
}

fn generate_session_id() -> String {
    let mut rng = rand::thread_rng();
    let rand_bytes: [u8; 16] = rng.r#gen();
    hex::encode(rand_bytes)
}

pub fn router(session_manager: McpSessionManager) -> axum::Router<AppState> {
    axum::Router::new()
        .route("/mcp", post(handle_mcp_post))
        .route(
            "/mcp/sse",
            get({
                let sm = session_manager.clone();
                move |state| handle_mcp_sse(sm, state)
            }),
        )
        .route(
            "/mcp/messages",
            post({
                let sm = session_manager.clone();
                move |state, query, body| handle_mcp_messages(sm, state, query, body)
            }),
        )
}

pub async fn dispatch_request(
    request: JsonRpcRequest,
    db: Option<&Surreal<Any>>,
) -> Option<JsonRpcResponse> {
    let id = request.id;
    let method = request.method.as_str();

    match method {
        "initialize" => {
            let res = InitializeResult {
                protocol_version: LATEST_PROTOCOL_VERSION.to_string(),
                capabilities: ServerCapabilities {
                    tools: Some(ToolsCapability {
                        list_changed: Some(false),
                    }),
                    resources: Some(ResourcesCapability {
                        subscribe: Some(false),
                        list_changed: Some(false),
                    }),
                    prompts: Some(PromptsCapability {
                        list_changed: Some(false),
                    }),
                },
                server_info: ServerInfo {
                    name: SERVER_NAME.to_string(),
                    version: SERVER_VERSION.to_string(),
                },
            };
            Some(JsonRpcResponse::success(
                id,
                serde_json::to_value(res).unwrap(),
            ))
        }
        "notifications/initialized" => None,
        "ping" => Some(JsonRpcResponse::success(id, json!({}))),
        "tools/list" => {
            let tools = tools::all_tools();
            Some(JsonRpcResponse::success(id, json!({ "tools": tools })))
        }
        "tools/call" => {
            let db = match db {
                Some(db) => db,
                None => {
                    return Some(JsonRpcResponse::internal_error(
                        id,
                        "Database is not connected",
                    ));
                }
            };
            let params: ToolCallParams =
                match request.params.and_then(|p| serde_json::from_value(p).ok()) {
                    Some(p) => p,
                    None => {
                        return Some(JsonRpcResponse::invalid_params(
                            id,
                            "Invalid tool call params",
                        ));
                    }
                };
            let result = tools::handle_tool_call(&params.name, params.arguments, db).await;
            Some(JsonRpcResponse::success(
                id,
                serde_json::to_value(result).unwrap(),
            ))
        }
        "resources/list" => {
            let db = match db {
                Some(db) => db,
                None => {
                    return Some(JsonRpcResponse::internal_error(
                        id,
                        "Database is not connected",
                    ));
                }
            };
            let res = resources::list_resources(db).await;
            Some(JsonRpcResponse::success(id, json!({ "resources": res })))
        }
        "resources/read" => {
            let db = match db {
                Some(db) => db,
                None => {
                    return Some(JsonRpcResponse::internal_error(
                        id,
                        "Database is not connected",
                    ));
                }
            };
            let uri = match request
                .params
                .as_ref()
                .and_then(|p| p.get("uri"))
                .and_then(|v| v.as_str())
            {
                Some(u) => u,
                None => {
                    return Some(JsonRpcResponse::invalid_params(
                        id,
                        "Missing 'uri' parameter",
                    ));
                }
            };
            match resources::read_resource(uri, db).await {
                Ok(content) => Some(JsonRpcResponse::success(
                    id,
                    json!({ "contents": [content] }),
                )),
                Err(err) => Some(JsonRpcResponse::error(id, -32002, err)),
            }
        }
        "prompts/list" => {
            let prompts = prompts::all_prompts();
            Some(JsonRpcResponse::success(id, json!({ "prompts": prompts })))
        }
        "prompts/get" => {
            let name = match request
                .params
                .as_ref()
                .and_then(|p| p.get("name"))
                .and_then(|v| v.as_str())
            {
                Some(n) => n,
                None => {
                    return Some(JsonRpcResponse::invalid_params(
                        id,
                        "Missing 'name' parameter",
                    ));
                }
            };
            let args = request
                .params
                .as_ref()
                .and_then(|p| p.get("arguments"))
                .cloned();
            match prompts::get_prompt(name, args) {
                Ok((desc, messages)) => Some(JsonRpcResponse::success(
                    id,
                    json!({
                        "description": desc,
                        "messages": messages
                    }),
                )),
                Err(e) => Some(JsonRpcResponse::error(id, -32002, e)),
            }
        }
        _ => Some(JsonRpcResponse::method_not_found(id, method)),
    }
}

pub async fn handle_mcp_post(
    State(state): State<AppState>,
    axum::Json(payload): axum::Json<Value>,
) -> impl IntoResponse {
    let db = ensure_db(&state).await;

    if let Ok(req) = serde_json::from_value::<JsonRpcRequest>(payload.clone()) {
        if let Some(resp) = dispatch_request(req, db.as_ref()).await {
            return (
                StatusCode::OK,
                axum::Json(serde_json::to_value(resp).unwrap()),
            )
                .into_response();
        } else {
            return StatusCode::NO_CONTENT.into_response();
        }
    }

    if let Ok(requests) = serde_json::from_value::<Vec<JsonRpcRequest>>(payload) {
        let mut responses = Vec::new();
        for req in requests {
            if let Some(resp) = dispatch_request(req, db.as_ref()).await {
                responses.push(resp);
            }
        }
        return (
            StatusCode::OK,
            axum::Json(serde_json::to_value(responses).unwrap()),
        )
            .into_response();
    }

    (
        StatusCode::BAD_REQUEST,
        axum::Json(
            serde_json::to_value(JsonRpcResponse::error(
                None,
                -32700,
                "Invalid JSON-RPC request",
            ))
            .unwrap(),
        ),
    )
        .into_response()
}

pub async fn handle_mcp_sse(
    session_manager: McpSessionManager,
    State(_state): State<AppState>,
) -> Sse<impl tokio_stream::Stream<Item = Result<Event, Infallible>>> {
    let (session_id, rx) = session_manager.create_session().await;
    let endpoint_url = format!("/mcp/messages?sessionId={}", session_id);

    let initial_event = Ok(Event::default().event("endpoint").data(endpoint_url));
    let initial_stream = tokio_stream::once(initial_event);

    let message_stream =
        ReceiverStream::new(rx).map(|msg| Ok(Event::default().event("message").data(msg)));

    let full_stream = initial_stream.chain(message_stream);

    Sse::new(full_stream).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keep-alive"),
    )
}

#[derive(Deserialize)]
pub struct MessagesQuery {
    #[serde(rename = "sessionId")]
    pub session_id: Option<String>,
}

pub async fn handle_mcp_messages(
    session_manager: McpSessionManager,
    State(state): State<AppState>,
    Query(query): Query<MessagesQuery>,
    axum::Json(payload): axum::Json<Value>,
) -> impl IntoResponse {
    let db = ensure_db(&state).await;

    let req: JsonRpcRequest = match serde_json::from_value(payload) {
        Ok(r) => r,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                axum::Json(json!({
                    "jsonrpc": "2.0",
                    "error": { "code": -32700, "message": "Invalid JSON" }
                })),
            )
                .into_response();
        }
    };

    let maybe_resp = dispatch_request(req, db.as_ref()).await;

    if let (Some(resp), Some(session_id)) = (maybe_resp, query.session_id) {
        let resp_json = serde_json::to_string(&resp).unwrap();
        let delivered = session_manager
            .send_to_session(&session_id, resp_json)
            .await;
        if delivered {
            return (StatusCode::ACCEPTED, "Accepted").into_response();
        } else {
            return (StatusCode::OK, axum::Json(resp)).into_response();
        }
    }

    (StatusCode::ACCEPTED, "Accepted").into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_initialize_and_tools_list() {
        let req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: Some(json!(1)),
            method: "initialize".to_string(),
            params: Some(json!({
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": { "name": "test-client", "version": "1.0" }
            })),
        };

        let resp = dispatch_request(req, None)
            .await
            .expect("Should return response");
        assert_eq!(resp.id, Some(json!(1)));
        assert!(resp.error.is_none());
        let result = resp.result.unwrap();
        assert_eq!(result["protocolVersion"], LATEST_PROTOCOL_VERSION);
        assert_eq!(result["serverInfo"]["name"], SERVER_NAME);

        let tools_req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: Some(json!(2)),
            method: "tools/list".to_string(),
            params: None,
        };
        let tools_resp = dispatch_request(tools_req, None).await.unwrap();
        let tools = tools_resp.result.unwrap()["tools"]
            .as_array()
            .unwrap()
            .clone();
        assert!(tools.iter().any(|t| t["name"] == "list_modules"));
        assert!(tools.iter().any(|t| t["name"] == "list_parts"));
        assert!(tools.iter().any(|t| t["name"] == "eval_expression"));
    }

    #[tokio::test]
    async fn test_ping_and_unknown_method() {
        let ping_req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: Some(json!(10)),
            method: "ping".to_string(),
            params: None,
        };
        let ping_resp = dispatch_request(ping_req, None).await.unwrap();
        assert_eq!(ping_resp.id, Some(json!(10)));
        assert_eq!(ping_resp.result, Some(json!({})));

        let unknown_req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: Some(json!(11)),
            method: "non_existent_method".to_string(),
            params: None,
        };
        let unknown_resp = dispatch_request(unknown_req, None).await.unwrap();
        assert!(unknown_resp.error.is_some());
        assert_eq!(unknown_resp.error.unwrap().code, -32601);
    }

    #[tokio::test]
    async fn test_mcp_with_database() {
        let db = surrealdb::engine::any::connect("mem://").await.unwrap();
        db.use_ns("test").use_db("test").await.unwrap();
        let schema = include_str!("../../schema.surql");
        db.query(schema).await.unwrap();
        crate::builtin_migration::migrate_builtin_data(&db)
            .await
            .unwrap();

        // 1. list_modules
        let list_modules_req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: Some(json!(100)),
            method: "tools/call".to_string(),
            params: Some(json!({
                "name": "list_modules",
                "arguments": {}
            })),
        };
        let resp = dispatch_request(list_modules_req, Some(&db)).await.unwrap();
        let text = resp.result.unwrap()["content"][0]["text"]
            .as_str()
            .unwrap()
            .to_string();
        assert!(text.contains("core"));
        assert!(text.contains("sample"));

        // 2. list_parts
        let list_parts_req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: Some(json!(101)),
            method: "tools/call".to_string(),
            params: Some(json!({
                "name": "list_parts",
                "arguments": { "module": "sample" }
            })),
        };
        let resp = dispatch_request(list_parts_req, Some(&db)).await.unwrap();
        let text = resp.result.unwrap()["content"][0]["text"]
            .as_str()
            .unwrap()
            .to_string();
        assert!(text.contains("match_option_sample"));

        // 3. eval_expression
        let eval_req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: Some(json!(102)),
            method: "tools/call".to_string(),
            params: Some(json!({
                "name": "eval_expression",
                "arguments": {
                    "expression": {
                        "Add": {
                            "left": { "Number": { "value": 40 } },
                            "right": { "Number": { "value": 2 } }
                        }
                    }
                }
            })),
        };
        let resp = dispatch_request(eval_req, Some(&db)).await.unwrap();
        let text = resp.result.unwrap()["content"][0]["text"]
            .as_str()
            .unwrap()
            .to_string();
        assert!(text.contains("42"));

        // 4. create_module
        let create_mod_req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: Some(json!(103)),
            method: "tools/call".to_string(),
            params: Some(json!({
                "name": "create_module",
                "arguments": {
                    "name": "ai_test_mod",
                    "description": "Module created by AI via MCP"
                }
            })),
        };
        let resp = dispatch_request(create_mod_req, Some(&db)).await.unwrap();
        let text = resp.result.unwrap()["content"][0]["text"]
            .as_str()
            .unwrap()
            .to_string();
        assert!(text.contains("ai_test_mod"));

        // 5. create_part
        let create_part_req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: Some(json!(104)),
            method: "tools/call".to_string(),
            params: Some(json!({
                "name": "create_part",
                "arguments": {
                    "module": "ai_test_mod",
                    "name": "ai_constant",
                    "description": "A test constant created via MCP",
                    "expression": {
                        "Number": { "value": 999 }
                    }
                }
            })),
        };
        let resp = dispatch_request(create_part_req, Some(&db)).await.unwrap();
        let text = resp.result.unwrap()["content"][0]["text"]
            .as_str()
            .unwrap()
            .to_string();
        assert!(text.contains("ai_constant"));

        // 6. eval_part
        let eval_part_req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: Some(json!(105)),
            method: "tools/call".to_string(),
            params: Some(json!({
                "name": "eval_part",
                "arguments": {
                    "identifier": "ai_constant"
                }
            })),
        };
        let resp = dispatch_request(eval_part_req, Some(&db)).await.unwrap();
        let text = resp.result.unwrap()["content"][0]["text"]
            .as_str()
            .unwrap()
            .to_string();
        assert!(text.contains("999"));

        // 7. resources/list and resources/read
        let res_list_req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: Some(json!(106)),
            method: "resources/list".to_string(),
            params: None,
        };
        let resp = dispatch_request(res_list_req, Some(&db)).await.unwrap();
        assert!(resp.result.unwrap()["resources"].as_array().unwrap().len() >= 2);

        let res_read_req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: Some(json!(107)),
            method: "resources/read".to_string(),
            params: Some(json!({ "uri": "definy://modules" })),
        };
        let resp = dispatch_request(res_read_req, Some(&db)).await.unwrap();
        let content_text = resp.result.unwrap()["contents"][0]["text"]
            .as_str()
            .unwrap()
            .to_string();
        assert!(content_text.contains("ai_test_mod"));
    }

    #[tokio::test]
    async fn test_mcp_http_post_endpoint() {
        use axum::body::Body;
        use http_body_util::BodyExt;
        use tower::ServiceExt;

        let state = AppState {
            db: Arc::new(RwLock::new(None)),
        };
        let app = router(McpSessionManager::new()).with_state(state);

        let req = axum::http::Request::builder()
            .method("POST")
            .uri("/mcp")
            .header("content-type", "application/json")
            .body(Body::from(
                json!({
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "initialize",
                    "params": {}
                })
                .to_string(),
            ))
            .unwrap();

        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
        let bytes = resp.into_body().collect().await.unwrap().to_bytes();
        let body_json: Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(body_json["id"], 1);
        assert_eq!(
            body_json["result"]["protocolVersion"],
            LATEST_PROTOCOL_VERSION
        );
    }
}
