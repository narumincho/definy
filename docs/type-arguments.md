# 型引数 (型も普通の引数)

definy では Zig や Idris2 と同じく, 型引数と普通の引数を区別しません。
型は `type` 型の値で, 関数は型を普通の引数として受け取り, 後ろの引数の型と戻り値の型からその引数を参照できます (依存関数型)。

```text
core.list-map: (T: type, U: type, f: (item: T) -> U, xs: List<T>) -> List<U>

core.list-map(T: number, U: boolean, f: (item) => core.less-than(left: item, right: 2), xs: [1, 2])
// => [true, false]
```

型引数は書かなくてもよく, 書かなければ型チェッカーが推論します (Idris2 の暗黙の引数と同じ)。
エディタでの扱い (2026-10-30 にユーザーが決定):

- 未入力の型引数の枠に, 他の引数の型から推論した型を表示する
- 確定するときは, 推論した型を置換メニューの選択肢の 1 番目に置いておき, それを選ぶ
- 確定しないまま (未入力 `hole` のまま) でも型検査が通り, コミットできる (2026-10-31 にユーザーが決定。下の「未確定の型引数」)

推論は型チェッカーで他の引数の推論した型を聞き, 呼び出すパーツの引数の型の `type_parameter(T)` と照らし合わせて求める
(エディタ側. 下の「エディタ」)。

## 未確定の型引数 (2026-10-31)

確定していない型引数はデータ (コミットする式) でも未入力 `{"#hole": {"probe": false}}` のままです。
型は実行時にも値なので, 実行・コンパイルの前に推論した型で埋めます。

```text
core.list-map(T: □, U: □, f: (item) => core.less-than(left: item, right: 2), xs: [1, 2])  // List<boolean> の位置
// T = number (xs: List<T> と [1, 2] の型 List<number> から), U = boolean (戻り値の型 List<U> と期待する型から)
```

- 型チェッカー (`core.type-call-type-arguments`): 型が `type` の引数の実引数が未入力なら `core.type-infer-type-argument` で推論する。
  エディタの枠の表示も同じ推論を使う (下の「エディタ」)。推論の順番:
  1. 引数の型が `parameter(T)` を含むほかの引数 (未入力でないもの) を, パーツの型の引数の順に推論し (`core.type-check`),
     引数の型と照らし合わせて `parameter(T)` の位置の型を取る (`core.type-match-parameter`。リスト・関数・レコード・直和型・
     `Code`・`apply` の中を同じ位置どうしでたどる)
     - 実引数がラムダ `(item) => ...` なら, 引数の型 `(item: T) -> U` にそれまでに決まった型引数 (`known`. パーツの型の引数の
       順で前にある型引数) を代入し, ラムダの引数をその型で型環境に足して本体の型を推論する (`core.type-infer-function-body`)。
       その本体の型と戻り値の型 `U` を照らし合わせる (2026-10-31 に追加. 型引数どうしの依存)
     - 引数の型にまだ決まっていない型引数があって本体の型が `parameter(T)` そのものになったときは, 推論できなかったとみなす
  2. 分からなければ, 呼び出しの位置で期待する型と戻り値の型を照らし合わせる。期待する型は検査する位置
     (`core.type-check-against-unlocated` の呼び出し) だけで分かり, `core.type-check-function-call` の `expected_type` で渡す
  3. それでも分からなければ型エラー `the type argument 'T' is not entered and could not be inferred ...`
  - 例: `let mapped = core.list-map(T: □, U: □, f: (item) => item < 2, xs: [1, 2]) in mapped` は期待する型が無いが,
    T = number (xs から) を `f` の引数の型に代入して本体の型 boolean から U = boolean
  - 依存は前にある型引数から後ろへの一方向だけ (`known` は前から順にたまる)。後ろの型引数を使わないと決まらない前の型引数は推論しない
- 期待する型を聞く未入力 (`probe: true`) を型引数の位置に置くと, `hole_expected_type` の `expected` は `type`,
  `inferred_type_argument` に推論した型 (できなければ `none`) が入る。ほかの位置の `hole_expected_type` では `none`
- 型検査 (`createTypeCheckSession` の `check`, サーバーの `SubmitEvent` と UI 共通): 式に未入力があっても,
  その全てが推論できる型引数なら受け付ける (未入力ごとに probe にして `inferred_type_argument` を聞く。
  `src/type_argument_holes.ts`. サーバーでは同じことを definy の `definy.holes-are-inferred-type-arguments` で行う. [service.md](service.md))。型引数でない未入力が 1 つでもあれば今まで通り `not supported: Expression has an unfilled hole`
- 実行 (実行パネル, `runExpression` の `fillTypeArguments`): 入力した式と参照するパーツの未確定の型引数を
  `TypeCheckSession.fillTypeArguments` で推論した型の式にしてからコンパイルする。推論した型の中の型引数の参照 `T` は,
  その位置から見える同じ名前の関数の引数の変数にする。型環境はコミット済みのパーツ (エディタの期待する型と同じ)
- まだ埋めずにコンパイルする所 (未入力のあるパーツは参照できないパーツになる): サーバーの定義の式の評価
  (`definition_evaluator.ts`), `wasi.io` の `run_part`, stage1 の作り直し (`compiler_rebuild.ts`), イベントの検査

## 型を返すパーツ (型引数を取る型)

型パーツは型が `type` のパーツで, 型引数を取る型は `type` を返す関数のパーツです。

```text
core.option: (T: type) -> type = (T) => union { none, some(T) }
```

型の中では `core.option(T: number)` のように呼び出して使います。インラインで `union { none, some(number) }` と書く代わりに使えます。
ユーザーも同じ形で型を返すパーツ (`pair: (A: type, B: type) -> type = (A, B) => { first: A, second: B }` など) を作れます。
型パーツの中身は `core.define-type(...)` の定義の式で預ける ([part-definition.md](part-definition.md))。
型パーツかどうかは `core.is-type-part-type` (TypeScript 側は `isTypePartType`) が決めます: 型が `type` か, `type` を返す関数。

## `core.type-ast`

| 型                                                   | 意味                                                                                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `{"#type": null}`                                    | 型の型。型引数の引数の型                                                                                                    |
| `{"#parameter": "T"}`                                | 関数の型の型引数 `T` の参照。関数の本体の中では `T` とだけ等しい (中身の分からない型)                                       |
| `{"#apply": {part_hash, arguments: [{name, type}]}}` | 型を返すパーツの呼び出し `core.option(T: number)`。同じパーツを同じ引数 (名前ごと, 順番によらない) で呼んだものだけが等しい |

パーツの型 (JSON) では次のように書きます。

```json
{
  "#function": {
    "parameters": [
      { "name": "T", "type": { "#type": null } },
      {
        "name": "xs",
        "type": { "#list": { "item_type": { "#parameter": "T" } } }
      }
    ],
    "return_type": {
      "#apply": {
        "part_hash": { "$part": "core.option" },
        "arguments": [{ "name": "T", "type": { "#parameter": "T" } }]
      }
    }
  }
}
```

## 型検査

- 呼び出し (`core.type-check-function-call`): 呼び出す関数の型の引数のうち型が `type` のものは型引数。
  実引数を `type` として検査し, `core.type-expression-to-type-ast` で `core.type-ast` にしてから (`core.type-call-type-arguments`),
  ほかの引数の型と戻り値の型の `parameter(名前)` に代入して (`core.type-substitute`) 普通の呼び出しと同じく検査する。
  型引数の実引数に書けるのは型の式 (`number`, `List<...>` など)・型パーツの参照・型を返すパーツの呼び出し・スコープにある型引数の変数
- 関数の本体 (`core.type-check-function`): 型が `type` の引数は型環境の `type_parameters` にも足す (`core.type-env-extend-parameter`)。
  本体の中の呼び出しでその変数を型引数に渡すと `parameter(名前)` になる
- 型を返すパーツの宣言式 `(T) => union {...}` は `core.type-expression-to-type-ast` が, 関数の引数をスコープに入れた本体
  (`union { none, some(parameter("T")) }`) にして, 型パーツの定義 (`{パーツ ID}#definition`) として型環境に入れる
- `apply` の展開 (`core.type-resolve-from`): 定義の `parameter` に引数を代入する。展開は `reference` と同じく,
  片方だけが `apply` のときに必要になってから 1 段ずつ行う。`apply` 同士はパーツと引数が同じときだけ代入できる (名前的)
- 型の式 (`type_number` など) を値の位置に書くと型は `type` (`core.type-check-unlocated`)

## 実行時の型の値

型も実行時の値です (消去しない)。型の式は quote と同じ `core.expression` の値になります (`core.type-expression-construct`)。
quote と違い, 型の式でない部分 (型引数の変数・型を返すパーツの呼び出し) は評価し, 型パーツの参照は参照のままの値にします。

```text
core.option(T: string)  // => {"#type_union": [{tag: "none", ...}, {tag: "some", payload_type: {"#some": {"#type_string": null}}}]}
core.type-result        // => {"#part_reference": {part_definition_event_hash: "..."}}
```

型パーツの参照を参照のままにするのは, 再帰する型 (`core.expression` など) の値を作るときに展開が止まらなくなるのを防ぐため。
そのため stage1 に渡すパーツ (`collectReferencedParts`) にも型パーツを宣言式のまま入れる (その先の参照はたどらない)。
`conformance/eval_cases.json` の「list-map takes the item types as arguments」などで stage1 と `core.eval-value` の両方で確かめている。

## エディタ

- パーツの型の行 (型のツリーエディタ): 関数の型の中では, 型が `type` の引数を `Type parameter` の選択肢に出す
  (`typeParameters`, `src/tree_layout/ast_to_layout/control_and_types.ts`)。選ぶと型引数の参照 `type_parameter("T")`
  (型チェッカーの中では `parameter("T")`. [type-expression.md](type-expression.md)) になる
- 型パーツの選択肢には型を返すパーツも出し, 選ぶと型引数が未入力の呼び出し `core.option(T: □)` になる。
  `apply` は型の式では `call` (`part_type.ts`)
- 値の式のエディタで期待する型が `type` の位置 (型引数) では, 型の式の選択肢 (`number`, `List` など) を先に出す (`expectsType`)
- 未入力の型引数の推論 ([src/tree_layout/type_argument_inference.ts](../src/tree_layout/type_argument_inference.ts)):
  呼び出しの型引数が未入力 (`□`) の枠を見つけ, その枠を probe にして型チェッカーに推論した型引数を聞き
  (`findInferredTypeArgument`. `hole_expected_type` の `inferred_type_argument`), 枠に薄く出す (`□ number`)。
  その枠の置換メニューの先頭 (最初から選んだ状態) に推論した型を出し, Enter で確定する (2026-10-30 のユーザーの指示)。
  2026-10-31 まではエディタが TypeScript で同じ推論をしていたが, 型チェッカーの推論 (依存も解く) に一本化した。
  推論した型の型引数の参照 (`T`) は, その位置から見える同じ名前の変数 (関数の型引数の引数) にして書く

## まだ無いもの

- 単一化による推論。今は型引数を 1 つずつ, 前から順に決めるだけ (後ろの型引数を使わないと決まらない前の型引数, 複数の引数の型を
  合わせて決まる型引数は推論しない)
- 型の位置で任意の関数を評価すること。型の式に書ける呼び出しは, 型を返すパーツ (宣言式が型を返す関数) の呼び出しだけ
- 関数の型の中で同じ名前の型引数を入れ子に宣言したときの区別 (外側の型引数と同じとみなす)
- コンパイラ組み込みのパーツ (`core.list-get` など) は型引数を取らず, 型チェッカーが名前で特別扱いしている
  ([builtin-parts.md](builtin-parts.md))。型引数を取る形にすると seed の全ての呼び出しに型引数を書くことになる
