use sqlx::Connection;

/// データベースとの接続を確認する
pub async fn init_db() -> Result<(), anyhow::Error> {
    println!("Connecting to postgresql...");

    let mut pool = sqlx::postgres::PgConnection::connect(
        std::env::var("DATABASE_URL")
            .expect("environment variable DATABASE_URL must be set")
            .as_str(),
    )
    .await?;

    let rows = sqlx::query("select * from version()")
        .fetch_all(&mut pool)
        .await?;

    for row in rows {
        println!("{:?}", row);
    }

    println!("Connecting to postgresql... done");

    Ok(())
}
