use rand::Rng;

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

    let make_svc = hyper::service::make_service_fn(|_conn| async {
        Ok::<_, std::convert::Infallible>(hyper::service::service_fn(handle_request))
    });

    let server = hyper::Server::bind(&addr).serve(make_svc);

    let uri_result = url::Url::parse_with_params(
        &("http:".to_string() + &addr.to_string()),
        vec![("token", random_token)],
    );

    match uri_result {
        Ok(uri) => {
            println!("definy desktop start!\ncopy and pase url in https://definy.app !.\n下のURLをコピーしてhttps://definy.app で貼り付けて接続できる \n\n{}\n", uri);

            // Run this server for... forever!
            if let Err(e) = server.await {
                eprintln!("server error: {}", e);
            }
        }
        Err(err) => {
            eprintln!("url build error: {}", err);
        }
    }
}

async fn handle_request(
    request: hyper::Request<hyper::Body>,
) -> Result<hyper::Response<hyper::Body>, std::convert::Infallible> {
    let path = request.uri().path();
    println!("request path: {}", path);
    println!("request body: {:?}", request.body());
    let mut r = hyper::Response::new(hyper::Body::from(
        "<!doctype html>
<html lang=\"ja\">

<head>
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <title>definy desktop</title>
  <style>
    body {
        background-color: black;
        color: white;
    }

    a {
        color: skyblue;
    }
  </style>
</head>

<body>
  definy desktop. <a href=\"https://definy.app\">definy.app</a> からリクエストを受けてブラウザからアクセスできないAPIを呼び出すためのもの.
</body>

</html>",
    ));
    let headers_mut = r.headers_mut();
    headers_mut.insert(
        http::header::CONTENT_TYPE,
        http::HeaderValue::from_static("text/html"),
    );
    headers_mut.insert(
        http::header::ACCESS_CONTROL_ALLOW_ORIGIN,
        http::HeaderValue::from_static("http://localhost:3000"),
    );
    Ok(r)
}
