# definy のセルフホスト構想 (Self-Hosting)

definy を definy
自身の言語仕様・データ構造・評価器を用いて表現し、自己記述・自己検証可能にするための設計と実装仕様。

## 概要

definy
は、構文木（AST）、型システム、パーツやモジュールのメタデータ、そしてそれらの評価器・型チェッカー・コンパイラを
definy
の純粋なデータ構造および式（`Expression`）として自己記述できるセルフホスト環境を実現しています。

これにより、以下の利点が得られます：

1. **コンパイラ・評価器の完全自己完結**:
   外部言語（Rustなど）の変更なしに、definy 言語自体の新機能や最適化を definy
   内で記述・検証可能。
2. **決定論的かつコンテンツ指向の言語定義**: 式や型、モジュール構造自体が
   SHA-256 / Ed25519
   によるコンテンツ指向ハッシュで管理され、バージョンロックと不変性が保証される。
3. **安全なマクロ・メタプログラミング**:
   式をデータとして受け取り、式を返す関数を通常パーツとして安全に定義可能。
4. **自己ホスト WebAssembly 生成**: definy 式から WebAssembly
   バイナリを直接生成でき、外部コンパイラなしでネイティブ/ブラウザ実行可能。

---

## セルフホストのロードマップと到達状況

- [x] **Phase 1: 完全動的値評価器 (Self-Evaluating Interpreter)**
  - 動的値型 `core.value`、変数環境型 `core.env`、環境探索
    `core.env-lookup`、環境拡張 `core.env-extend`
  - 完全動的値自己評価器 `core.eval-value`: `expression -> env -> value`
- [x] **Phase 2: 自己記述型チェッカー (Self-Hosted Type Checker)**
  - 型エラー型 `core.type-error`、型検査結果型 `core.type-result`、型環境
    `core.type-env`
  - 型等価性判定 `core.type-equals`
  - 静的型検査器 `core.type-check`: `expression -> type-env -> type-result`
- [x] **Phase 3: 自己ホスト WebAssembly コンパイラ (Self-Hosted Wasm Compiler)**
  - 式スタック命令列コンパイラ `core.compile-expr-instructions`:
    `expression -> list<number>`
  - 完全 WebAssembly バイナリ生成器 `core.compile-to-wasm`:
    `expression -> list<number>`
  - definy の Wasm VM による即時実行・検証を実証完了
- [x] **Phase 4: 自己記述フォーマッター・メタ循環評価 (Self-Hosted Formatter &
      Meta-Circular Execution)**
  - 自己記述コード整形器 `core.expression-to-source`: `expression -> string`
  - 構文拡張: `let`, `not`, `and`, `or` の完全自己評価 (`core.eval-value`) &
    型検査 (`core.type-check`)
- [x] **Phase 5: パーツ自己検証器 & 完全自己ホストコンパイル実証
      (Self-Validation & End-to-End Compiler Execution)**
  - パーツ妥当性自己検証器 `core.validate-part`: `part-definition -> boolean`
  - Wasm 命令列コンパイラ `core.compile-expr-instructions` の論理演算（`not`,
    `and`, `or`）対応
  - 自己記述コンパイラ `core.compile-to-wasm` による Wasm
    生成・即時実行の実証完了
  - 汎用自己評価器 `core.eval-value`、自己型チェッカー
    `core.type-check`、自己バリデータ `core.validate-part` のメタ循環実証完了

---

## セルフホスト用ビルトインパーツ (`core` モジュール)

### Phase 1: 動的値・環境と完全評価器

#### 1. 動的値型: `core.value`

ランタイム実行時の動的値を表現する直和型（Union Type）。

- `number(value: number)`: 数値
- `string(value: string)`: 文字列
- `boolean(value: boolean)`: 真偽値
- `list(value: list<value>)`: リスト値
- `closure({ parameter_id: number, body: expression, captured_env: env })`:
  レキシカルスコープを保持する関数クロージャ
- `variant({ tag: string, payload: value })`: タグ付き直和型値
- `unit`: 空値

#### 2. 変数環境型 & 補助関数: `core.env`, `core.env-lookup`, `core.env-extend`

- `core.env`: `list<{ variable_id: number, value: value }>`
- `core.env-lookup`:
  `env -> variable_id -> value`（環境の末尾から最新の束縛を線形探索）
- `core.env-extend`:
  `env -> variable_id -> value -> env`（環境の末尾に新しい変数値を追加）

#### 3. 完全動的値評価器: `core.eval-value`

```definy
eval-value: expression -> env -> value
```

- リテラル（数値・文字列・真偽値）、算術演算（`add`, `subtract`, `multiply`,
  `divide`, `remainder`）、等価比較（`equal`）、小なり比較（`less_than`）
- レキシカルスコープ環境による変数解決（`variable`）
- 条件分岐（`if`）
- 関数定義時における環境キャプチャ（クロージャ生成）
- 関数呼び出し（`call`）時におけるキャプチャ環境の復元と引数束縛

---

### Phase 2: 自己記述型チェッカー

#### 1. 型エラー型 & 結果型: `core.type-error`, `core.type-result`

- `core.type-error`:
  - `type_mismatch({ expected: type-ast, actual: type-ast })`: 型の不一致
  - `undefined_variable({ variable_id: number })`: 未定義の変数参照
  - `condition_not_boolean({ actual: type-ast })`: 条件式の型が boolean 以外
  - `unknown_error`: 未知のエラー
- `core.type-result`: `ok(type-ast) | error(type-error)`

#### 2. 型環境型: `core.type-env`, `core.type-env-lookup`, `core.type-env-extend`

- `core.type-env`: `list<{ variable_id: number, var_type: type-ast }>`
- 静的スコープにおける変数の型を追跡。

#### 3. 型等価性判定: `core.type-equals`

```definy
type-equals: type-ast -> type-ast -> boolean
```

2つの `type-ast` が同一の型であるかを再帰的に判定。

#### 4. 静的型チェッカー: `core.type-check`

```definy
type-check: expression -> type-env -> type-result
```

definy の式 AST
を静的に走査し、型安全性を検証して最終的な型または詳細な型エラーを返却。

---

### Phase 3: 自己ホスト WebAssembly コンパイラ

#### 1. スタックマシン命令列コンパイラ: `core.compile-expr-instructions`

```definy
compile-expr-instructions: expression -> list<number>
```

式 AST を WebAssembly
のバイトコード命令列（`list<number>`）へ再帰的に変換します。

- `number`: `i64.const` (`0x42`) + LEB128 エンコードバイト列
- `add`: 左辺命令列 + 右辺命令列 + `i64.add` (`0x7c`)
- `subtract`: 左辺命令列 + 右辺命令列 + `i64.sub` (`0x7d`)
- `multiply`: 左辺命令列 + 右辺命令列 + `i64.mul` (`0x7e`)
- `divide`: 左辺命令列 + 右辺命令列 + `i64.div_s` (`0x7f`)
- `equal`: 左辺命令列 + 右辺命令列 + `i64.eq` (`0x51`)
- `less_than`: 左辺命令列 + 右辺命令列 + `i64.lt_s` (`0x53`)

#### 2. 完全 Wasm モジュール生成器: `core.compile-to-wasm`

```definy
compile-to-wasm: expression -> list<number>
```

スタック命令列をラップし、完全で実行可能な WebAssembly
バイナリ（`list<number>`）を組み立てて出力します。

出力されるバイナリ構造：

1. **Magic Header** (8 bytes): `\0asm` (`[0x00, 0x61, 0x73, 0x6d]`) + Version 1
   (`[0x01, 0x00, 0x00, 0x00]`)
2. **Type Section** (Section 1): 1 つの関数シグネチャ `() -> i64`
3. **Function Section** (Section 3): Type 0 を参照する 1 つの関数
4. **Export Section** (Section 7): 関数 0 を `"main"` としてエクスポート
5. **Code Section** (Section 10): ローカル変数定義（0個）+
   コンパイルされたスタック命令列 + `end` (`0x0b`)

生成されたバイト列は、definy の Wasm VM およびブラウザの
`WebAssembly.instantiate` で即座にロード・実行できます。

---

### Phase 4: 自己記述フォーマッターとメタ循環評価

#### 1. 式 AST コード整形器: `core.expression-to-source`

```definy
expression-to-source: expression -> string
```

definy の式
AST（`core.expression`）を受け取り、対応するソースコード文字列（`string`）を再帰的に組み立てて出力する純粋な
definy パーツ。

- `number`: `"<number>"`
- `string`: 文字列リテラルそのもの
- `boolean`: `"true"` または `"false"`
- `add`, `subtract`, `multiply`, `divide`, `remainder`:
  括弧と二項演算子記号付き文字列（例: `"((a + b) * c)"`）
- `equal`, `less_than`: 比較式文字列（例: `"(a < b)"`）
- `and`, `or`: 論理結合文字列（例: `"(a && b)"`）
- `not`: 単項否定文字列（例: `"!a"`）
- `if`: `"if (cond) then then_expr else else_expr"`
- `call`: `"fn(arg)"`
- `variable`: 変数参照文字列

#### 2. メタ循環評価 (Meta-Circular Evaluation) 実証

definy 式として記述された評価器・フォーマッターパーツは、definy の WebAssembly
実行基盤（`definy-core`）上で直接実行・検証されています。

- `test_self_hosted_meta_circular_eval_ast_execution`: `core.eval-ast`
  パーツに多項式 AST `(100 - (10 * 3)) + (50 / 2)` を与えて実行し、自己評価結果
  `95` を実証。
- `test_self_hosted_expression_to_source_execution`: `core.expression-to-source`
  パーツに `10 + 20` の AST を与えて実行し、自己整形結果
  `"((<number> + <number>))"` を実証。

---

### Phase 5: パーツ自己検証器 & 完全自己ホストコンパイル実証

#### 1. パーツ妥当性自己検証器: `core.validate-part`

```definy
validate-part: part-definition -> boolean
```

definy
のパーツ定義メタデータ（`core.part-definition`）を受け取り、そのパーツの式（`expression`）が自己記述型チェッカー（`core.type-check`）によって推論された型と、パーツの宣言型（`part_type`）が
`core.type-equals` で一致するかを判定する自己完結バリデータ。

- 入力パーツの式を空の型環境（`[]`）で静的型検査
- 型検査が `ok(inferred_type)` の場合、宣言型との等価性を `type-equals` で判定
- 型不一致または型エラーの場合は `false` を返却

#### 2. 完全自己ホストコンパイル & メタ循環実行の実証

definy のテストスイート（`self_hosting_tests.rs`）において、以下の end-to-end
メタ循環実行が実証されています：

- **`test_self_hosted_compile_to_wasm_execution`**: `core.compile-to-wasm`
  パーツを呼び出して WebAssembly
  バイトコード（`list<number>`）を自己生成。その生成バイト列を Wasm VM
  でロード・実行し、正しく `42` が算出されることを実証。
- **`test_self_hosted_meta_circular_eval_value_execution`**: 完全動的値評価器
  `core.eval-value`
  を呼び出し、算術演算（`10 + 25 = 35`）が自己解釈実行されることを実証。
- **`test_self_hosted_type_checker_execution`**: 静的型チェッカー
  `core.type-check` を呼び出し、式 `10 + 20` に対して正しく `ok(number)`
  が導出されることを実証。
- **`test_self_hosted_validate_part_execution`**: パーツ検証器
  `core.validate-part` を呼び出し、パーツ定義の型整合性が `true`
  と正しく判定されることを実証。

---

## 既存の型定義・AST・標準ライブラリ

### 1. 式 AST: `core.expression`

definy の全計算式を表現する直和型。

### 2. 型 AST: `core.type-ast`

`number`, `string`, `boolean`, `list`, `function`, `record`, `union`,
`reference` を表現する直和型。

### 3. パーツ定義 & モジュール定義: `core.part-definition`, `core.module-definition`

メタデータ（名前、説明、型、式）をコンテンツ指向で保持するレコード型。

### 4. 標準ライブラリ (`std` モジュール)

- `abs`: `number -> number`
- `min`, `max`: `number -> number -> number`
- `sign`: `number -> number`
- `bool-to-string`: `boolean -> string`
- `list-is-empty`: `list<T> -> boolean`
- `list-head`: `list<T> -> T`
