# Cloudflare Workers でのパーツコンパイル・評価 (`definy-worker-runtime`)

> [!NOTE]
> 現在、Rust 製の `definy-worker-runtime`（Rust + `wasmi`）から、**definy 自身が自己コンパイルした純粋な Wasm モジュール ([wasm/stage1.wasm](file:///Users/narumi/Documents/GitHub/definy/wasm/stage1.wasm)) + TypeScript 実行基盤** への段階的移行を進めています。詳細は [docs/typescript-react-void-architecture.md](file:///Users/narumi/Documents/GitHub/definy/docs/typescript-react-void-architecture.md) を参照してください。

Cloudflare Worker (`definy`) 内で definy のパーツを Wasm にコンパイル（`DeployService/DeployCloudflare` でデプロイ先 Worker に `app.wasm` として添付）したり、式を評価したりするときの仕組み。

## なぜ Rust 製のランタイムを Worker に載せていたのか（従来構成）

definy の式は Rust サーバーでは「Wasm にコンパイル（`definy_core::wasm_emitter::compile_expression_to_wasm`）
→ 実行」で評価する。また、各ユーザーの Web アプリは `DeployService/DeployCloudflare` によって `app.wasm` (`application/wasm`) モジュール付きの個別 Cloudflare Worker としてデプロイされ、デプロイ先の V8 Isolate でネイティブ実行される。

メインの `definy` Worker 自身も Cloudflare Workers 上で動くため、D1 に保存されたイベント・CAS コンテンツからパーツの式を解決して `.wasm` バイナリを生成できるよう、次の 2 つを 1 つの Wasm モジュールにまとめて Worker に事前バンドルしている。

- definy-core の Wasm コンパイラ (`compilePart` で `app.wasm` バイナリを生成)
- Rust 製の Wasm インタプリタ [wasmi](https://github.com/wasmi-labs/wasmi)（`definy_core::wasm_emitter::wasmi_backend`、テストや即時評価用）

これで Worker でも Rust サーバーと同じコンパイラ・同じ線形メモリ ABI が使われ、実装は 1 つになる。

### 自己記述コンパイラ (`stage1.wasm`) への移行による変化

Rust の `definy-worker-runtime` はバイナリサイズが大きくビルドに時間を要していましたが、`definy` 言語自身の固定点コンパイラ [wasm/stage1.wasm](file:///Users/narumi/Documents/GitHub/definy/wasm/stage1.wasm) は **68KB** と非常に軽量であり、外部依存なしに動作します。
ブラウザ側・Worker 側ともに [src/stage1_compiler.ts](file:///Users/narumi/Documents/GitHub/definy/src/stage1_compiler.ts) を介して直接 `stage1.wasm` を実行することで、Rust クレートへの依存を完全に解消し、TypeScript 単一スタックでコンパイルと実行が可能になります。

## 構成

| ファイル                           | 役割                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `definy-worker-runtime/src/lib.rs` | ランタイム本体。JSON の要求を処理する `Runtime` と、wasm32 用の C ABI (`definy_alloc` / `definy_free` / `definy_call`) |
| `definy-core/src/http_app.rs`      | パーツの探索、`definy:deploy` 設定からのハンドラ取り出し（Rust サーバーと共通）                                        |
| `worker/definy_runtime.ts`         | ランタイムの TypeScript ラッパー                                                                                       |
| `worker/http_stream.ts`            | D1 / ストアからイベントと CAS コンテンツを集めてランタイムに渡し、`compilePartToWasm` を提供する                       |
| `worker/main.ts`                   | wrangler のエントリポイント。`./generated/definy_worker_runtime.wasm` を import して設定する                           |

要求（`op`）は `loadEvents` / `loadContents` / `missingContents` / `compilePart` / `evaluate` / `evaluateExpression`。読み込んだイベントは isolate が生きている間
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
