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

| タグ                          | ペイロード                                                                                          | ホストがすること                                                                          |
| :---------------------------- | :-------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| `respond`                     | `definy.service-response` (`status`, `body: definy.json`)                                           | `body` を JSON にしてレスポンスにする                                                     |
| `read_commits`                | `then: (commits: list<core.commit-summary>) -> definy.service-io`                                   | 受け付けたプロジェクトのコミット (ストアの順. `loadCommitSummaries`)                      |
| `read_events`                 | `event_hashes`, `then: (events: list<option<definy.stored-event>>) -> ...`                          | そのハッシュの保存しているイベント (無ければ `none`)                                      |
| `read_events_page`            | `event_type: option<string>`, `limit`, `offset`, `then: (events: list<definy.stored-event>) -> ...` | 保存しているイベントの 1 ページ (新しい順. `store.getEvents`)                             |
| `read_contents`               | `content_hashes`, `then: (items: list<option<definy.content-item>>) -> ...`                         | そのハッシュの CAS の中身 (無ければ `none`)                                               |
| `read_missing_content_hashes` | `content_hashes`, `then: (missing: list<string>) -> ...`                                            | CAS に無いハッシュ (`store.checkMissingHashes`)                                           |
| `verify_signed_event`         | `signed_event_bytes`, `then: (result: definy.signed-event-verification) -> ...`                     | Ed25519 署名を確かめ, `valid({event_hash, referenced_content_hashes})` か `invalid(理由)` |
| `check_event_rules`           | `signed_event_bytes`, `then: (rejections: list<string>) -> ...`                                     | 受け付ける規則 (`core.check-event`) で検査した理由 (`checkSubmittedEvent`)                |
| `type_check_commit`           | `signed_event_bytes`, `then: (errors: list<string>) -> ...`                                         | プロジェクトのコミットの型エラー (`checkSubmittedProjectCommit`)                          |
| `write_event`                 | `signed_event_bytes`, `then: (event_hash: string) -> ...`                                           | イベントを保存する (`store.submitEvent`)                                                  |
| `hash_contents`               | `contents_bytes`, `then: (hashes: list<option<string>>) -> ...`                                     | Base64 の中身の SHA-256 (Base64 でなければ `none`)                                        |
| `write_contents`              | `items`, `then: (stored: list<string>) -> ...`                                                      | 中身を CAS に保存する (`store.uploadContent`)                                             |

- 処理が使えるのはホストが用意した要求だけ (能力)。書き込みも, 署名の検証や保存そのものはホストが行い,
  何をどの順に確かめて何を返すかを definy が決める。HTTP はまだ TypeScript。
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

- 書き込みの RPC (2026-10-29):
  - `SubmitEvent` (`definy.submit-event`): `signedEventBytes` の両端の空白を除き, 署名を確かめ (`verify_signed_event`),
    規則 (`check_event_rules`), CAS に足りない中身 (`read_missing_content_hashes`. 足りなければ `missing_content` でそれを返す),
    型チェッカー (`type_check_commit`) の順に見てから保存する (`write_event`)。理由が複数あれば改行でつないで `invalid_argument` にする。
  - `UploadContent` (`definy.upload-content`): `items` を読み (`definy.json-content-items`), 中身の SHA-256 (`hash_contents`) が
    `contentHash` と違うものが 1 つでもあれば何も保存せずに `invalid_argument` にする (`definy.content-hash-mismatch`)。
    以前は Base64 でない中身や形の違う `items` が `internal` になっていたのを `invalid_argument` にした。

## 今後

- 規則 (`core.check-event`) と型チェッカーの呼び出しも `definy.submit-event` の中で行う。今はホストが事実を集めて検査し, 理由だけを返している。
- `HttpProxyService` は EventService ではないので, まだ TypeScript。
