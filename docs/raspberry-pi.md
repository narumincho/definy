# ラズパイと Cloudflare Tunnel で html 版をセルフホストする (2026-11-24〜25)

html 版 (ストアの `html-ui` プロジェクト. [html-ui.md](html-ui.md)) は今, definy から別の Cloudflare Worker (`definy-html`) として
デプロイしている。Workers は CPU の上限 (無料プランで約 2 秒), 実行時に Wasm をコンパイルできない, isolate ごとにキャッシュが消えるなど
手元と違う環境で, それに合わせる工夫 (少しずつ取り込む Cron, `host_cache` の表など) がたくさん要った。

ユーザーの決定:

- 2026-11-24: ラズパイで常駐させ, Cloudflare Tunnel で公開する。`definy.narumincho.com` (公開サーバーの Worker) は当面そのまま残す
- 2026-11-25: デプロイも Workers や fly.io のように HTTP でしたい。git にも頼らないよう, **ホストの JavaScript も definy の文字列として持ち, HTTP で置き換えられるようにする**

## 構成

```text
手元の PC (npm run serve)                                     ラズパイ (node host.mjs. 正本は definy.node-host-script)
  html-ui の I/O の実行: @definy.deploy-node-host(...)  -- HTTPS -->  PUT /__definy/deploy  (worker.js + app.wasm)
                         @definy.replace-node-host(...) -- HTTPS -->  PUT /__definy/host    (host.mjs 自身)
                                                                         |
ブラウザ -- https://<公開するホスト名> --> Cloudflare のエッジ -- Tunnel (cloudflared) --> 127.0.0.1:8788
                                                                         |
                                                       Cron で definy.mirror-pull <-- definy.narumincho.com
```

- ラズパイで動くのは **1 つの JS ファイル (`host.mjs`)** だけ。中身は definy のパーツ `definy.node-host-script` (文字列) で, git の checkout も `npm` も要らない
- ホストは **Workers の真似をする小さな実行環境**。デプロイで受け取るのは Cloudflare に送るのと同じ土台の JS (`definy.cloudflare-service-runtime-script`) と
  `app.wasm` (html-ui の `{fetch, scheduled}` をコンパイルしたもの) で, その `default export` の `fetch` と `scheduled` を呼ぶ。
  D1 の代わりに `node:sqlite` を `env.DB` として渡し, Cron も自分で回す
- デプロイは手元の PC の html-ui (か MCP の `definy_run_io`) で `@definy.deploy-node-host(...)` を実行するだけ。中で Wasm にコンパイルし, HTTPS で送る。
  `html-ui.deploy` (Cloudflare 向け) と同じ形で, 宛先とトークンが違うだけ
- ラズパイは **公開サーバーの写し**。署名の鍵は持たない。編集は今までどおり手元の PC でして `definy_push` で公開サーバーに送り, ラズパイは Cron で取り込む
- Tunnel は外へ向かう接続だけなので, ルーターのポート開放も固定 IP も要らない。HTTPS の証明書は Cloudflare のエッジが持つ

## ホスト (`definy.node-host-script`)

```sh
node host.mjs [--port 8788] [--listen 127.0.0.1] [--data-dir ~/.definy-host]
```

Node.js 26 の組み込み (`node:http`, `node:sqlite`, `node:module` の `registerHooks` など) だけを使う。

### 管理の API

`Authorization: Bearer <データのフォルダの deploy-token>` が要る (無ければ 401)。トークンは最初の起動で作り (パーミッション 600), ログにパスを出す。

| メソッドとパス            | すること                                                                                                                                               |
| :------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /__definy/status`    | ホストの版 (自分のファイルの SHA-256), 今のデプロイ, Cron, 残しているデプロイの一覧                                                                    |
| `PUT /__definy/deploy`    | multipart: `metadata` (JSON `{main_module, cron}`) と各ファイル。`deployments/<時刻>/` に置いて読み込み, 読めたら切り替える (読めなければ前のまま 400) |
| `POST /__definy/rollback` | 1 つ前のデプロイに戻す                                                                                                                                 |
| `PUT /__definy/host`      | 本文の JS を `host.next.mjs` に書き, `--self-test` (今のデプロイを読み込めるか) で動かす。通れば今のものを `host.prev.mjs` に残して置き換え, 終了する  |

- それ以外のパスは今のデプロイの `fetch` に渡す。まだ何もデプロイしていなければ 503
- `/__definy/*` も Tunnel で公開される (Workers の API と同じくトークンで守る)。気になれば Cloudflare Access でそのパスだけ守る
- ホストの置き換えは「終了したら systemd (`Restart=always`) が新しいファイルで起動し直す」前提。`--self-test` で落ちるものは置き換えない。
  新しい版が起動後に壊れたときは, `host.prev.mjs` を `host.mjs` に戻す (SSH が要る唯一の場面)
- デプロイのたびに `host_cache` の表を消す (`definy.deploy-service-script` と同じ。読んだ形は definy のコードで変わる)。デプロイは新しい方から 5 つ残す

### データのフォルダ (`--data-dir`, 既定 `~/.definy-host`)

| ファイル            | 中身                                                                                           |
| :------------------ | :--------------------------------------------------------------------------------------------- |
| `deploy-token`      | 管理の API のトークン                                                                          |
| `store.sqlite`      | ストア (WAL, `busy_timeout = 5000`。Litestream で複製できる)。写しなので消しても取り込み直せる |
| `deployments/<id>/` | `metadata.json`, `worker.js`, `app.wasm`                                                       |
| `current`           | 今のデプロイの id (起動したらこれを読み込む)                                                   |

### Workers との違い

- CPU の上限が無い。Cron の取り込みは 1 回に多めでよい (下の手順では `limit: 20, content_limit: 300`)。ただし Wasm が動いている間は
  Node.js のイベントループが止まるので, 取り込みの間ページの応答は待たされる。Cron は前の回が終わっていなければ飛ばす
- 1 つのプロセスなので, 土台の JS のメモリのキャッシュ (読んだコミットなど) がリクエストをまたいで効く
- 写しは seed バンドルを持たず, seed のイベントも公開サーバーから取り込む (`definy-html` と同じ)。なので **ラズパイと公開サーバーの seed の版をそろえる必要は無い**
- 毎回の取り込みは「Mirrored 0 of 4」のように status 400 で出る。seed にある署名の誤ったイベント 3 つ (`src/invalid_signature_samples.ts`) と,
  公開サーバーにある読めない古い `create_account` (`K6K9xb2b…`) の分で, 気にしなくてよい

## 調べたこと

### ARM で動くか

- Node.js 26 は公式に `linux-arm64` のビルドがある (2026-11-10 の v26.13.1 で確かめた)。
  32 ビットの `linux-armv7l` の公式ビルドは v23.11.1 が最後なので, **64 ビットの Raspberry Pi OS** が要る (Pi 3 以降が 64 ビットで動く)
- definy の Wasm は Wasm GC を使う ([wasm-gc.md](wasm-gc.md))。V8 は arm64 でも Wasm GC を既定で有効にしているので, x64 と同じに動くはず。
  **まだ実機では試していない**
- ストアの SQLite は Node.js の組み込みの `node:sqlite` で, ネイティブのアドオンは使わない
- メモリ (クラウドのコンテナ, x64): 空のストアから `limit: 20, content_limit: 300` で取り込んだとき, プロセスの RSS の最大は MEM_PEAK。
  `limit: 1000, content_limit: 5000` で一度に取り込むと約 2GB まで増えた (中身 1000 個以上の seed のイベントを一度に読む)。
  **2GB 以上のモデル (Pi 4 / Pi 5)** をすすめ, 取り込みの量は小さくしておく

### クラウドのコンテナ (x64) で測った速さ

| 処理                                                       | 時間                                                        |
| :--------------------------------------------------------- | :---------------------------------------------------------- |
| デプロイ (`definy_run_io` でコンパイルして送る)            | 約 2.9 秒 (送るのは約 490KB)                                |
| 空のストアが追いつくまで (`limit: 20, content_limit: 300`) | CATCH_UP                                                    |
| 取り込むものが無いときの Cron                              | 約 1.5 秒                                                   |
| 最初のページ (`/`. コミットを全て読む)                     | 約 8 秒 (`definy.warm-commit-cache` が先に済んでいれば速い) |
| その後のページ (`/p/html-ui/main`, `/p/definy/main/core`)  | 10〜110 ミリ秒                                              |

## 手順 (ユーザーがすること)

### 1. ラズパイを用意する

1. Raspberry Pi Imager で **Raspberry Pi OS Lite (64-bit)** を書き込む。Imager の設定でホスト名, ユーザー, SSH, Wi-Fi を決めておく
2. SSH でつなぎ, `uname -m` が `aarch64` であることを確かめる
3. Node.js 26 を入れる

   ```sh
   cd /tmp
   curl -LO https://nodejs.org/dist/v26.13.1/node-v26.13.1-linux-arm64.tar.xz
   sudo mkdir -p /opt/node && sudo tar -xJf node-v26.13.1-linux-arm64.tar.xz -C /opt/node --strip-components=1
   /opt/node/bin/node -v   # v26.13.1
   ```

### 2. ホストの JS を definy から取ってくる (git は使わない)

公開サーバーの `/mcp` の `definy_get_part` (読み取りなのでトークン無しで使える) で `definy.node-host-script` を読み, 文字列の式を JSON として読む:

```sh
mkdir -p ~/definy-host && cd ~/definy-host
/opt/node/bin/node --input-type=module -e '
const response = await fetch("https://definy.narumincho.com/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call",
    params: { name: "definy_get_part", arguments: { project: "definy", part: "definy.node-host-script" } } }),
});
const text = (await response.json()).result.content[0].text;
process.stdout.write(JSON.parse(text.slice(text.indexOf("\nexpression:\n") + 13)));' > host.mjs
/opt/node/bin/node host.mjs   # 動くか確かめる (Ctrl+C で止める)
```

一度入れたら, あとは HTTP で置き換えられる (下の 5)。

### 3. systemd で常駐させる

`/etc/systemd/system/definy-host.service` (`pi` は自分のユーザー名に):

```ini
[Unit]
Description=definy host
After=network-online.target
Wants=network-online.target

[Service]
User=pi
WorkingDirectory=/home/pi/definy-host
ExecStart=/opt/node/bin/node /home/pi/definy-host/host.mjs --port 8788 --data-dir /home/pi/.definy-host
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
```

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now definy-host
journalctl -u definy-host -f        # ログ
cat ~/.definy-host/deploy-token     # デプロイのトークン (手元の PC のシークレットに入れる)
```

`Restart=always` はホストの置き換え (終了して起動し直す) に要る。

### 4. Cloudflare Tunnel で公開する

ホスト名は `narumincho.com` のゾーン (Cloudflare にある) の下の, まだ使っていない名前にする (例 `html.narumincho.com`)。

```sh
curl -L -o cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared.deb
cloudflared tunnel login                     # 表示された URL をブラウザで開き, narumincho.com を選ぶ
cloudflared tunnel create definy-pi          # ~/.cloudflared/<トンネル ID>.json ができる
cloudflared tunnel route dns definy-pi html.narumincho.com
```

`~/.cloudflared/config.yml`:

```yaml
tunnel: definy-pi
credentials-file: /home/pi/.cloudflared/<トンネル ID>.json
ingress:
  - hostname: html.narumincho.com
    service: http://127.0.0.1:8788
  - service: http_status:404
```

```sh
sudo cloudflared --config /home/pi/.cloudflared/config.yml service install
sudo systemctl enable --now cloudflared
```

`curl https://html.narumincho.com/` が「Nothing is deployed yet」(503) を返せばつながっている。

### 5. 手元の PC からデプロイする

html-ui に 2 つのパーツを足す (手元のサーバーの html-ui の編集か MCP の `definy_commit_parts`。html-ui の `main` は opus5.5 の鍵):

```text
html-ui.pi-deploy-token : Secret
  = secret("pi-deploy-token-<ランダム>", "ラズパイのデプロイのトークン", ["https://html.narumincho.com/"])

html-ui.deploy-pi : @wasi.io
  = @definy.deploy-node-host(
      url: "https://html.narumincho.com",
      api_token: @html-ui.pi-deploy-token,
      cron: "* * * * *",
      handler: quote({
        fetch: fn(request$0) => @html-ui.handle(editable: false, request: $0),
        scheduled: fn(time_ms$1) =>
          @definy.service-io-then-respond(
            io: @definy.mirror-pull(remote: "https://definy.narumincho.com", limit: 20, content_limit: 300),
            respond: fn(response$2) =>
              @definy.warm-commit-cache(limit: 20, then: fn(count$3) => #respond<@definy.service-io>($2))
          )
      })
    )

html-ui.replace-pi-host : @wasi.io
  = @definy.replace-node-host(url: "https://html.narumincho.com", api_token: @html-ui.pi-deploy-token)
```

1. 手元の html-ui で `html-ui.pi-deploy-token` のページを開き, ラズパイの `deploy-token` の値を入れる (手元の `secrets.json` にだけ置かれる)
2. `html-ui.deploy-pi` のページで「実行」(か MCP の `definy_run_io {"expression": "@html-ui.deploy-pi", "project": "html-ui"}`)
3. 空のストアは Cron (1 分ごと) で少しずつ追いつく。追いつくまでページは空か 503

更新:

- **html-ui の変更**: `app.wasm` はデプロイのときに手元でコンパイルしたものなので, **html-ui を変えたら `html-ui.deploy-pi` を実行し直す** (Workers と同じ)。
  公開サーバーに push したコミットは Cron で写しに入るが, 動くコードは変わらない
- **ホストの JS の変更**: `definy.node-host-script` が変わったら `html-ui.replace-pi-host` を実行する
- **戻す**: `curl -X POST -H "Authorization: Bearer <トークン>" https://html.narumincho.com/__definy/rollback`

## これからの案 (2026-11-25)

### ラズパイが署名済みのイベントを直接受け付ける

今のラズパイは公開サーバーの写しなので, 編集は公開サーバー (Workers) を通る。handler の `fetch` を html-ui と `definy.handle-rpc` の
組み合わせにして `/definy.v1.EventService/*` (`SubmitEvent`, `UploadContent`, `GetEvents` など) も受け付ければ, 手元から
`definy_push {"remote": "https://html.narumincho.com"}` で直接送れ, ラズパイが公開サーバーの代わりになる (Cloudflare は Tunnel だけ)。

- Workers と違い CPU の上限が無いので, `SubmitEvent` の型検査で 1102 になることも無い
- ラズパイのディスクは小さいので, はじめは決めたアカウントのイベントだけ受け付ける
- そうなると写し (`mirror-pull`) をやめるか, 両方に push する。ストアが正になるので下のバックアップが要る

### R2 へのバックアップ

ラズパイが写しのうちは, 消えても取り込み直せるのでバックアップは要らない。push を受け付けて正になったら要る。

R2 の料金 (2026-11-25 に公式の料金のページで確かめた):

| 項目                           | 無料枠 (毎月) | 超えた分              |
| :----------------------------- | :------------ | :-------------------- |
| 保存 (Standard)                | 10 GB-month   | 0.015 ドル / GB-month |
| Class A (PutObject, List など) | 100 万回      | 4.50 ドル / 100 万回  |
| Class B (GetObject など)       | 1000 万回     | 0.36 ドル / 100 万回  |
| 外への転送 (egress)            | 無料          | 無料                  |

今のストアは約 35MB なので保存は無料枠に収まる。気をつけるのは書き込みの回数 (Class A)。

**まず Litestream で `store.sqlite` を R2 に複製する** のがおすすめ。[Litestream](https://litestream.io/) は SQLite の WAL を S3 互換のストレージに
複製し続けるツール (arm64 の .deb がある)。ホストは WAL と `busy_timeout = 5000` を設定済みなので, コードの変更は要らない。

```yaml
# /etc/litestream.yml (パーミッション 600)
dbs:
  - path: /home/pi/.definy-host/store.sqlite
    replica:
      type: s3
      bucket: definy-backup
      path: store
      endpoint: <アカウント ID>.r2.cloudflarestorage.com
      region: auto
      access-key-id: <R2 のアクセスキー>
      secret-access-key: <R2 のシークレット>
      sync-interval: 1m # 既定の 1 秒だと書き込みのたびに PUT (Class A) になる
```

- `sync-interval: 1m` なら, 書き込みが毎分あっても PUT は月 4.3 万回ほどで無料枠に収まる
- 戻すとき: `litestream restore -o store.sqlite s3://...` (ホストを止めてから。古い `-wal` と `-shm` は消す)
- R2 のトークンは R2 の「API トークンの管理」で **そのバケットだけの Object Read & Write** にする。ラズパイにだけ置く
- Litestream v0.5 以降は R2 を見分けて設定を合わせる (署名付きの本文, 同時アップロード数 2)

あとで definy らしい形に移れる: ストアの中身は全て署名済みのイベントとハッシュで名前の付いた中身なので, `events/<イベントハッシュ>` と
`contents/<中身のハッシュ>` を R2 に 1 度ずつ置くだけで完全なバックアップになる (増えた分だけ送る。戻すときは `definy.mirror-submit` で入れ直す)。
`scheduled` の式で書けば definy の中で完結するが, R2 の S3 API の署名 (AWS SigV4. HMAC-SHA256) を definy で書く必要がある。

バックアップしなくてよいもの・別にするもの:

- ラズパイの `deploy-token` (失くしたら消して起動し直せば作り直す)
- **手元の PC の `account.json` (自分の秘密鍵) は R2 に平文で置かない**。パスワードマネージャーなどに別に保管する (将来は YubiKey. [yubikey.md](yubikey.md))
- `secrets.json` (Cloudflare やラズパイのトークン) は手元の PC にだけある

## GitHub 抜きで完結させることとの関係

[html-ui.md](html-ui.md) の「GitHub を使わずに definy だけで完結させるのに足りないもの」(PR #937) がどう変わるか。

1. **html-ui が使う definy プロジェクトのパーツの変更**: 変わらない。`definy.node-host-script` などのパーツ自体はまだ `seeds/store/` と GitHub の PR を通って公開サーバーに入る
2. **公開サーバー自体のデプロイ**: html 版はラズパイに HTTP でデプロイでき, ラズパイのホストの JS も HTTP で置き換えられる。GitHub Actions も git の checkout も要らない
3. **手元のサーバーの入手**: 手元の PC の `npm run serve` は変わらず GitHub から clone する。ラズパイは definy から `host.mjs` を取ってくるだけ
4. **ビルド (`npm run build:seeds`)**: ラズパイでは要らない (seed を持たない写し)。手元の PC では変わらない
5. **独自ドメイン**: Workers の独自ドメインを設定する実装は要らない。`cloudflared tunnel route dns` で好きなホスト名にできる

## 残り

1. 実機 (Pi 4 / Pi 5) で Wasm GC が動くこと, 速さ, メモリを測ってこの文書に書く
2. ラズパイが署名済みのイベントを直接受け付ける (上の「これからの案」)
3. 取り込みの間イベントループが止まる。気になれば `worker_threads` に分ける
4. ホストの新しい版が起動後に壊れたとき自動で `host.prev.mjs` に戻す (今は `--self-test` だけ)

## テスト

`cli/node_host.test.ts`: seed の `definy.node-host-script` を `host.mjs` に書いて別のプロセスで動かし, 手元のサーバーの `definy_run_io` から
`definy.deploy-node-host` で 2 回デプロイ, `/__definy/rollback` で戻し, `definy.replace-node-host` で置き換えて終了し, 起動し直しても前のデプロイで動くこと。
