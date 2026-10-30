# 浮動小数 (float)

definy の数は整数 (`number`, 64 ビットの符号付き整数) と浮動小数 (`float`, IEEE 754 の 64 ビット) の 2 つの型です。
Elm の `Int` と `Float` と同じく別の型で, 整数を浮動小数として使うには `core.float-from-integer` で変えます。
definy には演算子という概念は無いので, 演算は他と同じく組み込みのパーツの呼び出しです。

## リテラル

浮動小数のリテラルは 10 進の仮数と指数で書きます: `{"#float": {"mantissa": 15, "exponent": -1}}` は `1.5`。

- 2 進の浮動小数のまま持たないので, JSON (seed) でも CBOR (イベント) でも整数として正確に保存でき, `0.1` が `0.1` のまま残る
- 値は `core.float-from-decimal` で `float-from-integer(mantissa)` に `10^|exponent|` を掛ける (指数が負なら割る)。
  `10^n` は `n <= 18` なら整数の `10^n` を浮動小数にし, それより大きければ `10^18` ずつ掛ける (`core.float-power-of-ten`)。
  `|mantissa| < 2^53` かつ `|exponent| <= 22` なら 1 回の掛け算か割り算なので正しく丸める (人が書くリテラルのほとんど)
- コンパイラ (`core.compile-float-literal`) は評価器と同じ計算の命令列を出すので, stage1 と `core.eval-value` の結果は同じになる
- NaN と ±Infinity のリテラルは無い。NaN はパーツ `core.float-nan` (`-1.0` の平方根) で書ける。±Infinity は `1.0 / 0.0` などで作れる
- 式エディタは `1.5` や `2.0` のように小数点を付けて表示する (整数のリテラルと見分ける)。置換メニューの `float` で `0.0` を作り,
  入力欄に打った数を JavaScript の最短の 10 進表記の仮数と指数にする (`floatExpressionFromNumber`)。
  整数のリテラルに小数を打つと浮動小数のリテラルになる

## 組み込みのパーツ

| パーツ                                                          | 型                                       | 意味                                                         |
| :-------------------------------------------------------------- | :--------------------------------------- | :----------------------------------------------------------- |
| `core.float-plus` `float-minus` `float-multiply` `float-divide` | `(left: float, right: float) -> float`   | IEEE 754 の四則演算                                          |
| `core.float-less-than` `float-less-than-or-equal`               | `(left: float, right: float) -> boolean` | どちらかが NaN なら `false`                                  |
| `core.float-from-integer`                                       | `(value: number) -> float`               | 一番近い浮動小数                                             |
| `core.float-floor` `float-ceiling` `float-truncate`             | `(value: float) -> number`               | 整数にする. NaN は 0, 範囲外は端の値 (`i64.trunc_sat_f64_s`) |
| `core.float-square-root`                                        | `(value: float) -> float`                | 負の数は NaN                                                 |

- `core.equal` は浮動小数も比べられ, IEEE 754 の比較 (`f64.eq`) なので NaN は NaN と (同じ値でも) 等しくない
- 実行時エラーは無い: Wasm の f64 の演算は trap せず, 整数への変換は飽和する命令を使う。
- 0 除算は Wasm の `f64.div` の通り: `1.0 / 0.0` は Infinity, `-1.0 / 0.0` は -Infinity, `0.0 / 0.0` は NaN
  (IEEE 754. Elm も同じ)。整数の 0 除算 (結果は 0) と違い, 浮動小数は NaN・±Infinity で表せるのでそのままにする
  (2026-10-30 にユーザーが決定)。stage1 と `core.eval-value` が同じ結果になることを
  `conformance/eval_cases.json` の「float divide by zero is Infinity, not an error」などで確かめている
- 型チェッカーはこれらを `core.builtin-function-type` の関数の型で検査する (引数と結果の型が決まっている組み込みは名前ごとの分岐を書かなくてよい)
- 浮動小数を文字列にするパーツはまだ無い

## 値の表現

stage1 では浮動小数は箱のタグ 7 で, +8 に f64 を置きます ([self-hosting.md](self-hosting.md) の「値の表現」)。
`core.value` は `float(f)` です。TypeScript とやり取りするときは JavaScript の数で, 整数でない数 (NaN・±Infinity を含む) を書き込むと浮動小数の箱にし,
浮動小数の箱は JavaScript の数として読む (`src/stage1_compiler.ts`)。そのため値が整数の浮動小数 (`2.0`) を読んで書き戻すと整数になる。
