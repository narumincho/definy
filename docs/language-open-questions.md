# 言語仕様の足りないもの・矛盾・未決の点 (2026-10-28 時点)

definy の構文と意味 (`core.expression` / `core.type-ast` の宣言, 型チェッカー, `core.eval-value`, stage1) と docs を読んで,
足りない構文, 仕様の食い違い, まだ決めていない点を優先度順に並べたもの。決めたり直したりしたら, この一覧から消して該当する docs に書く。

## 高: 自己記述を書き進めると実際に詰まるもの

### 1. 型引数 (ジェネリクス) が無い

- `core.list-map` と `core.list-fold` の型は `number` 専用 (`f: (item: number) -> number`, `xs: list<number>`)。
  文字列や式のリストには使えず, core の中では用途ごとに `-inner` / `-range` の補助パーツを書き分けている
- `option` を型パーツにできないので, `none | some(T)` の union が `core.expression` などの宣言にその場で何度も書かれている (`result` も同じ)
- `core.equal` `core.list-get` `core.list-append` などの組み込みは型を持たず, 型チェッカーが名前で特別扱いしている ([builtin-parts.md](builtin-parts.md))

決めること: 型パーツに型引数を持たせるか (`option<T>`), 関数の型に型変数を持たせるか, その両方か。
型の推論をどこまでするか (今の推論は空リストですら期待する型が要る)。

### 2. 実行時のエラーの意味が決まっていない

- `core.eval-value` は型の合わない値の演算・見つからないパーツ・未対応の式を `unit` にする ([eval-conformance.md](eval-conformance.md))
- stage1 の出力は同じ場面で `unreachable` (trap) になる。0 での割り算は `i64.div_s` の trap
- そのため 2 つの実装の結果は, 型の通った式の範囲でしか一致しない。適合テストもその範囲だけを見ている

決めること: 実行時のエラー (0 除算, 範囲外の `core.list-get`, 一致しない `match`) を trap にするか, 値 (`result`) にするか,
評価器もそれに合わせるか。

### 3. 型パーツの再帰 (循環) の規則が未決

[self-hosting.md](self-hosting.md) に「型定義パーツ自体の再帰参照 (循環) の規則は未決定」とあるが,
`core.expression` `core.type-ast` `core.value` 自身がすでに自分を参照する再帰型で, 実際には動いている。
相互再帰 (A が B を, B が A を参照) や, 型パーツの参照だけで出来た無限の展開 (`A = A`) をどう扱うかを書いていない。

### 4. 数値は 64 ビット整数だけで, 範囲と端の意味が書かれていない

- 浮動小数点数が無い (`number` は `i64`)
- 値の JSON / CBOR を TypeScript の `number` で読むので ([src/definy_value.ts](../src/definy_value.ts)), 2^53 を超える整数はブラウザ・サーバーで値が変わる
- オーバーフロー (Wasm では折り返す), 負の数の `core.remainder`, 0 除算の結果を docs に書いていない

## 中: 仕様の食い違い・地雷

### 5. タグ `_` が予約されていない

`match` の default は「タグが `_` のアーム」だが, union の宣言は `_` というタグを拒否しない
(`core.type-check-type-union-variants` は重複だけを見る)。文字列の `match` でも, 文字列 `"_"` に一致するアームと
default を区別できない ([conditional.md](conditional.md))。default をタグの文字列ではなく別の欄 (`default: option<式>`) にするか, `_` を予約するか。

### 6. 束縛しないアームが番兵の値

ペイロードを束縛しないアームは `variable_id: -1`, `variable_name: ""` にする決まり ([conditional.md](conditional.md))。
`option<{variable_id, variable_name}>` にすれば番兵が要らない。
変数 ID が一意である範囲 (パーツの中か, 式の中か) も書いていない。seed では `900` のような手で選んだ ID が混じる。

### 7. 名前付き引数なのに順番も必須

呼び出しの引数は `{name, value}` だが, 型検査は宣言と同じ順番を要求し, stage1 は書いた順に渡す ([part-type.md](part-type.md))。
名前を見て並べ直すのか, 名前は表示のためだけで位置で渡すのかを決めると, 引数の省略・既定値・並べ替えの扱いも決まる。
足りない引数は `core.call-argument` が `hole` を返すので, 型検査を通らない式では黙って未入力になる。

### 8. 関数を返す呼び出しの扱いが半端

「関数は呼ぶだけ」([call-syntax.md](call-syntax.md)) だが, 関数を返す呼び出しは値にしてよい。
その値を呼ぶ構文は無いので, レコードのフィールドに入れて `record_get` で呼ぶ (`core.type-checker` の `check`) しかない。
関数を返すことを禁止するか, 呼び出しの結果の呼び出しを `core.callee` に入れるかを決める。

### 9. 型の比べ方が構造的と名前的の混在

- `core.type-equals` はレコードと union をフィールドの順番まで比べるが, 代入可能性はレコードの幅サブタイピングを許す
- 型パーツの参照は, 片方だけが参照なら中身に展開して比べ, 両方参照ならハッシュが同じときだけ代入できる ([part-type.md](part-type.md))。
  中身の同じ型パーツ A と B は互いに代入できないのに, 名前の無い同じ形の値はどちらにも代入できる

どちらに寄せるか (型パーツは名前的にして, 型パーツ付きの `variant` / レコードでしか作れないようにするなど) を決める。

### 10. パーツの参照の名前がばらばら

同じパーツ ID が, 式では `part_reference.part_definition_event_hash`, 型では `reference.part_hash`,
docs では「パーツ ID」と呼ばれている。今は ID がイベントハッシュではないなら, 名前を `part_id` にそろえる。

### 11. 値の式と型の式が同じ `core.expression` に入っている

- 型の式 (`type_number` ... `type_union`, `type_secret`) が値の式と同じ union にあり, 値の位置に型を書けてしまう (型検査で弾く)
- `type_code` と `type_type` はエディタの中だけの形で `core.expression` には無い。`type_secret` はある
- `core.value` には `unit` があるが, 型 (`core.type-ast`) に unit は無い (空のレコードで代用するのか決まっていない)

## 低: 足りない構文

- `match` のパターンが 1 段のタグだけ: 入れ子のパターン, レコードの分解, 複数のタグを 1 つのアームにまとめる, 数値の `match` が無い
- `let` で再帰する関数を書けない: 再帰は必ずパーツにする必要があり, `-inner` の補助パーツが増える
- ビット演算 (`bit_and` など) を definy 製のコンパイラ・型チェッカー・評価器が扱わない ([builtin-parts.md](builtin-parts.md))。Wasm を書く `wasm` モジュールで要る
- バイト列の型が無い: `core.string-to-bytes` は数値のリストを返す
- 文字列は UTF-8 のバイト単位で, 文字の途中で切った結果は未定義 ([eval-conformance.md](eval-conformance.md))。文字 (コードポイント) 単位の操作が無い
- 空のリスト・型パーツの無い `variant`・ラムダ式は, 期待する型が無いと型が決まらない
