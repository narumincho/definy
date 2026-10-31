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

| タグ                          | ペイロード                                                                                          | ホストがすること                                                                  |
| :---------------------------- | :-------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| `respond`                     | `definy.service-response` (`status`, `body: definy.json`)                                           | `body` を JSON にしてレスポンスにする                                             |
| `read_commits`                | `then: (commits: list<core.commit-summary>) -> definy.service-io`                                   | 受け付けたプロジェクトのコミット (ストアの順. `loadCommitSummaries`)              |
| `read_events`                 | `event_hashes`, `then: (events: list<option<definy.stored-event>>) -> ...`                          | そのハッシュの保存しているイベント (無ければ `none`)                              |
| `read_events_page`            | `event_type: option<string>`, `limit`, `offset`, `then: (events: list<definy.stored-event>) -> ...` | 保存しているイベントの 1 ページ (新しい順. `store.getEvents`)                     |
| `read_contents`               | `content_hashes`, `then: (items: list<option<definy.content-item>>) -> ...`                         | そのハッシュの CAS の中身 (無ければ `none`)                                       |
| `read_missing_content_hashes` | `content_hashes`, `then: (missing: list<string>) -> ...`                                            | CAS に無いハッシュ (`store.checkMissingHashes`)                                   |
| `read_account_created`        | `account_id`, `then: (created: boolean) -> ...`                                                     | そのアカウントの `create_account` を受け付けたか (`isAccountCreated`)             |
| `verify_signed_event`         | `signed_event_bytes`, `then: (result: definy.signed-event-verification) -> ...`                     | Ed25519 署名と中身の形を確かめ, `valid(definy.verified-event)` か `invalid(理由)` |
| `read_commit_check_input`     | `signed_event_bytes`, `then: (input: option<definy.commit-check-input>) -> ...`                     | プロジェクトのコミットの型検査に使うもの (`readCommitCheckInput`. 下を参照)       |
| `write_event`                 | `signed_event_bytes`, `then: (event_hash: string) -> ...`                                           | イベントを保存する (`store.submitEvent`)                                          |
| `hash_contents`               | `contents_bytes`, `then: (hashes: list<option<string>>) -> ...`                                     | Base64 の中身の SHA-256 (Base64 でなければ `none`)                                |
| `write_contents`              | `items`, `then: (stored: list<string>) -> ...`                                                      | 中身を CAS に保存する (`store.uploadContent`)                                     |

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
    中身 (Base64) も definy の値として Wasm を通るので, 200 件 (約 900KB) で 25ms ほどかかる。
  - `CheckMissingHashes` (`definy.check-missing-hashes`): CAS に無いハッシュを返す。
  - 型の違う値 (例: `eventHash` が数) は, 以前は TypeScript の例外で `internal` になっていたのを, 無いものとして扱うようにした。

- 書き込みの RPC (2026-10-29):
  - `SubmitEvent` (`definy.submit-event`): `signedEventBytes` の両端の空白を除き, 署名を確かめ (`verify_signed_event`),
    規則 (`core.check-event`), CAS に足りない中身 (`read_missing_content_hashes`. 足りなければ `missing_content` でそれを返す),
    型検査 (`definy.check-commit`. 下を参照) の順に見てから保存する (`write_event`)。理由が複数あれば改行でつないで `invalid_argument` にする。
  - (2026-10-30) 規則 `core.check-event` は `definy.submit-verified-event` の中で呼ぶ。`verify_signed_event` は
    `definy.verified-event` (イベントハッシュ, アカウント, 中身 `core.event-content`, 参照する content hash) を返し,
    中身は規則が見ない説明・メッセージ・パーツの中身の content hash を除いてある (`contentForCheck`)。中身の形 (`core.value-conforms`) も
    ここで確かめ, 違えば `invalid`。規則が使う事実はアカウントを作ったか (`read_account_created`) と, プロジェクトのコミットなら
    受け付けたコミット (`read_commits`) を読む。理由のメッセージは `definy.event-rejection-message` (以前は TypeScript の `eventRejectionMessage`)。
  - `UploadContent` (`definy.upload-content`): `items` を読み (`definy.json-content-items`), 中身の SHA-256 (`hash_contents`) が
    `contentHash` と違うものが 1 つでもあれば何も保存せずに `invalid_argument` にする (`definy.content-hash-mismatch`)。
    以前は Base64 でない中身や形の違う `items` が `internal` になっていたのを `invalid_argument` にした。

## 型検査 (`definy.check-commit`, 2026-10-31)

`SubmitEvent` のプロジェクトのコミットの型検査も, 何をどの順に確かめて何を返すかは definy が決める。

1. `read_commit_check_input` でホスト (`readCommitCheckInput`, `worker/type_check.ts`) が読むもの (`definy.commit-check-input`):
   コミットのパーツ (`definy.commit-check-part`. ID, `モジュール名.パーツ名`, モジュール, content hash, 中身),
   参照できるパーツ (`core.visibility-target`), 各プロジェクトの `main` の最新のパーツ (`core.type-checker` の `latest` の形),
   今の `main` のこのプロジェクトのモジュールの ID。プロジェクトのコミットでなければ `none`。
   - パーツの中身は, CAS の定義の式をコミットの中で評価したもの ([part-definition.md](part-definition.md))。評価できないか
     `core.part-content` の形でなければ `none`。ユーザーが作った定義のパーツで定義したパーツは `definition_check` に定義の式を入れる
   - ストアと CAS を読むこと, 定義の式の評価, パーツ ID (SHA-256) を求めること, 受け付けたコミットの中身のキャッシュはホストのまま
2. `definy.check-commit-input` が順に確かめ, 最初に見つかった種類の理由だけを返す
   - 中身が `core.part-content` にならないパーツ (`definy.commit-check-malformed`)
   - 参照できないパーツへの参照 (`core.check-reference-visibility`, メッセージは `definy.visibility-violation-message`)
   - 型: 型環境と何を検査するか (`to_check` / `without_expression`) は `core.type-checker` が決める。
     コミットのモジュールと今のプロジェクトのモジュールのパーツはまとめて置き換えるモジュール (`#replaced`) のものにする
     (`definy.commit-check-latest-entries` / `definy.commit-check-entries`)。式か型の無いパーツは
     コンパイラ組み込み (`definy.commit-check-part-builtin`) でなければ `part 'app.x': not supported: part has no expression or type`。
     検査するもの (`definy.commit-check-requests`: 定義の式, その後に `to_check` のパーツ) は
     `definy.type-check-requests-errors` が `core.type-checker` の返す `check` で 1 つずつ検査する (下を参照)

### 各パーツの検査 (`definy.type-check-request-error`, 2026-10-31)

以前はホストに `type_check_parts` で頼み, 型チェッカー (`wasm/type_checker.wasm`) の別のインスタンスで検査していた
(stage1 の出力が線形メモリを解放せず, 1 パーツ約 1.5MB ずつ増えたため)。出力を Wasm GC にした ([wasm-gc.md](wasm-gc.md)) ので,
service.wasm の中で `core.type-checker` の計画と同じインスタンスで検査するようにした。Worker は type_checker.wasm を取り込まない。

- 拒否するメッセージは `part '<モジュール名>.<パーツ名>': ` に続けて, 次のどれか (UI の `outcomeErrorMessage` と同じ形)
  - `not supported: part has no expression` / `part has no type` / `compiler built-in part (plus) cannot be type-checked` /
    `Expression has an unfilled hole` (`definy.type-check-unsupported`)。コンパイラ組み込みのパーツなら受け入れる
  - `type error: type_mismatch (expected: number, actual: string)` など (`definy.type-error-text`)。
    `located` は外し, 型は `definy.type-ast-text` で `List<number>`, `(value: number) -> number`, `{ a: number }`,
    `A | B(number)` などにする。パーツの参照は ID の先頭 8 文字, 組み込みの型は `builtin plus(left, right)`
    (引数名は `definy.builtin-parameters-text`. `BUILTIN_PARAMETERS` から作った), 文字列はダブルクォートで囲む (エスケープはしない)
- 未入力 (`hole`) は `core.type-check-against` が期待する型として受け入れるので, 先に `core.expression-contains-hole` で見る
- 数の表記は `std.number-to-string`, 文字列をつなぐのは `std.string-join` を使う
- 型チェッカーが trap すると (スタック不足など) `SubmitEvent` ごと `internal` になる (以前はそのパーツだけ `type checker failed`)
- core 全体 (と wasm) のシステムアカウントのコミットの `SubmitEvent` (`worker/type_check.test.ts` の組み込みのテスト) は 2.1 秒 → 2.7 秒

## 今後

- 定義の式の評価とパーツ ID の導出も definy にする
- `HttpProxyService` は EventService ではないので, まだ TypeScript。
