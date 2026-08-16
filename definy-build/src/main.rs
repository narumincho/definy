use base64::Engine;
use sha2::Digest;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 最初からない場合は失敗するが、無視する
    let _ = std::fs::remove_dir_all("./web-distribution");

    std::fs::create_dir("web-distribution")?;

    {
        let icon_bytes = std::fs::read("./assets/icon.png")?;
        let hash = sha2::Sha256::digest(&icon_bytes);
        let hash_hex = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(hash);
        std::fs::write("./web-distribution/icon.png.sha256", hash_hex)?;

        println!("icon hash write ok");
    }

    {
        let wasm_build_result = std::process::Command::new("cargo")
            .args([
                "build",
                "--release",
                "-p",
                "definy-client",
                "--target",
                "wasm32-unknown-unknown",
            ])
            .env("CARGO_PROFILE_RELEASE_OPT_LEVEL", "z")
            .env("CARGO_PROFILE_RELEASE_LTO", "true")
            .env("CARGO_PROFILE_RELEASE_CODEGEN_UNITS", "1")
            .env("CARGO_PROFILE_RELEASE_PANIC", "abort")
            .env("CARGO_PROFILE_RELEASE_DEBUG", "false")
            .status()?;

        if !wasm_build_result.success() {
            return Err("wasm build failed".into());
        }

        println!("wasm build ok");
    }

    {
        wasm_bindgen_cli_support::Bindgen::new()
            .input_path("./target/wasm32-unknown-unknown/release/definy_client.wasm")
            .web(true)?
            .generate("./web-distribution")?;

        println!("wasm-bindgen ok");
    }

    {
        let wasm_bytes = std::fs::read("./web-distribution/definy_client_bg.wasm")?;
        let hash = sha2::Sha256::digest(&wasm_bytes);
        let hash_hex = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(hash);
        std::fs::write("./web-distribution/definy_client_bg.wasm.sha256", hash_hex)?;

        println!("wasm hash write ok");
    }

    {
        let js_bytes = std::fs::read("./web-distribution/definy_client.js")?;
        let hash = sha2::Sha256::digest(&js_bytes);
        let hash_hex = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(hash);
        std::fs::write("./web-distribution/definy_client.js.sha256", hash_hex)?;

        println!("js hash write ok");
    }

    println!("Build completed successfully.");

    Ok(())
}
