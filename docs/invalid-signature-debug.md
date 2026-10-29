# 不正な署名のイベントを表示して確認する

通常の `SubmitEvent` は Ed25519 署名が不正なイベントを拒否する ([イベントの検証と RPC の認可](./rpc-authorization.md))。
そのままではブラウザ側の署名チェック (`verifyEventRecord`) が働いているかを画面で確かめられないので、
署名が不正なイベントのサンプルを seed バンドルに入れている。本番を含む全環境で、いつでも表示を確かめられる。

署名を検証せずにイベントを保存する RPC (`DebugService/SubmitUnverifiedEvent` と環境変数 `DEFINY_ALLOW_UNVERIFIED_EVENTS`) は
2026-10-29 に廃止した。署名が不正なイベントはどの環境でも常に拒否する。

## seed に入れたサンプル

`npm run build:seeds` (`scripts/generate_seed_bundle.ts`) が `createSeedInvalidSignatureSamples` (`src/invalid_signature_samples.ts`) で
[下の表](#サンプルの種類)の 3 件を作り、seed バンドルの末尾に入れる。

- 署名する鍵は固定 (`SEED_SAMPLE_SIGNER_KEY_SEED`, 秘密鍵は公開済み)、時刻も seed の時刻 (`2019-01-31T04:36:01.5Z`) に固定するので、何度作っても同じバイト列になる
- `impersonated_account` はシステムアカウント (`definy`) になりすます。ブラウザが `definy` の `invalid_signature_sample` モジュールとして扱わないことを確かめられる
- seed はサーバーが検証せずに取り込む経路なので、ストアには署名が不正なイベントが常にある。
  サーバーでイベントの中身を使う処理は署名を検証してから使う (`decodeVerifiedSignedEvent` を使い、検証できないイベントは読み飛ばす)
- サンプルの署名者 (`invalid-signature-sample` の鍵) も seed のアカウントになるので、seed が変わるとその鍵の seed に無いイベントは D1 から消える ([system-account.md](./system-account.md))
- `src/signed_event.test.ts` で、seed のイベントのうちちょうど 3 件が不正と判定されることを確かめる

## サンプルの種類

`src/invalid_signature_samples.ts` の `createInvalidSignatureSamples` が次の 3 件を作る。

| kind                   | 内容                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `flipped_signature`    | 正しく署名した create_account の署名を 1 バイト書き換えたもの                                   |
| `tampered_content`     | 正しく署名した project_commit の `message` を署名後に書き換えたもの                             |
| `impersonated_account` | 別の鍵で署名した project_commit の `account_id` を、seed ではシステムアカウントにすり替えたもの |

## 期待する表示

- イベント一覧に 3 件、コミット履歴に 2 件 (project_commit のもの) が「署名が不正」のバッジ付きで出る (バッジの title に理由)。seed のサンプルは 2019-01-31 の日付なので一覧の下のほうにある
- イベント詳細の Signature 欄に理由 (`Ed25519 signature verification failed`) が出る
- モジュール一覧・パーツ一覧に `invalid_signature_sample` が出ない
- アカウント名に `invalid-signature-sample` が出ない

`invalid_signature_sample` モジュールや "このパーツが見えていたら…" という説明のパーツが見えたら、ブラウザ側の検証が漏れている。
