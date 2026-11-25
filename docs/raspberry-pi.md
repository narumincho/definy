# ラズパイと Cloudflare Tunnel で html 版をセルフホストする (2026-11-24)

html 版 (ストアの `html-ui` プロジェクト. [html-ui.md](html-ui.md)) は今, definy から別の Cloudflare Worker (`definy-html`) として
デプロイしている。Workers は CPU の上限 (無料プランで約 2 秒), 実行時に Wasm をコンパイルできない, isolate ごとにキャッシュが消えるなど
手元と違う環境で, それに合わせる工夫 (少しずつ取り込む Cron, `host_cache` の表など) がたくさん要った。
そこで **手元のサーバー (`definy serve`) をラズパイで常駐させ, Cloudflare Tunnel で公開する** (ユーザーの決定, 2026-11-24)。
`definy.narumincho.com` (公開サーバーの Worker) は当面そのまま残す。

## 構成

```text
手元の PC                                  公開サーバー                       ラズパイ
npm run serve (自分の鍵で署名)  -- push -->  definy.narumincho.com  <-- pull --  definy serve --public-host ... --mirror ...
                                             (Cloudflare Workers)                 127.0.0.1:8788 (読み取り専用の html-ui)
                                                                                         ^
ブラウザ -- https://<公開するホスト名> --> Cloudflare のエッジ -- Tunnel (cloudflared) ----+
```

- ラズパイは **公開サーバーの写し** (definy-html と同じ役目)。`definy.mirror-pull` で 60 秒ごとに公開サーバーのイベントを取り込む
- ラズパイは **署名しない**。編集とコミットはこれまでどおり手元の PC の `npm run serve` の html-ui (`editable: true`) か MCP でして,
  `definy_push` で公開サーバーに送る ([local-server.md](local-server.md)「公開サーバーとの同期」)
- 公開する html-ui は `editable: false` (編集の画面と `/api/*` が 404) で, さらにホストの側で GET と HEAD 以外を 405 にする
- MCP (`/mcp`, 既定 8787) はラズパイの中 (`127.0.0.1`) だけ。Tunnel には UI のポートだけを出す
- Tunnel は外へ向かう接続だけなので, ルーターのポート開放も固定 IP も要らない。HTTPS の証明書は Cloudflare のエッジが持つ

## 調べたこと

### ARM で動くか

- Node.js 26 (このリポジトリが要る版. `node:sqlite` と型の除去) は公式に `linux-arm64` のビルドがある (2026-11-10 の v26.13.1 で確かめた)。
  32 ビットの `linux-armv7l` の公式ビルドは v23.11.1 が最後なので, **64 ビットの Raspberry Pi OS** が要る (Pi 3 以降が 64 ビットで動く)
- definy の Wasm は Wasm GC を使う ([wasm-gc.md](wasm-gc.md))。V8 は arm64 でも Wasm GC を既定で有効にしているので, x64 と同じに動くはず。
  **まだ実機では試していない** (最初に下の手順の「動くか確かめる」をする)
- ストアの SQLite は Node.js の組み込みの `node:sqlite` で, ネイティブのアドオンは使わない
- `npm ci` は要らない。`npm run build:seeds` も `npm run serve` (`node cli/definy.ts serve`) も Node.js の組み込みだけで動く
  (`node_modules` を退けて確かめた)。`node_modules` (550MB) を SD カードに置かなくてよい
- メモリ: クラウドのコンテナ (x64) で公開サーバーを写しにして `/p/definy/main` などを開いたとき, プロセスの RSS は最大 480MB, 落ち着いて 350MB。
  **2GB 以上のモデル (Pi 4 / Pi 5)** をすすめる。1GB だと型検査やコンパイルの山で足りないかもしれない

### クラウドのコンテナ (x64) で測った速さ

`node cli/definy.ts serve --public-host test.example --mirror https://definy.narumincho.com` を空のデータで起動した。ラズパイはこれより数倍遅いはず。

| 処理                                         | 時間                                                  |
| :------------------------------------------- | :---------------------------------------------------- |
| `npm run build:seeds`                        | 約 17 秒                                              |
| 最初の取り込み (公開サーバーの 30 イベント)  | 約 12 秒                                              |
| 2 回目からの取り込み (新しいものが無いとき)  | 0.6〜2.2 秒                                           |
| 最初のページ (`/`. html-ui のコンパイル込み) | 約 1.2 秒 (main が進んだあとの最初のリクエストも同じ) |
| その後のページ (`/p/definy/main/core` など)  | 10〜30 ミリ秒                                         |

Workers と違い CPU の上限が無いので, `definy.mirror-pull` は 1 回に `limit: 1000, content_limit: 5000` で一度に取り込む
(`cli/html_ui.ts` の `mirrorPullExpression`)。取り込みの間 (Wasm が動いている間) は Node.js のイベントループが止まるので, ページの応答はその分待つ。

### ストアの永続化

- データは `--data-dir` (既定 `~/.definy`) の `store.sqlite` (写し 1 つで約 35MB), `account.json`, `mcp-token`
- ラズパイのストアは公開サーバーの写しなので, 消えても空から取り込み直せば戻る (上の表で約 12 秒)。バックアップは要らない
- `account.json` は起動時に作られるが, 公開モードでは使わない (書き込みの画面が無い)。自分の本当の鍵はラズパイに置かない
- SD カードは書き込みで傷むので, できれば USB の SSD に `--data-dir` を置く (取り込むものが無いときは書き込みはほとんど無い)

### seed の版をそろえる

`definy.mirror-pull` は seed のイベントも取り込む (definy-html は seed を持たないため)。手元のサーバーは起動時に自分の seed を入れるので,
**ラズパイの checkout の seed (`seeds/store/`) が公開サーバーにデプロイされたものと同じなら**, seed のイベントはハッシュが同じで取り込まれない
(クラウドで試したとき「Mirrored 29 of 30」で, 失敗の 1 つは下の古い `create_account`)。
版がずれると 2 組の seed のイベントが入り, 同じ時刻の `main` のコミットが並ぶので, 公開サーバーを入れ直したらラズパイも同じコミットに更新する。

- 毎回の取り込みは status 400 で「Mirrored 0 of 1」と出る。公開サーバーにある, 今の形式で読めない古い `create_account` (`K6K9xb2b…`) の分で,
  [local-server.md](local-server.md) の `definy_pull` と同じ。気にしなくてよい

## 手順 (ユーザーがすること)

### 1. ラズパイを用意する

1. Raspberry Pi Imager で **Raspberry Pi OS Lite (64-bit)** を書き込む。Imager の設定でホスト名, ユーザー, SSH, Wi-Fi を決めておく
2. SSH でつなぎ, `uname -m` が `aarch64` であることを確かめる
3. Node.js 26 を入れる (公式の tar.xz を展開するのが確実)

   ```sh
   cd /tmp
   curl -LO https://nodejs.org/dist/v26.13.1/node-v26.13.1-linux-arm64.tar.xz
   sudo mkdir -p /opt/node && sudo tar -xJf node-v26.13.1-linux-arm64.tar.xz -C /opt/node --strip-components=1
   echo 'export PATH=/opt/node/bin:$PATH' >> ~/.profile && . ~/.profile
   node -v   # v26.13.1
   ```

### 2. definy を入れて動くか確かめる

```sh
sudo apt install -y git
git clone --depth 1 https://github.com/narumincho/definy ~/definy
cd ~/definy
npm run build:seeds      # npm ci は要らない
node cli/definy.ts serve --public-host <公開するホスト名> --mirror https://definy.narumincho.com
```

別の SSH から `curl -H 'Host: <公開するホスト名>' http://127.0.0.1:8788/` でプロジェクトの一覧の HTML が返れば動いている
(最初の取り込みが終わるまでは html-ui がまだ無く 503)。ログに 60 秒ごとに `mirror https://definy.narumincho.com (... ms, ...)` が出る。

### 3. systemd で常駐させる

`/etc/systemd/system/definy.service` (`pi` は自分のユーザー名に):

```ini
[Unit]
Description=definy (read-only html-ui mirror)
After=network-online.target
Wants=network-online.target

[Service]
User=pi
WorkingDirectory=/home/pi/definy
ExecStart=/opt/node/bin/node cli/definy.ts serve --public-host <公開するホスト名> --mirror https://definy.narumincho.com --data-dir /home/pi/.definy
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now definy
journalctl -u definy -f   # ログ
```

### 4. Cloudflare Tunnel で公開する

ホスト名は `narumincho.com` のゾーン (Cloudflare にある) の下の, まだ使っていない名前にする (例 `html.narumincho.com`。
`definy.narumincho.com` は公開サーバーのまま残す)。ダッシュボードでもできるが, コマンドなら:

```sh
# cloudflared (arm64) を入れる
curl -L -o cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared.deb

cloudflared tunnel login                     # 表示された URL をブラウザで開き, narumincho.com を選ぶ
cloudflared tunnel create definy-pi          # ~/.cloudflared/<トンネル ID>.json ができる
cloudflared tunnel route dns definy-pi html.narumincho.com   # CNAME を作る
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
sudo cloudflared --config /home/pi/.cloudflared/config.yml service install   # /etc/cloudflared に写して systemd に登録
sudo systemctl enable --now cloudflared
```

- cloudflared は元の `Host` (`html.narumincho.com`) をそのまま送るので, `--public-host` に同じ名前を渡す (違うと 403)。
  `originRequest.httpHostHeader` は設定しない
- `8787` (`/mcp`) は ingress に書かない

### 5. 更新するとき

公開サーバー (`definy.narumincho.com`) を入れ直したら, ラズパイも同じコミットにそろえる (上の「seed の版をそろえる」):

```sh
cd ~/definy && git pull && npm run build:seeds && sudo systemctl restart definy
```

html-ui のパーツの変更は要らない: 公開サーバーに push された html-ui のコミットは次の取り込みで入り, どれかの `main` が進むと
次のリクエストで html-ui をコンパイルし直す (`cli/html_ui.ts`)。`html-ui.deploy` も Cloudflare の API トークンも要らない。

## 足した実装 (`definy serve` のオプション)

| オプション                      | 意味                                                                                                                  |
| :------------------------------ | :-------------------------------------------------------------------------------------------------------------------- |
| `--public-host <host>` (複数可) | HTML の UI を `editable: false` でコンパイルし, この Host を受け付ける。GET と HEAD 以外は 405 (`checkPublicRequest`) |
| `--mirror <url>`                | `definy.mirror-pull(remote: url, limit: 1000, content_limit: 5000)` をコンパイルし, 定期的に動かす                    |
| `--mirror-interval <秒>`        | 取り込みの間隔 (既定 60)。前の取り込みが終わってから数える                                                            |

- 取り込みの式も html-ui と同じく `definy_compile_expression` で Wasm にして `handleWorkerRequest` の `service` で動かす
  (`createCompiledServiceHandler`。definy-html の Cron と同じパーツ)。`main` が進めばコンパイルし直す
- テスト: `cli/local_security.test.ts` (`checkPublicRequest`)。取り込みと読み取り専用の UI はクラウドのコンテナで本番から取り込んで確かめた

## GitHub 抜きで完結させることとの関係

[html-ui.md](html-ui.md) の「GitHub を使わずに definy だけで完結させるのに足りないもの」(PR #937) がセルフホストでどう変わるか。

1. **html-ui が使う definy プロジェクトのパーツの変更**: ラズパイの html-ui は, ストアの各プロジェクトの最新の `main` のパーツで
   実行時にコンパイルする (`definy.mcp-tools` などもストアのものを使う)。なので definy プロジェクトのコミットがストアに入れば,
   GitHub の PR もデプロイも無しに次のリクエストから使われる。ただし今のラズパイは公開サーバーの写しなので, コミットはまず
   `definy.narumincho.com` に `definy_push` で入る必要がある (公開サーバーが受け付ける形なら GitHub は要らない)。
   ラズパイ自身が push を受け付ければ (下の「残り」の 1), 公開サーバーも通らない
2. **公開サーバー自体のデプロイ**: html 版については要らなくなる。Workers へのデプロイ (`html-ui.deploy`, GitHub Actions) の代わりに,
   ラズパイはストアが進めば自分でコンパイルし直す。ホストのコード (`cli/`, `worker/*.ts`) を変えたときだけ `git pull` して再起動する
3. **手元のサーバーの入手**: 変わらない。ラズパイにも `git clone` で入れる (GitHub から読むだけ)
4. **ビルド (`npm run build:seeds`)**: 変わらない。ラズパイで動かす (`npm ci` は要らない)
5. **独自ドメイン**: Workers の独自ドメインを設定する実装は要らない。`cloudflared tunnel route dns` で好きなホスト名にできる

## HTTP でデプロイする運用 (案, 2026-11-25)

ユーザーの要望: Workers や fly.io のように, ラズパイへのデプロイも SSH ではなく HTTP でしたい。

### おすすめ: デプロイは「署名済みのイベントを HTTPS で push する」こと

Workers や fly.io は, ビルドしたもの (JS や Docker イメージ) を API トークン付きの HTTP でアップロードする。
ラズパイでは同じことをもっと definy らしくできる: **ラズパイ自身が実行時に Wasm にコンパイルできる** ので,
送るのはビルドしたものではなく **署名済みのイベント (コミット)** でよい。

```text
手元の PC: html-ui をコミット (自分の鍵で署名)
   └─ definy_push {"remote": "https://html.narumincho.com"}   … HTTPS (Tunnel) で /definy.v1.EventService/SubmitEvent など
ラズパイ: 署名と型を確かめてストアに入れる → main が進んだので次のリクエストで html-ui をコンパイルし直す (= デプロイ完了)
```

- ラズパイに API トークンも SSH も要らない。誰が送ったかは署名で分かり, 送られたものは公開サーバーと同じ検査 (`SubmitEvent`) を通る
- Workers と違い CPU の上限が無いので, `SubmitEvent` の型検査で 1102 になることも無い
- ロールバックは「前の内容に戻すコミット」を push する (履歴は全て残る)
- `html-ui.deploy` (Cloudflare の API でアップロードする `wasi.io` のプログラム) にあたるものは要らない。push がそのままデプロイ

#### 何を配るかを決める

今の `--public-host` は html-ui を決め打ちで配る。HTTP だけで配るものを変えられるように, 配る式もストアから読む:

- 起動のオプションで **持ち主のアカウント ID** (`--owner <アカウント ID>`) を 1 度だけ決める
- 持ち主が作ったプロジェクト (例 `pi`) の `main` のパーツ `pi.handler` (型は `html-ui.deploy` の handler と同じ `{fetch, scheduled}`) を配る。
  `main` は作成者だけがコミットできる ([branch.md](branch.md)) ので, 持ち主以外は配るものを変えられない
- 例: `quote({fetch: fn(request) => @html-ui.handle(editable: false, request: request), scheduled: fn(time_ms) => @definy.mirror-pull(...)})`。
  これで `--mirror` も式の側に移り, Cron の間隔だけがホストのオプションに残る

#### 受け付けるイベントを絞る

公開のホスト名で `SubmitEvent` を出すと, 誰でもアカウントを作ってイベントを送れる (今の definy.narumincho.com と同じ)。
ラズパイのディスクは小さいので, はじめは **決めたアカウントのイベントだけ受け付ける** (`--accept-account <ID>` 複数可。持ち主と opus5.5)。
読む RPC (`GetEvents` など) は誰でもよい。`/mcp` はこれまでどおり出さない。

#### 公開サーバー (definy.narumincho.com) との関係

当面は両方に送る: 手元から `definy_push` を公開サーバーとラズパイの 2 回する (どちらもイベントのハッシュで重複を省く)。
ラズパイは `definy.mirror-pull` で公開サーバーも写し続けてよい (同じイベントは入れ直さない)。
ラズパイを正にしたら, 公開サーバーへの push をやめる。

### ホストのコード (`cli/`, `worker/*.ts`, seed) の更新

ストアに無いホストのコードは, まだ GitHub から `git pull` するしかない (計画の 5 段目で JS の土台を最小にするまで)。HTTP で済ませるなら:

- **おすすめ**: systemd のタイマーで 1 日 1 回 (か 10 分ごと) `git fetch` し, 決めたブランチ (例 `pi`) が進んでいたら
  `git merge --ff-only && npm run build:seeds && systemctl restart definy`。デプロイは「そのブランチに push する」(GitHub への HTTP) になる
- 失敗したら前のコミットに戻して起動し直す (起動して `GET /` が 200 になるかで判断)
- 将来: ホストの JS もストアのパーツ (`definy.cloudflare-service-runtime-script` のように) にすれば, これもイベントの push で済む

seed の版は, ラズパイを正にしたあとも手元の PC とそろえる (手元のコミットの親が seed の `main` の最新なので)。

## R2 へのバックアップ (案, 2026-11-25)

ラズパイが push を受け付けて正になったら, ストア (`store.sqlite`) は取り込み直せないのでバックアップが要る。

### R2 の料金 (2026-11-25 に公式の料金のページで確かめた)

| 項目                           | 無料枠 (毎月) | 超えた分              |
| :----------------------------- | :------------ | :-------------------- |
| 保存 (Standard)                | 10 GB-month   | 0.015 ドル / GB-month |
| Class A (PutObject, List など) | 100 万回      | 4.50 ドル / 100 万回  |
| Class B (GetObject など)       | 1000 万回     | 0.36 ドル / 100 万回  |
| 外への転送 (egress)            | 無料          | 無料                  |

今のストアは約 35MB なので保存は無料枠に収まる。気をつけるのは書き込みの回数 (Class A)。

### おすすめ: まず Litestream で store.sqlite を R2 に複製する

[Litestream](https://litestream.io/) は SQLite の WAL を S3 互換のストレージに複製し続けるツール (arm64 の .deb がある)。コードはほとんど要らない。

```yaml
# /etc/litestream.yml (パーミッション 600)
dbs:
  - path: /home/pi/.definy/store.sqlite
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

- Litestream は WAL のときだけ動く (WAL でなければ自分で WAL にする)。書き込みのロックと重ならないよう, アプリの側で `PRAGMA busy_timeout = 5000` を付ける
  (`worker/sqlite_d1.ts` を直す。今は WAL も busy_timeout も設定していない)
- `sync-interval: 1m` なら, 書き込みが毎分あっても PUT は月 4.3 万回ほどで無料枠に収まる (取り込むものが無い写しはほとんど書かない)
- 戻すとき: `litestream restore -o store.sqlite s3://...` (definy を止めてから。古い `-wal` と `-shm` は消す)
- R2 のトークンは R2 の「API トークンの管理」で **そのバケットだけの Object Read & Write** にする。ラズパイにだけ置き, definy のストアには入れない
- Litestream v0.5 以降は R2 を見分けて設定を合わせる (署名付きの本文, 同時アップロード数 2)

### あとで: イベントを 1 つずつ R2 に置く (definy らしいバックアップ)

ストアの中身は全て署名済みのイベントと, ハッシュで名前の付いた中身 (content-addressed) なので,
`events/<イベントハッシュ>` と `contents/<中身のハッシュ>` を R2 に 1 度ずつ置くだけで完全なバックアップになる。

- 一度置いたものは変わらないので増えた分だけ送ればよい。SQLite の形に依らず, `seeds/store/` と同じように読める
- 戻すときは新しいストアに `definy.mirror-submit` で入れ直す (今の写しの取り込みと同じ)
- definy の `scheduled` の式で書けば, バックアップも definy の中で完結する。ただし R2 の S3 API の署名 (AWS SigV4。HMAC-SHA256) を
  definy で書く必要があるので, Litestream で始めてから移る

### バックアップしなくてよいもの・別にするもの

- ラズパイの `account.json` (使わない) と `mcp-token`
- **手元の PC の `account.json` (自分の秘密鍵) は R2 に平文で置かない**。パスワードマネージャーなどに別に保管する (将来は YubiKey. [yubikey.md](yubikey.md))。
  鍵を失うと自分の `main` にコミットできなくなる
- `secrets.json` (Cloudflare のトークンなど) は手元の PC にだけあり, ラズパイには無い

## 残り (次の候補)

1. **ラズパイが署名済みのイベントを直接受け付ける** (上の「HTTP でデプロイする運用」): 公開のホスト名で `/definy.v1.EventService/*` の RPC を出し
   (`--accept-account` で受け付けるアカウントを絞る), 配る式を持ち主のプロジェクトの `main` から読む (`--owner`)
2. WAL と `busy_timeout` を `worker/sqlite_d1.ts` に入れ, Litestream で R2 に複製する (上の「R2 へのバックアップ」)
3. 取り込みの間イベントループが止まる (2 回目から 0.6〜2.2 秒, ラズパイでは数倍)。気になれば取り込みを `worker_threads` に分ける
4. seed の版のずれを見つける: 起動時に公開サーバーの seed のイベントのハッシュと自分の seed を比べて警告する
5. 実機 (Pi 4 / Pi 5) で, Wasm GC が動くこと, 速さ, メモリを測ってこの文書に書く
