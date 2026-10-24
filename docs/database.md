# データベース構成（Cloudflare D1）

本番環境およびローカルの Cloudflare Workers 環境における永続化ストレージには
**Cloudflare D1（エッジマネージド SQLite）** を採用しています。

- **本番環境**: Cloudflare D1 (`definy-db`)
- **ローカル開発**: Wrangler CLI (`wrangler d1 execute definy-db --local` / `vite` 実行時) によるローカル D1 または Worker の自動初期化
- **単体テスト**: `worker/worker.test.ts` で `node:sqlite` (`:memory:`) による D1 互換アダプターを使用

## Cloudflare D1 スキーマ (`migrations/0001_initial_schema.sql`)

definy のデータ本体は決定論的 CBOR バイナリと SHA-256 ハッシュ（`EventHashId` / `ContentHash`）によるイミュータブルな構造であるため、フラットな SQLite テーブルとインデックスで高速に永続化・検索できます。

- `events`: 署名済みイベント (`event_hash` PK, `signed_event_bytes`, `account_id`, `event_type`, `created_at_rfc3339`, `time_ms`)
- `cas_contents`: Content-Addressed Storage (`content_hash` PK, `content_bytes`)

以前あったデプロイ履歴の `deployments` テーブルは, `DeployService` とともに削除した ([cloudflare-workers.md](cloudflare-workers.md))。

## スキーマ初期化とシードデータ投入

現在の TypeScript + Cloudflare Workers 実装では、Worker の初回リクエスト時（コールドスタート時）に `store.ensureSeeded(env)` が実行されます。

1. **自動 DDL 適用**: `events` テーブルが存在しない場合、`migrations/0001_initial_schema.sql` を自動適用してテーブルを作成します。
2. **シードデータの自動投入**: イベント件数が 0 件の場合、組み込みシードバンドル（`/__definy_seed_bundle.json`。ビルド時に `seeds/*.json` から生成する）をロードして自動同期します。イベントが既に存在する場合は再シードはスキップされます。
3. **ローカル D1 の手動初期化**:
   `bash scripts/ensure-d1.sh --local` により、ローカル D1 に `migrations/0001_initial_schema.sql` を適用することも可能です。

> **歴史的注記（旧 Rust 実装・廃止済み）**:
> 以前はデプロイ時に `cargo run -p definy-server --release -- --export-seed-sql target/definy_seed.sql` でシード SQL を生成し、`scripts/ensure-d1.sh` から `wrangler d1 execute` で投入していましたが、現在は Worker の `ensureSeeded` による自動投入に一本化され、SQL 生成スクリプト・投入処理は削除されました。
