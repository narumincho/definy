# definy

シンプルな純粋関数型言語でビジュアルプログラミング言語, 実用を目指して開発しているプログラミング言語

![definyのスクリーンショット](https://repository-images.githubusercontent.com/168463361/72534f00-ec72-11e9-94f3-370ab473bc28)

- [vibe coding版definy](https://definy.narumincho.com/)
  開発中のためデータをよく削除しています
- [firebase版definy](https://definy.app/)

## アーキテクチャとディレクトリ構成

サーバーは Cloudflare Worker (`worker/`) で, 処理の中身は definy で書いたパーツ (`definy.handle-request`) をコンパイルした Wasm です。
UI は definy のストアの `html-ui` プロジェクトが HTML を返すだけのもので, 公開の読み取り専用版は別の Worker
([definy-html](https://definy-html.narumincho.workers.dev/)), 編集は手元のサーバー (`npm run serve`) が配ります ([docs/html-ui.md](docs/html-ui.md))。
AI からは MCP (`/mcp`) で読み書きします ([docs/mcp.md](docs/mcp.md))。

- `worker/`: Cloudflare Worker (`worker/index.ts` が入口。D1 のストア, definy の処理を動かすホストの能力)
- `cli/`: 手元のサーバー (`npm run serve`。MCP, html-ui の編集, 鍵での署名, 公開サーバーとの同期)
- `src/`: Worker・CLI・テストで共用する TypeScript (`stage1_compiler.ts`: 自己記述コンパイラ `wasm/stage1.wasm` を動かす, `auth.ts`: Ed25519 の鍵と署名 など)
- `wasm/stage1.wasm`: definy 言語自身で記述・自己コンパイルされた固定点 Wasm コンパイラ (外部 import ゼロ)
- `seeds/store/`: 組み込みモジュール (`core`, `std`, `wasi`, `sample`, `definy` など) の正本 ([docs/source-in-store.md](docs/source-in-store.md))
- `public/`: Worker の静的なファイル (`npm run build:seeds` が作る seed の束と, `/` の案内のページ)
- `wrangler.jsonc`: Worker のデプロイの設定 ([docs/cloudflare-workers-assets.md](docs/cloudflare-workers-assets.md))
- `docs/`: 設計・仕様のドキュメント

## 事前に必要な環境

- [Node.js](https://nodejs.org/) (v26.13.0 推奨, `.node-version` 準拠)
- [fnm](https://github.com/Schniz/fnm) (推奨: `.node-version` により自動で Node.js 26.13.0 が選択されます)
- npm

## 開発コマンド

```sh
# 依存パッケージのインストール
npm ci

# 手元の definy サーバー (MCP と編集できる html-ui。docs/local-server.md)
npm run serve

# 単体・適合テスト実行 (Vitest: stage1.wasm Wasm 実行 & D1 & Conformance)
npm test

# TypeScript 型検査
npm run check

# 高速 Linter (oxlint)
npm run lint

# コード整形 (Prettier)
npm run fmt

# シードバンドル生成 (seeds/store/ -> public/__definy_seed_bundle.json. build / test でも自動で実行。docs/build-artifacts.md)
npm run build:seeds

# Cloudflare Workers へのデプロイ (npm run build && wrangler deploy)
npm run deploy
```
