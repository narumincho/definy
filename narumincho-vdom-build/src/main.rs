mod fetch;
mod generator;
mod idl;
mod model;
mod naming;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    generator::generate_code().await
}
