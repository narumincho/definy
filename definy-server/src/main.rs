#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    definy_server::start_server().await
}
