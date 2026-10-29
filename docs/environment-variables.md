# 環境変数

definy が読む環境変数の一覧です。`wrangler.toml` に `[vars]` は無く, Worker には D1 の `DB` と静的アセットの `ASSETS` が binding として渡ります。

## Worker (実行時, `worker/types.ts` の `Env`)

| 環境変数                   | 用途                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DEFINY_ADMIN_ACCOUNT_IDS` | 管理者のアカウント ID (カンマ・空白区切り)。`HttpProxyService/Fetch` (CORS の仲介) を使える。未設定なら誰も管理者ではない ([rpc-authorization.md](rpc-authorization.md)) |

本番では Cloudflare のダッシュボードか `wrangler secret put` で設定する。ローカルではリポジトリ直下の `.env` (gitignore 済み) に書けば Void (Vite) の dev サーバーが読み込む。

## Node スクリプト (`process.env`)

| 環境変数                           | 用途                                                                                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEFINY_SYSTEM_ACCOUNT_SECRET_KEY` | `npm run build:seeds` が seed に署名する鍵。`export:seeds` はここから公開鍵を導出する。未設定なら開発用の鍵 ([system-account.md](system-account.md)) |
| `PLAYWRIGHT_BASE_URL`              | E2E テストの接続先。未設定なら dev サーバーを立てて `http://localhost:5173` に繋ぐ                                                                   |
| `CI`                               | Playwright の CI 向けの設定に切り替える                                                                                                              |

## GitHub Actions

| secret                 | 用途                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN` | `deploy.yaml` が main への push で `wrangler deploy` するときに使う ([cloudflare-workers-assets.md](cloudflare-workers-assets.md)) |

## 廃止したもの (2026-10-29)

- `DEFINY_HTTP_PROXY_ACCOUNT_IDS`: CORS の仲介は管理者だけが使う
- `DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY`: コンパイラ組み込みのパーツかどうかはパーツの定義で決まる (`isCompilerBuiltinPart`) ので, サーバーはシステムアカウントの鍵を知らなくてよい
- `DEFINY_ALLOW_UNVERIFIED_EVENTS`: 署名を確かめずにイベントを保存する `DebugService/SubmitUnverifiedEvent` ごと消した。署名が不正なイベントは常に拒否する ([invalid-signature-debug.md](invalid-signature-debug.md))
