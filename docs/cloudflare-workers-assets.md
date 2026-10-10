# Cloudflare Workers Static Assets 構成とデプロイ仕様

definy のフロントエンド（`definy-ui` / `definy-client`）を **Cloudflare Workers Static Assets (`[assets]`)** を用いて配信し、Connect-RPC やプレビュー実行等のバックエンド API を Worker で透過リバースプロキシする構成についての仕様ドキュメントです。

---

## 1. アーキテクチャ概要

Cloudflare Pages は Workers と統合され、静的フロントエンドとエッジサーバーの併用には **Workers Static Assets** が公式の最新推奨アプローチとなっています。

```
[ ブラウザ / クライアント ]
         │
         ▼
  [ Cloudflare Workers with Static Assets ]
    ├── Static Assets エンジン (dist-assets/) ── エッジから直接キャッシュ配信
    │     ├── not_found_handling: "single-page-application" (SPA 自動フォールバック)
    │     └── _headers: Wasm/JS/CSS 長期不変キャッシュ & セキュリティヘッダー
    │
    └── Worker スクリプト (worker/index.ts) ── バックエンドへ透過プロキシ
          (run_worker_first で直接ディスパッチ)
          ├── Connect-RPC API (/definy.v1.*)
          ├── インサーバープレビュー (/preview/*)
          ├── 仮想 Wasm バイナリ (/virtual/wasm/*)
          └── MCP / Swagger (/mcp, /swagger-ui, /api-docs/*)
                  │
                  ▼
         [ バックエンドサーバー (Fly.io / 将来の Workers API サーバー) ]
```

### Same-Origin & ハイブリッド構成のメリット
- **Same-Origin 化**: クライアントブラウザからはすべて Worker の同一オリジンとして通信できるため、CORS プリフライトがなく高速で、Cookie 認証も安全に動作します。
- **高速な静的配信**: `run_worker_first` により、API リクエストは即座に Worker に到達し、通常のアセット（`/assets/*`, `/wasm/*`, `/index.html`）は静的アセットエンジンから直接超高速に返却されます。
- **SPA 対応**: `not_found_handling = "single-page-application"` により、アセットが存在しないパス（例: `/projects/123`, `/login`）は自動的に `index.html`（HTTP 200）が返され、Dioxus ルーターで処理されます。
- **将来の完全移行への足がかり**: 将来 Fly.io バックエンドを Workers に完全統合する際も、同一の Worker プロジェクト内で完結します。

---

## 2. ディレクトリ構成

- `wrangler.toml`: Workers および Static Assets の設定
- `worker/`
  - `index.ts`: Worker エントリポイント（透過リバースプロキシ & `env.ASSETS` フォールバック）
  - `proxy_test.ts`: プロキシ判定およびエラーハンドリングの Deno 単体テスト
- `worker-assets/`
  - `_headers`: Wasm, JS, CSS のキャッシュポリシーおよびセキュリティヘッダー
- `scripts/build-assets.sh`: Dioxus ビルド成果物と静的設定を統合して `dist-assets/` を生成するスクリプト

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

[vars]
DEFINY_SERVER_URL = "https://definy.fly.dev"
```

---

## 4. プロキシルーティング仕様 (`worker/index.ts`)

`run_worker_first` に指定されたパスは Worker スクリプトへルーティングされます：

| パスパターン | 用途 |
|---|---|
| `/definy.v1.*` | Connect-RPC API エンドポイント |
| `/preview/*` | Webアプリのインサーバープレビュー実行 |
| `/virtual/wasm/*` | 仮想 Wasm バイナリ配信 |
| `/mcp` | Model Context Protocol エンドポイント |
| `/healthz` | ヘルスチェック |
| `/swagger-ui*`, `/api-docs/*` | OpenAPI / Swagger UI |

### エラーハンドリング
バックエンドサーバーが一時的にダウンしている場合：
- `/definy.v1.*` のリクエストに対しては、Connect-RPC 準拠のエラー JSON（HTTP 503 `unavailable`）を返却し、クライアント UI が「サーバー切断 / 接続中」状態を正しく表示できるようにします。
- その他のリクエストに対しては HTTP 502 Bad Gateway を返却します。

---

## 5. ビルドとローカル検証

### ビルド
```bash
bash scripts/build-assets.sh
```
`target/dx/definy_client/release/web/public/` のビルド成果物と `worker-assets/_headers` が `dist-assets/` にパッケージングされます。

### Deno による Worker のテスト
```bash
deno test worker/
deno lint
deno fmt --check
```

### Wrangler によるローカル開発・プレビュー
```bash
npx wrangler dev
```

---

## 6. CI / CD と本番デプロイ

### GitHub Actions
`.github/workflows/deploy.yaml` により、`main` ブランチへのプッシュ時に自動的に `wrangler deploy` が実行されます。

### 必要な環境変数・Secrets
- `CLOUDFLARE_API_TOKEN`: Cloudflare API トークン（Workers & Assets デプロイ権限）
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare アカウント ID
- `DEFINY_SERVER_URL`: （Worker 環境変数）バックエンドサーバーのベース URL（デフォルト: `https://definy.fly.dev`）
