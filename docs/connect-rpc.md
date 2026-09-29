# Connect-RPC & Deterministic CBOR アーキテクチャ

definy では、クライアントとサーバー間のデータ通信プロトコルとして
**Connect-RPC**
を採用しつつ、暗号署名やコンテンツアドレス・決定論的ハッシュの計算には **CBOR の
Deterministic Encoding (RFC 8949)** を組み合わせて使用しています。

## 1. 全体像と設計思想

- **通信レイヤー（Connect-RPC）**:
  - クライアント（`definy-ui` / `definy-client`
    WebAssembly）とサーバー（`definy-server` Axum）間の RPC 通信。
  - プロトコル仕様: Connect-RPC (`Connect-Protocol-Version: 1`)。
  - フォーマット:
    `application/json`（ブラウザからのフェッチやデバッグ・開発ツール用）および
    `application/proto`（バイナリ Protobuf）の両方をサポート。
  - エラーフォーマット: Connect-RPC
    標準エラー（`{"code": "<code_str>", "message": "<message_str>"}`）。
  - ※旧来の REST API（`/events`, `/events/{hash}`）は完全に削除され、通信は
    Connect-RPC に一本化されました。

- **データ保証レイヤー（Deterministic CBOR & Ed25519）**:
  - 各イベント（アカウント作成、モジュールコミットなど）は、CBOR の
    Deterministic Encoding（RFC 8949:
    辞書キーのバイト長順・辞書順ソート、浮動小数点正規化など）により一意なバイト列にシリアライズされます。
  - この決定論的バイト列に対して Ed25519
    署名が付与され、改ざん不能な署名付きバイナリが生成されます。
  - 各イベントの一意識別子（`EventHashId`）やモジュール・パーツの
    AST/型ハッシュ（`ContentHash`）は、この決定論的バイナリから SHA-256
    で算出されます。

## 2. Protobuf スキーマ (`proto/definy/v1/event.proto`)

```protobuf
syntax = "proto3";

package definy.v1;

service EventService {
  rpc GetEvents (GetEventsRequest) returns (GetEventsResponse);
  rpc GetEvent (GetEventRequest) returns (GetEventResponse);
  rpc SubmitEvent (SubmitEventRequest) returns (SubmitEventResponse);

  // 差分ハッシュ・ネゴシエーション用 RPC
  rpc CheckMissingHashes (CheckMissingHashesRequest) returns (CheckMissingHashesResponse);
  rpc UploadContent (UploadContentRequest) returns (UploadContentResponse);
  rpc GetContent (GetContentRequest) returns (GetContentResponse);
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
  string status = 2; // "success" | "already_exists" | "missing_content"
  repeated string missing_content_hashes = 3; // 不足している ContentHash ("ch-...") の一覧
}

message CheckMissingHashesRequest {
  repeated string content_hashes = 1;
}

message CheckMissingHashesResponse {
  repeated string missing_content_hashes = 1;
}

message ContentItem {
  string content_hash = 1;
  bytes content_bytes = 2; // 式(Expression)の Deterministic CBOR バイナリ
}

message UploadContentRequest {
  repeated ContentItem items = 1;
}

message UploadContentResponse {
  uint64 uploaded_count = 1;
}

message GetContentRequest {
  string content_hash = 1;
}

message GetContentResponse {
  optional bytes content_bytes = 1;
}
```

## 3. 実装モジュール

- **`definy-event::rpc`**:
  - `prost::Message` および `serde::{Serialize, Deserialize}` を導出した RPC
    メッセージ型を定義。
  - JSON マッピング時は Connect-RPC 標準の camelCase（`signedEventBytes`,
    `eventHash` など）と Rust 慣用の snake_case（`signed_event_bytes`,
    `event_hash` など）の双方を alias で受容。
  - `signed_event_bytes` は JSON 転送時に URL-safe / standard base64
    で透過的にエンコード・デコード。

- **`definy-server::connect_rpc`**:
  - `POST /definy.v1.EventService/GetEvents`
  - `POST /definy.v1.EventService/GetEvent`
  - `POST /definy.v1.EventService/SubmitEvent`
  - `POST /definy.v1.EventService/CheckMissingHashes` (差分ハッシュ照会)
  - `POST /definy.v1.EventService/UploadContent`
    (不足コンテンツの一括アップロード & ハッシュ検証)
  - `POST /definy.v1.EventService/GetContent`
    (コンテンツアドレスからの式バイナリ取得)
  - リクエストヘッダーの Content-Type に応じて JSON または Protobuf を自動切替。
  - 受信した `signed_event_bytes` の署名・CBOR 構造を
    `definy_event::verify_and_deserialize` で即座に検証し、不正データは
    `invalid_argument` (HTTP 400) で拒否。
  - `SubmitEvent` では、コミットイベント内で参照されている式（AST）の
    ContentHash がサーバーに存在するか確認。欠損がある場合は
    `status: "missing_content"`
    とともに不足ハッシュ一覧（`missing_content_hashes`）を返却。

- **`definy-ui::fetch`**:
  - WebAssembly (ブラウザ) 環境から `connect_rpc_post` ヘルパーにより
    Connect-RPC エンドポイントを呼び出し。
  - `post_event` 関数による自動差分ハッシュ・ネゴシエーション:
    1. 楽観的送信（初回 `SubmitEvent` を送信）
    2. サーバーが `missing_content`
       を返した場合、指定された不足ハッシュに対応する式バイナリを
       `UploadContent` で一括アップロード
    3. アップロード完了後に再度 `SubmitEvent` を送信してトランザクションを確定
  - 取得した各イベントの Deterministic CBOR バイナリおよび ContentHash
    をブラウザ内 IndexedDB にキャッシュ。
  - オフライン時やキューイング送信（Local Event）ともシームレスに統合。

## 4. 差分ハッシュ・ネゴシエーション方式（Git Tree/Blob モデル）

definy
では、コードの変更履歴をイベントソーシングで保存しますが、モジュール内の全パーツの
AST（式バイナリ）を毎回のコミットイベントに含めると、変更のないパーツの式データが重複してネットワークや
DB を圧迫します。 そこで Git の **Tree（メタデータ・参照）** と
**Blob（実体バイナリ）** の分離モデルを採用しています。

```
Client (definy-ui)                                Server (definy-server)
       |                                                    |
       |  1. SubmitEvent (Tree: ModuleCommitEvent)           |
       |--------------------------------------------------->|
       |                                                    | (CAS 照会)
       |  2. SubmitEventResponse ("missing_content", hashes) |
       |<---------------------------------------------------|
       |                                                    |
       |  3. UploadContent (Blobs: [ch-abc: bytes, ...])    |
       |--------------------------------------------------->|
       |                                                    | (SHA-256検証 & 保存)
       |  4. UploadContentResponse (uploaded_count: N)       |
       |<---------------------------------------------------|
       |                                                    |
       |  5. SubmitEvent (再送・確定)                        |
       |--------------------------------------------------->|
       |                                                    | (全依存充足 -> イベント永続化)
       |  6. SubmitEventResponse ("success", event_hash)    |
       |<---------------------------------------------------|
```

- **Optimistic Submit（楽観送信）**:
  過去のコミットと式が共通している（変更されていない）場合や、他のユーザーが既に同一の式をアップロード済みの場合は、ステップ
  1〜2 だけで `status: "success"` となり、式バイナリの転送量は **0 バイト（1
  RTT）** で完了します。
- **改ざん防止 & 内容同一性**: サーバーは `UploadContent` で受信したバイナリの
  SHA-256 ハッシュを計算し、クライアントから指定された `ContentHash`
  と完全一致することを確認した上で CAS（`contents` テーブル）に格納します。

## 5. Swagger UI & Connect-RPC / CBOR Explorer

- **Swagger UI (`/swagger-ui`)**:
  - Connect-RPC の各メソッド（`/definy.v1.EventService/GetEvents`, `GetEvent`,
    `SubmitEvent`）は OpenAPI (utoipa) スキーマに登録されており、Swagger UI
    上で対話的にテスト可能です。
- **CBOR in gRPC / Connect-RPC の UI 表現**:
  - 汎用の gRPC / Connect UI ツール（Buf Studio, grpc-ui, Postman, Swagger UI
    等）は、Protobuf 定義のレベルで
    `bytes`（Base64）を表示するに留まり、そのバイト列に内包された RFC 8949
    Deterministic CBOR や definy 固有の AST、ContentHash、Ed25519
    署名を自動パース・検証するツールは存在しません。
- **definy 自作 Explorer (`/api` / `/api/{event_hash}`)**:
  - definy-ui に専用の「Connect-RPC & CBOR Explorer」を内蔵。
  - Connect-RPC メソッドの直接実行、あるいは任意の Base64/Hex CBOR
    バイナリの貼り付けに対応。
  - レスポンス内の Deterministic CBOR をクライアント側で即座にデコード・Ed25519
    署名検証し、イベント構造（ModuleCommit, Account, Parts, AST 式構造,
    ContentHash）および Hex/Base64
    バイナリダンプをグラフィカルに可視化・検査できます。

## 6. 開発ノウハウ & 注意点

- **`dx fmt` の挙動**:
  - Dioxus CLI の `dx fmt`
    において、マクロ内の複数引数を持つ関数呼び出しやブロックにおいて、引数リストが重複出力される既知の不具合があります。
  - フォーマット後は必ず `git diff`
    を確認し、意図しないコード重複が発生していないか検証してください。
