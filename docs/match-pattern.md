# match のパターン

`match` のアームは `{pattern, body}` で, `pattern` は他の式と同じく木 (`core.pattern` の値) です。
タグを文字列で書いて `_` を特別扱いする形はやめました。definy に予約語という概念は無いので,
「どれにでも一致する」は `_` という文字列ではなく `any` というパターンで表します。
そのため文字列 `"_"` やタグ `_` にも普通に一致させられます。

## `core.pattern`

| パターン                                  | 一致する値                                   | 束縛                       |
| ----------------------------------------- | -------------------------------------------- | -------------------------- |
| `{"#any": null}`                          | どの値にも一致                               | しない                     |
| `{"#bind": {variable_id, variable_name}}` | どの値にも一致                               | 値全体を変数に束縛する     |
| `{"#variant": {tag, payload}}`            | タグが `tag` で, 値の中身が `payload` に一致 | `payload` のパターンによる |
| `{"#string": "plus"}`                     | 文字列 `"plus"`                              | しない                     |
| `{"#number": 3}`                          | 数値 `3`                                     | しない                     |
| `{"#boolean": true}`                      | `true`                                       | しない                     |

`#variant` の `payload` もパターンなので `some(some(x))` のように入れ子にできます。
値を持たないタグは `payload` を `{"#any": null}` にします。

```json
{
  "#match": {
    "target": { "#variable": { "variable_id": 0 } },
    "arms": [
      {
        "pattern": {
          "#variant": {
            "tag": "some",
            "payload": { "#bind": { "variable_id": 1, "variable_name": "x" } }
          }
        },
        "body": { "#variable": { "variable_id": 1 } }
      },
      { "pattern": { "#any": null }, "body": { "#number": 0 } }
    ]
  }
}
```

アームは上から順に調べ, 最初に一致したアームの本体を評価します。

## 各層での扱い

| 層                                       | 扱い                                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 評価器 `core.eval-value`                 | `core.eval-pattern` が値とパターンを照合し, 一致すれば束縛を足した環境を返す (`option<env>`)                                    |
| 型検査 `core.type-check-pattern`         | パターンを対象の型で検査し, 束縛する変数の型を環境に足す。`#variant` はタグの値の型で中のパターンを再帰的に検査する             |
| 網羅性 `core.check-union-exhaustiveness` | 対象の型の各タグについて, `core.patterns-cover-variant` がそのタグの全ての値に一致するかを調べる (下の「網羅性」)               |
| コンパイラ `core.compile-pattern`        | パターンを「一致すれば 1」の i32 を積む命令列にし, 束縛した変数をローカル変数に割り当てる。どの値にも一致するパターンは本体だけ |
| quote                                    | `core.quote-pattern` がパターンを組み立てる式にする                                                                             |
| UI (`src/tree_layout/match_pattern.ts`)  | 1 段のパターン (`_`, 変数, `tag`, `tag(x)`, リテラル) を編集できる。ネストしたパターンは表示するだけ                            |

## 網羅性

パターンには値の中の位置が 1 つ (タグの値) しか無いので, 列ごとに分けて調べれば正確に判定できます。

1. どの値にも一致するパターン (`any` / `bind`) があれば網羅している
2. 無ければ対象の型のタグ (`core.pattern-target-variants`) ごとに,
   そのタグに一致しうるパターンの「中のパターン」を集める (`core.patterns-sub-patterns`。`true` / `false` のリテラルは `any` にする)
3. 集まらなければそのタグが足りない (`non_exhaustive_match` の `missing_tag`)
4. タグが値を持てば, 集めたパターンが値の型の全ての値に一致するかを 1 から再帰的に調べる

1 で止まるか, 2 でパターンが 1 段浅くなるので必ず止まります。
文字列・数値はタグが無いので, `_` か変数のアームが要ります (`[{tag: "_"}]` という疑似的なタグで調べる)。

```text
match list-get(list: [list-get(list: [5], index: 0)], index: 0) {   // option<option<number>>
  some(some(x)) => x,
  some(none) => 1,
  none => 2,
}
```

は網羅していて, `some(none)` のアームを消すと `missing_tag: "some"` の型エラーになります。

## エディタ (`src/tree_layout/expression.ts`)

エディタはデータ上のアーム `{pattern, body}` を `MatchArm` (`kind`, `tag`, `variable_id`, `variable_name`, `body`) に開いて扱います
(`matchOf` / `matchExpression` が変換する)。`kind` は `any` / `bind` / `variant` / `string` / `number` / `boolean` / `nested` で,
`nested` は中にさらにタグやリテラルがあるパターンです。

- 表示は `_ =>`, `some =>` (+ 束縛する変数の名前のノード), `"plus" =>`, `3 =>`, `true =>`, `some(some(x)) =>`。
  文字列リテラルは引用符で囲むので `_` と `"_"` は見た目でも区別できる
- パターンのメニューの `_` は `pattern:any` で, タグ・リテラルの選択肢 (`pattern:tag:...`) とは別。
  文字列の match では検索欄に打った文字列 (`_` も可) を, 数値の match では打った整数をそのままパターンにできる
- `_` のアームも `bind` で値全体を変数に束縛できる
- 足りないアームを求めるとき, ネストしたパターンはそのタグの一部の値しか扱わないので数えない
