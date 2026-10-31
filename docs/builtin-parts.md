# コンパイラ組み込みのパーツと演算子の廃止

definy には演算子 (operator) という概念は無く, あるのはパーツ (関数) だけ ([Issue #717](https://github.com/narumincho/definy/issues/717)).
数値の加算・比較・論理演算・文字列やリストの操作も, `core.plus` `core.less-than` `core.not` `core.list-get` などの
**コンパイラ組み込みのパーツ** を他のパーツと同じく `call` で呼んで書く. `!` や `+` のような記号でも表さない.

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

(式の書き方は [value-encoding.md](value-encoding.md))

以前の式の AST には `Add` `Not` `ListGet` などの演算専用のノードがあったが, seed・適合テスト・エディタから取り除いた
(seed は以前の形の `{"Add": {left, right}}` を `core.plus` の呼び出しに機械的に書き換えた).

## 組み込みのパーツ

- 式が `{"#builtin": "plus"}` のパーツがコンパイラ組み込み. 組み込みかどうかはパーツ名ではなく式で決まる (`compilerBuiltinName`)
- 引数名は下の表のとおり (順番は自由. [call-syntax.md](call-syntax.md) の「引数は名前で対応させる」). 型の決まるもの (`core.plus` は `(left: number, right: number) -> number` など) は
  `part_type` を持つ. `core.equal` `core.not-equal` `core.list-length` `core.list-concat` `core.list-get` `core.list-append` は
  どの型の値にも使えて今の `PartType` (型引数が無い) では書けないので, 型を持たない (型チェッカーは名前で検査する)

| 組み込み (`#builtin`)                                                                                                                                                               | パーツ                        | 引数                    |
| :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------- | :---------------------- |
| `plus` `minus` `multiply` `divide` `remainder` `equal` `not_equal` `less_than` `less_than_or_equal` `greater_than` `greater_than_or_equal` `and` `or` `string_concat` `list_concat` | `core.plus` など (`_` は `-`) | `left`, `right`         |
| `not` `string_length` `string_to_bytes` `list_length`                                                                                                                               | `core.not` など               | `value`                 |
| `string_slice`                                                                                                                                                                      | `core.string-slice`           | `value`, `start`, `end` |
| `list_get`                                                                                                                                                                          | `core.list-get`               | `list`, `index`         |
| `list_append`                                                                                                                                                                       | `core.list-append`            | `list`, `item`          |
| `bit_and` `bit_or` `bit_xor` `shift_left` `shift_right`                                                                                                                             | `core.bit-and` など           | `left`, `right`         |

浮動小数の組み込み (`float_plus` など) は [float.md](float.md)。

### ビット演算 (2026-10-31)

`core.bit-and` `core.bit-or` `core.bit-xor` `core.shift-left` `core.shift-right` は `(left: number, right: number) -> number`。
SHA-256 を definy で書く (パーツ ID の導出. [service.md](service.md)) ために, コンパイラ・型チェッカー・評価器が扱うようにした
(以前はパーツだけあり, コンパイルすると unreachable, 評価すると `unit` だった)。

- 数は 64 ビットの 2 の補数として扱う (`bit-and(left: -1, right: 255)` は `255`)
- `shift-left` は 64 ビットで折り返す。`shift-right` は算術右シフト (符号を保つ. Wasm の `i64.shr_s`)。
  シフトする数は 64 で割った余りを使う (Wasm と同じ. `shift-left(left: 1, right: 65)` は `2`)。どれも実行時エラーにならない
- コンパイラ (`core.compile-builtin-call`) は `plus` と同じく 2 つの数を取り出して `i64.and` `i64.or` `i64.xor` `i64.shl` `i64.shr_s`
  (`wasm.i64-and` など) を出す。評価器 (`core.eval-builtin-call`) はそれぞれのパーツを呼ぶ (stage1 がコンパイルするので Wasm の命令になる)。
  型チェッカーは `core.builtin-function-type` の型で検査する
- コンパイラ自身はビット演算を使わないので, ブートストラップは `npm run build:stage1 -- --bootstrap` 1 回でよかった (68248 bytes)
- `conformance/eval_cases.json` の「bit and」「shift right is arithmetic」などで stage1 と `core.eval-value` の両方で確かめる

## 実行時エラーにしない

definy には実行時エラーが無い (Elm と同じ)。組み込みのパーツはどの引数でも値を返す。

| 呼び出し                              | 結果                                                                                                           |
| :------------------------------------ | :------------------------------------------------------------------------------------------------------------- |
| `core.divide(left: x, right: 0)`      | `0`                                                                                                            |
| `core.divide(left: -2^63, right: -1)` | `-2^63` (折り返す. Wasm の `i64.div_s` のように trap しない)                                                   |
| `core.remainder(left: x, right: 0)`   | `x` (`x = y * (x / y) + x % y` が `y = 0` でも成り立つように. Lean と同じ)                                     |
| `core.equal` / `core.not-equal`       | リスト・レコード・バリアントも中身で比べる. レコードはフィールドの順番によらない. 関数は同じ値のときだけ等しい |

除算は 0 に向かって丸める (`-7 / 2 = -3`, `-7 % 2 = -1`)。数値の加減乗算は 64 ビットで折り返す。
`core.list-get` は Elm の `Array.get` と同じく option を返す: 範囲内なら `some(要素)`, 範囲外 (負の添字を含む) なら `none`。
型チェッカーは要素の型 `T` から `union { none, some(T) }` を返す (`core.type-check-builtin-call`)。
stage1 ではランタイム関数 `list_get` がバリアントの箱を作る。タグの文字列 `"none"` `"some"` は `core.compile-to-wasm` が
文字列の表の先頭 (`"true"` `"false"` の後ろ, 1056・1072 番地) に置く。

seed の 218 か所の呼び出しは, 範囲を確かめる `match` (`less-than-or-equal(list-length(xs), i)` など) を
`match core.list-get(list: xs, index: i) { none => 範囲外のとき, some(item) => ... }` に機械的に書き換えた (2026-10-28)。
ほかの条件で範囲を確かめていた所は, 範囲外のときに反対の腕の値を返す。ブートストラップは, 出力 (ランタイム関数と文字列の表) だけを
変えた seed を古い stage1 でコンパイルし, それを stage1 にして書き換えた seed を `npm run build:stage1 -- --bootstrap` した。
以前は stage1 の `core.equal` がリスト・レコード・バリアントの箱の `+8` の 8 バイトを比べるだけで,
`equal([1], [1])` が `false`, ペイロードの無いバリアント `a` と `b` が `true` になっていた (2026-10-28 に直した)。
`conformance/eval_cases.json` の「divide by zero is zero」などで stage1 と `core.eval-value` の両方で確かめる。

## definy 製のコンパイラ・型チェッカー・評価器での扱い

`core.expression` (stage1 などが受け取る式) にも演算子のバリアントは無い.
組み込みのパーツの式は `{"#builtin": "plus"}` (名前の文字列) で, その呼び出しは他のパーツの呼び出しと同じ
`call({function: part_reference(...), arguments})` (保存した式をそのまま渡す).
`call({function: builtin("plus"), ...})` のように組み込みそのものを呼ぶ式も書ける (`sample.sample-ast-calc` などのデモのデータ).
引数は `core.call-argument(arguments, name)` で名前で取り出す (無ければ未入力 `hole`).

- コンパイル (`core.compile-expr-instructions`): `call` の関数が組み込みか (`core.compile-builtin-name` が `parts` から
  参照先のパーツの式を引いて `builtin` か調べる) を見て, 組み込みなら `core.compile-builtin-call` が名前で分岐して
  以前の `add` などと同じ Wasm の命令列を出す. 引数の中の関数の番号 (`fn_base`) は `core.collect-functions` と同じく
  書いた順の引数の関数を数える (`core.call-argument-fn-base`) ので, 引数の順番が違ってもずれない.
  末尾位置の組み込みの呼び出しは末尾呼び出し (`return_call_indirect`) にしない (`core.compile-tail-instructions`)
- 型検査: 型環境では組み込みのパーツの型を `builtin(name)` (型の式でも `core.type-ast` でも同じ形) にする (TypeScript 側の `moduleEntriesExpression`).
  `core.type-check-unlocated` は関数の型が `builtin` の呼び出しを, 引数名が `core.builtin-parameters` と (順番によらず) 一致するか
  (`core.call-argument-names-match`, 違えば `invalid_type_declaration`) を見てから `core.type-check-builtin-call` で名前ごとに検査する.
  期待する型があるとき (`core.list-concat` の左辺が `[]` など) は `core.type-check-against-builtin-call` を使う.
  組み込みのパーツ自身の式 (`builtin`) は宣言した関数の型と比べられないので検査しない (`unsupported`).
  サーバー (`worker/type_check.ts`) は型パーツ以外の式を読まないので, CAS に預けた式でも `{"#builtin": name}` の
  content hash から組み込みと分かるようにしている
- 評価 (`core.eval-value`): `builtin(name)` は値 `core.value` の `builtin(name)` になり, それを呼ぶと `core.eval-builtin-call` が名前で評価する
- `core.expression-to-source` は `plus(left: …, right: …)` のように出す. `core.optimize-expression` は組み込みそのものを呼ぶ
  `plus` `minus` `multiply` の引数が両方数値なら畳み込む

TypeScript 側に残る組み込みの表は, 型の無い組み込みの引数名を UI で出すための `BUILTIN_PARAMETERS` だけ.

### ブートストラップ (2026-10-23)

コンパイラ自身のソースも組み込みのパーツを呼んでいるので, `core.expression` を変えたときは次のように stage1 を作り直した.

1. 変更前の `src/stage1_compiler.ts` (呼び出しを `add` などのバリアントにする変換) と変更前の `wasm/stage1.wasm` で,
   新しい seeds の `core.compile-to-wasm` をコンパイルする (新しい `core.expression` を受け取るコンパイラができる)
2. それを `wasm/stage1.wasm` に置き, 新しい変換で `npm run build:stage1 -- --bootstrap`

組み込みの呼び出しの命令列を以前と同じにしたので, 1 の結果がそのまま不動点だった (92468 bytes).
seed の書き換えは, 演算子のアームの本体を, 組み込みの引数から作ったペイロードを束縛して名前の分岐に移す機械的な変換だった.

## 式エディタ

- 置換メニューに演算子の選択肢は無く, `core.plus` などはパーツの選択肢として出る (検索語 `plus` で `core.plus` が出る)
- 関数のパーツ (型が関数か, 型の無い組み込み) を選ぶと, 引数を未入力にしたそのパーツの呼び出しにする (`partParameters`, `applySelection`. 関数型の引数はラムダ式).
  呼び出しを別のパーツに差し替えるときは同じ名前の引数の式を引き継ぐ (`core.less-than` → `core.less-than-or-equal`).
  呼び出す関数の名前のバッジは呼び出しの一部なので, 押すと呼び出し全体を選ぶ ([call-syntax.md](call-syntax.md))
- ツリーでは他のパーツの呼び出しと同じく `call core.plus left: … right: …` と表示する
