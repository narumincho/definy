# URL

## definy サーバー (`definy.narumincho.com`)

| path                     | 説明                                                                     |
| ------------------------ | ------------------------------------------------------------------------ |
| /                        | 案内のページ (`public/index.html`)                                       |
| /mcp                     | MCP (Streamable HTTP. [mcp.md](mcp.md))                                  |
| /definy.v1.\*            | Connect-RPC ([connect-rpc.md](connect-rpc.md))                           |
| /healthz                 | ヘルスチェック ([healthz.md](healthz.md))                                |
| /\_\_definy_seed_\*.json | seed の束 ([cloudflare-workers-assets.md](cloudflare-workers-assets.md)) |

どのパスを処理するかは definy の `definy.handle-request` が決める。

## html-ui (definy-html と手元のサーバー)

パスは [html-ui.md](html-ui.md) を参照。`/` (プロジェクト一覧), `/p/<project>/<branch>` (パーツ一覧),
`/p/<project>/<branch>/<part>` (パーツ), `/h/...` (履歴), `/events`, `/e/<イベントハッシュ>`, `/accounts`, `/a/<アカウント ID>` など。

React の UI のころのパス (`/part/{module}.{name}`, `/event/{hash}`, `/about` など, `?lang=` の表示言語) は 2026-11 に UI とともに削除した。
