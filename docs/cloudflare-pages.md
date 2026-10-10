# Cloudflare Pages 構成とデプロイ仕様

definy のフロントエンド（`definy-ui` / `definy-client`）を Cloudflare Pages に配置し、全世界のエッジロケーションから高速かつ低遅延にアセットを配信する構成についてのドキュメントです。

---

## 1. アーキテクチャ概要

```
[ ブラウザ / クライアント ]
         │
         ▼
  [ Cloudflare Pages (CDN + Functions) ]
    ├── 静的アセット (/assets/*, /wasm/*, /index.html) ── エッジから直接キャッシュ配信
    │     ├── _redirects: /* /index.html 200 (SPAクライアントルーティング)
    │     └── _headers: Wasm/JS/CSS 長期キャッシュ & Content-Type ヘッダー
    │
    └── Pages Functions (pages/functions/[[path]].ts) ── バックエンドへ透過プロキシ
          ├── Connect-RPC API (/definy.v1.*)
          ├── プレビュー実行 (/preview/*)
          ├── 仮想 Wasm (/virtual/wasm/*)
          └── MCP / Swagger (/mcp, /swagger-ui, /api-docs/*)
                  │
                  ▼
         [ バックエンドサーバー (Fly.io / Cloudflare Workers) ]
```

### Same-Origin によるメリット
- クライアントブラウザからは、すべて Cloudflare Pages の同一オリジン（Same-Origin）として通信できます。
- CORS 設定やプリフライトリクエストのオーバーヘッドがなく、Cookie（`SameSite=Lax`）認証も安全に動作します。
- 将来バックエンドサーバーを Fly.io から Cloudflare Workers へ完全移行する際も、クライアント側のコードを変更することなく、プロキシ先または同一 Worker への統合が可能です。

---

## 2. ディレクトリ構成

- `pages/`
  - `_redirects`: SPA用フォールバック設定 (`/* /index.html 200`)
  - `_headers`: Wasm, JS, CSS のキャッシュポリシーおよびセキュリティヘッダー
  - `functions/`
    - `[[path]].ts`: リバースプロキシ兼フォールバックハンドラー
    - `proxy_test.ts`: プロキシ判定およびエラーハンドリングの単体テスト
- `scripts/build-pages.sh`: Dioxus ビルド成果物と Pages 設定・Functions を統合して `dist-pages/` を生成するスクリプト

---

## 3. プロキシルーティング仕様 (`pages/functions/[[path]].ts`)

以下のパスパターンに該当するリクエストはバックエンドサーバーへプロキシされます：

| パスパターン | 用途 |
|---|---|
| `/definy.v1.*` | Connect-RPC API エンドポイント |
| `/preview/*` | Webアプリのインサーバープレビュー実行 |
| `/virtual/wasm/*` | 仮想 Wasm バイナリ配信 |
| `/mcp` | Model Context Protocol エンドポイント |
| `/healthz` | ヘルスチェック |
| `/swagger-ui*`, `/api-docs/*` | OpenAPI / Swagger UI |

上記以外のパス（`/index.html`, `/wasm/definy_client.js`, `/projects/123` など）は `context.next()` により Cloudflare Pages の静的アセットエンジンへフォールバックされ、静的ファイルまたは SPA ルーティングとして処理されます。

### エラーハンドリング
バックエンドサーバーが一時的にダウンしている場合：
- `/definy.v1.*` のリクエストに対しては、Connect-RPC 準拠のエラー JSON（HTTP 503 `unavailable`）を返却し、クライアント UI が「サーバー切断 / 接続中」状態を正しく表示できるようにします。
- その他のリクエストに対しては HTTP 502 Bad Gateway を返却します。

---

## 4. ビルドとローカル検証

### ビルド
```bash
bash scripts/build-pages.sh
```
`target/dx/definy_client/release/web/public/` のビルド成果物と `pages/` 以下のファイルが `dist-pages/` にパッケージングされます。

### Deno による Functions のテスト
```bash
deno test pages/
deno lint
deno fmt --check
```

### Wrangler によるローカルプレビュー
```bash
npx wrangler pages dev dist-pages
```

---

## 5. CI / CD と本番デプロイ

### GitHub Actions
`.github/workflows/deploy.yaml` により、`main` ブランチへのプッシュ時に自動的に Cloudflare Pages へデプロイされます。

### 必要な環境変数・Secrets
- `CLOUDFLARE_API_TOKEN`: Cloudflare API トークン（Pages デプロイ権限）
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare アカウント ID
- `DEFINY_SERVER_URL`: （Pages Functions 環境変数）バックエンドサーバーのベース URL（デフォルト: `https://definy.fly.dev`）
