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

| タグ                          | ペイロード                                                                                          | ホストがすること                                                     |
| :---------------------------- | :-------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| `respond`                     | `definy.service-response` (`status`, `body: definy.json`)                                           | `body` を JSON にしてレスポンスにする                                |
| `read_commits`                | `then: (commits: list<core.commit-summary>) -> definy.service-io`                                   | 受け付けたプロジェクトのコミット (ストアの順. `loadCommitSummaries`) |
| `read_events`                 | `event_hashes`, `then: (events: list<option<definy.stored-event>>) -> ...`                          | そのハッシュの保存しているイベント (無ければ `none`)                 |
| `read_events_page`            | `event_type: option<string>`, `limit`, `offset`, `then: (events: list<definy.stored-event>) -> ...` | 保存しているイベントの 1 ページ (新しい順. `store.getEvents`)        |
| `read_contents`               | `content_hashes`, `then: (items: list<option<definy.content-item>>) -> ...`                         | そのハッシュの CAS の中身 (無ければ `none`)                          |
| `read_missing_content_hashes` | `content_hashes`, `then: (missing: list<string>) -> ...`                                            | CAS に無いハッシュ (`store.checkMissingHashes`)                      |

- 処理が読めるのはホストが用意した要求だけ (能力)。書き込み・署名の検証・HTTP はまだ TypeScript。
- エラーは `definy.rpc-error(code, message)` で返す (Connect のエラー `{code, message}` とコードのステータス.
  [connect-rpc.md](connect-rpc.md))。リクエストは `definy.json-get-string` などで読み, 型が違う値は無いものとして扱う。
- `definy.json` は JSON の値 (`null`, `boolean`, `number`, `string`, `array`, `object`)。リクエストの本文と
  レスポンスの本文はこれで渡す (`jsonToDefiny` / `definyToJson`)。definy の数は 64 ビットの整数なので, 整数でない数は扱えない。

## definy で処理する RPC

- `GetProjectBranches` (`definy.get-project-branches`, 2026-10-27): コミットを読み, `core.project-branches` でブランチにまとめ,
  各ブランチの最新のイベントを読んで返す。最新のイベントが見つからないブランチは除く ([branch.md](branch.md))。
- 読み取りの RPC (2026-10-27):
  - `GetEvent` (`definy.get-event`): `eventHash` の両端の空白 (`definy.string-trim`. 空白・タブ・改行) を除いて読む。
  - `GetEvents` (`definy.get-events`): `limit` を 1 から 500 (無ければ 50) に, `offset` を 0 以上にし, 空の `eventType` は指定しない。
  - `GetContent` (`definy.get-content`): `contentHash` があればその中身 (`item`), 無ければ `contentHashes` のうち見つかった中身 (`items`)。
    中身 (Base64) も definy の線形メモリを通るので, 200 件 (約 900KB) で 25ms ほどかかる。
  - `CheckMissingHashes` (`definy.check-missing-hashes`): CAS に無いハッシュを返す。
  - 型の違う値 (例: `eventHash` が数) は, 以前は TypeScript の例外で `internal` になっていたのを, 無いものとして扱うようにした。

## 今後

- 書き込み (`SubmitEvent`, `UploadContent`) は, 署名の検証と D1 への書き込みを能力として渡せるようになってから。
- `HttpProxyService` は EventService ではないので, まだ TypeScript。
