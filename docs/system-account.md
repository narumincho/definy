# システムアカウントと seed の編集フロー

ビルトインモジュール（`definy`, `core`, `std`, `wasi`, `sample`）は **システムアカウント** が所有します。
現在の TypeScript 実装では `src/auth.ts` / `worker/store.ts` / `worker/eval_conformance.test.ts` にてシステムアカウント鍵シードを扱います。

## 鍵の設定

鍵はいずれも UI の秘密鍵・公開鍵と同じ形式（32 バイトの URL-safe base64、パディングなし）です。

| 環境変数                           | 用途                                                                                 | 必要な場所                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY` | システムアカウントの公開鍵。ビルトインモジュールの所有者・型チェッカーの参照先になる | 本番サーバー                                                          |
| `DEFINY_SYSTEM_ACCOUNT_SECRET_KEY` | seed からブートストラップ用イベントに署名する                                        | DB を初期化するサーバー、シードバンドル生成時 (`npm run build:seeds`) |

- 公開鍵だけを設定した場合、サーバーは seed からのブートストラップをスキップします（ビルトインモジュールがすでに DB にある前提）。
- 両方を設定した場合は一致している必要があります。秘密鍵だけなら公開鍵はそこから導出します。
- どちらも未設定の場合は、リポジトリに埋め込まれた **開発用の鍵**（`DEV_SYSTEM_KEY_SEED`、秘密鍵が公開されている）を使います。テストや CI（PR）はこの鍵で動きます。

> **歴史的注記（旧 Rust 実装・廃止済み）**:
> 旧 Rust 版では `cargo run -p definy-server -- --generate-system-key` コマンドが存在していました。現在は UI の「アカウント作成」または `src/auth.ts` の `generateAccountCredentials` で生成可能です。秘密鍵は UI の「秘密鍵でログイン」に貼り付ければ、ブラウザからシステムアカウントとして操作できます。

## seed のパーツ参照は名前で書く

seed（`seeds/*.json`）の中のパーツ ID は、32 バイトの配列ではなく `{"$part": "core.expression"}`（`モジュール名.パーツ名`）で書きます。読み込み時にシステムアカウントから `derive_module_part_id(derive_module_id(account, module), part)` で ID を導出するため、**seed はシステムアカウントの鍵に依存しません**。鍵を変えても seed を書き換える必要はありません。

## 編集フロー

1. システムアカウントの秘密鍵で UI にログインし（または MCP から）、ビルトインモジュールのパーツを編集してコミットする。
2. 編集したサーバーから seed に書き戻す機能（旧 Rust 版の `cargo run -p definy-server -- --export-seeds-from`）は、**現在 TypeScript 版では未実装（Rust 版では cargo で生成していた）**です。
3. シードバンドル（`seeds/seed_bundle.json` / `public/__definy_seed_bundle.json`）の再生成は `npm run build:seeds` (`scripts/generate_seed_bundle.ts`) で実行可能です。

## ブートストラップイベントと編集イベントの区別

seed から作るイベントは時刻 `2019-01-31T04:36:01Z`（リポジトリの最初のコミット）から 1 秒以内に置きます。サーバー起動時の移行処理は、この時刻範囲の古いシステムアカウントのイベントだけを削除し、UI などから投稿された編集イベントは残します。
