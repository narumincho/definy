# サーバーの構成

API (Connect-RPC, MCP)・仮想 Wasm 配信は 1 つの **Cloudflare Workers** で行い (UI は別の Worker の definy-html. [html-ui.md](html-ui.md)),
データベースは **Cloudflare D1 (SQLite)** を使う。詳細は [cloudflare-workers-assets.md](cloudflare-workers-assets.md),
[database.md](database.md) を参照。

## SaaS 選定の経緯

| 役割             | 検討した候補                        | 結論                                                                                        |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------------------------------- |
| UI サーバー      | Deno Deploy, Cloudflare Workers     | Deno Deploy が Cloudflare Workers に統合される方針になったので Cloudflare Workers           |
| API サーバー     | Deno Deploy, Shuttle (Rust), fly.io | いったん fly.io にしたが廃止し, UI と同じ Cloudflare Workers                                |
| データベース     | SurrealDB Cloud                     | D1 に移行                                                                                   |
| ファイルサーバー | Cloudflare R2, AWS S3               | 料金の安い R2 を使う予定 (まだ使っていない。式などのバイト列は D1 の `cas_contents` にある) |
