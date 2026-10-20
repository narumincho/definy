# Cloudflare Workers でのパーツコンパイル・評価

> [!NOTE]
> 従来の Rust 製 `definy-worker-runtime`（Rust + `wasmi`）および Deno は完全撤廃され、**TypeScript + self-hosted Wasm ([wasm/stage1.wasm](../wasm/stage1.wasm))** に一本化されました。詳細は [typescript-react-void-architecture.md](typescript-react-void-architecture.md) を参照してください。

Cloudflare Worker (`definy`) 内で definy のパーツを Wasm にコンパイル（`DeployService/DeployCloudflare` でデプロイ先 Worker に `app.wasm` として添付）したり、式を評価したりするときの仕組みです。

## 構成

| ファイル                           | 役割                                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `worker/part_compiler.ts`          | ストアのモジュールコミットからパーツの式を集め, `wasm/stage1.wasm` で Wasm にコンパイルする (`compilePartToWasm`)     |
| `src/deploy_target.ts`             | 式の中の `definy.deploy({ cloudflareWorkerName, cloudflareToken, handler })` の検出と, コンパイル結果のキャッシュキー |
| `src/stage1_compiler.ts`           | `stage1.wasm` を動かして式をコンパイルする (ブラウザ・Worker・Node.js 共通)                                           |
| `scripts/stage1_compile_worker.ts` | 大きなスタックの worker thread で stage1 を動かす (seed バンドル生成時の事前コンパイル)                               |
| `worker/cbor_eval.ts`              | definy 式の純粋 TypeScript 評価器 (AST / CBOR 評価)                                                                   |
| `worker/definy_runtime.ts`         | ModuleCommit のパーツを読み込んで `cbor_eval.ts` で式を評価する (評価器の適合テストで使う)                            |
| `worker/cbor.ts`                   | CBOR デコード、URL-safe Base64、SHA-256、Module ID / Part ID 導出                                                     |
| `wasm/stage1.wasm`                 | definy 自己記述コンパイラ (68KB)。再生成は `npm run build:stage1` ([self-hosting.md](self-hosting.md))                |

## パーツのコンパイル (`compilePartToWasm`)

`DeployCloudflare` の `partId` には次のどれかを書けます。

- パーツ ID (`deriveModulePartId(deriveModuleId(アカウント, モジュール名), パーツ名)` の URL-safe base64)
- `module.part`: **システムアカウント**のモジュールのパーツとして解決します。他のアカウントが同じ名前のモジュールを作っても
  乗っ取れないようにするためです。システムアカウントは環境変数 `DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY`、未設定なら開発用の鍵
  ([system-account.md](system-account.md))。本番で seed を別の鍵で署名したなら、Worker にもこの環境変数を設定します
- CAS の content hash (Wasm ならそのまま使い, それ以外は CBOR の式としてコンパイルする)

手順:

1. ストアの全モジュールコミットを読み, パーツ ID ごとに最新 (イベント時刻が最大) の定義を集める。式を持たず
   content hash だけのパーツは, 必要になったときに CAS から読む
2. 式に `definy.deploy({ cloudflareWorkerName, cloudflareToken, handler })` のレコードがあれば (旧 Rust 版の
   `detect_deploy_in_expression` と同じ探し方), `handler` だけをコンパイルし, worker 名とトークンをデプロイに使う
3. 参照パーツを `collectReferencedParts` で集める。見つからない・式が無い・コンパイラ組み込みのパーツがあれば `invalid_argument`
4. 入力 (式と参照パーツ) のハッシュ `stage1-output:<SHA-256>` が CAS にあればそれを使い, 無ければ stage1 でコンパイルする

### Workers の制約

- **実行時にバイト列から Wasm をコンパイルできない** (`Wasm code generation disallowed by embedder`)。stage1 は
  `import stage1Module from "../wasm/stage1.wasm?module"` でバンドルに入れ, Cloudflare が事前コンパイルした
  `WebAssembly.Module` から `new WebAssembly.Instance` する (これは許可されている)。Void (Vite) のビルドでは
  `dist/ssr/assets/stage1-*.wasm` が `compiled-wasm` モジュールとしてアップロードされる。Vitest (Node.js) では
  `vitest.config.ts` のプラグインが同じ `?module` を `new WebAssembly.Module(readFileSync(...))` にする
- 同じ理由で, **コンパイル結果を Worker 内で評価することはできない**。旧 Rust 版はコンパイル結果を評価して
  `evaluatedResult` を返していたが, TS 版ではパーツデプロイ時に `evaluatedResult` を返さない
- **stage1 の内部の再帰が深く, Workers の既定のスタックでは大きなパーツをコンパイルできない**。ローカルの workerd で
  確かめた結果 (2026-10-20):

  | パーツ                             | 結果                                          |
  | ---------------------------------- | --------------------------------------------- |
  | `sample.greet` など小さいパーツ    | 0.1〜0.3 秒でコンパイルできる                 |
  | `core.type-check` (167KB)          | 0.45 秒でコンパイルできる                     |
  | `sample.self-hosted-definy-server` | スタックオーバーフロー (事前コンパイルで対応) |
  | `core.compile-to-wasm`             | スタックオーバーフロー                        |

  スタックが足りないときは `resource_exhausted` (HTTP 429) を返す。`sample.self-hosted-definy-server` の handler は
  Node.js で 16MB 以上のスタックと約 10 秒が要る

### 事前コンパイル (seed バンドル)

`npm run build:seeds` は seed の各パーツのうち `definy.deploy` を持つものの handler を stage1 で事前にコンパイルし,
`stage1-output:<SHA-256>` をキーにして seed バンドルの contents (CAS) に入れる。stage1 は
`scripts/stage1_compile_worker.ts` の worker thread (`resourceLimits.stackSizeMb: 64`) で動かす
(`node --stack-size` はメインスレッドの OS のスタックを超えると落ちるため)。

キャッシュキーは入力だけで決まるので, `wasm/stage1.wasm` を作り直したら `npm run build:seeds` もやり直すこと。
UI から編集した (seed に無い) 大きなパーツは事前コンパイルされないので, Workers 上ではデプロイできない。
根本的には stage1 (seed の `core.compile-*`) の再帰を浅くする必要がある。

以前は `wasm/self_hosted_definy_server.wasm` (旧 Rust 製コンパイラで作った 528KB) を名前の部分一致で返していたが,
stage1 で作った handler (275KB) に置き換えて削除した。デプロイ先のシム (`worker/cloudflare_api.ts` の `worker.js`) で
動かしたときの応答は同じ。

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

`worker/part_compiler.test.ts` がパーツのコンパイル (名前・パーツ ID での指定, 事前コンパイルのキャッシュ,
スタック不足, 他アカウントの同名モジュール, 最新コミットの採用) を確かめる。
