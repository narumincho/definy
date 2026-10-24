# パーツの型定義 (Part Type)

definy におけるパーツ（Part）の型アノテーションおよび型定義の仕様。

## 型も式 (Expression) のUIで定義する

definy では「型も式である」という思想に基づき、パーツの型を値の式と同じ式のツリーエディタで編集する
(パーツ詳細の `type` の行。[ui.md](ui.md) の「パーツの型の行」)。
ネストしたドロップダウンでは Record・Union・Function などの複雑な型を作れなかったため、この形に統一した。

## 対応する型と式

パーツの型 (`partType`, `seeds/schemas` の `PartType`) と型の式は
[src/tree_layout/part_type.ts](../src/tree_layout/part_type.ts) で相互変換できる。

| `partType`                                  | 型の式                                            | 説明                                                                                       |
| :------------------------------------------ | :------------------------------------------------ | :----------------------------------------------------------------------------------------- |
| `"number"` / `"string"` / `"boolean"`       | `"TypeNumber"` / `"TypeString"` / `"TypeBoolean"` | 64 ビット数値型・文字列型・真偽値型                                                        |
| `{ list: T }`                               | `{ TypeList: { item_type } }`                     | 要素型 T のリスト型                                                                        |
| `{ function: { parameters, return_type } }` | `{ TypeFunction }`                                | 複数の名前付き引数型 `[(name, type)]` -> 戻り値型                                          |
| `{ record: [{ key, value }] }`              | `{ TypeLiteral }`                                 | レコード型（直積型 `{ key: Type }`。余剰フィールドを許容する構造的幅サブタイピングに対応） |
| `{ union: [{ tag, payload }] }`             | `{ TypeUnion }`                                   | 直和型（Enum `Tag(Type) \| Tag`）                                                          |
| `{ type_part: ID }`                         | `{ PartReference }`                               | 定義済み型パーツの参照                                                                     |

パーツの型はモジュールコミット (`ModuleCommitEvent`) の各パーツ (`partType`) に入る。

## 関数型（Function）の非カリー化・名前付きパラメータ仕様

definy
における関数はカリー化を行わず、**常に複数の名前付きパラメーター**を持つ非カリー化構造で表現されます。

### 1. 型・式・呼び出しの構造

- **関数型宣言 (`{ function }` / `TypeFunction`)**:
  ```
  (name_1: Type_1, name_2: Type_2, ...) -> ReturnType
  ```
  - 例:
    `list-contains-string: (list: List String, target: String, index: Number) -> Boolean`
  - ゼロ引数関数は空リスト `parameters: []` として表現されます。
- **関数式 (`Function`)**:
  - `parameters`: 各パラメーターは `{ parameter_id: number, parameter_name: string }`
  - `body`: 関数本体式
- **関数呼び出し式 (`Call`)**:
  - `function`: 呼び出し対象
  - `arguments`: 各実引数は `{ name: string, value: 式 }`

### 2. 型検査とサブタイピング仕様

- **引数の名前と順序の一致**:
  実引数は関数型が宣言するパラメータ名および順序と完全に一致して渡される必要があります。
- **パラメータの反変性・戻り値の共変性**:
  関数型同士の代入適合性（`type-assignable`）において、引数型は反変（$ExpectedParam \le ActualParam$）、戻り値型は共変（$ActualReturn \le ExpectedReturn$）として検査されます。

## ローカル変数定義 (`Let`) の複数バインディング仕様

definy では従来、1つの `let` 式で1つのローカル変数しか束縛できなかったため、複数のローカル変数を定義する際に深い入れ子（ネスト）が発生していました。

これを解消し、1つの `let` 式で複数のローカル変数を順次定義できるように拡張しました。

### 1. 構造と構文

- **式構造 (`Let`)**:
  - `bindings`: ローカル変数束縛のリスト
    - `variable_id: number`: 一意のローカル変数ID
    - `variable_name: string`: ローカルパーツ名（変数名）
    - `value`: バインディングの評価式
  - `body`: ローカル変数を利用する本体式
- **擬似テキスト表現**:
  ```
  let [ (name_1 = val_1), (name_2 = val_2), ... ] in body
  ```
- **スコープと評価順序**:
  リストの先頭から順に評価され、先行するバインディングで定義された変数は、後続のバインディングの値の計算式および `body` 内から参照可能です。

### 2. UI とツリーレイアウト

- ツリーエディタ上では、`let` ノード直下に `list` ノード（各要素が `name = value`）と `body` ノードが配置され、視覚的にローカル変数のリストと本体式を編集できます。
- パス表現として、各バインディングの値式には `{ kind: "letBindingValue", index }` (`src/tree_layout/path.ts`) でアクセス・編集します。

## 型パーツと union の代入可能性

型の比べ方は definy 製の型チェッカー (`core.type-assignable` 系) が決める。型パーツは `reference` 型で表し,
片方だけが `reference` のときは中身に展開して比べ, 両方 `reference` ならハッシュが同じときだけ代入できる
([self-hosting.md](self-hosting.md) の「seed・UI のパーツ検査」)。
組み込みの seed のパーツがこの型検査でエラーにならないことは `src/self_hosted_type_check.test.ts` で確かめている。
seed を編集したらこのテストを通すこと.

### 型検査で見つかった seed の誤り (修正済み)

- `core.eval-value`: `less_than` の結果を `number` バリアントに入れていた (`number(true)` になる). `boolean` に修正
- `core.eval-match-arms` / `core.eval-match-arms-inner`: 引数 `arms` の型が `core.expression` になっていた.
  他の match 関連のパーツと同じ `list<{tag, variable_id, body}>` に修正
- `core.type-check-against`: 関数の式に関数ではない型を期待したとき, `type_mismatch` の `actual` (型が入る) に
  関数の式そのものを入れていた. `core.type-error` に `unexpected_function { expected }` を追加し, それを返すように修正
- `sample.self-hosted-definy-server`: `core.type-env` のキー `variables` を `vars` と書いていた
