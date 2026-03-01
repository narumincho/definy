use std::error::Error;
use std::net::SocketAddr;

use http_body_util::{BodyExt, Full};
use hyper::body::{Bytes, Incoming};
use hyper::http::Method;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::client::legacy::Client;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::rt::{TokioExecutor, TokioIo};
use narumincho_vdom::Route;
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

    let heading_text = webdriver.text_of(".not-found-title").await?;
    assert!(heading_text.contains("Page Not Found"));

    webdriver.click("a.cta-link").await?;
    webdriver
        .wait_for_url(&format!("{}/", test_server.base_url()))
        .await?;

    let title = webdriver.text_of("header h1").await?;
    assert_eq!(title, "definy");

    webdriver.close().await?;
    test_server.shutdown().await;

    Ok(())
}

struct WebDriverClient {
    base_url: String,
    session_id: String,
    client: Client<HttpConnector, Full<Bytes>>,
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
                    serde_json::json!(["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"]),
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

        let response = webdriver_request(&client, &base_url, Method::POST, "/session", Some(caps)).await?;

        let session_id = response
            .get("value")
            .and_then(|v| v.get("sessionId").and_then(serde_json::Value::as_str))
            .or_else(|| response.get("sessionId").and_then(serde_json::Value::as_str))
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
        let payload = serde_json::json!({ "url": url });
        let _ = webdriver_request(&self.client, &self.base_url, Method::POST, &path, Some(payload)).await?;
        Ok(())
    }

    async fn click(&self, css_selector: &str) -> Result<(), Box<dyn Error>> {
        let element_id = self.find_element(css_selector).await?;
        let path = format!("/session/{}/element/{}/click", self.session_id, element_id);
        let _ = webdriver_request(
            &self.client,
            &self.base_url,
            Method::POST,
            &path,
            Some(serde_json::json!({})),
        )
        .await?;
        Ok(())
    }

    async fn text_of(&self, css_selector: &str) -> Result<String, Box<dyn Error>> {
        let element_id = self.find_element(css_selector).await?;
        let path = format!("/session/{}/element/{}/text", self.session_id, element_id);
        let response = webdriver_request(&self.client, &self.base_url, Method::GET, &path, None).await?;
        let text = response
            .get("value")
            .and_then(serde_json::Value::as_str)
            .ok_or("missing element text in WebDriver response")?;
        Ok(text.to_string())
    }

    async fn wait_for_url(&self, expected: &str) -> Result<(), Box<dyn Error>> {
        for _ in 0..40 {
            if self.current_url().await? == expected {
                return Ok(());
            }
            sleep(Duration::from_millis(100)).await;
        }

        Err(format!("timed out waiting for URL: {expected}").into())
    }

    async fn close(&self) -> Result<(), Box<dyn Error>> {
        let path = format!("/session/{}", self.session_id);
        let _ = webdriver_request(&self.client, &self.base_url, Method::DELETE, &path, None).await;
        Ok(())
    }

    async fn current_url(&self) -> Result<String, Box<dyn Error>> {
        let path = format!("/session/{}/url", self.session_id);
        let response = webdriver_request(&self.client, &self.base_url, Method::GET, &path, None).await?;
        let current = response
            .get("value")
            .and_then(serde_json::Value::as_str)
            .ok_or("missing current URL in WebDriver response")?;
        Ok(current.to_string())
    }

    async fn find_element(&self, css_selector: &str) -> Result<String, Box<dyn Error>> {
        let path = format!("/session/{}/element", self.session_id);
        let response = webdriver_request(
            &self.client,
            &self.base_url,
            Method::POST,
            &path,
            Some(serde_json::json!({
                "using": "css selector",
                "value": css_selector,
            })),
        )
        .await?;

        let element = response
            .get("value")
            .and_then(|value| {
                value
                    .get("element-6066-11e4-a52e-4f735466cecf")
                    .or_else(|| value.get("ELEMENT"))
                    .and_then(serde_json::Value::as_str)
            })
            .ok_or("failed to find element id in WebDriver response")?;

        Ok(element.to_string())
    }
}

async fn webdriver_request(
    client: &Client<HttpConnector, Full<Bytes>>,
    base_url: &str,
    method: Method,
    path: &str,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, Box<dyn Error>> {
    let uri: hyper::Uri = format!("{}{}", base_url.trim_end_matches('/'), path).parse()?;
    let body_bytes = match payload {
        Some(value) => serde_json::to_vec(&value)?,
        None => Vec::new(),
    };

    let request = Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json")
        .body(Full::new(Bytes::from(body_bytes)))?;

    let response = client.request(request).await?;
    let status = response.status();
    let bytes = response.into_body().collect().await?.to_bytes();

    let parsed = if bytes.is_empty() {
        serde_json::json!({ "value": null })
    } else {
        serde_json::from_slice::<serde_json::Value>(&bytes)?
    };

    if !status.is_success() {
        return Err(format!("WebDriver request failed: {} {}", status, parsed).into());
    }

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
        let (shutdown_tx, mut shutdown_rx) = oneshot::channel();

        let join = tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = &mut shutdown_rx => {
                        break;
                    }
                    accept = listener.accept() => {
                        let Ok((stream, _)) = accept else {
                            continue;
                        };

                        tokio::spawn(async move {
                            let io = TokioIo::new(stream);
                            let service = service_fn(|request: Request<Incoming>| async move {
                                Ok::<_, hyper::http::Error>(render_html_response(request.uri().path()))
                            });

                            let _ = http1::Builder::new().serve_connection(io, service).await;
                        });
                    }
                }
            }
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
        let _ = self.join.await;
    }
}

fn render_html_response(path: &str) -> Response<Full<Bytes>> {
    let location = definy_ui::Location::from_url(path);
    let html = narumincho_vdom::to_html(&definy_ui::render(
        &definy_ui::AppState {
            login_or_create_account_dialog_state: definy_ui::LoginOrCreateAccountDialogState {
                generated_key: None,
                state: definy_ui::CreatingAccountState::LogIn,
                username: String::new(),
                current_password: String::new(),
            },
            created_account_events: vec![],
            current_key: None,
            expression_left_input: String::new(),
            expression_right_input: String::new(),
            selected_operator: definy_ui::ExpressionOperator::Add,
            message_eval_result: None,
            event_detail_eval_result: None,
            profile_name_input: String::new(),
            is_header_popover_open: false,
            location,
        },
        &None,
        None,
    ));

    Response::builder()
        .status(200)
        .header("Content-Type", "text/html; charset=utf-8")
        .body(Full::new(Bytes::from(html)))
        .expect("failed to build html response")
}
