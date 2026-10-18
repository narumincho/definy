# Cloudflare Workers でのパーツコンパイル・評価 (`worker/definy_runtime.ts`)

> [!NOTE]
> 従来の Rust 製 `definy-worker-runtime`（Rust + `wasmi`）および Deno は完全撤廃され、**TypeScript + self-hosted Wasm ([wasm/stage1.wasm](file:///Users/narumi/Documents/GitHub/definy/wasm/stage1.wasm), [wasm/self_hosted_definy_server.wasm](file:///Users/narumi/Documents/GitHub/definy/wasm/self_hosted_definy_server.wasm))** に一本化されました。詳細は [docs/typescript-react-void-architecture.md](file:///Users/narumi/Documents/GitHub/definy/docs/typescript-react-void-architecture.md) を参照してください。

Cloudflare Worker (`definy`) 内で definy のパーツを Wasm にコンパイル（`DeployService/DeployCloudflare` でデプロイ先 Worker に `app.wasm` として添付）したり、式を評価したりするときの仕組み。

## TypeScript + self-hosted Wasm ランタイム

式評価器は純粋な TypeScript (`worker/cbor_eval.ts`) で実装されており、高速かつ軽量にすべての definy 式（算術、論理、文字列、リスト、レコード、バリアント、関数呼び出し、マッチ構文）を評価します。

また、definy 自身の自己記述固定点コンパイラ [wasm/stage1.wasm](file:///Users/narumi/Documents/GitHub/definy/wasm/stage1.wasm) (68KB) およびセルフホストサーバー Wasm [wasm/self_hosted_definy_server.wasm](file:///Users/narumi/Documents/GitHub/definy/wasm/self_hosted_definy_server.wasm) はリポジトリ内で直接追跡され、Rust ツールチェインや Deno なしで Node.js 22 + Vitest / Void 環境から即座に実行可能です。

## 構成

| ファイル                              | 役割                                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `worker/cbor_eval.ts`                 | definy 式の純粋 TypeScript 評価器 (AST / CBOR 評価)                                                      |
| `worker/cbor.ts`                      | CBOR デコード、URL-safe Base64、SHA-256、Module ID / Part ID 導出                                        |
| `worker/definy_runtime.ts`            | ランタイム本体。ModuleCommit のパーツ登録、式評価 (`callAsync`)、パーツコンパイル (`compilePart`) を提供 |
| `worker/http_stream.ts`               | D1 / ストアからイベントと CAS コンテンツを集めてランタイムに渡し、`compilePartToWasm` を提供する         |
| `worker/main.ts`                      | wrangler のエントリポイント                                                                              |
| `wasm/stage1.wasm`                    | definy 自己記述コンパイラ (68KB)                                                                         |
| `wasm/self_hosted_definy_server.wasm` | セルフホスト definy サーバーの Wasm モジュール                                                           |

要求（`op`）は `loadEvents` / `loadContents` / `missingContents` / `compilePart` / `evaluate` / `evaluateExpression`。読み込んだイベントは isolate が生きている間
ランタイム内に保持し、2 回目以降は新しいイベントだけを渡す。

## テストと適合検証

```sh
# Vitest による適合テスト・Worker 単体テスト (全 74 テスト)
npm test

# 型チェック
npm run check

# リント
npm run lint

# ビルド
npm run build
```
