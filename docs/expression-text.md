# 式のテキストの書き方

MCP のツール ([mcp.md](mcp.md)) が式や型を返すときの書き方。`definy.expression-text(expression, indent, names)` が書く
(2026-11-06)。プロジェクトの外の作業用ツール `dtx.mjs` (seeds の JSON と相互変換する) と同じ書き方に,
型の構築子の書き方を足したもの。読み取り (テキストから式) は `definy.parse-expression-text(text)` (下の「読み取り」)。

## 値の式

| 式                 | テキスト                                                                                 |
| :----------------- | :--------------------------------------------------------------------------------------- |
| 数・文字列・真偽値 | `42`, `"text"` (JSON の文字列。`definy.json-string-literal`), `true`                     |
| 浮動小数           | `float(仮数, 指数)`                                                                      |
| リスト・レコード   | `[a, b]`, `{key: value}` (キーが識別子でなければ JSON の文字列)                          |
| 変数               | `$id` (変数 ID)                                                                          |
| 関数               | `fn(名前$id, ...) =>` の次の行に本体                                                     |
| 呼び出し           | `@モジュール.名前(引数名: 値, ...)`。組み込みは `builtin("plus")(...)`, 変数は `$0(...)` |
| フィールド         | `式.キー`                                                                                |
| バリアント         | `#tag`, `#tag(値)`, 型のパーツ付きは `#tag<@モジュール.名前>(値)`                        |
| match              | `match 対象 {` の次の行から `パターン =>` と本体を `,` で区切る                          |
| let                | `let 名前$id = 値;` の次の行に本体                                                       |
| パーツの参照       | `@モジュール.名前`。名前が分からない id は `@"id"`                                       |
| その他             | `hole(false)`, `quote(式)`, `secret("id", "label", ["https://..."])`                     |

パターンは `_`, `名前$id`, `#tag(パターン)`, 文字列, 数, 真偽値。

## 型の式

| 型             | テキスト                                                 |
| :------------- | :------------------------------------------------------- |
| 基本の型       | `Number`, `Float`, `String`, `Boolean`, `Type`, `Secret` |
| リスト・コード | `List<T>`, `Code<T>`                                     |
| 関数           | `Fn(引数名: T, ...) -> R`                                |
| レコード       | `Record{key: T, ...}`                                    |
| 直和型         | `Union{#tag, #tag(T), ...}`                              |
| 型引数         | `Param("T")`                                             |

## 改行と字下げ

- リスト・レコード・呼び出しの引数・型の引数とフィールドは, 1 行にして 100 バイト未満で改行を含まなければ 1 行, そうでなければ
  1 行に 1 つ (`definy.layout-items`。dtx と同じ)。100 バイトは字下げを含まない長さ
- 字下げは空白 2 つ。関数の本体・match の腕の本体は 1 段深くする
- core には別に `core.expression-to-source` があるが, 一部の式しか書けない古い試作

## 読み取り (2026-11-06)

`definy.parse-expression-text(text) -> #ok(core.expression) | #error(String)` がテキストを式にする。`definy_commit_parts` ([mcp.md](mcp.md)) が
受け取った型と式を読むのに使う。

- 書いたテキストを読むと元の式に戻る (seed の全パーツの型と式で確かめている。`src/expression_text.test.ts`)
- 空白・改行・`//` から行末までのコメントは飛ばす。字下げや 1 行か複数行かは問わない
- `@モジュール.名前` はパーツ ID にする (`core.module-part-ids` で名前から求める。パーツが本当にあるかは見ない。
  無ければコミットの型検査が落とす)。`@"id"` は id そのもの
- 文字列は JSON の文字列 (`\uXXXX` とサロゲートペアも読む)。数は整数 (先頭の `-` 可)。浮動小数は `float(仮数, 指数)`
- `fn` `let` `match` `true` `false` と型の名前 (`Number` など) はキーワード。それ以外の単語は `float(` などの決まった呼び出しだけ
- 誤りは `expected ',' or the closing bracket at byte 5` のように, 理由と (UTF-8 の) バイトの位置を返す
- ソースは `{text, bytes}` (`bytes` は `core.string-to-bytes`) で持ち, 1 バイトずつ見る (`definy.text-byte-at`。終わりより後は `-1`)。
  各関数は `#ok({value, next})` か `#error(メッセージ)` を返し, `next` は読み終わったバイトの位置。
  `core.string-slice` はバイトの位置で切る
- `let x = match ... { ... => #some(...), _ => #none }` のように期待する型の無い位置で `#some` / `#none` を作ると型検査が通らないので,
  `definy.text-simple-escape` や `definy.text-simple-word` のように型を宣言したパーツに分ける
