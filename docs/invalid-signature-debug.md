# 不正な署名のイベントを表示して確認する

通常の `SubmitEvent` は Ed25519 署名が不正なイベントを拒否する ([イベントの検証と RPC の認可](./rpc-authorization.md))。
そのままではブラウザ側の署名チェック (`verifyEventRecord`) が働いているかを画面で確かめられないので、
ローカル開発専用に「署名を検証せずに保存する」経路を用意している。

## 有効にする

Worker の環境変数 `DEFINY_ALLOW_UNVERIFIED_EVENTS=true` を設定する。ローカルではリポジトリ直下の `.env` に書けば Void (Vite) の dev サーバーが読み込む。

```
DEFINY_ALLOW_UNVERIFIED_EVENTS=true
```

**本番・共有環境では絶対に設定しない。** 設定すると誰でも署名の不正なイベントを保存できる。
サーバー側はストアに入ったイベントを信頼するので (`worker/http_stream.ts` のランタイムへの読み込みなど)、
保存したサンプルはサーバー側の処理にも混ざる。サンプルは独自のモジュール名 `invalid_signature_sample` を使い、既存のモジュールは上書きしない。

## 不正な署名のイベントを投入する

設定画面 (`/settings`) の「開発者向け」→「不正署名のサンプルを投入」を押す。
`src/invalid_signature_samples.ts` の `submitInvalidSignatureSamples` が次の 3 件を作り、
`/definy.v1.DebugService/SubmitUnverifiedEvent` に送る。

| kind                   | 内容                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `flipped_signature`    | 正しく署名した CreateAccount の署名を 1 バイト書き換えたもの                                                                           |
| `tampered_content`     | 正しく署名した ModuleCommit の `message` を署名後に書き換えたもの                                                                      |
| `impersonated_account` | 使い捨ての鍵で署名した ModuleCommit の `account_id` を、ログイン中のアカウント (未ログインなら別の使い捨てアカウント) にすり替えたもの |

`SubmitUnverifiedEvent` は `SubmitEvent` と同じリクエスト・レスポンスで、形式 (CBOR の形・`account_id` の長さなど) だけ確認する。
フラグが無いときは `permission_denied` (403) を返す。

## 期待する表示

- イベント一覧・コミット履歴に 3 件が「署名が不正」のバッジ付きで出る (バッジの title に理由)
- イベント詳細の Signature 欄に理由 (`Ed25519 signature verification failed`) が出る
- モジュール一覧・パーツ一覧に `invalid_signature_sample` が出ない
- アカウント名に `invalid-signature-sample` が出ない

`invalid_signature_sample` モジュールや "このパーツが見えていたら…" という説明のパーツが見えたら、ブラウザ側の検証が漏れている。

## 片付け

インメモリストアなら dev サーバーの再起動で消える。ローカル D1 (`.wrangler/state`) に保存された場合は残るので、
`.wrangler/state` を消すか `events` テーブルから該当行を削除する。
