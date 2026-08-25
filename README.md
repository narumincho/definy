# definy

いろいろ整理中なため ファイル数が極端に少ないです... いろいろ調整する前
https://github.com/narumincho/definy/tree/prev2023

![definyのスクリーンショット](https://repository-images.githubusercontent.com/168463361/72534f00-ec72-11e9-94f3-370ab473bc28)

- [Deno Version](https://definy.deno.dev/)

- [Firebase Version](https://definy.app/?hl=ja)

- [Old Version](https://definy-old.narumincho.com/)
  WebAssemblyを使って数値の足し算, 引き算, 掛け算ができる

## フォルダとファイルの説明

- `.github/workflows/pull_request.yml`: Pull Request
  したときに実行されるテストの処理が書かれている
- `.vscode`: VSCode 向けの設定
- `assets`: スタティックなファイルが置かれている
- `definy-build`: ビルドスクリプト
- `definy-client`: ブラウザで動かすコード
- `definy-server`: サーバーで動かすコード
- `definy-ui`: ブラウザとサーバーでレンダリングする共通のUIコンポーネント
- `docs`: ドキュメントが置かれている
- `narumincho-vdom`: 仮想DOMのライブラリ
- `narumincho-vdom-client`: ブラウザで動かす仮想DOMのライブラリ

- `web-distribution`: definy-build で生成したファイル (gitignore している)

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
cargo run -p definy-build && cargo run -p definy-server
```

### 2. Dioxus のホットリロードで開発する場合

Dioxus CLI (`dx`) を使用してホットリロード付きで Web クライアントを開発・即座に画面確認できます。

事前準備 (初回のみ):
```sh
cargo install dioxus-cli
```

ホットリロード起動コマンド:
```sh
dx serve --package definy-client
```

※ UIコード (`definy-ui`) やクライアントコードを編集・保存すると、ブラウザ上で即座に変更が反映されます。

また、サーバーやビルドを含む全体の変更を検知して自動再起動したい場合は `cargo-watch` を利用することも可能です:
```sh
cargo install cargo-watch
cargo watch -x "run -p definy-build" -x "run -p definy-server"
```

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
cargo run -p definy-build
DATABASE_URL=wss://definy-xxx.aws-aps1.surreal.cloud \
DATABASE_USER=flyio \
DATABASE_PASS=password \
cargo run -p definy-server
```

PowerShell の場合

```ps1
cargo run -p definy-build
& {
    $env:DATABASE_URL = "wss://definy-xxx.aws-aps1.surreal.cloud";
    $env:DATABASE_USER = "flyio";
    $env:DATABASE_PASS = "password";
    cargo run -p definy-server
}
```


