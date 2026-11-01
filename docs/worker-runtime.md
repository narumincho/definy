# Cloudflare Workers でのパーツコンパイル・評価

Cloudflare Worker (`definy`) で definy の Wasm を動かすときの仕組みと制約です。

パーツのデプロイは Worker ではしない。以前は `DeployService/DeployCloudflare` が Worker 内の stage1 でパーツを
コンパイルしてデプロイしていたが, デプロイは definy で書いたパーツ `definy.deploy-to-cloudflare-workers` が
ブラウザで definy 製のコンパイラを動かして行うようにした ([cloudflare-workers.md](cloudflare-workers.md), issue #733)。
`worker/part_compiler.ts`, `src/deploy_target.ts`, seed バンドルの handler の事前コンパイルは削除した。

## 構成

| ファイル                 | 役割                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `worker/type_check.ts`   | `SubmitEvent` のコミットの検査 (`definy.check-commit`) の入力を作る, 評価した値をパーツの中身にする            |
| `worker/commit_store.ts` | ストアのイベントを 500 件ずつ読む, 受け付けたコミットを読む (isolate の中で使い回す), ブランチの最新のコミット |
| `src/stage1_compiler.ts` | `stage1.wasm` を動かして式をコンパイルする, コンパイル結果を動かす (ブラウザ・Node.js 共通)                    |
| `src/wasi_io.ts`         | `wasi.io` のプログラムを動かすホスト ([wasi-io.md](wasi-io.md))                                                |
| `src/cbor.ts`            | CBOR、URL-safe Base64、SHA-256、Module ID / Part ID 導出 (ブラウザ・Node.js・Worker 共通)                      |
| `wasm/stage1.wasm`       | definy 自己記述コンパイラ。再生成は `npm run build:stage1` ([self-hosting.md](self-hosting.md))                |

### Workers の制約

以下は Worker で stage1 を動かしていたときの知見 (今は `wasm/type_checker.wasm` が同じ方法で動いている)。

- **実行時にバイト列から Wasm をコンパイルできない** (`Wasm code generation disallowed by embedder`)。Wasm は
  `import typeCheckerModule from "../wasm/type_checker.wasm?module"` のようにバンドルに入れ, Cloudflare が事前コンパイルした
  `WebAssembly.Module` から `new WebAssembly.Instance` する (これは許可されている)。Void (Vite) のビルドでは
  `dist/ssr/assets/*.wasm` が `compiled-wasm` モジュールとしてアップロードされる。Vitest (Node.js) では
  `vitest.config.ts` のプラグインが同じ `?module` を `new WebAssembly.Module(readFileSync(...))` にする
- 同じ理由で, **コンパイル結果を Worker 内で評価することはできない**
- **スタック**: Workers ではスタックを広げられない。以前の stage1 は補助関数がリストの長さだけ再帰し, 生成する関数が
  ローカル変数を 512 個固定で宣言していたため (1 フレーム 2KB 以上), 大きなパーツでスタックオーバーフローした。
  これを直したあと ([self-hosting.md](self-hosting.md) の「stage1 の再帰の深さとフレームの大きさ」), ローカルの workerd で
  確かめた結果 (2026-10-21, キャッシュを使わずにコンパイル):

  | パーツ                             | 出力  | 時間 (イベントの読み込みを含む)   |
  | ---------------------------------- | ----- | --------------------------------- |
  | `sample.greet`                     | 1.2KB | 0.1〜0.4 秒                       |
  | `core.type-check`                  | 167KB | 0.44 秒                           |
  | `core.compile-to-wasm`             | 81KB  | 0.35 秒                           |
  | `sample.self-hosted-definy-server` | 288KB | 0.95 秒 (キャッシュありで 0.3 秒) |

  Node.js では `sample.self-hosted-definy-server` の handler とコンパイラ自身のどちらも 100KB のスタックでコンパイルできる
  (既定は約 1MB)。それでもスタックが足りないときは `resource_exhausted` (HTTP 429) を返す

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

`src/wasi_io.test.ts` が `definy.deploy-to-cloudflare-workers` でコンパイル・アップロードした Wasm を,
デプロイ先と同じようにハンドラとして動かして確かめる。
