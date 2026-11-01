# 評価器の値を型の付いた値にする (`core.value-to-*`)

definy 製の評価器 `core.eval-value` が返すのは, 型の無い値の表現 `core.value` (`number` / `string` / `list` / `record` /
`variant({tag, payload})` / `unit` など) です。パーツの定義の式 ([part-definition.md](part-definition.md)) を評価した結果を
型の付いた `core.part-content` (中の式は `core.expression`) として使うには, `core.value` を読み直す関数が要ります。

2026-11-01 にこれを definy で書きました (以前はホストの TypeScript `coreValueToValue` + `core.value-conforms` で, サーバーでは
`definy.service-io` の `decode_part_contents` としてホストに頼んでいた。[service.md](service.md))。

## パーツ

| パーツ                                                                                                 | 型                                                                             |
| :----------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| `core.value-to-part-content`                                                                           | `(value: core.value) -> option<core.part-content>`                             |
| `core.value-to-expression` / `-callee` / `-match-arm` / `-pattern` / `-localized-text` / `-visibility` | 同じく `option<その型>`                                                        |
| `core.value-to-list`                                                                                   | `(T, items: list<core.value>, decode, index, acc: list<T>) -> option<list<T>>` |
| `core.value-decoded`                                                                                   | `(T, decoded: option<T>) -> option<T>` (そのまま返す)                          |

- 形が違えば `none` (`core.value-conforms` で確かめてから読むのと同じ。余分なレコードのキーは無視する)
- 直和型の中身の無いタグ (`#public` など) は, 中身 (ふつうは `unit`) を見ない
- `core.value-decoded` は型を付けるためだけの関数。`match` の対象のように期待する型の無い位置に `#some(x)` / `#none` を置くと,
  型チェッカーがそれぞれ `some` だけ / `none` だけの直和型と推論して腕どうしの型が合わない (`type_mismatch (expected: some(string), actual: none)`)。
  型引数 `T` を渡して `option<T>` を期待する位置に置くと合う

## 型の宣言から生成する

`core.value-to-*` は手で書かず, 型パーツの宣言 (`core.expression` など) から `scripts/generate_value_decoders.ts` が作って
`seeds/core.json` に書きます。型パーツの形を変えたら次を実行してください。

```sh
node scripts/generate_value_decoders.ts          # seeds/core.json を書き換える
node scripts/generate_value_decoders.ts --check  # 古ければ終了コード 1
```

`src/value_decoders.test.ts` が seeds と生成結果が同じかと, seed の `definy` の全パーツの式を `core.value` にして
`core.value-to-expression` で読み戻せるかを確かめます。

- 対象の型は `core.part-content` から参照をたどったもの (`VALUE_DECODER_TYPES`)。別の型を足すときはそこに足す
- 型の宣言の `#type_number` などは `match value { #number(v) => #some(v), _ => #none }`, レコードは
  `core.value-record-field` で各キーを読み, 直和型は `variant` の `tag` を文字列のパターンで分ける
- 生成したパーツは大きい (`core.value-to-expression` だけで seed の JSON で約 1.2 万行) が, 型の宣言をなぞるだけなので
  人が読む必要は無い
