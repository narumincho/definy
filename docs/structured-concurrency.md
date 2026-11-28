# 構造化並行性: 宙に浮いたタスクを作れない

MoonBit の async のように, 誰にも待たれずに走り続ける「宙に浮いた」タスク (orphan task) を
definy では **構造上** 作れない (ユーザーの要望, 2026-11-24)。2026-11-25 に実装した。

ユーザーが決めたこと (2026-11-25):

1. 並行性の形は, 合流する I/O の `all` / `race` にする (タスクグループのハンドルは作らない)
2. I/O の型に結果の型を持たせる (`definy.io(A)`)
3. `wasi.io` とサーバーの `definy.service-io` を 1 つの I/O の型にまとめる
4. ホストの TypeScript に残っていた投げっぱなしも同じ規則で直す

## MoonBit がしていること

MoonBit の async (`moonbitlang/async`, 実験的) は構造化並行性を採っている。

- タスクはタスクグループの中でしか作れず, タスクグループは `@async.with_task_group(group => ...)` でしか作れない
- `with_task_group` は中の全てのタスクが終わるまで返らない。タスクは木構造になり, 親より長生きできない
- 子のどれかが失敗すると他の子をキャンセルし, 後始末を待ってからグループが失敗する (エラーが黙って消えない)
- `spawn_bg(no_wait=true, ...)` はグループの本体が終わったら待たずにキャンセルされる (タイムアウトの実装に使う)。
  `allow_failure=true` は失敗してもグループを止めない。`group.return_immediately(v)` は他をキャンセルしてすぐ返る
- キャンセルは止まっていた所で起き, `defer` の後始末は動く。`nocancel` の関数は途中でキャンセルされない

ただし MoonBit で保証しているのは `with_task_group` の実行時の振る舞いで, `TaskGroup` の参照が外に漏れるのを
型で止めているわけではないようだ (公式のドキュメントと 2025-09-28 のブログからは確認できなかった)。

- https://docs.moonbitlang.com/en/latest/language/async-experimental.html
- https://www.moonbitlang.com/blog/moonbit-async

## definy.io

definy の式は純粋で, I/O は「次にしてほしい I/O と, 結果を受け取る継続 (`then`)」の値として返し, ホストが動かす。
I/O の型は 1 つで, 型 `A` の値で終わるプログラムを表す。

```text
definy.io(A) =
  | done(A)
  | all  { Child: Type, tasks: List<definy.io(Child)>, then: fn(results: List<Child>) => definy.io(A) }
  | race { Child: Type, tasks: List<definy.io(Child)>, then: fn(result: Child) => definy.io(A) }
  | sleep { ms: Number, then: fn(slept_ms: Number) => definy.io(A) }
  | wait_signal { key: String, then: fn(payload: String) => definy.io(A) }
  | send_signal { key: String, payload: String, then: fn(woken: Number) => definy.io(A) }
  | outgoing_request { ... } | get_parts { ... }                     -- wasi.io にあったもの (wasi-io.md)
  | sql { ... } | read_time { ... } | http_fetch { ... } | ...       -- サーバーの I/O (service.md)

wasi.io           = definy.io(A: String)                     -- 実行パネル, definy_run_io
definy.service-io = definy.io(A: definy.service-outcome)     -- サーバーの処理. respond(...) | serve_asset
```

- `all`: 子を並行に動かし, 全部終わったら結果を (渡した順に) `then` に渡す。MoonBit の `with_task_group` + `spawn_bg`
- `race`: 最初に終わった子の結果を `then` に渡し, 他の子はキャンセルする。タイムアウトは `sleep` と組み合わせて書く。
  MoonBit の `no_wait` / `return_immediately` の代わり
- `Child` は子の結果の型 (存在型)。レコードに型を持たせる仕組み ([part-type.md](part-type.md)「型を持つレコード」) で,
  `#all({Child: Number, tasks: [...], then: fn(results) => ...})` と書くと `tasks` は `List<definy.io(Number)>`,
  `results` は `List<Number>` として検査される
- `definy.io-bind(A, B, io, f)` で, あるプログラムの結果を受けて次のプログラムを続けられる (全てのタグの `then` を包み直す)
- 例: `sample.io-all-race` (2 つの HTTP を同時に送って待ち, 遅いリクエストに 20 ミリ秒の制限を付ける)

- `wait_signal` / `send_signal`: 同じ `key` の合図を待つ / 送る。`send_signal` はそのキーを待っている全てのタスクを起こし,
  `payload` を渡して, 起こした数を返す。待っている人がいなければ何も起きない (合図は溜めない)

### タイムアウトと外からのキャンセル (ユーザーが表したいもの, 2026-11-25)

5 秒でタイムアウトする処理は `race` と `sleep` で書く。`sleep` が先に終わると本体はキャンセルされる。

```text
#race({
  Child: @definy.service-outcome,
  tasks: [
    本体の処理,
    #sleep({ms: 5000, then: fn(slept_ms) => #done(#respond(504 のレスポンス))})
  ],
  then: fn(result) => #done(result)
})
```

`POST /cancel` が来たら処理を止めるのは, 本体を `wait_signal` と `race` し, `/cancel` の処理が `send_signal` する。
動いているタスクを掴む値は作らず, キー (ジョブの ID など) で合図するだけ。例は `sample.io-cancel-by-signal` (1 つのプログラムの中で送る)。

```text
本体のリクエスト:  #race({Child: ..., tasks: [本体, #wait_signal({key: "cancel:<ジョブID>", then: fn(payload) => #done(中止のレスポンス)})], ...})
POST /cancel:      #send_signal({key: "cancel:<ジョブID>", payload: "", then: fn(woken) => #done(#respond(...))})
```

- 合図が届く範囲はホストの `IoSignals` (`src/io_runner.ts`) を共有するプログラムの間。サーバーは `WorkerStore.signals` で,
  手元のサーバー (1 つのプロセス) ではリクエスト同士で届く。Cloudflare Workers では同じ isolate のリクエストにしか届かない
  (別の isolate に届けるには Durable Objects などが要る。まだ無い)。実行パネル・`definy_run_io` (`runWasiIo`) はそのプログラムの中だけ
- 待っているタスクがキャンセルされたら待ちの一覧から外す (残さない)

### 宙に浮いたタスクを作れない理由

動いているタスクを指す値 (ハンドル, Promise, `TaskGroup`) が definy には無い。タスクは「ホストに渡す I/O の値」でしかなく,
並行に動かす方法は `all` と `race` だけで, どちらも子の結果を受け取るまで親の `then` を呼ばない。
そのため子は親より長生きできない。ハンドルが無いので, MoonBit の `TaskGroup` のように外へ持ち出すことを型で禁じる必要も無い。

ハンドルを渡す形 (`with_task_group(fn(group) => ... spawn(group, task) ...)`) は採らなかった。`group` は値なので
結果やクロージャに入れて外へ持ち出せてしまい, 止めるには Haskell の `runST` のような rank-2 型が要る。
持ち出したら実行時に無効にする方法は, 実行時エラーを作らない方針に反する。

## キャンセル

- キャンセルが起きるのは `race` で負けた子と, 失敗したタスクの兄弟 (と, プログラム全体を止めたとき) だけ。
  definy のコードから「このタスクを止める」と言う方法 (キャンセルトークンやハンドル) は無く, 外から止めたいときは
  `wait_signal` と `race` して合図を送る (上)
- 止める単位は I/O の 1 歩。子は「次の I/O と継続」の値なので, ホストは止めた子の継続を捨てるだけでよく,
  definy の側に途中まで進んで壊れた状態は残らない。MoonBit の `defer` のような後始末の仕組みは要らない
- 実行中の I/O: 読むだけのもの (HTTP の GET / HEAD) は `AbortSignal` で止める。書き込み (SQL, POST など) は MoonBit の
  `nocancel` と同じく途中では止めず, 終わってから結果を捨てる (半端な書き込みを残さない)
- `race` と `all` は, 止めた子が本当に止まるまで待ってから `then` を呼ぶ (失敗を返す)。ホストの Promise も残さない
- 実行時エラーの無い言語なので, MoonBit の「子の失敗で兄弟をキャンセル」はホストの失敗 (例外) にだけ効く。
  値としての失敗 (`#error(...)` を返す子) では止まらない。必要になったら最初の `error` で止める `all_ok` を足す

## ホスト

`src/io_runner.ts` の `runIo(instance, start, { leaf, maxSteps, signal })` が木を動かす (`done` / `all` / `race` / `sleep`)。
他のタグは呼び出し元の `leaf` が 1 つずつ行い, できないタグは `IoUnsupported` を投げる。歩数の上限は全てのタスクの合計。

| ホスト                                             | `leaf` ができる I/O                                     |
| :------------------------------------------------- | :------------------------------------------------------ |
| `src/wasi_io.ts` の `runWasiIo` (実行パネル, 手元) | `outgoing_request`, `get_parts`                         |
| `worker/service_io.ts` の `serviceIoLeaf` (Worker) | サーバーの I/O 全て ([service.md](service.md))          |
| `definy.cloudflare-service-runtime-script` (写し)  | 同じ木の動かし方を JS で持つ ([html-ui.md](html-ui.md)) |

## ホストの TypeScript の投げっぱなし (2026-11-25 に直した)

- パフォーマンス記録の書き込み (`worker/perf_store.ts` の `createPerfSink`): `waitUntil` を必須にした。Workers では
  `ctx.waitUntil`, `ctx` の無い環境 (手元のサーバー, テスト) では `handleWorkerRequest` がレスポンスを返す前に待つ。
  以前は `ctx` が無いと投げっぱなしで, Workers でも `waitUntil` が抜けていたときは本番で記録が残らなかった
- 手元のサーバーの HTTP (`cli/serve.ts` の `listen`): Node.js はハンドラの Promise を待たないので, 処理中のリクエストを持っておき,
  `close` では全て終わるまで待ってから接続を閉じる (以前は処理中でも接続を切っていた)

## まだ無いもの

- `all_ok` (値の `#error` で兄弟を止める)
- `definy.worker-step` (`definy.deploy-fetch-worker` でデプロイする Worker の型) は別の型のまま
- `outgoing_request` (ブラウザ, シークレット付き) と `http_fetch` (サーバー) は同じ HTTP を 2 つのタグで持っている
