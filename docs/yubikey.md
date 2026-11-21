# YubiKey で署名する (調査と設計案)

2026-11-21 の調査。まだ実装していない。方針が決まったらこのページを仕様に書き直す。

## 今の署名

- アカウント ID = Ed25519 の公開鍵 (32 バイト)。鍵は 1 つだけで, 増やす・替える・失効させる仕組みは無い
- `SignedEvent = { signature: bytes(64), event_binary: tag24(内側のイベント) }` で, `event_binary` そのものに Ed25519 で署名する
  ([event.md](event.md), [rpc-authorization.md](rpc-authorization.md))
- 検証は definy の `definy.verify-signed-event` ([cbor.md](cbor.md))。ホストの能力は `verify_ed25519` だけ (`worker/ed25519.ts`)。
  ブラウザ (React 版) も `src/signed_event.ts` で同じ検証をする
- 署名するのは手元サーバー (`npm run serve`) だけ。鍵は `~/.definy/account.json` に平文 (パーミッション 600) で置く
  ([local-server.md](local-server.md))。2026-11-08 から, 公開サーバーが作った署名前のバイト列にブラウザで署名する形はやめた
  ([html-ui.md](html-ui.md))
- ブランチにコミットできるのはブランチを作ったアカウント (`is_branch_creator`, [branch.md](branch.md))。比べるのはアカウント ID なので,
  鍵を替えてもアカウント ID が変わらなければ権限はそのまま残る

## YubiKey で使える方式

| 方式                 | 署名されるもの                                                                   | 鍵の種類 (YubiKey)                       | 呼び出し方                                                        |
| -------------------- | -------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| WebAuthn (ブラウザ)  | `authenticatorData ‖ SHA-256(clientDataJSON)`. 任意のバイト列ではない            | ES256 (P-256), EdDSA (Ed25519, 5.2 以降) | `navigator.credentials.get`. JS が要る                            |
| CTAP2 直接 (FIDO2)   | `authenticatorData ‖ clientDataHash` (clientDataHash は 32 バイトを自由に渡せる) | 同上                                     | libfido2 (`fido2-assert`, `brew install libfido2`) などで USB HID |
| PIV (スマートカード) | 渡したバイト列そのもの (Ed25519 は 5.7 以降)                                     | P-256/P-384, RSA, Ed25519 (5.7 以降)     | PC/SC (`yubico-piv-tool`, `ykman`, PKCS#11)                       |
| OpenPGP              | gpg 経由だと OpenPGP の署名パケットのハッシュ                                    | Ed25519 (5.2.3 以降) など                | gpg-agent / scdaemon                                              |

### ブラウザ (WebAuthn) でも署名はできる

できるが, 次の違いがある。

1. **素の署名ではない**。署名対象は `authenticatorData ‖ SHA-256(clientDataJSON)` で, こちらが決められるのは clientDataJSON の中の
   `challenge` だけ。`challenge = SHA-256(event_binary)` にすれば, イベントに結びついた署名になる。
   検証側は `authenticatorData` と `clientDataJSON` も受け取り, 次を確かめる
   - `clientDataJSON.type == "webauthn.get"`, `challenge` が `SHA-256(event_binary)` の URL-safe Base64
   - `authenticatorData` の先頭 32 バイトが `SHA-256(rp_id)`, フラグの UP (触れた) が立っている (UV = PIN は任意にするか要検討)
   - 公開鍵で `authenticatorData ‖ SHA-256(clientDataJSON)` の署名を確かめる (ES256 なら DER の ECDSA を確かめる)
   - definy で JSON を読む必要がある (`challenge` と `type` だけ取り出せればよい)
2. **鍵がドメイン (RP ID) に縛られる**。手元サーバーの html-ui (`http://localhost:8788`) なら RP ID は `localhost`
   (localhost は安全なコンテキスト扱いなので WebAuthn が使える)。公開サーバーのドメインで作った鍵は手元では使えない。
3. **公開鍵の形が違う**。WebAuthn の公開鍵は COSE 形式。ES256 なら P-256 の点 (65 バイト), EdDSA なら 32 バイト。
   Safari は EdDSA に対応しない場合があるので, 作るときは `[-8 (EdDSA), -7 (ES256)]` の順で両方許し, 検証は両方対応する。
   ホストの能力に `verify_ecdsa_p256` を足す (Web Crypto / Node の `crypto.subtle` で確かめられる)

「公開サーバーが作ったバイト列にブラウザで署名する」問題は, 署名するバイト列を **手元サーバー** が作るなら起きない。
手元サーバーの html-ui がイベントを作り, ブラウザは `challenge` を渡して YubiKey に触れてもらうだけなので, 2026-11-08 の方針と両立する。
ただし html-ui に WebAuthn を呼ぶ小さな JS が要る (「残る JS は wasm 起動用の最小の土台だけ」の例外になる)。

### 手元サーバーから直接 (CTAP2)

FIDO2 の `getAssertion` は clientDataHash を 32 バイトそのまま渡せるので, `clientDataHash = SHA-256(event_binary)` にできる。
ブラウザも JS も要らず, MCP から AI がコミットするときも同じ経路で署名できる。RP ID はドメインでなくてよい (OpenSSH の `ssh:` と同じく
`definy:` のような, ブラウザからは使えない名前にすると, 別のサイトから鍵を使われて偽のイベントに署名させられることも防げる)。
macOS では libfido2 が root なしで動く。Node から呼ぶには `fido2-assert` コマンドを呼ぶか, HID のネイティブモジュールを使う。

RP ID を `localhost` にすれば, 同じ鍵をブラウザ (html-ui) と CTAP 直接の両方で使える。代わりに localhost の他のアプリからも鍵を呼べる
(YubiKey に触れないと署名できないので, 気づかずに触れたときだけ問題になる)。

### PIV

5.7 以降の YubiKey なら PIV で Ed25519 が使え, `event_binary` そのものへの素の Ed25519 署名になる。
検証は今の `verify_ed25519` のままでよく, 署名の形も変わらない。ただし 5.6 以前の YubiKey では P-256 (ハッシュに署名) になる。
PC/SC のツールを入れる必要があり, ブラウザからは使えない。

### OpenPGP

gpg を通すと OpenPGP の署名形式になり, definy で検証するのが重い。勧めない。

## 毎回触れるのか (おすすめ: YubiKey は鍵の管理に使う)

YubiKey の署名は 1 回ごとに触れる必要がある。AI が MCP で何度もコミットすると毎回触れることになるので,
**YubiKey を「管理用の鍵」, 手元サーバーのソフトウェアの鍵を「普段の鍵」に分ける** のをおすすめする
(Matrix の cross-signing や Keybase の sigchain と同じ考え方)。

- 普段のコミットは今と同じく手元サーバーの Ed25519 の鍵で署名する (形はほぼ今のまま)
- その鍵を「このアカウントの鍵」と認めるイベントだけ YubiKey で署名する (コンピューターを替えたときなど, まれにしか触れない)
- 手元サーバーのコンピューターを盗まれたら, YubiKey でその鍵を失効させる。アカウント ID も, 作ったブランチの権限もそのまま

YubiKey で直接コミットにも署名できるようにする (普段の鍵を持たない使い方) のは, 後から署名の種類を足すだけでできる。

## 複数の鍵の登録と失効 (案)

### アカウント ID

アカウント ID は今のまま「最初の鍵の公開鍵 (32 バイト)」にする。最初の鍵を後で失効させても, ID は名前として残る。
既存のイベントを署名し直さなくてよい。最初の鍵は Ed25519 のソフトウェアの鍵 (下の復旧用の鍵) にする。

(より綺麗なのは「`create_account` のイベントハッシュをアカウント ID にする」形だが, 全イベントの `account_id` が変わり
seeds/store を署名し直すことになる。)

### 署名の封筒

```text
SignedEvent = {
  signer: bytes,           // 署名した鍵の ID (Ed25519 なら公開鍵, WebAuthn なら credential の公開鍵の SHA-256 など)
  signature: core.event-signature,
  event_binary: tag24(内側のイベント),    // 内側は今と同じ { account_id, time, content }
}
core.event-signature = union {
  ed25519: bytes(64),                      // event_binary への素の署名 (今と同じ. PIV の Ed25519 もこれ)
  fido: {                                  // WebAuthn・CTAP2
    authenticator_data: bytes,
    client_data_json: option<bytes>,       // WebAuthn なら有る. CTAP 直接なら無く, clientDataHash = SHA-256(event_binary)
    signature: bytes,                      // ES256 は DER, EdDSA は 64 バイト
  },
}
```

`signer` が省かれたら `account_id` の鍵で署名したものとみなせば, 今のイベントの形もそのまま読める (互換が要らなければ必須にする)。

### 鍵の管理のイベント

`core.event-content` に足す。

```text
add_key: {
  key: core.account-key,          // { id, algorithm: ed25519 | es256 | eddsa, public_key, credential_id: option<bytes>, rp_id: option<string> }
  role: admin | signer,           // admin は鍵を足す・失効できる. signer はコミットなど普段のイベントだけ
  label: string,                  // 「YubiKey 5C 青」「MacBook の手元サーバー」など
  previous_key_event: option<string>,  // そのアカウントの 1 つ前の鍵のイベントハッシュ (鍵のイベントを鎖にする)
}
revoke_key: { key_id: bytes, previous_key_event: string }
```

- `add_key` / `revoke_key` は **admin の鍵** でしか出せない。最初の鍵 (= アカウント ID の鍵) は admin
- 他のイベントはそのとき有効な鍵 (admin か signer) で署名する。`core.event-check-facts` に「署名した鍵が有効か」を足す
- `previous_key_event` で鍵のイベントを鎖にするので, サーバーが鍵のイベントを隠すと気づける (コミットの親と同じ. [event.md](event.md)「消されたことに気づけるか」)。
  鎖が分かれた (同じ親を持つ鍵のイベントが 2 つ) ら, 鍵を盗まれた疑いとして表示する
- 失効した鍵の **失効より前** のイベントは有効のまま。ただしイベントの時刻は署名した人が決めるので, 盗んだ鍵で時刻を過去にしたイベントは
  時刻だけでは区別できない。`revoke_key` に「この鍵で署名したイベントのうち有効なもの」の一覧 (またはその最後のイベントハッシュ) を入れて
  それ以外を無効にするか, 受け取った時刻をサーバーが覚えるかは要検討

### おすすめの登録の仕方

| 鍵                                    | role   | 置き場所                           |
| ------------------------------------- | ------ | ---------------------------------- |
| 復旧用の鍵 (Ed25519, アカウント ID)   | admin  | 紙に印刷・金庫など。普段は使わない |
| YubiKey 1 本目                        | admin  | キーホルダー                       |
| YubiKey 2 本目 (予備)                 | admin  | 家の別の場所                       |
| 手元サーバーの鍵 (コンピューターごと) | signer | `~/.definy/account.json`           |

## 全部なくした場合

サーバーは誰の鍵でも署名を偽れない作りなので, admin の鍵を全部なくしたアカウントは **取り戻せない** のが基本。
そうならないように admin を 3 つ以上 (うち 1 つは紙) にしておく。

- signer の鍵がまだあれば, コミットは続けられる (鍵の管理だけできない)。admin を新しく足すことはできない
- 全部なくしたら新しいアカウントを作る。前のアカウントのブランチにはコミットできないので, 新しいブランチを作って取り込む
  ([branch.md](branch.md)「取り込み」)
- 後で足せる案: **信頼するアカウントによる復旧**。前もって「アカウント A, B, C のうち 2 つが署名すれば admin の鍵を足せる。
  ただし 7 日待つ間に自分の admin の鍵で取り消せる」と登録しておく (待つ間に取り消せるので, 信頼したアカウントが結託しても乗っ取りに気づける)

## 決めること

1. YubiKey で署名するのは「鍵の管理だけ」か「コミットも直接」か (おすすめは管理だけから始める)
2. YubiKey を呼ぶ経路: ブラウザ (html-ui の WebAuthn, RP ID `localhost`), 手元サーバーから CTAP2 直接, PIV
3. 失効より前のイベントをどう決めるか (上の「鍵の管理のイベント」の最後)

## 参考

- [YubiKey 5.7 Firmware Specifics](https://docs.yubico.com/hardware/yubikey/yk-tech-manual/5.7-firmware-specifics.html) (PIV の Ed25519)
- [FIDO Specifics](https://docs.yubico.com/hardware/yubikey/yk-tech-manual/yk5-apps-fido.html)
- [Smart Card (PIV Compatible)](https://docs.yubico.com/hardware/yubikey/yk-tech-manual/yk5-apps-piv.html)
