# wasi.io: I/O をするプログラムを値として書く

definy の式は純粋なので, HTTP リクエストのような I/O は「次にしてほしい I/O と, その結果を受け取る関数」の値
(`wasi.io`) として返し, ホスト (ブラウザ / Node.js) がその I/O をして関数を呼ぶ。`done` を返したら終わり。
`definy.deploy-to-cloudflare-workers` はこれで Cloudflare の API を呼ぶ ([cloudflare-workers.md](cloudflare-workers.md))。

能力 (Capability) をレコードで渡す設計 ([wasi-capability-io.md](wasi-capability-io.md)) とは別に, まずは
継続 (`then`) を持つ値として実装している。

## 型 (`seeds/wasi.json`)

```text
wasi.io =
  | done(string)                                   -- 終わり. 文字列は画面に出すメッセージ
  | outgoing_request { request: wasi.outgoing-request, then: fn(result: wasi.http-result) => wasi.io }
  | get_parts { ids: List<string>, then: fn(parts: List<{ id, expression }>) => wasi.io }
  | get_environment { then: fn(environment: List<{ name, value }>) => wasi.io }

wasi.outgoing-request = { method, url, headers: List<{ name, value }>, body: List<number> }
wasi.http-result      = ok(wasi.incoming-response) | error(string)
wasi.incoming-response = { status, headers, body: List<number>, text: string }
```

- `outgoing_request` は wasi:http/outgoing-handler の `handle` に相当する。ネットワークエラー (ブラウザでは CORS で読めないときも) は `error`
- `get_parts` は実行している definy から, パーツの最新の式を読む。quote したコード (`core.code`) の `part_ids` を渡すと
  `core.compile-to-wasm` の `parts` にそのまま渡せる形で返る ([quote.md](quote.md))。型パーツなどコンパイルできない式は除く
- `get_environment` は wasi:cli/environment の `get-environment` に相当する。トークンなどの秘密はここから読み, パーツに書かない
- 継続の関数の引数名は型の引数名 (`result` / `parts` / `environment`) と同じにする (違うと型チェックで
  `function parameter name does not match expected parameter name`)

## ホスト

`src/wasi_io.ts` の `runWasiIo(module, host)` がコンパイル済みの Wasm を動かし, 値のタグを見て 1 歩ずつ I/O をする。
継続は `instantiateCompiledValue` の `callClosure` (Wasm のテーブル経由) で呼ぶ。1000 歩で打ち切る。

- `fetchHandler(fetch)`: `fetch` で送る `handle`。GET / HEAD は本文を付けない
- `onStep`: I/O のたびに記録を渡す (環境変数は名前だけで値は渡さない)

### ブラウザ (パーツ詳細画面)

パーツ詳細画面の「式を評価」で結果が `wasi.io` の値なら, そのまま `runWasiIo` で動かし, I/O の記録と `done` のメッセージを出す。

- `get_parts` は評価と同じく, 作業中の変更があればそちらの式を返す
- 環境変数は設定画面の「I/O をするプログラムの実行 (wasi.io)」で `NAME=value` の行で書く。localStorage
  (`definy.wasi-io-settings`) にだけ保存し, サーバーには送らない (`src/wasi_io_browser.ts`)
- 「CORS エラーのときサーバーで仲介する」を有効にすると, ブラウザの `fetch` が失敗したときに
  `HttpProxyService/Fetch` で送り直す (下記)

### CORS の仲介 (`definy.v1.HttpProxyService/Fetch`)

Cloudflare の API などはブラウザからの CORS を許可していないので, サーバー (Worker) がリクエストを代わりに送る
(`proto/definy/v1/http_proxy.proto`, `worker/index.ts` の `proxyFetch`)。

- 誰でも使えるとオープンプロキシになるので, 署名付き `Authorization` ([rpc-authorization.md](rpc-authorization.md)) が要り,
  管理者 (`DEFINY_ADMIN_ACCOUNT_IDS`) か `DEFINY_HTTP_PROXY_ACCOUNT_IDS` に列挙したアカウントだけが使える (他は 403, 署名無しは 401)
- 送り先は http / https だけ。`host` / `content-length` / `connection` / `transfer-encoding` は付け直さない。リダイレクトは追わない
- 本文は JSON の中で標準 Base64 (`bodyBase64`)
- 仲介するリクエストの `Authorization` (Cloudflare の API トークンなど) はそのまま送り先に送る。サーバーは保存もログもしない

## テスト

- `src/wasi_io.test.ts`: `sample.deploy-hello-worker` をモックの Cloudflare API で動かし, I/O の順番, URL, ヘッダー,
  アップロードした Wasm がハンドラとして動くことを確かめる。環境変数が無いとき, アップロードに失敗したときも
- `worker/http_proxy.test.ts`: 仲介の認可, URL の制限, ブラウザの fetch が失敗したときの送り直し
