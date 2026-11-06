# MCP サーバー

AI エージェントが definy を読み書きするための MCP (Model Context Protocol) サーバー。
2 つある。

- **Worker の `/mcp` (definy 製, 2026-11-06)**: definy サーバー自身が MCP の Streamable HTTP で答える。
  処理は全て definy の関数 (`definy.handle-mcp`) で, TypeScript は無い。
  MCP を操作の主役にして TypeScript を無くしていく計画 ([mcp-self-hosting.md](mcp-self-hosting.md)) の 1 段目
- **stdio の MCP サーバー (`mcp/`, TypeScript)**: 下の「stdio の MCP サーバー」以降。
  署名の検証付きの読み取りと, 専用アカウントの書き込みがある。Worker の `/mcp` に移し終えたら消す

## Worker の `/mcp` (definy 製)

```sh
claude mcp add --transport http definy https://definy.narumincho.com/mcp
```

- `definy.handle-request` が `/mcp` を `definy.handle-mcp` に渡す ([service.md](service.md))。
  `POST` で JSON-RPC のメッセージを 1 つ受け, `application/json` で返す (SSE は使わない。`POST` 以外は `405`)。
  JSON でない本文は `400` と `-32700`。セッション (`Mcp-Session-Id`) は使わない
- `definy.mcp-handle-message`: `id` か `method` の無いメッセージ (通知とレスポンス) は本文なしの `202`。
  `initialize` (求められたプロトコルのバージョンをそのまま返す。無ければ `2025-06-18`), `ping`, `tools/list`, `tools/call`。
  他のメソッドは `-32601`
- ツール (`definy.mcp-tools`) は名前・説明・入力の JSON Schema・処理 (`handler: (arguments, request) -> definy.service-io`) の組。
  `tools/call` は処理を動かし, 最後の `respond` をツールの結果にする (`definy.mcp-tool-result`):
  本文をテキストにし, ステータスが `200` でなければ `isError`。テキストを返す処理は `definy.mcp-text` / `definy.mcp-text-error` (`400`) を使う

  | ツール                        | 処理                                                                                                                                                  |
  | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `definy_get_project`          | `definy.mcp-get-project`: ブランチ (省略時は `main`) の全てのパーツを「`モジュール.名前`: 型 // 説明」の行で返す                                      |
  | `definy_get_part`             | `definy.mcp-get-part`: パーツ 1 つの id, content hash, 公開範囲, 説明, 型, 式。`project` を省くと全プロジェクトの `main` から探す                     |
  | `definy_whoami`               | `definy.mcp-whoami`: 書き込みに使う専用アカウント (アカウント ID, 名前, サーバーにもうあるか)                                                         |
  | `definy_create_branch`        | `definy.mcp-create-branch`: 既存のプロジェクトに専用アカウントのブランチを作る。最初のコミットは元のブランチ (省略時は `main`) の最新のコミットの写し |
  | `definy_commit_parts`         | `definy.mcp-commit-parts`: 専用アカウントのブランチにパーツの変更・追加・削除をコミットする。型と式は definy のテキストで渡す                         |
  | `definy_get_project_branches` | RPC `EventService/GetProjectBranches`                                                                                                                 |
  | `definy_get_events`           | RPC `EventService/GetEvents`                                                                                                                          |
  | `definy_get_event`            | RPC `EventService/GetEvent`                                                                                                                           |
  | `definy_get_content`          | RPC `EventService/GetContent`                                                                                                                         |
  | `definy_check_missing_hashes` | RPC `EventService/CheckMissingHashes`                                                                                                                 |

  RPC のツールは `definy.mcp-rpc-tool` が `definy.handle-rpc` のハンドラーを引数の JSON で動かし, レスポンスの本文の JSON を
  テキストにして返す (エラーの本文は Connect のエラー `{code, message}`)

- パーツの中身を読むツールは, 型検査と同じ方法で中身を求める (`definy.read-part-contents`: `definy.read-resolutions` →
  `definy.read-definitions` → `definy.resolve-commit-contents`。[service.md](service.md)「定義の式の評価」)。
  読み取りのリクエストなのでキャッシュには書かない。型と式は definy のテキスト ([expression-text.md](expression-text.md)) で書き,
  パーツの参照はそのコミットと各プロジェクトの `main` の最新のコミットのパーツの名前にする (`definy.commit-part-names`)。
  コミットのパーツの `name` は既に `モジュール.名前` の形 (`definy.stored-commit-part`)。
  テストの D1 で `sample` は 20ms ほど, `definy` (core などを含む約 900 パーツ) は 1 秒ほど
- RPC のハンドラーは最後に `respond` を返す `definy.service-io` なので, `definy.service-io-then-respond(io, respond)` で
  最後の `respond` だけを差し替える。`definy.service-io` の全てのタグの `then` を包み直す式で, 型の宣言から機械的に作った
  (タグを足したらこのパーツにも足す。全てのタグがあるかは `worker/mcp_endpoint.test.ts` が確かめる)
- JSON をテキストにするのも definy (`definy.json-to-string`。空白なし)。文字列は UTF-8 のバイトを見て
  `"` `\` と制御文字 (`\n` `\r` `\t` 以外は `\u00XX`) をエスケープし, それ以外のバイトはそのまま (`definy.json-escape-range`。
  再帰が深くならないように半分ずつ)。HTTP の本文の JSON は今までどおりホストが `JSON.stringify` する。
  ローカルの dev サーバーで `GetEvents` 500 件 (約 210KB) は RPC で 25ms, ツールで 70ms (差はテキストにする時間)
- 読み取りはサーバー自身のストアを読むので, stdio 版のような「受け取ったイベントの署名の検証」は無い
  (保存するときに `SubmitEvent` が検証している)。別の人のサーバーを信用せずに読みたいときは自分で Worker を立てる
- テストは `worker/mcp_endpoint.test.ts`

### 書き込み (専用アカウント, 2026-11-06)

書き込みは, Worker の secret にある**専用アカウント**の鍵で署名する (stdio 版と同じ GitHub Apps 型の考え方。下の「署名と信頼のモデル」)。

```sh
npx wrangler secret put DEFINY_MCP_ACCOUNT_SECRET_KEY   # 秘密鍵 (ブラウザのログインと同じ URL-safe Base64)
npx wrangler secret put DEFINY_MCP_ACCOUNT_NAME         # アカウントの名前
```

- 秘密鍵はホスト (`worker/mcp_account.ts`) だけが持ち, definy には渡さない。definy は `read_mcp_account` でアカウント ID と名前を読み,
  `sign_mcp_account` で署名を頼む ([service.md](service.md))。secret が無ければ書き込みのツールは理由を返す
- `definy.mcp-with-account`: サーバーにまだ専用アカウントが無ければ, 先に `create_account` のイベントを出す
- `definy.mcp-submit-content`: イベントの中身を CBOR にして ([cbor.md](cbor.md)) 署名し, `SubmitEvent` と同じ `definy.submit-event` に渡す。
  なので署名・規則・型検査は外から `SubmitEvent` したときと全く同じに確かめられる。時刻は `read_time` の秒 (親のコミットより後にする。下の `definy_commit_parts`)
- `definy_create_branch` は元のブランチの最新のコミットのイベントを読み直して (`definy.read-commit-content`), 中身 (モジュールの説明と
  パーツの content hash) をそのまま使い, `branch`, `message`, `parent_commit_hash` (元のコミット) だけを変える。
  同じ名前のブランチが既にあれば作らない
- `definy_commit_parts` (2026-11-06) は `changes` の各項目 `{part: "モジュール.名前", type?, expression?, description?, delete?}` を順に
  ブランチの最新のコミットに重ねる。
  - `type` と `expression` は definy のテキスト ([expression-text.md](expression-text.md)。`definy_get_part` が返すのと同じ書き方) で,
    `definy.parse-expression-text` で読む。読めなければコミットする前に理由とバイトの位置を返す
  - 省いた項目は今のまま。空の文字列は型や式を無くす。`description` は英語の説明 1 つに置き換える。
    新しいパーツは公開, 新しいモジュールは説明なしの公開で足す。パーツは今の位置のまま置き換え, 新しいパーツはモジュールの最後に足す
  - 新しい中身は定義の式 (`definy.part-definition-expression`。`src/part_definition.ts` の `partDefinitionExpression` と同じ
    `core.define-part(...)` / `core.define-type(...)`。[part-definition.md](part-definition.md)) にし,
    `core.expression-to-value` → `definy.value-to-cbor` → `definy.cbor-encode` の CBOR の SHA-256 (`core.sha256`) を content hash にして
    `definy.store-write-contents` で CAS に置く
  - コミットは `SubmitEvent` と同じ検査を通るので, 型が合わなければ `part 'sample.prime-numbers': type error: type_mismatch (...)`,
    作成者でないブランチ (例えば `main`) なら `only the account that created the branch can commit to it` が返る
  - 同じ秒の 2 つのコミットは先のものが最新のままになる ([event.md](event.md)) ので, `definy.mcp-submit-content` はイベントの時刻を
    親のコミットの時刻 (`after_time_ms`) の 1 秒以上後にする (サーバーは 10 分先までの時刻を受け付ける)。
    続けてコミットするエージェントの変更が消えないようにするため

## stdio の MCP サーバー (`mcp/`)

実装は `mcp/` にあり、依存パッケージを増やさず、最小限の JSON-RPC を自前で実装し、
署名・検証・デコードは `src/` の既存コードを再利用する。

```sh
npm run mcp
```

stdio で話す。接続先の definy サーバーは環境変数 `DEFINY_SERVER_URL` で変える
(省略時は `https://definy.narumincho.com`)。

## 署名と信頼のモデル

definy は分散アプリで、データの正しさはサーバーへの信用ではなく Ed25519 署名で決まる。
そのため MCP サーバーの扱いも、通常の「API キーを預ける MCP サーバー」とは異なる。

### 読み取り: 署名を検証する

MCP サーバーは、definy サーバーから受け取ったイベントをブラウザと同じ方法
(`src/signed_event.ts` の `verifyEventRecord`: 署名・イベントハッシュ・
メタデータの一致) で全て検証してからツール結果にする。
検証に失敗したイベントは中身を使わず、検証失敗として明示する。
パーツの中身 (CAS) も、SHA-256 がコンテンツハッシュと一致するものだけを使う。

したがって読み取りについては、MCP サーバーが正しく検証している限り、
その背後の definy サーバー (リレー) が何であっても結果は信用できる。
逆に言えば、検証しない・検証が間違っているサーバーの読み取り結果は信用できない。

### 書き込み: 専用アカウントで署名する (GitHub Apps 型)

書き込みは、MCP サーバーが持つ**専用アカウント**の秘密鍵で署名する。
ユーザーのアカウントの鍵は渡さない。つまりサーバーの運営者は、
その専用アカウントの鍵については信用する形になる。

ただし信用の範囲はプロトコルで制限される (GitHub Apps のインストール権限に相当):

- 専用アカウントは、自分が作ったブランチにしかコミットできない
  (他のアカウントのブランチへのコミットはイベント検証で `not_branch_creator` として拒否される。[branch.md](branch.md))
- コミットは全て署名付きで、どのアカウントの仕業か常に明確。問題があればそのブランチを取り込まなければよい
- 型チェック等の妥当性は definy サーバー側のイベントチェッカーが強制する

### 運用形態

- **セルフホスト**: 完全な永続化や秘密のプロジェクトを扱う人は、MCP サーバーを
  自分の環境にインストールして使う。鍵は自分の環境から出ない
- **運営サーバー**: ライトユーザーは、definy の運営者などが立てる MCP サーバーを
  信用して使う。専用アカウントのブランチ経由でのみ変更が入るので、
  取り込みの判断は人間 (ブランチの作成者やプロジェクトのオーナー) が握れる

## ツール

読み取り (検証付き):

- `definy_list_projects`: プロジェクトとブランチの一覧 (作成者・コミット数・最新コミット)
- `definy_get_project`: プロジェクトの表示ブランチの内容 (モジュールとパーツ。パーツの中身は CAS から解決する)
- `definy_get_part`: パーツ 1 つの定義 (型と式)。`module.name` の形で指定する
- `definy_list_events`: イベントの一覧 (それぞれ検証状態付き)
- `definy_get_event`: イベント 1 件 (検証状態とデコードした中身)

運用 (検証なし。サーバーのホストが記録した運用データで、上の読み取りとは別扱い):

- `definy_perf_recent_submits`: サーバーのホストが記録した直近の SubmitEvent の
  パフォーマンス記録 (合計と service-io セグメント別の wasm / ホスト時間)。
  パフォーマンス調査用。イベントと違い署名検証は無く、サーバーの申告をそのまま返す。
  サーバーと MCP の両方に同じ `DEFINY_PERF_TOKEN` が必要
  ([performance-observability.md](performance-observability.md))

書き込み (専用アカウントの署名。鍵が設定されているときだけ有効):

- `definy_whoami`: 専用アカウントのアカウント ID と名前、サーバーにアカウントがあるか
- `definy_create_branch`: 既存プロジェクトに自分のブランチを作る。初期コミットは
  作成元ブランチ (省略時は `main`) のスナップショットのコピー (Web UI のブランチ作成と同じ)。
  触っていないパーツは content hash のまま引き継ぐので、定義の式を評価しないと
  中身が分からないパーツがあっても壊れない
- `definy_commit_parts`: 自分のブランチへ、パーツの追加・更新・削除をコミットする。
  コミットはブランチの現在のスナップショット全体に変更を重ねたものになる。
  型と式は `definy_get_part` が返す JSON の形で渡す。他人のブランチには書けない
  (先に `definy_create_branch` で自分のブランチを作る)。プロジェクトが無ければ
  `main` への最初のコミットとして作成する。アカウントがサーバーに無ければ、
  書き込みの前にアカウント作成イベントを自動で送る

## 既知の制限

- パーツの中身の解決は、その場で評価できる定義の式だけが対象
  (`src/content_store.ts` の最初のパスと同じ)。definy 製の評価器 (wasm) が必要な
  定義は `content: null` になる。ブランチ作成や引き継ぎは content hash で行うので
  書き込みには影響しない
- 本番の Worker にはリソース上限があり、大きなプロジェクトへ新しいパーツを
  追加するコミットは上限に達して失敗することがある (2026-11-03 に `sample`
  プロジェクトで確認。コピーだけのブランチ作成や、小さいプロジェクトへの
  コミットは成功した)

## 設定

| 環境変数                    | 意味                                                              | 省略時                                             |
| --------------------------- | ----------------------------------------------------------------- | -------------------------------------------------- |
| `DEFINY_SERVER_URL`         | 接続先の definy サーバーの URL                                    | `https://definy.narumincho.com`                    |
| `DEFINY_ACCOUNT_SECRET_KEY` | 専用アカウントの秘密鍵 (ブラウザのログインと同じ URL-safe base64) | 無し (書き込み無効)                                |
| `DEFINY_ACCOUNT_NAME`       | 専用アカウントの名前 (アカウント作成に使う)                       | 無し (書き込み無効)                                |
| `DEFINY_PERF_TOKEN`         | パフォーマンス記録の読み取りトークン (サーバー側と一致させる)     | 無し (`definy_perf_recent_submits` がエラーになる) |
