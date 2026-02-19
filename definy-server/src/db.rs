use sha2::Digest;
use sqlx::Row;

pub async fn init_db() -> Result<sqlx::postgres::PgPool, anyhow::Error> {
    println!("Connecting to postgresql...");

    let pool = sqlx::postgres::PgPool::connect(
        std::env::var("DATABASE_URL")
            .expect("environment variable DATABASE_URL must be set")
            .as_str(),
    )
    .await?;

    let result = sqlx::query("select * from version()")
        .fetch_one(&pool)
        .await?;

    println!("PostgreSQL version: {:?}", result);

    println!("Connecting to postgresql... done");

    println!("Migrating database...");

    sqlx::query(
        format!(
            "
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
        CREATE TYPE event_type AS ENUM ({});
    END IF;
END
$$",
            <definy_event::event::EventType as strum::VariantNames>::VARIANTS
                .iter()
                .map(|e| format!("'{}'", e))
                .collect::<Vec<_>>()
                .join(", ")
        )
        .as_str(),
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "create table if not exists events (
    event_binary_hash bytea primary key,
    signature bytea not null,
    account_id bytea not null,
    time timestamp with time zone not null,
    event_binary bytea not null,
    server_receive_timestamp timestamp with time zone not null,
    address text not null,
    event_type event_type not null
)",
    )
    .execute(&pool)
    .await?;

    println!("Migrating database... done");

    Ok(pool)
}

pub async fn save_event(
    event: &definy_event::event::Event,
    signature: &ed25519_dalek::Signature,
    event_binary: &[u8],
    address: std::net::SocketAddr,
    pool: &sqlx::postgres::PgPool,
) -> Result<(), anyhow::Error> {
    let mut hasher = sha2::Sha256::new();
    hasher.update(event_binary);
    let event_binary_hash = hasher.finalize();

    sqlx::query(
        "insert into events (
    event_binary_hash,
    signature,
    account_id,
    time,
    event_binary,
    server_receive_timestamp,
    address,
    event_type
) values ($1, $2, $3, $4, $5, current_timestamp, $6, $7)",
    )
    .bind(event_binary_hash.as_slice())
    .bind(signature.to_bytes())
    .bind(event.account_id.0.as_ref())
    .bind(event.time)
    .bind(event_binary)
    .bind(address.to_string())
    .bind(strum::IntoDiscriminant::discriminant(&event.content))
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn get_events(
    pool: &sqlx::postgres::PgPool,
    event_type: Option<definy_event::event::EventType>,
) -> Result<Box<[Vec<u8>]>, anyhow::Error> {
    let rows = match event_type {
        Some(event_type) => sqlx::query(
            "select (event_binary) from events where event_type = $1 ORDER BY time DESC",
        )
        .bind(event_type),
        None => sqlx::query("select (event_binary) from events ORDER BY time DESC"),
    }
    .fetch_all(pool)
    .await?;

    let events = rows
        .into_iter()
        .map(|row| row.try_get("event_binary"))
        .collect::<Result<Box<[Vec<u8>]>, sqlx::Error>>()?;

    Ok(events)
}

pub async fn get_event(
    pool: &sqlx::postgres::PgPool,
    event_binary_hash: &[u8],
) -> Result<Option<Vec<u8>>, anyhow::Error> {
    let row = sqlx::query("select event_binary from events where event_binary_hash = $1")
        .bind(event_binary_hash)
        .fetch_optional(pool)
        .await?;

    let event = row
        .map(|row| row.try_get("event_binary"))
        .transpose()
        .map_err(|e| anyhow::anyhow!("Failed to get event binary: {:?}", e))?;

    Ok(event)
}
