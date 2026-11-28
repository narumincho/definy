# fly.io の無料枠で html 版を動かす (2026-11-28)

html 版 (ストアの `html-ui` プロジェクト. [html-ui.md](html-ui.md)) を, ラズパイの代わりに fly.io で動かす。
動かすものはラズパイ向けに作った Node.js 版のホスト `definy.node-host-script` (`host.mjs`. [raspberry-pi.md](raspberry-pi.md)) そのもので,
fly 向けに変えたのは起動の設定 [`fly/fly.toml`](../fly/fly.toml) だけ。

ユーザーの決定:

- 2026-11-28: ラズパイ 4 は電気代がかかるのでやめ, fly.io の無料枠に収める。**1GB の Machine を使っていないときは止める** (常に動かす 512MB ではなく)

## fly.io の料金 (2026-11-28 に公式で確かめた)

出典: [fly.io/pricing.md](https://fly.io/pricing.md), [Introducing the Free plan](https://fly.io/changelog/introducing-the-free-plan/) (2026-11-23)

- **2026-11-23 に Free プランができた**。毎月 5 ドル分の利用 (Machine, Postgres, ボリューム, 帯域, ネットワーク) が無料。
  Machine は 3 台まで, ユーザーは 1 人, **カードの登録が要る**
- **5 ドルを超えると止まらず Pay As You Go に移って請求される** (使える額の上限は設定できない)。なので使い方のほうで収める
- カード無しの試用は 1 ドル分だけ。前に調べた「5 ドル未満の請求は免除」は今の公式のページには無い
- 2024-10 より前からある組織の Hobby などの古い無料枠は, 新しい組織には無い

| 項目                          | 料金 (月)                                                  |
| :---------------------------- | :--------------------------------------------------------- |
| shared-cpu-1x 256MB           | 2.19 ドル (iad) / 2.87 ドル (nrt, 東京は 1.308 倍)         |
| shared-cpu-1x 512MB           | 約 3.69 ドル (iad) / 約 4.83 ドル (nrt)                    |
| shared-cpu-1x 1GB             | 約 6.70 ドル (iad) / 約 8.76 ドル (nrt)                    |
| 動いている Machine            | 秒単位の課金                                               |
| 止めた (suspend した) Machine | rootfs 0.15 ドル / GB だけ (CPU とメモリは無料)            |
| ボリューム                    | 0.15 ドル / GB (止めていても全容量)                        |
| 外への転送                    | 0.02 ドル / GB (北米・欧州), 0.04 ドル / GB (アジア太平洋) |
| 専用 IPv4                     | 2 ドル。共有 IPv4 と IPv6 は無料                           |

## 無料枠に収める工夫

ホストのメモリは, 取り込み (`mirror-pull`. `limit: 20, content_limit: 300`) の最中が最大約 690MB, 落ち着くと約 380MB だった
([raspberry-pi.md](raspberry-pi.md) の「ARM で動くか」)。512MB を常に動かすと東京で約 4.83 ドル + ボリュームで 5 ドルぎりぎりで, 取り込みの最中はメモリが足りない。そこで:

1. **東京 (nrt) の shared-cpu-1x 1GB を `auto_stop_machines = "suspend"` にする**。fly のプロキシは数分間リクエストが無いと Machine を止め,
   次のリクエストで動かす。suspend はメモリごと止めるので, 再開は数百ミリ秒で, ホストのメモリのキャッシュ (読んだコミットなど) も残る
   (`stop` だと起動し直しで 2 秒以上 + キャッシュが空)。suspend の条件 (メモリ 2GB 以下, スワップ無し, schedule 無し) を満たす。
   動いている時間が 1 日 3 時間なら, 1GB でも月約 1.1 ドル
2. **Cron は止めなくてよい**。止めるかどうかを決めるのは外から来るリクエストだけで, 中の `setTimeout` や外への `fetch` (`mirror-pull`) は数えない。
   動いている間は毎分取り込み, 止まっている間は Cron も止まり, 再開すると続きから動く
3. **専用 IPv4 は取らない** (月 2 ドル)。`fly deploy` が最初に聞いてきたら断る。共有 IPv4 と IPv6 で `https://<アプリ名>.fly.dev` に届く
4. **ボリュームは 1GB** (月 0.15 ドル)。今のストアは約 35MB
5. **Docker のイメージを作らない**。`[build] image = "node:26-slim"` で公式のイメージをそのまま使い, ホストの JS はボリュームに置く。
   ビルドが無いので `fly deploy` は速く, リポジトリも要らない (`fly.toml` 1 つだけ)

合計の見込み: rootfs (node:26-slim 約 0.25GB) 約 0.04 ドル + ボリューム 0.15 ドル + 動いている時間の分 + 転送 (ページは小さいので月数セント)。

### 5 ドルを超えそうなとき

一番危ないのは, **ボットが絶えずアクセスして Machine が止まらない** こと。1GB を 1 か月動かし続けると約 8.76 ドルになる。

- fly のダッシュボードの「Billing」で今月の使った額を時々見る
- 止まらないようなら, `robots.txt` を返す, Cloudflare を前に置いてページをキャッシュする (下の「独自ドメイン」), 512MB に下げる (`fly scale memory 512`) のどれか

## 構成

```text
手元の PC (npm run serve)                                        fly.io の Machine (nrt, 1GB, 使っていないときは suspend)
  @definy.deploy-node-host(...)  -- HTTPS -->  https://<アプリ>.fly.dev/__definy/deploy  ─┐
  @definy.replace-node-host(...) -- HTTPS -->  https://<アプリ>.fly.dev/__definy/host    ─┤  node /data/host.mjs
                                                                                           │    (--listen 0.0.0.0 --port 8080)
ブラウザ -- https://<アプリ>.fly.dev --> fly のプロキシ (TLS) ------------------------------┘
                                                                     ボリューム /data: host.mjs, host/ (deploy-token, store.sqlite, deployments/)
                                                     Cron で definy.mirror-pull <-- definy.narumincho.com
```

ラズパイとの違い:

| ラズパイ                    | fly.io                                                                            |
| :-------------------------- | :-------------------------------------------------------------------------------- |
| systemd の `Restart=always` | `[[restart]] policy = "always"` (ホストの置き換えは exit 0 で終わるため)          |
| Cloudflare Tunnel           | fly のプロキシが TLS を持つ。`<アプリ>.fly.dev` か `fly certs add` で独自ドメイン |
| `~/definy-host/host.mjs`    | ボリュームの `/data/host.mjs`。無ければ最初の起動で `/mcp` から取ってくる         |
| `--data-dir ~/.definy-host` | `--data-dir /data/host`                                                           |
| 常に動いている              | リクエストが無いと suspend                                                        |
| SSH で直す                  | `fly ssh console`                                                                 |

`host.mjs` を `/data` (ボリューム) に置くのは, `PUT /__definy/host` で置き換えたファイルが再起動のあとも残るようにするため
(ホストは自分と同じフォルダに `host.next.mjs` と `host.prev.mjs` を書く)。イメージの中に置くと, Machine を作り直したとき最初の版に戻る。

## 手順 (ユーザーがすること)

**前提**: `definy.node-host-script` が公開サーバーに入っていること (PR #938 のマージとデプロイの後)。
2026-11-28 の時点では公開の `/mcp` の `definy_get_part` が「Part definy.node-host-script was not found」を返す。

### 1. fly.io のアカウント

1. <https://fly.io/app/sign-up?plan=free> で Free プランのアカウントを作り, カードを登録する
2. 手元の PC に flyctl を入れる (`brew install flyctl`) → `fly auth login`

### 2. アプリとボリュームを作ってデプロイ

`fly/fly.toml` の `app` を自分の名前 (例 `definy-html-narumincho`。`<名前>.fly.dev` になる) に変えてから:

```sh
cd fly
fly apps create definy-html-narumincho
fly volumes create definy_data --region nrt --size 1 --yes
fly deploy --ha=false          # Machine を 1 台だけ作る (既定は 2 台)
```

- `--ha=false` を付けないと Machine が 2 台できて, 料金が倍になる (しかもボリュームは 1 つなので片方が起動できない)
- 専用 IPv4 を聞かれたら断る。あとから付いていたら `fly ips list` で確かめ, `fly ips release <IPv4>` で外す (共有 IPv4 が残る)

確かめる:

```sh
curl -i https://definy-html-narumincho.fly.dev/         # 「Nothing is deployed yet」(503) ならホストは動いている
fly logs                                                # ホストのログ
fly ssh console -C "cat /data/host/deploy-token"        # デプロイのトークン (手元の PC のシークレットに入れる)
```

### 3. 手元の PC から html-ui をデプロイ

ラズパイの手順 5 ([raspberry-pi.md](raspberry-pi.md)) と同じ。パーツの名前と URL だけ変える:

```text
html-ui.fly-deploy-token : Secret
  = secret("fly-deploy-token-<ランダム>", "fly.io のデプロイのトークン", ["https://definy-html-narumincho.fly.dev/"])

html-ui.deploy-fly : @wasi.io
  = @definy.deploy-node-host(
      url: "https://definy-html-narumincho.fly.dev",
      api_token: @html-ui.fly-deploy-token,
      cron: "* * * * *",
      handler: quote({
        fetch: fn(request$0) => @html-ui.handle(editable: false, request: $0),
        scheduled: fn(time_ms$1) =>
          @definy.service-io-then-respond(
            io: @definy.mirror-pull(remote: "https://definy.narumincho.com", limit: 20, content_limit: 300),
            respond: fn(response$2) =>
              @definy.warm-commit-cache(limit: 20, then: fn(count$3) => #done<@definy.service-io>(#respond($2)))
          )
      })
    )

html-ui.replace-fly-host : @wasi.io
  = @definy.replace-node-host(url: "https://definy-html-narumincho.fly.dev", api_token: @html-ui.fly-deploy-token)
```

**最初の取り込みの間は Machine を起こしておく**。空のストアが追いつくまで Cron 8 回 (約 8 分) かかり, その間にリクエストが無いと suspend して止まる
(止まっても次に起きたときに続きから取り込むので, 壊れはしない)。早く済ませたいときは, 追いつくまで別の端末で
`while true; do curl -s -o /dev/null https://definy-html-narumincho.fly.dev/; sleep 60; done` を動かしておく。

### 更新

- html-ui を変えたら `html-ui.deploy-fly` を実行し直す (`fly deploy` は要らない)
- `definy.node-host-script` が変わったら `html-ui.replace-fly-host` を実行する
- `fly.toml` を変えたときだけ `fly deploy` (ボリュームの `host.mjs` とデプロイはそのまま残る)
- 戻す: `curl -X POST -H "Authorization: Bearer <トークン>" https://definy-html-narumincho.fly.dev/__definy/rollback`
- ホストの新しい版が起動後に壊れたとき: `fly ssh console` で `cp /data/host.prev.mjs /data/host.mjs` → `fly machine restart`

### 独自ドメイン (任意)

`html.narumincho.com` のようにしたいとき:

1. `fly certs add html.narumincho.com`
2. Cloudflare の DNS に `html` の CNAME を `definy-html-narumincho.fly.dev` で作る。**はじめはプロキシを切る (灰色の雲)**。
   fly が Let's Encrypt の証明書を取れたら (`fly certs check html.narumincho.com`), プロキシ (オレンジの雲) にしてもよい
3. Cloudflare のプロキシにすると, キャッシュのルールで GET のページを Cloudflare に覚えさせ, Machine を起こす回数を減らせる

証明書の料金は公式の料金のページに書かれていない (他のサイトには「1 ホスト名 0.10 ドル / 月, 最初の 10 個は無料」とある。まだ確かめていない)。

## 手元で確かめたこと (2026-11-28, クラウドのコンテナ, Node.js v26.13.1)

`fly.toml` の `[experimental] cmd` を `/data` を一時フォルダに読み替えて動かし, `/mcp` の代わりに `definy_get_part` と同じ形を返すサーバーを立てた:

- ボリュームに `host.mjs` が無いとき, 取ってきて置き, `--listen 0.0.0.0` で起動する。`/` は 503, `/__definy/status` はトークンで 200
- 置かれた `host.mjs` はパーツの文字列と同じバイト列

まだ試していないこと (fly のアカウントが要る):

- 実際の fly の Machine での suspend からの再開の時間と, 再開後の最初のページの速さ
- 1GB で取り込みの最中にメモリが足りるか (コンテナでは最大約 690MB)
- 動いている時間が 1 か月でどれくらいになるか (料金)

## 残り

1. #938 をマージ・デプロイして, 公開の `/mcp` から `definy.node-host-script` を取れるようにする
2. ユーザーが fly のアカウントを作ってから手順 2〜3。実機の数字をこの文書に書く
3. fly の Machine が署名済みのイベントを直接受け付ける (ラズパイの「これからの案」と同じ)。そのときは Litestream で R2 にバックアップする
