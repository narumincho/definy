# サーバーの RPC を definy で処理する

[self-hosting.md](self-hosting.md) の「service host 境界」の一歩。サーバー (Cloudflare Workers) の RPC のうち,
definy 製の処理があるものは TypeScript ではなく definy の関数で処理する。

## 仕組み

- 入口は `definy.handle-rpc(method)`。`method` は `/definy.v1.EventService/` の後の名前 (`GetProjectBranches` など)。
  definy で処理するメソッドなら `#some(リクエストの本文 → definy.service-io)`, まだ TypeScript で処理するものは `#none`。
- `npm run build:seeds` が stage1 で `wasm/service.wasm` (コミットしない) にコンパイルし, Worker が `?module` で取り込む
  (Workers は実行時に Wasm をコンパイルできない)。
- `worker/index.ts` の `handleRpc` は, EventService のメソッドをまず `handleRpcInDefiny` (`worker/service_io.ts`) に渡し,
  `null` (definy で処理しない) なら今までの TypeScript の `switch` で処理する。本文は definy で処理するときだけ読む。

## `definy.service-io`

処理は I/O をせず, 何を読みたいかを値で返す ([wasi-io.md](wasi-io.md) の `wasi.io` と同じ考え方)。ホスト
(`handleRpcInDefiny`) が読んで `then` に渡し, `respond` が返るまで続ける。

| タグ           | ペイロード                                                                 | ホストがすること                                                     |
| :------------- | :------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| `respond`      | `definy.service-response` (`status`, `body: definy.json`)                  | `body` を JSON にしてレスポンスにする                                |
| `read_commits` | `then: (commits: list<core.commit-summary>) -> definy.service-io`          | 受け付けたプロジェクトのコミット (ストアの順. `loadCommitSummaries`) |
| `read_events`  | `event_hashes`, `then: (events: list<option<definy.stored-event>>) -> ...` | そのハッシュの保存しているイベント (無ければ `none`)                 |

- 処理が読めるのはホストが用意した要求だけ (能力)。書き込み・署名の検証・HTTP はまだ TypeScript。
- `definy.json` は JSON の値 (`null`, `boolean`, `number`, `string`, `array`, `object`)。リクエストの本文と
  レスポンスの本文はこれで渡す (`jsonToDefiny` / `definyToJson`)。definy の数は 64 ビットの整数なので, 整数でない数は扱えない。

## definy で処理する RPC

- `GetProjectBranches` (`definy.get-project-branches`, 2026-10-27): コミットを読み, `core.project-branches` でブランチにまとめ,
  各ブランチの最新のイベントを読んで返す。最新のイベントが見つからないブランチは除く ([branch.md](branch.md))。

## 今後

- ほかの読み取りの RPC (`GetEvent`, `GetEvents` など) も移す。ストアの読み方 (`read_*`) を足していく。
- 書き込み (`SubmitEvent`) は, 署名の検証と D1 への書き込みを能力として渡せるようになってから。
