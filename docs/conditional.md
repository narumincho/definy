# 条件分岐 (Bool に対する match)

definy には if 式がありません (#653)。条件分岐は Bool に対する `match`
式で書きます。

```text
match (less_than x 10) {
  true => "small",
  false => "large",
}
```

式 (`core.expression` の `match`) のアームのタグに `"true"` / `"false"`
を使います。どのタグにも一致するアームはタグ `_` のアームです (default の欄はありません)。

式の種類を 1 つ減らすと、評価器・型検査・Wasm コンパイラ・フォーマッター・最適化器・UI
（いずれも自己記述版を含む）の分岐が減り、セルフホストの実装量が減ります。

## 各層での扱い

| 層                                                  | 扱い                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 自己記述評価器 `core.eval-value`                    | 対象が `boolean` 値ならタグを `"true"` / `"false"`、ペイロードを `unit` として `core.eval-match-arms` に渡す |
| 自己記述型検査 `core.type-check`                    | 対象の型が `boolean` なら `[{ tag: "true" }, { tag: "false" }]` という union として網羅性を検査する          |
| 自己記述コンパイラ `core.compile-expr-instructions` | Bool の match を `if ... else ... end` 命令列に変換する (アーム本体は `core.match-arm-body` で取得)          |
| 自己記述最適化器 `core.optimize-expression`         | 対象がリテラル `boolean` なら選ばれるアームの本体に畳み込む                                                  |

UI の型エラー表示とサーバーの検査は自己記述型検査を使うので, 上の表のとおりに扱われる。

`core.expression` の `match` アームは `variable_id` と `variable_name`
が必須なので、ペイロードを束縛しないアーム (Bool の `true` / `false` や `_` など) は参照されない変数 ID `-1` と
空の名前 `""` にします ([value-encoding.md](value-encoding.md))。

## 文字列に対する match

文字列の値にも `match` できます。アームのタグに文字列リテラルそのものを書き, 一致するアームの本体を評価します。
文字列は取りうる値が無数にあるので, `_` のアームが必須です (無いと型エラー)。

```text
match name {
  "plus" => ...,
  "minus" => ...,
  _ => ...,
}
```

`match equal(name, "plus") { true => ..., false => match equal(name, "minus") { ... } }` のような入れ子を平らに書けます。

| 層                                                  | 扱い                                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 自己記述評価器 `core.eval-value`                    | 対象の文字列をそのままタグとして `core.eval-match-arms` に渡す。タグが等しいか `_` のアームを選ぶ |
| 自己記述型検査 `core.type-check`                    | 対象の型が `string` なら `[{ tag: "_" }]` という union として網羅性を検査する (`_` が必須)        |
| 自己記述コンパイラ `core.compile-expr-instructions` | ランタイム関数 `match_tag` が文字列の箱をそのまま返すので, 他の match と同じ命令列になる          |
| UI (`src/tree_layout/match_pattern.ts`)             | 文字列の match のアームのタグを選ぶとき, 打った文字列をそのままタグにする選択肢を先頭に出す       |
