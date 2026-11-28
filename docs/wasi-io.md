# wasi.io: I/O をするプログラムを値として書く

definy の式は純粋なので, HTTP リクエストのような I/O は「次にしてほしい I/O と, その結果を受け取る関数」の値
(`wasi.io`) として返し, ホスト (ブラウザ / Node.js) がその I/O をして関数を呼ぶ。`done` を返したら終わり。
`definy.deploy-to-cloudflare-workers` はこれで Cloudflare の API を呼ぶ ([cloudflare-workers.md](cloudflare-workers.md))。

能力 (Capability) をレコードで渡す設計 ([wasi-capability-io.md](wasi-capability-io.md)) とは別に, まずは
継続 (`then`) を持つ値として実装している。

## 型 (モジュール `wasi`)

`wasi.io` は, サーバーの処理 (`definy.service-io`, [service.md](service.md)) と同じ 1 つの I/O の型 `definy.io(A)` の
`A` を `String` にした別名 (2026-11-25. [structured-concurrency.md](structured-concurrency.md))。

```text
wasi.io = definy.io(A: String)

definy.io(A) =
  | done(A)                                        -- 終わり. wasi.io では画面に出すメッセージ
  | all  { Child: Type, tasks: List<definy.io(Child)>, then: fn(results: List<Child>) => definy.io(A) }
  | race { Child: Type, tasks: List<definy.io(Child)>, then: fn(result: Child) => definy.io(A) }
  | sleep { ms: Number, then: fn(slept_ms: Number) => definy.io(A) }
  | outgoing_request { request: wasi.outgoing-request, then: fn(result: wasi.http-result) => definy.io(A) }
  | get_parts { ids: List<string>, then: fn(parts: List<{ id, expression }>) => definy.io(A) }
  | ... (サーバーの I/O: sql, read_time, http_fetch など. service.md)

wasi.outgoing-request = {
  method, url, headers: List<{ name, value }>,
  secret_headers: List<{ name, prefix: string, secret: Secret }>,  -- 値は prefix ++ シークレットの値
  body: List<number>,
}
wasi.http-result      = ok(wasi.incoming-response) | error(string)
wasi.incoming-response = { status, headers, body: List<number>, text: string }
```

- `all` / `race` / `sleep` で並行に動かせる。子のタスクは親より長生きしない ([structured-concurrency.md](structured-concurrency.md))。
  例は `sample.io-all-race`
- ホスト (ブラウザ, 手元のサーバー) ができるのは `outgoing_request` と `get_parts` (と `all` / `race` / `sleep`) だけで,
  サーバーの I/O (`sql` など) を頼むとプログラムはエラーで終わる (`IoUnsupported`)
- `outgoing_request` は wasi:http/outgoing-handler の `handle` に相当する。ネットワークエラー (ブラウザでは CORS で読めないときも) は `error`
- `get_parts` は実行している definy から, パーツの最新の式を読む。quote したコード (`core.code`) の `part_ids` を渡すと
  `core.compile-to-wasm` の `parts` にそのまま渡せる形で返る ([quote.md](quote.md))。型パーツなどコンパイルできない式は除く
- API トークンなどのシークレットはプログラムに読ませない。`secret_headers` に `Secret` 型の値を書くと,
  ホストが送信の直前に値を入れる ([secret.md](secret.md))。以前は環境変数 (`get_environment`) で読んでいたが,
  プログラムが値そのものを持ててしまうのでやめた
- 継続の関数の引数名は型の引数名 (`result` / `parts`) と同じにする (違うと型チェックで
  `function parameter name does not match expected parameter name`)

## ホスト

`src/wasi_io.ts` の `runWasiIo(module, host)` がコンパイル済みの Wasm を動かす。木を動かすのは `src/io_runner.ts` の `runIo`
(`done` / `all` / `race` / `sleep`) で, `runWasiIo` はそれ以外のタグ (`outgoing_request`, `get_parts`) を 1 つずつ行う。
継続は `instantiateCompiledValue` の `callClosure` (Wasm のテーブル経由) で呼ぶ。全てのタスクで合わせて 1000 歩で打ち切る。

- `fetchHandler(fetch)`: `fetch` で送る `handle`。GET / HEAD は本文を付けず, `race` で負けるなど結果が要らなくなったら止める
  (`AbortSignal`)。それ以外のメソッドは止めずに最後まで送る
- `getSecret(id)`: シークレットの値と, 値を入れたときに許可した宛先。無い・宛先が許可されていなければ送らずに `error` にする
- `onSecretUse`: シークレットを使った (使おうとした) ときに呼ぶ (使用履歴)
- `onStep`: I/O のたびに記録を渡す (シークレットは名前だけで値は渡さない)

### ブラウザ (実行パネル)

実行パネル ([run-panel.md](run-panel.md)) で実行した結果が `wasi.io` の値なら, そのまま `runWasiIo` で動かし, I/O の記録と `done` のメッセージを出す
(`src/run_expression.ts`)。シークレットの使用履歴の「使った場所」は `run-panel` になる。

- `get_parts` は評価と同じく, 作業中の変更があればそちらの式を返す
- シークレットの値はシークレットのパーツのページで入れる ([secret.md](secret.md))
- ブラウザで動かすか, 全体をサーバーで動かすか (`RunService/RunIo`. Node.js のサーバーの管理者だけ) を選ぶ
  ([run-location.md](run-location.md))。ブラウザでは CORS を許可しない相手には届かない

### CORS の仲介は消した (2026-11-28)

以前は, ブラウザの `fetch` が CORS で失敗した HTTP リクエストだけを Worker が代わりに送る `definy.v1.HttpProxyService/Fetch` (管理者だけ) があった。
これをやめ, プログラム全体をブラウザかサーバーのどちらかで動かすようにした ([run-location.md](run-location.md))。
管理者かどうかは専用の `RunService/GetRunOptions` で聞く (以前は空の URL を仲介に送って 400 かどうかで見分けていた)。

## テスト

- `src/wasi_io.test.ts`: `sample.deploy-hello-worker` をモックの Cloudflare API で動かし, I/O の順番, URL, ヘッダー,
  アップロードした Wasm がハンドラとして動くことを確かめる。シークレットの値が無いとき, 許可していない宛先のとき,
  アップロードに失敗したときも
- `worker/run_service.test.ts`: サーバーで動かす `RunService` (認可, Node.js のサーバーと Cloudflare の違い)
