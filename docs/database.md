# データベース SaaS どれにしようか問題

## 1. SurrealDB Cloud

### 利点

- スキーマで入れ子のUnion型をサポートしている
- 環境依存が少なめ

### 欠点

- 資料が少ない

## 2. Xata

### 利点

- 素のPostgreSQLをそのまま使える
- データを含めてブランチを作ることができる
- 環境依存が少ない

### 欠点

- 資料が少ない

## 3. Supabase

### 利点

- よく使われている
- 東京リージョンがある
- 管理画面のUIが使いやすい
- 環境依存が少ない

### 4. Deno KV

### 利点

- Deno から扱いやすい
- スケールしやすい
- シンプルな仕組みなため, 他への移植が簡単

### 欠点

- 自分で検索用のインデックスを保存する処理をする必要がある
- いろんなパターンのクエリをうまく高速化するのは難しい
- ベータ版で公式もやる気があるのかどうか分からない

# 結論（現在：Cloudflare D1 による永続化）

Cloudflare Workers への統合に伴い、本番環境の永続化ストレージは **Cloudflare D1（エッジマネージド SQLite）** を採用しています（ローカル開発・テスト用の `definy-server` ではインメモリ `SurrealDB`、Worker 単体テストではインメモリフォールバックおよび `node:sqlite` アダプターを併用）。

## Cloudflare D1 スキーマ (`migrations/0001_initial_schema.sql`)

definy のデータ本体は決定論的 CBOR バイナリと SHA-256 ハッシュ（`EventHashId` / `ContentHash`）によるイミュータブルな構造であるため、フラットな SQLite テーブルとインデックスで高速に永続化・検索できます。

- `events`: 署名済みイベント (`event_hash` PK, `signed_event_bytes`, `account_id`, `event_type`, `created_at_rfc3339`, `time_ms`)
- `cas_contents`: Content-Addressed Storage (`content_hash` PK, `content_bytes`)
- `deployments`: エッジデプロイ履歴 (`id` PK, `machine_id`, `commit_hash`, `status`, `url`, `app_url`, `region`, `created_at_rfc3339`, `wasm_hash`, `provider`)
- `preview_apps`: 動的プレビューアプリ登録情報 (`app_id` PK, `display_name`, `part_id`, `preview_url`, `path_url`, `owner_account_id`, `created_at_rfc3339`, `status`, `subdomain`)

## 自動プロビジョニングと初期化

1. GitHub Actions デプロイ時（`.github/workflows/deploy.yaml`）に `scripts/ensure-d1.sh` が Cloudflare API 経由で `definy-db` D1 データベースを検索（未作成なら自動作成）し、`wrangler.toml` に `[[d1_databases]]` (`binding = "DB"`) を設定します。
2. Worker 起動時（`WorkerStore.ensureSeeded`）に `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` を冪等に実行し、`/__definy_seed_bundle.json` の初期ビルトインイベント・CAS コンテンツを `INSERT OR IGNORE` で D1 にシードします。
3. `GET /healthz` エンドポイントの `storage` フィールド（`"cloudflare-d1"` または `"in-memory"`）で現在の永続化バックエンドを確認できます。
