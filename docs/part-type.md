# パーツの型定義 (Part Type)

definy におけるパーツ（Part）の型アノテーションおよび型定義の仕様。

## 型も式 (Expression) のUIで定義する

definy では「型も式である」という思想に基づき、パーツの型（Part
Type）を値の式（Expression）と同じ式エディタ UI（`render_root_expression_editor`
/ `ExpressionEditorContainer`）で定義・編集する。

- 従来はパーツ作成フォームにネストしたドロップダウンUIが存在したが、表現力が乏しく複雑な型（Record,
  Union, Function など）を定義できなかった。
- また、パーツ詳細画面（`PartDetailView`）には型を定義・編集するUIが存在しなかった。

これらを解消し、パーツ作成フォームおよびパーツ詳細画面の両方で、`expected_type: Some(ExpressionType::Type)`
を指定した式エディタを用いて視覚的に型を定義できるように統一した。

## 対応する型と式

`PartType` と型式（`Expression`）は相互変換（`PartType::to_expression` /
`PartType::from_expression`）可能。

| `PartType`                            | 対応する型式 (`Expression`) | 説明                                                                                       |
| :------------------------------------ | :-------------------------- | :----------------------------------------------------------------------------------------- |
| `Number`                              | `Expression::TypeNumber`    | 64ビット数値型                                                                             |
| `String`                              | `Expression::TypeString`    | 文字列型                                                                                   |
| `Boolean`                             | `Expression::TypeBoolean`   | 真偽値型                                                                                   |
| `List(T)`                             | `Expression::TypeList`      | 要素型 T のリスト型                                                                        |
| `Function { parameter, return_type }` | `Expression::TypeFunction`  | 引数型 -> 戻り値型                                                                         |
| `Record([Field])`                     | `Expression::TypeLiteral`   | レコード型（直積型 `{ key: Type }`。余剰フィールドを許容する構造的幅サブタイピングに対応） |
| `Union([Variant])`                    | `Expression::TypeUnion`     | 直和型（Enum `Tag(Type) \| Tag`）                                                          |
| `TypePart(hash)`                      | `Expression::PartReference` | 定義済み型パーツの参照（`@part:...`）                                                      |

## イベント仕様

- **パーツ作成**: `PartDefinitionEvent { part_type: Option<PartType>, ... }`
- **パーツ更新**: `PartUpdateEvent { part_type: Option<PartType>, ... }`
  - `PartUpdateEvent` にも `#[serde(default)] pub part_type: Option<PartType>`
    を保持し、パーツ詳細画面で型を変更して保存した際にも正しく最新の型がプロジェクションに反映される。

## パーツの統一モデルとセレクタUI

definy
には「組み込み専用パーツ」という区別はなく、`number`、`string`、`boolean`、`list`
などの基本型や `number-literal`、`plus`
等の演算もすべて通常のパーツ（`Part`）としてイベント履歴上に定義されている。将来的にリテラル等もカスタマイズ可能となる設計方針である。

### 式エディタでの型入力とランキング

- **式の部分への型入力**:
  式の入力スロットには、値の計算式だけでなく型パーツ（`number`
  など）も入力可能。
- **期待型（`expected_type`）に応じた優先順位ソート**:
  - スロットの期待型と一致する選択肢（例: 型定義エディタでは `number`
    などの型パーツ、数値式エディタでは `number-literal` や `plus`
    など）は上位（rank 0）に表示される。
  - 型が合わない選択肢（例: 数値式エディタ内での `number`
    型パーツ）は選択肢の下位（rank 2）にソートされる。
- **表示名**: `Type: Number`
  のような固定プレフィックスではなく、パーツ名そのまま（`number`）で表示される。
- **パーツ詳細リンク（`↗`）**:
  - すべてのパーツ選択肢の右側にパーツ詳細画面へのリンク（`↗`）が表示される。
  - リンクをクリックした際はドロップダウンの選択決定（入力）は行われず、パーツ詳細画面へのクライアントサイドルーティング遷移が実行される。

## 直和型（Union）とパターンマッチ（Match）の型検査仕様

definy の自己記述型チェッカー（`core.type-check`,
`core.type-assignable`）における直和型とパターンマッチの検査仕様：

### 1. 直和型の双対的サブタイピング（Dual Subtyping）

- レコード型が余剰フィールドを許容する幅サブタイピング（$Expected \subseteq Actual$）であるのに対し、直和型は双対的に
  **実際のバリアントが期待型の部分集合であること**
  を要求します（$Actual \subseteq Expected$）。
- これにより、`variant("some", 42)` 式単体は `union([ some: number ])`
  型として推論され、明示的な型注釈なしに
  `Option<number>`（`union([ none: {}, some: number ])`）の期待型スロットへ適合（代入）可能です。

### 2. パターンマッチ式の網羅性・型一致検査

- `match`
  式の対象（`target`）は直和型（`union`）である必要があります（非直和型の場合は
  `not_a_union` エラー）。
- 各アーム（`arm`）で指定されたタグが対象直和型に存在しない場合は
  `variant_not_found` エラーとなります。
- 各アームの本体（`body`）は、バリアントのペイロード型で束縛変数を拡張した型環境上で検査されます。
- 全アームの戻り値型は相互に代入適合（`type-assignable`）していなければならず、不一致時は
  `type_mismatch` エラーとなります。
- 直和型が持つすべてのバリアントがマッチアームに存在しているかを網羅性検査（`check-union-exhaustiveness`）で検証し、欠落時は
  `non_exhaustive_match` エラーとなります。

## リスト型（List）の型検査仕様

definy の自己記述型チェッカー（`core.type-check`, `core.type-check-against`,
`core.type-assignable`）におけるリスト型の検査仕様：

### 1. 要素型の推論と全要素の一致検査

- リスト式（`list` リテラル）に 1 つ以上の要素がある場合、先頭要素から要素型 $T$
  を推論し、後続の全要素が $T$
  に代入適合（`type-assignable`）することを検証します。
- 途中に異なる型の要素が含まれる場合（例: `[10, "string"]`）、`type_mismatch`
  エラーとなります。

### 2. 空リスト `[]` の双方向型推論

- 期待型のないボトムアップ推論（`type-check`）では、空リストの要素型が一意に定まらないため、明示的に
  `cannot_infer_empty_list` エラーを返却して不健全な `any` 化を防ぎます。
- 期待型 $list<T>$
  が与えられているトップダウン検査（`type-check-against`）では、空リストであっても直ちに期待型
  $list<T>$ に適合すると判定されます。

### 3. リスト型の共変サブタイピング（Covariant Subtyping）

- リスト型は要素型に関して完全に共変です（$ActualItem \le ExpectedItem \implies list<ActualItem> \le list<ExpectedItem>$）。
- これにより、レコードの幅サブタイピング（$Expected \subseteq Actual$）を満たすレコードリスト（例:
  `list<{x: number, y: string}>`）は、余剰フィールドを許容して
  `list<{x: number}>` の期待型スロットへ安全に代入可能です。
