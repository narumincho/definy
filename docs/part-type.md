# パーツの型定義 (Part Type)

definy におけるパーツ（Part）の型アノテーションおよび型定義の仕様。

## 型も式 (Expression) のUIで定義する

definy では「型も式である」という思想に基づき、パーツの型を値の式と同じ式のツリーエディタで編集する
(パーツ詳細の `type` の行。[ui.md](ui.md) の「パーツの型の行」)。
ネストしたドロップダウンでは Record・Union・Function などの複雑な型を作れなかったため、この形に統一した。

## 対応する型と式

パーツの型は型パーツの宣言と同じ型の式 (`core.expression` の `type_*` などの値) で書き, seed と CAS にもその形で置く
([type-expression.md](type-expression.md))。TypeScript の中 (`partType`) と型チェッカーは `core.type-ast` の値で扱い,
[src/part_type_expression.ts](../src/part_type_expression.ts) で相互変換する。

| `partType` (`core.type-ast`)                                     | 型の式 (seed, CAS)                                                              | 説明                                                                                       |
| :--------------------------------------------------------------- | :------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------- |
| `{"#number": null}` / `{"#string": null}` / `{"#boolean": null}` | `{"#type_number": null}` / `{"#type_string": null}` / `{"#type_boolean": null}` | 64 ビット数値型・文字列型・真偽値型                                                        |
| `{"#secret": null}`                                              | `{"#type_secret": null}`                                                        | シークレット ([secret.md](secret.md))                                                      |
| `{"#list": {item_type: T}}`                                      | `{"#type_list": {item_type}}`                                                   | 要素型 T のリスト型                                                                        |
| `{"#function": {parameters: [{name, type}], return_type}}`       | `{"#type_function": {parameters: [{name, type}], return_type}}`                 | 複数の名前付き引数型 `[(name, type)]` -> 戻り値型                                          |
| `{"#record": [{key, field_type}]}`                               | `{"#type_record": [{key, value}]}`                                              | レコード型（直積型 `{ key: Type }`。余剰フィールドを許容する構造的幅サブタイピングに対応） |
| `{"#union": [{tag, payload_type: option}]}`                      | `{"#type_union": [{tag, payload_type: option}]}`                                | 直和型（Enum `Tag(Type) \| Tag`）                                                          |
| `{"#reference": {part_hash: ID}}`                                | `{"#part_reference": {part_definition_event_hash: ID}}`                         | 定義済み型パーツの参照                                                                     |
| `{"#code": T}`                                                   | `{"#type_code": {value_type: T}}`                                               | quote した式の型 `Code<T>` ([quote.md](quote.md))                                          |
| `{"#type": null}`                                                | `{"#type_type": null}`                                                          | 型パーツ (式が型の宣言). 型引数の型 ([type-arguments.md](type-arguments.md))               |
| `{"#parameter": "T"}`                                            | `{"#type_parameter": "T"}`                                                      | 関数の型の型引数 `T` の参照                                                                |
| `{"#apply": {part_hash, arguments: [{name, type}]}}`             | `{"#call": {function: part_reference, arguments: [{name, value}]}}`             | 型を返すパーツの呼び出し `core.option(T: number)`                                          |
| `null`                                                           | `null`                                                                          | 型指定なし                                                                                 |

パーツの型はプロジェクトのコミット (`project_commit`) の各モジュールの各パーツ (`partType`) に入る。

## 関数型（Function）の非カリー化・名前付きパラメータ仕様

definy
における関数はカリー化を行わず、**常に複数の名前付きパラメーター**を持つ非カリー化構造で表現されます。

### 1. 型・式・呼び出しの構造

- **関数型宣言 (`function` / `type_function`)**:
  ```
  (name_1: Type_1, name_2: Type_2, ...) -> ReturnType
  ```
  - 例:
    `list-contains-string: (list: List String, target: String, index: Number) -> Boolean`
  - ゼロ引数関数は空リスト `parameters: []` として表現されます。
- **関数式 (`function`)**:
  - `parameters`: 各パラメーターは `{ parameter_id: number, parameter_name: string }`
  - `body`: 関数本体式
- **関数呼び出し式 (`call`)**:
  - `function`: 呼び出し対象 (`core.callee`。[call-syntax.md](call-syntax.md))
  - `arguments`: 各実引数は `{ name: string, value: 式 }`

### 2. 型検査とサブタイピング仕様

- **引数の名前と順序の一致**:
  実引数は関数型が宣言するパラメータ名および順序と完全に一致して渡される必要があります。
- **パラメータの反変性・戻り値の共変性**:
  関数型同士の代入適合性（`type-assignable`）において、引数型は反変（$ExpectedParam \le ActualParam$）、戻り値型は共変（$ActualReturn \le ExpectedReturn$）として検査されます。

## ローカル変数定義 (`let`)

### 1. 構造

- **式構造 (`let`)**: 束縛 1 つずつの入れ子 `{"#let": {variable_id, variable_name, value, body}}`。
  - `variable_id: number`: 一意のローカル変数ID
  - `variable_name: string`: 変数名
  - `value`: 束縛する値の式
  - `body`: 変数を使う本体の式。続けて束縛するときは本体をまた `let` にする
- **擬似テキスト表現**: `let x = 1 in let y = x in body`
- 以前は 1 つの `let` に束縛のリスト (`bindings`) を持たせていたが、`core.expression` の値そのものを保存する形
  ([value-encoding.md](value-encoding.md)) にしたときに、`core.expression` と同じ束縛 1 つずつの形にした。

### 2. UI とツリーレイアウト

- ツリーエディタでは、続けて書いた `let` を 1 つのブロックとして見せる。`let` ノード直下に `list` ノード
  (各要素が `name = value`) と `body` ノードが並ぶ (`src/tree_layout/expression.ts` の `letChainOf`)。
- パス表現として、各束縛の値の式には `{ kind: "letBindingValue", index }` (`src/tree_layout/path.ts`) で、
  本体には `letBody` でアクセス・編集する。どちらもまとめたブロックの中の番号で、書き戻すと入れ子の `let` に戻す。

## 型パーツと union の代入可能性

型の比べ方は definy 製の型チェッカー (`core.type-assignable` 系) が決める。型パーツは `reference` 型で表し,
片方だけが `reference` のときは中身に展開して比べ, 両方 `reference` ならハッシュが同じときだけ代入できる
([self-hosting.md](self-hosting.md) の「seed・UI のパーツ検査」)。
組み込みの seed のパーツがこの型検査でエラーにならないことは `src/self_hosted_type_check.test.ts` で確かめている。
seed を編集したらこのテストを通すこと.

### 型パーツの参照の展開と循環

`core.type-resolve` は参照を型パーツの定義に展開し, 定義がまた型パーツの参照ならそれも展開する (`core.type-resolve-from`)。
型の構築子 (レコード・union・リストなど) を通らずに辿った参照に戻ったら, そこで展開をやめてその参照を返す。
型パーツの宣言がそのような循環 (`A = B`, `B = A`) なら, 型チェッカーは `invalid_type_declaration` にする (`core.type-reference-cycle`)。
以前は循環した型の値を検査すると型チェッカーが展開を繰り返し, 約 9 秒走ってから `unreachable` で落ちていた。
`core.expression` のように型の構築子を通る再帰はそのまま書ける。

### 型検査で見つかった seed の誤り (修正済み)

- `core.eval-value`: `less_than` の結果を `number` バリアントに入れていた (`number(true)` になる). `boolean` に修正
- `core.eval-match-arms` / `core.eval-match-arms-inner`: 引数 `arms` の型が `core.expression` になっていた.
  他の match 関連のパーツと同じ `list<{tag, variable_id, body}>` に修正
- `core.type-check-against`: 関数の式に関数ではない型を期待したとき, `type_mismatch` の `actual` (型が入る) に
  関数の式そのものを入れていた. `core.type-error` に `unexpected_function { expected }` を追加し, それを返すように修正
- `sample.self-hosted-definy-server`: `core.type-env` のキー `variables` を `vars` と書いていた
