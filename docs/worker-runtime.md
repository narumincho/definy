# Cloudflare Workers でのパーツコンパイル・評価 (`worker/definy_runtime.ts`)

> [!NOTE]
> 従来の Rust 製 `definy-worker-runtime`（Rust + `wasmi`）および Deno は完全撤廃され、**TypeScript + self-hosted Wasm ([wasm/stage1.wasm](../wasm/stage1.wasm), [wasm/self_hosted_definy_server.wasm](../wasm/self_hosted_definy_server.wasm))** に一本化されました。詳細は [typescript-react-void-architecture.md](typescript-react-void-architecture.md) を参照してください。

Cloudflare Worker (`definy`) 内で definy のパーツを Wasm にコンパイル（`DeployService/DeployCloudflare` でデプロイ先 Worker に `app.wasm` として添付）したり、式を評価したりするときの仕組みです。

## TypeScript + self-hosted Wasm ランタイム

式評価器は純粋な TypeScript (`worker/cbor_eval.ts`) で実装されており、すべての definy 式（算術、論理、文字列、リスト、レコード、バリアント、関数呼び出し、マッチ構文）を評価します。

また、definy 自身の自己記述固定点コンパイラ [wasm/stage1.wasm](../wasm/stage1.wasm) (68KB) およびセルフホストサーバー Wasm [wasm/self_hosted_definy_server.wasm](../wasm/self_hosted_definy_server.wasm) はリポジトリ内で直接追跡され、Rust ツールチェインや Deno なしで Node.js + Vitest / Void 環境から実行可能です。

なお、任意のパーツをサーバー側で完全な Wasm にコンパイルする機能（`compilePart`）や、`stage1.wasm` / `self_hosted_definy_server.wasm` を再生成する機能は現時点で TypeScript 版では**未実装（Rust 版では cargo で生成していた）**です。現在 `compilePart` はサンプルの `self-hosted-definy-server` の事前ビルド済み Wasm または最小 Wasm を返すスタブとなっています。

## 構成

| ファイル                              | 役割                                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `worker/cbor_eval.ts`                 | definy 式の純粋 TypeScript 評価器 (AST / CBOR 評価)                                                      |
| `worker/cbor.ts`                      | CBOR デコード、URL-safe Base64、SHA-256、Module ID / Part ID 導出                                        |
| `worker/definy_runtime.ts`            | ランタイム本体。ModuleCommit のパーツ登録、式評価 (`callAsync`)、パーツコンパイル (`compilePart`) を提供 |
| `worker/http_stream.ts`               | D1 / ストアからイベントと CAS コンテンツを集めてランタイムに渡し、`compilePartToWasm` を提供する         |
| `wasm/stage1.wasm`                    | definy 自己記述コンパイラ (68KB)                                                                         |
| `wasm/self_hosted_definy_server.wasm` | セルフホスト definy サーバーの Wasm モジュール                                                           |

要求（`op`）は `loadEvents` / `loadContents` / `missingContents` / `compilePart` / `evaluate` / `evaluateExpression`。読み込んだイベントは isolate が生きている間ランタイム内に保持し、2 回目以降は新しいイベントだけを渡します。

## テストと適合検証

```sh
# Vitest による適合テスト・Worker 単体テスト
npm test

# 型チェック
npm run check

# リント
npm run lint

# ビルド
npm run build
```
