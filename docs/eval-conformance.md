# 評価器の適合テスト

definy の式評価について, 実装間の適合性をテストで確かめています。どちらの実装も definy で書かれています
(以前あった TypeScript 製評価器 `worker/cbor_eval.ts` は, 言語の意味を TypeScript で二重に定義していたので削除しました)。

1. **自己記述コンパイラ (`wasm/stage1.wasm` + `src/stage1_compiler.ts`)**: 式を stage1 で Wasm にコンパイルして実行します
2. **自己記述評価器 (`core.eval-value`)**: 式を `core.expression` の値にして, 参照するパーツと一緒に `core.eval-value(expr, [], parts)` で評価します

## テストのパーツ (2026-11-10 から)

適合テストの大半 (130 件) は definy のテストのパーツです。definy プロジェクトのモジュール `conformance` の
`test-*` (型は `Boolean`) で, 中身は `@core.equal(left: 式, right: 期待する値)` (期待する値が型の分からないバリアントなら
`match 式 { #some(value$900) => @core.equal(...), _ => false }`) です。

- 評価器では MCP の `definy_run_tests` が動かします ([local-server.md](local-server.md))。
  `worker/mcp_endpoint.test.ts` の「definy プロジェクトのテスト」が CI でも動かし, 1 つでも落ちれば失敗します
- stage1 では `src/stage1_conformance.test.ts` が各パーツをコンパイルして実行し, `true` になるかを確かめます
- 足すときは手元のサーバーの `definy_commit_parts` で `conformance.test-...` を足します (型検査を通るものだけ置ける)
- 2^53 を超える整数のリテラルは, 今はコミットして読み直すと値が変わります ([language-open-questions.md](language-open-questions.md))。
  `int64` の最小値は `@core.shift-left(left: 1, right: 63)`, 最大値は `@core.minus(left: @core.shift-left(left: 1, right: 63), right: 1)` のように計算で作ります。
  移すときに見つけた `std.number-to-string` の最小値での無限再帰 (符号を反転しても負のまま) は直した (`std.test-number-to-string`)

2026-11-10 に `conformance/eval_cases.json` (142 件) の式を作業用のスクリプトでテキストにして入れた。

## 型検査を通らない式のテスト (`conformance/eval_cases.json`)

型検査を通らない式 (let で束縛したラムダの呼び出し, 型のパーツの無いバリアントの `match`, 型を値として返すラムダなど) の
12 件は `conformance/eval_cases.json` に残しています。`name` / `expression` / `expected` の組です。

- `expression` は `core.expression` の値, `expected` は definy の値で, どちらも [value-encoding.md](value-encoding.md) の形で書きます
  (レコードは `{"key": value}`, タグ付きの値は `{"#tag": payload}`)。
- `{"$part": "std.abs"}` はビルトインパーツの ID に解決されます。
- `src/stage1_conformance.test.ts` (stage1) と `src/eval_value_conformance.test.ts` (評価器を stage1 でコンパイルして実行し,
  返った `core.value` を正規化表現に直して比べる) が動かします

## 実行

```bash
npm test                                          # 全テスト
npx vitest run src/stage1_conformance.test.ts     # stage1 (テストのパーツと JSON)
npx vitest run src/eval_value_conformance.test.ts # core.eval-value (JSON)
# 手元のサーバーの MCP で: definy_run_tests {"project": "definy", "prefix": "conformance."}
```

## stage1.wasm の入力 (`src/stage1_compiler.ts`)

stage1 (`core.compile-to-wasm`) は次の 2 つを引数に取ります。

1. **式**: `core.expression` の値。パーツに保存した式をそのまま渡します ([value-encoding.md](value-encoding.md))。
   `writeLiteral` (`src/stage1_compiler.ts`) が JSON の値を Wasm の値にするだけで, 式の構造は変換しません。
   - 未入力 (`hole`) を含む式は `compile()` が `SelfHostedAstConversionError` にします (`assertCompilable`)。
2. **参照するパーツ**: `list<{ id: string, expression: core.expression }>`。式から `part_reference` を
   参照先までたどって集めます (`collectReferencedParts`)。`id` は `part_reference` のパーツ ID の文字列と同じです。
   見つからない・式を持たない・型パーツ (式が `type_*` の宣言)・未入力を含むパーツは渡さず `unresolved` として返します。
   stage1 は渡されなかったパーツへの参照を `unreachable` にコンパイルするので, 呼び出し側は `unresolved` が空でなければ評価前にエラーにします。

さらに以前 (2026-10-21 より前) は TS 側の変換が数値・文字列・算術・`Let` しか扱わず, 参照するパーツも渡していなかったため,
`Call` + `PartReference` を含む式 (`sample.sample-ast-calc` など) は `Unsupported literal node in layout` で失敗し,
適合テストの 44 件が `it.fails` になっていました。また入力の `Variant` を変換済みとみなしてそのまま渡していたため,
バリアント・レコード・リストのリテラルが stage1 の出力で `unreachable` になっていました。stage1 本体は全ケースに対応しています。

## 実行パネルでの実行

実行パネル ([run-panel.md](run-panel.md), [src/run_expression.ts](../src/run_expression.ts)) は `collectReferencedParts` でパーツを集めてから `compile` します。
参照先は `useDefiny().partsByIdHash` (全コミットのパーツをパーツ ID ごとに持つ) で引きます。
`parts` は `module.name` ごとに最新の 1 つしか持たないため, 開発 DB に別アカウントで投稿した同名モジュール
(`core` など) があると, seed の `part_reference` が指す ID のパーツが `parts` から消えていることがあるためです。
表示中のパーツに作業中の変更があれば, その式を使います。

## 文字列の意味論

文字列は UTF-8 のバイト列として扱います（Wasm の値の表現 ([wasm-gc.md](wasm-gc.md)) に合わせた仕様）。

- `StringLength` は UTF-8 のバイト数を返す（`"こんにちは"` は 15）。
- `StringSlice` の `start` / `end` は UTF-8 のバイト位置。範囲外の値は `0..=長さ` に丸め、`end < start` のときは空文字列になる。
- `StringToBytes` は UTF-8 のバイト列（0〜255 の数値のリスト）を返す。
- 文字の途中で切ったときの結果は未定義。

## `core.eval-value` の意味論

- 組み込みのパーツの呼び出しは `core.eval-builtin-call` が, 評価した値に同じ組み込みのパーツを当てて求めます (メタ循環)。
  そのため文字列の扱いや範囲外の添字などは stage1 の出力と同じになります
- `core.equal` / `core.not-equal` は `core.value-equals` で値を構造的に比べます。`core.value` に `Equal` を直接当てると
  バリアントの比較が構造的にならず, `std.list-is-empty` などが誤った値になりました
- `part_reference` は `parts` から ID の一致するパーツを探し (`core.eval-part-reference`), その式を空の環境で評価します。
  見つからなければ `unit` です。パーツの式は参照されるたびに評価し直します
- 型が合わない (数値でない値を足すなど) ときや未対応の式は `unit` になります
