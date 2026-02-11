# 1. ベースとキャッシュの準備
FROM lukemathwalker/cargo-chef:latest-rust-1.84 AS chef
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# 2. 依存ライブラリのビルド (ここが一番時間がかかるのでキャッシュさせる)
FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json

# 3. アプリケーションのビルド
COPY . .
# ステップ A: 1段階目のビルド（Webブラウザ向け等の生成）
RUN cargo run -p definy-build

# ステップ B: サーバーのビルド
RUN cargo build -p definy-server --release

# 4. 実行用イメージ（軽量化）
FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates libssl-dev && rm -rf /var/lib/apt/lists/*

# サーバーバイナリをコピー
COPY --from=builder /app/target/release/definy-server /app/definy-server

# 【重要】もし definy-build が static なファイルを出力する場合、それもコピーが必要
# 例: COPY --from=builder /app/dist /app/dist

CMD ["/app/definy-server"]
