# 評価器の適合テスト (Rust ⇔ TypeScript)

definy の式は「Wasm にコンパイルして実行」で評価します。実行バックエンドは 3 通りあります。

- **wasmtime**: Rust サーバー（`definy_core::evaluate_expression`）
- **wasmi（ネイティブ）**: `definy_core::wasm_emitter::wasmi_backend`
- **wasmi（wasm32、Cloudflare Workers）**: `definy-worker-runtime`（[worker-runtime.md](worker-runtime.md)）

以前は Worker 側に TypeScript の評価器（`worker/cbor_eval.ts`）がありましたが、Rust 製ランタイムに置き換えて削除しました。
3 つのバックエンドが同じテストケースを読み込んで結果を比べる適合テストを用意しています。

## テストケース

`conformance/eval_cases.json` に `name` / `expression` / `expected` の組で書きます。

- `expression` は `definy_event::event::Expression` の serde JSON 表現です
  （CBOR をデコードした形と同じなので、TypeScript 側もそのまま読めます）。
- `{"$part": "std.abs"}` は seed と同じく、ビルトインパーツの ID（システムアカウントから導出）に
  置き換えられます。パーツ参照は `{"PartReference": {"part_definition_event_hash": {"$part": "std.abs"}}}` と書きます。
- `expected` は値の正規化表現です。数値・文字列・真偽値・リストは JSON のまま、
  record は `{"$record": [[key, value], ...]}`（フィールド順を含めて比較）、
  variant は `{"$variant": tag, "payload": value | null}` で表します。

## 実行

- wasmtime: `cargo test -p definy-server --test eval_conformance`
  （失敗したケースをまとめて 1 つのメッセージで報告します）
- wasmi（ネイティブ）: `cargo test -p definy-server --test wasmi_backend`
- Worker ランタイム: `deno test --allow-read worker/eval_conformance_test.ts`（事前のビルドは [worker-runtime.md](worker-runtime.md)）

いずれも CI（`pull_request.yaml`）で実行されます。

## 文字列の意味論

文字列は UTF-8 のバイト列として扱います（Wasm の線形メモリ上の表現に合わせた仕様）。

- `StringLength` は UTF-8 のバイト数を返す（`"こんにちは"` は 15）。
- `StringSlice` の `start` / `end` は UTF-8 のバイト位置。範囲外の値は `0..=長さ` に丸め、
  `end < start` のときは空文字列になる。
- `StringToBytes` は UTF-8 のバイト列（0〜255 の数値のリスト）を返す。
- 文字の途中で切ったときの結果は未定義（テストケースにも入れていない）。
