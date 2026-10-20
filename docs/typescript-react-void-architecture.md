# TypeScript + React 19 + Void 移行アーキテクチャと自己記述 Wasm 実行基盤

本ドキュメントでは、Rust (Dioxus + Rust crates) から **TypeScript + React 19 + Void (Vite 8 / Rolldown / Oxc)** への移行背景、アーキテクチャ、自己記述コンパイラ (`stage1.wasm`) の実行モデル、および開発ワークフローについてまとめます。

---

## 1. 移行の動機と背景

### ① ビルド時間の劇的な短縮

従来の構成（旧 Rust 実装・廃止済み）では、直列の重い Rust ビルドにおいて：

1. `dx build --package definy-client --release`（Rust → Dioxus WebAssembly クライアント）
2. `cargo build -p definy-worker-runtime --release --target wasm32-unknown-unknown`（Rust Worker ランタイム + `wasmi` インタプリタ）
3. `cargo run -p definy-server --release -- --export-seed-sql`（シード SQL 生成）

という直列の重い Rust ビルドが走り、コードを変更するたびに **約 2 分間** のビルド待ちが発生していました。
Vite 8 (Rolldown + Oxc) と Void を採用したことで、フルスタック全体のプロダクションビルドが **約 1.8 秒** で完了し、開発時は **ミリ秒単位の HMR (Hot Module Replacement)** で即時反映されるようになりました。

### ② 自己ホスト（「definy 自身で definy を表現できているか」）の検証の容易化

`definy` の言語コア（型検査 `core.type-check`、評価器 `core.eval-value`、Wasm コンパイラ `core.compile-to-wasm`）はすべて [seeds/core.json](../seeds/core.json) の中に書かれており、すでに **stage2 固定点（自己コンパイルした結果が元のバイナリと完全に一致する状態）** に到達しています。

従来の構成では、ブラウザで動かす Dioxus UI 側も Rust であり、Worker 側も Rust 製の `wasmi` を Wasm 化して動かしていたため、「Rust 側の処理で動いているのか、definy 自身のコードで動いているのか」が二重になっていました。
TypeScript + React に移行したことで：

- **ブラウザ側**: 標準の `WebAssembly` API に動的 Wasm コンパイルの制限がないため、`stage1.wasm` をブラウザ内で直接実行し、ユーザーが編集した式をその場で `.wasm` に動的コンパイルして V8 のネイティブ JIT で即時実行・検証できます。
- **サーバー側 (Cloudflare Workers)**: 静的 Wasm モジュールとしてバンドルし、D1 への永続化やデプロイを TypeScript の単一エコシステムで完結できます。

---

## 2. 自己記述コンパイラ (`stage1.wasm`) と TypeScript 実行モデル

### アーキテクチャ概要

[wasm/stage1.wasm](../wasm/stage1.wasm) は、`definy` 自身のコードから生成された **68,452 バイト** のスタンドアロンな Wasm バイナリです。外部環境への import は一切ありません (`Imports: []`)。

```
definy AST (JSON / Object)
       │
       ▼ [writeLiteral via linear memory]
 stage1.wasm (definy 製コンパイラ)
       │
       ▼ [alloc + function closure call via table]
 出力 Wasm バイナリ (Uint8Array, \0asm)
       │
       ▼ [WebAssembly.instantiate]
 V8 ネイティブ WebAssembly インスタンス
       │
       ▼ [evaluate()]
 評価結果 Value (Number, String, List, Record, Variant...)
```

### 線形メモリ ABI マーシャリング ([src/stage1_compiler.ts](../src/stage1_compiler.ts))

`stage1.wasm` は以下のエクスポートを持ちます：

- `evaluate()`: コンパイラ関数のクロージャ（Tag `5`）を指すポインタを返す
- `table`: クロージャ関数テーブル (`funcref`)
- `memory`: 線形メモリ（`WebAssembly.Memory`）
- `alloc(size: number) -> number`: 8 バイト境界でメモリをバンプアロケートする関数

TypeScript 側の [src/stage1_compiler.ts](../src/stage1_compiler.ts) では：

1. `writeLiteral` により、AST 式（Tag 0=Number, 1=Boolean, 2=String, 3=List, 4=Record, 6=Variant）の箱を 8 バイトアラインで Wasm メモリに配置。
2. クロージャの `tableIndex` と `envPtr` を読み取り、引数ポインタ配列 `[exprPtr, partsPtr]` を渡して `table.get(tableIndex)(envPtr, argsPtr)` を呼び出し。
3. 返却された Tag 3（List of Number: `0..=255`）から `Uint8Array` の Wasm バイナリを取り出す。
4. 取り出したバイナリを `WebAssembly.instantiate` して `evaluate()` を呼ぶことで、ネイティブ実行結果を即座に取得。

> [!TIP]
> [src/stage1_compiler.test.ts](../src/stage1_compiler.test.ts) にて、純粋な TypeScript + Wasm のみで `15 + 27 = 42` をコンパイル・評価するテストが **24ms** でパスしています。

---

## 3. Void によるフルスタック Cloudflare Workers 構成

Void は Vite をベースにした Cloudflare Workers フルスタックフレームワークです。

### プロジェクト構造

```
├── pages/                    # React 19 ページルーティング (@void/react)
│   ├── layout.tsx            # ルートレイアウト (DefinyProvider + Workbench)
│   ├── index.tsx             # イベントタイムライン
│   ├── parts.tsx             # パーツ一覧
│   ├── part/[id].tsx         # パーツ詳細 & Wasm 即時評価・インスペクター
│   ├── modules.tsx           # モジュール一覧
│   ├── module/[id].tsx       # モジュール詳細
│   ├── changes.tsx           # 未コミット作業中の変更
│   ├── history.tsx           # コミット履歴
│   ├── deployments.tsx       # Cloudflare Workers デプロイセンター
│   ├── accounts.tsx          # アカウント一覧
│   ├── settings.tsx          # 設定
│   └── about.tsx             # definy 紹介
├── middleware/
│   └── 01.definy.ts          # Worker API ルートのインターセプト
├── worker/                   # Cloudflare Worker バックエンド実装
│   ├── index.ts              # API ハンドラー (Connect-RPC, /virtual/wasm/*, /mcp)
│   ├── store.ts              # Cloudflare D1 (SQLite) イベントストア
│   ├── cloudflare_api.ts     # DeployCloudflare 用 API クライアント
│   └── cbor.ts               # 決定論的 CBOR & Ed25519 署名ユーティリティ
├── wasm/
│   └── stage1.wasm           # definy 自己記述コンパイラ (68KB)
├── src/
│   ├── components/           # Workbench, Header, ActivityBar, Sidebar, StatusBar...
│   ├── stage1_compiler.ts    # Wasm コンパイラ・評価パイプライン
│   ├── state.tsx             # React Context (AppState, i18n, イベント)
│   └── main.css              # IDE ダークテーマ スタイルシート
├── vite.config.ts            # voidPlugin() + voidReact()
├── vitest.config.ts          # Vitest 設定
└── package.json              # 依存関係・スクリプト
```

### ミドルウェアによる Worker ルーティングの統合

[middleware/01.definy.ts](../middleware/01.definy.ts) により、リクエストパスが API / 動的パス（`/healthz`、`/virtual/wasm/:hash`、`/definy.v1.*`、`/mcp`）の場合は [worker/index.ts](../worker/index.ts) の `handleWorkerRequest(c.req.raw, c.env)` を直結して処理し、それ以外のパスは `await next()` で React の各ページに流れる設計になっています。

---

## 4. UI ワークベンチ設計と React 19 実装

旧 definy-ui（Rust 実装・廃止済み）のダークテーマ IDE 設計（VS Code 風ワークベンチ）を React 19 で踏襲しています。

1. **タイトルバー ([src/components/Header.tsx](../src/components/Header.tsx))**:
   - サイドバー開閉トグル
   - definy ロゴ
   - コマンドパレット起動ボタン（`⌘P` / `Ctrl+P`）
   - 言語切替（英語 `en` / 日本語 `ja` / エスペラント語 `eo`）
   - アカウント表示 / ログインダイアログ
2. **アクティビティバー ([src/components/ActivityBar.tsx](../src/components/ActivityBar.tsx))**:
   - 画面切替（イベント / パーツ / モジュール / 変更 / 履歴 / アカウント / デプロイ / About / 設定）
   - 作業中の未コミット変更件数バッジ表示
3. **エクスプローラーサイドバー ([src/components/ExplorerSidebar.tsx](../src/components/ExplorerSidebar.tsx))**:
   - モジュール → パーツのツリービュー
   - インクリメンタル検索・絞り込み
   - マウスドラッグによるサイドバー幅の無段階リサイズ（`localStorage` に永続化）
4. **ステータスバー ([src/components/StatusBar.tsx](../src/components/StatusBar.tsx))**:
   - 接続状態インジケータ（緑=接続中 / 黄=確認中 / 灰=オフライン）
   - 未コミット変更ショートカット
   - 現在の言語名
5. **パーツ詳細 & ブラウザ内即時評価 ([pages/part/[id].tsx](../pages/part/[id].tsx))**:
   - **「式を評価 (Wasm)」ボタン**: バックエンド通信なしで、ブラウザ内で `stage1.wasm` を用いて式を Wasm に動的コンパイルし、V8 上で即座に実行して結果を表示。式が参照するパーツも集めて stage1 に渡す（[eval-conformance.md](eval-conformance.md) の「stage1.wasm の入力」を参照）。
   - **WebAssembly タブ**: 生成された Wasm バイナリのサイズ（バイト数）と先頭 16 進ダンプの確認。

---

## 5. 開発コマンド

```bash
# 開発サーバー起動（HMR 対応）
npm run dev

# 単体テスト実行 (Vitest)
npm test

# TypeScript 型検査 (tsc --noEmit)
npm run check

# 高速 Linter (oxlint)
npm run lint

# コード整形 (prettier)
npm run fmt

# プロダクションビルド (Worker + クライアント)
npm run build

# Cloudflare へのデプロイ
npm run deploy
```

---

## 6. 移行における重要な知見・トラブルシューティング

### ① Void CLI と Vite のコマンド役割分担

Void (`void`) は Vite 8 プラグインと連携して Cloudflare Workers フルスタックアプリを構築するフレームワークですが、CLI の動作について以下の点に注意が必要です：

- **`void dev` は存在しない**:
  - `npx void dev` を実行すると `■ cli: Unknown command 'dev'` となりエラーになります。ローカル開発サーバーの起動は標準の `vite`（`npm run dev`）を使用します。
- **`void build` の挙動と注意点**:
  - `npx void build` はローカルのビルドコマンドではなく、Void プラットフォームのリモートビルド管理やログ閲覧（`void build logs [build]` 等）を目的とした対話型コマンドです。
  - TTY 環境以外やスクリプトから `void build` を呼ぶと、対話プロンプト待ちでプロセスがハング・停止したように見える現象が発生します。
  - **ローカルでのプロダクションビルドには `vite build` (`npm run build`) を使用すること**が正しく、これにより `dist/ssr/` (Worker バックエンド) と `dist/client/` (クライアント静的アセット) が約 1.8 秒で高速生成されます。

### ② Vitest と Void プラグインの分離設定

`vite.config.ts` で `voidPlugin()` や `voidReact()` を有効化した状態で Vitest を実行すると、Vitest のテストワーカー内部で Void の SSR プラグインが干渉し、以下のエラーが発生することがあります：

```text
ReferenceError: module is not defined in runner-worker
```

**解決策**:
テスト設定を [vitest.config.ts](../vitest.config.ts) として独立させ、Void の SSR プラグインをバイパスして純粋なユニットテスト環境を提供します：

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}", "worker/**/*.test.ts"],
    environment: "node",
  },
});
```

これにより、Wasm 実行テスト（[src/stage1_compiler.test.ts](../src/stage1_compiler.test.ts)）などが Node.js / V8 の標準 `WebAssembly` 環境で約 20ms の超高速で実行可能になります。

### ③ 自己記述 Wasm バイナリ (`stage1.wasm`) の完全自己完結性

`definy` の自己記述コンパイラ [wasm/stage1.wasm](../wasm/stage1.wasm) は、外部環境からの import が一切ありません (`Imports: []`)。

- **WebAssembly インポートなし**: `wasi_snapshot_preview1` やホスト環境の関数に一切依存しないため、ブラウザ（Chrome, Firefox, Safari, Edge）、Node.js、Cloudflare Workers (V8 Isolate)、Deno、Bun など、WebAssembly 規格に準拠したあらゆるランタイムで追加のポリフィルやバインディングなしに `WebAssembly.instantiate(wasmBytes)` だけで即座に起動します。
- **メモリ管理**: コンパイラ自身が持つ `alloc(size: number) -> number` 関数により、線形メモリ内の 8 バイト境界アラインメントでバンプアロケーションを行い、AST を書き込むだけで安全にコンパイラクロージャ（Tag 5）を呼び出せます。
- **自己ホストの検証サイクル**: これにより、フロントエンドの UI 画面上でユーザーが式を変更した際、バックエンド通信や重いビルドツールを介さずに、ブラウザローカルで即座に Wasm バイナリを出力し、V8 ネイティブで評価結果を確認できるようになりました。
- **再生成についての注記**: 現時点で `wasm/stage1.wasm` や `wasm/self_hosted_definy_server.wasm` の再生成パイプライン、およびサーバー側の任意パーツ Wasm コンパイル (`compilePart`) は TypeScript 版では未実装（Rust 版では cargo で生成していた）です。

### ④ シードデータの自動初期化とブラウザ側 CBOR 射影

- **D1 自動スキーマ適用とシード同期 ([worker/store.ts](../worker/store.ts))**:
  - `npm run dev`（ローカル環境）では新規の SQLite データベースが空の状態で割り当てられます。`store.ensureSeeded` において、`events` テーブルの存在を検知して未作成時は DDL（[migrations/0001_initial_schema.sql](../migrations/0001_initial_schema.sql)）を自動適用し、イベント件数が 0 の場合は静的シードバンドル（`/__definy_seed_bundle.json` または `seeds/seed_bundle.json`）をロードして自動同期します。
  - すでにイベントが存在する本番環境やテスト環境では再シードを自動スキップし、安全かつ無駄なクエリを発生させません。
  - なお、シードバンドル（`seeds/seed_bundle.json` / `public/__definy_seed_bundle.json`）の再生成機能は TypeScript 版では未実装（Rust 版では cargo で生成していた）のため、既存のコミット済みバンドルファイルを直接使用します。
- **純粋なブラウザ対応 CBOR デコーダー ([src/cbor.ts](../src/cbor.ts))**:
  - `node:crypto` に依存しない標準 Web API（`atob`, `Uint8Array`, `TextDecoder`）のみで CBOR デコードおよび `ModuleCommit` 抽出を行い、署名済みイベントバイト列からモジュールメタデータ（`module_name`, `parts`, `expression`, `content_hash` 等）を React 状態（[src/state.tsx](../src/state.tsx)）へ動的に射影します。

---

## 5. Playwright による E2E テスト基盤

UI が正常にイベントを取得し、モジュール・パーツの表示や式評価が機能することを保証するため、Playwright による E2E テスト基盤（[playwright.config.ts](../playwright.config.ts) / [e2e/ui.test.ts](../e2e/ui.test.ts)）を導入しています。

```bash
# E2E テストの実行（開発サーバーの起動とブラウザ自動テスト）
npm run test:e2e
```

### 検証項目

1. **タイムライン画面 (`/`)**:
   - バックエンドの Connect-RPC (`/definy.v1.EventService/GetEvents`) からイベント一覧が取得され、`.event-card` が正常にレンダリングされること。
   - イベント種別（`module_commit`, `create_account`）のフィルターチップ（「アカウント作成」「すべて」）の切り替えが正しく機能すること。
2. **モジュール一覧画面 (`/modules`)**:
   - `core`, `sample` 等の組み込みモジュールがカード形式で一覧表示されること。
3. **パーツ一覧・詳細画面 (`/parts`, `/part/:id`)**:
   - パーツの検索絞り込み（`triangle` で `triangle-area` がヒット）とカードクリックによる詳細画面への遷移。
   - パーツ詳細画面での「式を評価」ボタン押下により、Wasm 評価器が実行され `.eval-result-card` に結果が出力されること。
