use std::env;

use rand::Rng;

const TOKEN_QUERY_KEY: &str = "token";

#[tokio::main]
async fn main() {
    let addr = std::net::SocketAddr::V6(std::net::SocketAddrV6::new(
        std::net::Ipv6Addr::LOCALHOST,
        2520,
        0,
        0,
    ));

    let random_token: String = rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(30)
        .map(char::from)
        .collect();

    let server = hyper::Server::bind(&addr).serve(hyper::service::make_service_fn(|_conn| {
        let rv = random_token.clone();
        async {
            Ok::<_, std::convert::Infallible>(hyper::service::service_fn(move |request| {
                handle_request(request, rv.clone())
            }))
        }
    }));

    let url = url::Url::parse_with_params(
        &("http:".to_string() + &addr.to_string()),
        vec![(TOKEN_QUERY_KEY, random_token.clone())],
    )
    .expect("url build error");

    println!("definy desktop start!\ncopy and pase url in https://definy.app !.\n下のURLをコピーしてhttps://definy.app で貼り付けて接続できる \n\n{}\n", url);

    // Run this server for... forever!
    if let Err(e) = server.await {
        eprintln!("server error: {}", e);
    }

    println!("end?");
}

async fn handle_request(
    request: hyper::Request<hyper::Body>,
    token: String,
) -> Result<hyper::Response<hyper::Body>, url::ParseError> {
    let path_and_query = uri_to_path_and_query(request.uri());

    let origin_header_value = request
        .headers()
        .get(http::header::ORIGIN)
        .map(|v| v.to_str());

    let origin_value = match origin_header_value {
        Some(Ok(v)) => Some(v.clone().to_string()),
        _ => None,
    };
    handle_request_parsed(&path_and_query, &origin_value.as_deref(), &token).await
}

#[derive(Debug)]
struct PathAndQuery {
    path: String,
    query: std::collections::HashMap<String, String>,
}

fn uri_to_path_and_query(uri: &hyper::Uri) -> PathAndQuery {
    PathAndQuery {
        path: uri.path().to_string(),
        query: match uri.query() {
            Some(query_string) => {
                let r: std::collections::HashMap<String, String> =
                    url::form_urlencoded::parse(query_string.as_bytes())
                        .into_owned()
                        .collect();
                r
            }
            None => std::collections::HashMap::new(),
        },
    }
}

async fn handle_request_parsed(
    path_and_query: &PathAndQuery,
    origin: &Option<&str>,
    token: &str,
) -> Result<hyper::Response<hyper::Body>, url::ParseError> {
    println!("request path: {:?}", path_and_query);
    let token_by_url = { path_and_query.query.get(TOKEN_QUERY_KEY) };
    let is_equal_token = token_by_url == Some(&token.to_string());

    let mut handled_html = match path_and_query.path.as_str() {
        "/" => handle_html(is_equal_token),
        "/env" => handle_env(is_equal_token),
        _ => handle_html(is_equal_token),
    };

    let headers_mut = handled_html.headers_mut();
    let origin_header_value_result = http::HeaderValue::from_str(&origin_to_allow_origin(origin));
    match origin_header_value_result {
        Ok(origin_header_value) => {
            headers_mut.insert(
                http::header::ACCESS_CONTROL_ALLOW_ORIGIN,
                origin_header_value,
            );
        }
        Err(_) => {
            eprintln!(
                "ACCESS_CONTROL_ALLOW_ORIGIN を出力できなかった {:?}",
                origin_header_value_result
            )
        }
    };
    Ok(handled_html)
}

fn origin_to_allow_origin(origin_option: &Option<&str>) -> String {
    match origin_option {
        Some(origin) => {
            if origin.clone() == "http://localhost:3000" {
                return "http://localhost:3000".to_string();
            }
            if origin.ends_with("-narumincho.vercel.app") {
                return origin.to_string();
            }
            return "https://definy.app".to_string();
        }
        None => {
            return "https://definy.app".to_string();
        }
    }
}

fn handle_html(is_equal_token: bool) -> http::Response<hyper::Body> {
    let mut r = hyper::Response::new(hyper::Body::from(
        format!("<!doctype html>
<html lang=\"ja\">

<head>
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <title>definy desktop</title>
  <style>
    body {{
        background-color: black;
        color: white;
    }}

    a {{
        color: skyblue;
    }}
  </style>
</head>

<body>
  definy desktop. <a href=\"https://definy.app\">definy.app</a> からリクエストを受けてブラウザからアクセスできないAPIを呼び出すためのもの. 
  <div>{}</div>
</body>

</html>", if is_equal_token {"token が合っている!"} else {"token が合っていない..."})
    ));
    let headers_mut = r.headers_mut();
    headers_mut.insert(
        http::header::CONTENT_TYPE,
        http::HeaderValue::from_static("text/html"),
    );
    r
}

fn handle_env(is_equal_token: bool) -> http::Response<hyper::Body> {
    if !is_equal_token {
        let mut response = hyper::Response::new(hyper::Body::from("invalid token"));
        *response.status_mut() = http::status::StatusCode::UNAUTHORIZED;
        return response;
    }
    let envs: std::collections::HashMap<String, String> = env::vars().collect();
    let json_content: String = serde_json::json!(envs).to_string();
    let mut response = hyper::Response::new(hyper::Body::from(json_content));
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        http::HeaderValue::from_static("application/json"),
    );
    response
}
