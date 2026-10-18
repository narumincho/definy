# データベース構成（Cloudflare D1）

本番環境およびローカルの Cloudflare Workers 環境における永続化ストレージには
**Cloudflare D1（エッジマネージド SQLite）** を採用しています（以前使用していた
SurrealDB は廃止し、D1 / SQLite に一本化しました）。

- **本番環境**: Cloudflare D1 (`definy-db`)
- **ローカル開発**: Wrangler CLI (`wrangler d1 execute definy-db --local` /
  `wrangler dev`) によるローカル D1 (`.wrangler/state/v3/d1`)
- **単体テスト**: `worker/worker_test.ts` では `node:sqlite` (`:memory:`)
  による D1 互換アダプター、`definy-server` では軽量インメモリストア (`DbStore`)
  を使用

## Cloudflare D1 スキーマ (`migrations/0001_initial_schema.sql`)

definy のデータ本体は決定論的 CBOR バイナリと SHA-256 ハッシュ（`EventHashId` /
`ContentHash`）によるイミュータブルな構造であるため、フラットな SQLite
テーブルとインデックスで高速に永続化・検索できます。

- `events`: 署名済みイベント (`event_hash` PK, `signed_event_bytes`,
  `account_id`, `event_type`, `created_at_rfc3339`, `time_ms`)
- `cas_contents`: Content-Addressed Storage (`content_hash` PK, `content_bytes`)
- `deployments`: エッジデプロイ履歴 (`id` PK, `machine_id`, `commit_hash`,
  `status`, `url`, `app_url`, `region`, `created_at_rfc3339`, `wasm_hash`,
  `provider`)

## デプロイ時のスキーマ初期化とシードデータ投入

Worker のコールドスタートを高速に保つため、D1
のスキーマ初期化と組み込みシードデータ（`std`, `wasi`, `core`, `definy`,
`sample`）の投入は**リクエスト時ではなくデプロイ時**に実行します。

1. **シード SQL の生成**:
   `cargo run -p definy-server --release -- --export-seed-sql target/definy_seed.sql`
   により、`migrations/0001_initial_schema.sql` の DDL、古いシステムシードの削除、および
   `events` / `cas_contents` への冪等な `INSERT OR IGNORE` SQL（D1 の 100KB
   ステートメント制限に対応したチャンク分割済み）を生成します。
2. **GitHub Actions デプロイ時 (`.github/workflows/deploy.yaml`)**:
   `scripts/ensure-d1.sh` が Cloudflare API で `definy-db` を確認（未作成なら自動作成）して
   `wrangler.toml` にバインドし、`wrangler d1 execute definy-db --remote --file=target/definy_seed.sql`
   でリモート D1 に反映します。
3. **ローカル開発時**:
   `bash scripts/ensure-d1.sh --local` でローカル D1 にシード SQL を反映し、
   `wrangler dev` でそのままローカル D1 をバインドして起動できます。
4. **セルフホストデプロイ時 (`DeployService/DeployCloudflare`)**:
   definy 上のデプロイ処理の一部として `seedD1: true` を指定すると、バインドされた
   D1 データベースに対して `store.seedD1(env.DB)` が実行されます。
