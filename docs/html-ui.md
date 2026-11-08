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

- `html-ui.handle(config: @html-ui.config, request: @definy.worker-request) -> @definy.worker-step` が入口。
  `html-ui.config` = `Record{server: String, token: String, editable: Boolean}`
  - `server`: データを読む definy サーバー。`token`: その `/mcp` の Bearer のトークン (空なら付けない)
  - `editable`: 編集とコミットの画面 (`/edit/...`, `/api/commit`) を出すか
- `html-ui.deploy` = `@definy.deploy-fetch-worker(worker_name: "definy-html", api_token: @definy.cloudflare-api-token, handler: quote(fn(request) => @html-ui.handle(config: {server: "https://definy.narumincho.com", token: "", editable: false}, request: request)))`。
  React の UI のパーツのページで評価するとデプロイする ([cloudflare-workers.md](cloudflare-workers.md))。公開の definy-html は読むだけ
- 手元の definy サーバー (`npm run serve`) は, 自分自身を `server` にし `editable: true` にした html-ui を別のポート (既定 8788) で配る
  ([local-server.md](local-server.md))
- `html-ui.rpc(config, method, request, then)`: `method` が `definy_` で始まれば `<server>/mcp` に JSON-RPC の `tools/call`,
  そうでなければ `<server>/definy.v1.<method>` に POST する `#fetch` の段を作る
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

## 編集とコミット (2026-11-08)

パーツの型・式を書き換えてコミットできるのは, **手元の definy サーバーが配る html-ui だけ** (ユーザーの決定)。
署名はそのサーバーが手元の鍵 (`account.json`) でする。公開の definy-html は鍵を持たず, 読むだけにする。
公開サーバーとは署名したイベントを `definy_push` / `definy_pull` で渡す。

- パーツのページの「編集する」, モジュールのページの「パーツを足す」から `/edit/<プロジェクト>/<ブランチ>/<モジュール.パーツ>`
  (または `?part=`) を開き, 型・式・英語の説明・コミットメッセージを書く
- 小さな JS (`html-ui.commit-script`) が `POST /api/commit` に `definy_commit_parts` の引数の JSON を送る。
  Worker (`html-ui.handle-api`) はそれを `server` の MCP に渡すだけ。型の誤りやブランチの作成者でないときは, その理由を表示する
- Worker は POST の本文を `definy.worker-request` の `body_text` で読む

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
HTTP リクエストを送って応答で続けること。`cli/html_ui.test.ts`: 手元のサーバーが小さな `html-ui.handle` をコンパイルして配り,
main が進んだらコンパイルし直すこと, 他のオリジンからの POST を断ること。`worker/mcp_create_project.test.ts`: `definy_create_project`。
