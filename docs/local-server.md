# 手元の definy サーバー (`definy serve`)

手元のコンピューターで Worker と同じ definy のサーバーを動かすコマンド。MCP のクライアント (Claude Code など) は
`http://127.0.0.1:<port>/mcp` に Streamable HTTP でつなぐ。書き込みのツールは手元の鍵で署名する。
計画の中の位置は [mcp-self-hosting.md](mcp-self-hosting.md) の 2 段目。

## 使い方

```sh
npm run build:seeds   # seed バンドルと service の wasm を作る (Node.js 26 以上)
npm run serve         # = node cli/definy.ts serve
```

起動すると MCP クライアントに足すコマンドを表示する。

```sh
claude mcp add --transport http definy-local http://127.0.0.1:8787/mcp --header "Authorization: Bearer <token>"
```

| オプション       | 既定                          | 意味                                   |
| ---------------- | ----------------------------- | -------------------------------------- |
| `--port`         | `8787`                        | 待ち受けるポート (0 なら空いたもの)    |
| `--ui-port`      | `8788`                        | HTML の UI のポート (`off` で配らない) |
| `--data-dir`     | `$DEFINY_HOME` か `~/.definy` | ストア・鍵・トークンを置くフォルダ     |
| `--account-name` | `local`                       | 鍵を新しく作るときのアカウントの名前   |

## 中身

- `cli/definy.ts`: コマンドの入口。`*.wasm?module` を `WebAssembly.Module` として読むフック (`module.registerHooks`) を
  登録してから `cli/serve.ts` を動的に import する (フックは読み込む前に登録しないと効かない。vitest.config.ts のプラグインと同じ役目)
- `cli/serve.ts` の `startLocalServer`: `node:http` のリクエストを fetch の `Request` にして Worker と同じ
  `handleWorkerRequest` (中身は definy の `definy.handle-request` の wasm) に渡す
  - ストア: `<data-dir>/store.sqlite`。`worker/sqlite_d1.ts` が `node:sqlite` を D1 のように見せる (テストのメモリ上の D1 と同じもの)
  - seed: 起動時に `public/__definy_seed_bundle.json` を `WorkerStore.seedD1` で入れる (指紋が同じなら入れ直さない)
  - 鍵: `<data-dir>/account.json` (`accountName` と `secretKeyBase64`, パーミッション 600)。無ければ作る。
    Worker の `DEFINY_MCP_ACCOUNT_SECRET_KEY` / `DEFINY_MCP_ACCOUNT_NAME` として渡すので, 書き込みのツールは
    Worker の専用アカウントと同じ仕組みで手元の鍵の署名になる ([mcp.md](mcp.md))
- 静的アセット (今の React の UI) は配らない。HTML だけの UI は `--ui-port` で配る (下の「HTML の UI」)

## 式の実行 (`definy_run_expression`, `definy_compile_expression`)

公開サーバーでは式を実行しないので, 手元のサーバーだけのツール。

```json
{ "expression": "@local.double(value: 21)", "project": "sample", "branch": "w" }
```

は `42` を返す。

- 中身は definy の `definy.mcp-run-expression`。式は `definy.parse-expression-text` で読み,
  definy 製の評価器 `core.eval-value` で評価する (stage1 でコンパイルはしない)
- `project` (と `branch`。既定は `main`) を渡すと, そのブランチのコミットのパーツを全て使う。
  それ以外のパーツは, 参照をたどって最新の main のコミットから読む
  (`definy.collect-evaluation-parts`。ユーザーが作った定義のパーツの評価と同じもの)
- 値は `definy.value-literal` でリテラルの式にしてから `definy.expression-text` で書く。
  浮動小数は値をちょうど表す最も少ない 10 進の桁 (17 桁まで) の `float(仮数, 指数)`。
  クロージャは捕捉した変数を除いた `fn` の式。unit は `{}`
- 型検査はまだしない。止まらない式は返らない (手元のサーバーなので, 止めるにはサーバーを止める)
- `definy_compile_expression` は同じ引数で, 式を `core.compile-to-wasm` で Wasm GC のモジュールにして Base64 で返す (HTML の UI に使う)
- 実行・コンパイルしてよいかはホストの能力 `read_host_settings` の `run_expressions` で決まる。
  `cli/serve.ts` が `DEFINY_RUN_EXPRESSIONS: "1"` を渡す。Worker はこれを設定しないので, 公開サーバーの `/mcp` は
  "Running expressions is disabled on this server" のエラーを返す

## HTML の UI (`--ui-port`, `cli/html_ui.ts`)

ストアの `html-ui` プロジェクト ([html-ui.md](html-ui.md)) を `http://127.0.0.1:8788` で配る。公開の definy-html と違い,
パーツの編集とコミットができ, 署名は手元の鍵でする。

- `fn(request) => @html-ui.handle(config: {server: "http://127.0.0.1:<port>", token: "<mcp-token>", editable: true}, request: request)` を
  MCP の `definy_compile_expression` (`definy.mcp-compile-expression`) で Wasm にし, 公開の Worker と同じランタイム
  (`definy.cloudflare-workers-runtime-script`) を Node.js で読み込んで動かす (`./app.wasm` の import をそのモジュールに置き換えた data: URL)。
  html-ui は `<port>/mcp` をトークン付きで呼ぶ
- コンパイル (約 1 秒) は 1 度だけして使い回す。リクエストごとに `GetProjectBranches` を読み, どれかのプロジェクトの `main` の
  最新のコミットが変わっていたらコンパイルし直す (html-ui 以外のパーツは各プロジェクトの最新の main から読むため)
- `html-ui` がまだストアに無ければ 503 で `definy_pull` するように伝える。公開サーバーから取り込めば使える
- 検査は `/mcp` と同じ Host と Origin に加えて, GET と HEAD 以外には Origin を求める (トークンなしで書き込めるので, 他のサイトのページからの
  フォームの送信を断る)。ランタイムが付ける `Access-Control-Allow-Origin: *` は外す

## 公開サーバーとの同期 (`definy_pull` / `definy_push`)

どちらも引数は `{"remote": "https://definy.narumincho.com"}` (省略時はこれ, 末尾の `/` は除く)。
相手の EventService の RPC を能力 `http_fetch` で呼ぶ ([service.md](service.md))。

- `definy_pull` (`definy.mcp-pull`): 相手の全てのイベント (`GetEvents` を 500 件ずつ) のうち, このサーバーに無いものを
  古い順にこのサーバーの `SubmitEvent` に渡す。`missing_content` なら相手の `GetContent` で中身を読み,
  このサーバーの `UploadContent` に入れてからもう一度渡す
- `definy_push` (`definy.mcp-push`): このサーバーの MCP のアカウント (`account.json`) のイベントのうち,
  相手に無いものを古い順に相手の `SubmitEvent` に送る。中身はこのサーバーのストアから読み, 相手の `UploadContent` に送る。
  取り込んだ他人のイベントは送らない
- seed バンドルのイベント (2019-01-31T04:36:01Z からの 1 秒以内. [system-account.md](system-account.md)) は
  どちらでも同期しない (`definy.sync-is-seed-event`)。サーバーはそれぞれ自分の seed を入れるので, 版の違う seed の
  `main` のコミットを取り込むと「親が最新のコミットでない」と断られる
- 結果は `Pulled 7 of 8 events (https://definy.narumincho.com)` と, 失敗したイベントごとの `- <種類> <ハッシュ>: <理由>` の行。
  1 つでも失敗すれば `isError`。失敗しても残りのイベントは続ける
- どちらに無いかはイベントのハッシュで比べる (全てのイベントを読むので, イベントが増えたら差分の RPC が要る)
- JSON の応答は definy の `definy.parse-json` で読む。数は整数だけ読める (`timeMs` などの RPC の応答は整数だけ)
- `GetEvents` は `time_ms` の新しい順。同じミリ秒のイベント (アカウントの作成とその直後のコミットなど) は
  `rowid` の新しい順にした (古い順に並べ直したとき, 先に入れたものが先になるように)
- 2026-11-07 時点の公開サーバーには, 今の形式で読めない古い `create_account` (`K6K9xb2b…`, 2026-10-24) が 1 つあり,
  `definy_pull` は毎回それを失敗として報告する

## 安全

`127.0.0.1` だけで待ち受けても, ブラウザで開いた他のサイトのページからのリクエストは届く。`cli/local_security.ts` で次を確かめる。

- Host が `127.0.0.1:<port>` か `localhost:<port>` (DNS rebinding を防ぐ)。違えば 403
- Origin があれば `http://127.0.0.1:<port>` か `http://localhost:<port>`。違えば 403
- `/mcp` は `Authorization: Bearer <token>` が要る。トークンは `<data-dir>/mcp-token` (パーミッション 600) に置き,
  再起動しても同じものを使う (MCP クライアントの設定を書き換えなくてよい)。消すと次の起動で作り直す

## 知見

- definy プロジェクト (パーツが約 1000) のブランチを作ると, 署名した `SignedEvent` が数百 KB になる。
  `std.bytes-to-base64` / `core.bytes-to-base64url` が 3 バイトごとに末尾でない再帰をしていたので,
  V8 の既定のスタックでは `Maximum call stack size exceeded` になった (Cloudflare Workers でも同じはず)。
  `*-groups` で範囲を半分に分けて符号化するようにした (再帰の深さは log, コピーは n log n)。
  長いリストを 1 要素ずつ末尾でない再帰で処理するパーツは同じ問題を起こすので, 末尾再帰か分割統治にする
- service の wasm の中で溢れた関数は, スタックトレースの `wasm-function[N]` から分かる。
  関数の番号は 33 から式の中の関数, その後ろに `collectReferencedParts` が集めた順に各パーツの中の関数
  (`#function` の数) が並ぶ ([wasm-gc.md](wasm-gc.md), [self-hosting.md](self-hosting.md) の関数の番号の付け方) ので,
  パーツの関数の数を数えれば, どのパーツか求められる
- 関数の型の変数をそのまま引数に渡す (`sync: $0`) と型検査が `function_not_called` にする ([call-syntax.md](call-syntax.md))。
  `sync: fn(event$1, then$2) => $0(event: $1, then: $2)` のように包む
