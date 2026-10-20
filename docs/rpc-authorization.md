# イベントの検証と RPC の認可

Worker (`worker/index.ts`) が外部から受け取るデータは、以下のルールで検証する。

## SubmitEvent: Ed25519 署名の検証

`signedEventBytes` は次の CBOR を Base64 にしたもの。

```
SignedEvent = { signature: bytes(64), event_binary: tag24(bytes(Event)) }
Event       = { account_id: bytes(32), time: tag1(epoch 秒), content: { CreateAccount | ChangeProfile | ModuleCommit: ... } }
```

`src/signed_event.ts` の `verifySignedEvent` (`worker/cbor.ts` から再エクスポート) が次を確認し、1 つでも満たさなければ `invalid_argument` (400) を返す。

- 末尾に余分なバイトが無く、上の形をしている
- `event_binary` (tag 24 の中身のバイト列そのもの) に対する `signature` が、`account_id` を公開鍵とする Ed25519 署名として正しい
- `time` がサーバー時刻より 10 分以上未来ではない

ビルトインのシード (`npm run build:seeds` が作る `public/__definy_seed_bundle.json`) は信頼できる経路なので取り込み時には検証しないが、`src/rpc_auth.test.ts` で全イベントの署名が正しいことをテストしている。

## ブラウザ側での検証

ブラウザはサーバーを信用せず、`GetEvents` で受け取ったイベントをすべて `src/signed_event.ts` の `verifyEventRecord` で検証してから使う (`src/state.tsx`)。

- `verifySignedEvent` と同じ署名・形式・時刻のチェック
- `eventHash` が `signedEventBytes` の SHA-256 と一致する
- サーバーが付けたメタデータ (`accountId` / `eventType` / `timeMs`) が署名済みの中身と一致する

結果は `EventRecord.verification` に入る。`invalid` のイベントはモジュール・パーツ・アカウント名の導出には使わず、
イベント一覧・コミット履歴・イベント詳細で「署名が不正」と警告表示する。
この表示の確認方法は [不正な署名のイベントを表示して確認する](./invalid-signature-debug.md) を参照。

## UploadContent: コンテンツハッシュの検証

`contentHash` は `contentBytes` の SHA-256 を URL-safe Base64 (パディング無し) にしたもの。
一致しない項目が 1 つでもあればリクエスト全体を `invalid_argument` で拒否する。
既に保存済みのハッシュは上書きしない (`INSERT OR IGNORE`)。

例外として、シード中の `stage1` は名前付きのキーで、コンテンツアドレスではない。
`/virtual/wasm/:hash` は内容のハッシュが URL と一致するときだけ `immutable` でキャッシュし、`stage1` は毎回再検証させる。

## DeployService: 管理者の認可

次の操作は管理者アカウントに限る。

- `DeployCloudflare` / `ListCloudflareWorkers` で `apiToken` を省略し、サーバーの `CLOUDFLARE_API_TOKEN` を使う
- `DeployCloudflare` の `seedD1`

利用者が自分の `apiToken` を渡す場合は認可不要 (自分の Cloudflare アカウントへの操作なので)。
パーツが指定した `cloudflareToken` も、管理者のリクエストでのみ使う。

管理者は Worker の環境変数 `DEFINY_ADMIN_ACCOUNT_IDS` (カンマ・空白区切り) に列挙したアカウント ID。
アカウント ID は Base64URL なので大文字小文字を区別する。未設定なら誰も管理者ではない。

### Authorization ヘッダー

`src/rpc_auth.ts` の `createRpcAuthorization` で作り、`verifyRpcAuthorization` で検証する。

```
Authorization: Definy-Ed25519 <accountId>.<unix 秒>.<署名 (URL-safe Base64)>
```

署名対象は次の 5 行を `\n` で連結した UTF-8 文字列。

```
definy-rpc-v1
<HTTP メソッド (大文字)>
<パス (例: /definy.v1.DeployService/DeployCloudflare)>
<unix 秒>
<リクエストボディの SHA-256 (URL-safe Base64)>
```

時刻のずれが ±300 秒を超えるものは拒否する。ボディもパスも署名に含むので、別のリクエストへの使い回しはできない。
ただし 300 秒以内に同じリクエストを再送すること (リプレイ) は防いでいない。

ヘッダーが無ければ `unauthenticated` (401)、署名は正しいが管理者でなければ `permission_denied` (403) を返す。
