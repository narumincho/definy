use base64::Engine;
use sha2::Digest;

fn get_or_download_wasm_opt() -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
    let version_raw = std::env::var("WASM_OPT_VERSION")
        .or_else(|_| std::env::var("BINARYEN_VERSION"))
        .unwrap_or_else(|_| "122".to_string());
    let tag = if version_raw.starts_with("version_") {
        version_raw
    } else {
        format!("version_{version_raw}")
    };

    let target = match (std::env::consts::OS, std::env::consts::ARCH) {
        ("macos", "aarch64") => "arm64-macos",
        ("macos", "x86_64") => "x86_64-macos",
        ("linux", "x86_64") => "x86_64-linux",
        ("linux", "aarch64") => "aarch64-linux",
        ("windows", "x86_64") => "x86_64-windows",
        (os, arch) => {
            return Err(format!(
                "Unsupported OS ({os}) / Arch ({arch}) for automatic wasm-opt download"
            )
            .into());
        }
    };

    let binary_name = if std::env::consts::OS == "windows" {
        "wasm-opt.exe"
    } else {
        "wasm-opt"
    };

    let cache_dir = std::path::PathBuf::from(format!("./target/wasm-opt/{tag}"));
    let wasm_opt_bin_path = cache_dir.join(format!("binaryen-{tag}/bin/{binary_name}"));

    if wasm_opt_bin_path.exists() {
        return Ok(wasm_opt_bin_path);
    }

    println!("Downloading wasm-opt ({tag} for {target})...");
    std::fs::create_dir_all(&cache_dir)?;

    let archive_name = format!("binaryen-{tag}-{target}.tar.gz");
    let download_url =
        format!("https://github.com/WebAssembly/binaryen/releases/download/{tag}/{archive_name}");

    let mut response = ureq::get(&download_url)
        .call()
        .map_err(|e| format!("Failed to download {download_url}: {e}"))?;

    let reader = response.body_mut().as_reader();
    let tar = flate2::read::GzDecoder::new(reader);
    let mut archive = tar::Archive::new(tar);
    archive.unpack(&cache_dir)?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if wasm_opt_bin_path.exists() {
            let mut perms = std::fs::metadata(&wasm_opt_bin_path)?.permissions();
            perms.set_mode(0o755);
            std::fs::set_permissions(&wasm_opt_bin_path, perms)?;
        }
    }

    if !wasm_opt_bin_path.exists() {
        return Err(format!("Extracted wasm-opt not found at {:?}", wasm_opt_bin_path).into());
    }

    println!("wasm-opt downloaded and cached at {:?}", wasm_opt_bin_path);
    Ok(wasm_opt_bin_path)
}

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
            .env("CARGO_PROFILE_RELEASE_STRIP", "true")
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
            .keep_debug(false)
            .remove_name_section(true)
            .remove_producers_section(true)
            .generate("./web-distribution")?;

        println!("wasm-bindgen ok");
    }

    {
        let wasm_path = "./web-distribution/definy_client_bg.wasm";
        let wasm_opt_bin = match get_or_download_wasm_opt() {
            Ok(path) => path,
            Err(e) => {
                eprintln!("Warning: failed to acquire wasm-opt: {e}");
                std::path::PathBuf::from("wasm-opt")
            }
        };

        let wasm_opt_result = std::process::Command::new(&wasm_opt_bin)
            .args(["-Oz", "--all-features", "-o", wasm_path, wasm_path])
            .status();

        match wasm_opt_result {
            Ok(status) if status.success() => println!("wasm-opt ok"),
            Ok(status) => return Err(format!("wasm-opt exited with status: {status}").into()),
            Err(e) => {
                println!("wasm-opt failed ({e}), skipping optimization");
            }
        }
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
