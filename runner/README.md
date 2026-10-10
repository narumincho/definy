# definy Generic WASI Runner (wasmtime)

Docker イメージの都度ビルドを行わず、外部から取得した単一の汎用 WASI
ランタイム（`wasmtime`）を用いて、 definy サーバーがオンデマンド配信する仮想
WebAssembly（`GET /virtual/wasm/{hash}.wasm`）を実行するベースコンテナ。

---

## 特徴

1. **完全不変（Immutable Base Image）**:
   - 本イメージには definy のソースコードや特定のモジュールは一切含まれません。
   - アプリケーションコードが更新されても、**この Docker
     イメージを再ビルドする必要は一生ありません**。
2. **高速起動**:
   - マシン起動時に数 KB〜数十 KB の仮想 Wasm バイナリを HTTP
     フェッチするだけで、数秒以内にリクエスト受付を開始します。
3. **WASI 0.3 / wasi-http ネイティブ対応**:
   - `wasmtime serve` により、標準的な HTTP incoming-handler (`wasi:http/proxy`)
     を受け取ってリクエストをディスパッチします。

---

## 必要な環境変数

| 環境変数名          | 必須    | 説明                                             | 例                       |
| ------------------- | ------- | ------------------------------------------------ | ------------------------ |
| `DEFINY_SERVER_URL` | **Yes** | 仮想 Wasm を配信している親 definy サーバーの URL | `https://definy.fly.dev` |
| `DEFINY_WASM_HASH`  | **Yes** | 実行対象の Wasm コンテンツハッシュ               | `c8af42...`              |
| `PORT`              | No      | 待ち受けポート番号（デフォルト: `8080`）         | `8080`                   |

---

## 動作の流れ

1. コンテナ起動時に `runner/entrypoint.sh` が実行されます。
2. `${DEFINY_SERVER_URL}/virtual/wasm/${DEFINY_WASM_HASH}.wasm` から Wasm
   バイナリをダウンロードします。
3. `wasmtime serve /tmp/app.wasm --addr 0.0.0.0:${PORT}` を起動し、HTTP
   トラフィックの処理を開始します。
