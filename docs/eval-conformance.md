# 評価器の適合テスト

definy の式評価について、共有テストケース `conformance/eval_cases.json`（65 件）を用いて実装間の適合性を検証しています。

現在の TypeScript 実装では、次の 2 つのバックエンドに対して Vitest で検証を行っています。

1. **TypeScript 製評価器 (`worker/cbor_eval.ts`)**:
   `worker/eval_conformance.test.ts` で 65 件すべてがパスします。
2. **自己記述コンパイラ (`wasm/stage1.wasm` + `src/stage1_compiler.ts`)**:
   `src/stage1_conformance.test.ts` で検証しています。現在 21 件が対応、44 件が未対応（`it.fails`）です。

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

## stage1.wasm 適合テスト結果 (対応 21 件 / 未対応 44 件)

自己記述コンパイラ `wasm/stage1.wasm` に対するテスト（`src/stage1_conformance.test.ts`）の結果は以下の通りです。

- **対応 (21 件)**:
  - 数値リテラル (`number literal`)
  - 算術演算 (`add`, `subtract negative`, `multiply`, `divide`, `divide negative truncates toward zero`, `remainder`, `remainder negative`)
  - 比較演算 (`less than`, `less than or equal`, `greater than`, `greater than or equal`, `equal numbers`, `not equal numbers`)
  - 文字列リテラル・同値判定 (`string literal`, `equal strings`, `equal non-ascii strings`)
  - Let 式 (`let single`, `let multiple bindings`, `let later binding refers earlier`, `let binds a comparison result`)

- **未対応 (44 件 - `it.fails` で期待通り失敗)**: 原因は 2 種類ある。
  - **TypeScript 側の AST 変換が未対応 (36 件)**: `src/stage1_compiler.ts` の `definyAstToSelfHostedAst` / `writeLiteral` が
    次のノードを stage1 の入力形式に変換できず、`Unsupported literal node in layout` で失敗する。stage1 本体が対応しているかはまだ分からない。
    - `Not` / `And` / `Or`
    - `StringConcat` / `StringLength` / `StringSlice` / `StringToBytes`
    - `ListLength` / `ListGet` / `ListConcat` / `ListAppend` / `RecordGet`
    - `Match`
    - `Call` / `PartReference`（参照先パーツを `compile` の第 2 引数で渡す処理も未接続）
    - レコード・バリアントの中に入った `Add` などの演算（トップレベルの演算は変換できる）
  - **stage1 が出力した Wasm が `unreachable` で停止 (8 件)**: リスト・レコード・バリアントのリテラル
    （`list literal`, `record literal`, `record with large number`, `record with negative number`, `record with three fields`,
    `nested record`, `variant without payload`, `variant with payload`）。コンパイルは成功するが、実行時に trap する。

未対応ケースはテスト冒頭の `UNSUPPORTED_ON_STAGE1` 配列に列挙され、`it.fails` で実行されています。コンパイラ側の対応が進むとテストが失敗（成功に転じる）し、配列からの削除が促されます。

## 文字列の意味論

文字列は UTF-8 のバイト列として扱います（Wasm の線形メモリ上の表現に合わせた仕様）。

- `StringLength` は UTF-8 のバイト数を返す（`"こんにちは"` は 15）。
- `StringSlice` の `start` / `end` は UTF-8 のバイト位置。範囲外の値は `0..=長さ` に丸め、`end < start` のときは空文字列になる。
- `StringToBytes` は UTF-8 のバイト列（0〜255 の数値のリスト）を返す。
- 文字の途中で切ったときの結果は未定義。
