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
cargo run -p definy-build
cargo run -p definy-server
```

### 2. SurrealDB サーバーに接続して起動する場合

Linux, Mac の場合

```sh
cargo run -p definy-build
DATABASE_URL=ws://localhost:8000/rpc cargo run -p definy-server
```

PowerShell の場合

```ps1
cargo run -p definy-build
& { $env:DATABASE_URL="ws://localhost:8000/rpc"; cargo run -p definy-server }
```

