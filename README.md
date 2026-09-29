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
- `.vscode`: VSCode 向けの設定
- `assets`: スタティックなファイルが置かれている
- `definy-client`: ブラウザで動かす Dioxus / Wasm コード
- `definy-event`: イベント・ドメインモデルの定義
- `definy-server`: サーバーで動かすコード (Axum, SurrealDB, MCP サーバー, SSR & アセット配信)
- `definy-ui`: ブラウザとサーバーでレンダリングする共通のUIコンポーネント
- `docs`: ドキュメントが置かれている

## 事前にインストールが必要

- [Rust(rustup)](https://rust-lang.org/ja/tools/install/)

- [Docker](https://www.docker.com/get-started/)

## DB 起動コマンド (任意)

デフォルトでは `DATABASE_URL` を指定しない場合、インメモリの SurrealDB (`mem://`) で動作します (サーバー再起動時にデータは保持されません)。

永続化のために SurrealDB サーバーを Docker で起動する場合:

```sh
docker run -d --name definy-dev-db -p 8000:8000 surrealdb/surrealdb:latest start --user root --pass root
```

## 本体サーバー起動コマンド

### 1. インメモリDBで手軽に起動する場合 (DATABASE_URL 不要)

```sh
cargo run -p definy-server
```
※ クライアントの最新 Wasm をビルドする場合は `dx build --package definy-client` を実行します（`definy-server` はディスク上の最新 Wasm/JS/CSS を自動検出して配信するため、サーバーの再起動なしでブラウザのリロードだけで反映されます）。

### 2. Dioxus Fullstack で開発する場合 (推奨)

Dioxus CLI (`dx`) を使用して、バックエンドサーバー (API / SurrealDB / SSR) と Web クライアント (WASM) を**単一コマンドで同時に起動・ホットリロード開発**できます。

事前準備 (初回のみ): https://dioxuslabs.com/learn/0.7/getting_started/#install-the-dioxus-cli
```sh
curl -sSL https://dioxus.dev/install.sh | bash
```

起動コマンド:
```sh
dx serve --fullstack
```

※ `dx serve --fullstack` を実行すると、バックエンドサーバー (Axum + SurrealDB + MCP + SSR) とフロントエンド (Wasm) の双方が自動起動し、`http://localhost:8080` でアクセスできます。コードを変更すると自動的に再ビルド・ホットリロードされます（`default-members` 設定により `--package definy-client` の指定は不要です）。

### 3. SurrealDB サーバー / Surreal Cloud に接続して起動する場合

環境変数を指定して起動します：

- `DATABASE_URL`: SurrealDB のエンドポイント（例: `ws://localhost:8000` または `wss://definy-xxx.aws-aps1.surreal.cloud`）
- `DATABASE_USER`: ユーザー名（任意）
- `DATABASE_PASS`: パスワード（任意）
- `DATABASE_NS`: 名前空間（任意、デフォルト: `definy`）
- `DATABASE_DB`: データベース名（任意、デフォルト: `definy`）
- `DATABASE_AUTH_LEVEL`: 認証レベル（任意、`Database` (デフォルト), `Namespace`, `Root`）

Linux, Mac の場合

```sh
DATABASE_URL=wss://definy-xxx.aws-aps1.surreal.cloud \
DATABASE_USER=flyio \
DATABASE_PASS=password \
cargo run -p definy-server
```

PowerShell の場合

```ps1
& {
    $env:DATABASE_URL = "wss://definy-xxx.aws-aps1.surreal.cloud";
    $env:DATABASE_USER = "flyio";
    $env:DATABASE_PASS = "password";
    cargo run -p definy-server
}
```


