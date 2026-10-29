# definy の値の JSON / CBOR での表し方

definy の値 (数値・文字列・真偽値・リスト・レコード・タグ付きの値) は、seeds の JSON、イベントの中身 ([event.md](event.md)) の CBOR、
localStorage の作業中の変更、クリップボードのどれでも同じ形で書く。

パーツの式とパーツの型はどちらも `core.expression` の値 (型は型の式. [type-expression.md](type-expression.md)) で保存する。
式は stage1 や型チェッカーにそのまま渡し, 型は型チェッカーの形 (`core.type-ast`) にしてから渡す。
TypeScript の側には式の構造を別の形に変える層 (以前の `toSelfHostedAst` / `partTypeToSelfHostedAst` など) は無い。
式の形を決めるのは seeds/core.json の型パーツ `core.expression` と `core.type-ast` の宣言だけ。

実装は [src/definy_value.ts](../src/definy_value.ts)。

## 形

| definy の値                  | JSON / CBOR                                              | 例                         |
| :--------------------------- | :------------------------------------------------------- | :------------------------- |
| 数値                         | 整数                                                     | `42`                       |
| 文字列                       | 文字列                                                   | `"abc"`                    |
| 真偽値                       | `true` / `false`                                         | `true`                     |
| リスト                       | 配列                                                     | `[1, 2]`                   |
| レコード                     | キーが `#` で始まらないオブジェクト (CBOR の map)        | `{"key": "x", "value": 1}` |
| タグ付きの値 (Variant)       | キーが `#タグ` の 1 つだけのオブジェクト。値はペイロード | `{"#some": 1}`             |
| ペイロードの無いタグ付きの値 | ペイロードを `null` にする                               | `{"#none": null}`          |

- option は `{"#none": null}` / `{"#some": x}`。
- パーツ ID は URL-safe Base64 (パディング無し) の文字列。バイト列 (`Uint8Array`) は値の中に出てこない。
- seeds の JSON だけは、パーツ ID の文字列の代わりに `{"$part": "module.part-name"}` と書ける。
  読み込みのとき `src/seed_parts.ts` がシステムアカウントから ID の文字列を導出して置き換え、
  書き出し (`npm run export:seeds`) のとき `src/seed_export.ts` が ID の文字列を `{"$part": ...}` に戻す。

## 式 (`core.expression`)

```json
{
  "#call": {
    "function": {
      "#part_reference": {
        "part_definition_event_hash": { "$part": "core.plus" }
      }
    },
    "arguments": [
      { "name": "left", "value": { "#number": 1 } },
      { "name": "right", "value": { "#variable": { "variable_id": 0 } } }
    ]
  }
}
```

形の要点 (正確な形は seeds/core.json の `core.expression` の宣言):

- `let` は束縛 1 つずつの入れ子: `{"#let": {variable_id, variable_name, value, body}}`。
  式のツリーエディタは、続けて書いた let を 1 つのブロック (束縛の並びと本体) として見せる
  (`src/tree_layout/expression.ts` の `letChainOf` / `letChain`)。
- `match` のアーム: `{pattern, body}`。`pattern` は `core.pattern` の値の木
  (`{"#any": null}`, `{"#bind": {variable_id, variable_name}}`, `{"#variant": {tag, payload}}`, `{"#string": ...}`,
  `{"#number": ...}`, `{"#boolean": ...}`)。どの値にも一致するアームは `#any` か `#bind` のアームで、ほかの default の欄は無い
  ([match-pattern.md](match-pattern.md))。
- 浮動小数のリテラル: `{"#float": {mantissa, exponent}}` で値は `mantissa × 10^exponent` (どちらも整数. [float.md](float.md))。
  型の式は `{"#type_float": null}`, 型 (`core.type-ast`) は `{"#float": null}`。
- `variant`: `{tag, payload: option<式>, type_part: option<パーツ ID>}`。
- `secret`: `{id, label, allowed_url_prefixes}` ([secret.md](secret.md))。
- 未入力: `{"#hole": {"probe": false}}`。型チェッカーに期待する型を聞く位置は `probe: true`。
- コンパイラ組み込み: `{"#builtin": "plus"}` ([builtin-parts.md](builtin-parts.md))。
- 型パーツの宣言も `core.expression` の値で、タグが `type_` で始まる
  (`type_number`, `type_list`, `type_record`, `type_union`, ...) か、型パーツの参照 (`part_reference`)。
  型引数を取る型は型の式を返す関数 (`(T) => type_union [...]`) で、型の式の中で型パーツを `call` で呼べる。
  型の式は実行時にもこの形の値になる ([type-arguments.md](type-arguments.md))。

## パーツの型 (`core.type-ast`)

`{"#number": null}`, `{"#list": {"item_type": T}}`, `{"#function": {"parameters": [{"name", "type"}], "return_type": T}}`,
`{"#record": [{"key", "field_type"}]}`, `{"#union": [{"tag", "payload_type": option<T>}]}`,
`{"#reference": {"part_hash": ID}}`, `{"#code": T}`, `{"#type": null}` (型パーツ・型引数の型), `{"#secret": null}`,
`{"#parameter": "T"}` (型引数の参照), `{"#apply": {"part_hash": ID, "arguments": [{"name", "type"}]}}` (型を返すパーツの呼び出し)。
型指定が無いパーツは `null`。式のツリーエディタでの編集のしかたは [part-type.md](part-type.md)。

## 形の検査

- seeds/schemas/module-seed.schema.json は core の型パーツの宣言から `npm run build:schema` で作る
  (`src/seed_schema.ts`)。`core.expression` などの宣言を変えたら作り直す。
  `src/seed_schema.test.ts` が、スキーマが宣言と合っていることと、seed の全パーツの式と型が宣言の形であることを確かめる。
- イベントの中身は `core.event-content` の値で, 署名の検証のときに同じ `conformsToTypeDeclaration` で形を確かめる
  ([event.md](event.md))。コミットのパーツの式が `core.expression` の形でなければ, 型チェッカーに渡る前に
  サーバーの `SubmitEvent` が拒否し, ブラウザも不正なイベントとして扱う。

## 以前の形から変えたときのこと (2026-10-24)

- 以前は式を `{"Call": {...}}` / `"Hole"` / `{"Compiler": "plus"}` のような TypeScript 側の JSON AST で保存し、
  stage1 や型チェッカーに渡す前に `core.expression` の値に変換していた。パーツの型も `"number"` / `{ list: T }` の別の形だった。
- 変換を消しても stage1 (`npm run check:stage1`) は不動点のまま、`npm run build:seeds` で作る型チェッカーの Wasm もバイト単位で同じだった。
  definy 側のパーツは初めから `core.expression` の値を受け取っていたため。
- 以前の形で書いたコミットの式は読めない (型チェッカーも stage1 も受け付けない)。seed のイベントは指紋が変わるので新しいものに入れ替わる。
  localStorage の作業中の変更は保存キーを `definy.working_changes.v4` に変えて読まないようにした。
