# HTML だけのシンプル版 UI (別の Cloudflare Worker `definy-html`)

HTML を返すだけの UI で, definy の唯一の UI ([mcp-self-hosting.md](mcp-self-hosting.md) の 4 段目)。
2026-11-07 に React の UI と並べて作り始め, 2026-11-24 に React の UI を削除した (下の「React の UI を削除した」)。

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
4. デプロイは手元のサーバーの html-ui で `html-ui.deploy` のパーツのページから実行する (`definy_run_io`。`definy.cloudflare-api-token` のシークレットに値を入れておく)

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
  プロファイルは `node --cpu-prof` で取り, `wasm-function[N]` の N はランタイム関数 (`core.wasm-runtime-functions` の順に 1〜35 (2026-11-20 より前は 1〜31)。
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
- `html-ui.deploy` の Cron は取り込みのあとにコミットを読み (`definy.read-commits`. 2026-11-18 から `definy.warm-commit-cache` で少しずつ), `host_cache` に入れておく
- 手元で別のプロセスから同じ SQLite を読むと (D1 のキャッシュが効く), `/p/definy/main` の CPU は 0.67 → 0.1 秒,
  `/p/definy/main/core` は 1.3 → 0.4 秒。本番ではモジュールのページが 0.5〜1.7 秒で表示できる
- 残り: 検索 (`/p/definy/main?q=...`) は全ての定義を読むので, 上限を超えることがある

### デプロイし直したら全てのページが 1102 になった (2026-11-18)

履歴などを入れた html-ui を `html-ui.deploy` で入れ直したら, `/` も含めて全てのページが 503 (error 1102, CPU の上限) になった。
手元で同じ Worker を Node.js で動かして測ると (本番は約 3 倍遅い):

- **取り込むものが無い Cron でも約 1.1 秒**。`GetEvents` は全てのイベントの署名済みバイト列を返し, seed を opus5.5 のコミットにしてから
  definy のコミットが 1 つ約 140KB になったので, 応答が 2.6MB あった。それを `definy.parse-json` で読むのが重い。本番では毎回上限を超え,
  続く `definy.read-commits` (キャッシュを作る) まで届いていなかった
- デプロイで `host_cache` を消したあとは, `/` がコミットを全て読み直すので約 4.2 秒。途中で止められるのでキャッシュは書かれず, ずっと 1102 のまま。
  キャッシュがあれば, どのページも 0.1〜0.4 秒

直したこと:

- `GetEvents` に `hashesOnly: true` を足した (`definy.get-events`)。`signedEventBytes` を空にして返す (D1 からも読まない. `definy.store-read-events-page-of` の `bytes: false`)
- `definy.mirror-pull` はイベントの一覧を `hashesOnly` で読み (`definy.mirror-remote-events`), 手元のハッシュ (`definy.mirror-local-hashes`) に無いものだけを
  `GetEvent` で読んでから入れる (`definy.mirror-fetch-and-sync-event`)。相手が `hashesOnly` を知らなければバイト列が付いてくるので, そのまま入れる。
  取り込むものが無い Cron は 1.1 秒 → 0.16 秒, 相手から読む量は 2.6MB → 12KB
- Cron の `definy.read-commits` を `definy.warm-commit-cache(limit)` に変える: キャッシュに無いコミットを 1 回に `limit` 個だけ読んでキャッシュに入れる。
  キャッシュが空でも 1 回の CPU が上限を超えず, 何回かの Cron で埋まる (手元では `limit: 5` で 1 回約 0.9 秒, 10 回ほど)。html-ui.deploy は `limit: 2`
- 大きなコミット 1 つ (中身はある) を取り込み直すのは手元で約 0.34 秒

2026-11-21 に html-ui を入れ直したら, Cron は成功するのにページが 503 (1102) になった。`host_cache` の `commits` は 38 個で計 9.5MB
(1 つ最大 340KB) あり, ページを開くたびに新しい isolate でこれを全部読む。コミットが増えるほど重くなるので,
ページごとに要るコミット (各ブランチの最新など) だけを読むようにした:

- `definy.read-commits` が完全 (全てのパーツ付き) に読むのは **各ブランチの最新のコミットだけ**。他はパーツを除いた軽い要約
  (`definy.commit-cache-entry-summary`。プロジェクト・ブランチ・時刻・親・メッセージ・モジュールの名前) を返す。
  ブランチの最新を決める (`core.project-branches`) には要約で足りる
- 要約はコミットのキャッシュ (`read_cached_commits`) にキー `summary:<イベントハッシュ>` (`definy.commit-summary-key`) で置く。
  ホストはキーを区別しないので, ホストのコードは変えていない。要約がキャッシュに無ければ完全なコミット (`definy.read-full-commits`) から作って書く
- イベントの一覧はバイト列なしで読み (`definy.read-commit-events`), バイト列は完全に読むコミットの分だけ読む
- 最新でないコミットも完全に要るところは `definy.read-commits-with(event_hashes)` か `definy.read-full-commits` で読む:
  `definy_get_part` の `commit` 指定, `definy_describe_event` (そのコミットと親・マージ元), `definy_get_history` (たどる `limit` 個, `definy.history-chain-hashes`)
- `definy_list_events` の各コミットの `parts:` (パーツの数) の行はやめた (要約にはパーツが無い. `definy_describe_event` には出る)
- `definy.warm-commit-cache` は要約がまだ無いコミットを `limit` 個, 完全なものと要約の両方をキャッシュする
- 型検査の入力 (`definy.read-commit-check-input`) も各プロジェクトの main の最新しか使わないので, 公開サーバーの `SubmitEvent` も軽くなる

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

| 画面                           | 操作                                                                                                  | ツール                                                                                     |
| :----------------------------- | :---------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| `/` (プロジェクト一覧)         | プロジェクトを作る, 公開サーバーから取り込む (pull) / 送る (push)                                     | `definy_create_project`, `definy_pull`, `definy_push`                                      |
| `/p/<プロジェクト>/<ブランチ>` | このブランチからブランチを作る, 式を実行, テストを実行 (`prefix` で絞る), main に取り込む (main 以外) | `definy_create_branch`, `definy_run_expression`, `definy_run_tests`, `definy_merge_branch` |
| パーツのページ                 | パーツを消す (確かめてから)                                                                           | `definy_commit_parts` (`delete: true`)                                                     |
| `/edit/...`                    | 名前の欄を変えると名前の変更 (新しい名前で足し, 古い名前を消す 1 つのコミット)                        | `definy_commit_parts`                                                                      |

- `POST /api/<ツール名>` (`html-ui.handle-api`) は `html-ui.api-tool` が許すツールだけを, 本文の JSON を引数にして呼ぶ。`/api/commit` は `definy_commit_parts`
- フォームは `html-ui.tool-form(tool, then, confirm, fields, button)` で作る。小さな JS (`html-ui.tool-script`) が名前の付いた入力を引数にして送り,
  成功したら `then` のページ (`{名前}` を引数の値に置き換える) を開くか, 結果を表示する。`data-json` の付いた入力は JSON として読む
- 名前を変えても, 古い名前を参照する他のパーツは書き換えない (型検査の誤りとして表示される)。説明も引き継がないので書き直す

### コミットの履歴 (2026-11-17)

- `/h/<プロジェクト>/<ブランチ>?limit=N` (`html-ui.history-page`) は `definy_get_history` の結果を HTML にする (1 行ずつ `html-ui.history-line`)。
  プロジェクトのページ (`html-ui.history-link`) からリンクする。「もっと見る」は `limit` を 20 増やす。時刻は小さな JS でブラウザの地域の書き方にする
- `definy_get_history` は最初, 各コミットのイベントを definy で読み直していて, definy プロジェクトで 42 秒かかった (パーツ ID を definy の sha256 で求めるのが重い)。
  そこでコミットキャッシュの `definy.stored-commit` にメッセージ・親のコミット・取り込んだコミットを足し, キャッシュだけで求めるようにした (手元で 0.2〜0.7 秒)。
  古い形 (`message` が無い) のキャッシュはホスト (`isCurrentCommitEntry`) が無いものとして読み直す
- 差分はパーツの名前 (`モジュール.名前`) と content hash の比較だけ。式の中の差分は見せない (古いコミットの時点のパーツは下の節のリンクで見比べる)

### 古いコミットの時点のパーツ (2026-11-17)

- パーツのページは `?commit=<イベントハッシュ>` でそのコミットの時点の内容を出す (`definy_get_part` の `commit`)。編集・削除のフォームは出さず, 最新へのリンクを出す
- 履歴のページの足した・変えたパーツはそのコミットの時点へリンクする (`html-ui.history-page` は行をたどりながら今のコミットを覚える)。消したパーツはリンクしない

### モジュールの設定 (2026-11-17)

- モジュールのページ (`/p/<プロジェクト>/<ブランチ>/<モジュール>`) は説明と公開範囲を見出しの下に出す (`html-ui.module-summary`)。
  `html-ui.project-text` は応答の `json` を `{count, description, visibility}` (`html-ui.module-info`) にした。読むのは `definy.stored-commit-module` の `description` と `visibility`
- 編集できるとき (`editable`) は `html-ui.module-tools` で名前・説明・公開範囲を変えるフォームと, モジュールを消すフォームを出す (`definy_commit_parts` の `modules`)
- `html-ui.tool-script` は入力の名前の `.` を入れ子として読む (`modules.0.description` → `{modules: [{description}]}`)。
  `data-keep-empty` の付いた入力は空でも送る (説明を消すため)。`then` の `{modules.0.rename}` も同じように読む

### React 版とそろえた (2026-11-21)

React の UI を消す準備として, React 版にあって html-ui に無かった操作を足した (definy 側のツールは [mcp.md](mcp.md) の表)。

| 画面                                               | できること                                                                              | 使うもの                                                                |
| :------------------------------------------------- | :-------------------------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| `/events?type=&offset=` (ヘッダーの「イベント」)   | イベントのタイムライン。種類で絞り, 50 件ずつ                                           | `definy_list_events`                                                    |
| `/e/<イベントハッシュ>`                            | イベントの詳細 (親・取り込んだ・次のコミットへのリンク, メッセージ, その時点のパーツ)   | `definy_describe_event`                                                 |
| `/accounts`, `/a/<アカウント ID>`                  | アカウントの一覧 (イベントの数・最初と最後), アカウントのイベント                       | `definy_list_accounts`, `definy_list_events`                            |
| パーツのページ (編集できるとき)                    | 値を求める, 参照しているパーツ, 名前の変更 (参照も書き換える), 消すときに参照の数を出す | `definy_run_expression`, `definy_find_references`, `definy_rename_part` |
| 型が `@wasi.io` のパーツのページ, ブランチのページ | I/O をするプログラムを実行 (`html-ui.deploy` など)                                      | `definy_run_io`                                                         |
| 式が `secret(...)` のパーツのページ, `/secrets`    | シークレットの値を入れる・一覧・消す (手元のサーバーの `secrets.json`)                  | ホストの能力 `read_secrets`, `write_secret`                             |

- 履歴のページのコミットと作成者は `/e/` と `/a/` へリンクする
- イベントの一覧は definy の `definy.store-read-events-filtered` (署名済みのバイト列を読まない) と, コミットキャッシュ (`definy.read-commits`) と
  `create_account` の名前 (`definy.read-account-names`. 最新の 500 個) で作る。ツールの返すテキストを html-ui が行ごとに HTML にする (`html-ui.event-lines-html`)
- 名前の変更 (`definy.mcp-rename-part`) は, パーツの中身を `core.part-content-to-value` で値にし, 古いパーツ ID と同じ文字列を全て新しい ID に
  置き換えて (`definy.value-replace-string`) 戻す。パーツ ID は SHA-256 の Base64URL なので他の文字列と重ならない。参照しているパーツは
  型と式の参照 (`core.expression-part-references`) で探す (`definy.part-referrers`)。他のプロジェクトとブランチの参照は書き換えない。
  編集のページで名前を変える機能 (足して消すだけで参照を書き換えなかった) はやめた
- 表示言語の切り替えと紹介のページ (`/about`) はまだ無い (日本語だけ)

### React の UI を削除した (2026-11-24)

React/Vite (Void) の UI (`pages/`, `src/components/`, `src/state/`, `src/tree_layout/` の編集の部分など) を削除し,
definy サーバーは `wrangler deploy` でデプロイする形にした ([cloudflare-workers-assets.md](cloudflare-workers-assets.md))。
`definy.narumincho.com/` は案内のページ (`public/index.html`) だけを返す。紹介スライドだけは静的なページ `/about/` として切り出して残した ([story.md](story.md))。

React の UI にあって html-ui に無いもの (削除の時点。必要になったら html-ui に足す):

- 表示言語の切り替え (日本語・英語・エスペラント, `?lang=`)。html-ui は日本語だけ
- 紹介のページ `/about` のスライド以外の部分 (definy の特徴の表など)。スライドは `/about/` に残した
- 式の木のエディタ (ブロックの選択・キーボード操作・置換メニュー・ホバーで型・定義へ移動・未入力の型引数の推論の表示)。
  html-ui は式をテキスト ([expression-text.md](expression-text.md)) で書く
- 複数のパーツの作業中の変更を貯めてまとめてコミットする, 元に戻す (undo)。html-ui は 1 つの編集を 1 コミットにする
- ブラウザの中での実行 (stage1 で Wasm にコンパイルして実行する実行パネルと実行の履歴, コンパイラの作り直し)。
  html-ui の実行は手元のサーバーでする (`definy_run_expression`, `definy_run_io`)
- ブラウザでのアカウントの作成とログイン (鍵は localStorage)。html-ui は手元のサーバーの鍵で署名する (2026-11-08 の方針)
- コマンドパレット (Cmd/Ctrl+P) とキーボードショートカット。html-ui はモジュールのページの検索 (`?q=`) がある
- 設定のページ (接続元の IP バージョン, CORS の仲介)。サーバーの `HttpProxyService` (CORS の仲介) は React の UI だけが使っていたが,
  definy のパーツ (`definy.http-proxy-send` など) なのでサーバーには残している

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
2026-11-17 に閉包だけにした ([service.md](service.md)「型検査」の `definy.latest-closure`)。手元で 0.8 秒 → 0.23 秒。

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
