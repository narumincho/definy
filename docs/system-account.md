# システムアカウントと seed の編集フロー

ビルトインモジュール（`definy`, `core`, `std`, `wasi`, `wasm`, `sample`）は **システムアカウント** が所有します。
`src/auth.ts` / `worker/store.ts` / `src/seed_parts.ts` にてシステムアカウント鍵シードを扱います。

## 鍵の設定

鍵はいずれも UI の秘密鍵・公開鍵と同じ形式（32 バイトの URL-safe base64、パディングなし）です。

| 環境変数                           | 用途                                                                 | 必要な場所                                                   |
| ---------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| `DEFINY_SYSTEM_ACCOUNT_SECRET_KEY` | seed のイベントに署名する。`export:seeds` はここから公開鍵を導出する | シードバンドル生成時 (`npm run build:seeds`)・`export:seeds` |

- 未設定の場合は、リポジトリに埋め込まれた **開発用の鍵**（`DEV_SYSTEM_KEY_SEED`、秘密鍵が公開されている）を使います。テストや CI（PR）はこの鍵で動きます。
- サーバー (Worker) はシステムアカウントの鍵を知りません。コンパイラ組み込みのパーツかどうかはモジュールやアカウントではなく
  パーツの定義 (式が `{"#builtin": ...}` か, 式の無い型パーツか. `isCompilerBuiltinPart`) で決まるので, 型検査に鍵は要りません
  (以前は `DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY` でシステムアカウントのコミットだけに組み込みを許していた. 2026-10-29 に廃止)。

鍵は UI の「アカウント作成」または `src/auth.ts` の `generateAccountCredentials` で作れる。秘密鍵は UI の「秘密鍵でログイン」に貼り付ければ、ブラウザからシステムアカウントとして操作できる。

## seed のパーツ参照は名前で書く

seed（`seeds/*.json`）の中のパーツ ID は、32 バイトの配列ではなく `{"$part": "core.expression"}`（`モジュール名.パーツ名`）で書きます。読み込み時に `derive_module_part_id(derive_module_id(module), part)` で ID を導出します。パーツ ID はモジュール名とパーツ名だけで決まるので、**seed はシステムアカウントの鍵に依存しません**。鍵を変えても seed を書き換える必要はありません。

## 編集フロー

1. システムアカウントの秘密鍵で UI にログインし、ビルトインモジュールのパーツを編集してコミットする。
2. 編集したサーバーから seed に書き戻す機能は `npm run export:seeds <baseUrl>` で実行可能です。詳細は [seed の書き戻し (`export:seeds`)](./seed-export.md) を参照してください。
3. `npm run build:seeds` (`scripts/generate_seed_bundle.ts`) で指紋 `seeds/seed_bundle_fingerprint.json` を更新してコミットします。シードバンドル本体 (`public/__definy_seed_bundle.json`) はコミットせず、dev / build / test のたびに作ります ([build-artifacts.md](build-artifacts.md))。

## ブートストラップイベントと編集イベントの区別

seed から作るイベントは時刻 `2019-01-31T04:36:01Z`（リポジトリの最初のコミット）から 1 秒以内に置きます。

## D1 の seed の入れ替え（古い seed は残さない）

`npm run build:seeds` は seed バンドルの指紋（全イベントのハッシュと全 CAS の内容の SHA-256, `src/seed_fingerprint.ts`）を
`public/__definy_seed_bundle.json` と `seeds/seed_bundle_fingerprint.json` に書き、Worker はビルド時に後者を取り込みます。
Worker は isolate ごとに 1 回、D1 に記録した指紋（`cas_contents` のキー `seed-bundle-fingerprint`）と比べ、
違えば seed バンドルを読んで D1 を入れ替えます（`worker/store.ts` の `ensureSeeded` / `persistSeedToD1`）。
一致していればコールドスタートでも seed バンドルは読みません。

入れ替えでは、**システムアカウントのイベントのうち新しい seed に無いものをすべて削除します**。古い seed の上で
システムアカウントとして行った UI の編集も消えます（時刻が新しい編集を残すと新しい seed のパーツを上書きしてしまい、
古い seed との互換性を保つのが大変なため）。残したい編集は、seed を変える前に `npm run export:seeds` で
`seeds/*.json` に書き戻してください。seed が変わらない間は、システムアカウントの編集も残ります。
他のアカウントのイベントは削除しません。CAS は上書きするので、ハッシュでないキー（`stage1` や
事前コンパイルの `stage1-output:*`）も新しい seed の内容になります。
