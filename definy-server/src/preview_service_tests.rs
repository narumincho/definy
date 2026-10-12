use axum::http::StatusCode;
use chrono::Utc;
use definy_core::expression_eval::Value;
use definy_event::rpc::*;

use crate::preview_service::*;

static ENV_MUTEX: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

struct EnvGuard {
    key: &'static str,
    original: Option<String>,
}

impl EnvGuard {
    fn set(key: &'static str, val: &str) -> Self {
        let original = std::env::var(key).ok();
        unsafe { std::env::set_var(key, val) };
        Self { key, original }
    }

    fn unset(key: &'static str) -> Self {
        let original = std::env::var(key).ok();
        unsafe { std::env::remove_var(key) };
        Self { key, original }
    }
}

impl Drop for EnvGuard {
    fn drop(&mut self) {
        if let Some(ref val) = self.original {
            unsafe { std::env::set_var(self.key, val) };
        } else {
            unsafe { std::env::remove_var(self.key) };
        }
    }
}

#[test]
fn test_admin_account_authorization() {
    let _lock = ENV_MUTEX.blocking_lock();

    {
        let _g1 = EnvGuard::set(
            "DEFINY_ADMIN_ACCOUNT_ID",
            "0123456789abcdef,feedbeefcafebabe",
        );
        let _g2 = EnvGuard::unset("DEFINY_ADMIN_ACCOUNT_IDS");
        assert!(is_admin_account("0123456789abcdef"));
        assert!(is_admin_account("FEEDBEEFCAFEBABE")); // case insensitive
        assert!(!is_admin_account("unauthorized_user"));
        assert!(!is_admin_account(""));
    }

    // 未設定時は誰も許可されない
    {
        let _g1 = EnvGuard::unset("DEFINY_ADMIN_ACCOUNT_ID");
        let _g2 = EnvGuard::unset("DEFINY_ADMIN_ACCOUNT_IDS");
        assert!(!is_admin_account("0123456789abcdef"));
    }
}

#[test]
fn test_extract_subdomain_from_host() {
    let _lock = ENV_MUTEX.blocking_lock();

    {
        let _g = EnvGuard::set("DEFINY_ROOT_DOMAIN", "definy.workers.dev");
        assert_eq!(
            extract_subdomain_from_host("my-app.definy.workers.dev"),
            Some("my-app".to_string())
        );
        assert_eq!(
            extract_subdomain_from_host("my-app.definy.workers.dev:443"),
            Some("my-app".to_string())
        );
        assert_eq!(extract_subdomain_from_host("definy.workers.dev"), None);
        assert_eq!(extract_subdomain_from_host("other-domain.com"), None);
    }

    {
        let _g = EnvGuard::set("DEFINY_ROOT_DOMAIN", "definy.narumincho.com");
        assert_eq!(
            extract_subdomain_from_host("my-app-definy.narumincho.com"),
            Some("my-app".to_string())
        );
        assert_eq!(
            extract_subdomain_from_host("my-app-definy.narumincho.com:443"),
            Some("my-app".to_string())
        );
        assert_eq!(extract_subdomain_from_host("definy.narumincho.com"), None);
        assert_eq!(
            build_preview_url("my-app"),
            "https://my-app-definy.narumincho.com"
        );
    }

    // localhost
    assert_eq!(
        extract_subdomain_from_host("sample-web.localhost:8000"),
        Some("sample-web".to_string())
    );
    assert_eq!(
        extract_subdomain_from_host("sample-web.localhost"),
        Some("sample-web".to_string())
    );
    assert_eq!(extract_subdomain_from_host("localhost:8000"), None);
}

#[test]
fn test_preview_store_crud() {
    let mut store = PreviewAppStore::new();
    let app = PreviewApp {
        app_id: "demo".to_string(),
        display_name: "Demo App".to_string(),
        part_id: "part-1".to_string(),
        owner_account_id: "admin-1".to_string(),
        created_at: Utc::now(),
        subdomain: "demo".to_string(),
        wasm_bytes: None,
        cached_expression: None,
    };

    store.register(app.clone());
    assert!(store.get("demo").is_some());
    assert_eq!(store.list().len(), 1);

    let removed = store.remove("demo");
    assert!(removed.is_some());
    assert!(store.get("demo").is_none());
}

#[test]
fn test_value_to_json() {
    let val = Value::Record(vec![
        ("title".to_string(), Value::String("My App".to_string())),
        ("count".to_string(), Value::Number(42)),
        ("active".to_string(), Value::Bool(true)),
        (
            "items".to_string(),
            Value::List(vec![Value::Number(1), Value::Number(2)]),
        ),
        (
            "status".to_string(),
            Value::Variant {
                tag: "ok".to_string(),
                payload: Some(Box::new(Value::String("success".to_string()))),
            },
        ),
    ]);

    let json = value_to_json(&val);
    assert_eq!(json["title"], "My App");
    assert_eq!(json["count"], 42);
    assert_eq!(json["active"], true);
    assert_eq!(json["items"][0], 1);
    assert_eq!(json["status"]["tag"], "ok");
    assert_eq!(json["status"]["payload"], "success");
}

#[tokio::test]
async fn test_preview_connect_rpc_admin_permission_and_lifecycle() {
    use tower::ServiceExt;

    let _lock = ENV_MUTEX.lock().await;

    let admin_account = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    let non_admin_account = "9999999999abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    let _guard = EnvGuard::set("DEFINY_ADMIN_ACCOUNT_ID", admin_account);
    let app = crate::create_test_router();

    // 1. 非管理者による登録 -> 権限エラー (HTTP 403 / permission_denied)
    let unauthorized_req = RegisterPreviewAppRequest {
        app_id: "test-app".to_string(),
        display_name: "Test App".to_string(),
        part_id: "part-123".to_string(),
        account_id: non_admin_account.to_string(),
        signature: None,
        wasm_hash: None,
    };
    let req_body = serde_json::to_vec(&unauthorized_req).unwrap();
    let req = axum::http::Request::builder()
        .method("POST")
        .uri(PATH_REGISTER_PREVIEW_APP)
        .header(axum::http::header::CONTENT_TYPE, "application/json")
        .header("connect-protocol-version", "1")
        .body(axum::body::Body::from(req_body))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_ne!(res.status(), StatusCode::OK);
    let body_bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let err_json: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(err_json["code"], "permission_denied");

    // 2. 管理者による登録 -> 成功 (200 OK)
    let admin_req = RegisterPreviewAppRequest {
        app_id: "my-preview".to_string(),
        display_name: "My Preview App".to_string(),
        part_id: "part-web".to_string(),
        account_id: admin_account.to_string(),
        signature: None,
        wasm_hash: None,
    };
    let req_body = serde_json::to_vec(&admin_req).unwrap();
    let req = axum::http::Request::builder()
        .method("POST")
        .uri(PATH_REGISTER_PREVIEW_APP)
        .header(axum::http::header::CONTENT_TYPE, "application/json")
        .header("connect-protocol-version", "1")
        .body(axum::body::Body::from(req_body))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body_bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let register_res: RegisterPreviewAppResponse = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(register_res.app_id, "my-preview");
    assert_eq!(register_res.status, "running");

    // 3. 一覧取得 (ListPreviewApps)
    let list_req = ListPreviewAppsRequest { account_id: None };
    let req_body = serde_json::to_vec(&list_req).unwrap();
    let req = axum::http::Request::builder()
        .method("POST")
        .uri(PATH_LIST_PREVIEW_APPS)
        .header(axum::http::header::CONTENT_TYPE, "application/json")
        .header("connect-protocol-version", "1")
        .body(axum::body::Body::from(req_body))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body_bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let list_res: ListPreviewAppsResponse = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(list_res.apps.len(), 1);
    assert_eq!(list_res.apps[0].app_id, "my-preview");

    // 4. パスプレフィックス経由でプレビューアクセス (/preview/my-preview)
    let req = axum::http::Request::builder()
        .method("GET")
        .uri("/preview/my-preview")
        .body(axum::body::Body::empty())
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let headers = res.headers();
    assert_eq!(headers.get("X-Definy-Preview-App").unwrap(), "my-preview");

    // 5. サブドメイン経由でプレビューアクセス (Host: my-preview.localhost:8000)
    let req = axum::http::Request::builder()
        .method("GET")
        .uri("/")
        .header("host", "my-preview.localhost:8000")
        .body(axum::body::Body::empty())
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let headers = res.headers();
    assert_eq!(headers.get("X-Definy-Preview-App").unwrap(), "my-preview");

    // 6. アプリ停止 (StopPreviewApp)
    let stop_req = StopPreviewAppRequest {
        app_id: "my-preview".to_string(),
        account_id: admin_account.to_string(),
        signature: None,
    };
    let req_body = serde_json::to_vec(&stop_req).unwrap();
    let req = axum::http::Request::builder()
        .method("POST")
        .uri(PATH_STOP_PREVIEW_APP)
        .header(axum::http::header::CONTENT_TYPE, "application/json")
        .header("connect-protocol-version", "1")
        .body(axum::body::Body::from(req_body))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body_bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let stop_res: StopPreviewAppResponse = serde_json::from_slice(&body_bytes).unwrap();
    assert!(stop_res.success);

    // 停止後はプレビュー 404
    let req = axum::http::Request::builder()
        .method("GET")
        .uri("/preview/my-preview")
        .body(axum::body::Body::empty())
        .unwrap();

    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_self_hosted_definy_server_subdomain_and_routes() {
    use tower::ServiceExt;

    let _lock = ENV_MUTEX.lock().await;
    let admin_account = "local-dev-admin";
    let _guard = EnvGuard::set("DEFINY_ADMIN_ACCOUNT_ID", admin_account);

    let app = crate::create_test_router();

    // Register self-definy pointing to sample.self-hosted-definy-server
    let reg_req = RegisterPreviewAppRequest {
        app_id: "self-definy".to_string(),
        display_name: "Self-Hosted definy Studio".to_string(),
        part_id: "sample.self-hosted-definy-server".to_string(),
        account_id: admin_account.to_string(),
        signature: None,
        wasm_hash: None,
    };
    let req = axum::http::Request::builder()
        .method("POST")
        .uri(PATH_REGISTER_PREVIEW_APP)
        .header(axum::http::header::CONTENT_TYPE, "application/json")
        .header("connect-protocol-version", "1")
        .body(axum::body::Body::from(
            serde_json::to_vec(&reg_req).unwrap(),
        ))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 1. GET http://self-definy.localhost:8000/ -> Studio HTML with live compiler pipeline results
    let req_home = axum::http::Request::builder()
        .method("GET")
        .uri("/")
        .header("host", "self-definy.localhost:8000")
        .body(axum::body::Body::empty())
        .unwrap();
    let res_home = app.clone().oneshot(req_home).await.unwrap();
    assert_eq!(res_home.status(), StatusCode::OK);
    assert_eq!(
        res_home.headers().get("X-Definy-Preview-App").unwrap(),
        "self-definy"
    );
    assert_eq!(
        res_home.headers().get("x-powered-by").unwrap(),
        "definy-self-hosted"
    );
    let html_bytes = axum::body::to_bytes(res_home.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let html_str = String::from_utf8(html_bytes.to_vec()).unwrap();
    assert!(html_str.contains("Self-Hosted definy Studio"));
    assert!(
        html_str
            .contains("(((&lt;number&gt; + &lt;number&gt;) * &lt;number&gt;) + &lt;number&gt;)")
            || html_str.contains("(((<number> + <number>) * <number>) + <number>)")
    );
    assert!(html_str.contains("ok(number)"));
    assert!(html_str.contains("42 (verified: true)"));

    // 2. GET http://self-definy.localhost:8000/api/self-host -> JSON pipeline output
    let req_api = axum::http::Request::builder()
        .method("GET")
        .uri("/api/self-host")
        .header("host", "self-definy.localhost:8000")
        .body(axum::body::Body::empty())
        .unwrap();
    let res_api = app.clone().oneshot(req_api).await.unwrap();
    assert_eq!(res_api.status(), StatusCode::OK);
    let api_bytes = axum::body::to_bytes(res_api.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let api_json: serde_json::Value = serde_json::from_slice(&api_bytes).unwrap();
    assert_eq!(api_json["engine"], "definy-self-hosted");
    assert_eq!(api_json["method"], "GET");
    assert_eq!(api_json["path"], "/api/self-host");
    assert_eq!(
        api_json["sourceBefore"],
        "(((<number> + <number>) * <number>) + <number>)"
    );
    assert_eq!(api_json["sourceAfter"], "<number>");
    assert_eq!(api_json["typeCheck"], "ok(number)");
    assert_eq!(api_json["evaluatedValue"], 42);
    assert_eq!(api_json["selfHostingPipelineVerified"], true);

    // 3. GET http://self-definy.localhost:8000/healthz -> JSON health status
    let req_health = axum::http::Request::builder()
        .method("GET")
        .uri("/healthz")
        .header("host", "self-definy.localhost:8000")
        .body(axum::body::Body::empty())
        .unwrap();
    let res_health = app.oneshot(req_health).await.unwrap();
    assert_eq!(res_health.status(), StatusCode::OK);
    let health_bytes = axum::body::to_bytes(res_health.into_body(), 1024 * 1024)
        .await
        .unwrap();
    let health_json: serde_json::Value = serde_json::from_slice(&health_bytes).unwrap();
    assert_eq!(health_json["status"], "ok");
    assert_eq!(health_json["service"], "self-hosted-definy-server");
    assert_eq!(health_json["selfHostingPipelineVerified"], true);
}
