# TypeScript + React 19 + Void 移行アーキテクチャと自己記述 Wasm 実行基盤

本ドキュメントでは、Rust (Dioxus + Rust crates) から **TypeScript + React 19 + Void (Vite 8 / Rolldown / Oxc)** への移行背景、アーキテクチャ、自己記述コンパイラ (`stage1.wasm`) の実行モデル、および開発ワークフローについてまとめます。

---

## 1. 移行の動機と背景

### ① ビルド時間の劇的な短縮

従来の構成では、[scripts/build-assets.sh](file:///Users/narumi/Documents/GitHub/definy/scripts/build-assets.sh) において：

1. `dx build --package definy-client --release`（Rust → Dioxus WebAssembly クライアント）
2. `cargo build -p definy-worker-runtime --release --target wasm32-unknown-unknown`（Rust Worker ランタイム + `wasmi` インタプリタ）
3. `cargo run -p definy-server --release -- --export-seed-sql`（シード SQL 生成）

という直列の重い Rust ビルドが走り、コードを変更するたびに **約 2 分間** のビルド待ちが発生していました。
Vite 8 (Rolldown + Oxc) と Void を採用したことで、フルスタック全体のプロダクションビルドが **1.88 秒** で完了し、開発時は **ミリ秒単位の HMR (Hot Module Replacement)** で即時反映されるようになりました。

### ② 自己ホスト（「definy 自身で definy を表現できているか」）の検証の容易化

`definy` の言語コア（型検査 `core.type-check`、評価器 `core.eval-value`、Wasm コンパイラ `core.compile-to-wasm`）はすべて [seeds/core.json](file:///Users/narumi/Documents/GitHub/definy/seeds/core.json) の中に書かれており、すでに **stage2 固定点（自己コンパイルした結果が元のバイナリと完全に一致する状態）** に到達しています。

従来の構成では、ブラウザで動かす Dioxus UI 側も Rust であり、Worker 側も Rust 製の `wasmi` を Wasm 化して動かしていたため、「Rust 側の処理で動いているのか、definy 自身のコードで動いているのか」が二重になっていました。
TypeScript + React に移行したことで：

- **ブラウザ側**: 標準の `WebAssembly` API に動的 Wasm コンパイルの制限がないため、`stage1.wasm` をブラウザ内で直接実行し、ユーザーが編集した式をその場で `.wasm` に動的コンパイルして V8 のネイティブ JIT で即時実行・検証できます。
- **サーバー側 (Cloudflare Workers)**: 静的 Wasm モジュールとしてバンドルし、D1 への永続化やデプロイを TypeScript の単一エコシステムで完結できます。

---

## 2. 自己記述コンパイラ (`stage1.wasm`) と TypeScript 実行モデル

### アーキテクチャ概要

[wasm/stage1.wasm](file:///Users/narumi/Documents/GitHub/definy/wasm/stage1.wasm) は、`definy` 自身のコードから生成された **68,452 バイト** のスタンドアロンな Wasm バイナリです。外部環境への import は一切ありません (`Imports: []`)。

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

### 線形メモリ ABI マーシャリング ([src/stage1_compiler.ts](file:///Users/narumi/Documents/GitHub/definy/src/stage1_compiler.ts))

`stage1.wasm` は以下のエクスポートを持ちます：

- `evaluate()`: コンパイラ関数のクロージャ（Tag `5`）を指すポインタを返す
- `table`: クロージャ関数テーブル (`funcref`)
- `memory`: 線形メモリ（`WebAssembly.Memory`）
- `alloc(size: number) -> number`: 8 バイト境界でメモリをバンプアロケートする関数

TypeScript 側の [src/stage1_compiler.ts](file:///Users/narumi/Documents/GitHub/definy/src/stage1_compiler.ts) では：

1. `writeLiteral` により、AST 式（Tag 0=Number, 1=Boolean, 2=String, 3=List, 4=Record, 6=Variant）の箱を 8 バイトアラインで Wasm メモリに配置。
2. クロージャの `tableIndex` と `envPtr` を読み取り、引数ポインタ配列 `[exprPtr, partsPtr]` を渡して `table.get(tableIndex)(envPtr, argsPtr)` を呼び出し。
3. 返却された Tag 3（List of Number: `0..=255`）から `Uint8Array` の Wasm バイナリを取り出す。
4. 取り出したバイナリを `WebAssembly.instantiate` して `evaluate()` を呼ぶことで、ネイティブ実行結果を即座に取得。

> [!TIP]
> [src/stage1_compiler.test.ts](file:///Users/narumi/Documents/GitHub/definy/src/stage1_compiler.test.ts) にて、純粋な TypeScript + Wasm のみで `15 + 27 = 42` をコンパイル・評価するテストが **24ms** でパスしています。

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

[middleware/01.definy.ts](file:///Users/narumi/Documents/GitHub/definy/middleware/01.definy.ts) により、リクエストパスが API / 動的パス（`/healthz`、`/virtual/wasm/:hash`、`/definy.v1.*`、`/mcp`）の場合は [worker/index.ts](file:///Users/narumi/Documents/GitHub/definy/worker/index.ts) の `handleWorkerRequest(c.req.raw, c.env)` を直結して処理し、それ以外のパスは `await next()` で React の各ページに流れる設計になっています。

---

## 4. UI ワークベンチ設計と React 19 実装

[definy-ui](file:///Users/narumi/Documents/GitHub/definy/definy-ui/src/lib.rs) のダークテーマ IDE 設計（VS Code 風ワークベンチ）を React 19 で踏襲しています。

1. **タイトルバー ([src/components/Header.tsx](file:///Users/narumi/Documents/GitHub/definy/src/components/Header.tsx))**:
   - サイドバー開閉トグル
   - definy ロゴ
   - コマンドパレット起動ボタン（`⌘P` / `Ctrl+P`）
   - 言語切替（英語 `en` / 日本語 `ja` / エスペラント語 `eo`）
   - アカウント表示 / ログインダイアログ
2. **アクティビティバー ([src/components/ActivityBar.tsx](file:///Users/narumi/Documents/GitHub/definy/src/components/ActivityBar.tsx))**:
   - 画面切替（イベント / パーツ / モジュール / 変更 / 履歴 / アカウント / デプロイ / About / 設定）
   - 作業中の未コミット変更件数バッジ表示
3. **エクスプローラーサイドバー ([src/components/ExplorerSidebar.tsx](file:///Users/narumi/Documents/GitHub/definy/src/components/ExplorerSidebar.tsx))**:
   - モジュール → パーツのツリービュー
   - インクリメンタル検索・絞り込み
   - マウスドラッグによるサイドバー幅の無段階リサイズ（`localStorage` に永続化）
4. **ステータスバー ([src/components/StatusBar.tsx](file:///Users/narumi/Documents/GitHub/definy/src/components/StatusBar.tsx))**:
   - 接続状態インジケータ（緑=接続中 / 黄=確認中 / 灰=オフライン）
   - 未コミット変更ショートカット
   - 現在の言語名
5. **パーツ詳細 & ブラウザ内即時評価 ([pages/part/[id].tsx](file:///Users/narumi/Documents/GitHub/definy/pages/part/[id].tsx))**:
   - **「式を評価 (Wasm)」ボタン**: バックエンド通信なしで、ブラウザ内で `stage1.wasm` を用いて式を Wasm に動的コンパイルし、V8 上で即座に実行して結果を表示。
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
