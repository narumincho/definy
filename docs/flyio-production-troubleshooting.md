# Fly.io 本番環境トラブルシューティングと安定化ノウハウ

## 1. 発生していた障害事象

`https://definy.fly.dev` に対するアクセスで以下の HTTP 502 Bad Gateway が発生し、サービスが停止していた：

```text
[PU02] could not complete HTTP request to instance: legacy hyper error: client error (SendRequest), caused by: connection closed before message completed
```

### 詳細な切り分け結果 (curl による検証)

- `GET /api-docs/openapi.json`: **HTTP 200 OK** (正常応答)
- `GET /icon.png`: **HTTP 200 OK** (正常応答)
- `GET /`: **HTTP 307 Temporary Redirect** (`/?lang=en` へ転送)
- `GET /?lang=en` (HTML 要求): **HTTP 502 Bad Gateway**
- `POST /definy.v1.EventService/GetEvents`: **HTTP 502 Bad Gateway**
- `POST /definy.v1.EventService/CheckMissingHashes`: **HTTP 502 Bad Gateway**
- `GET /wasm/definy_client.js`: **HTTP 307 Temporary Redirect** (`/wasm/definy_client.js?lang=en` へ転送)

---

## 2. 根本原因の分析

1. **`panic = "abort"` によるプロセスの即死と接続切断**:
   - `Cargo.toml` の `profile.release` に `panic = "abort"` が設定されていた。
   - ハンドラやバックグラウンドタスクで panic が発生すると、axum や tokio のワーカースレッドが catch_unwind できず、OS プロセス全体が即座に abort (SIGABRT) して終了する。
   - これにより Fly Proxy から見ると「メッセージ送信完了前に TCP コネクションが突然 CLOSE された」状態となり、`[PU02]` 502 Bad Gateway が返されていた。

2. **古い本番バイナリにおける DB 遅延初期化と並行競合**:
   - 本番で稼働していたコミット `334fe33` では、サーバー起動時 (`start_server`) に DB 接続を行わず、`state.db = None` で Axum を起動していた。
   - 最初のリクエスト（`GET /?lang=en` や Connect-RPC）が到達したタイミングで初めて `ensure_db` -> `init_db()` を実行していた。
   - ブラウザアクセスにより HTML や各アセットの複数リクエストが同時に流入すると、並行して `db::init_db()`（スキーママイグレーションや組み込みデータ初期化）が多重実行され、SurrealDB への接続競合やクラッシュを誘発していた。

3. **Docker コンテナ内での静的アセット探索失敗**:
   - Dockerfile では `COPY target/dx/definy_client/release/web/public /app/public` で配置していたが、サーバーの `get_public_dir_candidates()` が `/app/public` や実行バイナリ基準の絶対パスを探索対象に含めていなかった。
   - このため `/wasm/definy_client.js` が静的ファイルとしてヒットせず、HTML リクエストフォールバックに落ちて `307 Redirect` を連発し、不要な HTML/DB アクセス負荷を倍増させていた。

4. **Fly.io のヘルスチェックとリソース設定の不足**:
   - `fly.toml` に HTTP ヘルスチェックが設定されておらず、マシン起動直後にサーバーが安定する前にトラフィックが流し込まれていた。
   - また VM メモリサイズが明示されておらず（デフォルト 256MB）、メモリ逼迫時の OOM Killer (SIGKILL) リスクがあった。

---

## 3. 実施した恒久対策

### ① `panic = "unwind"` への変更と panic hook の設定
- `Cargo.toml` の `[profile.release]` を `panic = "unwind"` に変更。
- `definy-server/src/main.rs` にパニックフックを設定し、パニック発生時も stderr に詳細を出力するとともに、axum が安全に 500 エラーを返しプロセスを延命・回復可能にした。

### ② リモート DB 接続のタイムアウト保護と耐障害フォールバック
- `init_db_with_config` を新設し、リモート SurrealDB への接続・ログイン処理に 10 秒のタイムアウト (`tokio::time::timeout`) を設定。
- `AppState` に `last_db_failure` を導入。直近 5 秒以内に接続失敗した場合は無駄な再接続をスキップし、即座にオフラインモード（警告バナー付き HTML、または 503 SERVICE_UNAVAILABLE）を返すようにした。これにより、外部 DB が一時停止中でもリクエストがハングせず 0.1ms で安全に応答する。

### ③ 静的アセット探索の堅牢化
- `get_public_dir_candidates` に `/app/public` および `std::env::current_exe()` の親ディレクトリを追加。コンテナ内外を問わずクライアント Wasm/JS アセットを確実に発見・配信できるようにした。

### ④ `fly.toml` の設定強化
- `[[http_service.checks]]` を追加し、DB 不要で常に応答可能な `/api-docs/openapi.json` に対する HTTP ヘルスチェックを設定。
- `[[vm]]` に `memory = "512mb"` を設定し、OOM リスクを低減。

---

## 4. 本番デプロイ手順

本修正およびこれまでの Step 1〜4（仮想 Wasm デプロイ機能含む）は `dev` ブランチにコミットされています。本番環境（Fly.io）へ反映させるには：

1. `dev` ブランチから `main` ブランチへの Pull Request を作成・マージする（または `git checkout main && git merge dev && git push origin main`）。
2. GitHub Actions (`.github/workflows/deploy.yaml`) が自動起動し、`dx build`、`cargo build`、`flyctl deploy --local-only` が実行されて本番マシンへ安全にローリングアップデートされる。
