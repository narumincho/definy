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
| `read_commit_check_input`     | `signed_event_bytes`, `then: (input: option<definy.commit-check-source>) -> ...`                    | プロジェクトのコミットの型検査に使うもの (`readCommitCheckInput`. 下を参照)       |
| `read_part_definitions`       | `part_ids`, `then: (definitions: list<option<core.expression>>) -> ...`                             | コミットの外のパーツ (各プロジェクトの `main` の最新) の定義の式                  |
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

1. `read_commit_check_input` でホスト (`readCommitCheckInput`, `worker/type_check.ts`) が読むもの (`definy.commit-check-source`):
   コミットのパーツ (`definy.commit-check-source-part`. ID, `モジュール名.パーツ名`, モジュール, content hash, CAS の定義の式),
   参照できるパーツ (`core.visibility-target`), 各プロジェクトの `main` の最新のパーツ (`core.type-checker` の `latest` の形),
   今の `main` のこのプロジェクトのモジュールの ID。プロジェクトのコミットでなければ `none`。
   - 定義の式は CAS に無いか CBOR でないか `core.expression` の形でなければ `none` (受け付けたコミットの中身は形を確かめない)
   - ストアと CAS を読むこと, 型環境 (`latest`) の中身を求めること
     (main の最新のコミットの定義の評価を含む) と受け付けたコミットの中身のキャッシュはホストのまま。パーツ ID は definy で求める (下の「パーツ ID の導出」)
   - 定義の式を評価してパーツの中身にするのは definy (下の「定義の式の評価」)
2. `definy.check-commit-input` が順に確かめ, 最初に見つかった種類の理由だけを返す
   - 中身が `core.part-content` にならないパーツ (`definy.commit-check-malformed`)
   - 参照できないパーツへの参照 (`core.check-reference-visibility`, メッセージは `definy.visibility-violation-message`)
   - 型: 型環境と何を検査するか (`to_check` / `without_expression`) は `core.type-checker` が決める。
     コミットのモジュールと今のプロジェクトのモジュールのパーツはまとめて置き換えるモジュール (`#replaced`) のものにする
     (`definy.commit-check-latest-entries` / `definy.commit-check-entries`)。式か型の無いパーツは
     コンパイラ組み込み (`definy.commit-check-part-builtin`) でなければ `part 'app.x': not supported: part has no expression or type`。
     検査するもの (`definy.commit-check-requests`: 定義の式, その後に `to_check` のパーツ) は
     `definy.type-check-requests-errors` が `core.type-checker` の返す `check` で 1 つずつ検査する (下を参照)

### 定義の式の評価 (`definy.resolve-commit-contents`, 2026-10-31)

以前はホスト (`commitContents`) が定義の式を TypeScript で読み, 評価器 (`wasm/definition_evaluator.wasm`) を別のインスタンスで動かしていた。
今は service.wasm の中で definy が求め, 中身を付けたパーツ (`definy.commit-check-part`) を `definy.check-commit-input` に渡す。

1. `core.define-part` / `core.define-type` の呼び出しで引数がリテラルのものは評価器を使わずに読む (`definy.immediate-part-content`)。
   読めるリテラルは [part-definition.md](part-definition.md)「読み方」と同じ (説明・`public` / `private`・`none` / `some(quote(e).expression)`)。
   型の付いた値に読めなければ (呼び出しの形だが `core.part-content` にならなければ) 中身は `none` で, 評価器でも評価しない
2. それ以外の定義の式は評価器で評価する。評価で参照するコミットの外のパーツの式は, `quote` の外の参照 (`definy.evaluated-part-references`) を
   たどって `read_part_definitions` で読む (`definy.collect-evaluation-parts`。外のパーツは 1 の形の定義のものだけ使える)
3. `core.eval-value` で評価し, 値 (`core.value`) を `core.value-to-part-content` で `core.part-content` にする
   ([value-decoder.md](value-decoder.md)。形が違えば `none`)。以前 (2026-11-01 まで) は definy に `core.value` を型の付いた値にする関数が無く,
   `decode_part_contents` でホストに頼んでいた。
   求まったパーツの式を使って, 求まるものがある間繰り返す (`definy.evaluate-pending-definitions`)。評価器で求めたパーツは
   定義の式も型検査する (`definition_check`)

- 評価器は参照するパーツが無くても (`unit` になるだけで) 止まらないので, 以前のように「参照するパーツがすべて揃っているか」は先に見ない。
  揃っていない定義は値が `core.part-content` にならないか, 定義の式の型検査で見つかる
- 評価器が trap すると (無限の再帰によるスタック不足など) `SubmitEvent` ごと `internal` になる (以前はそのパーツだけ評価できない扱い)

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
- 未入力 (`hole`) は `core.type-check-against` が期待する型として受け入れるので, 先に `core.expression-contains-hole` で見る。
  未入力が全て推論できる型引数 (未確定の型引数. [type-arguments.md](type-arguments.md)) なら受け付ける
  (`definy.holes-are-inferred-type-arguments`: `core.expression-probe-hole` で i 番目の未入力を probe にして検査し,
  `hole_expected_type` の `inferred_type_argument` が `some` か見る。数は `core.expression-hole-count`)
- 数の表記は `std.number-to-string`, 文字列をつなぐのは `std.string-join` を使う
- 型チェッカーが trap すると (スタック不足など) `SubmitEvent` ごと `internal` になる (以前はそのパーツだけ `type checker failed`)
- core 全体 (と wasm) のシステムアカウントのコミットの `SubmitEvent` (`worker/type_check.test.ts` の組み込みのテスト) は 2.1 秒 → 2.7 秒

## パーツ ID の導出 (`core.module-part-ids`, 2026-10-31)

サーバーがコミットのパーツの ID (とモジュール ID) を求めるのも definy 製の関数にした。以前は TypeScript (`deriveModuleIdBytes` /
`deriveModulePartId`) だった。TypeScript 版は `src/part_ids.ts` に 1 つだけ残し (同期. TypeScript で書いた SHA-256), シードの生成
(`npm run build:seeds` は `part_id_deriver.wasm` を作る前に ID が要る) とブラウザで使う。以前は Web Crypto を使う async 版の
`worker/cbor.ts` もあったが, 同じ導出の重複なので 2026-11-01 に消した。

- 導出のしかたは変えていない: モジュール ID は `"definy:module:" + モジュール名` の UTF-8 に SHA-256 を 2 回 (`core.module-id-bytes`),
  パーツ ID は `モジュール ID の 32 バイト + ":part:" + パーツ名` に SHA-256 を 2 回かけて Base64URL (パディング無し) にしたもの (`core.part-id`)
- SHA-256 は `core.sha256` (FIPS 180-4)。32 ビットのワードを 64 ビットの数で持ち, 足し算のたびに `core.uint32` (下位 32 ビット) にする。
  回転は `core.rotate-right-32`。ビット演算の組み込み ([builtin-parts.md](builtin-parts.md)) を使う。Base64URL は `core.bytes-to-base64url`
- `npm run build:seeds` が `core.module-part-ids(module_name, part_names) -> {module_id, part_ids}` を `wasm/part_id_deriver.wasm` にコンパイルし,
  `worker/type_check.ts` (コミットのパーツの一覧) が `src/part_ids.ts` の `derivePartIds` で呼ぶ。
  ID は名前だけで決まるので, 求めた ID は isolate の中で使い回し, 新しい名前の分だけ definy で求める (コミットはどれも同じ名前のパーツが多い)。
  seed の全パーツ (674) を初めて求めると 180ms ほど (1 パーツ 0.3ms. SHA-256 を 2 回)。2 回目からは使い回すので 0.1ms
- `src/part_ids.test.ts` で `core.sha256` を `node:crypto` と, パーツ ID を TypeScript の導出と比べている
- ブラウザ (`src/new_part.ts` など) と seed を作るスクリプト (`scripts/generate_seed_bundle.ts`) はまだ TypeScript の導出を使う。
  seed のスクリプトは stage1 でパーツをコンパイルする前にパーツ ID が要る (`$part` の名前参照を ID にする) ので TypeScript のままにする

## 今後

- 型環境 (main の最新のコミット) の定義の式の評価も definy にする
- `HttpProxyService` は EventService ではないので, まだ TypeScript。
