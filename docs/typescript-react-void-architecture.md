# TypeScript + React 19 + Void アーキテクチャと自己記述 Wasm 実行基盤

本ドキュメントでは、**TypeScript + React 19 + Void (Vite 8 / Rolldown / Oxc)** の構成にした理由、アーキテクチャ、自己記述コンパイラ (`stage1.wasm`) の実行モデル、および開発ワークフローについてまとめます。

---

## 1. この構成にした理由

2026-10-18 (#699) まではブラウザの UI (Dioxus)・サーバー・Worker ランタイム (`wasmi`)・シード SQL 生成がすべて Rust で,
変更のたびに約 2 分のビルド待ちがあった。また UI もサーバーも Rust だったので,「Rust で動いているのか, definy 自身のコードで
動いているのか」が二重になっていた。

- **ビルドが速い**: Vite 8 (Rolldown + Oxc) と Void でフルスタックのプロダクションビルドが約 1.8 秒, 開発時は HMR で即時反映
- **言語の意味は definy だけが持つ**: 型検査 `core.type-check`・評価器 `core.eval-value`・Wasm コンパイラ `core.compile-to-wasm` は
  [seeds/core.json](../seeds/core.json) に書かれ, 自己コンパイルの不動点に達している。TypeScript はそれを動かすだけ
  - **ブラウザ側**: `stage1.wasm` をブラウザ内で直接実行し, 編集した式をその場で Wasm にコンパイルして V8 で実行できる
  - **サーバー側 (Cloudflare Workers)**: 実行時に Wasm をコンパイルできないので, 必要な Wasm (型チェッカー) はビルド時に作ってバンドルする

---

## 2. 自己記述コンパイラ (`stage1.wasm`) と TypeScript 実行モデル

### アーキテクチャ概要

[wasm/stage1.wasm](../wasm/stage1.wasm) は、`definy` 自身のコードから生成された スタンドアロンな Wasm バイナリ (2026-10-31 時点で 66,742 バイト. Wasm GC を使う) です。外部環境への import は一切ありません (`Imports: []`)。

```
definy AST (JSON / Object)
       │
       ▼ [writeLiteral via exported runtime functions (Wasm GC)]
 stage1.wasm (definy 製コンパイラ)
       │
       ▼ [function closure call via table]
 出力 Wasm バイナリ (Uint8Array, \0asm)
       │
       ▼ [WebAssembly.instantiate]
 V8 ネイティブ WebAssembly インスタンス
       │
       ▼ [evaluate()]
 評価結果 Value (Number, String, List, Record, Variant...)
```

### Wasm GC の値のやりとり ([src/stage1_compiler.ts](../src/stage1_compiler.ts))

stage1 とその出力は Wasm GC のモジュールで, 値は GC のヒープの struct です ([wasm-gc.md](wasm-gc.md))。エクスポートは：

- `evaluate()`: 式の値 (コンパイラならコンパイラ関数のクロージャ, タグ `5`) を返す
- `table`: クロージャ関数テーブル (`funcref`)
- `memory`: 文字列を渡すための置き場 (値は置かない)
- 値を作って読むランタイム関数 (`box_number`, `string_from_memory`, `values_new`, `value_tag`, `values_get` など)

TypeScript 側の [src/stage1_compiler.ts](../src/stage1_compiler.ts) では：

1. `writeLiteral` により、AST 式（Tag 0=Number, 1=Boolean, 2=String, 3=List, 4=Record, 6=Variant）をランタイム関数で Wasm の値にする。
2. クロージャの関数表の番号 (`closure_index`) と捕捉した変数 (`values_of`) を読み、引数の配列 `[expr, parts]` を作って `table.get(番号)(捕捉した変数, 引数)` を呼び出し。
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
│   ├── accounts.tsx          # アカウント一覧
│   ├── settings.tsx          # 設定
│   └── about.tsx             # definy 紹介
├── middleware/
│   └── 01.definy.ts          # Worker API ルートのインターセプト
├── worker/                   # Cloudflare Worker バックエンド実装
│   ├── index.ts              # API ハンドラー (Connect-RPC, /virtual/wasm/*, /healthz)
│   ├── store.ts              # Cloudflare D1 (SQLite) イベントストア
│   └── commit_store.ts       # 受け付けたコミットの読み出し
├── wasm/
│   └── stage1.wasm           # definy 自己記述コンパイラ
├── src/
│   ├── components/           # Workbench, Header, ActivityBar, Sidebar, ConnectionStatus...
│   ├── stage1_compiler.ts    # Wasm コンパイラ・評価パイプライン
│   ├── state.tsx             # React Context (AppState, i18n, イベント)
│   └── main.css              # IDE ダークテーマ スタイルシート
├── vite.config.ts            # voidPlugin() + voidReact()
├── vitest.config.ts          # Vitest 設定
└── package.json              # 依存関係・スクリプト
```

### ミドルウェアによる Worker ルーティングの統合

[middleware/01.definy.ts](../middleware/01.definy.ts) は全てのリクエストを [worker/index.ts](../worker/index.ts) の `handleWorkerRequest` に渡します。どのパスをサーバーが処理するか (`/healthz`、`/virtual/wasm/:hash`、`/definy.v1.*`) は definy の `definy.handle-request` が決め ([service.md](service.md))、それ以外のパスは `serveAsset` (`await next()`) で React の各ページに流れます。

---

## 4. UI ワークベンチ設計と React 19 実装

ダークテーマの VS Code 風ワークベンチです ([ui.md](ui.md))。

1. **タイトルバー ([src/components/Header.tsx](../src/components/Header.tsx))**:
   - サイドバー開閉トグル
   - definy ロゴ
   - コマンドパレット起動ボタン（`⌘P` / `Ctrl+P`）
   - 接続状態インジケータ（[src/components/ConnectionStatus.tsx](../src/components/ConnectionStatus.tsx)。緑=接続済み / 黄=確認中 / 赤=オフライン。接続済み以外は文字でも表示）
   - 言語切替（英語 `en` / 日本語 `ja` / エスペラント語 `eo`）
   - アカウント表示 / ログインダイアログ
2. **アクティビティバー ([src/components/ActivityBar.tsx](../src/components/ActivityBar.tsx))**:
   - 画面切替（イベント / プロジェクト / アカウント一覧 / 設定）。選んだものでサイドバーの欄が変わる
   - 作業中の未コミット変更件数バッジ表示
3. **エクスプローラーサイドバー ([src/components/ExplorerSidebar.tsx](../src/components/ExplorerSidebar.tsx))**:
   - プロジェクト ▸ ブランチ ▸ コミット ▸ モジュール ▸ パーツのツリービュー (イベント・アカウント一覧の欄もここで切り替える)
   - インクリメンタル検索・絞り込み
   - マウスドラッグによるサイドバー幅の無段階リサイズ（`localStorage` に永続化）
4. **パーツ詳細 ([pages/part/[id].tsx](../pages/part/[id].tsx)) と実行パネル ([src/components/RunPanel.tsx](../src/components/RunPanel.tsx))**:
   - **実行パネル**: ヘッダーのボタンか Ctrl + \` で出す。木構造のエディタで入力した式を、バックエンド通信なしでブラウザ内の `stage1.wasm` で Wasm にコンパイルして実行し、実行履歴に残す。式が参照するパーツも集めて stage1 に渡す（[run-panel.md](run-panel.md)）。

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

- **WebAssembly インポートなし**: `wasi_snapshot_preview1` やホスト環境の関数に一切依存しないため、ブラウザ（Chrome, Firefox, Safari, Edge）、Node.js、Cloudflare Workers (V8 Isolate) など、WebAssembly 規格に準拠したあらゆるランタイムで追加のポリフィルやバインディングなしに `WebAssembly.instantiate(wasmBytes)` だけで即座に起動します。
- **メモリ管理**: 値は Wasm GC の struct / array で, 使わなくなった値はランタイムの GC が回収します ([wasm-gc.md](wasm-gc.md))。
- **自己ホストの検証サイクル**: これにより、フロントエンドの UI 画面上でユーザーが式を変更した際、バックエンド通信や重いビルドツールを介さずに、ブラウザローカルで即座に Wasm バイナリを出力し、V8 ネイティブで評価結果を確認できるようになりました。
- **再生成とサーバー側コンパイル**: `wasm/stage1.wasm` は `npm run build:stage1` で再生成できます ([self-hosting.md](self-hosting.md))。デプロイ (`definy.deploy-to-cloudflare-workers`) もブラウザで definy 製のコンパイラを動かして行います ([cloudflare-workers.md](cloudflare-workers.md))。

### ④ シードデータの自動初期化とブラウザ側 CBOR 射影

- **D1 自動スキーマ適用とシード同期 ([worker/store.ts](../worker/store.ts))**:
  - `npm run dev`（ローカル環境）では新規の SQLite データベースが空の状態で割り当てられます。`store.ensureSeeded` において、`events` テーブルの存在を検知して未作成時は DDL（`worker/store.ts` の `D1_SCHEMA_STATEMENTS`）を自動適用し、イベント件数が 0 の場合は静的シードバンドル（`/__definy_seed_bundle.json`）をロードして自動同期します。
  - すでにイベントが存在する本番環境やテスト環境では再シードを自動スキップし、安全かつ無駄なクエリを発生させません。
  - シードバンドル（`public/__definy_seed_bundle.json`）は `npm run build:seeds` (`scripts/generate_seed_bundle.ts`) が生成し、`npm run dev` / `npm run build` / `npm test` でも自動で作られます。コミットするのは指紋 `seeds/seed_bundle_fingerprint.json` だけです ([build-artifacts.md](build-artifacts.md))。
- **純粋なブラウザ対応 CBOR デコーダー ([src/cbor.ts](../src/cbor.ts))**:
  - `node:crypto` に依存しない標準 Web API（`Uint8Array`, `TextDecoder`）のみで CBOR をデコードし、[src/decoded_event.ts](../src/decoded_event.ts) がプロジェクトのコミットを取り出して、署名済みイベントバイト列からモジュールメタデータ（`module_name`, `parts`, `expression`, `content_hash` 等）を React 状態（[src/state.tsx](../src/state.tsx)）へ動的に射影します。

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
   - イベント種別（`project_commit`, `create_account`）のフィルターチップ（「アカウント作成」「すべて」）の切り替えが正しく機能すること。
2. **モジュール一覧画面 (`/modules`)**:
   - `core`, `sample` 等の組み込みモジュールがカード形式で一覧表示されること。
3. **パーツ一覧・詳細画面 (`/parts`, `/part/:id`)**:
   - パーツの検索絞り込み（`triangle` で `triangle-area` がヒット）とカードクリックによる詳細画面への遷移。
   - 実行パネルで開いているパーツを入力して実行すると、Wasm 評価器が実行され `.run-history-entry` に結果が出力されること。再実行で履歴が増えること。
