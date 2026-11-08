# HTML だけのシンプル版 UI (別の Cloudflare Worker `definy-html`)

HTML を返すだけの UI。React の UI (`pages/`, `src/`) とは別に並べて置く (2026-11-07 に決めた。
[mcp-self-hosting.md](mcp-self-hosting.md) の 5 段目)。

- React の UI は今のまま GitHub でバージョン管理する
- シンプル版の正本は definy のストアの **`html-ui` プロジェクト** で, バージョン管理も definy のブランチとコミットだけでする。
  `seeds/*.json` にも GitHub にも置かない。MCP のツール (`definy_create_project`, `definy_commit_parts`) で書いてコミットし,
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

### `definy.worker-step` (`seeds/definy.json`)

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
- 取り込みは `definy.mirror-pull(remote)`: 表が無ければ作り (`definy.ensure-seeded`。写しは seed バンドルを持たず表だけ作る),
  相手の全てのイベント (seed のイベントも) のうち無いものを古い順に `definy.mirror-submit` で入れる。
  `definy.mirror-submit` は署名と中身だけ確かめ, イベントの規則と型は確かめない (相手が受け付けたときに確かめている。
  型の検査は CPU が重く, Workers の 1 回の上限を超えうる)。中身は相手の `GetContent` から読んで `UploadContent` と同じく入れる
- seed には署名の検証を確かめるための署名の誤ったイベントが 3 つある (`src/invalid_signature_samples.ts`)。写しには入らず,
  `definy.mirror-pull` は毎回その 3 つを失敗として報告する
- 最初の Cron が動くまでは表が無いので, ページは読めない
- 2026-11-08 に手元 (クラウドのコンテナの Node.js) で, 土台の JS と SQLite で本物の公開サーバーから写した:
  22 イベントのうち 18 を 21 秒で取り込み (失敗は上の 3 つと, 今の形式で読めない古い `create_account` の `K6K9xb2b…`)。
  Wasm は 469 KB。ページは `/` 0.4 秒, `/p/html-ui/main` 0.05 秒, `/p/definy/main?q=...` 1.8 秒 (最初の定義の読み込み)
- html-ui の入口は `quote({fetch: fn(request) => @html-ui.handle(editable: false, request: request), scheduled: fn(time_ms) => @definy.mirror-pull(remote: "https://definy.narumincho.com")})`
- テスト: `cli/mirror.test.ts` が手元の definy サーバーを公開サーバーの代わりにし, 土台の JS を Node.js で読み込んで
  (D1 の代わりに `worker/sqlite_d1.ts`) Cron と fetch を確かめる

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

## 速さ (2026-11-07, クラウドのコンテナの Node.js, コンパイルした Wasm)

| ページ                            | CPU の時間       | 公開サーバーへの通信 |
| :-------------------------------- | :--------------- | :------------------- |
| `/` (プロジェクト一覧)            | 約 10 ミリ秒     | 約 0.2 秒            |
| `/p/sample/main`                  | 約 10〜40 ミリ秒 | 約 0.3 秒            |
| `/p/definy/main` (約 1000 パーツ) | 約 750 ミリ秒    | 約 0.5 秒            |

評価器で動かしていた `/html/` では `/p/definy/main` が 2.7 秒 (文字列の処理をコンパイル済みにした後) だった。
Workers の無料プランは 1 リクエストの CPU 時間が 10 ミリ秒までなので, 大きなページは有料プランが要るかもしれない。

## テスト

`src/wasi_io.test.ts`: `sample.deploy-fetch-worker` をデプロイし, アップロードした `worker.js` が `fetch` の段で
HTTP リクエストを送って応答で続けること。`cli/html_ui.test.ts`: 手元のサーバーが小さな `html-ui.handle` をコンパイルしてサーバーと同じ能力で動かし,
main が進んだらコンパイルし直すこと, 他のオリジンからの POST を断ること。`worker/mcp_create_project.test.ts`: `definy_create_project`。
