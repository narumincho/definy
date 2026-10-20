# 不正な署名のイベントを表示して確認する

通常の `SubmitEvent` は Ed25519 署名が不正なイベントを拒否する ([イベントの検証と RPC の認可](./rpc-authorization.md))。
そのままではブラウザ側の署名チェック (`verifyEventRecord`) が働いているかを画面で確かめられないので、
署名が不正なイベントを 2 つの経路で用意している。

1. **seed に入れたサンプル (本番を含む全環境)**: seed バンドルに常に入っているので、本番でもいつでも表示を確かめられる
2. **デバッグ用の投入経路 (ローカル開発専用)**: その場で作ったサンプルを「署名を検証せずに保存する」RPC で追加する

## seed に入れたサンプル

`npm run build:seeds` (`scripts/generate_seed_bundle.ts`) が `createSeedInvalidSignatureSamples` (`src/invalid_signature_samples.ts`) で
[下の表](#不正な署名のイベントを投入する)の 3 件を作り、seed バンドルの末尾に入れる。

- 署名する鍵は固定 (`SEED_SAMPLE_SIGNER_KEY_SEED`, 秘密鍵は公開済み)、時刻も seed の時刻 (`2019-01-31T04:36:01.5Z`) に固定するので、何度作っても同じバイト列になる
- `impersonated_account` はシステムアカウント (`definy`) になりすます。ブラウザが `definy` の `invalid_signature_sample` モジュールとして扱わないことを確かめられる
- seed はサーバーが検証せずに取り込む経路なので、ストアには署名が不正なイベントが常にある。
  サーバーでイベントの中身を使う処理は署名を検証してから使う (`worker/part_compiler.ts` のパーツの読み込みは `decodeVerifiedSignedEvent` を使い、
  検証できないイベントは読み飛ばす。`worker/part_compiler.test.ts` で確かめる)
- サンプルの署名者 (`invalid-signature-sample` の鍵) も seed のアカウントになるので、seed が変わるとその鍵の seed に無いイベントは D1 から消える ([system-account.md](./system-account.md))
- `src/signed_event.test.ts` で、seed のイベントのうちちょうど 3 件が不正と判定されることを確かめる

## デバッグ用の投入経路 (ローカル開発専用)

### 有効にする

Worker の環境変数 `DEFINY_ALLOW_UNVERIFIED_EVENTS=true` を設定する。ローカルではリポジトリ直下の `.env` に書けば Void (Vite) の dev サーバーが読み込む。

```
DEFINY_ALLOW_UNVERIFIED_EVENTS=true
```

**本番・共有環境では絶対に設定しない。** 設定すると誰でも署名の不正なイベントを保存できる。
サーバーのパーツの読み込みは署名を検証するのでサンプルを使わないが、イベント一覧などにはそのまま出る。サンプルは独自のモジュール名 `invalid_signature_sample` を使い、既存のモジュールは上書きしない。

### 不正な署名のイベントを投入する

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

### 片付け

インメモリストアなら dev サーバーの再起動で消える。ローカル D1 (`.wrangler/state`) に保存された場合は残るので、
`.wrangler/state` を消すか `events` テーブルから該当行を削除する。

## 期待する表示

- イベント一覧に 3 件、コミット履歴に 2 件 (ModuleCommit のもの) が「署名が不正」のバッジ付きで出る (バッジの title に理由)。seed のサンプルは 2019-01-31 の日付なので一覧の下のほうにある
- イベント詳細の Signature 欄に理由 (`Ed25519 signature verification failed`) が出る
- モジュール一覧・パーツ一覧に `invalid_signature_sample` が出ない
- アカウント名に `invalid-signature-sample` が出ない

`invalid_signature_sample` モジュールや "このパーツが見えていたら…" という説明のパーツが見えたら、ブラウザ側の検証が漏れている。
