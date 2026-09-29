#[cfg(target_arch = "wasm32")]
mod client;
#[cfg(target_arch = "wasm32")]
mod keyboard_nav;

#[cfg(target_arch = "wasm32")]
fn main() {
    client::main();
}

#[cfg(not(target_arch = "wasm32"))]
#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    definy_server::start_server().await
}
