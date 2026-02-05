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
        "create table if not exists events (id bytea primary key, account_id bytea, event_binary bytea)",
    )
    .execute(&pool)
    .await?;

    println!("Migrating database... done");

    Ok(pool)
}

pub async fn save_create_account_event(
    event: &definy_event::event::Event,
    signature: &ed25519_dalek::Signature,
    event_binary: &[u8],
    pool: &sqlx::postgres::PgPool,
) -> Result<(), anyhow::Error> {
    sqlx::query("insert into events (id, account_id, event_binary) values ($1, $2, $3)")
        .bind(signature.to_bytes())
        .bind(event.account_id.0.as_ref())
        .bind(event_binary)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn get_events(pool: &sqlx::postgres::PgPool) -> Result<Box<[Vec<u8>]>, anyhow::Error> {
    let rows = sqlx::query("select (event_binary) from events")
        .fetch_all(pool)
        .await?;

    let events = rows
        .into_iter()
        .map(|row| row.try_get("event_binary"))
        .collect::<Result<Box<[Vec<u8>]>, sqlx::Error>>()?;

    Ok(events)
}
