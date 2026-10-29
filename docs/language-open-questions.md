# 言語仕様の足りないもの・矛盾・未決の点

definy の構文と意味 (`core.expression` / `core.type-ast` の宣言, 型チェッカー, `core.eval-value`, stage1) と docs を読んで,
足りない構文, 仕様の食い違い, まだ決めていない点を並べたもの (2026-10-28)。決めたり直したりしたら, この一覧から消して該当する docs に書く。

## 決めた方針 (2026-10-28)

- 型引数と普通の引数を区別しない (Zig・Idris2 と同じ)。型もインラインだけでなくパーツとして定義して使える
- Elm と同じく実行時エラーは無い。0 で割ると 0
- 浮動小数点数のリテラルと演算 (組み込みのパーツ) を足す
- `match` のアームのパターンは, 文字列のタグではなく他の式と同じく木で表す。`_` (何にでも一致) と文字列 `"_"` を区別する。
  definy に予約語という概念は無い
- 呼び出しの引数はデータの上で宣言と同じ順番でなくてよい。表示は常に定義元の順番
- パーツの定義もパーツ (値) で, 型の定義に便利な定義のパーツもある

## 対応状況 (2026-10-29)

下の項目のうち次のものは PR にした (上の PR を下の PR の上に積んでいる)。マージしたらこの文書から消して, 各 docs に移す。

| PR   | 内容                                                                                                 | docs                           |
| :--- | :--------------------------------------------------------------------------------------------------- | :----------------------------- |
| #789 | 0 除算は 0, `-2^63 / -1` は折り返す, `equal` を中身で比べる, 型パーツの参照だけの循環を型エラーに    | builtin-parts.md, part-type.md |
| #790 | `core.list-get` は範囲外で `none` を返す (option)                                                    | builtin-parts.md               |
| #791 | `match` のパターンを木 (`core.pattern`) にする。`_` (`any`) と文字列 `"_"` を区別する                | match-pattern.md               |
| #792 | 呼び出しの引数は名前で対応させ, 順番は自由。実行時は引数名の順に渡す                                 | call-syntax.md                 |
| #793 | 浮動小数のリテラルと組み込みのパーツ (`core.float-plus` など)。0 除算は IEEE 754 のまま (決定待ち)   | float.md                       |
| #794 | 型引数は普通の引数 (`core.list-map(T: number, ...)`), 型を返すパーツ `core.option`, 型は実行時にも値 | type-arguments.md              |

残り: パーツの定義もパーツにする (名前を定義の式の外に置くか決定待ち), 値のパーツの自己参照 `P = P` を型エラーにする,
ビット演算の組み込み, 型引数の推論, 組み込みのパーツの型引数化。

## 実行時にエラーになる場所 (2026-10-28 に確かめた)

stage1 の出力で実際に動かして, または型チェッカーに通して確かめたもの。

| 場所                                                | 今の動き                                                                    | 確かめ方                             |
| :-------------------------------------------------- | :-------------------------------------------------------------------------- | :----------------------------------- |
| `core.divide(left: 1, right: 0)`                    | `RuntimeError: divide by zero`                                              | stage1 で実行                        |
| `core.remainder(left: 1, right: 0)`                 | `RuntimeError: remainder by zero`                                           | stage1 で実行                        |
| `core.divide(left: -2^63, right: -1)`               | Wasm の `i64.div_s` は溢れると trap する (仕様)                             | Wasm の仕様                          |
| `core.list-get(list: [1], index: 5)`                | `RuntimeError: unreachable` (範囲外と負の添字)                              | stage1 で実行                        |
| 自分自身を参照する値のパーツ `P = P`                | 型検査を通る (`ok`)。stage1 はインライン化中の再参照を `unreachable` にする | 型チェッカーに通した                 |
| 型パーツの循環 `A = B`, `B = A`                     | 型チェッカー自身が約 9 秒走って `unreachable` で落ちる                      | 型チェッカーに通した                 |
| 渡されなかったパーツ (式の無いパーツ・消えたパーツ) | `unreachable`。呼び出し側は `unresolved` を見て実行前に止めている           | docs と実装                          |
| `bit_and` などのビット演算の組み込み                | `unreachable` (評価器では `unit`)                                           | [builtin-parts.md](builtin-parts.md) |
| メモリの確保に失敗 (`memory.grow` が -1)            | `unreachable`                                                               | `scripts/wasm_runtime_functions.py`  |
| 末尾位置でない深い再帰, 終わらない再帰              | スタックオーバーフロー, 止まらない (Elm も同じ。資源の上限として別に扱う)   |                                      |

型検査を通った式では起きないもの: `record_get` の無いフィールド (`unreachable`), どのアームにも一致しない `match` (`unreachable`),
型の合わない演算 (評価器は `unit`)。型検査を通さずに実行する経路 (実行パネル, 評価器のデモ) では起きる。

エラーではないが結果が間違っているもの:

- **stage1 の `core.equal` がリスト・レコード・バリアントを中身で比べない**。ランタイム関数 `values_equal` が文字列以外は `+8` の 8 バイトを比べるだけなので,
  `equal([1], [1])` と `equal({a: 1}, {a: 1})` は `false`, ペイロードの無いバリアント `a` と `b` は `true` になる。
  評価器 (`core.eval-value`) は `core.value-equals` で中身を比べるので `true` / `false` になり, 2 つの実装の結果が違う
- 2^53 を超える整数は, 値を JSON / CBOR から TypeScript の `number` で読むので変わる ([src/definy_value.ts](../src/definy_value.ts))
- 文字列を UTF-8 の文字の途中で切った結果は未定義 ([eval-conformance.md](eval-conformance.md))

直し方の案:

- `core.divide` / `core.remainder` は右辺が 0 なら 0, `-2^63 / -1` は `-2^63` (折り返し) にする。命令列の前に右辺を調べる
- `core.list-get` は範囲外で何を返すかを決める (下の「決めてほしいこと」)
- 値のパーツの参照の循環 (関数を通らない参照だけで自分に戻る) と, 型パーツの参照だけの循環は型エラーにする
- `values_equal` をリスト・レコード・バリアントを辿って比べるものにする
- ビット演算の組み込みを definy 製のコンパイラ・型チェッカー・評価器に足す

## 型パーツの再帰 (循環) について

### 今どうなっているか

- パーツ ID は「モジュール ID + パーツ名」から導出する ([content-addressed.md](content-addressed.md)) ので, 中身のハッシュではない。
  そのため型パーツが自分や互いを参照しても ID は決まり, `core.expression` (`call` の中に `core.expression` がある) のような再帰型が書ける
- 型の比べ方は名前的 (iso-recursive): 両方が型パーツの参照ならパーツ ID が同じときだけ等しい。
  片方だけが参照のときは参照を 1 段だけ中身に展開して比べる ([part-type.md](part-type.md))。
  展開は必要になったときだけなので, 再帰型でも普通は止まる

### 何が決まっていないか

1. **中身の無い循環** (`A = B`, `B = A`, `A = A`): 展開しても型の構築子 (レコード・union・リストなど) に行き着かない。
   今は型チェッカーが展開を繰り返して落ちる。参照だけで循環する型パーツは宣言の時点で `invalid_type_declaration` にすべき
2. **値の無い型** (`R = { next: R }`): 有限の値を作れない。型としては正しいので今は通る。拒否するか, 書けるが値が作れないだけとするか
3. **相互再帰の型パーツの変更**: `A` と `B` が互いを参照していて, 片方だけを別のコミットで変えたとき, もう片方を検査し直すか
   (今は型が変わればモジュールの全パーツを検査するので, モジュールをまたぐ相互参照だけが問題になる)
4. **型引数を入れた後の再帰**: `list(T) = union { nil, cons { head: T, tail: list(T) } }` のように型を返す関数が自分を呼ぶとき,
   型の比べ方で `list(T)` をどこまで評価するか。`list(T)` と `list(T)` は「同じパーツを同じ引数で呼んだ」から等しいとし,
   中身への展開は片方だけが呼び出しのときに 1 段だけにすれば, 今の名前的な比べ方をそのまま広げられる。
   型の位置で任意の関数を評価すると止まらないことがある (Idris2 は全域性の検査で防ぐ) ので, 評価の手数に上限を付けて超えたら型エラーにする案

## 設計案

### 型は値, 型引数は普通の引数

- 今の `{"#type": null}` (型パーツの型) を普通の型 `type` にする。`type` 型の引数を宣言でき, 後ろの引数の型と戻り値の型からその引数を参照できる (依存関数型)

  ```text
  core.list-map: (T: type, U: type, f: (item: T) -> U, xs: list(T)) -> list(U)
  core.list-map(T: number, U: string, f: (item) => core.number-to-string(value: item), xs: [1, 2])
  ```

- 型パーツは `type` 型の値のパーツ, 型引数を取る型は `type` を返す関数のパーツ: `option: (T: type) -> type = (T) => union { none, some(T) }`。
  インラインの `union { none, some(...) }` を `option(T: ...)` に置き換えられる
- 型の式と値の式を 1 つの `core.expression` にまとめる (今の `type_*` のタグと `core.type-ast` を 1 つにする)。型の位置の式は
  型チェッカーが評価してから比べる
- 型も実行時の値にする (消去しない)。`core.value` に型の値を足す。消去は後で最適化として入れられる
- 最初は型引数を推論しない (Zig と同じく必ず書く)。UI は期待する型から型引数を埋められる

### match のパターンを木にする

```text
core.match-arm = { pattern: core.pattern, body: core.expression }
core.pattern = any                                    // 何にでも一致 (今の `_`)
             | bind { variable_id, variable_name }    // 何にでも一致して束縛する
             | variant { tag, payload: option(core.pattern) }
             | string(string) | number(number) | boolean(boolean)
             | record(list({ key, pattern }))
```

- `_` は `any`, 文字列 `"_"` は `string("_")` なので区別できる。束縛しないアームの番兵 (`variable_id: -1`) も要らなくなる
- 入れ子のパターン (`some(variant(...))`), レコードの分解もこの形で書ける

### 呼び出しの引数の順番

- 型検査は引数を名前で宣言と照らし合わせる (足りない・余る・重複を型エラーにする)
- 実行時の渡し方は「引数名の辞書順」に決める。呼び出し側も関数の本体 (引数を読む側) もコンパイル時に名前で並べ替えるので,
  関数型の変数を呼ぶとき (呼び出し先の宣言が分からない) も型の情報なしで合う
- 表示は定義元の宣言の順に並べ替える

### パーツの定義もパーツ

```text
core.part-definition = { name: string, description: string, type: type, expression: <type の値> }
core.define-part: (name, description, type, expression) -> core.part-definition
core.define-type: (name, description, expression: type) -> core.part-definition
  = core.define-part(name, description, type: type, expression)
```

- モジュールのコミットのパーツは `core.part-definition` を返す式にする。サーバーと UI はその式を評価して名前・型・式を得る
- `core.define-type` のような定義の補助をユーザーも書ける
- 決めること: パーツ ID は定義を評価した結果の `name` から導出するか (評価しないと ID が分からない), 外側に名前を持つか

### 浮動小数点数

- 型 `float64`, 式 `float`, 値の JSON / CBOR の形 (整数の `1` と区別するため, タグ付きにするか CBOR の float だけにするか)
- 組み込みのパーツ `core.float-plus` などと, `core.number-to-float`, `core.float-floor` などの変換 (NaN は 0 にする)
- 演算子という概念は無い ([builtin-parts.md](builtin-parts.md)) ので, 演算は組み込みのパーツとして足す
- 決めること: 浮動小数の 0 除算を IEEE 754 のとおり無限大 / NaN にするか 0 にするか

## そのほかの食い違い

- 型の比べ方が構造的と名前的の混在: 中身の同じ型パーツ A と B は互いに代入できないのに, 名前の無い同じ形の値はどちらにも代入できる。
  `core.type-equals` はレコードのフィールドの順番まで比べるが, 代入可能性はレコードの幅サブタイピングを許す
- パーツの参照の名前がばらばら: 式では `part_reference.part_definition_event_hash`, 型では `reference.part_hash`。どちらも中身はパーツ ID なので `part_id` にそろえる
- 関数を返す呼び出しは値にできるが, その結果を呼ぶ構文が無い ([call-syntax.md](call-syntax.md))
- `core.value` に `unit` があるが, 型に unit が無い
- `let` で再帰する関数を書けない。バイト列の型が無い (`core.string-to-bytes` は数値のリスト)。文字 (コードポイント) 単位の文字列の操作が無い
- 空のリスト・型パーツの無い `variant`・ラムダ式は, 期待する型が無いと型が決まらない
