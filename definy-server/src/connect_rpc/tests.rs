use super::*;
use definy_event::event::{AccountId, CreateAccountEvent, Event, EventContent};

#[tokio::test]
async fn test_connect_rpc_lifecycle() {
    let db = crate::db::init_db().await.unwrap();
    let database = Database(db);
    let mut headers = HeaderMap::new();
    headers.insert(
        axum::http::header::CONTENT_TYPE,
        axum::http::HeaderValue::from_static("application/json"),
    );
    headers.insert(
        axum::http::HeaderName::from_static("connect-protocol-version"),
        axum::http::HeaderValue::from_static("1"),
    );

    // 1. Initial GetEvents
    let res = handle_get_events(database.clone(), headers.clone(), Bytes::from("{}")).await;
    assert_eq!(res.status(), StatusCode::OK);

    // 2. Create signed event
    let signing_key = ed25519_dalek::SigningKey::generate(&mut rand::rngs::OsRng);
    let account_id = AccountId(signing_key.verifying_key());
    let event = Event {
        account_id: account_id.clone(),
        time: chrono::Utc::now(),
        content: EventContent::CreateAccount(CreateAccountEvent {
            account_name: "TestUser".into(),
        }),
    };
    let signed_bytes = definy_event::sign_and_serialize(event, &signing_key).unwrap();
    let expected_hash = EventHashId::from_bytes(&signed_bytes);

    // 3. SubmitEvent via Connect-RPC
    let submit_req = SubmitEventRequest {
        signed_event_bytes: signed_bytes.clone(),
    };
    let submit_body = serde_json::to_vec(&submit_req).unwrap();
    let client_addr = "127.0.0.1:8000".parse().unwrap();
    let submit_res = handle_submit_event(
        database.clone(),
        ConnectInfo(client_addr),
        headers.clone(),
        Bytes::from(submit_body),
    )
    .await;
    assert_eq!(submit_res.status(), StatusCode::OK);
    let submit_bytes = axum::body::to_bytes(submit_res.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let submit_data: SubmitEventResponse = serde_json::from_slice(&submit_bytes).unwrap();
    assert_eq!(submit_data.event_hash, expected_hash.to_string());
    assert_eq!(submit_data.status, "ok");

    // 4. GetEvent via Connect-RPC
    let get_req = GetEventRequest {
        event_hash: expected_hash.to_string(),
    };
    let get_body = serde_json::to_vec(&get_req).unwrap();
    let get_res = handle_get_event(database.clone(), headers.clone(), Bytes::from(get_body)).await;
    assert_eq!(get_res.status(), StatusCode::OK);
    let get_bytes = axum::body::to_bytes(get_res.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let get_data: GetEventResponse = serde_json::from_slice(&get_bytes).unwrap();
    let item = get_data.event.expect("Event should exist");
    assert_eq!(item.event_hash, expected_hash.to_string());
    assert_eq!(item.account_id, account_id.to_string());
    assert_eq!(item.event_type, "create_account");
    assert_eq!(item.signed_event_bytes, signed_bytes);

    // 5. Submit invalid event (tampered)
    let mut tampered = signed_bytes.clone();
    if let Some(last) = tampered.last_mut() {
        *last ^= 0xFF;
    }
    let bad_submit_req = SubmitEventRequest {
        signed_event_bytes: tampered,
    };
    let bad_body = serde_json::to_vec(&bad_submit_req).unwrap();
    let bad_res = handle_submit_event(
        database.clone(),
        ConnectInfo(client_addr),
        headers.clone(),
        Bytes::from(bad_body),
    )
    .await;
    assert_eq!(bad_res.status(), StatusCode::BAD_REQUEST);

    let invalid_module_expression =
        definy_event::event::Expression::Number(definy_event::event::NumberExpression {
            value: 123,
        });
    let invalid_module_content_hash =
        definy_event::ContentHash::from_expression(&invalid_module_expression).unwrap();
    let invalid_module_event = Event {
        account_id: account_id.clone(),
        time: chrono::Utc::now(),
        content: EventContent::ModuleCommit(definy_event::event::ModuleCommitEvent {
            module_name: "invalid-module".into(),
            module_description: "invalid module".into(),
            parent_commit_hash: None,
            message: "reject a type mismatch".into(),
            parts: vec![definy_event::event::ModulePartEntry {
                name: "wrong-type".into(),
                part_type: Some(definy_event::event::PartType::String),
                description: "declares string but evaluates to number".into(),
                content_hash: None,
                expression: Some(invalid_module_expression),
            }],
        }),
    };
    let invalid_module_bytes =
        definy_event::sign_and_serialize(invalid_module_event, &signing_key).unwrap();
    let invalid_module_res = handle_submit_event(
        database.clone(),
        ConnectInfo(client_addr),
        headers.clone(),
        Bytes::from(
            serde_json::to_vec(&SubmitEventRequest {
                signed_event_bytes: invalid_module_bytes,
            })
            .unwrap(),
        ),
    )
    .await;
    assert_eq!(invalid_module_res.status(), StatusCode::BAD_REQUEST);
    assert!(
        crate::db::get_content(&database.0, &invalid_module_content_hash.to_string())
            .await
            .unwrap()
            .is_none()
    );

    let unsupported_module_event = Event {
        account_id: account_id.clone(),
        time: chrono::Utc::now(),
        content: EventContent::ModuleCommit(definy_event::event::ModuleCommitEvent {
            module_name: "unsupported-module".into(),
            module_description: "unsupported module".into(),
            parent_commit_hash: None,
            message: "reject unrepresented syntax".into(),
            parts: vec![definy_event::event::ModulePartEntry {
                name: "unsupported".into(),
                part_type: Some(definy_event::event::PartType::Number),
                description: "compiler expressions are outside core.expression".into(),
                content_hash: None,
                expression: Some(definy_event::event::Expression::Compiler(
                    definy_event::event::CompilerBuiltin::Plus,
                )),
            }],
        }),
    };
    let unsupported_module_bytes =
        definy_event::sign_and_serialize(unsupported_module_event, &signing_key).unwrap();
    let unsupported_module_res = handle_submit_event(
        database.clone(),
        ConnectInfo(client_addr),
        headers.clone(),
        Bytes::from(
            serde_json::to_vec(&SubmitEventRequest {
                signed_event_bytes: unsupported_module_bytes,
            })
            .unwrap(),
        ),
    )
    .await;
    assert_eq!(unsupported_module_res.status(), StatusCode::BAD_REQUEST);

    let primitive_type_module = Event {
        account_id: account_id.clone(),
        time: chrono::Utc::now(),
        content: EventContent::ModuleCommit(definy_event::event::ModuleCommitEvent {
            module_name: "primitive-types".into(),
            module_description: "primitive type declarations".into(),
            parent_commit_hash: None,
            message: "submit a primitive type alias".into(),
            parts: vec![definy_event::event::ModulePartEntry {
                name: "my-number".into(),
                part_type: Some(definy_event::event::PartType::Type),
                description: "the number type".into(),
                content_hash: None,
                expression: Some(definy_event::event::Expression::TypeNumber),
            }],
        }),
    };
    let primitive_type_bytes =
        definy_event::sign_and_serialize(primitive_type_module, &signing_key).unwrap();
    let primitive_type_res = handle_submit_event(
        database.clone(),
        ConnectInfo(client_addr),
        headers.clone(),
        Bytes::from(
            serde_json::to_vec(&SubmitEventRequest {
                signed_event_bytes: primitive_type_bytes,
            })
            .unwrap(),
        ),
    )
    .await;
    assert_eq!(primitive_type_res.status(), StatusCode::OK);

    let union_type_module = Event {
        account_id: account_id.clone(),
        time: chrono::Utc::now(),
        content: EventContent::ModuleCommit(definy_event::event::ModuleCommitEvent {
            module_name: "union-types".into(),
            module_description: "union type declarations".into(),
            parent_commit_hash: None,
            message: "composite type declarations are not supported yet".into(),
            parts: vec![definy_event::event::ModulePartEntry {
                name: "maybe-number".into(),
                part_type: Some(definy_event::event::PartType::Type),
                description: "an optional number".into(),
                content_hash: None,
                expression: Some(definy_event::event::Expression::TypeUnion(
                    definy_event::event::TypeUnionExpression {
                        variants: vec![
                            definy_event::event::TypeUnionVariant {
                                tag: "none".into(),
                                payload_type: None,
                            },
                            definy_event::event::TypeUnionVariant {
                                tag: "some".into(),
                                payload_type: Some(Box::new(
                                    definy_event::event::Expression::TypeNumber,
                                )),
                            },
                        ],
                    },
                )),
            }],
        }),
    };
    let union_type_bytes =
        definy_event::sign_and_serialize(union_type_module, &signing_key).unwrap();
    let union_type_res = handle_submit_event(
        database.clone(),
        ConnectInfo(client_addr),
        headers.clone(),
        Bytes::from(
            serde_json::to_vec(&SubmitEventRequest {
                signed_event_bytes: union_type_bytes,
            })
            .unwrap(),
        ),
    )
    .await;
    assert_eq!(union_type_res.status(), StatusCode::OK);

    let composite_type_module = Event {
        account_id: account_id.clone(),
        time: chrono::Utc::now(),
        content: EventContent::ModuleCommit(definy_event::event::ModuleCommitEvent {
            module_name: "composite-types".into(),
            module_description: "composite type declarations".into(),
            parent_commit_hash: None,
            message: "submit composite type declarations".into(),
            parts: vec![
                definy_event::event::ModulePartEntry {
                    name: "number-list".into(),
                    part_type: Some(definy_event::event::PartType::Type),
                    description: "a list of numbers".into(),
                    content_hash: None,
                    expression: Some(definy_event::event::Expression::TypeList(
                        definy_event::event::TypeListExpression {
                            item_type: Box::new(definy_event::event::Expression::TypeNumber),
                        },
                    )),
                },
                definy_event::event::ModulePartEntry {
                    name: "number-to-string".into(),
                    part_type: Some(definy_event::event::PartType::Type),
                    description: "a number to string function".into(),
                    content_hash: None,
                    expression: Some(definy_event::event::Expression::TypeFunction(
                        definy_event::event::TypeFunctionExpression {
                            parameter: Box::new(definy_event::event::Expression::TypeNumber),
                            return_type: Box::new(definy_event::event::Expression::TypeString),
                        },
                    )),
                },
                definy_event::event::ModulePartEntry {
                    name: "number-record".into(),
                    part_type: Some(definy_event::event::PartType::Type),
                    description: "a record containing a number".into(),
                    content_hash: None,
                    expression: Some(definy_event::event::Expression::TypeLiteral(
                        definy_event::event::TypeLiteralExpression {
                            items: vec![definy_event::event::TypeLiteralItemExpression {
                                key: "value".into(),
                                value: Box::new(definy_event::event::Expression::TypeNumber),
                            }],
                        },
                    )),
                },
                definy_event::event::ModulePartEntry {
                    name: "optional-string".into(),
                    part_type: Some(definy_event::event::PartType::Type),
                    description: "an optional string".into(),
                    content_hash: None,
                    expression: Some(definy_event::event::Expression::TypeUnion(
                        definy_event::event::TypeUnionExpression {
                            variants: vec![
                                definy_event::event::TypeUnionVariant {
                                    tag: "none".into(),
                                    payload_type: None,
                                },
                                definy_event::event::TypeUnionVariant {
                                    tag: "some".into(),
                                    payload_type: Some(Box::new(
                                        definy_event::event::Expression::TypeString,
                                    )),
                                },
                            ],
                        },
                    )),
                },
            ],
        }),
    };
    let composite_type_bytes =
        definy_event::sign_and_serialize(composite_type_module, &signing_key).unwrap();
    let composite_type_res = handle_submit_event(
        database.clone(),
        ConnectInfo(client_addr),
        headers.clone(),
        Bytes::from(
            serde_json::to_vec(&SubmitEventRequest {
                signed_event_bytes: composite_type_bytes,
            })
            .unwrap(),
        ),
    )
    .await;
    assert_eq!(composite_type_res.status(), StatusCode::OK);

    // 6. Test Diff Hash Negotiation
    let test_expr =
        definy_event::event::Expression::Number(definy_event::event::NumberExpression {
            value: 999,
        });
    let test_content_bytes = serde_cbor::to_vec(&test_expr).unwrap();
    let test_content_hash = definy_event::ContentHash::from_expression(&test_expr).unwrap();
    let test_hash_str = test_content_hash.to_string();

    let commit_event = Event {
        account_id: account_id.clone(),
        time: chrono::Utc::now(),
        content: EventContent::ModuleCommit(definy_event::event::ModuleCommitEvent {
            module_name: "test-negotiation".into(),
            module_description: "test".into(),
            parent_commit_hash: None,
            message: "test negotiation".into(),
            parts: vec![definy_event::event::ModulePartEntry {
                name: "test-part".into(),
                part_type: Some(definy_event::event::PartType::Number),
                description: "test".into(),
                content_hash: Some(test_content_hash),
                expression: None, // Only content_hash, expression not embedded
            }],
        }),
    };
    let commit_binary = definy_event::sign_and_serialize(commit_event, &signing_key).unwrap();

    // 6-a. SubmitEvent should return missing_content
    let submit_req = SubmitEventRequest {
        signed_event_bytes: commit_binary.clone(),
    };
    let res = handle_submit_event(
        database.clone(),
        ConnectInfo(client_addr),
        headers.clone(),
        Bytes::from(serde_json::to_vec(&submit_req).unwrap()),
    )
    .await;
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let submit_res: SubmitEventResponse = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(submit_res.status, "missing_content");
    assert_eq!(
        submit_res.missing_content_hashes,
        vec![test_hash_str.clone()]
    );

    // 6-b. CheckMissingHashes
    let check_req = CheckMissingHashesRequest {
        content_hashes: vec![test_hash_str.clone()],
    };
    let check_res = handle_check_missing_hashes(
        database.clone(),
        headers.clone(),
        Bytes::from(serde_json::to_vec(&check_req).unwrap()),
    )
    .await;
    assert_eq!(check_res.status(), StatusCode::OK);
    let check_bytes = axum::body::to_bytes(check_res.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let check_data: CheckMissingHashesResponse = serde_json::from_slice(&check_bytes).unwrap();
    assert_eq!(
        check_data.missing_content_hashes,
        vec![test_hash_str.clone()]
    );

    // 6-c. UploadContent
    let upload_req = UploadContentRequest {
        items: vec![ContentItem {
            content_hash: test_hash_str.clone(),
            content_bytes: test_content_bytes.clone(),
        }],
    };
    let upload_res = handle_upload_content(
        database.clone(),
        headers.clone(),
        Bytes::from(serde_json::to_vec(&upload_req).unwrap()),
    )
    .await;
    assert_eq!(upload_res.status(), StatusCode::OK);

    // 6-d. GetContent
    let get_content_req = GetContentRequest {
        content_hash: test_hash_str.clone(),
    };
    let get_c_res = handle_get_content(
        database.clone(),
        headers.clone(),
        Bytes::from(serde_json::to_vec(&get_content_req).unwrap()),
    )
    .await;
    assert_eq!(get_c_res.status(), StatusCode::OK);
    let get_c_bytes = axum::body::to_bytes(get_c_res.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let get_c_data: GetContentResponse = serde_json::from_slice(&get_c_bytes).unwrap();
    assert_eq!(get_c_data.item.unwrap().content_bytes, test_content_bytes);

    // 6-e. Re-submit: should now succeed with status "ok"
    let res2 = handle_submit_event(
        database.clone(),
        ConnectInfo(client_addr),
        headers.clone(),
        Bytes::from(serde_json::to_vec(&submit_req).unwrap()),
    )
    .await;
    assert_eq!(res2.status(), StatusCode::OK);
    let bytes2 = axum::body::to_bytes(res2.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let submit_res2: SubmitEventResponse = serde_json::from_slice(&bytes2).unwrap();
    assert_eq!(submit_res2.status, "ok");
    assert!(submit_res2.missing_content_hashes.is_empty());
}

#[tokio::test]
async fn test_connect_rpc_deploy_service_not_configured() {
    let state = AppState::test_state();
    let mut headers = HeaderMap::new();
    headers.insert(
        axum::http::header::CONTENT_TYPE,
        axum::http::HeaderValue::from_static("application/json"),
    );

    let deploy_req = DeployInstanceRequest {
        commit_hash: Some("test_hash_123".into()),
        machine_name: None,
        region: None,
        wasm_hash: None,
    };
    let body = Bytes::from(serde_json::to_vec(&deploy_req).unwrap());
    let res = handle_deploy_instance(State(state), headers, body).await;
    assert_eq!(res.status(), StatusCode::SERVICE_UNAVAILABLE);
}

#[tokio::test]
async fn test_connect_rpc_deploy_service_success() {
    use crate::fly_machines::{FlyConfig, FlyMachine, FlyMachineClient, FlyMachineConfig};
    use axum::extract::{Json, Path};
    use tokio::net::TcpListener;

    // 1. Mock fly.io Machines API
    let mock_app = axum::Router::new()
        .route(
            "/apps/{app}/machines",
            axum::routing::post(
                |Path(app): Path<String>,
                 Json(body): Json<crate::fly_machines::CreateMachineRequest>| async move {
                    assert_eq!(app, "definy-test-app");
                    if body.name.as_deref() == Some("test-wasm-machine") {
                        assert_eq!(body.config.files.len(), 1);
                        assert_eq!(body.config.files[0].guest_path, "/app/definy_core.wasm");
                        assert_eq!(
                            body.config.env.get("WASM_FILE"),
                            Some(&"/app/definy_core.wasm".to_string())
                        );
                    }
                    let id = match body.name.as_deref() {
                        Some("test-wasm-machine") => "m_test_wasm_1".to_string(),
                        _ => "m_test_999".to_string(),
                    };
                    let created = FlyMachine {
                        id,
                        name: body.name.unwrap_or_else(|| "auto-machine".to_string()),
                        state: "started".to_string(),
                        region: body.region.unwrap_or_else(|| "nrt".to_string()),
                        instance_id: Some("inst_test_999".to_string()),
                        private_ip: Some("fdaa::test".to_string()),
                        created_at: Some("2026-10-05T12:00:00Z".to_string()),
                        updated_at: Some("2026-10-05T12:00:00Z".to_string()),
                        config: body.config,
                    };
                    (StatusCode::CREATED, Json(created))
                },
            ),
        )
        .route(
            "/apps/{app}/machines/{id}",
            axum::routing::get(|Path((app, id)): Path<(String, String)>| async move {
                assert_eq!(app, "definy-test-app");
                assert_eq!(id, "m_test_999");
                let machine = FlyMachine {
                    id,
                    name: "auto-machine".to_string(),
                    state: "started".to_string(),
                    region: "nrt".to_string(),
                    instance_id: Some("inst_test_999".to_string()),
                    private_ip: Some("fdaa::test".to_string()),
                    created_at: Some("2026-10-05T12:00:00Z".to_string()),
                    updated_at: Some("2026-10-05T12:00:00Z".to_string()),
                    config: FlyMachineConfig {
                        image: "registry.fly.io/definy:latest".to_string(),
                        env: std::collections::HashMap::new(),
                        files: vec![],
                        services: vec![],
                        guest: None,
                        auto_destroy: Some(false),
                    },
                };
                (StatusCode::OK, Json(machine))
            }),
        );

    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to bind ephemeral port");
    let local_addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        axum::serve(listener, mock_app).await.unwrap();
    });

    let fly_config = FlyConfig::new("mock_token", "definy-test-app")
        .with_base_url(format!("http://{local_addr}"));
    let fly_client = FlyMachineClient::new(fly_config);

    let db = crate::db::init_db().await.unwrap();
    let state = AppState::new(Some(db), Some(fly_client));

    let mut headers = HeaderMap::new();
    headers.insert(
        axum::http::header::CONTENT_TYPE,
        axum::http::HeaderValue::from_static("application/json"),
    );

    // 2. DeployInstance
    let deploy_req = DeployInstanceRequest {
        commit_hash: Some("commit_sha_abc".into()),
        machine_name: Some("test-machine-1".into()),
        region: Some("nrt".into()),
        wasm_hash: None,
    };
    let deploy_body = Bytes::from(serde_json::to_vec(&deploy_req).unwrap());
    let deploy_res =
        handle_deploy_instance(State(state.clone()), headers.clone(), deploy_body).await;
    assert_eq!(deploy_res.status(), StatusCode::OK);

    let res_bytes = axum::body::to_bytes(deploy_res.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let deploy_data: DeployInstanceResponse = serde_json::from_slice(&res_bytes).unwrap();
    assert_eq!(deploy_data.machine_id, "m_test_999");
    assert_eq!(deploy_data.status, "started");
    assert_eq!(deploy_data.app_url, "https://definy-test-app.fly.dev");

    // 3. GetDeployStatus
    let status_req = GetDeployStatusRequest {
        machine_id: "m_test_999".into(),
    };
    let status_body = Bytes::from(serde_json::to_vec(&status_req).unwrap());
    let status_res =
        handle_get_deploy_status(State(state.clone()), headers.clone(), status_body).await;
    assert_eq!(status_res.status(), StatusCode::OK);

    let status_bytes = axum::body::to_bytes(status_res.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let status_data: GetDeployStatusResponse = serde_json::from_slice(&status_bytes).unwrap();
    assert_eq!(status_data.machine_id, "m_test_999");
    assert_eq!(status_data.status, "started");
    assert_eq!(status_data.region, "nrt");
    assert_eq!(status_data.url, "https://definy-test-app.fly.dev");

    // 4. Deploy with wasm_hash (Phase 3: Direct Wasm Injection via config.files)
    let test_wasm_bytes = b"\0asm\x01\0\0\0".to_vec();
    let wasm_hash = {
        let mut store = state.virtual_file_store.write().await;
        store.register_wasm(test_wasm_bytes.clone())
    };

    let wasm_deploy_req = DeployInstanceRequest {
        commit_hash: None,
        machine_name: Some("test-wasm-machine".into()),
        region: Some("nrt".into()),
        wasm_hash: Some(wasm_hash.clone()),
    };
    let wasm_deploy_body = Bytes::from(serde_json::to_vec(&wasm_deploy_req).unwrap());
    let wasm_deploy_res =
        handle_deploy_instance(State(state.clone()), headers.clone(), wasm_deploy_body).await;
    assert_eq!(wasm_deploy_res.status(), StatusCode::OK);

    // 5. ListDeployments (DB should have saved both deployment records!)
    let list_req = ListDeploymentsRequest { limit: Some(10) };
    let list_body = Bytes::from(serde_json::to_vec(&list_req).unwrap());
    let list_res = handle_list_deployments(State(state), headers, list_body).await;
    assert_eq!(list_res.status(), StatusCode::OK);

    let list_bytes = axum::body::to_bytes(list_res.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let list_data: ListDeploymentsResponse = serde_json::from_slice(&list_bytes).unwrap();
    assert_eq!(list_data.deployments.len(), 2);

    let wasm_deployment = list_data
        .deployments
        .iter()
        .find(|d| d.wasm_hash.as_deref() == Some(&wasm_hash))
        .expect("Virtual wasm deployment must be present in DB");
    assert_eq!(wasm_deployment.wasm_hash, Some(wasm_hash));
    assert_eq!(wasm_deployment.status, "started");
}
