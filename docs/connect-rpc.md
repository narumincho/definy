# Connect-RPC & Deterministic CBOR アーキテクチャ

definy では、クライアントとサーバー間のデータ通信プロトコルとして
**Connect-RPC**
を採用しつつ、暗号署名やコンテンツアドレス・決定論的ハッシュの計算には **CBOR の
Deterministic Encoding (RFC 8949)** を組み合わせて使用しています。

## 1. 全体像と設計思想

- **通信レイヤー（Connect-RPC）**:
  - クライアント（React 19 UI）とサーバー（Cloudflare Workers `worker/index.ts`）間の RPC 通信。
  - プロトコル仕様: Connect-RPC (`Connect-Protocol-Version: 1`)。
  - フォーマット: `application/json` (Connect-RPC の JSON マッピング。フィールド名は camelCase,
    バイト列は Base64 文字列)。メッセージの定義は `proto/definy/v1/*.proto`
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
  // 各モジュールの各ブランチの作成者・コミット数・最新のコミットのイベント (docs/branch.md)
  rpc GetProjectBranches (GetProjectBranchesRequest) returns (GetProjectBranchesResponse);
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

- **サーバー側 (`worker/index.ts`)**:
  - `POST /definy.v1.EventService/GetEvents`
  - `POST /definy.v1.EventService/GetProjectBranches`
  - `POST /definy.v1.EventService/GetEvent`
  - `POST /definy.v1.EventService/SubmitEvent`
  - `POST /definy.v1.EventService/CheckMissingHashes` (差分ハッシュ照会)
  - `POST /definy.v1.EventService/UploadContent`
    (不足コンテンツの一括アップロード & ハッシュ検証)
  - `POST /definy.v1.EventService/GetContent`
    (コンテンツアドレスからの式バイナリ取得)
  - 受信した `signed_event_bytes` の署名・CBOR 構造を
    即座に検証し、不正データは
    `invalid_argument` (HTTP 400) で拒否。
  - `SubmitEvent` では、コミットイベント内で参照されている式（AST）の
    ContentHash がサーバーに存在するか確認。欠損がある場合は
    `status: "missing_content"`
    とともに不足ハッシュ一覧（`missing_content_hashes`）を返却。

- **クライアント側 (`src/auth.ts` の `submitProjectCommitEvent`, `src/content_store.ts`, `src/state/useEvents.ts`)**:
  - ブラウザから `fetch` で Connect-RPC エンドポイントを呼び出す。
  - プロジェクトのコミットには式の `content_hash` だけを入れ, 下の差分ハッシュ・ネゴシエーションで足りない式だけを送る (#763)。
  - コミットを読むときは `GetContent` (`contentHashes` でまとめて) で式を読み, SHA-256 が content hash と合うものだけを使う。

## 4. 差分ハッシュ・ネゴシエーション方式（Git Tree/Blob モデル）

definy
では、コードの変更履歴をイベントソーシングで保存しますが、モジュール内の全パーツの
AST（式バイナリ）を毎回のコミットイベントに含めると、変更のないパーツの式データが重複してネットワークや
DB を圧迫します。 そこで Git の **Tree（メタデータ・参照）** と
**Blob（実体バイナリ）** の分離モデルを採用しています。

```
Client (React 19 UI)                             Server (Cloudflare Worker)
       |                                                    |
       |  1. SubmitEvent (Tree: project_commit)           |
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
  と完全一致することを確認した上で CAS（D1 の `cas_contents` テーブル）に格納します。

## 5. 以前あった開発ツール (削除済み)

Rust 版には, OpenAPI (utoipa) の Swagger UI (`/swagger-ui`) と, Connect-RPC メソッドの実行や任意の CBOR バイナリの
デコード・署名検証ができる「Connect-RPC & CBOR Explorer」(`/api`) があった。今はイベント詳細ページ (`/event/{hash}`) で
イベントの中身と署名の検証結果を見る。Protobuf バイナリ (`application/proto`) の受け付けも今は無い。
