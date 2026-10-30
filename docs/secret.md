# シークレットリテラル (Secret 型)

API トークンなどの秘密の値を, 環境変数の代わりに型安全に扱う仕組み。値はパーツに入れず, プログラムからも読めない。

## 書き方

```json
{
  "#secret": {
    "id": "cloudflare-api-token-6c1f0e3a9b2d4c58",
    "label": "Cloudflare API トークン",
    "allowed_url_prefixes": ["https://api.cloudflare.com/"]
  }
}
```

- `id`: シークレットを区別する ID。ツリーエディタで「secret」を選ぶとランダムに決まる (`crypto.randomUUID()`)
- `label`: 値を入れるとき・エラーのときに出す名前
- `allowed_url_prefixes`: 値を送ってよい URL の先頭
- ふつうはシークレットリテラルだけを式にしたパーツ (例: `definy.cloudflare-api-token`, 型 `secret`) を作り,
  使う側はそのパーツを参照する。シークレットの宣言はパーツのイベントなので, 変更はコミット履歴で辿れる

## 型

- 型は `Secret` (型の式は `{"#type_secret": null}`, 型チェッカーの中の `core.type-ast` では `secret`)
- 文字列とは別の型なので, 文字列連結や `done` のメッセージには使えない。値 (`{ id, label }` のレコード) のフィールドも読めない
- 使えるのは `wasi.outgoing-request` の `secret_headers` (`{ name, prefix, secret }`) だけ。ホストが送信の直前に
  `prefix ++ 値` のヘッダーを足す ([wasi-io.md](wasi-io.md))

## 値と使用履歴 (ブラウザ)

- シークレットのパーツのページで値を入れ, localStorage (`definy.secrets`) にだけ保存する (`src/wasi_io_browser.ts`)。
  サーバーにもイベントにも入らない。CORS の仲介を使うときだけ, そのリクエストのヘッダーとして definy の Worker を通る
- **送ってよい宛先は値を入れたときのものを使う**。パーツの式の `allowed_url_prefixes` ではない。シークレットの ID は
  公開されているので, 他人が同じ ID で宛先を `https://evil.example/` にしたリテラルを書いても, 値はそこに送られない
- 送った (送ろうとした) たびに, 実行したパーツ・URL・送ったかを `definy.secret-usage` に記録し (最新 500 件),
  シークレットのパーツのページの「使用履歴」に出す
- 「使用箇所」は, そのシークレットのパーツを参照しているパーツと, 同じ ID のリテラルを書いているパーツ (`src/secret.ts`)

## 一覧 (設定 → シークレット)

- `/settings/secrets` (`pages/settings/secrets.tsx`). 設定の「I/O をするプログラムの実行」の「シークレットの一覧 →」から開く
- シークレットのパーツ (式がシークレットリテラルのパーツ) と, このブラウザに値を入れてあるシークレット (`definy.secrets`) を
  ID ごとにまとめて名前順に出す (`listSecrets`, `src/secret.ts`). パーツが消えて値だけ残っているものは「パーツなし」として出し, 値を消せる
- 値はふだん `••••••••` で隠し (長さも出さない), 「表示」を押したときだけ出す. ほかに送ってよい宛先・入力日時・最後に使った記録・ID を出す
- 値を入れる・変えるのはシークレットのパーツのページ (送ってよい宛先をパーツの式から取るため). 一覧からは値を消すだけ

## 実装

- `seeds/core.json`: `core.expression` の `secret({ id, label, allowed_url_prefixes })` と `type_secret`, `core.type-ast` の `secret`。
  型チェック (`type-check-unlocated` は `Secret` を返す), コンパイル・評価 (`{ id, label }` のレコードにする), quote
- 式は保存した `core.expression` の値をそのまま stage1・型チェッカーに渡す ([value-encoding.md](value-encoding.md)).
  以前は TypeScript の変換が `allowed_url_prefixes` を捨てていたが, 今は `core.expression` の `secret` が持つ (definy 側は読まない)
- `src/wasi_io.ts`: `secret_headers` に値を入れる (`withSecretHeaders`)
- `src/components/SecretPanel.tsx`: パーツのページの欄
- `pages/settings/secrets.tsx`: 設定のシークレット一覧
- テスト: `src/self_hosted_type_check.test.ts` (型), `src/wasi_io.test.ts` (値の挿入・宛先の制限), `src/secret.test.ts` (使用箇所・一覧), `e2e/ui.test.ts` (一覧のマスク表示),
  `src/tree_layout/quote.test.ts` (エディタ)
