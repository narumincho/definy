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

### 宣言的プレビューパーツ `definy:preview` による定義

手動で管理者アカウントIDを入力してサーバーに登録させる煩雑なUIを撤廃し、**プレビューを宣言的なパーツ式として定義する**モデルを採用しました。

```text
preview: { code: String, handler: HttpRequest -> HttpResponse }
```

この `preview` 関数は `definy` モジュール内の定義パーツ `definy:preview` であり、通常のパーツと同様に定義画面が存在し、パーツ名や式の変更にも透過的に追従します。

```text
definy.preview({
  code: "self-definy",
  handler: fn(req: HttpRequest) => HttpResponse { ... }
})
```

- **自動オンデマンド解決**: サーバー (`definy-server` および Cloudflare Workers) は、手動での事前登録を行わなくても、イベント履歴内のコミットされたパーツ式から `code == app_id` となるパーツを自動検出して HTTP リクエストをルーティング・実行します。
- **自動プレビューリンク表示**: UI（パーツ編集画面やパーツ一覧）において `definy:preview` を呼び出しているパーツを検出し、その場でプレビューURL（サブドメインURLおよびパスURL）をリンクとして設置します。ワンクリックで即座にプレビューを開くことができます。
- **RFC 1123 サブドメインバリデーション**:
  `code` は DNS サブドメイン（`{code}.localhost` や `{code}-definy.narumincho.com`）のラベルとして利用されるため、RFC 1123 に準拠した検証が行われます。
  1. 長さは 1 文字以上 63 文字以下。
  2. 小文字英数字 (`a-z`, `0-9`) およびハイフン (`-`) のみ許容。
  3. 先頭・末尾文字にハイフン (`-`) は不可。
  4. 違反がある場合は、パーツ編集画面およびプレビュー一覧に `⚠️ Invalid Subdomain (RFC 1123)` 警告が表示され、不正な設定を事前に把握できます。
- **権限管理**: パーツの作成・編集には通常のユーザー認証（Ed25519 署名）が適用されます。バックエンドの登録 API (`RegisterPreviewApp`) 経由での永続プレビュー登録・停止は管理者アカウント (`DEFINY_ADMIN_ACCOUNT_ID`) に制限されますが、宣言的パーツプレビューは全ユーザーが安全にパーツとして記述・利用できます。

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

## 3. 純粋関数型 HTTP インターフェースと Pull 型ストリーム (`ByteStream`)

definy は純粋関数型言語であり、HTTP の仕様そのものに含まれない JSON の暗黙変換やホスト側での URL パス・クエリ事前分割といった短絡的な API を排除しています。
Cloudflare Workers (`worker/http_stream.ts`) および Rust サーバー (`definy-server/src/preview_service.rs`) の双方で、以下の厳密な純粋関数型インターフェースに従って HTTP リクエスト・レスポンスを評価します。

### ① Pull 型バイトストリーム (`ByteStream`) の表現

HTTP のリクエストボディおよびレスポンスボディは、余代数的な Unfold（ステートマシン）による **Pull 型ストリーム** として表現されます。

```text
type StreamStep<State> = union<
  yield({ chunk: List<Number>, nextState: State })
  | done
>

type ByteStream<State> = {
  initialState: State,
  next: fn(state: State) => StreamStep<State>
}
```

- ホストランタイム（Rust の `axum::body::Body::from_stream` / `WasmPullStream`、および Cloudflare Workers の Web 標準 `ReadableStream<Uint8Array>`）がクライアントへの送信準備ができるたびに `body.next(state)` を1ステップずつ Pull 評価します。
- `yield({ chunk, nextState })` が返された場合、`chunk`（`0..=255` のバイト列）を即座にフラッシュし、状態を `nextState` に更新して次の Pull を待機します。
- `done` が返された時点でストリームをクローズします。

### ② HTTP リクエスト型 (`HttpRequest`)

対象パーツが関数 (`fn(req) => ...`) の場合、第1引数 `req` には以下の4フィールドのみを持つレコードが渡されます。

```text
type HttpHeader = { name: String, value: String }

type HttpRequest = {
  method: String,
  url: String,
  headers: List<HttpHeader>,
  body: ByteStream
}
```

- ホスト側では URL の `path` や `query` を事前分割しません。利用者側の純粋な標準ライブラリ関数（`std.url-path(url)`, `std.url-query(url)`）を用いて `req.url` から抽出します。

### ③ HTTP レスポンス型 (`HttpResponse`)

HTTP ハンドラは以下の3フィールドを持つレコードを返します（文字列の直接返却による HTML 自動判定や、任意レコードの暗黙 JSON シリアライズは行いません）。

```text
type HttpResponse = {
  status: Number,
  headers: List<HttpHeader>,
  body: ByteStream
}
```

- 単純なテキストや HTML、自身で組み立てた JSON 文字列を返したい場合は、標準ライブラリの純粋関数 `std.string-to-utf8-stream(text)` または複数チャンクを順次ストリーム出力する `std.string-list-to-utf8-stream(chunks)` を仲介させます。
- 全てのプレビューレスポンスには識別ヘッダーとして `X-Definy-Preview-App: <app_id>` が付与されます。

### ④ 標準ライブラリ (`std`) の HTTP・URL・ストリーム補助関数

| 関数名 | 型シグネチャ | 説明 |
| --- | --- | --- |
| `std.string-to-utf8-bytes` | `(text: String) -> List<Number>` | 文字列を UTF-8 バイト列（`0..=255` のリスト）に変換する（`Expression::StringToBytes`） |
| `std.bytes-to-stream` | `(bytes: List<Number>) -> ByteStream<Number>` | 単一のバイト列を1チャンクの Pull 型 `ByteStream` に変換する |
| `std.string-to-utf8-stream` | `(text: String) -> ByteStream<Number>` | 文字列を UTF-8 エンコードし、1チャンクの Pull 型 `ByteStream` に変換する |
| `std.string-list-to-utf8-stream` | `(chunks: List<String>) -> ByteStream<Number>` | 文字列リストの各要素を Pull ごとに1チャンクずつ UTF-8 バイト列へ変換して返すマルチチャンク `ByteStream` |
| `std.string-index-of` | `(text: String, target: String, startIndex: Number) -> Number` | `startIndex` 以降で `target` が最初に現れるバイト位置（見つからない場合は `-1`）を返す |
| `std.url-path` | `(url: String) -> String` | 完全な URL（例: `"https://sub-definy.narumincho.com/api/self-host?foo=1"`）からパス部分（`"/api/self-host"`）を抽出する純粋関数 |
| `std.url-query` | `(url: String) -> String` | 完全な URL から `?` を含むクエリ文字列（`"?foo=1"`、存在しない場合は `""`）を抽出する純粋関数 |

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
