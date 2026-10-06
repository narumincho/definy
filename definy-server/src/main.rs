#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let _ = rustls::crypto::ring::default_provider().install_default();
    std::panic::set_hook(Box::new(|panic_info| {
        eprintln!("CRITICAL ERROR - PANIC: {panic_info}");
    }));
    definy_server::start_server().await
}
