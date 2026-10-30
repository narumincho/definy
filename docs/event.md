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
  project_commit: core.project-commit,
}
core.project-commit = {               // docs/project.md
  project_name: string,
  branch: string,                 // docs/branch.md
  project_description: list<core.localized-text>,
  message: string,
  parent_commit_hash: option<string>,
  merged_commit_hash: option<string>,   // 取り込んだ他のブランチのコミット (docs/branch.md「取り込み」)
  modules: list<core.project-commit-module>,
}
core.project-commit-module = {
  name: string,
  description: list<core.localized-text>,
  visibility: core.visibility,    // docs/visibility.md
  parts: list<core.module-commit-part>,
}
core.module-commit-part = {
  name: string,
  content_hash: string,           // パーツの定義の式の CBOR の SHA-256 (URL-safe Base64)
}
// パーツの中身. イベントには入れず, 評価するとこの値になる定義の式 (core.define-part(...) など. docs/part-definition.md) を
// CAS に預ける (docs/content-addressed.md「差分ハッシュ・ネゴシエーション方式」)
core.part-content = {
  description: list<core.localized-text>,
  visibility: core.visibility,
  part_type: option<core.type-ast>,
  expression: option<core.expression>,
}
core.visibility = union { public, private }
core.localized-text = { language: string, text: string }
```

CBOR では [value-encoding.md](value-encoding.md) の形になる。例:

```json
{
  "#project_commit": {
    "project_name": "math",
    "branch": "main",
    "project_description": [],
    "message": "Add answer",
    "parent_commit_hash": { "#none": null },
    "merged_commit_hash": { "#none": null },
    "modules": [
      {
        "name": "math",
        "description": [{ "language": "en", "text": "Math" }],
        "visibility": { "#public": null },
        "parts": [{ "name": "answer", "content_hash": "Wm9v..." }]
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
  CAS に預けたパーツの中身 (定義の式) はイベントの形の検査を通らないので, サーバーは型を検査する前に
  定義の式を評価して `core.part-content` の形かを確かめ, 違えば拒否する (`worker/type_check.ts`, [part-definition.md](part-definition.md))。
  ブラウザも形の違う中身は読まない (`src/content_store.ts` の `loadContents`)。
- seed の JSON だけで書けるパーツ名の参照 `{"$part": ...}` はイベントの中には書けない (文字列の位置でも拒否する)。
- 検査の重さ: パーツの中身を CAS に分けたので, seed の core のコミットは CBOR で約 48 KB (Base64 で約 65 KB) と軽い。

## 形を definy で確かめる (`core.value-conforms`)

サーバーの `SubmitEvent` は, イベントの中身が `core.event-content` の形か, CAS に預けたパーツの定義の式を評価した値が `core.part-content` の形かを
definy 製の `core.value-conforms(value: core.value, declaration: core.expression, declarations: list<core.type-declaration-entry>) -> boolean`
で確かめる (`npm run build:seeds` が `wasm/shape_checker.wasm` にコンパイルする. コミットしない)。

- TypeScript は CBOR から読んだ値を `core.value` にし (`toCoreValue`), seeds/schemas/event-types.json の宣言を
  `{ id: 型パーツ名, declaration }` の一覧にして渡すだけ (`conformsInDefiny`, `src/event_check.ts`)。宣言の中の型パーツの参照も名前にする
- 形が違えばメッセージ `content must be a value of core.event-content` で拒否する (`verifySubmittedEvent`, `worker/event_check.ts`)。
  パーツの中身は, 受け付けたコミットが参照していない (まだ確かめていない) ものだけを確かめる (`worker/type_check.ts`)。
  core の全パーツの中身 (約 260) を確かめると 0.25 秒 (TypeScript は 0.06 秒) かかるため
- ブラウザと, 確かめた後に TypeScript の型にする `decodeEventContent` は今も TypeScript の `conformsToTypeDeclaration` を使う。
  両者が同じ結果になることを `src/event_check.test.ts` が確かめる

## 受け付ける規則 (`core.check-event`)

署名と形を確かめた後, イベントを受け付けるかは definy で書いたパーツ `core.check-event` が決める
(サーバーの業務ロジックを definy へ移す最初の一歩. [self-hosting.md](self-hosting.md) の「service host 境界」)。

```text
core.check-event(content: core.event-content, facts: core.event-check-facts) -> list<core.event-rejection>
// サーバーが渡すのは保存している事実だけ
core.event-check-facts = {
  account_id: string,                         // イベントのアカウント
  account_created: boolean,                   // そのアカウントの create_account を受け付けたか
  commits: list<core.commit-summary>,         // 受け付けたプロジェクトのコミット (ストアの順. プロジェクトのコミットでなければ空)
}
core.commit-summary = { event_hash, account_id, project_name, branch, time: number /* ミリ秒 */, module_names: list<string> }
// 規則が使う状態は definy の core.event-check-state-of が facts から求め, core.check-event-in-state に渡す
core.event-check-state = {
  account_created: boolean,
  branch_latest_commit_hash: option<string>,  // コミット先のブランチの最新のコミット
  is_branch_creator: boolean,                 // このアカウントがコミット先のブランチを作った (最初のコミットをした) か
  merged_in_project: boolean,                 // merged_commit_hash がそのプロジェクトのコミットか
  modules_in_other_projects: list<string>,    // コミットのモジュール名のうち他のプロジェクトのもの (docs/project.md)
  parent_in_project: boolean,                 // parent_commit_hash がそのプロジェクトのコミットか
  project_has_commits: boolean,
}
```

返した理由が空なら受け付ける。今の規則:

| イベント         | 規則                                                                                                     | 理由 (`core.event-rejection`)                                                       |
| :--------------- | :------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| `create_account` | 同じアカウントで 2 回作れない                                                                            | `account_already_created`                                                           |
| `create_account` | 名前は空にできない                                                                                       | `empty_account_name`                                                                |
| `project_commit` | 先にアカウントを作る                                                                                     | `account_not_created`                                                               |
| `project_commit` | プロジェクト名は空にできない                                                                             | `empty_project_name`                                                                |
| `project_commit` | ブランチ名は空にできない                                                                                 | `empty_branch_name`                                                                 |
| `project_commit` | ブランチの規則 (`core.check-event-branch`. [branch.md](branch.md))                                       | `first_branch_must_be_main`, `not_branch_creator`, `parent_commit_mismatch`         |
| `project_commit` | 取り込むのは同じプロジェクトのコミット (`core.check-event-merge`)                                        | `merged_commit_not_in_project`                                                      |
| `project_commit` | モジュール名は空にできず, 重複できず, 他のプロジェクトのものは使えない (`core.check-event-module-names`) | `empty_module_name`, `duplicate_module_name(name)`, `module_in_other_project(name)` |
| `project_commit` | パーツ名はモジュールの中で空にできず, 重複できない (`core.check-event-part-names`)                       | `empty_part_name`, `duplicate_part_name(name)`                                      |

- プロジェクトはプロジェクト名だけで決まり, ブランチを持つ ([project.md](project.md))。ブラウザは表示しているブランチから
  コミット先のブランチと親を決める (`commitTarget`, `src/branches.ts`. [branch.md](branch.md))
- 「最新」はイベントの時刻 (`time`) が最大のコミット (`pickLatestCommitPerProject`)。同じ秒の 2 つのコミットは先のものが最新のままになる
- 規則はサーバーの `definy.submit-event` (`wasm/service.wasm`. [service.md](service.md)) の中で呼ぶ (2026-10-30)。
  ホストは署名と中身の形を確かめ (`verify_signed_event`. `worker/event_check.ts`), 規則が使う事実 (アカウントを作ったか `read_account_created`,
  受け付けたコミットの一覧 `read_commits`) を読むだけ。理由の英語のメッセージも definy (`definy.event-rejection-message`) が作る。
  拒否は Connect-RPC の `invalid_argument` (400)。`wasm/event_checker.wasm` (`core.check-event` だけをコンパイルしたもの) はテストで規則を試すのに使う
- ブランチの最新のコミット・作成者・他のプロジェクトのモジュールなどの状態も definy (`core.event-check-state-of`) が求める
  (以前は TypeScript の `branchStateOf` が求めていた)。全コミットを毎回渡し, 各コミットについて最新かを調べるので O(コミット数²)
- 規則は説明やパーツの中身の content hash を見ないので, それらを除いてから線形メモリに書く
- 型検査 (`checkSubmittedProjectCommit`) はこの規則に通ってから行う
- 型チェッカーと同じく, 本番で `core.check-event` を編集しても seed に書き戻してデプロイするまでサーバーには反映されない

## 変えたこと (2026-10-24)

- 以前は中身を `{"ModuleCommit": {...}}` / `{"CreateAccount": {...}}` の TypeScript 側の形で書き,
  `content_hash` はバイト列, `part_type` / `parent_commit_hash` は `null` で無いことを表していた。
  サーバーは中身の形を検査していなかった。
- (2026-10-25) コミットはモジュール単位の `module_commit` だったのを, プロジェクト単位の `project_commit` にした ([project.md](project.md))。
- 作られることのなかった `ChangeProfile` (プロファイル変更) は `core.event-content` に入れず, UI の表示も消した。
- 以前の形のイベントは読めない (署名の検証で拒否される)。seed のイベントは指紋が変わるので新しいものに入れ替わる。

## 今後

- 受け付ける規則は `core.check-event` にした (上)。形の検査 (`conformsToTypeDeclaration`) や, 規則が使う状態を集めること
  (アカウントを作ったか・ブランチの状態) も definy へ移す ([self-hosting.md](self-hosting.md) の「service host 境界」)。
- モジュールはアカウントから切り離し, ブランチだけで編集するようにした ([branch.md](branch.md))。ブランチの取り込み (マージ) は `merged_commit_hash` で表す ([branch.md](branch.md)「取り込み」)。
- 封筒 (署名・時刻) も definy の値で表すか。
