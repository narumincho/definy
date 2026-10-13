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
        relative_path: "icon.png".to_string(),
    }
});

#[derive(Clone)]
pub struct ResolvedAsset {
    pub bytes: Vec<u8>,
    pub hash: String,
    pub content_type: &'static str,
    pub relative_path: String,
}

#[derive(Clone)]
struct CachedAsset {
    path: std::path::PathBuf,
    modified: std::time::SystemTime,
    wasm_hash: Option<String>,
    asset: ResolvedAsset,
}

static JS_CACHE: std::sync::RwLock<Option<CachedAsset>> = std::sync::RwLock::new(None);
static WASM_CACHE: std::sync::RwLock<Option<CachedAsset>> = std::sync::RwLock::new(None);

pub fn get_public_dir_candidates() -> Vec<std::path::PathBuf> {
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

fn find_client_js(dir: &std::path::Path) -> Option<std::path::PathBuf> {
    let index_file = dir.join("index.html");
    if let Ok(content) = std::fs::read_to_string(&index_file) {
        for line in content.lines() {
            if let Some(pos) = line.find("src=\"") {
                let rest = &line[pos + 5..];
                if let Some(end) = rest.find('"') {
                    let raw_src = &rest[..end];
                    if raw_src.contains("definy_client") && raw_src.ends_with(".js") {
                        let clean = raw_src.trim_start_matches('/').trim_start_matches("./");
                        let p = dir.join(clean);
                        if p.is_file() {
                            return Some(p);
                        }
                    }
                }
            }
        }
    }

    let assets_dir = dir.join("assets");
    if let Ok(entries) = std::fs::read_dir(&assets_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if let Some(name) = p.file_name().and_then(|n| n.to_str())
                && name.starts_with("definy_client")
                && name.ends_with(".js")
            {
                return Some(p);
            }
        }
    }

    let wasm_file = dir.join("wasm").join("definy_client.js");
    if wasm_file.is_file() {
        return Some(wasm_file);
    }

    let root_file = dir.join("definy_client.js");
    if root_file.is_file() {
        return Some(root_file);
    }

    None
}

fn find_client_wasm(dir: &std::path::Path) -> Option<std::path::PathBuf> {
    let assets_dir = dir.join("assets");
    if let Ok(entries) = std::fs::read_dir(&assets_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if let Some(name) = p.file_name().and_then(|n| n.to_str())
                && name.starts_with("definy_client")
                && name.ends_with(".wasm")
            {
                return Some(p);
            }
        }
    }

    let wasm_bg = dir.join("wasm").join("definy_client_bg.wasm");
    if wasm_bg.is_file() {
        return Some(wasm_bg);
    }
    let wasm_plain = dir.join("wasm").join("definy_client.wasm");
    if wasm_plain.is_file() {
        return Some(wasm_plain);
    }

    let root_bg = dir.join("definy_client_bg.wasm");
    if root_bg.is_file() {
        return Some(root_bg);
    }

    None
}

fn find_newest_candidate<F>(
    finder: F,
) -> Option<(
    std::path::PathBuf,
    std::path::PathBuf,
    std::time::SystemTime,
)>
where
    F: Fn(&std::path::Path) -> Option<std::path::PathBuf>,
{
    get_public_dir_candidates()
        .into_iter()
        .filter_map(|dir| {
            let path = finder(&dir)?;
            let modified = std::fs::metadata(&path).ok()?.modified().ok()?;
            Some((dir, path, modified))
        })
        .max_by_key(|(_, _, modified)| *modified)
}

fn resolve_cached_asset_by_finder<F>(
    cache: &std::sync::RwLock<Option<CachedAsset>>,
    finder: F,
    content_type: &'static str,
) -> Option<ResolvedAsset>
where
    F: Fn(&std::path::Path) -> Option<std::path::PathBuf>,
{
    let (dir, p, modified) = find_newest_candidate(finder)?;

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
        let rel_path = p
            .strip_prefix(&dir)
            .ok()
            .map(|rp| rp.to_string_lossy().replace('\\', "/"))
            .unwrap_or_else(|| {
                p.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default()
            });
        let asset = ResolvedAsset {
            bytes,
            hash: hash_hex,
            content_type,
            relative_path: rel_path,
        };
        if let Ok(mut guard) = cache.write() {
            *guard = Some(CachedAsset {
                path: p,
                modified,
                wasm_hash: None,
                asset: asset.clone(),
            });
        }
        return Some(asset);
    }

    None
}

pub fn resolve_client_js() -> Option<ResolvedAsset> {
    let wasm_hash = resolve_client_wasm().map(|w| w.hash);
    let (dir, p, modified) = find_newest_candidate(find_client_js)?;

    if let Ok(guard) = JS_CACHE.read()
        && let Some(ref cached) = *guard
        && cached.path == p
        && cached.modified == modified
        && cached.wasm_hash == wasm_hash
    {
        return Some(cached.asset.clone());
    }

    if let Ok(raw_bytes) = std::fs::read(&p) {
        let bytes = if let Some(ref wh) = wasm_hash {
            if let Ok(text) = String::from_utf8(raw_bytes.clone()) {
                let replaced = text
                    .replace(
                        "\"/./wasm/definy_client_bg.wasm\"",
                        &format!("\"/./wasm/definy_client_bg.wasm?v={wh}\""),
                    )
                    .replace(
                        "'/./wasm/definy_client_bg.wasm'",
                        &format!("'/./wasm/definy_client_bg.wasm?v={wh}'"),
                    )
                    .replace(
                        "'definy_client_bg.wasm'",
                        &format!("'definy_client_bg.wasm?v={wh}'"),
                    )
                    .replace(
                        "\"definy_client_bg.wasm\"",
                        &format!("\"definy_client_bg.wasm?v={wh}\""),
                    );
                replaced.into_bytes()
            } else {
                raw_bytes
            }
        } else {
            raw_bytes
        };

        let hash = sha2::Sha256::digest(&bytes);
        let hash_hex = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(hash);
        let rel_path = p
            .strip_prefix(&dir)
            .ok()
            .map(|rp| rp.to_string_lossy().replace('\\', "/"))
            .unwrap_or_else(|| {
                p.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default()
            });
        let asset = ResolvedAsset {
            bytes,
            hash: hash_hex,
            content_type: "application/javascript; charset=utf-8",
            relative_path: rel_path,
        };
        if let Ok(mut guard) = JS_CACHE.write() {
            *guard = Some(CachedAsset {
                path: p,
                modified,
                wasm_hash,
                asset: asset.clone(),
            });
        }
        return Some(asset);
    }

    None
}

pub fn resolve_client_wasm() -> Option<ResolvedAsset> {
    resolve_cached_asset_by_finder(&WASM_CACHE, find_client_wasm, "application/wasm")
}

pub fn resolve_icon() -> &'static ResolvedAsset {
    &ICON_ASSET
}

pub fn resolve_snippet(snippet_path: &str) -> Option<Vec<u8>> {
    let (_, full, _) =
        find_newest_candidate(|dir| Some(dir.join("wasm").join("snippets").join(snippet_path)))?;
    std::fs::read(&full).ok()
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
