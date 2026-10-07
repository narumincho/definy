# Fly.io 本番環境トラブルシューティングと安定化ノウハウ

## 1. 発生していた障害事象

`https://definy.fly.dev` に対するアクセスで以下の HTTP 502 Bad Gateway
が発生し、サービスが停止していた：

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
- `GET /wasm/definy_client.js`: **HTTP 307 Temporary Redirect**
  (`/wasm/definy_client.js?lang=en` へ転送)

---

## 2. 根本原因の分析

1. **`panic = "abort"` によるプロセスの即死と接続切断**:
   - `Cargo.toml` の `profile.release` に `panic = "abort"` が設定されていた。
   - ハンドラやバックグラウンドタスクで panic が発生すると、axum や tokio
     のワーカースレッドが catch_unwind できず、OS プロセス全体が即座に abort
     (SIGABRT) して終了する。
   - これにより Fly Proxy から見ると「メッセージ送信完了前に TCP
     コネクションが突然 CLOSE された」状態となり、`[PU02]` 502 Bad Gateway
     が返されていた。

2. **古い本番バイナリにおける DB 遅延初期化と並行競合**:
   - 本番で稼働していたコミット `334fe33` では、サーバー起動時 (`start_server`)
     に DB 接続を行わず、`state.db = None` で Axum を起動していた。
   - 最初のリクエスト（`GET /?lang=en` や
     Connect-RPC）が到達したタイミングで初めて `ensure_db` -> `init_db()`
     を実行していた。
   - ブラウザアクセスにより HTML
     や各アセットの複数リクエストが同時に流入すると、並行して
     `db::init_db()`（スキーママイグレーションや組み込みデータ初期化）が多重実行され、SurrealDB
     への接続競合やクラッシュを誘発していた。

3. **Docker コンテナ内での静的アセット探索失敗**:
   - Dockerfile では
     `COPY target/dx/definy_client/release/web/public /app/public`
     で配置していたが、サーバーの `get_public_dir_candidates()` が `/app/public`
     や実行バイナリ基準の絶対パスを探索対象に含めていなかった。
   - このため `/wasm/definy_client.js` が静的ファイルとしてヒットせず、HTML
     リクエストフォールバックに落ちて `307 Redirect` を連発し、不要な HTML/DB
     アクセス負荷を倍増させていた。

4. **Fly.io のヘルスチェックとリソース設定の不足**:
   - `fly.toml` に HTTP
     ヘルスチェックが設定されておらず、マシン起動直後にサーバーが安定する前にトラフィックが流し込まれていた。
   - また VM メモリサイズが明示されておらず（デフォルト 256MB）、メモリ逼迫時の
     OOM Killer (SIGKILL) リスクがあった。

---

## 3. 実施した恒久対策

### ① `panic = "unwind"` への変更と panic hook の設定

- `Cargo.toml` の `[profile.release]` を `panic = "unwind"` に変更。
- `definy-server/src/main.rs` にパニックフックを設定し、パニック発生時も stderr
  に詳細を出力するとともに、axum が安全に 500
  エラーを返しプロセスを延命・回復可能にした。

### ② リモート DB 接続のタイムアウト保護と耐障害フォールバック

- `init_db_with_config` を新設し、リモート SurrealDB への接続・ログイン処理に 10
  秒のタイムアウト (`tokio::time::timeout`) を設定。
- `AppState` に `last_db_failure` を導入。直近 5
  秒以内に接続失敗した場合は無駄な再接続をスキップし、即座にオフラインモード（警告バナー付き
  HTML、または 503 SERVICE_UNAVAILABLE）を返すようにした。これにより、外部 DB
  が一時停止中でもリクエストがハングせず 0.1ms で安全に応答する。

### ③ 静的アセット探索の堅牢化

- `get_public_dir_candidates` に `/app/public` および `std::env::current_exe()`
  の親ディレクトリを追加。コンテナ内外を問わずクライアント Wasm/JS
  アセットを確実に発見・配信できるようにした。

### ④ `fly.toml` の設定強化

- `[[http_service.checks]]` を追加し、DB 不要で常に応答可能な
  `/api-docs/openapi.json` に対する HTTP ヘルスチェックを設定。
- `[[vm]]` に `memory = "512mb"` を設定し、OOM リスクを低減。

---

## 4. 本番デプロイ手順

本修正およびこれまでの Step 1〜4（仮想 Wasm デプロイ機能含む）は `dev`
ブランチにコミットされています。本番環境（Fly.io）へ反映させるには：

1. `dev` ブランチから `main` ブランチへの Pull Request
   を作成・マージする（または
   `git checkout main && git merge dev && git push origin main`）。
2. GitHub Actions (`.github/workflows/deploy.yaml`)
   が自動起動し、`dx build`、`cargo build`、`flyctl deploy --local-only`
   が実行されて本番マシンへ安全にローリングアップデートされる。

---

## 5. HTML リクエスト配信ライフサイクルと UI での可視化

Fly.io 上で definy が稼働する際の HTTP リクエストからクライアント SPA
起動までのシーケンス、および CI/CD パイプラインのフローは、definy
UI（`/deployments` 画面の「fly.io デプロイ & HTML リクエスト
ライフサイクルフロー図」）にて多言語（日・英・エスペラント）で視覚化されています。

### 通信シーケンスの要点

1. **エッジ Anycast & コールドスタート**:
   - リクエスト到達時、マシンが stopped（待機中）であれば Firecracker MicroVM が
     1〜2 秒で瞬時に起動（`auto_stop_machines = "stop"`,
     `auto_start_machines = true`）。
2. **307 言語判定リダイレクト**:
   - ルートパス `/` への初回アクセス時、Accept-Language ヘッダーを評価して
     `/?lang=en`（または `ja`, `eo`）へ 307 Temporary Redirect を返却。
3. **SSR & SsrState 埋め込み**:
   - Axum サーバーが SurrealDB よりイベントを取得し、`definy_ui::render_inner`
     により初期 HTML
     を生成。クライアントの高速初期化用ステート（`__DEFINY_INITIAL_STATE__`）を
     CBOR 形式で埋め込み、約 787 KB の完全な HTML を返却。
4. **即座のファーストペイント (FCP) とハイドレーション**:
   - ブラウザは白画面を挟まず初期画面を表示。並行して
     `/assets/definy_client*.js` と `.wasm`
     を取得し、埋め込み状態を引き継いで即座に対話型
     SPA（Dioxus）としてハイドレーションを完了。

---

## 6. コールドスタート時のタイムアウト防止と「DB初期化中」フォールバック配信

### 発生した事象

- マシン自動停止（スリープ）状態からのリクエスト受信時（コールドスタート時）、Fly
  Proxy の接続待ち（約 8 秒）がタイムアウトし、ユーザーに 502 /
  接続エラーが返る事象が発生した。

### 原因

- サーバー起動時（`start_server()`）において、HTTP
  ポート（8000）のバインド前にリモート SurrealDB
  へのスキーマ・組み込みデータマイグレーション（`db::init_db()`）を同期待ちしていた。
- リモート SurrealDB（インド
  `aws-aps1`）への通信遅延の累積により、組み込みパーツの同期に約 35
  秒を要していたため、Fly Proxy の 8 秒タイムアウトを大幅に超過していた。

### 恒久対策

1. **HTTP サーバーの即時 Listen**:
   - `start_server()` において、DB 初期化を待たずに即時ポート 8000
     をバインドして Axum サーバーを稼働。
   - `db::init_db()`
     はバックグラウンド（`tokio::spawn`）で非同期実行し、初期化状態を
     `AppState.db_init_status`（`Initializing` / `Ready` / `Failed`）で管理。
2. **「DB 初期化中」警告表示付き HTML の即時 SSR 配信**:
   - DB 初期化中に到達した HTML
     リクエストに対して、`ConnectionStatus::DatabaseInitializing` を用いて「⚠️
     データベースを初期化中です。しばらくお待ちください。ローカル機能・式の計算は利用可能です。」という警告バナーおよび「DB:
     初期化中」バッジを付与した完全な HTML をミリ秒単位で即座に応答（HTTP
     200）。
3. **クライアント側の自動接続回復**:
   - クライアント
     SPA（`client.rs`）において、初期化中や接続待機状態の場合はバックグラウンドで定期再試行を行い、サーバー側の
     DB
     初期化完了を検知した時点で自動的に「接続中」ステータスへ移行し、最新イベントを読み込む。

---

## 7. Dioxus release ビルドのアセットパス差異と Wasm/JS Hydration 失敗の解決

### 発生した事象

- 本番環境（`https://definy.fly.dev/api/architecture?lang=ja`
  等）で、タブ切り替えボタンをクリックしても他のフロー図や画面へ切り替わらない。
- ブラウザ側で JavaScript / WebAssembly が実行されず、静的な SSR HTML
  のまま停止していた。

### 原因

1. **debug ビルドと release ビルドでの Dioxus 出力パスの差異**:
   - ローカル（debug ビルド）: `public/wasm/definy_client.js`,
     `public/wasm/definy_client_bg.wasm`
   - 本番 CI（`dx build --release`）: `public/assets/definy_client-<hash>.js`,
     `public/assets/definy_client_bg-<hash>.wasm`
2. **サーバー側の固定パス探索とスクリプトタグ不一致**:
   - サーバー（`html.rs`）が
     `<script type="module" src="/wasm/definy_client.js?v=..."></script>`
     をハードコードしていた。
   - `assets.rs` も `wasm/definy_client.js`
     固定でファイルを探していたため、release 版の `assets/definy_client-*.js`
     を見つけられず `resolve_client_js()` が `None` を返していた。
   - ブラウザがスクリプトを取得しようとすると、サーバーは言語なしリクエストとして
     `307 Temporary Redirect` を経て **HTML（770KB）**
     を返してしまい、ブラウザ側で構文エラーとなって Hydration が 100%
     失敗していた。

### 恒久対策

1. **アセットの動的探索 (`find_client_js` / `find_client_wasm`)**:
   - `index.html` 内の `<script>` タグの参照、`assets/` ディレクトリ、`wasm/`
     ディレクトリ、ルート直下を順に走査し、debug / release を問わず正確な JS /
     Wasm ファイルおよび相対パスを検出。
2. **HTML スクリプトタグの動的埋め込み**:
   - 検出された実際のパス（例: `/assets/definy_client-dxh....js`）を
     `<script type="module" src="{js_url}"></script>` に埋め込み。
3. **`public/` 直下ファイルの汎用静的配信**:
   - `handle_fallback` において、`public/` 配下に実在する静的ファイル（`assets/`
     以下のハッシュ付き JS/Wasm 含む）を適切な Content-Type
     およびキャッシュヘッダーで直接配信。
4. **No-JS / SSR フォールバック対応（アーキテクチャ図 UI）**:
   - タブ切り替えボタンを `a` リンク化し、URL クエリ（例:
     `?tab=submit&lang=ja`）に対応。Wasm
     が動作していない環境でもリンク遷移で目的の図を表示可能に。
   - さらに「5. すべての図を一覧表示 (全展開)」タブを追加し、全フロー図を 1
     ページで一気にスクロール閲覧できるように改善。
