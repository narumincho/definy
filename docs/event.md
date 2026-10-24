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
  module_description: list<core.localized-text>,
  message: string,
  parent_commit_hash: option<string>,
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
    "module_description": [{ "language": "en", "text": "Math" }],
    "message": "Add answer",
    "parent_commit_hash": { "#none": null },
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

## 変えたこと (2026-10-24)

- 以前は中身を `{"ModuleCommit": {...}}` / `{"CreateAccount": {...}}` の TypeScript 側の形で書き,
  `content_hash` はバイト列, `part_type` / `parent_commit_hash` は `null` で無いことを表していた。
  サーバーは中身の形を検査していなかった。
- 作られることのなかった `ChangeProfile` (プロファイル変更) は `core.event-content` に入れず, UI の表示も消した。
- 以前の形のイベントは読めない (署名の検証で拒否される)。seed のイベントは指紋が変わるので新しいものに入れ替わる。

## 今後

- 形の検査を definy 製のパーツにして, サーバーの業務ロジック (イベントの受理) を definy へ移す
  ([self-hosting.md](self-hosting.md) の「service host 境界」)。
- 封筒 (署名・時刻) も definy の値で表すか。
