# 仮想 Wasm 配信 (`/virtual/wasm/{hash}`)

Worker (definy の `definy.serve-virtual-wasm`. 読むのはホストの `read_raw_content`) は CAS (D1 の `cas_contents` テーブル) に入っているバイト列を
`GET /virtual/wasm/{hash}` (末尾の `.wasm` は省略可) で `application/wasm` として返す。

- `{hash}` は CAS のキー. 内容の SHA-256 (URL-safe Base64) と一致するときだけ
  `Cache-Control: public, max-age=31536000, immutable` を付ける. 名前付きのキーは更新されうるので
  `max-age=0, must-revalidate`
- 見つからなければ `404`
- SSR より先に Worker が処理するパス (`definy.is-worker-first-path`) に入っている

## 経緯

コードの変更のたびに Docker イメージを作らず, 汎用の WASI ランタイム (wasmtime) が起動時にこのエンドポイントから
Wasm を取ってきて動かす, という fly.io 時代のデプロイ構想 ([deployment-bootstrapping.md](deployment-bootstrapping.md) の
「以前の構想」) のために作った。fly.io と `runner/` は削除し, 配信エンドポイントだけが残っている。
今のデプロイは Wasm を Cloudflare の API に直接アップロードする ([cloudflare-workers.md](cloudflare-workers.md))。
