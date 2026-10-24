# quote 式と Code<T> 型 (コードそのものを値にする)

`definy.deploy-to-cloudflare-workers` のように「コードを受け取ってコンパイル・デプロイする」パーツのために,
式を評価せずにその AST を値として渡す `quote` 式がある (issue #733)。

## 構文と型

| 形                                      | 例                                                       |
| --------------------------------------- | -------------------------------------------------------- |
| JSON AST (seeds)                        | `{ "Quote": { "expression": e } }`                       |
| self-hosted AST (`core.expression`)     | `quote(e)` (バリアント)                                  |
| 型 (`core.type-ast`)                    | `code(T)`。表示は `Code<T>`                              |
| パーツの型 (`part_type`, seeds/schemas) | `{ "code": T }`                                          |
| ツリーエディタ (式)                     | `{ Quote: { expression } }`, パスの段 `quoteExpression`  |
| ツリーエディタ (型の式)                 | `{ TypeCode: { value_type } }`, パスの段 `typeCodeValue` |

- `quote(e)` の型は `Code<e の型>`。`Code<T>` は型パーツ `core.code` (`{ expression: core.expression, part_ids: List<string> }`) として扱う
  (`core.type-resolve` が `code` を `core.code` の参照に解決する) ので, `.expression` や `.part_ids` でフィールドを読める
- **中の式は外の変数を使えない**。型チェックは空の変数環境で中の式を調べ (`undefined_variable` になる), ツリーエディタも
  quote の中では外のスコープの変数を出さない。コードは定義された場所から切り離して別の場所 (デプロイ先) で動くため
- 関数 (ラムダ) の型は推論できないので, 関数を quote するときは期待する型が要る。`Code<fn(...) => ...>` 型の引数に渡せば,
  `core.type-check-against` が中の式を `fn(...) => ...` として調べる

## 値: `core.code`

```text
core.code = { expression: core.expression, part_ids: List<string> }
```

- `expression`: 中の式の self-hosted AST (`core.compile-to-wasm` にそのまま渡せる)
- `part_ids`: 中の式が **推移的に** 参照するパーツの ID (URL-safe Base64)。コンパイルするときにパーツの式が要るので,
  `wasi.io` の `get_parts` ([wasi-io.md](wasi-io.md)) で読む

参照パーツの AST そのものは値に入れない。最初は入れていたが, `sample.self-hosted-definy-server` を quote すると
コンパイラ自身ほどの大きさの AST が値になり, 実行中に `RuntimeError: unreachable` (メモリ不足) になった。
ID だけにしてからは 552KB の Wasm を 1.6 秒でコンパイルでき, デプロイ全体も約 3 秒で終わる。

## コンパイルと評価

`core.compile-expr-instructions` / `core.max-local` / `core.eval-value` は `quote(e)` を
`core.quote-value(e, parts)` に置き換えてから処理する。`core.quote-value` は「`core.code` の値を作る式」を返す脱糖で,

- `core.quote-expression` などの `quote-*` パーツが `core.expression` の値を作る式を作る (AST の型定義に沿って機械的に作ったもの)
- `core.quote-part-ids` / `core.quote-part-ids-in-list` / `core.quote-find-part` が参照パーツを `parts` から辿って ID を集める
- `core.quote-string-list` が ID のリストのリテラルを作る

TypeScript 側 (`src/stage1_compiler.ts` の `definyAstToSelfHostedAst`) は `Quote` を `quote` バリアントにするだけ。
seeds で `core.code` などのパーツ ID が要るときは `{"$partId": "core.code"}` と書く (`src/seed_parts.ts` が ID の文字列にし,
`src/seed_export.ts` が戻す)。

## テスト

- `src/self_hosted_type_check.test.ts` の「quote 式の型は Code<中の式の型> で, 中の式は外の変数を使えない」
- `src/quote.test.ts`: 値の形, quote した式を `core.compile-to-wasm` でコンパイルして動かす往復, 入れ子の quote
- `src/tree_layout/quote.test.ts`: ツリーエディタでの選択・パス・表示, `Code<T>` 型の変換
