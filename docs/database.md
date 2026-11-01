# データベース構成（Cloudflare D1）

本番環境およびローカルの Cloudflare Workers 環境における永続化ストレージには
**Cloudflare D1（エッジマネージド SQLite）** を採用しています。

- **本番環境**: Cloudflare D1 (`definy-db`)
- **ローカル開発**: Wrangler CLI (`wrangler d1 execute definy-db --local` / `vite` 実行時) によるローカル D1 または Worker の自動初期化
- **単体テスト**: `worker/test_helpers.ts` の `node:sqlite` (`:memory:`) による D1 互換アダプターを使う

## Cloudflare D1 スキーマ (definy の `definy.store-schema-statements`)

definy のデータ本体は決定論的 CBOR バイナリと SHA-256 ハッシュ（`EventHashId` / `ContentHash`）によるイミュータブルな構造であるため、フラットな SQLite テーブルとインデックスで高速に永続化・検索できます。

- `events`: 署名済みイベント (`event_hash` PK, `signed_event_bytes`, `account_id`, `event_type`, `created_at_rfc3339`, `time_ms`)
- `cas_contents`: Content-Addressed Storage (`content_hash` PK, `content_bytes`)

以前あったデプロイ履歴の `deployments` テーブルは, `DeployService` とともに削除した ([cloudflare-workers.md](cloudflare-workers.md))。

## スキーマ初期化とシードデータ投入

Worker 自身が処理するリクエスト (RPC と `/virtual/wasm/`) の前に, definy の `definy.ensure-seeded` が次を行う (2026-11-01 から definy。以前は TypeScript の `store.ensureSeeded`)。

1. この isolate がもう seed を入れていれば何もしない (`read_seed_status`。入れている途中なら, 他のリクエストはホストが待たせる)
2. `sqlite_master` で `events` と `cas_contents` が無ければ `definy.store-schema-statements` (CREATE TABLE / INDEX) を流す。ローカル D1 も同じ仕組みで初期化されるので, 手で SQL を流す必要はない
3. D1 に記録した seed の指紋 (`cas_contents` のキー `definy.seed-fingerprint-key` = `seed-bundle-fingerprint`) がビルド時の指紋と同じなら終わり (コールドスタートでも seed バンドルは読まない)
4. 違えば seed バンドル (`read_seed_bundle`。ホストが `/__definy_seed_bundle.json` を読み, 指紋を付ける) を `definy.store-seed-statements` の SQL で入れ替え, 最後に指紋を書く (`definy.sql-run-chunks` で 50 文ずつ batch)
5. `mark_seeded` でこの isolate が入れたことをホストに伝える

テストの `WorkerStore.seedD1(db, bundle)` も同じ definy (`definy.seed-store` をコンパイルした `wasm/seeder.wasm`) で入れる。

以前 (Rust 版) はデプロイ時にシード SQL を生成して `wrangler d1 execute` で投入していたが, `ensureSeeded` に一本化した。スキーマの SQL ファイル (`migrations/`) と D1 を作って wrangler.toml に UUID を書き込むシェルスクリプト (`scripts/ensure-d1.sh`) も, 中身がスキーマの SQL と固定の `database_id` に重なっていたので削除した。

## インメモリストアを無くした (2026-11-01)

サーバーのストア (`worker/store.ts` の `WorkerStore`) は常に D1 (`env.DB`) に保存する。以前は D1 の binding が無ければ isolate のメモリの
配列と Map に保存していたが, SQL を definy で書くため (保存先の実装を 1 つにするため) 無くした (ユーザーの決定)。

- D1 の binding が無いと, ストアを使う処理は `the D1 binding DB is required` で失敗する (`/healthz` の `storage` は `none`)
- テストは `createSqliteD1Database()` (`worker/test_helpers.ts`. node:sqlite の D1 互換) を `env.DB` に渡す
- seed は `store.seedD1(db, bundle)` で D1 に入れる (`loadSeedBundle` だけではストアから読めない)

## RPC のストアの SQL は definy が書く (2026-11-01)

RPC が読み書きする SQL は definy の `definy.store-*` (`seeds/definy.json`) が作り, `definy.service-io` の `sql`
(`statements: list<definy.sql-statement>`) でホストに渡す。ホスト (`runD1Statements` in `worker/store.ts`) は文を
`prepare(sql).bind(...params)` して実行するだけ (2 つ以上なら `batch` で 1 つのトランザクション) で, 結果の行を
`definy.sql-row` (SELECT の順の `{name, value}`. 値は `definy.sql-value` = `null` / `integer` / `text`) にして返す。

| definy の関数                              | SQL                                                                                                               |
| :----------------------------------------- | :---------------------------------------------------------------------------------------------------------------- |
| `definy.store-read-events`                 | `SELECT ... FROM events WHERE event_hash IN (?, ...)` (50 個ずつ)                                                 |
| `definy.store-read-events-page`            | `ORDER BY time_ms DESC LIMIT ? OFFSET ?`。種類は両辺を `REPLACE(LOWER(...), '_', '')` して比べる                  |
| `definy.store-read-contents`               | `SELECT content_hash, content_bytes FROM cas_contents WHERE content_hash IN (...)` (50 個ずつ)                    |
| `definy.store-read-missing-content-hashes` | `SELECT content_hash ... IN (...)` で見つからなかったもの (重複を除く)                                            |
| `definy.store-write-event`                 | `INSERT OR IGNORE INTO events`。`created_at_rfc3339` は `strftime('%Y-%m-%dT%H:%M:%fZ', ? / 1000.0, 'unixepoch')` |
| `definy.store-write-contents`              | 中身ごとに `INSERT OR IGNORE INTO cas_contents` (空なら SQL を流さない)                                           |
| `definy.store-read-raw-content`            | `SELECT content_bytes FROM cas_contents WHERE content_hash = ?` のあと `hash_contents` で SHA-256                 |

- D1 は 1 つの文のパラメーターの数に上限があるので, `IN` は `definy.sql-in-statements` で 50 個ずつの文に分ける
- 受け付けたコミットの一覧は definy (`definy.read-commits`) が `project_commit` のイベントを 500 件ずつ読み, `definy.decode-stored-commit` で読む。読んだものはホストが isolate ごとにイベントハッシュで覚える (`read_cached_commits` / `write_cached_commits`. 2026-11-01 ユーザーの決定)
- 型チェッカーの入力も definy (`definy.read-commit-check-input`) が読む。CAS の中身を定義の式として読んだものはホストが isolate ごとに content hash で覚える (`read_cached_definitions` / `write_cached_definitions`)
- 以前の TypeScript は保存のときに Base64 を標準の形にそろえていたが, 今は definy が受け取った文字列をそのまま保存する
  (中身のハッシュは `hash_contents` で前もって確かめるので, 違う形の Base64 でもバイト列は同じ)
- テスト (`worker/service_io.test.ts`) は sqlite の D1 に行を入れて, definy が流した SQL を `sql SELECT events ...` のように記録して確かめる
