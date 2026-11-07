# HTML だけのシンプル版 UI (`/html/`)

サーバーが HTML を返すだけの UI。React の UI (`pages/`, `src/`) とは別に並べて置く (2026-11-07 に決めた。
[mcp-self-hosting.md](mcp-self-hosting.md) の 5 段目)。

- React の UI は今のまま GitHub でバージョン管理する
- シンプル版の正本は definy のストアの **`html-ui` プロジェクト** で, バージョン管理も definy のブランチとコミットだけでする。
  `seeds/*.json` にも GitHub にも置かない。MCP のツール (`definy_create_project`, `definy_commit_parts`) で書いてコミットし,
  `definy_push` で公開サーバーに送る
- GitHub で管理するのは, ストアのコードを動かす固定の入口 (`definy.handle-html-ui`) と型 (`definy.html-ui-step`) だけ

## 動くところ

今は手元の definy サーバー (`npm run serve`. [local-server.md](local-server.md)) だけ。`http://127.0.0.1:8787/html/` を開く。

- 入口は `definy.handle-request` の `/html` と `/html/...` (`definy.is-html-ui-path`)。Worker でもこのパスは `definy.handle-request` に来る
- 式を実行しないサーバー (`read_host_settings` の `run_expressions` が `false`。公開サーバー) は 404 と
  `The HTML UI runs only on the local definy server ...` を返す
- 公開サーバーでどう動かすか (Worker でも評価するか, デプロイのときに wasm にするか) は, 手元で速さを測ってから決める

## 仕組み (`definy.handle-html-ui`)

1. ストアの `html-ui` プロジェクトの `main` の最新のコミットのパーツと, 参照をたどった他のプロジェクトの `main` のパーツを集める
   (`definy_run_expression` と同じ `definy.run-expression-commits` と `definy.collect-evaluation-parts`)
2. `@html-ui.handle-request(path: "<リクエストのパス>")` を `core.eval-value` で評価する (stage1 でコンパイルはしない)。
   パスは `/html` を含む全体 (例 `/html/p/sample/main`)。クエリ文字列は今は渡さない
3. 値 (`definy.html-ui-step`) を `definy.html-ui-run-step` が動かす

`html-ui` プロジェクトが無ければ 404 と `The html-ui project was not found ...` を返す。

### `definy.html-ui-step`

```text
definy.html-ui-step =
  | respond { status: Number, content_type: String, body: String }
  | rpc { method: String, request: String, then: Fn(response: @definy.html-ui-response) -> @definy.html-ui-step }

definy.html-ui-response = { status: Number, text: String, json: @definy.json }
```

- `respond`: そのままレスポンスにする (`cache-control: no-store` を付ける)
- `rpc`: このサーバーの処理を呼んで, 応答で `then` を続ける。`wasi.io` ([wasi-io.md](wasi-io.md)) と同じ継続の形
  - `method` が `definy_` で始まれば MCP のツール (`definy.mcp-tools` の処理。例 `definy_get_project`), そうでなければ RPC
    (`EventService/GetProjectBranches` など。`definy.handle-rpc`)。`definy.html-ui-handler` が選ぶ
  - `request` は JSON のテキスト (`definy.parse-json` で読むので数は整数だけ)。MCP のツールなら `arguments`
  - `then` の `response`: 本文が JSON なら `json` にその値 (`text` は空), テキスト (MCP のツール) なら `text` (`json` は `null`)。
    MCP のツールがエラーなら `status` が `400`
- `then` は評価したクロージャ (`core.value` の `closure`) なので, 引数を捕捉した変数の前に足して本体を `core.eval-value` で評価する
- 応答の JSON は `definy.json-to-value` で (コンパイルした service の wasm の中で) 評価した値にしてから渡す。
  UI のコードが JSON のテキストを 1 バイトずつ読まなくてよい (`signedEventBytes` などの大きな文字列はそのまま 1 つの値)

## 書き方 (MCP だけで)

```sh
npm run serve
```

MCP のクライアントから:

1. `definy_create_project` `{"project": "html-ui", "description": "..."}`。`main` の作成者は手元の鍵のアカウント
   (`~/.definy/account.json`) になり, そのアカウントだけが `main` にコミットできる ([branch.md](branch.md))
2. `definy_commit_parts` `{"project": "html-ui", "branch": "main", "changes": [{"part": "html-ui.handle-request", "type": "Fn(path: String) -> @definy.html-ui-step", "expression": "..."}]}`。
   コミットは公開サーバーと同じ型検査を通る
3. ブラウザで `/html/` を開く (コミットするとすぐ変わる。ビルドもサーバーの再起動も要らない)
4. `definy_push` で公開サーバーに送る (他の人は `definy_pull` で取り込む)

注意:

- 式のテキストの型引数は型の書き方 (`T: @definy.json`, `U: String`)。`dtx.mjs` の `json(...)` は読めない
- `then` のラムダの引数名は型の引数名 (`response`) と同じにする
- 消えてしまう環境 (クラウドのコンテナなど) の鍵で `html-ui` を作って push すると, その鍵が無くなったあと誰も `main` にコミットできない。
  `main` はユーザー自身の手元の鍵で作る

## 速さ (2026-11-07, クラウドのコンテナ, 評価器は `core.eval-value`)

| ページ                                                         | 本文   | 最初    | 文字列の処理をコンパイル済みにした後 |
| :------------------------------------------------------------- | :----- | :------ | :----------------------------------- |
| `/html/` (プロジェクト一覧. `GetProjectBranches`)              | 1.5 KB | 0.03 秒 | 0.02 秒                              |
| `/html/p/sample/main` (パーツ一覧. `definy_get_project`)       | 5 KB   | 0.36 秒 | 0.02 秒                              |
| `/html/p/sample/main/sample.greet` (パーツ. `definy_get_part`) | 1.7 KB | 0.05 秒 | 0.02 秒                              |
| `/html/p/definy/main` (約 1000 パーツ, 2200 行)                | 420 KB | 36 秒   | 2.7 秒                               |

- 最初は, 評価器が文字列を 1 バイトずつ処理していた (`definy.string-split` で行に分ける, `std.string-index-of`,
  HTML のエスケープを `string-split` と `string-join` で 4 回)。20 KB のエスケープだけで 1.4 秒 (1 バイトあたり十数マイクロ秒)
- `core.string-split` / `core.string-join` / `core.string-replace` / `core.string-index-of` を足し, 評価器はこれらの式を評価せず
  service の wasm にコンパイル済みの関数をそのまま呼ぶようにした ([builtin-parts.md](builtin-parts.md) の「評価器がコンパイル済みのまま動かすパーツ」)。
  350 KB の分割・置換・検索はどれも 0.05 秒ほど。`html-ui` はこれらを使う
- 残りの 2.7 秒は `definy_get_project` (0.4 秒) と, 2200 行それぞれを評価器で組み立てるところ

## テスト

`worker/html_ui.test.ts`: `definy_create_project`, 公開サーバーでは 404, `html-ui` が無いときの 404,
入口のパーツが RPC と MCP のツールを呼んで HTML を返すこと。
