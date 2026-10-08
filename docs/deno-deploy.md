# Deno Deploy REST API v2 による運用ブートストラップ (Edge Bootstrapping)

definy では、従来の VM / Docker コンテナ基盤（Fly.io 等）に加えて、**Deno Deploy
REST API v2** (`https://api.deno.com/v2/docs`) を直接呼び出すことで、OS
やコンテナのオーバーヘッドを排したエッジ Isolate
環境への自己デプロイ（運用ブートストラップ）をサポートしています。

---

## 1. Deno Deploy 採用の背景と優位性

| 観点                   | Fly.io (Docker / Linux VM)                        | Deno Deploy (V8 Isolate)                                                                 |
| :--------------------- | :------------------------------------------------ | :--------------------------------------------------------------------------------------- |
| **実行環境**           | 軽量 Linux VM (Firecracker microVM)               | V8 Isolate (Web 標準ランタイム)                                                          |
| **起動オーバーヘッド** | 起動に数秒〜数十秒                                | ミリ秒オーダー (OS レイヤーなし)                                                         |
| **成果物の配布方式**   | Docker イメージビルドまたは Wasm ファイル直接注入 | TypeScript/JavaScript ソース + Wasm ファイルを REST API の `assets` に直接インライン送信 |
| **依存技術の少なさ**   | OS, Linux カーネル, Dockerfile, 仮想化層に依存    | **最小の依存** (V8 Isolate と Web 標準 API のみ)                                         |

definy は「純粋な式と能力 (Capability)
による自律的システム」を目指しており、重厚な OS レイヤーが存在しない Deno Deploy
は definy の設計思想に最も適合するクラウド実行基盤です。

---

## 2. デプロイフローとアーキテクチャ

```mermaid
sequenceDiagram
    autonumber
    actor User as 開発者 / ユーザー
    participant UI as definy Web UI (/deployments)
    participant Server as definy-server (親インスタンス)
    participant DB as SurrealDB (deployments)
    participant DenoAPI as Deno Deploy REST API v2 (api.deno.com)
    participant Edge as Deno Deploy Global Edge

    User->>UI: Org Token (Access Token) & App Slug を入力して「Deploy」クリック
    UI->>Server: Connect-RPC POST /definy.v1.DeployService/DeployDeno
    Note over Server: Wasm バイナリ / main.ts / deno.json を assets にパッケージング
    Server->>DenoAPI: POST /v2/apps (App 未作成時) または GET /v2/apps/{app}
    Server->>DenoAPI: POST /v2/apps/{app}/deploy (assets + dynamic runtime)
    DenoAPI-->>Server: Revision オブジェクト (status: "succeeded", hostnames: ["...deno.net"])
    Server->>DB: deployments テーブルに履歴保存 (provider: "deno_deploy")
    Server-->>UI: DeployDenoResponse (URL, hostnames, revision_id)
    UI-->>User: デプロイ完了URL (https://<app>.<org>.deno.net) を表示
    User->>Edge: ブラウザでアクセス (V8 Isolate 上でミリ秒起動)
```

---

## 3. Connect-RPC API 仕様

### `definy.v1.DeployService/ListDenoApps`

#### リクエスト (`ListDenoAppsRequest`)

- `orgToken`: (string, 必須) Deno Deploy の Organization Access Token または
  Personal Access Token。

#### レスポンス (`ListDenoAppsResponse`)

- `apps`: Deno Deploy 上のアクセス可能なアプリケーション一覧 (`id`, `slug`,
  `updatedAt`, `createdAt`)。

### `definy.v1.DeployService/DeployDeno`

#### リクエスト (`DeployDenoRequest`)

- `orgToken`: (string, 必須) Deno Deploy の Organization Access Token または
  Personal Access Token。
- `appSlug`: (string, 必須) デプロイ先の App Slug（既存 App
  の選択または新規作成）。
- `wasmHash`: (string, 任意) エッジランタイムに同梱する仮想 WebAssembly
  バイナリのハッシュ。
- `customScript`: (string, 任意) カスタム `main.ts`
  スクリプト（未指定時はデフォルトの edge runner が利用されます）。

#### レスポンス (`DeployDenoResponse`)

- `appId`: Deno Deploy 上の App ID (UUID)
- `appSlug`: App Slug
- `revisionId`: 作成された Revision ID (UUID)
- `status`: デプロイステータス (`"succeeded"`, `"queued"`, `"building"`)
- `url`: デプロイされたインスタンスのメイン URL (`https://...deno.net`)
- `hostnames`: ルーティング可能なホスト名一覧

---

## 4. UI からの利用方法

1. [Deno Console (`https://console.deno.com/narumincho`)](https://console.deno.com/narumincho)
   にて Organization Token を発行します。
2. definy のナビゲーションバーから「Deploy」(`/deployments`) 画面を開きます。
3. 「Deno Deploy エッジへのデプロイ実行」フォームにトークンを入力します。
   - ※トークンはリクエスト時のみ使用され、データベースやローカルストレージには保存されません。
4. トークンを入力すると自動的にアクセス可能なアプリ一覧が取得され、
   - **「既存のアプリから選択」**: プルダウンで配備先の App を選択できます。
   - **「新規 App を作成」**: 新しい一意な App Slug を入力して新規作成できます。
5. デプロイ対象ソース（カスタム TypeScript、definy
   パーツ、自己コンパイラ検証サンプル、Wasm ハッシュ）を選択します。
6. 「🚀 Deploy to Deno
   Deploy」をクリックすると、数秒以内にデプロイが完了し、即座にアクセス可能な
   URL が表示されます。
7. 過去のデプロイ履歴は下部の「デプロイ履歴一覧」カードに自動的に表示され、プロバイダ（Deno
   Deploy / fly.io）ごとに確認できます。

---

## 5. cURL による直接呼び出し例

```bash
# Connect-RPC 経由でのデプロイ
curl -X POST https://definy.fly.dev/definy.v1.DeployService/DeployDeno \
  -H "Content-Type: application/json" \
  -H "connect-protocol-version: 1" \
  -d '{
    "orgToken": "ddp_xxxxxxxxxxxxxxxx",
    "appSlug": "my-definy-edge"
  }'
```

---

## 6. Deno Deploy v2 運用の技術知見

1. **ドメイン体系の変更 (`*.deno.dev` の廃止と `*.deno.net`)**:
   - Deno Deploy Classic（旧サービス）は 2026 年 7 月 20 日に sunset
     され、`*.deno.dev` にアクセスすると `404 DEPLOYMENT_NOT_FOUND`
     が返却されます。
   - 新 Deno Deploy（REST API v2）の正式な公開ドメインは、Organization
     ごとに割り当てられる `https://<app>.<org>.deno.net` です。
2. **非同期ビルドと hostnames の確定タイミング**:
   - `POST /v2/apps/{app}/deploy` を呼び出した直後は `status: "building"`
     となり、レスポンス内の `hostnames` が一時的に空配列になる場合があります。
   - 数秒（通常 1〜2 秒以内）でビルドが完了し `status: "succeeded"`
     に移行するため、API クライアント側で `GET /v2/revisions/{revision}`
     による短時間ポーリングを行うことで確定したホスト名を確実に取得・返却できます。
