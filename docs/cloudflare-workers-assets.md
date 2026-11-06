# Cloudflare Workers Static Assets 構成とデプロイ仕様

> [!NOTE]
> **Void (Vite 8) + React 19** のフルスタック構成。Void の `vite build` により、静的クライアント資産（`dist/client/`）と Cloudflare Worker SSR / API ルート（`dist/ssr/`）が一括ビルドされます。詳細は [typescript-react-void-architecture.md](typescript-react-void-architecture.md) を参照してください。

definy のフロントエンド（React 19 + `@void/react`）を **Cloudflare Workers Static Assets (`[assets]`)** を用いて配信し、Connect-RPC や CAS コンテンツ配信等のバックエンド API もすべて Worker 内で自己完結して処理する構成についての仕様ドキュメントです。

---

## 1. アーキテクチャ概要

Cloudflare Pages は Workers と統合され、静的フロントエンドとエッジサーバーの併用には **Workers Static Assets** が公式の最新推奨アプローチとなっています。デプロイは GitHub Actions からの `void deploy --platform cloudflare` による Cloudflare Workers へのデプロイに一本化されています。

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
- **GitHub Actions でビルド & デプロイ**: GitHub Actions (`.github/workflows/deploy.yaml`) で `npm ci` の後に `void deploy --platform cloudflare` を実行します。ビルド (`npm run build`) は `void deploy` が走らせます。

---

## 2. ディレクトリ構成

- `void.config.ts`: Void の設定。`cloudflare` セクションが Workers および D1 バインディングのベース設定（Void が Cloudflare Build Output `.cloudflare/output/v0` を生成する際に参照）。D1 の `database_id` はここに固定で書く。`inference.build` は `void deploy` が走らせるビルドのコマンド
- `public/`
  - `_headers`: 静的アセット配信ヘッダー設定（Void ビルド時に `dist/client/_headers` へコピーされる）
  - `__definy_seed_bundle.json`: ビルトインシードデータ (`npm run build:seeds` が生成。コミットしない)
- `wasm/stage1.wasm`: 自己記述コンパイラ Wasm バイナリ (クライアントにはハッシュ付きアセットとして出力される)
- `middleware/`
  - `01.definy.ts`: API パス（Connect-RPC, `/virtual/wasm/*`, `/healthz` 等）の Worker ディスパッチおよび SSR レスポンスへのセキュリティヘッダー付与
- `worker/`
  - `index.ts`: Worker リクエストハンドラー
  - `store.ts`: シードバンドルロード、D1 (SQLite) ストア
  - `commit_store.ts`: 受け付けたコミットの読み出しとブランチの最新のコミット
  - `types.ts`: 型定義

---

## 3. 設定 (`void.config.ts` の `cloudflare` セクション)

```ts
// Void (Vite 8) が Cloudflare Build Output を生成する際のベース設定。
// main, assets 等は Void 側で自動設定される。
// 以前は wrangler.toml に書いていたが、Void / @cloudflare/vite-plugin が
// TOML を読まなくなったため、void migrate で void.config.ts へ移行した。
cloudflare: {
  name: "definy",
  account_id: "6a8354084cc02bb1c5f9ca1bb3442704",
  compatibility_date: "2026-02-24",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: [
    {
      binding: "DB",
      database_name: "definy-db",
      database_id: "d4c3a982-558e-4d58-95f8-bbc3ca391818",
    },
  ],
}
```

ビルド時、Void (1.6 以降) は Cloudflare Build Output を `.cloudflare/output/v0` に出します (gitignore 済み)。`workers/default/worker.config.json` に Worker 名・D1 のバインディング・アセットが入り、`bundle/` に Worker のモジュールが入ります。以前の `dist/ssr/wrangler.json` は出なくなりました。

`void deploy` は既定では `vite build` だけを走らせるので、seed の束 (`npm run build:seeds`) も作るよう `inference.build` を `npm run build` にしています。

```ts
inference: {
  build: "npm run build",
},
```

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

`deploy.yaml` は `npm ci` の後に `npx void deploy --platform cloudflare` を実行します。`void deploy` がビルド・アップロード・準備完了の確認・トラフィックの切り替えまで行います。

- Worker のバージョンにプレビュー URL が無く、バージョンのメタデータのバインディングも無いと、Void は準備完了を確かめられず、切り替えの前に止まります。そのときは GitHub Actions の変数 `CLOUDFLARE_WORKERS_SUBDOMAIN` (例: `my-team.workers.dev`) を設定します
- デプロイ先のアカウントは `void.config.ts` の `cloudflare.account_id` で固定しています。無いと Void はトークンで見えるアカウントの一覧から選ぼうとしますが、CI のトークンは一覧を読めないので「Cloudflare authentication is required」で止まります (2026-11-05 のデプロイがこれで失敗)
- Worker のトラフィックの設定 (`routes`, `workers_dev`, `preview_urls`) は `void.config.ts` の `cloudflare` に必ず書きます。書かないと Void は「ダッシュボードで付けた設定を引き継ぐ」扱いにしますが, まだ Void でデプロイしたことのない Worker では前の設定を読めないので「the existing Worker has dashboard-managed routes or visibility that Void cannot safely republish」で止まります (2026-11-06 のデプロイがこれで失敗。コードは `@void/deploy-cloudflare` の `resolvePreservedTraffic`)。今の本番の設定は次のとおりです
  - `definy.narumincho.com`: カスタムドメイン (`custom_domain: true`)。このホストだけ専用の証明書 (`definy.narumincho.com`, `*.definy.narumincho.com`) が出ていることから判断しました
  - `*-definy.narumincho.com/*`: パーツの HTTP サーバー (`{sub}-definy.narumincho.com`) 用のルート。こちらはゾーンの共通の証明書 (`*.narumincho.com`) です
  - `workers_dev: true` (`definy.narumincho.workers.dev`), `preview_urls: false`
  - ダッシュボードでドメインやルートを変えたら `void.config.ts` も合わせます。合わせないと次のデプロイで設定が上書きされます
- ワークフローの `uses:` を変えたら `gh actions-lock` で `.github/workflows/actions.lock` も更新します。使わなくなったアクションの行が残ると、PR の `workflow lockfile` (`gh actions-lock --verify`) が落ちます

### `wrangler deploy` を使わない理由

Void 1.6 からビルドが `.cloudflare/output` (Cloudflare Build Output) を出すようになりました。wrangler 4.158 はこの出力があると「Cloudflare CLI (`cf`) 向けのプロジェクトだ」として `wrangler deploy` を止めます (2026-11-05 に main のデプロイがこれで失敗)。`cf` はまだベータ版なので、Void の案内どおり `void deploy --platform cloudflare` を使います。
