# コミットするファイルと生成するファイル

seed やコンパイラから作れるものはコミットせず、`npm run dev` / `npm run build` / `npm test` のたびに作る。

| ファイル                             | コミット | 作り方・理由                                                                                                                                                                                                                               |
| ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `seeds/*.json`                       | する     | ビルトインモジュールの正本                                                                                                                                                                                                                 |
| `wasm/stage1.wasm`                   | する     | definy 製コンパイラ自身のバイナリ。stage1 は今の stage1 でしかコンパイルできない (Rust 製の stage0 は廃止済み) ので、ブートストラップの種として残す。再生成は `npm run build:stage1` ([self-hosting.md](self-hosting.md))                  |
| `seeds/seed_bundle_fingerprint.json` | する     | seed バンドルの指紋。Worker が import するので型検査 (`npm run check`) の時点で必要。`npm run build:seeds` が書き、`src/seed_bundle.test.ts` が seed と一致するか確かめる                                                                  |
| `public/__definy_seed_bundle.json`   | しない   | `npm run build:seeds` (`scripts/generate_seed_bundle.ts`) が `seeds/*.json` と `wasm/stage1.wasm` から作る。Ed25519 の署名は決定的なので何度作っても同じになる。`dev` / `build` の前と Vitest の起動時 (`src/test_global_setup.ts`) に作る |

## stage1.wasm の配信

- ブラウザ: `src/stage1_browser.ts` が `new URL("../wasm/stage1.wasm", import.meta.url)` で参照し、Vite がハッシュ付きの静的アセット (`/assets/stage1-<hash>.wasm`) として出力する。
  `import url from "../wasm/stage1.wasm?url"` は Void の dev サーバーがその JS モジュールを `Content-Type: application/wasm` で返し、ブラウザが読み込めないので使わない
- Worker: `worker/part_compiler.ts` が `import stage1Module from "../wasm/stage1.wasm?module"` でバンドルに入れる

以前は `public/stage1.wasm` (コピー)、`seeds/seed_bundle.json` と `public/__definy_seed_bundle.json` (同じ内容の 2 つ)、seed バンドルの CAS の `stage1` キー (base64) と、同じものを何重にもコミットしていた。
