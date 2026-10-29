# データベース構成（Cloudflare D1）

本番環境およびローカルの Cloudflare Workers 環境における永続化ストレージには
**Cloudflare D1（エッジマネージド SQLite）** を採用しています。

- **本番環境**: Cloudflare D1 (`definy-db`)
- **ローカル開発**: Wrangler CLI (`wrangler d1 execute definy-db --local` / `vite` 実行時) によるローカル D1 または Worker の自動初期化
- **単体テスト**: `worker/test_helpers.ts` の `node:sqlite` (`:memory:`) による D1 互換アダプターを使う

## Cloudflare D1 スキーマ (`worker/store.ts` の `D1_SCHEMA_STATEMENTS`)

definy のデータ本体は決定論的 CBOR バイナリと SHA-256 ハッシュ（`EventHashId` / `ContentHash`）によるイミュータブルな構造であるため、フラットな SQLite テーブルとインデックスで高速に永続化・検索できます。

- `events`: 署名済みイベント (`event_hash` PK, `signed_event_bytes`, `account_id`, `event_type`, `created_at_rfc3339`, `time_ms`)
- `cas_contents`: Content-Addressed Storage (`content_hash` PK, `content_bytes`)

以前あったデプロイ履歴の `deployments` テーブルは, `DeployService` とともに削除した ([cloudflare-workers.md](cloudflare-workers.md))。

## スキーマ初期化とシードデータ投入

Worker の初回リクエスト時（コールドスタート時）に `store.ensureSeeded(env)` が実行されます。

1. **自動 DDL 適用**: `events` テーブルが存在しない場合、`worker/store.ts` の `D1_SCHEMA_STATEMENTS` を適用してテーブルを作成します。ローカル D1 も同じ仕組みで初期化されるので, 手で SQL を流す必要はありません。
2. **シードデータの自動投入**: イベント件数が 0 件の場合、組み込みシードバンドル（`/__definy_seed_bundle.json`。ビルド時に `seeds/*.json` から生成する）をロードして自動同期します。イベントが既に存在する場合は再シードはスキップされます。

以前 (Rust 版) はデプロイ時にシード SQL を生成して `wrangler d1 execute` で投入していたが, `ensureSeeded` に一本化した。スキーマの SQL ファイル (`migrations/`) と D1 を作って wrangler.toml に UUID を書き込むシェルスクリプト (`scripts/ensure-d1.sh`) も, 中身が `D1_SCHEMA_STATEMENTS` と固定の `database_id` に重なっていたので削除した。
