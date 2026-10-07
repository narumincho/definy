use base64::Engine;
use sha2::Digest;

const ICON_CONTENT: &[u8] = include_bytes!("../../assets/icon.png");

static ICON_ASSET: std::sync::LazyLock<ResolvedAsset> = std::sync::LazyLock::new(|| {
    let bytes = std::fs::read("assets/icon.png").unwrap_or_else(|_| ICON_CONTENT.to_vec());
    let hash = sha2::Sha256::digest(&bytes);
    let hash_hex = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(hash);
    ResolvedAsset {
        bytes,
        hash: hash_hex,
        content_type: "image/png",
    }
});

#[derive(Clone)]
pub struct ResolvedAsset {
    pub bytes: Vec<u8>,
    pub hash: String,
    pub content_type: &'static str,
}

#[derive(Clone)]
struct CachedAsset {
    path: std::path::PathBuf,
    modified: std::time::SystemTime,
    asset: ResolvedAsset,
}

static JS_CACHE: std::sync::RwLock<Option<CachedAsset>> = std::sync::RwLock::new(None);
static WASM_CACHE: std::sync::RwLock<Option<CachedAsset>> = std::sync::RwLock::new(None);

fn get_public_dir_candidates() -> Vec<std::path::PathBuf> {
    let mut paths = Vec::new();
    if let Ok(custom) = std::env::var("DEFINY_PUBLIC_DIR") {
        paths.push(std::path::PathBuf::from(custom));
    }

    // Docker container standard paths
    paths.push(std::path::PathBuf::from("/app/public"));

    // Executable-relative paths (e.g. if running as /app/definy_server, checks /app/public)
    if let Ok(exe_path) = std::env::current_exe()
        && let Some(exe_dir) = exe_path.parent()
    {
        paths.push(exe_dir.join("public"));
        paths.push(exe_dir.join("../public"));
    }

    // Direct relative paths from current directory
    paths.push(std::path::PathBuf::from("public"));
    paths.push(std::path::PathBuf::from(
        "target/dx/definy_client/release/web/public",
    ));
    paths.push(std::path::PathBuf::from(
        "target/dx/definy_client/debug/web/public",
    ));

    // Also look from parent directory (if cwd is definy-server or definy-client)
    paths.push(std::path::PathBuf::from("../public"));
    paths.push(std::path::PathBuf::from(
        "../target/dx/definy_client/release/web/public",
    ));
    paths.push(std::path::PathBuf::from(
        "../target/dx/definy_client/debug/web/public",
    ));

    // Robust search: traverse up from current_dir to find workspace root (has Cargo.lock or workspace Cargo.toml)
    if let Ok(mut current) = std::env::current_dir() {
        loop {
            let cargo_toml = current.join("Cargo.toml");
            let is_workspace_root = cargo_toml.is_file()
                && std::fs::read_to_string(&cargo_toml)
                    .map(|c| c.contains("[workspace]"))
                    .unwrap_or(false);

            if is_workspace_root {
                let target_debug = current.join("target/dx/definy_client/debug/web/public");
                if target_debug.exists() && !paths.contains(&target_debug) {
                    paths.push(target_debug);
                }
                let target_release = current.join("target/dx/definy_client/release/web/public");
                if target_release.exists() && !paths.contains(&target_release) {
                    paths.push(target_release);
                }
                let pub_dir = current.join("public");
                if pub_dir.exists() && !paths.contains(&pub_dir) {
                    paths.push(pub_dir);
                }
                break;
            }

            if !current.pop() {
                break;
            }
        }
    }

    paths
}

fn resolve_cached_asset(
    cache: &std::sync::RwLock<Option<CachedAsset>>,
    sub_path: &str,
    content_type: &'static str,
) -> Option<ResolvedAsset> {
    for dir in get_public_dir_candidates() {
        let p = dir.join(sub_path);
        if let Ok(metadata) = std::fs::metadata(&p)
            && let Ok(modified) = metadata.modified()
        {
            if let Ok(guard) = cache.read()
                && let Some(ref cached) = *guard
                && cached.path == p
                && cached.modified == modified
            {
                return Some(cached.asset.clone());
            }

            if let Ok(bytes) = std::fs::read(&p) {
                let hash = sha2::Sha256::digest(&bytes);
                let hash_hex = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(hash);
                let asset = ResolvedAsset {
                    bytes,
                    hash: hash_hex,
                    content_type,
                };
                if let Ok(mut guard) = cache.write() {
                    *guard = Some(CachedAsset {
                        path: p,
                        modified,
                        asset: asset.clone(),
                    });
                }
                return Some(asset);
            }
        }
    }
    None
}

pub fn resolve_client_js() -> Option<ResolvedAsset> {
    resolve_cached_asset(
        &JS_CACHE,
        "wasm/definy_client.js",
        "application/javascript; charset=utf-8",
    )
}

pub fn resolve_client_wasm() -> Option<ResolvedAsset> {
    resolve_cached_asset(
        &WASM_CACHE,
        "wasm/definy_client_bg.wasm",
        "application/wasm",
    )
}

pub fn resolve_icon() -> &'static ResolvedAsset {
    &ICON_ASSET
}

pub fn resolve_snippet(snippet_path: &str) -> Option<Vec<u8>> {
    for dir in get_public_dir_candidates() {
        let full = dir.join("wasm").join("snippets").join(snippet_path);
        if let Ok(bytes) = std::fs::read(&full) {
            return Some(bytes);
        }
    }
    None
}

pub fn resolve_snippets_list() -> Vec<String> {
    let mut list = Vec::new();
    for dir in get_public_dir_candidates() {
        let snippets_dir = dir.join("wasm").join("snippets");
        if snippets_dir.is_dir() {
            let mut stack = vec![(snippets_dir.clone(), String::new())];
            while let Some((curr, prefix)) = stack.pop() {
                if let Ok(entries) = std::fs::read_dir(curr) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        let name = entry.file_name().to_string_lossy().to_string();
                        let rel = if prefix.is_empty() {
                            name.clone()
                        } else {
                            format!("{prefix}/{name}")
                        };
                        if path.is_dir() {
                            stack.push((path, rel));
                        } else if !list.contains(&rel) {
                            list.push(rel);
                        }
                    }
                }
            }
        }
    }
    list
}
