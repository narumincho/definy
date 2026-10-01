use std::error::Error;
use std::net::SocketAddr;

use http_body_util::Full;
use hyper::body::Bytes;
use hyper::http::Method;
use hyper_util::client::legacy::Client;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::rt::TokioExecutor;
use serde::Deserialize;
use tokio::net::TcpListener;
use tokio::sync::oneshot;
use tokio::time::{Duration, sleep};

#[tokio::test(flavor = "multi_thread")]
#[ignore = "requires running WebDriver (chromedriver/geckodriver/selenium) at WEBDRIVER_URL"]
async fn browser_can_render_and_navigate() -> Result<(), Box<dyn Error>> {
    let test_server = TestServer::spawn().await?;

    let webdriver_url =
        std::env::var("WEBDRIVER_URL").unwrap_or_else(|_| "http://localhost:4444".to_string());
    let browser_name = std::env::var("E2E_BROWSER").unwrap_or_else(|_| "chrome".to_string());

    let webdriver = WebDriverClient::new(webdriver_url, browser_name).await?;

    webdriver
        .goto(&format!("{}/unknown-page", test_server.base_url()))
        .await?;

    let heading_text = webdriver.text_content_of(".not-found-title").await?;
    if !heading_text.contains("Page Not Found")
        && !heading_text.contains("ページが見つかりません")
        && !heading_text.contains("Paĝo ne trovita")
    {
        let logs = webdriver.browser_logs().await.unwrap_or_default();
        let source = webdriver.page_source().await.unwrap_or_default();
        panic!(
            "unexpected not-found heading. heading_text={:?} logs={:?} source_snippet={}",
            heading_text,
            logs,
            snippet(&source)
        );
    }

    sleep(Duration::from_millis(500)).await;
    webdriver.click("a.cta-link").await?;
    webdriver
        .wait_for_url(&format!("{}/", test_server.base_url()))
        .await?;

    let title = webdriver.text_content_of("header h1").await?;
    assert_eq!(title, "definy");

    sleep(Duration::from_millis(600)).await;
    let logs = webdriver.browser_logs().await?;
    let console_errors: Vec<_> = logs
        .iter()
        .filter(|l| {
            (l.level.eq_ignore_ascii_case("SEVERE") || l.level.eq_ignore_ascii_case("ERROR"))
                && !l.message.contains("_dioxus")
        })
        .collect();
    let has_node_not_found = logs
        .iter()
        .any(|l| l.message.contains("Node not found at path"));
    assert!(
        !has_node_not_found,
        "Console error: Node not found at path. Logs: {:?}",
        logs
    );
    assert!(
        console_errors.is_empty(),
        "Browser console errors detected: {:?}",
        console_errors
    );

    webdriver.close().await?;
    test_server.shutdown().await;

    Ok(())
}

async fn setup_e2e_session() -> Result<(TestServer, WebDriverClient), Box<dyn Error>> {
    let test_server = TestServer::spawn().await?;
    let webdriver_url =
        std::env::var("WEBDRIVER_URL").unwrap_or_else(|_| "http://localhost:4444".to_string());
    let browser_name = std::env::var("E2E_BROWSER").unwrap_or_else(|_| "chrome".to_string());

    let webdriver = WebDriverClient::new(webdriver_url, browser_name).await?;
    Ok((test_server, webdriver))
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "requires running WebDriver (chromedriver/geckodriver/selenium) at WEBDRIVER_URL"]
async fn browser_unauthenticated_can_create_and_evaluate_expression() -> Result<(), Box<dyn Error>>
{
    let (test_server, webdriver) = setup_e2e_session().await?;

    webdriver
        .goto(&format!("{}/parts", test_server.base_url()))
        .await?;
    webdriver.wait_for_client_ready().await?;

    // クリック: "+ パーツを作成" / "+ Create Part"
    let open_form_script = r#"
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.includes('パーツを作成') || b.textContent.includes('Create Part') || b.textContent.includes('Krei'));
        if (btn) {
            btn.click();
            return true;
        }
        return false;
    "#;
    let opened = webdriver.execute_script(open_form_script, vec![]).await?;
    assert!(
        opened.as_bool().unwrap_or(false),
        "Create Part button not found"
    );
    sleep(Duration::from_millis(400)).await;

    // フォームが開いたことを確認 (part-name input が現れる)
    let _ = webdriver.find_element("input[name=\"part-name\"]").await?;

    // テンプレート "0 (Number)" をクリック
    let template_0_script = r#"
        const btns = Array.from(document.querySelectorAll('button'));
        const btn0 = btns.find(b => b.textContent.includes('0 (Number)'));
        if (btn0) { btn0.click(); return true; }
        return false;
    "#;
    let clicked = webdriver.execute_script(template_0_script, vec![]).await?;
    assert!(
        clicked.as_bool().unwrap_or(false),
        "Template '0 (Number)' button not found"
    );
    sleep(Duration::from_millis(400)).await;

    // "▶ 評価" / "Evaluate" ボタンをクリック
    let eval_btn_script = r#"
        const btns = Array.from(document.querySelectorAll('button'));
        const evalBtn = btns.find(b => b.textContent.includes('評価') || b.textContent.includes('Evaluate') || b.textContent.includes('Taksi'));
        if (evalBtn) { evalBtn.click(); return true; }
        return false;
    "#;
    let eval_clicked = webdriver.execute_script(eval_btn_script, vec![]).await?;
    assert!(
        eval_clicked.as_bool().unwrap_or(false),
        "Evaluate button not found in form"
    );
    sleep(Duration::from_millis(500)).await;

    // 評価結果 "結果: 0" または "Result: 0" が画面内に表示されることを検証
    let result_text = webdriver
        .wait_for_text_contains(
            "[data-eval-result=\"true\"]",
            &["Result: 0", "結果: 0", "Rezulto: 0"],
        )
        .await?;
    assert!(
        result_text.contains('0'),
        "Unexpected evaluation result text: {}",
        result_text
    );

    // 未ログインで「作成」ボタンをクリックしたときにエラーが表示されることを検証
    let create_submit_script = r#"
        const btns = Array.from(document.querySelectorAll('button'));
        const createBtn = btns.find(b => b.textContent.trim() === '作成' || b.textContent.trim() === 'Create' || b.textContent.trim() === 'Krei');
        if (createBtn) { createBtn.click(); return true; }
        return false;
    "#;
    let submit_clicked = webdriver
        .execute_script(create_submit_script, vec![])
        .await?;
    assert!(
        submit_clicked.as_bool().unwrap_or(false),
        "Create submit button not found"
    );
    sleep(Duration::from_millis(400)).await;

    // エラーメッセージが表示されたことを検証
    let _ = webdriver
        .wait_for_text_contains(
            "[data-eval-result=\"true\"]",
            &["log in", "ログイン", "ensalutu"],
        )
        .await?;

    // ブラウザコンソールエラーなし
    webdriver.assert_no_console_errors().await?;

    webdriver.close().await?;
    test_server.shutdown().await;
    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "requires running WebDriver (chromedriver/geckodriver/selenium) at WEBDRIVER_URL"]
async fn browser_unauthenticated_can_edit_and_evaluate_part_detail() -> Result<(), Box<dyn Error>> {
    let (test_server, webdriver) = setup_e2e_session().await?;

    webdriver
        .goto(&format!("{}/parts", test_server.base_url()))
        .await?;
    webdriver.wait_for_client_ready().await?;

    // パーツ一覧からパーツ詳細リンクをクリック
    let first_part_script = r#"
        const links = Array.from(document.querySelectorAll('a[href*="/parts/"]'));
        if (links.length > 0) {
            links[0].click();
            return true;
        }
        return false;
    "#;
    let link_clicked = webdriver.execute_script(first_part_script, vec![]).await?;
    assert!(
        link_clicked.as_bool().unwrap_or(false),
        "No part links found on /parts"
    );
    sleep(Duration::from_millis(600)).await;

    // 詳細画面に移動したことを検証 (URL またはヘッダー)
    let _ = webdriver
        .find_element("input[name=\"part-update-name\"]")
        .await?;

    // 式カードヘッダーの「▶ 評価」ボタンをクリック
    let eval_click_script = r#"
        const btns = Array.from(document.querySelectorAll('button'));
        const evalBtn = btns.find(b => b.textContent.includes('評価') || b.textContent.includes('Evaluate') || b.textContent.includes('Taksi'));
        if (evalBtn) { evalBtn.click(); return true; }
        return false;
    "#;
    let eval_clicked = webdriver.execute_script(eval_click_script, vec![]).await?;
    assert!(
        eval_clicked.as_bool().unwrap_or(false),
        "Evaluate button not found on part detail page"
    );
    sleep(Duration::from_millis(500)).await;

    // 評価結果が表示されることを検証
    let result_text = webdriver
        .wait_for_text_contains(
            "[data-eval-result=\"true\"]",
            &["Result:", "結果:", "Rezulto:"],
        )
        .await?;
    assert!(!result_text.is_empty(), "Evaluation result is empty");

    // 未ログイン表示バッジが存在することを検証
    let page_source = webdriver.page_source().await?;
    let has_badge = page_source.contains("未ログインでも自由に編集・評価可能")
        || page_source.contains("Editable & Evaluatable without login")
        || page_source.contains("Redaktebla kaj taksebla sen ensaluto");
    assert!(
        has_badge,
        "Badge indicating editable/evaluatable without login was not found"
    );

    // ブラウザコンソールエラーなし
    webdriver.assert_no_console_errors().await?;

    webdriver.close().await?;
    test_server.shutdown().await;
    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "requires running WebDriver (chromedriver/geckodriver/selenium) at WEBDRIVER_URL"]
async fn browser_login_dialog_toggle_password_and_error() -> Result<(), Box<dyn Error>> {
    let (test_server, webdriver) = setup_e2e_session().await?;

    webdriver
        .goto(&format!("{}/parts", test_server.base_url()))
        .await?;
    webdriver.wait_for_client_ready().await?;

    // ログインダイアログを開く (commandfor="login-or-create-account-dialog")
    let open_dialog_script = r#"
        const btn = document.querySelector('button[commandfor="login-or-create-account-dialog"]');
        if (btn) {
            btn.click();
            return true;
        }
        const dialog = document.getElementById('login-or-create-account-dialog');
        if (dialog && typeof dialog.showModal === 'function') {
            dialog.showModal();
            return true;
        }
        return false;
    "#;
    let mut opened = false;
    for _ in 0..40 {
        if let Ok(res) = webdriver.execute_script(open_dialog_script, vec![]).await {
            if res.as_bool().unwrap_or(false) {
                opened = true;
                break;
            }
        }
        sleep(Duration::from_millis(100)).await;
    }
    assert!(opened, "Could not open login dialog");
    sleep(Duration::from_millis(400)).await;

    // password input の初期 type が "password" であることを確認
    let initial_type = webdriver
        .attribute_of("input[name=\"password\"]", "type")
        .await?;
    assert_eq!(
        initial_type, "password",
        "Initial password input type must be 'password'"
    );

    // パスワード表示トグルボタン (👁 / 🙈) をクリック
    let toggle_script = r#"
        const dialog = document.getElementById('login-or-create-account-dialog');
        const btns = Array.from(dialog.querySelectorAll('button'));
        const toggleBtn = btns.find(b => b.textContent.includes('👁') || b.textContent.includes('🙈'));
        if (toggleBtn) {
            toggleBtn.click();
            return true;
        }
        return false;
    "#;
    let toggled = webdriver.execute_script(toggle_script, vec![]).await?;
    assert!(
        toggled.as_bool().unwrap_or(false),
        "Password visibility toggle button not found"
    );
    sleep(Duration::from_millis(200)).await;

    // type が "text" に変化したことを確認
    let toggled_type = webdriver
        .attribute_of("input[name=\"password\"]", "type")
        .await?;
    assert_eq!(
        toggled_type, "text",
        "Password input type should toggle to 'text'"
    );

    // 再度クリックして "password" に戻ることを確認
    let _ = webdriver.execute_script(toggle_script, vec![]).await?;
    sleep(Duration::from_millis(200)).await;
    let restored_type = webdriver
        .attribute_of("input[name=\"password\"]", "type")
        .await?;
    assert_eq!(
        restored_type, "password",
        "Password input type should toggle back to 'password'"
    );

    // 不正な秘密鍵を入力
    webdriver
        .type_keys("input[name=\"password\"]", "invalid_key_input_test")
        .await?;
    sleep(Duration::from_millis(200)).await;

    // ログインフォームを送信
    let submit_login_script = r#"
        const dialog = document.getElementById('login-or-create-account-dialog');
        const submitBtn = dialog.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.click();
            return true;
        }
        return false;
    "#;
    let login_submitted = webdriver
        .execute_script(submit_login_script, vec![])
        .await?;
    assert!(
        login_submitted.as_bool().unwrap_or(false),
        "Login submit button not found"
    );
    sleep(Duration::from_millis(400)).await;

    // エラーメッセージが表示されたことを検証
    let dialog_text = webdriver
        .text_content_of("#login-or-create-account-dialog")
        .await?;
    let has_error = dialog_text.contains("Invalid secret key format")
        || dialog_text.contains("秘密鍵の形式が無効です")
        || dialog_text.contains("Nevalida sekreta ŝlosilformato");
    assert!(
        has_error,
        "Expected secret key error message in dialog, got: {}",
        dialog_text
    );

    // ブラウザコンソールエラーなし
    webdriver.assert_no_console_errors().await?;

    webdriver.close().await?;
    test_server.shutdown().await;
    Ok(())
}

struct WebDriverClient {
    base_url: String,
    session_id: String,
    client: Client<HttpConnector, Full<Bytes>>,
}

#[derive(Debug, Deserialize)]
struct WebDriverLogEntry {
    level: String,
    message: String,
    #[allow(dead_code)]
    timestamp: f64,
}

impl WebDriverClient {
    async fn new(base_url: String, browser_name: String) -> Result<Self, Box<dyn Error>> {
        let connector = HttpConnector::new();
        let client = Client::builder(TokioExecutor::new()).build(connector);

        let chrome_binary = std::env::var("E2E_CHROME_BINARY").ok().or_else(|| {
            let default_mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
            if std::path::Path::new(default_mac).exists() {
                Some(default_mac.to_string())
            } else {
                None
            }
        });

        let caps = match browser_name.as_str() {
            "firefox" => serde_json::json!({
                "capabilities": {
                    "alwaysMatch": {
                        "browserName": "firefox",
                        "moz:firefoxOptions": {
                            "args": ["-headless"]
                        }
                    }
                }
            }),
            "safari" => serde_json::json!({
                "capabilities": {
                    "alwaysMatch": {
                        "browserName": "safari"
                    }
                }
            }),
            _ => {
                let mut chrome_options = serde_json::Map::new();
                chrome_options.insert(
                    "args".to_string(),
                    serde_json::json!([
                        "--headless=new",
                        "--no-sandbox",
                        "--disable-dev-shm-usage"
                    ]),
                );
                if let Some(binary) = chrome_binary {
                    chrome_options.insert("binary".to_string(), serde_json::json!(binary));
                }
                serde_json::json!({
                    "capabilities": {
                        "alwaysMatch": {
                            "browserName": "chrome",
                            "goog:chromeOptions": chrome_options
                        }
                    }
                })
            }
        };

        let response =
            webdriver_request(&client, &base_url, Method::POST, "/session", Some(caps)).await?;

        let session_id = response
            .get("value")
            .and_then(|v| v.get("sessionId").and_then(serde_json::Value::as_str))
            .or_else(|| {
                response
                    .get("sessionId")
                    .and_then(serde_json::Value::as_str)
            })
            .ok_or("failed to create WebDriver session")?
            .to_string();

        Ok(Self {
            base_url,
            session_id,
            client,
        })
    }

    async fn goto(&self, url: &str) -> Result<(), Box<dyn Error>> {
        let path = format!("/session/{}/url", self.session_id);
        let body = serde_json::json!({ "url": url });
        webdriver_request(
            &self.client,
            &self.base_url,
            Method::POST,
            &path,
            Some(body),
        )
        .await?;
        Ok(())
    }

    async fn wait_for_client_ready(&self) -> Result<(), Box<dyn Error>> {
        for _ in 0..50 {
            let res = self
                .execute_script(
                    "return Boolean(document.body && document.body.getAttribute('data-client-ready') === 'true');",
                    vec![],
                )
                .await;
            if let Ok(val) = res
                && val.as_bool().unwrap_or(false)
            {
                return Ok(());
            }
            sleep(Duration::from_millis(100)).await;
        }
        Err("timed out waiting for client ready (data-client-ready attribute)".into())
    }

    async fn click(&self, selector: &str) -> Result<(), Box<dyn Error>> {
        let element_id = self.find_element(selector).await?;
        let path = format!("/session/{}/element/{}/click", self.session_id, element_id);
        webdriver_request(
            &self.client,
            &self.base_url,
            Method::POST,
            &path,
            Some(serde_json::json!({})),
        )
        .await?;
        Ok(())
    }

    async fn text_content_of(&self, selector: &str) -> Result<String, Box<dyn Error>> {
        let element_id = self.find_element(selector).await?;
        let path = format!("/session/{}/element/{}/text", self.session_id, element_id);
        let res = webdriver_request(&self.client, &self.base_url, Method::GET, &path, None).await?;
        let text = res
            .get("value")
            .and_then(serde_json::Value::as_str)
            .unwrap_or_default()
            .to_string();
        Ok(text)
    }

    async fn find_element(&self, selector: &str) -> Result<String, Box<dyn Error>> {
        let path = format!("/session/{}/element", self.session_id);
        let body = serde_json::json!({
            "using": "css selector",
            "value": selector
        });

        for _ in 0..40 {
            if let Ok(res) = webdriver_request(
                &self.client,
                &self.base_url,
                Method::POST,
                &path,
                Some(body.clone()),
            )
            .await
                && let Some(id) = parse_element_id(&res)
            {
                return Ok(id);
            }
            sleep(Duration::from_millis(100)).await;
        }

        Err(format!("element not found by selector: {}", selector).into())
    }

    async fn page_source(&self) -> Result<String, Box<dyn Error>> {
        let path = format!("/session/{}/source", self.session_id);
        let res = webdriver_request(&self.client, &self.base_url, Method::GET, &path, None).await?;
        let src = res
            .get("value")
            .and_then(serde_json::Value::as_str)
            .unwrap_or_default()
            .to_string();
        Ok(src)
    }

    async fn browser_logs(&self) -> Result<Vec<WebDriverLogEntry>, Box<dyn Error>> {
        let path = format!("/session/{}/se/log", self.session_id);
        let body = serde_json::json!({ "type": "browser" });
        if let Ok(res) = webdriver_request(
            &self.client,
            &self.base_url,
            Method::POST,
            &path,
            Some(body),
        )
        .await
            && let Some(items) = res.get("value").and_then(serde_json::Value::as_array)
        {
            let parsed: Vec<WebDriverLogEntry> = items
                .iter()
                .filter_map(|item| serde_json::from_value(item.clone()).ok())
                .collect();
            return Ok(parsed);
        }
        Ok(Vec::new())
    }

    async fn wait_for_url(&self, expected_url: &str) -> Result<(), Box<dyn Error>> {
        let path = format!("/session/{}/url", self.session_id);
        for _ in 0..40 {
            if let Ok(res) =
                webdriver_request(&self.client, &self.base_url, Method::GET, &path, None).await
                && let Some(current_url) = res.get("value").and_then(serde_json::Value::as_str)
                && url_matches_expected(expected_url, current_url)
            {
                return Ok(());
            }
            sleep(Duration::from_millis(100)).await;
        }

        Err(format!("timed out waiting for url: {}", expected_url).into())
    }

    async fn execute_script(
        &self,
        script: &str,
        args: Vec<serde_json::Value>,
    ) -> Result<serde_json::Value, Box<dyn Error>> {
        let path = format!("/session/{}/execute/sync", self.session_id);
        let body = serde_json::json!({
            "script": script,
            "args": args
        });
        let res = webdriver_request(
            &self.client,
            &self.base_url,
            Method::POST,
            &path,
            Some(body),
        )
        .await?;
        Ok(res.get("value").cloned().unwrap_or(serde_json::Value::Null))
    }

    async fn type_keys(&self, selector: &str, text: &str) -> Result<(), Box<dyn Error>> {
        let element_id = self.find_element(selector).await?;
        let path = format!("/session/{}/element/{}/value", self.session_id, element_id);
        let body = serde_json::json!({
            "text": text,
            "value": text.chars().map(|c| c.to_string()).collect::<Vec<_>>()
        });
        webdriver_request(
            &self.client,
            &self.base_url,
            Method::POST,
            &path,
            Some(body),
        )
        .await?;
        Ok(())
    }

    async fn attribute_of(
        &self,
        selector: &str,
        attribute: &str,
    ) -> Result<String, Box<dyn Error>> {
        let element_id = self.find_element(selector).await?;
        let script = format!(
            "return arguments[0].getAttribute('{}');",
            attribute.replace('\'', "\\'")
        );
        let element_val = serde_json::json!({
            "element-6066-11e4-a52e-4f735466cecf": element_id
        });
        let res = self.execute_script(&script, vec![element_val]).await?;
        Ok(res.as_str().unwrap_or_default().to_string())
    }

    async fn wait_for_text_contains(
        &self,
        selector: &str,
        candidates: &[&str],
    ) -> Result<String, Box<dyn Error>> {
        let script = format!(
            r#"
            const els = Array.from(document.querySelectorAll('{}'));
            return els.map(e => e.innerText || e.textContent || '');
            "#,
            selector.replace('\'', "\\'")
        );
        for _ in 0..40 {
            if let Ok(val) = self.execute_script(&script, vec![]).await {
                if let Some(arr) = val.as_array() {
                    for item in arr {
                        let text = item.as_str().unwrap_or_default();
                        if candidates.iter().any(|c| text.contains(c)) {
                            return Ok(text.to_string());
                        }
                    }
                }
            }
            sleep(Duration::from_millis(150)).await;
        }
        let all_texts = self
            .execute_script(&script, vec![])
            .await
            .ok()
            .and_then(|v| v.as_array().cloned())
            .unwrap_or_default()
            .into_iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect::<Vec<_>>()
            .join(" | ");
        Err(format!(
            "timed out waiting for selector '{}' to contain any of {:?}, current texts: '{}'",
            selector, candidates, all_texts
        )
        .into())
    }

    async fn assert_no_console_errors(&self) -> Result<(), Box<dyn Error>> {
        let logs = self.browser_logs().await?;
        let console_errors: Vec<_> = logs
            .iter()
            .filter(|l| {
                (l.level.eq_ignore_ascii_case("SEVERE") || l.level.eq_ignore_ascii_case("ERROR"))
                    && !l.message.contains("_dioxus")
            })
            .collect();
        assert!(
            console_errors.is_empty(),
            "Browser console errors detected: {:?}",
            console_errors
        );
        Ok(())
    }

    async fn close(self) -> Result<(), Box<dyn Error>> {
        let path = format!("/session/{}", self.session_id);
        let _ = webdriver_request(&self.client, &self.base_url, Method::DELETE, &path, None).await;
        Ok(())
    }
}

fn parse_element_id(value: &serde_json::Value) -> Option<String> {
    const W3C_ELEMENT_KEY: &str = "element-6066-11e4-a52e-4f735466cecf";
    let val_obj = value.get("value")?.as_object()?;
    val_obj
        .get(W3C_ELEMENT_KEY)
        .and_then(serde_json::Value::as_str)
        .map(ToString::to_string)
}

fn snippet(s: &str) -> String {
    let mut out = String::new();
    for line in s.lines().take(30) {
        out.push_str(line);
        out.push('\n');
    }
    out
}

fn url_matches_expected(expected: &str, current: &str) -> bool {
    if current == expected {
        return true;
    }
    if let Some(rest) = current.strip_prefix(expected)
        && (rest.starts_with('?') || rest.starts_with('#'))
    {
        return true;
    }
    false
}

async fn webdriver_request(
    client: &Client<HttpConnector, Full<Bytes>>,
    base_url: &str,
    method: Method,
    path: &str,
    body: Option<serde_json::Value>,
) -> Result<serde_json::Value, Box<dyn Error>> {
    let url = format!("{}{}", base_url, path);
    let mut builder = hyper::Request::builder().method(method).uri(url);

    let body_bytes = if let Some(json_value) = body {
        builder = builder.header("Content-Type", "application/json");
        Bytes::from(serde_json::to_vec(&json_value)?)
    } else {
        Bytes::new()
    };

    let request = builder.body(Full::new(body_bytes))?;
    let response = client.request(request).await?;
    let body_bytes = http_body_util::BodyExt::collect(response.into_body())
        .await?
        .to_bytes();
    let parsed: serde_json::Value = serde_json::from_slice(&body_bytes)?;

    if let Some(error_obj) = parsed
        .get("value")
        .and_then(serde_json::Value::as_object)
        .and_then(|value| value.get("error"))
    {
        return Err(format!("WebDriver returned error: {}", error_obj).into());
    }

    Ok(parsed)
}

struct TestServer {
    addr: SocketAddr,
    shutdown_tx: Option<oneshot::Sender<()>>,
    join: tokio::task::JoinHandle<()>,
}

impl TestServer {
    async fn spawn() -> Result<Self, Box<dyn Error>> {
        let listener = TcpListener::bind(("127.0.0.1", 0)).await?;
        let addr = listener.local_addr()?;
        let (shutdown_tx, shutdown_rx) = oneshot::channel();

        let app = definy_server::create_test_router();

        let join = tokio::spawn(async move {
            let server = axum::serve(
                listener,
                app.into_make_service_with_connect_info::<SocketAddr>(),
            )
            .with_graceful_shutdown(async move {
                let _ = shutdown_rx.await;
            });
            let _ = server.await;
        });

        Ok(Self {
            addr,
            shutdown_tx: Some(shutdown_tx),
            join,
        })
    }

    fn base_url(&self) -> String {
        format!("http://{}", self.addr)
    }

    async fn shutdown(mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
        self.join.abort();
        let _ = self.join.await;
    }
}

#[test]
fn wait_url_match_allows_query_or_fragment() {
    assert!(url_matches_expected(
        "http://127.0.0.1:1234/",
        "http://127.0.0.1:1234/"
    ));
    assert!(url_matches_expected(
        "http://127.0.0.1:1234/",
        "http://127.0.0.1:1234/?lang=en"
    ));
    assert!(url_matches_expected(
        "http://127.0.0.1:1234/",
        "http://127.0.0.1:1234/#top"
    ));
    assert!(!url_matches_expected(
        "http://127.0.0.1:1234/",
        "http://127.0.0.1:1234/unknown-page"
    ));
}

#[tokio::test]
async fn test_server_serves_js_wasm_and_snippets_with_proper_mime_types()
-> Result<(), Box<dyn Error>> {
    let js = definy_server::resolve_client_js();
    let wasm = definy_server::resolve_client_wasm();

    if js.is_none() || wasm.is_none() {
        eprintln!(
            "Skipping test: client assets not built. Run 'dx build --package definy-client' first."
        );
        return Ok(());
    }

    let js = js.unwrap();
    let wasm = wasm.unwrap();

    let server = TestServer::spawn().await?;
    let client = hyper_util::client::legacy::Client::builder(hyper_util::rt::TokioExecutor::new())
        .build_http::<http_body_util::Empty<hyper::body::Bytes>>();

    // Check JS bundle by hash
    let js_url = format!("{}/{}", server.base_url(), js.hash);
    let js_res = client.get(js_url.parse()?).await?;
    assert_eq!(js_res.status(), 200);
    assert_eq!(
        js_res.headers().get("content-type").unwrap(),
        "application/javascript; charset=utf-8"
    );

    // Check WASM bundle by hash
    let wasm_url = format!("{}/{}", server.base_url(), wasm.hash);
    let wasm_res = client.get(wasm_url.parse()?).await?;
    assert_eq!(wasm_res.status(), 200);
    assert_eq!(
        wasm_res.headers().get("content-type").unwrap(),
        "application/wasm"
    );

    // Check all snippets
    let snippets = definy_server::resolve_snippets_list();
    for path in snippets {
        let snippet_url = format!("{}/snippets/{}", server.base_url(), path);
        let snippet_res = client.get(snippet_url.parse()?).await?;
        assert_eq!(snippet_res.status(), 200, "Failed for snippet: {path}");
        assert_eq!(
            snippet_res.headers().get("content-type").unwrap(),
            "application/javascript; charset=utf-8",
            "MIME mismatch for {path}"
        );
    }

    server.shutdown().await;
    Ok(())
}
