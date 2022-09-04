#[tokio::main]
async fn main() {
    let addr = std::net::SocketAddr::V6(std::net::SocketAddrV6::new(
        std::net::Ipv6Addr::LOCALHOST,
        2520,
        0,
        0,
    ));

    let make_svc = hyper::service::make_service_fn(|_conn| async {
        Ok::<_, std::convert::Infallible>(hyper::service::service_fn(handle_request))
    });

    let server = hyper::Server::bind(&addr).serve(make_svc);

    println!("definy desktop start! http://{}", addr.to_string());

    // Run this server for... forever!
    if let Err(e) = server.await {
        eprintln!("server error: {}", e);
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
