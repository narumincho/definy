# 条件分岐 (Bool に対する match)

definy には if 式がありません (#653)。条件分岐は Bool に対する `match`
式で書きます。

```text
match (less_than x 10) {
  true => "small",
  false => "large",
}
```

AST では `MatchExpression` のアームのタグに `"true"` / `"false"`
を使います。ワイルドカード `_` のアームと `default` も使えます。Rust で組み立てるときは
`Expression::match_boolean(condition, when_true, when_false)` を使うと簡単です。

式の種類を 1 つ減らすと、評価器・型検査・Wasm コンパイラ・フォーマッター・最適化器・UI
（いずれも自己記述版を含む）の分岐が減り、セルフホストの実装量が減ります。

## 各層での扱い

| 層 | 扱い |
| --- | --- |
| UI の型検査 (`definy-ui` diagnostics) | 対象の型として `Boolean` を許可する |
| Wasm コンパイラ (`wasm_emitter::adt_ops::emit_match`) | 実行時に値の種別 (Tag 1 = Bool) を見て、Bool なら静的文字列 `"true"` / `"false"` をタグとして使い、ペイロードは 0 とする。Variant (Tag 6) のタグが `"true"` でも Bool とは区別される |
| Wasm GC コンパイラ | アームが `true` / `false` / `_` だけの match を Wasm の `if` に変換する |
| 自己記述評価器 `core.eval-value` | 対象が `boolean` 値ならタグを `"true"` / `"false"`、ペイロードを `unit` として `core.eval-match-arms` に渡す |
| 自己記述型検査 `core.type-check` | 対象の型が `boolean` なら `[{ tag: "true" }, { tag: "false" }]` という union として網羅性を検査する |
| 自己記述コンパイラ `core.compile-expr-instructions` | Bool の match を `if ... else ... end` 命令列に変換する (アーム本体は `core.match-arm-body` で取得) |
| 自己記述最適化器 `core.optimize-expression` | 対象がリテラル `boolean` なら選ばれるアームの本体に畳み込む |

`core.expression` (自己記述 AST) の `match` アームは `variable_id`
が必須なので、ペイロードを束縛しないアーム (Bool の `true` / `false` など) は Rust
から変換するときに参照されない変数 ID `-1` を使います。
