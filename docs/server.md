# サーバーの構成

> [!NOTE]
> 本ドキュメントは初期の設計案（旧設計・廃止済み）です。
> 現在は UI 配信・API・仮想 Wasm 配信をすべて **Cloudflare Workers (Void + React 19)** に一本化し、データベースには **Cloudflare D1 (SQLite)** を採用しています。詳細は [cloudflare-workers-assets.md](cloudflare-workers-assets.md) および [typescript-react-void-architecture.md](typescript-react-void-architecture.md) を参照してください。

以下は初期構想時の記録です。

### UIサーバー (旧構想)

UIサーバーはHTMLを返すサーバー. ブラウザでの操作UIを提供する
使用SaaS (旧): Deno Deploy

### ファイルサーバー (旧構想)

ファイルを保存して, 配信するサーバー
使用SaaS (旧): Cloudflare R2

## APIサーバー (旧構想)

APIサーバーはデータを受け取って処理をするサーバー
使用SaaS (旧): Deno Deploy

### データベース (旧構想)

イベントの検索向けのデータ保存と, IPアドレス, ログを保存する場所
使用SaaS (旧): SurrealDB Cloud
