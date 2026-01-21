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

- [Rust言語(rustup)](https://rust-lang.org/ja/tools/install/)

- [wasm-bindgen-cli](https://wasm-bindgen.github.io/wasm-bindgen/)

```sh
cargo install wasm-bindgen-cli
```

- [PostgreSQL 17](https://www.postgresql.org/download/)

psql にパスが通るように

## ビルド&起動方法

```sh
cargo run -p definy-build
cargo run -p definy-server
```
