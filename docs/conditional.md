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
