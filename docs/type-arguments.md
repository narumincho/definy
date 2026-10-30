# 型引数 (型も普通の引数)

definy では Zig や Idris2 と同じく, 型引数と普通の引数を区別しません。
型は `type` 型の値で, 関数は型を普通の引数として受け取り, 後ろの引数の型と戻り値の型からその引数を参照できます (依存関数型)。

```text
core.list-map: (T: type, U: type, f: (item: T) -> U, xs: List<T>) -> List<U>

core.list-map(T: number, U: boolean, f: (item) => core.less-than(left: item, right: 2), xs: [1, 2])
// => [true, false]
```

データ (コミットする式) には型引数を必ず書きます (Zig と同じ。型は実行時にも値なので, 呼び出しに入っていないと渡せない)。
書く手間はエディタの推論で省きます (2026-10-30 にユーザーが決定):

- 未入力の型引数の枠に, 他の引数の型から推論した型を表示する
- 確定するときは, 推論した型を置換メニューの選択肢の 1 番目に置いておき, それを選ぶ
- 確定するまでは未入力 (`hole`) のままなので, 型検査とコミットはできない

推論は型チェッカーで他の引数の推論した型を聞き, 呼び出すパーツの引数の型の `type_parameter(T)` と照らし合わせて求める (エディタ側)。

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

## まだ無いもの

- 型引数を書かずにコミットすること (Idris2 の暗黙の引数)。推論はエディタが表示するだけで, データには確定した型引数を書く
- 型の位置で任意の関数を評価すること。型の式に書ける呼び出しは, 型を返すパーツ (宣言式が型を返す関数) の呼び出しだけ
- 関数の型の中で同じ名前の型引数を入れ子に宣言したときの区別 (外側の型引数と同じとみなす)
- コンパイラ組み込みのパーツ (`core.list-get` など) は型引数を取らず, 型チェッカーが名前で特別扱いしている
  ([builtin-parts.md](builtin-parts.md))。型引数を取る形にすると seed の全ての呼び出しに型引数を書くことになる
