pub async fn init_db() -> Result<sqlx::postgres::PgPool, anyhow::Error> {
    println!("Connecting to postgresql...");

    let pool = sqlx::postgres::PgPool::connect(
        std::env::var("DATABASE_URL")
            .expect("environment variable DATABASE_URL must be set")
            .as_str(),
    )
    .await?;

    log_and_query(&pool, "select * from version()", None).await?;
    log_and_query(
        &pool,
        "create table if not exists events (id serial primary key, event_binary bytea)",
        None,
    )
    .await?;

    println!("Connecting to postgresql... done");

    Ok(pool)
}

pub async fn log_and_query(
    pool: &sqlx::postgres::PgPool,
    sql: &str,
    value: Option<&[u8]>,
) -> Result<Vec<sqlx::postgres::PgRow>, anyhow::Error> {
    println!("Executing query: {}", sql);

    let rows = sqlx::query(sql).bind(value).fetch_all(pool).await?;

    for row in &rows {
        println!("{:?}", row);
    }

    Ok(rows)
}

pub async fn save_event(
    event_binary: &[u8],
    pool: &sqlx::postgres::PgPool,
) -> Result<(), anyhow::Error> {
    log_and_query(
        pool,
        "insert into events (event_binary) values ($1)",
        Some(event_binary),
    )
    .await?;

    Ok(())
}
