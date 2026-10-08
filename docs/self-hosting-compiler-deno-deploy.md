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

### 2.4 デフォルトエッジランタイム (`default_deno_serve_script`) と Wasm 線形メモリ
`custom_script` が指定されない場合に使用される汎用エッジ HTTP サーバー:
- 起動時に同梱 `app.wasm` をロード・コンパイルし、インスタンス化。
- **線形メモリデコーダ (`readDefinyValue`)**:
  - Wasm インスタンスの線形メモリ（`exports.memory`）から definy の複合データ構造を直接デコード:
    - **Tag 0 (Number)**: 64-bit 整数値
    - **Tag 1 (Bool)**: 真偽値
    - **Tag 2 (String)**: 長さプレフィックス付き UTF-8 文字列
    - **Tag 3 (List)**: ポインタ配列による要素リスト
    - **Tag 4 (Record)**: キー文字列ポインタと値ポインタのペアによる連想配列
- **Web / HTTP ハンドラーの自動解決**:
  - パーツが HTML 文字列（例: `<!DOCTYPE html>...` または `<html...`）を返す場合、ルートパス（`GET /`）で直接 `text/html; charset=utf-8` として配信。
  - パーツが HTTP レスポンス構造レコード（`{ status: 200, body: "...", contentType: "..." }`）を返す場合、対応する HTTP ステータスコードおよびヘッダーでブラウザへ応答。
  - 上記以外の場合は、リッチなレスポンシブダッシュボードと JSON API (`/api/eval`) を自動構成。
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
  - `GET /`: HTML ハンドラー出力、またはレスポンシブダッシュボード

### 2.5 自己記述コンパイラ (`core.compile-to-wasm`) の線形メモリ・文字列・レコード対応拡張
- `definy-server/src/builtin_wasm_compiler.rs`, `builtin_wasm_data_section.rs`, `self_hosted_wasm_compiler.rs`:
  - **`StringToBytes` 式の追加**: definy 言語コア式として文字列から UTF-8 バイト列（`list<number>`）を取得する式を追加。
  - **Data Section (Section 11) の自己記述生成**:
    - **文字列**: 文字列式を検知した際に Data Section を動的生成し、線形メモリの 1024 番地に `Tag 2 (String)` + 長さ + UTF-8 バイト列を配置。
    - **レコード**: レコード式（`TypeLiteral`）を検知した際に、1024 番地に `Tag 4 (Record)` ヘッダー（フィールド数と各フィールドの key_ptr / val_ptr ペア）を配置し、後続領域に各キー文字列（Tag 2）と各フィールド値（Tag 0 Number / Tag 2 String / Tag 1 Bool）を 8 バイトアライメントでパックする完全な Data Section を自己記述式で動的出力。
  - **Memory Section (Section 5) & 動的 Export Section**: 文字列式やレコード式の場合は 1 メモリ（最小 2 ページ = 128KB）を宣言し、関数型を `() -> i32`（ポインタ戻り値）に切り替え、`evaluate` (func 0), `memory` (mem 0), `main` (func 0) をエクスポート。数値計算等の式の場合は従来の `() -> i64` と `main` をエクスポート。
  - **メタ循環コンパイル**: `Expression::String` に加えて `Expression::TypeLiteral`（HTTP レスポンスレコード `{ status, body }` 等）も自己記述コンパイラパーツ（`core.compile-to-wasm`）で優先メタ循環コンパイルされ、Deno Deploy およびテスト環境の Wasm VM 上で `Value::Record` として直接解決可能。
  - コンパイルしたバイナリはサーバー側でも `evaluate_compiled_wasm` により即座に値（`Value::String`, `Value::Record` 等）として検証。

### 2.6 Web UI (`definy-ui/src/deployments.rs`)
- Deno Deploy カードにて以下の 4 つのソースモードを切り替え可能:
  1. **TypeScript スクリプト**: 任意の TypeScript/JavaScript コードを直接記述して配備。
  2. **definy パーツ**: 指定したパーツ（数値演算だけでなく HTML 文字列や HTTP レスポンスを返すパーツも含む）の式をオンデマンドで Wasm 化して配備。
  3. **自己コンパイラ検証サンプル**: サンプル式（`15 + 27 = 42`）を動的ビルドして配備。
  4. **Wasm ハッシュ**: 既存の Wasm ハッシュを指定して配備。
- デプロイ成功時に `Public URL` に加え、`Eval Result` および `Edge JSON (/api/eval) ↗` へのダイレクトリンクを表示。

---

## 3. 動作確認・テスト

- 単体テスト:
  - `definy-server/src/self_hosted_wasm_compiler.rs`:
    - `test_compile_sample_expression_pipeline`: 自己記述コンパイラパイプラインの検証
    - `test_compile_custom_arithmetic_expression`: カスタム算術式のコンパイル
    - `test_find_and_compile_part_expression`: コミットイベントからのパーツ抽出とコンパイル
    - `test_compile_string_expression_for_http_response`: HTML 文字列式のエミットと Wasm 実行
    - `test_compile_record_expression_for_http_response`: HTTP レスポンスレコード式のエミットと Wasm 実行
- 結合テスト:
  - `definy-server/src/connect_rpc/tests.rs` (`test_connect_rpc_deploy_deno_success`):
    - トークン検証
    - 通常デプロイ
    - 自己記述コンパイラ動的ビルド（数値）
    - 外部 TypeScript 汎用デプロイ
    - Web / HTTP ハンドラーパーツ（HTML 文字列）の登録から Deno Deploy 配備およびエッジレスポンス検証までのエンドツーエンドテスト
- 全ワークスペーステスト: `cargo test --workspace` にて 100% パスを確認。
