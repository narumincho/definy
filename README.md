# definy

純粋な式と能力 (Capability) による自律的システムを目指すプログラミング言語・エッジ実行環境。

![definyのスクリーンショット](https://repository-images.githubusercontent.com/168463361/72534f00-ec72-11e9-94f3-370ab473bc28)

- [本番環境 (Cloudflare Workers)](https://definy.narumincho.com/)
- [Workers.dev エンドポイント](https://definy.narumincho.workers.dev/)

## アーキテクチャとディレクトリ構成

TypeScript + React 19 + Void (Vite 8 / Rolldown / Oxc) によるフルスタック Cloudflare Workers 構成を採用しています。

- `pages/`: React 19 ページルーティング (`@void/react`)
  - イベントタイムライン、パーツ一覧/詳細、モジュール、コミット履歴、デプロイセンター等
- `src/`: UI ワークベンチ実装
  - `components/`: VS Code 風ワークベンチ、ActivityBar、ExplorerSidebar、CommandPalette、StatusBar 等
  - `stage1_compiler.ts`: definy 自己記述コンパイラ (`wasm/stage1.wasm`) の TypeScript 実行パイプライン
  - `state.tsx`: AppState, i18n, イベント管理 Context
  - `main.css`: IDE ダークテーマ スタイルシート
- `middleware/`: Void ミドルウェア (Connect-RPC, `/virtual/wasm/*`, `/mcp`, `/healthz` のインターセプト)
- `worker/`: Cloudflare Worker バックエンド実装
  - `index.ts`: API ハンドラー
  - `store.ts`: Cloudflare D1 (SQLite) イベント・CAS・デプロイ履歴ストア
  - `cloudflare_api.ts`: Cloudflare REST API v4 デプロイ連携
  - `cbor.ts`: 決定論的 CBOR & Ed25519 署名ユーティリティ
- `wasm/`:
  - `stage1.wasm`: definy 言語自身で記述・自己コンパイルされた固定点 Wasm コンパイラ (68KB, 外部 import ゼロ)
- `seeds/`: 組み込みモジュール (`core`, `std`, `wasi`, `sample`, `definy`) の seed 定義とバンドル JSON
- `docs/`: 設計・アーキテクチャドキュメント ([TypeScript + React + Void アーキテクチャ](docs/typescript-react-void-architecture.md) など)

## 事前に必要な環境

- [Node.js](https://nodejs.org/) (v26.12.0 推奨, `.node-version` 準拠)
- [fnm](https://github.com/Schniz/fnm) (推奨: `.node-version` により自動で Node.js 26.12.0 が選択されます)
- npm

## 開発コマンド

```sh
# 依存パッケージのインストール
npm ci

# 開発サーバー起動 (HMR 対応)
npm run dev

# 単体・適合テスト実行 (Vitest: stage1.wasm Wasm 実行 & D1 & Conformance)
npm test

# TypeScript 型検査
npm run check

# 高速 Linter (oxlint)
npm run lint

# コード整形 (Prettier)
npm run fmt

# フルスタック プロダクションビルド (Worker + クライアント)
npm run build

# Cloudflare Workers へのデプロイ
npm run deploy
```
