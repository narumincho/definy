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
    if !heading_text.contains("Page Not Found") {
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

        let chrome_binary = std::env::var("E2E_CHROME_BINARY").ok();

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
