#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|a| a == "--generate-system-key") {
        println!("# 新しいシステムアカウントの鍵ペア。秘密鍵は公開しないでください。");
        println!("# 秘密鍵は UI の「秘密鍵でログイン」にもそのまま使えます。");
        print!(
            "{}",
            definy_server::system_account::generate_system_key_env_lines()
        );
        return Ok(());
    }
    if let Some(idx) = args.iter().position(|a| a == "--export-seeds-from") {
        let base_url = args
            .get(idx + 1)
            .ok_or_else(|| anyhow::anyhow!("Missing server URL after --export-seeds-from"))?;
        let out_dir = args.get(idx + 2).map_or("seeds", String::as_str);
        let _ = rustls::crypto::ring::default_provider().install_default();
        let exported = definy_server::seed_export::export_seeds_from_server(
            base_url,
            std::path::Path::new(out_dir),
        )
        .await?;
        if exported.is_empty() {
            println!("No module commits by the system account were found on {base_url}");
        } else {
            println!(
                "Exported {} from {base_url} to {out_dir}",
                exported.join(", ")
            );
        }
        return Ok(());
    }
    if let Some(idx) = args.iter().position(|a| a == "--export-seeds") {
        let out_dir = args
            .get(idx + 1)
            .ok_or_else(|| anyhow::anyhow!("Missing output directory after --export-seeds"))?;
        definy_server::seed::export_seeds_to_disk(std::path::Path::new(out_dir))?;
        println!("Exported normalized builtin module seeds to {out_dir}");
        return Ok(());
    }
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
    if let Some(idx) = args.iter().position(|a| a == "--export-stage1-wasm") {
        let out_path = args
            .get(idx + 1)
            .ok_or_else(|| anyhow::anyhow!("Missing output path after --export-stage1-wasm"))?;
        let events = definy_server::builtin_migration::build_builtin_verified_events();
        let wasm =
            definy_server::self_hosted_wasm_compiler::build_self_hosted_compiler_wasm(&events)
                .map_err(|e| anyhow::anyhow!("{e}"))?;
        if let Some(parent) = std::path::Path::new(out_path).parent()
            && !parent.as_os_str().is_empty()
        {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(out_path, &wasm)?;
        println!(
            "Exported stage1 wasm ({} bytes) to {}",
            wasm.len(),
            out_path
        );
        return Ok(());
    }
    if let Some(idx) = args.iter().position(|a| a == "--export-seed-sql") {
        let out_path = args
            .get(idx + 1)
            .ok_or_else(|| anyhow::anyhow!("Missing output path after --export-seed-sql"))?;
        let sql = definy_server::builtin_migration::build_builtin_seed_sql()?;
        if let Some(parent) = std::path::Path::new(out_path).parent()
            && !parent.as_os_str().is_empty()
        {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(out_path, &sql)?;
        println!(
            "Exported builtin seed SQL ({} bytes) to {}",
            sql.len(),
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
