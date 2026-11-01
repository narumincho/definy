# `/healthz` と接続元の IP バージョン

`GET /healthz` は D1 のシード処理を行わずにすぐ返すヘルスチェック (definy の `definy.handle-request`. [service.md](service.md))。

```json
{
  "status": "ok",
  "runtime": "cloudflare-workers",
  "storage": "cloudflare-d1",
  "ipVersion": "ipv6"
}
```

- `storage`: `env.DB` (D1) があれば `cloudflare-d1`、無ければ `in-memory`
- `ipVersion`: クライアントが IPv4 / IPv6 のどちらで接続してきたか (`ipv4` / `ipv6` / `unknown`)。
  設定画面 (`/settings`) の「IP バージョン」に表示する

## `ipVersion` の判定

`definy.client-ip-version` が Cloudflare の付けるヘッダーを見る (ヘッダーの名前は大文字小文字を区別しない)。IP アドレスそのものはレスポンスに含めない。

1. `Cf-Connecting-IPv6` があれば `ipv6` (ゾーンで Pseudo IPv4 が有効だと `CF-Connecting-IP` は IPv4 に書き換わり、元の IPv6 はこちらに入る)
2. `CF-Connecting-IP` に `:` があれば `ipv6`、`.` があれば `ipv4`
3. どちらも無ければ `unknown`

ローカルの dev サーバー (Vite + workerd) は `CF-Connecting-IP: 127.0.0.1` 相当を付けるので `ipv4` になる。
Vite は既定で `localhost` の IPv4 でしか待ち受けないので、ローカルで IPv6 の表示を確かめるには
`curl -H "CF-Connecting-IP: 2001:db8::1" http://localhost:5173/healthz` のようにヘッダーを付ける。
