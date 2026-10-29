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

## ユーザーが作った定義のパーツ

`core.define-part` / `core.define-type` と同じように, ユーザーも定義のパーツを作れます。
定義のパーツは `core.part-content` を返す普通の関数のパーツで, 中身を `my.define-number(value: 42)` のような呼び出しで書けます。

```text
app.define-number: (description: List<core.localized-text>, value: number) -> core.part-content
  = (description, value) => core.define-part(
      description, visibility: public,
      part_type: some(quote(number).expression),
      expression: some(number(value)),   // core.expression の Variant
    )

app.answer の中身 (CAS) = app.define-number(description: [], value: 42)
```

### 意味はコミットの中で決まる

定義の式の意味は, そのパーツが入っている**コミットの中で**評価した値です (2026-10-29 にユーザーが決定カードで選んだ)。
パーツ ID は名前から決まるので, 普通のパーツの呼び出しと同じく, 呼び出す定義のパーツはそのコミットのもの
(コミットに無ければ型環境と同じく他のプロジェクトの main の最新のもの) になります。
定義のパーツを直してコミットすると, それを使うパーツの中身も変わります。
保存するときに `core.define-part(...)` の形に展開する案は, 書いた形が残らないので選ばなかった。

そのため, その場で評価できない定義の式の中身は content hash だけでは決まらず, コミットごとに求めます。

- 評価器: definy 製の `core.eval-value` を `npm run build:seeds` が `wasm/definition_evaluator.wasm` にコンパイルし,
  サーバーとブラウザが同じものを使う ([src/definition_evaluator.ts](../src/definition_evaluator.ts))。
  評価に要るパーツは `quote` の外の参照だけをたどる (`partsForEvaluation`) ので, 互いを quote する定義も評価できる
- コミットの中の評価 (`resolveDefinitionsInCommit`): その場で評価できるものを先に求め, 求まったパーツの式を使って
  残りを繰り返し評価する。定義のパーツ自体を定義のパーツで定義してもよい。循環しているものは求まらない
- サーバー ([worker/type_check.ts](../worker/type_check.ts) の `commitContents`):
  - `SubmitEvent`: 評価した値の形を `core.value-conforms` で確かめ, さらに定義の式を型チェッカーで `core.part-content` として
    検査する (エラーは `パーツ名 (definition): ...`)。評価できなければ `is not a part definition that evaluates to a core.part-content`
  - 型環境: main の最新のコミットにその場で評価できない定義があれば, そのコミットの中で評価した中身を使う (コミットごとに覚えておく)
  - コミットの外のパーツは, その場で評価できる定義のもの (`core.define-part` など) だけを参照できる
- ブラウザ ([src/content_store.ts](../src/content_store.ts)): `loadContents` がその場で評価できない定義の式を覚えておき,
  評価器を読み込んでから `withEvaluatedDefinitions` がコミットごとに評価して埋める。中身を変えずにコミットし直すときは
  元の定義の式 (content hash) のまま残す (`toContentAddressedParts`)

## まだ無いもの

- エディタでの定義の式の編集。エディタはこれまでどおり説明・型・式を別々に編集し, コミットするときに定義の式にする
  (ユーザーが作った定義のパーツで定義したパーツは, 中身を変えると `core.define-part(...)` の形になる)
- その場で評価できる定義 (`core.define-part(...)` のリテラル) の式の型検査。今は評価した値の形を確かめるだけ
