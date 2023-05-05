# commection

GraphQL 以上を目指す問い合わせライブラリ

- プログラミング言語に依存しない仕組み
- 編集の分かりやすさ

を突き詰めるとGUIでの作成になるかなぁ...
コードでの編集の多段コード生成は分かりづからった?

- Deno 向けには `Deno.writeTextFile` とか `Request` `Response` を使う形にし,
  - deno.land に commection を公開
- Node.js 向けには, `node:fs` とか `handler: (req, res) => Promise<void>`
  の形になるのかな.
  - npm に commection を公開

graphql-http が参考になるかも

commection.json にはスキーマの情報を持たせるが, 読み取りを実行時にする形だと,
Deno で import したときにうまくいかなくなってしまう?

- JSON import すれば良い?
  - 他の言語ではやはりうまくいなかない?
- サーバー実装 言語での出力
  - 他の言語へ移動させるのに苦労する?
    - JSON 出力の機能を持たせればいい?

## 動きの流れ

### 開発モード

1. commection の HTTP handler にリクエストが来た
1. ブラウザ上でスキーマを編集
1. 編集した度以下のファイルが出力される
   - commection.ts にスキーマ情報と使用プログラミング言語向けの型定義
   - client.ts に function を呼び出すためのコード
   - serverTypeDefs.ts にfunction 作成の型定義

実装するファイル名, 分割方法は好きにして良い形.
そのため初期実装のテンプレート的なものは作ることができない?
コードの一部を解析して置き換えるのは難しいだろう...

実行中のファイルを置き換えるため, Deno の watch
モードで起動された場合はおかしな挙動になっていまうかも?

### 本番モード

1. commection の HTTP handler にリクエストが来た
1. commection.ts のスキーマ情報と,
   別のファイルに書いた実装をもとにして処理を実行する

## 画面構成

definy RPC と同じようにチャットUIと新たにスキーマエディタが追加されるかな

### ドキュメントタブ 閲覧&編集

- 型の関係図も表示する

### replタブ チャットUIでリクエストを試すことができる

## HTTP リクエストの形式

query && 認証が不要 && パラメーターが simpleText などパラメーターがシンプル &&
式リクエストでない `/prefix/api_name/argument.json` `/prefix/api_name/0_1.png`
とかのファイル配信サーバー対応の呼び方をする スキーマエディタで
ファイル配信サーバー対応の場合は それが分かる表示と export ボタンを用意する

query && 認証が不要 && パラメーターが複雑な場合は
ファイル配信サーバー非対応モードになる. GET
でリクエストするためCDNを利用しているときは, キャッシュが機能する
`/prefix/api_name/upperCase?value=%E6%97%A5%E6%9C%AC%E8%AA%9E%21`

それ以外の場合は POST にして body に含める形にする
