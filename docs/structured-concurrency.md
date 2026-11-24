# 構造化並行性: 宙に浮いたタスクを作れないようにする (設計案)

状態: **設計案 (2026-11-24)**。言語仕様に関わるので, ユーザーが方針を選んでから実装する。

MoonBit の async のように, 誰にも待たれずに走り続ける「宙に浮いた」タスク (orphan task) を
definy では **構造上** 作れないようにしたい (ユーザーの要望, 2026-11-24)。

## MoonBit がしていること

MoonBit の async (`moonbitlang/async`, 実験的) は構造化並行性を採っている。

- タスクはタスクグループの中でしか作れず, タスクグループは `@async.with_task_group(group => ...)` でしか作れない
- `with_task_group` は中の全てのタスクが終わるまで返らない。タスクは木構造になり, 親より長生きできない
- 子のどれかが失敗すると他の子をキャンセルし, 後始末を待ってからグループが失敗する (エラーが黙って消えない)
- `spawn_bg(no_wait=true, ...)` はグループの本体が終わったら待たずにキャンセルされる (タイムアウトの実装に使う)。
  `allow_failure=true` は失敗してもグループを止めない。`group.return_immediately(v)` は他をキャンセルしてすぐ返る
- async 関数は async 関数からしか呼べない。入口は `async fn main`

ただし MoonBit で保証しているのは `with_task_group` の実行時の振る舞いで, `TaskGroup` の参照が外に漏れるのを
型で止めているわけではないようだ (公式のドキュメントと 2025-09-28 のブログからは確認できなかった)。

- https://docs.moonbitlang.com/en/latest/language/async-experimental.html
- https://www.moonbitlang.com/blog/moonbit-async

## 今の definy

definy の式は純粋で, I/O は「次にしてほしい I/O と, 結果を受け取る継続 (`then`)」の値として返し, ホストが
1 歩ずつ動かす ([wasi-io.md](wasi-io.md) の `wasi.io`, [service.md](service.md) の `definy.service-io`)。

- 1 つの I/O の値が表す「次の I/O」は常に 1 つだけで, 並行に動くものが無い。だから **今は宙に浮いたタスクは作れない**
  (代わりに並行性そのものが無い。HTTP を 2 つ同時に送ることも, タイムアウトを付けることもできない)
- 並行に動いているのは TypeScript のホストの中だけ。そこでは実際に宙に浮いたタスクのバグが起きた:
  パフォーマンス記録の書き込みを投げっぱなしにしていて, Workers がレスポンス後に打ち切ったので本番で記録が残らなかった
  (`worker/perf_store.ts`。今は `waitUntil` に登録して直した)
- `definy serve` の HTTP サーバー (`cli/serve.ts` の `listen`) もリクエストごとの処理を `void (async () => ...)()` で投げている

これから並行性 (複数の HTTP を同時に送る, タイムアウト, Cron の mirror を並べる, レスポンスの後の書き込み) を
definy に足すときに, 宙に浮いたタスクを作れる形で足さないことが要点になる。

## 案: 「タスク」を値のまま, 合流する形の I/O だけ足す (おすすめ)

definy ではタスクは「ホストに渡す I/O の値」でしかなく, 動いているタスクを指す値 (ハンドル, Promise, `TaskGroup`)
は存在しない。この性質を保ったまま, **子の I/O を値として受け取り, 全部 (または決まった 1 つ) の結果を
`then` に渡すまで先に進まない** 形の I/O だけを足す。`spawn` のように合流しないものは足さない。

```text
io(a) =                                    -- 結果の型を持つ I/O (今の wasi.io / definy.service-io を一般化)
  | done(a)
  | <今までの I/O>(..., then: fn(result) => io(a))
  | all  { tasks: List<io(b)>, then: fn(results: List<b>) => io(a) }
  | race { tasks: List<io(b)>, then: fn(result: b) => io(a) }
```

- `all`: 子を並行に動かし, 全部終わったら結果を (渡した順に) `then` に渡す。MoonBit の `with_task_group` + `spawn_bg`
- `race`: 最初に終わった子の結果を `then` に渡し, 他の子はキャンセルする。タイムアウトは
  `race { tasks: [ 本体, sleep(1000) |> map(timeout) ] }` で書ける。MoonBit の `no_wait` / `return_immediately` の代わり
- 子が親より長生きできないのは, 親の `then` が子の結果を受け取るまで呼ばれないから (構造上)。
  ハンドルの値が無いので, `TaskGroup` を外に漏らすことも型で禁じる必要が無い
- キャンセルは安全: 子は値なので, ホストは止めた子の継続を捨て, 送信中の HTTP を `AbortController` で止めるだけ。
  definy の側に「途中で止められて壊れた状態」は残らない
- 実行時エラーが無い言語なので (Elm と同じ方針), MoonBit の「子の失敗で兄弟をキャンセル」は値の失敗 (`result`) で表す。
  必要なら `all_ok { tasks: List<io(result(b, e))>, then: fn(results: result(List<b>, e)) => ... }`
  (最初の `error` で他をキャンセル) を足す
- レスポンスの後の書き込み (Workers の `waitUntil`) は `respond { response, after: io(unit) }` のように, リクエストの
  I/O の子として書く。ホストは `after` が終わるまでリクエストを終わらせない (投げっぱなしにしない)

ホスト (`runWasiIo`, `handleRequestInDefiny`) は 1 歩ずつ動かす今のループを, 木を動かすループにする。
歩数の上限 (今は 1000) は木全体で数える。

## 別案: タスクグループのハンドルを値として渡す

```text
with_task_group(fn(group) => ... spawn(group, task) ... )
```

MoonBit と同じ見た目だが, `group` は値なので結果やクロージャに入れて外へ持ち出せてしまう。
持ち出しを止めるには Haskell の `runST` のような rank-2 型 (グループごとの見えない型引数) が要り, 今の型チェッカー
([type-arguments.md](type-arguments.md)) には無い。持ち出されたら実行時に無効にする方法もあるが,
それは実行時エラーを作らない方針に反する。値で表す上の案のほうが definy に合う。

## 決めること

1. 並行性の形: 合流する I/O (`all` / `race`) だけにするか (おすすめ), ハンドルを渡すタスクグループにするか
2. `io` に結果の型を持たせるか (`io(a)`)。子の結果を親に返すには要る。今の `wasi.io` は `done(string)` だけ
3. `wasi.io` (実行パネル, デプロイ) と `definy.service-io` (サーバー) を 1 つの `io(a)` にまとめるか, それぞれに足すか
4. ホストの TypeScript に残っている投げっぱなし (`cli/serve.ts` など) も同じ規則で直すか
