# パーツの定義もパーツ (定義の式)

パーツの中身 (説明・公開/非公開・型・式) は, パーツを定義する式で書きます。
定義の式は評価すると `core.part-content` の値になる普通の `core.expression` で,
ふつうは定義のパーツ `core.define-part` か, それを使う `core.define-type` の呼び出しです。
定義のパーツも普通のパーツなので, 同じ形で便利な定義のパーツを足せます。

```text
core.define-part: (
  description: List<core.localized-text>,
  visibility: core.visibility,
  part_type: option<core.type-ast>,
  expression: option<core.expression>,
) -> core.part-content
  = (description, visibility, part_type, expression) => { description, visibility, part_type, expression }

core.define-type: (description, visibility, expression: core.expression) -> core.part-content
  = (description, visibility, expression) =>
      core.define-part(description, visibility, part_type: some(type), expression: some(expression))
```

型パーツ `core.visibility` の中身は次の式です (CBOR にして CAS に預ける)。

```text
core.define-type(
  description: [{ language: "en", text: "..." }, ...],
  visibility: public,
  expression: quote(union { public, private }).expression,
)
```

## 名前は定義の式の外

パーツの名前は定義の式に入れず, これまでどおりコミット (`core.module-commit-part` の `name`) に置きます
(2026-10-29 にユーザーが決定カードで選んだ)。パーツ ID は `sha256(モジュール ID + ":part:" + 名前)` なので,
評価しなくても ID が決まり, 他のパーツからの参照やサーバーの検査は今までと同じ仕組みで済みます。
名前も定義の式の中に入れる案は, ID を知るためにも評価が要り, 名前の重複もコミットの検査で調べることになるので選ばなかった。

## 書き方 (`src/part_definition.ts`)

- `partDefinitionExpression(content)`: 中身から定義の式を作る。型が `type` で式があれば `core.define-type`,
  それ以外 (型を返す関数 `core.option` なども) は `core.define-part`。同じ中身からは同じ式になるので content hash も変わらない
- 引数の値は評価するとその値になるリテラルの式で書く (`literalExpression`)。タグ付きの値は型パーツを指定しない
  Variant (`type_part: none`)。パーツの式は `quote(e).expression` で書く (quote の値は `core.code` なので `.expression` を取る)
- パーツの型は型の式 ([type-expression.md](type-expression.md)) なので, 式と同じく `quote(T).expression` で書く
  (`part_type: some(quote((x: number) -> string).expression)`)。`core.define-type` は型を `type_type` にする

## 読み方 (評価)

定義の式の意味は評価した値です。ただ, 中身を読むたびに stage1 でコンパイルするのは重いので,
`evaluatePartDefinition` は評価器を動かさず, 定義の式に書ける形だけをその場で評価します。

- 数値・文字列・真偽値・リスト・レコード・Variant のリテラル
- `quote(e).expression` (`e` そのもの. `core.code` の `part_ids` は求めない)
- `core.define-part` / `core.define-type` の呼び出し (seeds/core.json の 2 つの式と同じことをする)

これ以外の式 (変数・他のパーツの呼び出しなど) は読まない (`undefined`)。結果は `core.part-content` の形かを確かめてから使う
(ブラウザは `isPartContent`, サーバーは受け付けていない中身を definy 製の `core.value-conforms` で確かめる. [event.md](event.md))。
ここでの評価が stage1 で定義の式を評価した結果と同じことは `src/part_definition.test.ts` で確かめている。

使うところ: `partContentItem` / `loadContents` ([src/content_store.ts](../src/content_store.ts)),
サーバーの `SubmitEvent` の検査と型環境 ([worker/type_check.ts](../worker/type_check.ts)), seed の書き出し
([seed-export.md](seed-export.md))。seeds/\*.json はこれまでどおり `description` / `part_type` / `expression` を並べて書き,
`npm run build:seeds` が定義の式にして CAS に入れる。

## 大きさ

seed の CAS の中身 500 個の CBOR は, `core.part-content` の値そのものを預けていたときの約 1.34 MB から約 1.85 MB になった。
増えたのは主にパーツの型のリテラル (Variant ごとに `tag` / `payload` / `type_part` を持つ) と説明のリテラル。
コミットのイベントの大きさは変わらない (名前と content hash だけ)。

## まだ無いもの

- ユーザーが作った定義のパーツ (例: `my.define-record-type(...)` が `core.define-type` を呼ぶ) の呼び出しを読むこと。
  読む側が参照するパーツの式を集めて評価器で評価する必要がある (今は読まない形として拒否する)
- エディタでの定義の式の編集。エディタはこれまでどおり説明・型・式を別々に編集し, コミットするときに定義の式にする
- 定義の式の型検査 (`core.part-content` になるか)。今は評価した値の形を確かめるだけ
