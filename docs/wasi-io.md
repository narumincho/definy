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

wasi.outgoing-request = {
  method, url, headers: List<{ name, value }>,
  secret_headers: List<{ name, prefix: string, secret: Secret }>,  -- 値は prefix ++ シークレットの値
  body: List<number>,
}
wasi.http-result      = ok(wasi.incoming-response) | error(string)
wasi.incoming-response = { status, headers, body: List<number>, text: string }
```

- `outgoing_request` は wasi:http/outgoing-handler の `handle` に相当する。ネットワークエラー (ブラウザでは CORS で読めないときも) は `error`
- `get_parts` は実行している definy から, パーツの最新の式を読む。quote したコード (`core.code`) の `part_ids` を渡すと
  `core.compile-to-wasm` の `parts` にそのまま渡せる形で返る ([quote.md](quote.md))。型パーツなどコンパイルできない式は除く
- API トークンなどのシークレットはプログラムに読ませない。`secret_headers` に `Secret` 型の値を書くと,
  ホストが送信の直前に値を入れる ([secret.md](secret.md))。以前は環境変数 (`get_environment`) で読んでいたが,
  プログラムが値そのものを持ててしまうのでやめた
- 継続の関数の引数名は型の引数名 (`result` / `parts`) と同じにする (違うと型チェックで
  `function parameter name does not match expected parameter name`)

## ホスト

`src/wasi_io.ts` の `runWasiIo(module, host)` がコンパイル済みの Wasm を動かし, 値のタグを見て 1 歩ずつ I/O をする。
継続は `instantiateCompiledValue` の `callClosure` (Wasm のテーブル経由) で呼ぶ。1000 歩で打ち切る。

- `fetchHandler(fetch)`: `fetch` で送る `handle`。GET / HEAD は本文を付けない
- `getSecret(id)`: シークレットの値と, 値を入れたときに許可した宛先。無い・宛先が許可されていなければ送らずに `error` にする
- `onSecretUse`: シークレットを使った (使おうとした) ときに呼ぶ (使用履歴)
- `onStep`: I/O のたびに記録を渡す (シークレットは名前だけで値は渡さない)

### ブラウザ (実行パネル)

実行パネル ([run-panel.md](run-panel.md)) で実行した結果が `wasi.io` の値なら, そのまま `runWasiIo` で動かし, I/O の記録と `done` のメッセージを出す
(`src/run_expression.ts`)。シークレットの使用履歴の「使った場所」は `run-panel` になる。

- `get_parts` は評価と同じく, 作業中の変更があればそちらの式を返す
- シークレットの値はシークレットのパーツのページで入れる ([secret.md](secret.md))
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
  アップロードした Wasm がハンドラとして動くことを確かめる。シークレットの値が無いとき, 許可していない宛先のとき,
  アップロードに失敗したときも
- `worker/http_proxy.test.ts`: 仲介の認可, URL の制限, ブラウザの fetch が失敗したときの送り直し
