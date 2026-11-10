# HTML だけのシンプル版 UI (別の Cloudflare Worker `definy-html`)

HTML を返すだけの UI。React の UI (`pages/`, `src/`) とは別に並べて置く (2026-11-07 に決めた。
[mcp-self-hosting.md](mcp-self-hosting.md) の 5 段目)。

- React の UI は今のまま GitHub でバージョン管理する
- シンプル版の正本は definy のストアの **`html-ui` プロジェクト** で, バージョン管理も definy のブランチとコミットだけでする。
  `seeds/store/` にも GitHub にも置かない。MCP のツール (`definy_create_project`, `definy_commit_parts`) で書いてコミットし,
  `definy_push` で公開サーバーに送る
- GitHub で管理するのは, どの Worker でも使う土台 (`definy.deploy-fetch-worker`, `definy.worker-step` など) だけ

## 経緯: `/html/` をやめて別の Worker にした (2026-11-07)

最初は definy サーバーの `/html/` で, リクエストのたびにストアの `html-ui` を `core.eval-value` (definy 製の評価器) で評価していた。
Cloudflare Workers は実行時に Wasm をコンパイルできない (`WebAssembly.compile` などが禁止) ので, 公開サーバーでは
コンパイルせずに評価器で動かすしかなく, 遅い (定義が大きいページで数秒)。そこで `/html/` は消し,
`html-ui` を **デプロイのときに Wasm にコンパイルした別の Worker** (`definy-html`) にした。
その Worker は公開サーバーの API (`/mcp` と `/definy.v1.*`) を HTTP で呼んでページを作る。

## 仕組み

- `html-ui.handle(editable: Boolean, request: @definy.http-request) -> @definy.service-io` が入口 (2026-11-08 から)。
  definy サーバーの処理 (`definy.handle-request`) と同じ形で, ストアはホストの能力 (`sql` など) で直接読む
  - `editable`: 編集とコミットの画面 (`/edit/...`, `/api/commit`) を出すか。手元の definy サーバーが配るときだけ true
  - `html-ui.rpc(config, method, request, then)`: `method` が `definy_` で始まれば `definy.mcp-tools` のツールの関数を,
    そうでなければ `definy.handle-rpc` を同じサーバーの中でそのまま呼ぶ (`definy.service-io-then-respond` で応答を受け取る)。
    HTTP で他のサーバーを呼ばない
- 手元の definy サーバー (`npm run serve`) は別のポート (既定 8788) で `editable: true` にして配る ([local-server.md](local-server.md))
- 公開の definy-html は専用の D1 を持つ公開サーバーの写し (下の「definy-html (公開サーバーの写し)」)
- パス: `/` (プロジェクト一覧), `/p/<project>/<branch>` (パーツ一覧), `/p/<project>/<branch>/<part>` (パーツ)

### `definy.worker-step` (モジュール `definy`)

```text
definy.worker-request        = { method: String, url: String, headers: List<{ name, value }> }
definy.worker-response       = { status: Number, headers: List<{ name, value }>, body: String }
definy.worker-fetch-request  = { method: String, url: String, headers: List<{ name, value }>, body: String }
definy.worker-fetch-response = { status: Number, text: String }
definy.worker-step =
  | respond(@definy.worker-response)
  | fetch { request: @definy.worker-fetch-request, then: Fn(response: @definy.worker-fetch-response) -> @definy.worker-step }
```

`worker.js` (`definy.cloudflare-workers-runtime-script` の `runWorkerSteps`) が `fetch` の段を `fetch()` で送り,
応答で `then` を呼ぶ (100 段まで)。ネットワークのエラーは `status: 0` と, エラーのテキスト。
`wasi.io` ([wasi-io.md](wasi-io.md)) と同じ継続の形で, I/O は JavaScript の土台がする。

## 書き方 (MCP だけで)

手元のサーバー (`npm run serve`. [local-server.md](local-server.md)) の MCP から:

1. `definy_create_project` `{"project": "html-ui", "description": "..."}`。`main` の作成者は手元の鍵のアカウント
   (`~/.definy/account.json`) になり, そのアカウントだけが `main` にコミットできる ([branch.md](branch.md))
2. `definy_commit_parts` でパーツを書く。コミットは公開サーバーと同じ型検査を通る
3. `definy_push` で公開サーバーに送る
4. React の UI で `html-ui.deploy` のページを開いて評価する (`definy.cloudflare-api-token` に値を入れ, 設定で CORS の仲介を有効にしておく)

注意:

- 式のテキストの型引数は型の書き方 (`T: @definy.json`, `U: String`)。`dtx.mjs` の `json(...)` は読めない
- ラムダの引数名は型の引数名 (`response` など) と同じにする
- 評価器で JSON 全体を `definy.parse-json` で読むと大きな応答 (数百 KB) でとても遅い。コンパイルした Worker でも
  文字列の検索 (`core.string-index-of`, `core.string-split`) で必要なところだけ取り出すほうが速い
- 消えてしまう環境 (クラウドのコンテナなど) の鍵で `html-ui` を作って push すると, その鍵が無くなったあと誰も `main` にコミットできない。
  `main` はユーザー自身の鍵で作る

## definy-html (公開サーバーの写し, 2026-11-08)

サーバー同士で MCP を呼ぶのをやめ, definy-html は専用の D1 を持つ **公開サーバーの写し** にする (ユーザーの決定)。
サーバー同士は署名したイベントだけでつながり, MCP は AI 向けの入口にとどめる。公開サーバーの新しいイベントは Cron で定期的に pull する (ユーザーの決定)。

- `definy.deploy-service-worker(worker_name, database_name, cron, api_token, handler)` でデプロイする。
  `handler` は `quote({fetch: fn(request) => ..., scheduled: fn(time_ms) => ...})` (どちらも `definy.service-io` を返す)。
  D1 のデータベース `database_name` が無ければ作り (`GET/POST /accounts/<id>/d1/database`), binding `DB` を付けてアップロードし,
  Cron (`PUT /workers/scripts/<name>/schedules`) を設定する。トークンには Workers Scripts の編集と **D1 の編集** の権限が要る
- Worker の JS は `definy.cloudflare-service-runtime-script`。`evaluate()` が返す `{fetch, scheduled}` を, `worker/service_io.ts` と同じ
  `definy.service-io` の要求 (D1 の SQL, WebCrypto の Ed25519 と SHA-256, fetch, isolate の中のキャッシュ) で動かす。
  手元の鍵・管理者・式の実行は無し (`read_mcp_account` は `none`)
- 取り込みは `definy.mirror-pull(remote, limit, content_limit)`: 表が無ければ作り (`definy.ensure-seeded`。写しは seed バンドルを持たず表だけ作る),
  相手の全てのイベント (seed のイベントも) のうち無いものを古い順に `definy.mirror-events-loop` / `definy.mirror-sync-event` で入れる。
  `definy.mirror-submit` は署名と中身だけ確かめ, イベントの規則と型は確かめない (相手が受け付けたときに確かめている。
  型の検査は CPU が重く, Workers の 1 回の上限を超えうる)。中身は相手の `GetContent` から読んで `UploadContent` と同じく入れる
- **1 回の Cron では少しずつ入れる**: 最大 `limit` 個のイベントを入れるか, 中身が足りないイベントがあったら止める。
  足りない中身は 1 回に最大 `content_limit` 個だけ取ってきて入れ (`#partial`), 続きは次の回に入れる。
  失敗したイベント (下の署名の誤ったもの) は飛ばして数えない。definy-html は `limit: 5, content_limit: 50` で 1 分ごと (`* * * * *`)
- seed には署名の検証を確かめるための署名の誤ったイベントが 3 つある (`src/invalid_signature_samples.ts`)。写しには入らず,
  `definy.mirror-pull` は毎回その 3 つを失敗として報告する (応答の status は 400 になるが, Cron では表示するだけ)
- 最初の Cron が動くまでは表が無いので, ページは読めない。中身の多い seed のイベント (1000 個以上) があるので,
  空の写しが追いつくまで 20 分ほどかかる
- html-ui の入口は `quote({fetch: fn(request) => @html-ui.handle(editable: false, request: request), scheduled: fn(time_ms) => @definy.mirror-pull(remote: "https://definy.narumincho.com", limit: 5, content_limit: 50)})`

### Workers の無料プランの CPU 時間 (2026-11-08)

最初のデプロイでは Cron が毎回例外で止まり, D1 は空のままだった。調べ方と分かったこと:

- Cloudflare のアカウントは無料プラン (`limits.cpu_ms` を付けてアップロードすると「CPU limits are not supported for the Free plan」)。
  公称は 1 回 10 ミリ秒だが, 実際には **約 2 秒で止められる** (fetch も Cron も `exceededCpu` / `exceededResources` は 2.02〜2.05 秒)
- 例外の中身は Workers Logs で読める: `PATCH /workers/scripts/<name>/script-settings` に
  `{"observability": {"enabled": true, "head_sampling_rate": 1}}` (アップロードし直すと消える) を送り,
  `POST /accounts/<id>/workers/observability/telemetry/query` で `$metadata.service` を絞って読む。
  回数と CPU 時間は GraphQL の `workersInvocationsAdaptive` (`status`, `max { cpuTime }`, マイクロ秒) で読める
- **原因 1: JSON の文字列を読むのが 2 乗の時間だった**。`definy.text-string-from` が 1 バイト進むごとに
  文字列の始まりからそこまでを `core.string-slice` で切り出していた (`let` は先に評価されるので, 使わない枝でも切り出す)。
  数百 KB の `signedEventBytes` で CPU の 4 割を占めていた。切り出しを使う枝の中に移して, 全体の取り込みが 12 秒から 5 秒になった。
  プロファイルは `node --cpu-prof` で取り, `wasm-function[N]` の N はランタイム関数 (`core.wasm-runtime-functions` の順に 1〜31。
  10 が `string-slice`) かそれ以降の関数の番号 ([wasm-gc.md](wasm-gc.md))
- 残りの 5 秒のほとんどは seed のイベント 1 つ (中身 1000 個以上の `UploadContent`) なので, 上の「少しずつ入れる」にした。
  1 回の CPU 時間は, 手元の Node.js で中身 100 個が約 1 秒, 入れるものが無いときは約 0.2 秒
- **原因 2: `wasi.io` の `get_parts` (`src/wasi_io.ts`) が型パーツを渡していなかった**。型引数
  (`@std.list-range(T: @definy.sql-statement, ...)`) で型パーツを参照する式は, そのパーツが無いと `unreachable` になる
  (`definy.ensure-seeded` の `definy.sql-run-chunks`)。`collectReferencedParts` と同じく型パーツも渡すようにした。
  `definy_compile_expression` (MCP) でコンパイルしたものは動くのに, `definy.deploy-service-worker` でコンパイルしたものだけ落ちていた
- テスト: `cli/mirror.test.ts` が手元の definy サーバーを公開サーバーの代わりにし, 土台の JS を Node.js で読み込んで
  (D1 の代わりに `worker/sqlite_d1.ts`) Cron と fetch を確かめる

### 大きなページを無料プランに収める (2026-11-08)

`/p/definy/main` (約 1000 パーツ) が CPU の上限で 503 (error 1102) になったので, 次のようにした。本番 (Cloudflare) は手元の Node.js の約 3 倍遅い。

- **ブラウザからのリクエストはたいてい新しい isolate で動く** ので, isolate のメモリに読んだ結果を覚えるキャッシュ
  (`read_cached_commits` など) がほとんど効かず, 毎回イベントの CBOR を読み, パーツ ID の SHA-256 を計算し直していた。
  土台の JS (`definy.cloudflare-service-runtime-script`) は, メモリに加えて D1 の表 `host_cache (kind, key, value)` にも
  読んだ結果の JSON を置く (`kind` は `commits` / `definitions` / `resolutions`, `key` はイベントハッシュか中身のハッシュ)。
  読んだ形は definy のコードで変わるので, `definy.deploy-service-script` がデプロイのたびに D1 の API で表を消す
- html-ui は `definy_get_project` の代わりに `html-ui.project-text` を使う。モジュールの一覧は定義を読まず,
  モジュールのページはそのモジュールのパーツを 100 個ずつ (`?start=`) だけ読む。検索 (`?q=`) だけは全てのパーツを読む
- `html-ui.deploy` の Cron は取り込みのあとにコミットを読み (`definy.read-commits`), `host_cache` に入れておく
- 手元で別のプロセスから同じ SQLite を読むと (D1 のキャッシュが効く), `/p/definy/main` の CPU は 0.67 → 0.1 秒,
  `/p/definy/main/core` は 1.3 → 0.4 秒。本番ではモジュールのページが 0.5〜1.7 秒で表示できる
- 残り: 検索 (`/p/definy/main?q=...`) は全ての定義を読むので, 上限を超えることがある

## 編集とコミット (2026-11-08)

パーツの型・式を書き換えてコミットできるのは, **手元の definy サーバーが配る html-ui だけ** (ユーザーの決定)。
署名はそのサーバーが手元の鍵 (`account.json`) でする。公開の definy-html は鍵を持たず, 読むだけにする。
公開サーバーとは署名したイベントを `definy_push` / `definy_pull` で渡す。

- パーツのページの「編集する」, モジュールのページの「パーツを足す」から `/edit/<プロジェクト>/<ブランチ>/<モジュール.パーツ>`
  (または `?part=`) を開き, 型・式・英語の説明・コミットメッセージを書く
- 小さな JS (`html-ui.commit-script`) が `POST /api/commit` に `definy_commit_parts` の引数の JSON を送る。
  `html-ui.handle-api` は本文を `read_request_text` で読み, `definy_commit_parts` のツールの関数に渡す。型の誤りやブランチの作成者でないときは, その理由を表示する

最初はブラウザで署名する形 (鍵を localStorage に置き, 公開サーバーが作った署名前のイベントに署名する) を作ったが,
署名するバイト列をサーバーが決めるので, サーバーが偽れば別の中身に署名させられる。手元のサーバーだけで署名する形にした。

### 編集の操作を足した (2026-11-10)

React の UI を消せるように, 手元のサーバーの html-ui (`editable: true`) に次の操作を足した。どれも MCP のツールを呼ぶだけ。

| 画面                           | 操作                                                                           | ツール                                                              |
| :----------------------------- | :----------------------------------------------------------------------------- | :------------------------------------------------------------------ |
| `/` (プロジェクト一覧)         | プロジェクトを作る, 公開サーバーから取り込む (pull) / 送る (push)              | `definy_create_project`, `definy_pull`, `definy_push`               |
| `/p/<プロジェクト>/<ブランチ>` | このブランチからブランチを作る, 式を実行, テストを実行 (`prefix` で絞る)       | `definy_create_branch`, `definy_run_expression`, `definy_run_tests` |
| パーツのページ                 | パーツを消す (確かめてから)                                                    | `definy_commit_parts` (`delete: true`)                              |
| `/edit/...`                    | 名前の欄を変えると名前の変更 (新しい名前で足し, 古い名前を消す 1 つのコミット) | `definy_commit_parts`                                               |

- `POST /api/<ツール名>` (`html-ui.handle-api`) は `html-ui.api-tool` が許すツールだけを, 本文の JSON を引数にして呼ぶ。`/api/commit` は `definy_commit_parts`
- フォームは `html-ui.tool-form(tool, then, confirm, fields, button)` で作る。小さな JS (`html-ui.tool-script`) が名前の付いた入力を引数にして送り,
  成功したら `then` のページ (`{名前}` を引数の値に置き換える) を開くか, 結果を表示する。`data-json` の付いた入力は JSON として読む
- 名前を変えても, 古い名前を参照する他のパーツは書き換えない (型検査の誤りとして表示される)。説明も引き継がないので書き直す
- 残り: ブランチを main に取り込む (MCP のツールがまだ無い), コミットの履歴と差分

### 新しいストアに html-ui を pull できなかった (2026-11-10)

公開サーバーの html-ui の `main` の古いコミットは, 今の seed の型検査を通らない (`definy.handle-request` などの型が変わった)。
`definy_pull` はイベントを古い順に `SubmitEvent` と同じ検査で入れていたので, 最初のコミットで落ち, その後のコミットも「親が最新でない」で全て断られた。
`definy_pull` (`definy.mcp-pull`) を写しと同じ `definy.mirror-submit` (署名と中身だけ確かめる) で入れる形にした
([local-server.md](local-server.md)「公開サーバーとの同期」)。新しいストアから pull して `/p/html-ui/main` が開けることを確かめた。

### 公開サーバーへの push が 1102 になった (2026-11-10)

#913 (適合テストのパーツ 130 個) のあと, 公開サーバーへの `SubmitEvent` が CPU の上限 (約 2 秒) を超えて 1102 になった。
手元の Node.js で同じ提出を測ると約 0.72 秒 (本番は約 3 倍遅い)。内訳はホストの `writeLiteral` (`src/stage1_compiler.ts`,
JavaScript の値を Wasm GC の値にする) が, 全ての main のパーツの解決結果 (1261 個, JSON で 5.5MB) で 258 ミリ秒, コミット 27 個で 68 ミリ秒だった。

- 全ての節点を `writtenCache` (WeakMap) に入れていたのをやめ, 根から深さ 2 まで (型の宣言の一覧やキャッシュのエントリなど, 同じオブジェクトを何度も渡すもの) にした
- レコードのキーとバリアントのタグの文字列は種類が限られるので, 全ての書き込みで使い回す (`nameStrings`)
- `Object.entries(...).flatMap` と `variantOf` をやめ, `Object.keys` と添字のループで書く

上限を超える要求が続くと, その後しばらくは軽いページ (静的なアセットを返すだけ) も CPU 10 ミリ秒で止められて 1102 になる
(GraphQL の `workersInvocationsAdaptive` で `exceededResources` の `cpuTime` が 10 ミリ秒)。

これで解決結果は 85 ミリ秒, コミットは 25 ミリ秒, 提出全体は 0.55 秒になった。残りは解決結果の JSON の読み込み (約 50 ミリ秒) と
definy の型検査 (約 260 ミリ秒)。パーツが増えればまた上限に近づくので, 型環境をコミットが参照するパーツの閉包だけにするのが次の手。

測り方: `worker/service_io.ts` の `runServiceIoLoop` の要求ごとに `performance.now()` と `process.memoryUsage()` を出し,
手元のストアの写しに同じ署名済みイベントを `SubmitEvent` で送る (D1 のキャッシュが温かい状態)。`node --cpu-prof` の自己時間でも確かめた。

## 速さ (2026-11-07, クラウドのコンテナの Node.js, コンパイルした Wasm)

| ページ                            | CPU の時間       | 公開サーバーへの通信 |
| :-------------------------------- | :--------------- | :------------------- |
| `/` (プロジェクト一覧)            | 約 10 ミリ秒     | 約 0.2 秒            |
| `/p/sample/main`                  | 約 10〜40 ミリ秒 | 約 0.3 秒            |
| `/p/definy/main` (約 1000 パーツ) | 約 750 ミリ秒    | 約 0.5 秒            |

評価器で動かしていた `/html/` では `/p/definy/main` が 2.7 秒 (文字列の処理をコンパイル済みにした後) だった。
Workers の無料プランは 1 リクエストの CPU 時間が公称 10 ミリ秒 (実際には約 2 秒で止められる。上の「Workers の無料プランの CPU 時間」) なので, 大きなページは有料プランが要るかもしれない。

## テスト

`src/wasi_io.test.ts`: `sample.deploy-fetch-worker` をデプロイし, アップロードした `worker.js` が `fetch` の段で
HTTP リクエストを送って応答で続けること。`cli/html_ui.test.ts`: 手元のサーバーが小さな `html-ui.handle` をコンパイルしてサーバーと同じ能力で動かし,
main が進んだらコンパイルし直すこと, 他のオリジンからの POST を断ること。`worker/mcp_create_project.test.ts`: `definy_create_project`。
