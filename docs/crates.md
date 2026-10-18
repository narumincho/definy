# 旧 Rust クレート構成と責務（アーカイブ）

> [!NOTE]
> 本ドキュメントに記載されている Rust クレート群（`definy-core`, `definy-ui`, `definy-server`, `definy-client`, `definy-worker-runtime`, `definy-event`）は、**TypeScript + React 19 + Void (Vite 8)** への移行に伴い全廃されました。
> 現在のアーキテクチャおよび開発基盤については [docs/typescript-react-void-architecture.md](typescript-react-void-architecture.md) を参照してください。

definy は過去に Cargo ワークスペースによって以下のクレートに分割・整理されていました。

| クレート名      | 責務・役割                                                                                                                     | 主な依存関係                                       |
| :-------------- | :----------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| `definy-event`  | イベントの型定義、バイナリ/JSON/CBOR シリアライズ、署名検証、コンテンツハッシュ計算                                            | 純粋なデータモデル                                 |
| `definy-core`   | definy 言語のコア評価器（`expression_eval`）、AST ソースコード生成、WebAssembly コンパイラ & インタプリタ VM（`wasm_emitter`） | `definy-event`                                     |
| `definy-ui`     | Dioxus による Web UI コンポーネント、AST エディタ、プロジェクションロジック、CSS                                               | `definy-core`, `definy-event`, `dioxus`            |
| `definy-server` | HTTP/Connect-RPC API サーバー、SurrealDB 接続、MCP (Model Context Protocol) サーバー、SSR レンダリング、静的アセット配信       | `definy-core`, `definy-ui`, `definy-event`, `axum` |
| `definy-client` | WebAssembly フロントエンドのエントリポイント、ブラウザイベントリスナー、DOM/WebAuthn 操作                                      | `definy-ui`, `definy-event`, `dioxus-web`          |

## definy-core の分離背景

従来 `definy-ui` クレート内に言語の式評価器や WebAssembly コンパイラ・VM（約
6,100 行）が同居していましたが、UI フレームワーク（Dioxus や
web-sys）に依存しない純粋な言語処理系として `definy-core` に分離されました。
これにより、サーバー側の MCP ツールやバッチ処理系から UI
クレート全体への依存が不要となり、ビルドの高速化と責務の明確化が達成されています。

## 各クレートの内部構成

### 1. `definy-event`

- `event`: `Event`, `Expression`, `Part`, `ModuleCommitEvent`
  などのコアモデル定義。
- `content_hash`: イベント内容の SHA-256 / Ed25519
  によるコンテンツハッシュ導出。
- `cbor_datetime_tag1`, `naming`: シリアライザおよび識別子バリデータ。

### 2. `definy-core`

- `expression_eval`:
  式評価器（`evaluate_expression`）。イベント履歴を元にしたパーツ解決と純粋関数評価。
- `wasm_emitter`: WebAssembly バイトコードエミッタおよびインタプリタ実行 VM。
- `code_gen`: AST からのソースコードテキスト生成。

### 3. `definy-server`

- `seed`: ビルトインモジュール（`definy`, `core`, `std`, `wasi`, `sample`）の読み込み。
  パーツ定義の正本はリポジトリ直下の `seeds/*.json` で、`include_str!` で埋め込まれる
  （詳細は [self-hosting.md](self-hosting.md#seed-json-が正本)）。
- `builtin_migration`: seed からシステムアカウント署名付きのブートストラップイベントを生成し、DB /
  Cloudflare Workers 用 seed バンドルへ書き出す。
- `self_hosting_tests`:
  セルフホスティング機能の静的検証・メタ循環実行実証テストスイート。
- `connect_rpc`, `mcp`, `html`, `db`: API サーバー、SurrealDB 接続層、MCP
  プロトコルエンドポイント。

### 4. `definy-ui`

- `expression_editor`: AST
  式エディタコンポーネント群、階層的セレクタ、パス操作。
- `tree_layout`: AST の視覚的ツリー・スプレッドシートレイアウトエンジン。
- `wasm_inspector`: 生成された WebAssembly バイトコードのインスペクタ UI。

### 5. `definy-client`

- `main`: ブラウザ用 WebAssembly エントリポイント。Dioxus Web
  ルーティングの初期化。

## テストとコード品質の検証

各クレートの品質を維持するため、以下のコマンドで一貫したテストとフォーマットを実行します：

```sh
# ワークスペース全体の単体テスト実行
cargo test --workspace

# セルフホスティング関連テストの実行
cargo test -p definy-server self_hosting

# 静的解析・Clippy チェック（警告 0 件ルール）
cargo clippy --workspace --all-targets -- -D warnings

# コードフォーマット
cargo fmt
dx fmt
```

## TypeScript + React 19 + Void への移行と Wasm 自己ホスト

現在、ビルド時間の大幅短縮と自己ホスト検証の容易化のため、上記 Rust クレート群から TypeScript + React 19 + Void への段階的移行が進められています。
自己記述コンパイラ `stage1.wasm`（`core.compile-to-wasm`）が固定点に達したことで、Rust のコンパイラやインタプリタに依存せず、ブラウザ/Worker の V8 上で直接 definy 式を Wasm コンパイル・ネイティブ実行できるようになっています。
詳細は [docs/typescript-react-void-architecture.md](file:///Users/narumi/Documents/GitHub/definy/docs/typescript-react-void-architecture.md) を参照してください。
