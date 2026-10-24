# Cloudflare Workers REST API v4 による運用ブートストラップ (Edge Bootstrapping)

definy では、以前使っていた VM / Docker コンテナ基盤（Fly.io、現在は廃止）に代えて、**Cloudflare
Workers REST API v4** (`https://api.cloudflare.com/client/v4`)
を直接呼び出すことで、OS やコンテナのオーバーヘッドを排したグローバルエッジ V8
Isolate 環境への自己デプロイ（運用ブートストラップ）をサポートしています。

---

## 1. Cloudflare Workers 採用の背景と優位性

| 観点                   | Fly.io (Docker / Linux VM)                        | Cloudflare Workers (V8 Isolate)                                                                      |
| :--------------------- | :------------------------------------------------ | :--------------------------------------------------------------------------------------------------- |
| **実行環境**           | 軽量 Linux VM (Firecracker microVM)               | V8 Isolate (Web 標準エッジランタイム)                                                                |
| **起動オーバーヘッド** | 起動に数秒〜数十秒                                | サブミリ秒〜数ミリ秒 (OS レイヤー完全撤廃)                                                           |
| **成果物の配布方式**   | Docker イメージビルドまたは Wasm ファイル直接注入 | ES Modules (`worker.js`) + `app.wasm` (`application/wasm`) を REST API の multipart/form-data で送信 |
| **依存技術の少なさ**   | OS, Linux カーネル, Dockerfile, 仮想化層に依存    | **最小の依存** (V8 Isolate と Web 標準 API のみ)                                                     |

definy は「純粋な式と能力 (Capability)
による自律的システム」を目指しており、重厚な OS レイヤーが存在しない Cloudflare
Workers は definy の設計思想に最も適合するクラウド実行基盤です。

---

## 2. デプロイは普通のパーツ (`definy.deploy-to-cloudflare-workers`)

デプロイを特殊扱いしない (issue #733)。サーバーの `DeployService` と `/deployments` 画面は削除し,
デプロイは definy で書いたパーツ `definy.deploy-to-cloudflare-workers` が **definy 製のコンパイラでコンパイルし,
HTTP リクエストで** 行う。

- API トークンはシークレット ([secret.md](secret.md)) で渡す。`definy.cloudflare-api-token` (送ってよい宛先は
  `https://api.cloudflare.com/`) のページで値を入れる。トークンは Cloudflare の管理画面の「アカウント API トークン」で
  Workers Scripts の編集権限を付けて作る。どのリクエストにも `Authorization: Bearer <トークン>` をホストが入れる

```text
definy.deploy-to-cloudflare-workers(
  worker_name: string,
  api_token: Secret,   -- Cloudflare のアカウント API トークン (definy.cloudflare-api-token など)
  handler: Code<fn(request: { method, url, headers }) => { status, headers, body }>,
) => wasi.io
```

- `handler` はパーツの値ではなく **コードそのもの** (`quote` 式, [quote.md](quote.md))。型で「HTTP リクエストを受け取って
  レスポンスを返す関数」に制限している
- 返り値は I/O をするプログラム (`wasi.io`, [wasi-io.md](wasi-io.md))。パーツ詳細画面で評価すると, その場で次の順に動く

  1. `get_parts` で handler が参照するパーツの式を読み, (次の PUT で) `core.compile-to-wasm` で Wasm にコンパイルする
  2. `GET /accounts` でトークンのアカウント ID を読む (最初の `"id"`)。アカウント ID は入力させない
     (ユーザーには常にアカウント API トークンを使ってもらう方針)
  3. `PUT /accounts/{account}/workers/scripts/{worker_name}` に multipart (`metadata`, `worker.js`, `app.wasm`) で送る。
     `worker.js` はパーツ `definy.cloudflare-workers-runtime-script`, 本文は `definy.cloudflare-workers-script-upload-body`
  4. `POST .../subdomain` に `{"enabled":true}` を送って workers.dev を有効にする
  5. `GET /accounts/{account}/workers/subdomain` でサブドメインを読み, `デプロイしました: https://<worker>.<subdomain>.workers.dev` を返す

- Cloudflare の API はブラウザからの CORS を許可していないので, 実際にブラウザから送るには設定画面で
  「CORS エラーのときサーバーで仲介する」を有効にする (許可されたアカウントのみ。[wasi-io.md](wasi-io.md) の「CORS の仲介」)

### 例 (`seeds/sample.json`)

```text
sample.deploy-hello-worker =
  definy.deploy-to-cloudflare-workers("definy-hello", quote(fn(request) =>
    { status: 200, headers: [content-type: text/plain], body: std.string-to-utf8-stream("Hello from definy! " ++ request.url) }))

sample.deploy-self-hosted-definy-server =
  definy.deploy-to-cloudflare-workers("self-definy", quote(fn(request) => sample.self-hosted-definy-server(request)))
```

`sample.self-hosted-definy-server` (definy で書いた definy サーバー) をデプロイすると, コンパイル結果は約 552KB,
アップロードは約 370KB で, 全体は約 3 秒 (Node.js で計測, 2026-10-24)。

### デプロイ先の `worker.js`

`definy.cloudflare-workers-runtime-script` は以前 `worker/cloudflare_api.ts` が作っていたものと同じ。`app.wasm` の
`evaluate()` が関数を返したら HTTP リクエストを渡し, 返った `{ status, headers, body }` (body はストリーム) をレスポンスにする。

---

## 3. 以前の仕組み (削除済み)

以前はパーツの式の中の `definy.deploy({ cloudflareWorkerName, cloudflareToken, handler })` をサーバーが探し,
`DeployService/DeployCloudflare` が Worker 内の stage1 で handler をコンパイルしてデプロイしていた。デプロイ履歴を
D1 の `deployments` テーブルに残し, `/deployments` 画面で見ていた。これらと `ListCloudflareWorkers`,
`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_API_BASE_URL` などのサーバーの環境変数は削除した。
さらに前の Rust 版の `DeployCloudflare` は, 任意の JavaScript (`custom_script`)・パーツ (`part_id`)・CAS の Wasm (`wasm_hash`)
のどれでも配備できる汎用 API で, 既定の `worker.js` が Wasm の線形メモリの値を読んで HTML や JSON (`/api/eval`) で返していた。

---

## 4. Cloudflare Workers REST API v4 運用の技術知見

1. **multipart/form-data による `worker.js` + `app.wasm` (`application/wasm`) モジュール送信**:
   - Cloudflare Workers の V8 ランタイムは、実行時に動的なバイト列 (`Uint8Array`) から `WebAssembly.instantiate` することをセキュリティポリシー上禁止しています (`CompileError: WebAssembly.instantiate(): Wasm code generation disallowed by embedder`)。
   - 一方で、`PUT /accounts/{account_id}/workers/scripts/{script_name}` の `multipart/form-data` に `app.wasm` (`Content-Type: application/wasm`) を別パートとして添付し、`worker.js` から `import wasmModule from "./app.wasm"; WebAssembly.instantiate(wasmModule, ...)` としてインポートすることで、Cloudflare 側で事前コンパイルされた `WebAssembly.Module` を V8 ネイティブ速度（Wasm GC 等の最新機能も含む）で実行できます。
2. **Account ID の自動解決**:
   - Cloudflare API はほとんどのエンドポイントで `account_id`
     を要求しますが、`GET /accounts` を叩くことで API トークンに紐づくアカウント
     ID を動的に解決可能です。今の `definy.deploy-to-cloudflare-workers` もこれでアカウント ID を読む。
3. **`workers.dev` サブドメインの有効化と URL 導出**:
   - スクリプトをアップロードしただけでは `workers.dev`
     経由での外部アクセスが無効な場合があります。配備後に
     `POST /accounts/{account_id}/workers/scripts/{script_name}/subdomain` に
     `{"enabled": true}` を送信することで即時有効化します。
   - アカウントの共有サブドメインは
     `GET /accounts/{account_id}/workers/subdomain`
     で取得でき、`https://{script_name}.{subdomain}.workers.dev`
     として決定的に解決されます。
4. **API のレスポンスは整形された JSON**:
   - `api.cloudflare.com` のレスポンスは `"subdomain": "narumincho"` のように `:` の後に空白が入る。
     `definy.json-string-field` は `"key":"value"` と `"key": "value"` のどちらも読む
     (以前は空白なしだけを探していたので, 本番で「サブドメインは分かりませんでした」になった)。
   - 2026-10-24 に本番 (definy.narumincho.workers.dev) から CORS の仲介を使って `sample.deploy-hello-worker` をデプロイし,
     `https://definy-hello.narumincho.workers.dev/` が応答することを確かめた。
