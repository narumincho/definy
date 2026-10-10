# definy Web アプリケーション プレビュー実行機能 (In-Server Preview Runner)

definy 上で作成された Web アプリケーション（パーツ式、HTML 文字列、HTTP
レスポンスレコード、Wasm
等）をサーバー内部でオンデマンド実行し、ブラウザから動作確認を行うためのプレビュー実行環境仕様。

---

## 1. 背景と設計思想

### Web ブラウザの制約とサーバー内実行の必要性

Web ブラウザの JavaScript / WebAssembly サンドボックス内からは、HTTP
リクエストを受信するネイティブな Web
サーバーを直接リッスン・ホストすることはできません。 そのため、Web
アプリの動作確認（localhost
的なプレビュー）を行うには、バックエンドサーバー（`definy-server`）内でアプリをホストし、HTTP
リクエストを中継して実行する必要があります。

### セキュリティと権限管理 (管理者制限)

サーバー内で任意のコードを実行・ホストする機能をパブリックな全ユーザーに無制限で解放すると、リソース枯渇や不正アクセスのリスクが生じます。
このため、definy では**起動時の環境変数に明示的に指定された管理者ユーザー（Admin
User）のみがプレビューアプリを登録・開始・停止可能**とするセキュリティモデルを採用しています。

```bash
# definy-server 起動時の管理者アカウント指定 (Ed25519 AccountId hex)
# 単一指定、またはカンマ区切りで複数指定可能
export DEFINY_ADMIN_ACCOUNT_ID="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

- 未設定時やアカウント ID が一致しない要求は、Connect-RPC において
  `permission_denied` (HTTP 403 Forbidden) で即座に拒否されます。

---

## 2. ドメインルーティングとアクセス方式

### ① クラウド版: サブドメイン自動割り当て (`*.definy.fly.dev`)

クラウド環境（Fly.io
等）では、アプリごとに一意のサブドメインスラッグ（`app_id`）が割り当てられます。

- **URL 形式**: `https://<app_id>.<root_domain>`
  - 例: `https://my-app.definy.fly.dev`
- **ルーティング機構**: Axum のフォールバックハンドラーが HTTP リクエストの
  `Host`
  ヘッダーを解析し、登録済みプレビューアプリのサブドメインとマッチした場合、SSR
  や通常アセット配信をバイパスして直接プレビューハンドラー（`execute_preview_app`）にディスパッチします。

### ② ローカル開発環境: `*.localhost` サブドメイン

モダンブラウザ（Chrome, Firefox, Safari 等）は、RFC 6761 に基づき `*.localhost`
を外部 DNS に問い合わせることなく自動的に
`127.0.0.1`（ループバック）へ名前解決します。

- **URL 形式**: `http://<app_id>.localhost:8000`
  - 例: `http://my-app.localhost:8000/`
- ポート番号付きの `Host`
  ヘッダー（`my-app.localhost:8000`）も自動認識され、ローカル環境でもサブドメインによる独立した
  Cookie / Origin 分離プレビューが可能です。

### ③ パスプレフィックス フォールバック (`/preview/:app_id/*`)

ワイルドカード DNS
やサブドメインが使用できない閉域環境やリバースプロキシ環境向けに、パスプレフィックスルーティングもネイティブサポートされています。

- **URL 形式**: `http://localhost:8000/preview/<app_id>/*`
  - ルート: `http://localhost:8000/preview/my-app/`
  - サブパス: `http://localhost:8000/preview/my-app/api/users`

---

## 3. レスポンス形式とマッピング仕様

プレビュー対象パーツの評価結果（`definy_core::expression_eval::Value`）は、以下のように
HTTP レスポンスへ自動変換されます。

| definy の評価値型                          | マッピング先 HTTP レスポンス                             | 適用される Content-Type                                                                                 |
| ------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `Value::String(html)`                      | HTML またはプレーンテキスト本文                          | HTML タグを含む場合: `text/html; charset=utf-8`<br>その他: `text/plain; charset=utf-8`                  |
| `Value::Record(fields)`                    | `{ status, body, contentType }` フィールドを解析して展開 | `status` (数値, 例: 200, 404)<br>`body` (本文文字列)<br>`contentType` (指定値, デフォルト: `text/html`) |
| その他 (`Record`, `List`, `Variant`, etc.) | JSON 構造体へシリアライズ                                | `application/json`                                                                                      |

全てのプレビューレスポンスには識別ヘッダーとして
`X-Definy-Preview-App: <app_id>` が付与されます。

---

## 4. Connect-RPC API (`PreviewService`)

定義ファイル: `proto/definy/v1/preview.proto`

### ① `RegisterPreviewApp`

Web アプリプレビューを登録・開始します。

- **エンドポイント**: `/definy.v1.PreviewService/RegisterPreviewApp`
- **権限**: 管理者 (`DEFINY_ADMIN_ACCOUNT_ID`) 必須
- **リクエスト**:
  ```json
  {
    "appId": "my-app",
    "displayName": "My Web App",
    "partId": "part-web-handler",
    "accountId": "0123456789abcdef..."
  }
  ```
- **レスポンス**:
  ```json
  {
    "appId": "my-app",
    "previewUrl": "http://my-app.localhost:8000",
    "pathUrl": "http://localhost:8000/preview/my-app/",
    "status": "running",
    "subdomain": "my-app"
  }
  ```

### ② `ListPreviewApps`

稼働中のプレビューアプリ一覧を取得します。

- **エンドポイント**: `/definy.v1.PreviewService/ListPreviewApps`

### ③ `StopPreviewApp`

稼働中のプレビューアプリを停止・解放します。

- **エンドポイント**: `/definy.v1.PreviewService/StopPreviewApp`
- **権限**: 管理者 (`DEFINY_ADMIN_ACCOUNT_ID`) 必須
