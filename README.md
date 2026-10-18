# definy

いろいろ整理中なため ファイル数が極端に少ないです... いろいろ調整する前
https://github.com/narumincho/definy/tree/prev2023

![definyのスクリーンショット](https://repository-images.githubusercontent.com/168463361/72534f00-ec72-11e9-94f3-370ab473bc28)

- [Deno Version](https://definy.deno.dev/)

- [Firebase Version](https://definy.app/?hl=ja)

- [Old Version](https://definy-old.narumincho.com/)
  WebAssemblyを使って数値の足し算, 引き算, 掛け算ができる

## フォルダとファイルの説明

- `.github/workflows/pull_request.yaml`: Pull Request
  したときに実行されるテストの処理が書かれている
- `.github/workflows/deploy.yaml`: `main` ブランチへのプッシュ時に Cloudflare D1
  シード投入と Cloudflare Workers へのデプロイを行うワークフロー
- `.vscode`: VSCode 向けの設定
- `assets`: スタティックなファイルが置かれている
- `definy-event`:
  イベント・ドメインモデルの定義、署名検証、コンテンツハッシュ計算
- `definy-core`: 純粋な言語コア評価器、AST ソースコード生成、WebAssembly
  コンパイラ & 実行 VM
- `definy-ui`: ブラウザとサーバーでレンダリングする共通の UI コンポーネント、AST
  式エディタ
- `definy-server`: サーバー・CLI ツール (シード SQL / JSON
  生成、MCP サーバー、SSR & セルフホスト用ビルトインパーツ)
- `definy-client`: ブラウザで動かす Dioxus / Wasm エントリポイント
- `definy-worker-runtime`: Cloudflare Workers 内でパーツ評価・Wasm
  コンパイルを行う Rust 製 Wasm ランタイム
- `worker`: Cloudflare Workers エッジランタイム (`worker/index.ts`, Cloudflare
  D1 永続化ストア, Cloudflare REST API v4 デプロイ連携)
- `docs`: ドキュメント ([セルフホスト構想](docs/self-hosting.md),
  [クレート構成](docs/crates.md), [パーツ型システム](docs/part-type.md),
  [Connect-RPC 仕様](docs/connect-rpc.md),
  [データベース構成](docs/database.md) など)

## 事前にインストールが必要

- [Rust(rustup)](https://rust-lang.org/ja/tools/install/)
- [Deno](https://deno.com/) (または Node.js / Wrangler CLI)
- [Dioxus CLI (`dx`)](https://dioxuslabs.com/learn/0.7/getting_started/#install-the-dioxus-cli)

## ローカル開発・起動コマンド

### 1. Cloudflare Workers + ローカル D1 (Wrangler CLI) で起動する場合 (推奨)

Cloudflare の `wrangler` CLI を使用して、ローカルの Cloudflare D1 (SQLite:
`.wrangler/state/v3/d1`) にスキーマと組み込みシードデータを投入し、本番と同一の
Worker 構成で起動できます。

```sh
# 1. クライアント・Worker ランタイムのビルドとシード SQL 生成
bash scripts/build-assets.sh

# 2. ローカルの Cloudflare D1 (definy-db) にスキーマとシードデータを投入
bash scripts/ensure-d1.sh --local

# 3. Cloudflare Workers ローカル開発サーバーを起動
deno run -A npm:wrangler@4 dev
```

### 2. Dioxus Fullstack / Rust サーバーで手軽に起動する場合

```sh
dx serve --fullstack
```

または

```sh
cargo run -p definy-server
```

## テストとコード品質の検証

```sh
# ワークスペース全体の単体テスト実行
cargo test --workspace

# Cloudflare Worker ランタイム & D1 永続化テスト実行
deno test --allow-read worker/

# 静的解析・Clippy チェック (警告 0 件ルール)
cargo clippy --workspace --all-targets -- -D warnings

# コードフォーマット
cargo fmt
dx fmt
deno fmt
```
