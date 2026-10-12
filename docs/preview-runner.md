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

### ① Cloudflare Workers 本番環境: ハイフン連結 1階層サブドメイン (`https://{sub}-definy.narumincho.com`)

Cloudflare Workers + カスタムドメイン (`narumincho.com`)
環境では、以下の2つの要件を同時に満たすため、本体を
**`https://definy.narumincho.com`**、作成したパーツで動作する HTTP
サーバー（プレビューアプリ）を **`https://{sub}-definy.narumincho.com`**
で配信します。

1. **Same-Origin Policy による `IndexedDB`（秘密鍵）の完全隔離**:
   - definy 本体 (`https://definy.narumincho.com`) はブラウザの `IndexedDB`
     にユーザーの Ed25519 秘密鍵を保存します。
   - ユーザー作成アプリを同一オリジンのパス (`/preview/{sub}`)
     でそのまま実行すると、アプリ内の JavaScript から本体の `IndexedDB`
     が読み取られてしまうため、アプリごとに独立したオリジン
     (`https://{sub}-definy.narumincho.com`) へ分離します。
2. **Cloudflare 無料 Universal SSL ワイルドカード (`*.narumincho.com`) と単一
   Worker 運用**:
   - 2階層サブドメイン (`{sub}.definy.narumincho.com`) は Cloudflare 標準の無料
     Universal SSL 証明書 (`*.narumincho.com`) の対象外となり、Advanced
     Certificate Manager または個別 Custom Domain 登録が必要になります。
   - 一方、1階層サブドメインの **`https://{sub}-definy.narumincho.com`**
     であれば、無料 Universal SSL (`*.narumincho.com`)
     で追加費用・証明書発行待ち時間ゼロで無制限のサブドメインを即座に HTTPS
     化でき、かつ Worker Route のプレフィックスワイルドカード
     (`*-definy.narumincho.com/*` → `definy` Worker) により **単一の `definy`
     Worker** で全サブドメインを処理できます。
   - また、`wrangler.toml` の `[assets]` で `run_worker_first = true`
     を指定することで、すべてのサブドメインリクエストが Static Assets の SPA
     フォールバックより先に Worker スクリプト (`worker/index.ts`)
     で判定・実行されます。

#### Cloudflare 管理画面での1回限りの設定手順（GitHub Actions での権限付与不要）

`wrangler.toml` にはあえて `routes` を記載していないため、**Cloudflare
ダッシュボードで1度だけ以下の設定を行えば、以降の GitHub Actions による
`wrangler deploy` でも上書き・消去されずに永続維持されます**（GitHub Actions の
`CLOUDFLARE_API_TOKEN` に DNS や Zone Routes
の編集権限を付与する必要もありません）。

1. **メインドメイン (`definy.narumincho.com`) の登録**:
   - Cloudflare ダッシュボード → **Workers & Pages** → **`definy`** →
     **Settings** → **Domains & Routes** → **Add** → **Custom domain**
   - `definy.narumincho.com` を入力して追加（DNS
     レコードと証明書が自動構成されます）。
2. **ワイルドカード DNS レコード (`*.narumincho.com` または個別) の追加**:
   - Cloudflare ダッシュボード → **`narumincho.com` ゾーン** → **DNS** →
     **Records** → **Add record**
   - **Type**: `AAAA` / **Name**: `*` / **IPv6 address**: `100::` / **Proxy
     status**: **Proxied (オレンジ雲 ON)**
   - ※ 明示的に登録したサブドメイン（例: `mc.narumincho.com` や
     `narumincho.com`）は最長一致ルールによりワイルドカードより常に優先されるため、他用途のサブドメインには一切影響しません。
3. **ワイルドカード Worker Route (`*-definy.narumincho.com/*`) の追加**:
   - Cloudflare ダッシュボード → **`narumincho.com` ゾーン** → **Workers
     Routes** → **Add route**
   - **Route**: `*-definy.narumincho.com/*`
   - **Worker**: `definy`

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
やサブドメインが使用できない閉域環境向けに、パスプレフィックスルーティングもサポートされています。
同一オリジン上の `/preview/:app_id/*` 経由でアクセスされた場合は、本体の
`IndexedDB` や `localStorage` へのアクセスを遮断するため、レスポンスに
`Content-Security-Policy: sandbox allow-scripts allow-forms`（`allow-same-origin`
なし＝不透明オリジン `null` への強制隔離）を自動付与します。

- **URL 形式**: `http://localhost:8000/preview/<app_id>/*`
  - ルート: `http://localhost:8000/preview/my-app/`
  - サブパス: `http://localhost:8000/preview/my-app/api/users`

---

## 3. パーツ評価エンジンとレスポンス形式

Cloudflare Workers (`worker/cbor_eval.ts`) および Rust サーバー
(`definy-server/src/preview_service.rs`) の双方で、プレビューアプリに紐づく
`partId`（`derive_module_part_id` で導出された Part ID、`module.part` 名、または
CAS の Wasm ハッシュ）を D1 / イベントストアから解決して評価します。

- **関数パーツ (`Expression::Function`) の HTTP リクエスト引数**:
  - 対象パーツが関数の場合、第1引数に
    `{ method: String, path: String, query: String, url: String, headers: List<{ name: String, value: String }> }`
    レコード（第1引数名が `path` の場合はパス文字列
    `subpath`）を渡して呼び出します。
- **CAS Wasm バイナリの直接実行**:
  - CAS 内にコンパイル済み Wasm バイナリが存在する場合は
    `WebAssembly.instantiate` で実行し、線形メモリ上のタgged layout から
    `DefinyValue` を復元します。

プレビュー対象パーツの評価結果は、以下のように HTTP
レスポンスへ自動変換されます。

| definy の評価値型                          | マッピング先 HTTP レスポンス                         | 適用されるヘッダー / Content-Type                                                                                                     |
| ------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `Value::String(html)`                      | HTML またはプレーンテキスト本文                      | HTML タグを含む場合: `text/html; charset=utf-8`<br>その他: `text/plain; charset=utf-8`                                                |
| `Value::Record(fields)`                    | `{ status, headers, body }` フィールドを解析して展開 | `status`: 数値 (例: 200, 404)<br>`headers`: `List<{ name: String, value: String }>`（任意の複数ヘッダー指定可）<br>`body`: 本文文字列 |
| その他 (`Record`, `List`, `Variant`, etc.) | JSON 構造体へシリアライズ                            | `application/json`                                                                                                                    |

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
