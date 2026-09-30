# クレート構成と責務

definy は Cargo ワークスペースによって以下のクレートに分割・整理されています。

| クレート名 | 責務・役割 | 主な依存関係 |
| :--- | :--- | :--- |
| `definy-event` | イベントの型定義、バイナリ/JSON/CBOR シリアライズ、署名検証、コンテンツハッシュ計算 | 純粋なデータモデル |
| `definy-core` | definy 言語のコア評価器（`expression_eval`）、AST ソースコード生成、WebAssembly コンパイラ & インタプリタ VM（`wasm_emitter`） | `definy-event` |
| `definy-ui` | Dioxus による Web UI コンポーネント、AST エディタ、プロジェクションロジック、CSS | `definy-core`, `definy-event`, `dioxus` |
| `definy-server` | HTTP/Connect-RPC API サーバー、SurrealDB 接続、MCP (Model Context Protocol) サーバー、SSR レンダリング、静的アセット配信 | `definy-core`, `definy-ui`, `definy-event`, `axum` |
| `definy-client` | WebAssembly フロントエンドのエントリポイント、ブラウザイベントリスナー、DOM/WebAuthn 操作 | `definy-ui`, `definy-event`, `dioxus-web` |

## definy-core の分離背景

従来 `definy-ui` クレート内に言語の式評価器や WebAssembly コンパイラ・VM（約 6,100 行）が同居していましたが、UI フレームワーク（Dioxus や web-sys）に依存しない純粋な言語処理系として `definy-core` に分離されました。
これにより、サーバー側の MCP ツールやバッチ処理系から UI クレート全体への依存が不要となり、ビルドの高速化と責務の明確化が達成されています。
