# Cloudflare Workers Static Assets 構成とデプロイ仕様

> [!NOTE]
> **Void (Vite 8) + React 19** のフルスタック構成。Void の `vite build` により、静的クライアント資産（`dist/client/`）と Cloudflare Worker SSR / API ルート（`dist/ssr/`）が一括ビルドされます。詳細は [typescript-react-void-architecture.md](typescript-react-void-architecture.md) を参照してください。

definy のフロントエンド（React 19 + `@void/react`）を **Cloudflare Workers Static Assets (`[assets]`)** を用いて配信し、Connect-RPC や CAS コンテンツ配信等のバックエンド API もすべて Worker 内で自己完結して処理する構成についての仕様ドキュメントです。

---

## 1. アーキテクチャ概要

Cloudflare Pages は Workers と統合され、静的フロントエンドとエッジサーバーの併用には **Workers Static Assets** が公式の最新推奨アプローチとなっています。デプロイは GitHub Actions でのビルドと `wrangler deploy` による Cloudflare Workers へのデプロイに一本化されています。

```
[ ブラウザ / クライアント ]
         │
         ▼
  [ Cloudflare Workers with Static Assets ]
    ├── Static Assets エンジン (dist/client/) ── エッジから直接キャッシュ配信
    │     ├── _headers: Wasm/JS/CSS キャッシュ & セキュリティヘッダー
    │     └── __definy_seed_bundle.json: 署名済み組み込みシードデータ
    │
    └── Worker スクリプト (dist/ssr/index.js) ── SSR & エッジ API 処理
          ├── SSR HTML レスポンス（セキュリティヘッダー付与）
          ├── EventService (/definy.v1.EventService/*)
          ├── HttpProxyService (/definy.v1.HttpProxyService/Fetch) ── 許可されたアカウントの HTTP リクエストを仲介 (CORS 回避)
          ├── 仮想 Wasm バイナリ (/virtual/wasm/*)
          └── ヘルスチェック (/healthz)
```

### 特徴

- **完全エッジ自己完結**: 外部の常時稼働コンテナサーバー（Fly.io 等）に依存せず、単一の Cloudflare Worker 上で UI 配信・Connect-RPC・CAS が完結します。デプロイは definy のパーツがブラウザから行います ([cloudflare-workers.md](cloudflare-workers.md))。
- **シードバンドル**: 静的シードバンドル（`public/__definy_seed_bundle.json`）は `npm run build` の最初に `npm run build:seeds` (`scripts/generate_seed_bundle.ts`) で `seeds/*.json` から作られ、`dist/client/` にコピーされて D1 データベースの初期化時に自動同期されます。コミットはしません ([build-artifacts.md](build-artifacts.md))。
- **GitHub Actions でビルド & デプロイ**: GitHub Actions (`.github/workflows/deploy.yaml`) で `npm ci`、`npm run build`、`wrangler deploy` を実行します。

---

## 2. ディレクトリ構成

- `wrangler.toml`: Workers および D1 バインディングのベース設定（Void が `dist/ssr/wrangler.json` を生成する際に参照）。D1 の `database_id` はここに固定で書く
- `public/`
  - `_headers`: 静的アセット配信ヘッダー設定（Void ビルド時に `dist/client/_headers` へコピーされる）
  - `__definy_seed_bundle.json`: ビルトインシードデータ (`npm run build:seeds` が生成。コミットしない)
- `wasm/stage1.wasm`: 自己記述コンパイラ Wasm バイナリ (クライアントにはハッシュ付きアセットとして出力される)
- `middleware/`
  - `01.definy.ts`: API パス（Connect-RPC, `/virtual/wasm/*`, `/healthz` 等）の Worker ディスパッチおよび SSR レスポンスへのセキュリティヘッダー付与
- `worker/`
  - `index.ts`: Worker リクエストハンドラー
  - `store.ts`: シードバンドルロード、D1 (SQLite) ストア
  - `cbor.ts`: 決定論的 CBOR & Ed25519 ユーティリティ
  - `types.ts`: 型定義

---

## 3. 設定 (`wrangler.toml`)

```toml
# Void (Vite 8) が dist/ssr/wrangler.json を生成する際のベース設定。
# main, [assets], compatibility_date 等は Void 側で自動設定される。
name = "definy"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "definy-db"
database_id = "d4c3a982-558e-4d58-95f8-bbc3ca391818"
```

ビルド時、Void により `dist/ssr/wrangler.json` が生成され、`assets`（`directory = "../client"`）や `main = "index.js"` が自動設定されます。

---

## 4. ビルドとデプロイ

### フルスタックビルド

```bash
npm run build
```

### テスト

```bash
npm test
```

### デプロイ

```bash
npm run deploy
```

### CI/CD (`.github/workflows/deploy.yaml`)

`main` ブランチへの push 時に GitHub Actions で自動デプロイされます。必要な GitHub Actions Secrets:

- `CLOUDFLARE_API_TOKEN`: Cloudflare Workers の編集権限を持つアカウントトークン（アカウント ID は API から自動解決されます）
