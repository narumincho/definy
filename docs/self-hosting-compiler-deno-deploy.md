# 汎用エッジ配備基盤と自己記述コンパイラ (`core.compile-to-wasm`) によるセルフホスティング

definy のデプロイ基盤は、**「definy プログラムだけを特別扱いしない」** という重要な設計思想に基づいています。

任意の TypeScript / JavaScript Web サービスや外部 WebAssembly バイナリを Deno Deploy REST API v2 を通じてグローバルエッジ（V8 Isolate）へ即座にデプロイできる汎用基盤であり、definy 上で作成されたプログラム（パーツ / 式）も、この汎用パイプラインで配備される一プログラムとして位置づけられます。
そして、純粋に definy で定義したプログラム（サーバーや UI、コンパイラ）を配備したとき、それが結果として「definy のセルフホスト」となります。

---

## 1. パイプライン概要

デプロイ対象ソースとして、以下のすべてを同一の汎用パイプラインで受け入れ可能です：

1. **任意の TypeScript / JavaScript スクリプト (`custom_script`)**:
   - definy に一切依存せず、Web 標準の `Deno.serve(...)` コード等を直接エッジに配備。
2. **definy パーツ / 式 (`part_id` / `compile_self_hosted`)**:
   - definy 上のパーツの式 AST を、自己記述コンパイラパーツ（`core.compile-to-wasm`）で動的に WebAssembly 化して配備。
3. **任意の WebAssembly バイナリ (`wasm_hash`)**:
   - コンテンツストアに登録された任意の Wasm バイナリを同梱配備。

```
[ 入力: 任意の TypeScript スクリプト / definy Part AST / Wasm バイナリ ]
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
[ Custom Script ]   [ definy Part / AST ]   [ Wasm Hash ]
 (main.ts そのまま)        │ (core.compile-to-wasm)    (app.wasm 同梱)
                           ▼
                  [ WebAssembly バイナリ ]
                           │
       └───────────────────┼───────────────────┘
                           │
                           ▼
            [ Deno Deploy REST API v2 ]
              POST /v2/apps/{app}/deploy
              - main.ts (カスタムまたは汎用ランナー)
              - app.wasm (同梱時)
                           │
                           ▼
            [ Deno Deploy Edge (V8 Isolate) ]
```

---

## 2. アーキテクチャと主要モジュール

### 2.1 汎用デプロイ API (`DeployDenoRequest`)
`proto/definy/v1/deploy.proto` および `definy-event/src/rpc.rs`:
- `org_token`: Deno Deploy のアクセス権限。
- `app_slug`: 配備先アプリケーション名（省略時はランダム一意 slug）。
- `custom_script`: 任意の TypeScript / JavaScript エントリポイント。指定時は最優先で `main.ts` として配備。
- `part_id`: definy のパーツ ID（またはパーツ名）。指定時は該当パーツの式を取得して Wasm に動的コンパイル。
- `compile_self_hosted`: 自己記述コンパイラの検証用サンプル式（`15 + 27 = 42`）を動的コンパイル。
- `wasm_hash`: 任意の Wasm ハッシュ。

### 2.2 自己記述コンパイラパーツ (`core.compile-to-wasm`)
- 式 AST をスタックマシン命令列に変換し、Wasm バイナリ（`app.wasm`）を生成する definy 自身の関数パーツ。
- definy 上でパーツとして定義された任意のプログラムを、エッジで即時実行可能な Wasm に変換します。

### 2.3 エッジランタイム (`main.ts`)
- `custom_script` 指定時: ユーザーのカスタムスクリプトがそのまま動作。
- 省略時: 汎用エッジランナー（Wasm が同梱されていればロードして `main()` を実行、なければ純粋なエッジ HTTP サービスとして応答）。

### 2.4 デフォルトエッジランタイム (`default_deno_serve_script`)
`custom_script` が指定されない場合に使用される汎用エッジ HTTP サーバー:
- 起動時に同梱 `app.wasm` をロード・コンパイルし、インスタンス化。
- エクスポート関数 `main()` を実行して結果をメモリ上に保持。
- エンドポイント:
  - `GET /healthz`: ヘルスチェック (`ok`)
  - `GET /api/eval`: Wasm の実行結果 JSON:
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
- Deno Deploy カードにて以下の 4 つのソースモードを切り替え可能:
  1. **TypeScript スクリプト**: 任意の TypeScript/JavaScript コードを直接記述して配備。
  2. **definy パーツ**: 指定したパーツの式をオンデマンドで Wasm 化して配備。
  3. **自己コンパイラ検証サンプル**: サンプル式（`15 + 27 = 42`）を動的ビルドして配備。
  4. **Wasm ハッシュ**: 既存の Wasm ハッシュを指定して配備。
- デプロイ成功時に `Public URL` に加え、`Eval Result` および `Edge JSON (/api/eval) ↗` へのダイレクトリンクを表示。

---

## 3. 動作確認・テスト

- 単体テスト:
  - `definy-server/src/self_hosted_wasm_compiler.rs` (`test_compile_sample_expression_pipeline`, `test_compile_custom_arithmetic_expression`, `test_find_and_compile_part_expression`)
- 結合テスト:
  - `definy-server/src/connect_rpc/tests.rs` (`DeployDenoRequest` でのトークン検証、通常デプロイ、自己記述コンパイラ動的ビルド、カスタムスクリプト汎用デプロイ)
- 全ワークスペーステスト: `cargo test --workspace` にて 100% パスを確認。
