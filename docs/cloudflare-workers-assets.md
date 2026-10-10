# Cloudflare Workers Static Assets 構成とデプロイ仕様

definy のフロントエンド（`definy-ui` / `definy-client`）を **Cloudflare Workers Static Assets (`[assets]`)** を用いて配信し、Connect-RPC や CAS コンテンツ配信、プレビュー実行、Cloudflare 自己デプロイ等のバックエンド API もすべて Worker 内で自己完結して処理する構成についての仕様ドキュメントです。

---

## 1. アーキテクチャ概要

Cloudflare Pages は Workers と統合され、静的フロントエンドとエッジサーバーの併用には **Workers Static Assets** が公式の最新推奨アプローチとなっています。また、旧 Fly.io バックエンドは廃止され、GitHub Actions でのビルドと `wrangler deploy` による Cloudflare Workers へのデプロイに一本化されています。

```
[ ブラウザ / クライアント ]
         │
         ▼
  [ Cloudflare Workers with Static Assets ]
    ├── Static Assets エンジン (dist-assets/) ── エッジから直接キャッシュ配信
    │     ├── not_found_handling: "single-page-application" (SPA 自動フォールバック)
    │     ├── _headers: Wasm/JS/CSS 長期不変キャッシュ & セキュリティヘッダー
    │     └── __definy_seed_bundle.json: ビルド時に生成された署名済み組み込みシードデータ
    │
    └── Worker スクリプト (worker/index.ts) ── エッジ内で直接 API 処理
          (run_worker_first で直接ディスパッチ)
          ├── EventService (/definy.v1.EventService/*)
          ├── DeployService (/definy.v1.DeployService/*) ── Cloudflare REST API v4 へ直接デプロイ
          ├── PreviewService (/definy.v1.PreviewService/*)
          ├── インサーバープレビュー (/preview/*, <app>.definy.workers.dev)
          ├── 仮想 Wasm バイナリ (/virtual/wasm/*)
          └── ヘルスチェック (/healthz)
```

### 特徴とメリット
- **完全エッジ自己完結**: 外部の常時稼働コンテナサーバー（Fly.io 等）に依存せず、単一の Cloudflare Worker 上で UI 配信・Connect-RPC・CAS・自己デプロイが完結します。
- **決定論的シードバンドル**: ビルド時に `cargo run -p definy-server --release -- --export-seed-bundle dist-assets/__definy_seed_bundle.json` を実行し、`COMPILER_SYSTEM_KEY_SEED` で署名された組み込みモジュール（`core`, `std`, `sample`, `wasi`）のイベントと CAS コンテンツを Static Assets に同梱します。
- **Workers Builds ではなく GitHub Actions でビルド**: Cloudflare ダッシュボード側の「Workers Builds」には Rust の Wasm ターゲットや Dioxus CLI (`dx`) 環境がないため、GitHub Actions (`.github/workflows/deploy.yaml`) でビルドと `wrangler deploy` を実行します。

---

## 2. ディレクトリ構成

- `wrangler.toml`: Workers および Static Assets の設定
- `worker/`
  - `index.ts`: Worker エントリポイント（Connect-RPC, Preview, Virtual Wasm, `env.ASSETS` フォールバック）
  - `store.ts`: シードバンドルロード、イベント・CAS・デプロイ履歴・プレビューアプリのストア
  - `cloudflare_api.ts`: Cloudflare REST API v4 クライアント（`DeployCloudflare`, `ListCloudflareWorkers`）
  - `types.ts`: 型定義
  - `worker_test.ts`: Deno 単体テスト
- `worker-assets/`
  - `_headers`: Wasm, JS, CSS のキャッシュポリシーおよびセキュリティヘッダー
- `scripts/build-assets.sh`: Dioxus ビルド成果物、ヘッダー設定、シードバンドルを統合して `dist-assets/` を生成するスクリプト

---

## 3. 設定 (`wrangler.toml`)

```toml
name = "definy"
main = "worker/index.ts"
compatibility_date = "2024-09-23"

[assets]
directory = "./dist-assets"
not_found_handling = "single-page-application"
run_worker_first = [
  "/definy.v1.*",
  "/preview/*",
  "/virtual/*",
  "/mcp",
  "/healthz",
  "/swagger-ui*",
  "/api-docs/*",
]
```

---

## 4. ビルドとデプロイ

### ローカルビルド & パッケージング
```bash
# Dioxus クライアントビルド + シードバンドル出力 + dist-assets パッケージングを一括実行
bash scripts/build-assets.sh
```

### Worker 単体テスト
```bash
deno test worker/
```

### ローカルでの Wrangler 開発サーバー起動
```bash
npx wrangler dev
```

### CI/CD (`.github/workflows/deploy.yaml`)
`main` ブランチへの push 時に GitHub Actions で自動デプロイされます。
必要な GitHub Actions Secrets:
- `CLOUDFLARE_API_TOKEN`: Cloudflare Workers の編集権限を持つ API トークン
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare アカウント ID
