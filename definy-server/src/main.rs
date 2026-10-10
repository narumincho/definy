#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let args: Vec<String> = std::env::args().collect();
    if let Some(idx) = args.iter().position(|a| a == "--export-seed-bundle") {
        let out_path = args
            .get(idx + 1)
            .ok_or_else(|| anyhow::anyhow!("Missing output path after --export-seed-bundle"))?;
        let bundle = definy_server::builtin_migration::build_builtin_seed_bundle()?;
        let json = serde_json::to_vec(&bundle)?;
        if let Some(parent) = std::path::Path::new(out_path).parent()
            && !parent.as_os_str().is_empty()
        {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(out_path, json)?;
        println!(
            "Exported builtin seed bundle ({} events, {} contents) to {}",
            bundle.events.len(),
            bundle.contents.len(),
            out_path
        );
        return Ok(());
    }

    let _ = rustls::crypto::ring::default_provider().install_default();
    std::panic::set_hook(Box::new(|panic_info| {
        eprintln!("CRITICAL ERROR - PANIC: {panic_info}");
    }));
    definy_server::start_server().await
}
