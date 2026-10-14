# Cloudflare Workers でのパーツ実行 (`definy-worker-runtime`)

プレビューアプリ（`{sub}-definy.narumincho.com` や `/preview/{appId}/...`）のように、
Worker 上で definy のパーツを HTTP サーバーとして動かすときの仕組み。

## なぜ Rust 製のランタイムを Worker に載せるのか

definy の式は Rust サーバーでは「Wasm にコンパイル（`definy_core::wasm_emitter::compile_expression_to_wasm`）
→ wasmtime で実行」で評価する。Cloudflare Workers は **実行時に生成した Wasm バイト列をコンパイルできない**
（事前にアップロードしたモジュールしか実行できない）ため、同じ方法はそのままでは使えない。

以前は TypeScript で書いた木構造インタプリタ（`worker/cbor_eval.ts`）で評価していたが、Rust と
二重実装になり挙動がずれやすかった。そこで次の 2 つを 1 つの Wasm モジュールにまとめて Worker に載せる。

- definy-core の Wasm コンパイラ
- Rust 製の Wasm インタプリタ [wasmi](https://github.com/wasmi-labs/wasmi)（`definy_core::wasm_emitter::wasmi_backend`）

これで Worker でも Rust サーバーと同じコンパイラ・同じ線形メモリ ABI で評価され、評価器の実装は 1 つになる。

## 構成

| ファイル | 役割 |
| --- | --- |
| `definy-worker-runtime/src/lib.rs` | ランタイム本体。JSON の要求を処理する `Runtime` と、wasm32 用の C ABI (`definy_alloc` / `definy_free` / `definy_call`) |
| `definy-core/src/http_app.rs` | パーツの探索、プレビュー設定からのハンドラ取り出し、HTTP リクエストを適用した式のコンパイル（Rust サーバーと共通） |
| `worker/definy_runtime.ts` | ランタイムの TypeScript ラッパー。本文を Pull 型 `ReadableStream` にする |
| `worker/http_stream.ts` | D1 / ストアからイベントと CAS コンテンツを集めてランタイムに渡し、`Response` を返す |
| `worker/main.ts` | wrangler のエントリポイント。`./generated/definy_worker_runtime.wasm` を import して設定する |

要求（`op`）は `loadEvents` / `loadContents` / `missingContents` / `httpStart` / `httpStartWasm` /
`httpPull` / `httpDrop` / `evaluate` / `evaluateExpression`。読み込んだイベントは isolate が生きている間
ランタイム内に保持し、2 回目以降は新しいイベントだけを渡す。

## ビルドとテスト

```sh
# ランタイムを worker/generated/definy_worker_runtime.wasm にビルド（build-assets.sh からも呼ばれる）
bash scripts/build-worker-runtime.sh

# Deno のテスト用 seed バンドル（開発用システムアカウントで署名）
cargo run -p definy-server -- --export-seed-bundle worker/generated/test_seed_bundle.json

deno test --allow-read worker/
```

`worker/generated/` は git 管理外。

Rust 側では `definy-server/tests/wasmi_backend.rs` が、適合テストの全ケースと HTTP サーバーのサンプルで
wasmtime と wasmi の結果が一致することを確認する。`definy-worker-runtime/tests/runtime.rs` は
seed バンドルを読み込んだランタイムをネイティブで動かす。
