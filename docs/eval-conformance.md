# 評価器の適合テスト

definy の式評価について、共有テストケース `conformance/eval_cases.json`（67 件）を用いて実装間の適合性を検証しています。

現在の TypeScript 実装では、次の 2 つのバックエンドに対して Vitest で検証を行っています。

1. **TypeScript 製評価器 (`worker/cbor_eval.ts`)**:
   `worker/eval_conformance.test.ts` で 67 件すべてがパスします。
2. **自己記述コンパイラ (`wasm/stage1.wasm` + `src/stage1_compiler.ts`)**:
   `src/stage1_conformance.test.ts` で 67 件すべてがパスします。

> **歴史的注記（旧 Rust 実装・廃止済み）**: 移行前は Rust サーバー（wasmtime、wasmi ネイティブ、wasmi wasm32 の `definy-worker-runtime`）との比較にも使用されていました。

## テストケース

`conformance/eval_cases.json` に `name` / `expression` / `expected` の組で定義されています。

- `expression` は `Expression` の JSON 表現です。
- `{"$part": "std.abs"}` はビルトインパーツの ID（システムアカウント公開鍵から導出）に解決されます。
- `expected` は正規化表現です。数値・文字列・真偽値・リストは JSON 値、レコードは `{"$record": [[key, value], ...]}`、バリアントは `{"$variant": tag, "payload": value | null}` で表します。

## 実行

```bash
# 全テスト実行（Wasm 実行テスト、D1 永続化、適合テスト等）
npm test

# TypeScript 評価器適合テスト
npx vitest run worker/eval_conformance.test.ts

# stage1.wasm 適合テスト
npx vitest run src/stage1_conformance.test.ts
```

## stage1.wasm の入力 (`src/stage1_compiler.ts`)

stage1 (`core.compile-to-wasm`) は definy の JSON AST をそのまま受け取らず, 次の 2 つを引数に取ります。

1. **式**: `core.expression` の値。`{"Add": {...}}` は `Variant("add", {left, right})` のように,
   リテラル (`Variant` / `TypeLiteral` / `ListLiteral` / `Number` / `String` / `Boolean`) だけの木で表します。
   変換は `definyAstToSelfHostedAst` (旧 Rust 版 `definy_core::self_hosted_ast::expression_to_self_hosted_ast` の移植) が行います。
   - `Match` の束縛しないアームの `variable_id` は `-1`, `default` はワイルドカードアーム `_` にします。
   - `Variant` の payload は `some(式)` / `none` で包みます。
   - `PartReference` の ID (CBOR 由来のバイト列, seed 由来の数値配列) は URL-safe Base64 の文字列にします。
   - ビット演算・型の式・`Compiler` 組み込み・`Hole` は `core.expression` で表せないので `SelfHostedAstConversionError` になります。
2. **参照するパーツ**: `list<{ id: string, expression: core.expression }>`。式から `PartReference` を
   参照先までたどって集めます (`collectReferencedParts`)。`id` は 1 の `part_reference` の文字列と同じ形式でなければなりません。
   見つからない・式を持たない・変換できないパーツは渡さず `unresolved` として返します。
   stage1 は渡されなかったパーツへの参照を `unreachable` にコンパイルするので, 呼び出し側は `unresolved` が空でなければ評価前にエラーにします。

以前は TS 側の変換が数値・文字列・算術・`Let` しか扱わず, 参照するパーツも渡していなかったため,
`Call` + `PartReference` を含む式 (`sample.sample-ast-calc` など) は `Unsupported literal node in layout` で失敗し,
適合テストの 44 件が `it.fails` になっていました。また入力の `Variant` を変換済みとみなしてそのまま渡していたため,
バリアント・レコード・リストのリテラルが stage1 の出力で `unreachable` になっていました。stage1 本体は全ケースに対応しています。

## パーツ詳細画面の「式を評価 (Wasm)」

[pages/part/[id].tsx](../pages/part/[id].tsx) は `collectReferencedParts` でパーツを集めてから `compile` します。
参照先は `useDefiny().partsByIdHash` (全コミットのパーツをパーツ ID ごとに持つ) で引きます。
`parts` は `module.name` ごとに最新の 1 つしか持たないため, 開発 DB に別アカウントで投稿した同名モジュール
(`core` など) があると, seed の `PartReference` が指す ID のパーツが `parts` から消えていることがあるためです。
表示中のパーツに作業中の変更があれば, その式を使います。

## 文字列の意味論

文字列は UTF-8 のバイト列として扱います（Wasm の線形メモリ上の表現に合わせた仕様）。

- `StringLength` は UTF-8 のバイト数を返す（`"こんにちは"` は 15）。
- `StringSlice` の `start` / `end` は UTF-8 のバイト位置。範囲外の値は `0..=長さ` に丸め、`end < start` のときは空文字列になる。
- `StringToBytes` は UTF-8 のバイト列（0〜255 の数値のリスト）を返す。
- 文字の途中で切ったときの結果は未定義。
