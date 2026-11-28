# Cloudflare Workers の構成とデプロイ

definy サーバーは 1 つの Cloudflare Worker (`definy`) で, 設定は [wrangler.jsonc](../wrangler.jsonc)。
2026-11 に React/Vite の UI と Void をやめ, `wrangler deploy` で Worker と静的なファイルを直接デプロイする形にした
(UI は別の Worker の definy-html。[html-ui.md](html-ui.md))。

```
[ ブラウザ / MCP クライアント / 他の definy サーバー ]
         │
         ▼
  [ Cloudflare Worker `definy` ]
    ├── 静的なファイル (public/. Workers Static Assets, binding ASSETS)
    │     ├── index.html: `/` の案内 (definy-html, MCP, GitHub へのリンク)
    │     ├── about/: 紹介スライド (npm run build:story が作る. コミットしない. story.md)
    │     ├── story/: 紹介スライドの音声と画像
    │     ├── __definy_seed_bundle.json, __definy_seed_commit_cache.json: seed の束 (npm run build:seeds が作る. コミットしない)
    │     └── _headers: セキュリティヘッダー
    │
    └── Worker (worker/index.ts の default export)
          └── definy.handle-request (wasm/service.wasm) が全てのパスを決める
                ├── /definy.v1.* (Connect-RPC), /mcp, /healthz, /virtual/wasm/* など
                └── それ以外は serve_asset → env.ASSETS (無ければ 404)
```

- 静的なファイルにあるパスは Worker を通らずに返る (Workers Static Assets の既定)。それ以外は Worker が処理する
- Worker は seed の束を `env.ASSETS` から読み, D1 が空なら入れる (`worker/store.ts`)
- `*.wasm?module` の import は wrangler の既定の規則で `WebAssembly.Module` になる (Workers は実行時に Wasm をコンパイルできない。
  テストでは `vitest.config.ts` のプラグインが同じことをする)

## 設定 (`wrangler.jsonc`)

- `account_id`: デプロイ先のアカウントを固定する。CI のトークンはアカウントの一覧を読めない
- `routes`:
  - `definy.narumincho.com`: カスタムドメイン (`custom_domain: true`)
  - `*-definy.narumincho.com/*`: パーツの HTTP サーバー (`{sub}-definy.narumincho.com`) のルート (ゾーンの共通の証明書 `*.narumincho.com`)
  - ダッシュボードでドメインやルートを変えたら `wrangler.jsonc` も合わせる。合わせないと次のデプロイで上書きされる
- `workers_dev: false`, `preview_urls: false`
- `assets`: `public/` を binding `ASSETS` で
- `d1_databases`: `DB` (`definy-db`)

## ビルドとデプロイ

```bash
npm run build    # = npm run build:seeds (seed の束と wasm/*.wasm) && npm run build:story (public/about/)
npm run deploy   # = npm run build && wrangler deploy
npx wrangler deploy --dry-run --outdir dist   # アップロードせずにバンドルだけ確かめる
```

- CI (`.github/workflows/deploy.yaml`): `main` への push で `npm ci` → `npm run build` → `npx wrangler deploy`。
  GitHub Actions の Secret `CLOUDFLARE_API_TOKEN` (Workers の編集と D1 の権限) が要る
- PR (`.github/workflows/pull_request.yaml`) では `wrangler deploy --dry-run` でバンドルできることまで確かめる
- ワークフローの `uses:` を変えたら `gh actions-lock` で `.github/workflows/actions.lock` も更新する。
  使わなくなったアクションの行が残ると, PR の `workflow lockfile` (`gh actions-lock --verify`) が落ちる

## 経緯

- 2026-10-18 (#699) から 2026-11 までは TypeScript + React 19 + Void (Vite 8) で, Void が UI の SSR と静的なファイル,
  Worker をまとめてビルドし `void deploy --platform cloudflare` でデプロイしていた。Void 1.6 のビルドは
  `.cloudflare/output` を出し, wrangler 4.158 はそれがあると `wrangler deploy` を止めたので `void deploy` を使っていた。
  Void をやめたので, その出力は無く `wrangler deploy` で動く
- `void deploy` のころは, 準備完了の確認 (`/__void/ready`) の行き先やトラフィックの設定の引き継ぎでデプロイが何度か止まった
  (2026-11-05, 11-06。workers.dev が無効で確認が通らない, `routes` を書かないと止まる)。wrangler にはこの確認は無い
