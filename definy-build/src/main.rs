use base64::Engine;
use sha2::Digest;

fn main() {
    let _ = std::fs::remove_dir_all("./web-distribution");

    std::fs::create_dir("web-distribution").unwrap();

    std::fs::read("./assets/icon.png")
        .and_then(|icon_bytes| {
            let hash = sha2::Sha256::digest(&icon_bytes);
            let hash_hex = base64::engine::general_purpose::URL_SAFE.encode(hash);
            std::fs::write("./web-distribution/icon.png.sha256", hash_hex)
        })
        .expect("Failed to compute and write icon hash");

    println!("icon hash write ok");

    std::process::Command::new("cargo")
        .args(&[
            "build",
            "--release",
            "-p",
            "definy-client",
            "--target",
            "wasm32-unknown-unknown",
        ])
        .status()
        .expect("Failed to build project");

    println!("wasm build ok");

    std::process::Command::new("wasm-bindgen")
        .args(&[
            "--out-dir",
            "./web-distribution",
            "--target",
            "web",
            "./target/wasm32-unknown-unknown/release/definy_client.wasm",
        ])
        .status()
        .expect("Failed to run wasm-bindgen");

    println!("wasm-bindgen ok");

    std::fs::read("./web-distribution/definy_client_bg.wasm")
        .and_then(|wasm_bytes| {
            let hash = sha2::Sha256::digest(&wasm_bytes);
            let hash_hex = base64::engine::general_purpose::URL_SAFE.encode(hash);
            std::fs::write("./web-distribution/definy_client_bg.wasm.sha256", hash_hex)
        })
        .expect("Failed to compute and write wasm hash");

    println!("wasm hash write ok");

    std::fs::read("./web-distribution/definy_client.js")
        .and_then(|js_bytes| {
            let hash = sha2::Sha256::digest(&js_bytes);
            let hash_hex = base64::engine::general_purpose::URL_SAFE.encode(hash);
            std::fs::write("./web-distribution/definy_client.js.sha256", hash_hex)
        })
        .expect("Failed to compute and write JS hash");

    println!("js hash write ok");

    println!("Build completed successfully.");
}
