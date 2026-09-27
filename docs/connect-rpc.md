# Connect-RPC & Deterministic CBOR アーキテクチャ

definy では、クライアントとサーバー間のデータ通信プロトコルとして **Connect-RPC** を採用しつつ、暗号署名やコンテンツアドレス・決定論的ハッシュの計算には **CBOR の Deterministic Encoding (RFC 8949)** を組み合わせて使用しています。

## 1. 全体像と設計思想

- **通信レイヤー（Connect-RPC）**:
  - クライアント（`definy-ui` / `definy-client` WebAssembly）とサーバー（`definy-server` Axum）間の RPC 通信。
  - プロトコル仕様: Connect-RPC (`Connect-Protocol-Version: 1`)。
  - フォーマット: `application/json`（ブラウザからのフェッチやデバッグ・開発ツール用）および `application/proto`（バイナリ Protobuf）の両方をサポート。
  - エラーフォーマット: Connect-RPC 標準エラー（`{"code": "<code_str>", "message": "<message_str>"}`）。

- **データ保証レイヤー（Deterministic CBOR & Ed25519）**:
  - 各イベント（アカウント作成、モジュールコミットなど）は、CBOR の Deterministic Encoding（RFC 8949: 辞書キーのバイト長順・辞書順ソート、浮動小数点正規化など）により一意なバイト列にシリアライズされます。
  - この決定論的バイト列に対して Ed25519 署名が付与され、改ざん不能な署名付きバイナリが生成されます。
  - 各イベントの一意識別子（`EventHashId`）やモジュール・パーツの AST/型ハッシュ（`ContentHash`）は、この決定論的バイナリから SHA-256 で算出されます。

## 2. Protobuf スキーマ (`proto/definy/v1/event.proto`)

```protobuf
syntax = "proto3";

package definy.v1;

service EventService {
  rpc GetEvents (GetEventsRequest) returns (GetEventsResponse);
  rpc GetEvent (GetEventRequest) returns (GetEventResponse);
  rpc SubmitEvent (SubmitEventRequest) returns (SubmitEventResponse);
}

message EventItem {
  string event_hash = 1;
  bytes signed_event_bytes = 2; // CBOR Deterministic Encoding された署名済みバイナリ
  string account_id = 3;
  string event_type = 4;
  string created_at_rfc3339 = 5;
}

message GetEventsRequest {
  optional string event_type = 1;
  optional uint64 limit = 2;
  optional uint64 offset = 3;
}

message GetEventsResponse {
  repeated EventItem events = 1;
}

message GetEventRequest {
  string event_hash = 1;
}

message GetEventResponse {
  optional EventItem event = 1;
}

message SubmitEventRequest {
  bytes signed_event_bytes = 1; // クライアントで署名された Deterministic CBOR バイナリ
}

message SubmitEventResponse {
  string event_hash = 1;
  string status = 2;
}
```

## 3. 実装モジュール

- **`definy-event::rpc`**:
  - `prost::Message` および `serde::{Serialize, Deserialize}` を導出した RPC メッセージ型を定義。
  - JSON マッピング時は Connect-RPC 標準の camelCase（`signedEventBytes`, `eventHash` など）と Rust 慣用の snake_case（`signed_event_bytes`, `event_hash` など）の双方を alias で受容。
  - `signed_event_bytes` は JSON 転送時に URL-safe / standard base64 で透過的にエンコード・デコード。

- **`definy-server::connect_rpc`**:
  - `POST /definy.v1.EventService/GetEvents`
  - `POST /definy.v1.EventService/GetEvent`
  - `POST /definy.v1.EventService/SubmitEvent`
  - リクエストヘッダーの Content-Type に応じて JSON または Protobuf を自動切替。
  - 受信した `signed_event_bytes` の署名・CBOR 構造を `definy_event::verify_and_deserialize` で即座に検証し、不正データは `invalid_argument` (HTTP 400) で拒否。

- **`definy-ui::fetch`**:
  - WebAssembly (ブラウザ) 環境から `connect_rpc_post` ヘルパーにより Connect-RPC エンドポイントを呼び出し。
  - 取得した各イベントの Deterministic CBOR バイナリをブラウザ内 IndexedDB にキャッシュ。
  - オフライン時やキューイング送信（Local Event）ともシームレスに統合。

## 4. Swagger UI & Connect-RPC / CBOR Explorer

- **Swagger UI (`/swagger-ui`)**:
  - Connect-RPC の各メソッド（`/definy.v1.EventService/GetEvents`, `GetEvent`, `SubmitEvent`）は OpenAPI (utoipa) スキーマに登録されており、Swagger UI 上で対話的にテスト可能です。
- **CBOR in gRPC / Connect-RPC の UI 表現**:
  - 汎用の gRPC / Connect UI ツール（Buf Studio, grpc-ui, Postman, Swagger UI 等）は、Protobuf 定義のレベルで `bytes`（Base64）を表示するに留まり、そのバイト列に内包された RFC 8949 Deterministic CBOR や definy 固有の AST、ContentHash、Ed25519 署名を自動パース・検証するツールは存在しません。
- **definy 自作 Explorer (`/api` / `/api/{event_hash}`)**:
  - definy-ui に専用の「Connect-RPC & CBOR Explorer」を内蔵。
  - Connect-RPC メソッドの直接実行、あるいは任意の Base64/Hex CBOR バイナリの貼り付けに対応。
  - レスポンス内の Deterministic CBOR をクライアント側で即座にデコード・Ed25519 署名検証し、イベント構造（ModuleCommit, Account, Parts, AST 式構造, ContentHash）および Hex/Base64 バイナリダンプをグラフィカルに可視化・検査できます。

## 5. 開発ノウハウ & 注意点

- **`dx fmt` の挙動**:
  - Dioxus CLI の `dx fmt` において、マクロ内の複数引数を持つ関数呼び出しやブロックにおいて、引数リストが重複出力される既知の不具合があります。
  - フォーマット後は必ず `git diff` を確認し、意図しないコード重複が発生していないか検証してください。
