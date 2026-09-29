# definy のセルフホスト構想 (Self-Hosting)

definy を definy
自身の言語仕様・データ構造・評価器を用いて表現し、自己記述・自己検証可能にするための設計と実装仕様。

## 概要

definy
は、構文木（AST）、型システム、パーツやモジュールのメタデータ、そしてそれらの評価器を
definy
の純粋なデータ構造および式（`Expression`）として自己記述できるセルフホスト環境を目指しています。

これにより、以下の利点が得られます：

1. **コンパイラ・評価器の完全自己完結**:
   外部言語（Rustなど）の変更なしに、definy 言語自体の新機能や最適化を definy
   内で記述・検証可能。
2. **決定論的かつコンテンツ指向の言語定義**: 式や型、モジュール構造自体が
   SHA-256 / Ed25519
   によるコンテンツ指向ハッシュで管理され、バージョンロックと不変性が保証される。
3. **安全なマクロ・メタプログラミング**:
   式をデータとして受け取り、式を返す関数を通常パーツとして安全に定義可能。

## セルフホスト用ビルトインパーツ (`core` モジュール)

### 1. 式 AST: `core.expression`

式（`Expression`）の直和型（Union Type）。definy の全計算式を表現します。

- `number(value: number)`: 数値リテラル
- `string(value: string)`: 文字列リテラル
- `boolean(value: boolean)`: 真偽値リテラル
- `add({ left: expression, right: expression })`: 加算
- `subtract({ left: expression, right: expression })`: 減算
- `multiply({ left: expression, right: expression })`: 乗算
- `divide({ left: expression, right: expression })`: 除算
- `remainder({ left: expression, right: expression })`: 剰余算
- `equal({ left: expression, right: expression })`: 等価判定
- `less_than({ left: expression, right: expression })`: 小なり比較
- `if({ condition: expression, then_expr: expression, else_expr: expression })`:
  条件分岐
- `let({ variable_id: number, value: expression, body: expression })`: 変数束縛
- `variable({ variable_id: number })`: 変数参照
- `function({ parameter_id: number, body: expression })`: 1引数関数
- `call({ function: expression, argument: expression })`: 関数呼び出し
- `record(list<{ key: string, value: expression }>)`: レコード生成
- `record_get({ record: expression, key: string })`: フィールド取得

### 2. 型 AST: `core.type-ast`

型（`Type`）の直和型（Union Type）。自己記述的な型チェッカーやスキーマ検証用。

- `number`: 64bit 数値型
- `string`: 文字列型
- `boolean`: 真偽値型
- `list({ item_type: type-ast })`: リスト型
- `function({ parameter: type-ast, return_type: type-ast })`: 関数型
- `record(list<{ key: string, field_type: type-ast }>)`: レコード型 (直積型)
- `union(list<{ tag: string, payload_type: type-ast }>)`: 直和型
  (タグ付きユニオン型)
- `reference({ part_hash: string })`: 既存パーツ参照型

### 3. パーツ定義: `core.part-definition`

パーツのメタデータおよび実装式を表現するレコード型。

```definy
{
  name: string,
  description: string,
  part_type: type-ast,
  expression: expression
}
```

### 4. モジュール定義: `core.module-definition`

複数のパーツ定義を束ねるモジュールのレコード型。

```definy
{
  name: string,
  description: string,
  parts: list<part-definition>
}
```

### 5. 自己記述評価器: `core.eval-ast`

`expression` 型の AST
を入力として受け取り、その式を解釈実行して結果（数値等）を返す definy
内の純粋関数。

```definy
eval-ast: expression -> number
```

`eval-ast`
は再帰呼び出し（`Expression::PartReference`）およびパターンマッチ（`Expression::Match`）を用いて、definy
の式を definy 自身の中で評価します。

---

## 標準ライブラリ (`std` モジュール)

definy 内で純粋な `Expression::Function`
として構築された実用的なユーティリティ関数群。

| 関数名           | 引数型 -> 戻り値型           | 説明                                                    |
| :--------------- | :--------------------------- | :------------------------------------------------------ |
| `abs`            | `number -> number`           | 数値の絶対値を計算します（負数の場合は 0 - x を返却）   |
| `min`            | `number -> number -> number` | 2つの数値のうち小さい方を返します（カリー化）           |
| `max`            | `number -> number -> number` | 2つの数値のうち大きい方を返します（カリー化）           |
| `sign`           | `number -> number`           | 数値の符号（正: 1, 負: -1, ゼロ: 0）を返します          |
| `bool-to-string` | `boolean -> string`          | 真偽値を文字列 (`"true"` または `"false"`) に変換します |
| `list-is-empty`  | `list<T> -> boolean`         | リストの長さが 0 かどうかを判定します                   |
| `list-head`      | `list<T> -> T`               | リストの先頭要素を取得します                            |

すべてがイベント履歴にコミットされ、決定論的に参照・再利用できます。
