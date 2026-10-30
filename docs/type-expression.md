# 型の式 (パーツの型も型の式で書く)

definy の型は 1 つの形, 型の式 (`core.expression` の `type_*` などの値) で書きます。
型パーツの宣言 (`union { ... }`) も, パーツの型 (`(x: number) -> string`) も同じ型の式です (2026-10-29)。

それまではパーツの型だけが別の形 (`core.type-ast` の値) で seed と CAS に置かれていて,
`type` (型の型)・`Code<T>`・型引数の参照は型の式に無い (エディタの中だけ) ため, パーツの定義の式
([part-definition.md](part-definition.md)) ではパーツの型を Variant のリテラルで書くしかありませんでした。

## 型の式

| 型の式 (`core.expression`)                                              | 意味                                                                            |
| :---------------------------------------------------------------------- | :------------------------------------------------------------------------------ |
| `type_number` / `type_float` / `type_string` / `type_boolean`           | 整数・浮動小数・文字列・真偽値                                                  |
| `type_secret`                                                           | シークレット ([secret.md](secret.md))                                           |
| `type_type`                                                             | 型の型。型パーツの型, 型引数の引数の型 ([type-arguments.md](type-arguments.md)) |
| `type_list({ item_type })`                                              | リスト                                                                          |
| `type_code({ value_type })`                                             | quote した式の型 `Code<T>` ([quote.md](quote.md))                               |
| `type_function({ parameters: [{ name, type }], return_type })`          | 関数                                                                            |
| `type_record([{ key, value }])` / `type_union([{ tag, payload_type }])` | レコード / 直和                                                                 |
| `type_parameter(name)`                                                  | 関数の型の型引数 `name` の参照 (`(T: type, x: T) -> T` の `T`)                  |
| `part_reference` / `call` (型を返すパーツの呼び出し) / `variable`       | 型パーツの参照, `core.option(T: number)`, 型を返す関数の本体での型引数          |
| `builtin(name)`                                                         | コンパイラ組み込みの関数の型 ([builtin-parts.md](builtin-parts.md))             |

`type_type` / `type_code` / `type_parameter` は値の位置に書くと他の型の式と同じく型が `type` の値になり,
評価すると同じ形の `core.expression` の値になる (`core.type-expression-construct`)。`quote` もできる。

型引数の参照は 2 通りある。関数の型 (`type_function`) の引数には変数 ID が無いので名前で参照する (`type_parameter`)。
型を返す関数のパーツ (`(T) => union { none, some(T) }`) の本体はラムダ式なので, ふつうの変数 (`variable`) で参照する。

## どこでどの形を使うか

- 型の式: seeds/\*.json の `part_type`, CAS に預けるパーツの中身 (`core.part-content` の `part_type: option<core.expression>`),
  定義の式 (`core.define-part(part_type: some(quote(number).expression), ...)`), TypeScript の中 (`PartContent.partType`,
  `PartSnapshot.partType`, 作業中の変更 `PartChange.partType`), 型チェッカーの入力 (`core.type-checker` / `core.build-type-env` /
  `core.module-definition` のパーツの型, `check` の期待する型)
- 型チェッカーの中 (`core.type-ast`): 型の式を `core.type-expression-to-type-ast` で変換した, 型を比べるための形。
  型パーツの参照を `reference(パーツ ID)`, 型を返すパーツの呼び出しを `apply`, 型引数を `parameter(名前)` に正規化する。
  変換できない型の式 (未入力が残っているなど) のパーツは型環境に入れず, 期待する型なら `invalid_type_declaration` にする
- 型チェッカーが返す型 (期待する型 `findExpectedType`, 型エラーの `expected` / `actual`) は `core.type-ast` のまま。
  TypeScript で表示するときは型の式にして型のツリーで出す (`typeAstToExpression`,
  [src/type_ast_expression.ts](../src/type_ast_expression.ts))

`core.type-ast` は型チェッカーが比べたり代入したりするための形で, ユーザーが書く形ではない。
2026-10-30 までは TypeScript の中のパーツの型も `core.type-ast` で, CAS や seed を読み書きするたびに変換し,
型チェッカーにも `core.type-ast` で渡していた (二重管理)。今はパーツの型を型の式だけで持つ。

公開範囲の検査 (`core.check-reference-visibility`, [visibility.md](visibility.md)) も, パーツの型の中の参照を
式と同じ `core.expression-part-references` で集める (型の式は `core.expression` なので)。

## まだ無いもの

- 値の位置の `type_parameter` が, 囲む関数の型の型引数かどうかの検査 (今は名前を見ずに型 `type` とする)
- 型チェッカーが返す型を型の式にすること (今は `core.type-ast`)
