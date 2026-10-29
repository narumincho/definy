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
  サーバーでイベントの中身を使う処理は署名を検証してから使う (`decodeVerifiedSignedEvent` を使い、検証できないイベントは読み飛ばす)
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

| kind                   | 内容                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `flipped_signature`    | 正しく署名した create_account の署名を 1 バイト書き換えたもの                                                                            |
| `tampered_content`     | 正しく署名した project_commit の `message` を署名後に書き換えたもの                                                                      |
| `impersonated_account` | 使い捨ての鍵で署名した project_commit の `account_id` を、ログイン中のアカウント (未ログインなら別の使い捨てアカウント) にすり替えたもの |

`SubmitUnverifiedEvent` は `SubmitEvent` と同じリクエスト・レスポンスで、形式 (CBOR の形・`account_id` の長さなど) だけ確認する。
フラグが無いときは `permission_denied` (403) を返す。

### 片付け

インメモリストアなら dev サーバーの再起動で消える。ローカル D1 (`.wrangler/state`) に保存された場合は残るので、
`.wrangler/state` を消すか `events` テーブルから該当行を削除する。

## 期待する表示

- イベント一覧に 3 件、コミット履歴に 2 件 (project_commit のもの) が「署名が不正」のバッジ付きで出る (バッジの title に理由)。seed のサンプルは 2019-01-31 の日付なので一覧の下のほうにある
- イベント詳細の Signature 欄に理由 (`Ed25519 signature verification failed`) が出る
- モジュール一覧・パーツ一覧に `invalid_signature_sample` が出ない
- アカウント名に `invalid-signature-sample` が出ない

`invalid_signature_sample` モジュールや "このパーツが見えていたら…" という説明のパーツが見えたら、ブラウザ側の検証が漏れている。

## 署名が不正なイベントを送るテストのパーツ (`definy.check-invalid-signatures-rejected`)

サーバーが署名の不正なイベントを拒否することを, definy のパーツ (`wasi.io` のプログラム) で確かめる。
パーツのページの実行パネルで `definy.check-invalid-signatures-rejected` を実行すると, 実行している definy のサーバーに 3 件送り,
`OK: すべて署名が不正として拒否されました` か `NG: ...` と, 1 件ごとのレスポンスを出す。

- `definy.invalid-signature-test-signed-account` / `definy.invalid-signature-test-signed-commit`: 正しく署名したイベント (CBOR の SignedEvent) のバイト列のリテラル。
  seed のサンプルと同じ公開済みの鍵 (`SEED_SAMPLE_SIGNER_KEY_SEED`) と時刻で TypeScript で署名して作った。definy には CBOR のエンコードも Ed25519 も無いので, 正しく署名したものは definy の外で作る
- `definy.invalid-signature-test-events`: それを definy で書き換えた 3 件 (`std.bytes-replace`)。署名の 1 バイト目を反転 (`255 - バイト`) したもの,
  署名した後にメッセージの `Signed` を `Forged` にしたもの, `account_id` を開発用のシステムアカウントにすり替えたもの。書き換える位置はバイト列の中の位置のリテラル
- `definy.submit-events-expect-rejected(base_url, events)`: イベントを Base64 (`std.bytes-to-base64`) にして `EventService/SubmitEvent` に 1 件ずつ POST し,
  400 で, レスポンスに `Ed25519 signature verification failed` がある (`std.string-contains`) ものを「署名が不正として拒否された」とする。
  別の理由 (アカウントが作成済みなど) の拒否は NG にする。`base_url` が `""` なら実行しているページと同じサーバー
- テスト: `worker/invalid_signature_test_part.test.ts` で, seed を入れた Worker に対して実行し, 3 件とも OK になること,
  書き換える前のイベントは NG になること, `std.bytes-to-base64` が標準 Base64 と一致することを確かめる
- ビット演算の組み込み (`core.bit-and` など) は definy 製のコンパイラがまだ扱わない ([builtin-parts.md](builtin-parts.md)) ので, Base64 は割り算と余りで書いた
- 正しく署名したイベントのバイト列を変えたら, 書き換える位置 (署名の 1 バイト目, メッセージ, `account_id`) も合わせて変える
