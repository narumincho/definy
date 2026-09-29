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

| `PartType`                            | 対応する型式 (`Expression`) | 説明                                  |
| :------------------------------------ | :-------------------------- | :------------------------------------ |
| `Number`                              | `Expression::TypeNumber`    | 64ビット数値型                        |
| `String`                              | `Expression::TypeString`    | 文字列型                              |
| `Boolean`                             | `Expression::TypeBoolean`   | 真偽値型                              |
| `List(T)`                             | `Expression::TypeList`      | 要素型 T のリスト型                   |
| `Function { parameter, return_type }` | `Expression::TypeFunction`  | 引数型 -> 戻り値型                    |
| `Record([Field])`                     | `Expression::TypeLiteral`   | レコード型（直積型 `{ key: Type }`）  |
| `Union([Variant])`                    | `Expression::TypeUnion`     | 直和型（Enum `Tag(Type) \| Tag`）     |
| `TypePart(hash)`                      | `Expression::PartReference` | 定義済み型パーツの参照（`@part:...`） |

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
