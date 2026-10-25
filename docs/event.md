# イベントの形

definy のデータはすべて署名済みイベントの列で、イベントの中身 (アカウントが何をしたか) は definy の型パーツ
`core.event-content` の値として書く。TypeScript の側にはイベントの形を決める型定義を置かず,
seeds/core.json の宣言が正本になる (definy が definy 自身のデータを表す一歩)。

## 外側 (署名の封筒)

```text
SignedEvent = { signature: bytes(64), event_binary: tag24(内側のイベントの CBOR) }
内側のイベント = { account_id: bytes(32), time: tag1(エポック秒), content: core.event-content の値 }
```

- 封筒は CBOR のまま。署名・公開鍵のバイト列と時刻のタグは definy の値 ([value-encoding.md](value-encoding.md)) に無いため。
- イベントハッシュは `SignedEvent` の CBOR の SHA-256 (URL-safe Base64)。

## 中身 (`core.event-content`)

```text
core.event-content = union {
  create_account: { account_name: string },
  module_commit: core.module-commit,
}
core.module-commit = {
  module_name: string,
  branch: string,                 // docs/branch.md
  module_description: list<core.localized-text>,
  message: string,
  parent_commit_hash: option<string>,
  merged_commit_hash: option<string>,   // 取り込んだ他のブランチのコミット (docs/branch.md「取り込み」)
  parts: list<core.module-commit-part>,
}
core.module-commit-part = {
  name: string,
  description: list<core.localized-text>,
  part_type: option<core.type-ast>,
  expression: option<core.expression>,
  content_hash: option<string>,   // 式を CAS に預けたとき (URL-safe Base64)
}
core.localized-text = { language: string, text: string }
```

CBOR では [value-encoding.md](value-encoding.md) の形になる。例:

```json
{
  "#module_commit": {
    "module_name": "math",
    "branch": "main",
    "module_description": [{ "language": "en", "text": "Math" }],
    "message": "Add answer",
    "parent_commit_hash": { "#none": null },
    "merged_commit_hash": { "#none": null },
    "parts": [
      {
        "name": "answer",
        "description": [],
        "part_type": { "#some": { "#number": null } },
        "expression": { "#some": { "#number": 42 } },
        "content_hash": { "#none": null }
      }
    ]
  }
}
```

## 作る・読む・検査する

- 作る・読むのは [src/event_content.ts](../src/event_content.ts) (`encodeEventContent` / `decodeEventContent`)。
  署名は `src/auth.ts`, seed のイベントは `scripts/generate_seed_bundle.ts` がこれで中身を作る。
- 読むときは必ず `core.event-content` の形かを `conformsToTypeDeclaration` (seed の検査と同じ関数, `src/seed_schema.ts`) で確かめる。
  宣言は `npm run build:schema` が seeds/core.json から `core.event-content` とそこから参照をたどれる型パーツ
  (`core.expression`, `core.type-ast` など) だけを seeds/schemas/event-types.json に書き出したもの
  (seeds/core.json は数 MB あるのでブラウザ・Worker に丸ごと載せない)。`src/seed_schema.test.ts` が作り直したものと同じかを確かめる。
- 形が違うイベントは署名が正しくても `InvalidSignedEventError` になる (`src/signed_event.ts`)。
  サーバーの `SubmitEvent` は 400 で拒否し, ブラウザは受け取ったイベントを「不正」として表示から外す。
  そのため, 式が `core.expression` の形でないコミットは型チェッカーに渡る前に拒否される。
- seed の JSON だけで書けるパーツ名の参照 `{"$part": ...}` はイベントの中には書けない (文字列の位置でも拒否する)。
- 検査の重さ: seed の core のコミット (CBOR で約 1.6 MB) で 50 ms 程度。CBOR のデコードのほうが重い。

## 受け付ける規則 (`core.check-event`)

署名と形を確かめた後, イベントを受け付けるかは definy で書いたパーツ `core.check-event` が決める
(サーバーの業務ロジックを definy へ移す最初の一歩. [self-hosting.md](self-hosting.md) の「service host 境界」)。

```text
core.check-event(content: core.event-content, state: core.event-check-state) -> list<core.event-rejection>
core.event-check-state = {
  account_created: boolean,
  branch_latest_commit_hash: option<string>,  // コミット先のブランチの最新のコミット
  is_branch_creator: boolean,                 // このアカウントがコミット先のブランチを作ったか
  merged_in_module: boolean,                  // merged_commit_hash がそのモジュールのコミットか
  module_has_commits: boolean,
  parent_in_module: boolean,                  // parent_commit_hash がそのモジュールのコミットか
  merged_in_module: boolean,                  // merged_commit_hash がそのモジュールのコミットか
}
```

返した理由が空なら受け付ける。今の規則:

| イベント         | 規則                                                               | 理由 (`core.event-rejection`)                                               |
| :--------------- | :----------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| `create_account` | 同じアカウントで 2 回作れない                                      | `account_already_created`                                                   |
| `create_account` | 名前は空にできない                                                 | `empty_account_name`                                                        |
| `module_commit`  | 先にアカウントを作る                                               | `account_not_created`                                                       |
| `module_commit`  | モジュール名は空にできない                                         | `empty_module_name`                                                         |
| `module_commit`  | ブランチ名は空にできない                                           | `empty_branch_name`                                                         |
| `module_commit`  | ブランチの規則 (`core.check-event-branch`. [branch.md](branch.md)) | `first_branch_must_be_main`, `not_branch_creator`, `parent_commit_mismatch` |
| `module_commit`  | 取り込むのは同じモジュールのコミット (`core.check-event-merge`)    | `merged_commit_not_in_module`                                               |
| `module_commit`  | パーツ名は空にできず, 重複できない (`core.check-event-part-names`) | `empty_part_name`, `duplicate_part_name(name)`                              |

- モジュールはモジュール名だけで決まり (`deriveModuleIdBytes`), ブランチを持つ。ブラウザは表示しているブランチから
  コミット先のブランチと親を決める (`commitTarget`, `src/branches.ts`. [branch.md](branch.md))
- 「最新」はイベントの時刻 (`time`) が最大のコミット (`pickLatestCommitPerModule`)。同じ秒の 2 つのコミットは先のものが最新のままになる
- 規則は `npm run build:seeds` が stage1 でコンパイルした `wasm/event_checker.wasm` (コミットしない) で動く。
  Worker は `?module` で取り込み (`worker/event_check.ts`), TypeScript 側は規則が使う状態 (アカウントを作ったか, コミット先のブランチの最新のコミットと作成者など) を
  ストアから集めて渡し, 返った理由を英語のメッセージにするだけ (`src/event_check.ts`)。拒否は Connect-RPC の `invalid_argument` (400)
- 規則は式を見ないので, モジュールのコミットはパーツ名だけにしてから線形メモリに書く (core のコミットは式で数 MB ある)
- 型検査 (`checkSubmittedModuleCommit`) はこの規則に通ってから行う
- 型チェッカーと同じく, 本番で `core.check-event` を編集しても seed に書き戻してデプロイするまでサーバーには反映されない
- デバッグ用の `DebugService/SubmitUnverifiedEvent` は規則も確かめない

## 変えたこと (2026-10-24)

- 以前は中身を `{"ModuleCommit": {...}}` / `{"CreateAccount": {...}}` の TypeScript 側の形で書き,
  `content_hash` はバイト列, `part_type` / `parent_commit_hash` は `null` で無いことを表していた。
  サーバーは中身の形を検査していなかった。
- 作られることのなかった `ChangeProfile` (プロファイル変更) は `core.event-content` に入れず, UI の表示も消した。
- 以前の形のイベントは読めない (署名の検証で拒否される)。seed のイベントは指紋が変わるので新しいものに入れ替わる。

## 今後

- 受け付ける規則は `core.check-event` にした (上)。形の検査 (`conformsToTypeDeclaration`) や, 規則が使う状態を集めること
  (アカウントを作ったか・ブランチの状態) も definy へ移す ([self-hosting.md](self-hosting.md) の「service host 境界」)。
- モジュールはアカウントから切り離し, ブランチだけで編集するようにした ([branch.md](branch.md))。ブランチの取り込み (マージ) は `merged_commit_hash` で表す ([branch.md](branch.md)「取り込み」)。
- 封筒 (署名・時刻) も definy の値で表すか。
