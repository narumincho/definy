# システムアカウントと seed の編集フロー

ビルトインモジュール（`definy`, `core`, `std`, `wasi`, `sample`）は **システムアカウント** が所有します。
実装は `definy-server/src/system_account.rs`。

## 鍵の設定

鍵はいずれも UI の秘密鍵・公開鍵と同じ形式（32 バイトの URL-safe base64、パディングなし）です。

| 環境変数 | 用途 | 必要な場所 |
| --- | --- | --- |
| `DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY` | システムアカウントの公開鍵。ビルトインモジュールの所有者・型チェッカーの参照先になる | 本番サーバー |
| `DEFINY_SYSTEM_ACCOUNT_SECRET_KEY` | seed からブートストラップ用イベントに署名する | DB を初期化するサーバー、Cloudflare Workers 用 seed バンドルを作る CI（GitHub Secrets） |

- 公開鍵だけを設定した場合、サーバーは seed からのブートストラップをスキップします
  （ビルトインモジュールがすでに DB にある前提）。
- 両方を設定した場合は一致している必要があります。秘密鍵だけなら公開鍵はそこから導出します。
- どちらも未設定の場合は、リポジトリに埋め込まれた **開発用の鍵**（`DEV_SYSTEM_KEY_SEED`、秘密鍵が公開されている）を使います。
  テストや CI（PR）はこの鍵で動きます。

鍵ペアの生成:

```sh
cargo run -p definy-server -- --generate-system-key
```

UI の「アカウント作成」で作った鍵ペアをそのまま使うこともできます。秘密鍵は UI の
「秘密鍵でログイン」に貼り付ければ、ブラウザからシステムアカウントとして操作できます。

## seed のパーツ参照は名前で書く

seed（`seeds/*.json`）の中のパーツ ID は、32 バイトの配列ではなく `{"$part": "core.expression"}`
（`モジュール名.パーツ名`）で書きます。読み込み時にシステムアカウントから
`derive_module_part_id(derive_module_id(account, module), part)` で ID を導出するため、
**seed はシステムアカウントの鍵に依存しません**。鍵を変えても seed を書き換える必要はありません。

## 編集フロー

1. システムアカウントの秘密鍵で UI にログインし（または MCP から）、ビルトインモジュールのパーツを編集してコミットする。
2. 編集したサーバーから seed に書き出す:

   ```sh
   DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY=<公開鍵> \
     cargo run -p definy-server -- --export-seeds-from http://localhost:8080 seeds
   ```

   システムアカウントのモジュールコミットのうち、モジュールごとに最新のものを取得し、
   `content_hash` だけのパーツは CAS から式を取得して埋めます。コミットが見つからないモジュールはそのまま残します。
   Rust サーバーと Cloudflare Workers のどちらからでも書き出せます（Connect-RPC の JSON API を使用）。
3. `git diff seeds/` を確認してコミットする。`seed_tests` が整形とスキーマの最新性を検証します。

### UI で編集するときの注意 (2026-10 に UI で core を編集して確かめた)

- 保存時は最新のコミットのパーツをコミットの順のまま使い, 編集したパーツだけを差し替える
  (`module_projection::latest_module_parts`)。名前順などに並べ替えると seed に順序だけの差分が出る
- 説明は表示中の言語の分だけを `Description::with_text` で書き換え, 他の言語の説明は残す
- サーバーは式の変わったパーツだけを型検査するので, core の 1 パーツの編集はすぐ受け付けられる
- 書き出しでは式を持つパーツの `content_hash` を落とす (UI のコミットは式と content hash の両方を持つため)
- seed の `message` は最新のコミットのメッセージになる

## ブートストラップイベントと編集イベントの区別

seed から作るイベントは時刻 `2019-01-31T04:36:01Z`（リポジトリの最初のコミット）から 1 秒以内に置きます
（`builtin_migration::BOOTSTRAP_TIMESTAMP_SECONDS`）。サーバー起動時の移行処理は、この時刻範囲の
古いシステムアカウントのイベントだけを削除し、UI などから投稿された編集イベントは残します。
