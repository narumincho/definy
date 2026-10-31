# Wasm GC による値の表現 (2026-10-31)

definy のコンパイラ (`core.compile-to-wasm`) が出す Wasm は, すべての値を Wasm GC の struct / array で表す。
値は GC のヒープに置き, 使わなくなった値は Wasm のランタイム (V8 など) の GC が回収する。

以前は値を線形メモリの「タグ付きの箱」に置き, 確保はヒープの先頭をずらすだけで解放しなかった。線形メモリは仕様上縮められない
(`memory.grow` で伸ばすだけ) ので, 型チェッカーを 1 つのインスタンスで使い続けると 1 パーツ約 1.5MB ずつ増え,
seed の全パーツで 640MB になっていた (Workers の上限は 128MB)。これを避けるために 32 パーツごとにインスタンスを作り直すなどしていたが,
GC にしたので要らなくなった。

## 型

型セクションの中身はパーツ `core.wasm-runtime-types`。型の番号は `core.wasm-type-*` のパーツで名前を付けている。

| 番号 | パーツ                            | 型                                                               | 値                                             |
| ---- | --------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| 0    | `core.wasm-type-value`            | `(sub (struct (field i32)))`                                     | すべての値の元 (フィールド 0 は値の種類のタグ) |
| 1    | `core.wasm-type-bytes`            | `(array (mut i8))`                                               | 文字列のバイト列                               |
| 2    | `core.wasm-type-values`           | `(array (mut (ref null 0)))`                                     | 値の配列                                       |
| 3    | `core.wasm-type-number`           | `(sub final 0 (struct i32 i64))`                                 | 数値 (タグ 0)                                  |
| 4    | `core.wasm-type-boolean`          | `(sub final 0 (struct i32 i32))`                                 | 真偽値 (タグ 1)                                |
| 5    | `core.wasm-type-string`           | `(sub final 0 (struct i32 (ref null 1)))`                        | 文字列 (タグ 2)                                |
| 6    | `core.wasm-type-list`             | `(sub final 0 (struct i32 (ref null 2)))`                        | リスト (タグ 3) とレコード (タグ 4)            |
| 7    | `core.wasm-type-closure`          | `(sub final 0 (struct i32 i32 (ref null 2)))`                    | 関数 (タグ 5): 関数表の番号と捕捉した変数      |
| 8    | `core.wasm-type-variant`          | `(sub final 0 (struct i32 (ref null 5) (ref null 0)))`           | バリアント (タグ 6): タグの文字列とペイロード  |
| 9    | `core.wasm-type-float`            | `(sub final 0 (struct i32 f64))`                                 | 浮動小数 (タグ 7)                              |
| 10   | `core.wasm-type-closure-function` | `(func (param (ref null 2) (ref null 2)) (result (ref null 0)))` | コンパイルした関数 (捕捉した変数, 引数)        |
| 11〜 |                                   | ランタイム関数の型                                               |                                                |

- 値はどれも `(ref null 0)` で扱い, 中身を読むときに `ref.cast` する。タグ (フィールド 0) を残したので,
  `match` や `values_equal` は以前と同じくタグで分岐する
- レコードはリストと同じ struct で, 配列にキーと値を交互に並べる (タグ 4)
- ペイロードの無いバリアントのペイロードは `null`。捕捉した変数の無い関数, 引数の無い呼び出しの配列も `null`
- リストとレコードの struct は構造が同じなので Wasm からは同じ型 (区別はタグでする)
- Wasm GC の型は「同じ構造なら同じ型」(iso-recursive な正規化) なので, あるモジュールで作った値を, 同じコンパイラが出した別のモジュールにもそのまま渡せる

## 命令

- リテラルのリスト・レコードは, 要素を順に積んで `array.new_fixed` してから `struct.new` する (一時的なローカル変数を使わない)。
  `array.new_fixed` の要素数には実装の上限 (V8 は 10000) があるので, それより長いリストのリテラルは書けない
- 呼び出し (`core.compile-call`): 関数の値をローカル変数に置き, 捕捉した変数・引数の配列・関数表の番号を積んで
  `call_indirect` (末尾位置では `return_call_indirect`) で型 10 を呼ぶ。引数は関数が受け取る順 (名前の順) に積む必要があるので,
  `core.compile-call-arguments-ranked` が順位 (`core.call-argument-rank`) の順にコンパイルする。
  引数の中の関数の番号は書いた順で数える (`core.call-argument-fn-base`) ので, 以前と同じ番号になる
- 関数の本体は, 引数の配列 (ローカル変数 1) と捕捉した変数の配列 (ローカル変数 0) から `array.get` でローカル変数に写してから始まる。
  ローカル変数 2 から先はすべて `(ref null 0)`
- 数値・真偽値・浮動小数を取り出すのはランタイム関数 15〜17 (`number_value` など) の呼び出し。V8 はこの程度の関数をインライン化する
- 真偽値は 2 つのグローバル変数 (0 が true, 1 が false) を使い回す (`box_bool`)

### 文字列リテラル

プログラムに出てくる文字列 (`core.compile-collect-strings` が集める) は, 1 つずつグローバル変数 (2 番から, `(mut (ref null 5))`) にする。

- バイト列はパッシブなデータセグメント 0 に並べ (`core.compile-string-data`), start 関数 (`core.compile-string-init`) が
  `array.new_data` で文字列を作ってグローバル変数に入れる。リテラルは `global.get` で積むだけ
  (定数式の `array.new_fixed` でグローバル変数を初期化すると, 長い文字列が `array.new_fixed` の上限を超えるため)
- 表の先頭は `"true"` `"false"` `"none"` `"some"` (グローバル変数 2〜5)。`list_get` はグローバル変数 4・5 をタグに使う
- 表に無い文字列 (quote したコードの組み立てなど) は, バイトを積んで `array.new_fixed` する
- 関数の番号: 0 が `evaluate`, 1〜31 がランタイム関数, 32 が start 関数, 33 から式の中の関数 (関数表の 0 番から)

## ランタイム関数とホストとのやりとり

ランタイム関数は `core.wasm-runtime-*` のパーツ (ローカル変数の宣言と命令列の `list<number>`) で, `core.wasm-runtime-functions` が並べる。
関数の型の番号は `core.wasm-runtime-function-types`, エクスポートは `core.wasm-runtime-exports`。

JavaScript からは GC の値の中を覗けない (参照として持つことはできる) ので, ホストはエクスポートしたランタイム関数で値を作って読む
(`src/stage1_compiler.ts` の `writeLiteral` / `readDefinyValue`, デプロイ先の `worker.js` = `definy.cloudflare-workers-runtime-script`)。

| エクスポート                                                               | 役目                                                                           |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `evaluate` (`main`)                                                        | 式の値を返す                                                                   |
| `table`                                                                    | 関数表。`table.get(closure_index(f))(values_of(f), 引数の配列)` で呼ぶ         |
| `memory`                                                                   | 文字列を渡すための置き場 (1 ページから)。値は置かない                          |
| `string_from_memory(n)` / `string_to_memory(s)`                            | `memory` の 0 番地からの n バイトを文字列にする / 文字列を書いてバイト数を返す |
| `box_number(i64)` / `box_bool(i32)` / `float_new(f64)`                     | 数値・真偽値・浮動小数を作る                                                   |
| `value_tag` / `number_value` / `bool_value` / `float_value`                | タグと中身を読む                                                               |
| `values_new` / `values_set` / `values_of` / `values_length` / `values_get` | 値の配列を作る / リスト・レコード・関数の配列を読む                            |
| `list_new` / `record_new` / `variant_new` / `closure_new`                  | 値を作る                                                                       |
| `variant_tag` / `variant_payload` / `closure_index`                        | バリアント・関数を読む                                                         |
| `length`                                                                   | 文字列のバイト数かリストの要素の数                                             |

- i64 は JavaScript では `BigInt` になる
- ホストが書いたオブジェクトの値は `WeakMap` に参照を覚えておき, 次に同じオブジェクトを渡すときは作り直さない
  (型環境や型の宣言の一覧のように何度も渡す値のため)。上のとおり, 別のモジュールのインスタンスにもそのまま渡せる
- 1 つのインスタンスを何度呼んでもメモリは増え続けない。型チェッカーのセッション (`createModuleCommitSessionFromValues`) は
  trap したときだけインスタンスを作り直す

## 測ったこと (2026-10-31, Node.js 26)

- seed の全パーツ (608 個) を型チェッカーの 1 つのインスタンスで検査: 0.43 秒, JS ヒープは 16MB → 44MB (GC 後 23MB)。
  以前は線形メモリが 640MB まで増えるので 32 個ごとに作り直していた
- core 全体 (と wasm) のシステムアカウントのコミットの `SubmitEvent` (`worker/type_check.test.ts` の組み込みのテスト):
  2.1 秒, プロセスの RSS は 223MB → 247MB。GC にする前は 4.5 秒で RSS が 207MB → 912MB (GC 後 356MB) だった
- stage1.wasm は 115KB → 67KB, 自分自身のコンパイルは約 0.2 秒

## 移行のしかた (ブートストラップ)

コンパイラの出力の形が変わり, ホスト (`src/stage1_compiler.ts`) も新しい形しか読めなくなるので, `npm run build:stage1 -- --bootstrap` は使えない。
次の順で作った:

1. 古い stage1.wasm と古いホストで, 新しい seeds の `core.compile-to-wasm` をコンパイルする (線形メモリのモジュールだが, GC のモジュールを出す)
2. それを古いホストで動かして, もう 1 度 `core.compile-to-wasm` をコンパイルする (GC のモジュール)
3. 新しいホストでそれを動かしてコンパイルし, 2 と一致すれば (不動点) stage1.wasm にする

古いホストは変更前の `src/stage1_compiler.ts` を別名で置いて import すればよい。
1 回目で `WebAssembly.validate` が通るか, 3 で一致するかを見れば, 型の合わない命令列はすぐ分かる。
