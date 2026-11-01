# CBOR と署名済みイベントを definy で読む

2026-11-01 から, サーバーは `SubmitEvent` で受け取った SignedEvent を definy で読む (`definy.verify-signed-event`. [service.md](service.md))。
以前はホストの TypeScript (`decodeVerifiedSignedEvent`, `src/signed_event.ts`) が読み, 中身の形を `core.value-conforms` で確かめていた。

## 文字列とバイト列 (std)

definy の文字列は UTF-8 のバイト列なので, バイト列から文字列を作る組み込みが無くても作れる。

- `std.utf8-byte-string(byte)`: 1 バイトの文字列。そのバイトを含むリテラル (ASCII, U+0080〜U+00BF の 2 バイト目, 先頭バイト C2〜DF / E0〜EF / F0〜F4
  を並べた文字列) を `core.string-slice` で 1 バイト切り出す。UTF-8 に現れないバイト (C0, C1, F5〜FF) は U+FFFD
- `std.bytes-to-string(bytes)` / `std.bytes-to-string-range(bytes, start, end)`: 1 バイトずつの文字列を半分ずつ結合する。
  前から 1 つずつ足すと毎回コピーして O(n²) になる (`core.list-append` も同じ)
- `std.list-range(T, list, start, end)`: リストの一部 (同じく半分ずつ結合する)
- `std.base64-to-bytes(text)`: Base64 / Base64URL (パディングは有っても無くても良い) を読む。違えば `none`

## CBOR (`definy.cbor-read`)

`definy.cbor-read(bytes, offset) -> option<definy.cbor-item>` は RFC 8949 のデータを 1 つ読み, 次の位置を返す。

- `definy.cbor`: `integer` (メジャータイプ 0 と 1), `bytes`, `text`, `array`, `map` (キーと値の一覧), `tagged`, `simple` (20 false, 21 true, 22 null),
  `float` (追加情報 25 / 26 / 27 とビット列のまま)
- 長さが不定のもの (追加情報 31) と途切れたものは `none`
- 配列とマップは要素を半分ずつ読んで結合する (`definy.cbor-read-items`)。128 KB の seed のイベントを 0.12 秒ほどで読む
- `definy.cbor-to-value`: `core.value` にする。`#` で始まるキーが 1 つだけのマップはタグ付きの値 (null はペイロード無し), それ以外のマップはレコード。
  バイト列, タグ, 浮動小数は `unit` (TypeScript の `toCoreValue` と同じ)。中身の型は `core.value-to-event-content` で読む ([value-decoder.md](value-decoder.md))

## SignedEvent (`definy.decode-signed-event`)

`{signature: 64 バイト, event_binary: tag24(内側のイベント)}`, 内側は `{account_id: 32 バイト, time: tag1(エポック秒), content: core.event-content}`。
理由のメッセージは TypeScript の `InvalidSignedEventError` と同じ (`malformed CBOR` は詳細を付けない)。

- seed のイベントにはバイト列を 0〜255 の整数の配列で書いたものがある (`definy.cbor-bytes` はどちらも読む. TypeScript の `toUint8Array` と同じ)
- `time` は整数か倍精度浮動小数の秒 (seed のイベントは `1548909361.005` など)。浮動小数はビット列から `core.float-*` で秒を作り,
  `Math.round(秒 * 1000)` と同じミリ秒にする (`definy.float64-seconds-to-ms`)
- `definy.verify-signed-event` は読んだ後, ホストの能力で Ed25519 の署名 (`verify_ed25519`) と時刻 (`read_time`. 10 分より先なら拒否) を確かめ,
  イベントハッシュを `hash_contents` で求める。参照する content hash (`definy.commit-content-hashes`) は重複を除かないので, ホストの
  `definy.store-read-missing-content-hashes` が除く
- 規則 (`core.check-event`) には中身をそのまま渡す (以前の `contentForCheck` のように説明を除かない。Wasm の中で渡すだけなので軽い)
- 余分なレコードのキーは無視する (`core.value-conforms` は見ていた)

## ストアのコミット (`definy.decode-stored-commit`, 2026-11-01)

ストアのプロジェクトのコミットも definy が読む (`npm run build:seeds` が `wasm/commit_decoder.wasm` にコンパイルし, `worker/commit_store.ts` が使う)。

- 署名は確かめない。ストアに入るのは definy が確かめたイベント (`definy.store-write-event`) と seed だけなので, 以前の TypeScript のように読むたびに確かめるのはやめた
- モジュールとパーツの ID も `core.module-part-ids` で付ける (`definy.stored-commit`)。読んだ結果はホストがイベントハッシュごとに isolate の中で使い回す
  (Wasm の値は呼び出しごとに作り直すので, 使い回すのは JavaScript に読み出した値)
- `SubmitEvent` の型検査の入力 (`definy.read-commit-check-input`) も, 受け取ったイベントを同じ関数で読む
- `definy.store-write-event` は definy が読んだメタデータ (イベントハッシュ, アカウント, 種類, 時刻) も渡すので, ストアは保存のときに署名を確かめ直さない

## TypeScript の CBOR エンコーダーの修正

`encodeCborItem` は 2^32 以上の整数を 4 バイトに切り詰めていた。seed のパーツの式の数のリテラル (`4503599627370495` など) が
seed バンドルで壊れるので, 8 バイトの引数 (追加情報 27) で書くようにした。
