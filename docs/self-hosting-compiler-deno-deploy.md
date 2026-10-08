# 自己記述コンパイラ (`core.compile-to-wasm`) と Deno Deploy エッジ直結パイプライン

definy は、definy 自身の言語仕様およびコア構文を用いて記述された自己ホスト（自己記述）コンパイラパーツ（`core.compile-to-wasm`）を備えています。
本パイプラインにより、definy 上で定義された純粋な式（AST）を definy 自身の実行系でオンデマンドに WebAssembly（Wasm）バイナリへとコンパイルし、Deno Deploy REST API v2 を通じて世界中の V8 Isolate エッジサーバーへと即時配備・実行することが可能になりました。

---

## 1. パイプライン概要

```
[ definy Expression (AST) ]
           │
           ▼
[ expression_to_self_hosted_ast ]  (definy-server/src/self_hosted_ast.rs)
  式 AST を definy 自身の直和型 AST (core.expression) に変換
           │
           ▼
[ evaluate_expression(core.compile-to-wasm) ]  (メタ循環評価 / メタプログラミング)
  definy 実行系上で自己ホスト Wasm コンパイラを実行
  スタックマシン命令列を生成し、Wasm ヘッダ・型・関数・エクスポート・コードセクションを組み立て
           │
           ▼
[ WebAssembly バイナリ (app.wasm) ]
  エクスポート: "main": () -> i64 (例: 15 + 27 = 42)
           │
           ▼
[ Deno Deploy REST API v2 ]  (definy-server/src/deno_deploy.rs, deploy_rpc.rs)
  POST /v2/apps/{app}/deploy
  アセット: main.ts (TypeScript エッジサーバー) + app.wasm (Base64 エンコード)
           │
           ▼
[ Deno Deploy Edge (V8 Isolate) ]
  - WebAssembly.instantiate(app.wasm)
  - instance.exports.main() 呼び出し
  - /api/eval で計算結果 JSON 返却
  - ルート HTML に実行結果をリッチ表示
```

---

## 2. アーキテクチャと主要モジュール

### 2.1 自己記述コンパイラ (`definy-server/src/builtin_wasm_compiler.rs`)
- **`core.compile-expr-instructions`**: 式 AST（`number`, `add`, `subtract`, `multiply`, `divide`, `if`, `boolean`, `not`, etc.）を Wasm スタックマシンバイト列に変換する再帰関数パーツ。
- **`core.compile-to-wasm`**: 命令バイト列を受け取り、Wasm バイナリヘッダー（`\0asm\1\0\0\0`）および各セクション（Type, Function, Export, Code）を結合して `list<number>`（バイト列）を生成するパーツ。
  - エクスポート関数: `"main": () -> i64`

### 2.2 自己記述コンパイラランナー (`definy-server/src/self_hosted_wasm_compiler.rs`)
- `compile_expression_to_wasm(expression: &Expression) -> Result<Vec<u8>, SelfHostedCompileError>`:
  任意の `Expression` を受け取り、`expression_to_self_hosted_ast` で AST 化した上で `core.compile-to-wasm` を評価実行し、確定的な Wasm バイト列（`Vec<u8>`）を返却します。
- `compile_sample_to_wasm()`: デフォルトの検証用サンプル式（`15 + 27 = 42`）をコンパイル。
- `execute_compiled_wasm(&bytes)`: `definy_core::wasm_emitter::execute_wasm` を用いて、生成された Wasm の `"main"` 関数を実行・検証。

### 2.3 Connect-RPC デプロイサービス (`definy-server/src/deploy_rpc.rs`)
- `connect_rpc.rs` からデプロイ関連の責務を分離（1000 行制限の遵守）。
- `DeployDenoRequest`:
  - `compile_self_hosted: Option<bool>` をサポート。
  - `true` が指定された場合、サーバー側で自己記述コンパイラをオンデマンド実行して Wasm を生成し、Deno Deploy の `assets`（`app.wasm`）に直接インライン注入。
- `DeployDenoResponse`:
  - `evaluated_result: Option<String>` に評価結果（`"42"`）を含めて返却。

### 2.4 エッジランタイム (`main.ts` / `default_deno_serve_script`)
Deno Deploy 上で稼働するエッジ HTTP サーバー:
- 起動時に `app.wasm` をロード・コンパイルし、インスタンス化。
- エクスポート関数 `main()` を実行して結果をメモリ上に保持。
- エンドポイント:
  - `GET /healthz`: ヘルスチェック (`ok`)
  - `GET /api/eval`: コンパイル済み Wasm の実行結果 JSON:
    ```json
    {
      "service": "definy",
      "compiler": "core.compile-to-wasm",
      "entrypoint": "main",
      "wasmLoaded": true,
      "result": "42",
      "status": "success",
      "timestamp": "2026-10-08T07:45:00.000Z"
    }
    ```
  - `GET /api/info`: ランタイム情報と評価結果
  - `GET /`: レスポンシブ HTML ダッシュボード（Wasm ステータスおよび実行結果バッジ、JSON API へのクイックリンクを表示）

### 2.5 Web UI (`definy-ui/src/deployments.rs`)
- Deno Deploy カードに「自己記述コンパイラ (core.compile-to-wasm) で即時ビルド」オプションを追加。
- デプロイ成功時に `Public URL` に加え、`Eval Result: 42` および `Edge JSON (/api/eval) ↗` へのダイレクトリンクを表示。

---

## 3. 動作確認・テスト

- 単体テスト: `definy-server/src/self_hosted_wasm_compiler.rs` (`test_compile_sample_expression_pipeline`, `test_compile_custom_arithmetic_expression`)
- 結合テスト: `definy-server/src/connect_rpc/tests.rs` (`test_connect_rpc_lifecycle` 内の `compile_self_hosted: Some(true)` デプロイ検証)
- 全ワークスペーステスト: `cargo test --workspace` にて 100% パスを確認。
