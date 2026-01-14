use base64::Engine;
use sha2::Digest;

fn main() {
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

    std::fs::read("./web-distribution/definy_client_bg.wasm")
        .and_then(|wasm_bytes| {
            let hash = sha2::Sha256::digest(&wasm_bytes);
            let hash_hex = base64::engine::general_purpose::URL_SAFE.encode(hash);
            std::fs::write("./web-distribution/definy_client_bg.wasm.sha256", hash_hex)
        })
        .expect("Failed to compute and write wasm hash");

    std::fs::read("./web-distribution/definy_client.js")
        .and_then(|js_bytes| {
            let hash = sha2::Sha256::digest(&js_bytes);
            let hash_hex = base64::engine::general_purpose::URL_SAFE.encode(hash);
            std::fs::write("./web-distribution/definy_client.js.sha256", hash_hex)
        })
        .expect("Failed to compute and write JS hash");

    println!("Build completed successfully.");
}
