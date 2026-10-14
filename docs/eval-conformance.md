# 評価器の適合テスト (Rust ⇔ TypeScript)

definy の式は 2 か所で評価されています。

- **Rust**: `definy-core` の `evaluate_expression`。式を WebAssembly にコンパイルして実行します
  （`definy-server` やテストで使用）。
- **TypeScript**: `worker/cbor_eval.ts` の `evaluateCborExpression`。Cloudflare Workers 上で
  プレビューやセルフホスト HTTP サーバーのパーツを評価する木構造インタプリタです。

二重実装なので、言語機能を追加・変更すると挙動がずれやすくなります。そこで、
両方が同じテストケースを読み込んで結果を比べる適合テストを用意しています。

## テストケース

`conformance/eval_cases.json` に `name` / `expression` / `expected` の組で書きます。

- `expression` は `definy_event::event::Expression` の serde JSON 表現です
  （CBOR をデコードした形と同じなので、TypeScript 側もそのまま読めます）。
- `{"$part": "std.abs"}` はビルトインパーツへの `PartReference` に置き換えられます。
  ハッシュはビルトインシステムアカウントから導出します。
- `expected` は値の正規化表現です。数値・文字列・真偽値・リストは JSON のまま、
  record は `{"$record": [[key, value], ...]}`（フィールド順を含めて比較）、
  variant は `{"$variant": tag, "payload": value | null}` で表します。

## 実行

- Rust: `cargo test -p definy-server --test eval_conformance`
  （失敗したケースをまとめて 1 つのメッセージで報告します）
- TypeScript: `deno test worker/eval_conformance_test.ts`

どちらも CI（`pull_request.yaml`）で実行されます。

## 今後

- 非 ASCII 文字列に対する `StringLength` / `StringSlice` など、意味論を決める必要があるケースは未収録です。
- 最終的には Worker でも Rust 由来（または自己記述コンパイラ `core.compile-to-wasm` 由来）の
  Wasm を実行し、TypeScript の評価器をなくすことを検討しています。
