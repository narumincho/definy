# definy が出す Wasm の速さとボトルネック (2026-11-20 の調査)

「definy のコンパイラ (`core.compile-to-wasm`) が出す Wasm は遅いのか」を測った結果。
値の表現と命令の出し方は [wasm-gc.md](wasm-gc.md)。

## 結論

- **実際のプログラム (コンパイラ・型チェッカー) では, 同じアルゴリズムを素直な JavaScript に書いた版と同じくらいの速さ**。
  Wasm のコード生成が遅さの主因ではない
- 遅さの主因は definy で書いたプログラムの**アルゴリズム**, 特にキーで引く処理が全部リストの線形探索であること。
  seed の全パーツの型検査では時間の約 75% (Wasm) が `core.part-type-lookup` の線形探索で,
  ここを Map で引くようにすると JS 版で **620ms → 37ms (約 17 倍)** になった
- コード生成にも無駄はあり (数値リテラルの箱詰め直後の取り出し, 既知の関数の呼び出しもクロージャを作って `call_indirect` など),
  数値計算だけの小さなプログラム (fib) では JS の約 8 倍, 手書きの Wasm の約 18 倍遅い。
  ただし実際のプログラムでは, コード生成を JS の JIT 並みにしても伸びしろは 1〜1.5 倍程度

## 測り方

Node.js 26.13.1, 4 コアの Xeon 2.1GHz (クラウドの環境)。同じ入力で何度か回し, 温まった後の中央値。
スクリプトはプロジェクトのファイル `wasm-bench/` (リポジトリには入れていない)。

- **関数名付きのプロファイル**: stage1 の出力には name セクションが無く, プロファイルが `wasm-function[N]` になる。
  関数の番号は決まった規則で振られる (0 が `evaluate`, 1〜31 がランタイム関数, 32 が start 関数, 33 から式とパーツの中の関数を
  前順で. [self-hosting.md](self-hosting.md)「関数・呼び出し・パーツ参照」) ので, 渡したパーツの一覧から
  「パーツ名/fnN」の名前を付けた name セクションを後ろに足して `node --cpu-prof` で測った
- **JS との比較**: 式 (`core.expression`) と参照するパーツを, 同じアルゴリズムのまま JavaScript のソースに書き換える小さな変換器を作った
  (値はそのまま JS の値, レコードは普通のオブジェクト, バリアントはクラス, 関数は JS の関数で引数は名前のバイト順)。
  書き換えた `core.compile-to-wasm` で自分自身をコンパイルした結果が `wasm/stage1.wasm` とバイト単位で一致し,
  型チェッカーも全パーツで同じ結果になることを確かめた。V8 の JIT が同じプログラムをどこまで速くできるかの目安になる
- **手書きの Wasm**: fib だけ i64 の手書きのモジュールと比べた

## 結果

### 実際のプログラム

| 処理                                                       | definy → Wasm | wasm-opt -O3 後 | 同じアルゴリズムの JS | JS で探索を Map に |
| ---------------------------------------------------------- | ------------- | --------------- | --------------------- | ------------------ |
| stage1 で `core.compile-to-wasm` をコンパイル (278 パーツ) | 93ms          | 83ms            | 60ms                  | 41ms               |
| seed の全パーツ (1,205 個) の型検査 (型環境 1,253 パーツ)  | 618ms         | 631ms           | 619ms                 | 37ms               |

- 型チェッカーの準備 (型環境を作る) は 8ms ほどで, ほぼ全部が検査
- ホストの値の書き込み (`writeArgument`) は 1 回目だけ 90ms 前後, 2 回目からはキャッシュが効いて 10ms 以下

### プロファイル (Wasm, 自分の時間)

**型検査** (検査の時間を 100% として):

- `core.part-type-lookup-inner` とその中の `values_equal` / `string_eq`: 約 75%。
  式の中のパーツ参照ごとに, 型環境のリスト (1,253 個) を後ろから 1 つずつ `list-get` → `record_get` → `core.equal` で比べている
- GC は 5% ほど

**コンパイラ** (`core.compile-to-wasm` の時間を 100% として, 重なりあり):

| 関数                                                             | 割合 | 中身                                                                                        |
| ---------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------- |
| `core.compile-find-part`                                         | 24%  | パーツ参照ごとに `parts` (278 個) を先頭から線形探索。`max-local` と本体のコンパイルで 2 度 |
| `core.count-functions` (と `-in-range`, `-in-parts-range`)       | 21%  | 関数の番号を決めるため, 子をコンパイルするたびに兄弟の部分木の関数を数え直す (深さぶん重複) |
| `core.compile-call-arguments-ranked` / `core.call-argument-rank` | 26%  | 呼び出しの引数を名前の順に並べる                                                            |
| GC                                                               | 14%  |                                                                                             |
| `rt:list-concat`                                                 | 11%  | 命令のバイト列をリストの連結で作る (連結のたびに全体をコピー)                               |

### 小さなプログラム (コード生成そのもののオーバーヘッド)

| プログラム                        | definy → Wasm | definy → JS | 手書き                      |
| --------------------------------- | ------------- | ----------- | --------------------------- |
| fib(27) (再帰と整数演算)          | 14.8ms        | 1.9ms       | JS 1.9ms / Wasm (i64) 0.8ms |
| 1〜100 万の和 (末尾再帰)          | 12.5ms        | 44ms        | JS のループ 1.9ms           |
| 不変リストに 2 万回 `list-append` | 388ms         | 2,800ms     | JS の `push` 0.2ms          |

- 末尾呼び出しは Wasm の `return_call_indirect` になるので, JS (末尾呼び出しの最適化が無い) より速い
- `list-append` / `list-concat` は毎回配列を作り直すので, 1 つずつ積むと要素数の 2 乗の時間になる

## コード生成の無駄 (fib の出力を読んだもの)

`binaryen` の `wasm-dis --all-features` で読める。fib の本体は次のようになっていた:

- 数値リテラル `2` を `box_number(2)` で箱に入れた直後に `number_value` で取り出している。比較の結果も `box_bool` してすぐ `bool_value`
- 数値の演算のたびに結果を struct (`box_number`) にしてヒープに確保する
- 関数のパーツの呼び出し (自分自身の再帰も) のたびに, 空のクロージャを `struct.new` し, `values_of` と `closure_index` で読み直して
  `call_indirect` している。引数も毎回 `array.new_fixed` で配列にして, 呼ばれた側が `array.get` でローカル変数に写す
- `list-get` は毎回 `some` / `none` のバリアントを確保して返す

wasm-opt -O3 をかけても, コンパイラで 1 割, 型チェッカーでは差が無く, fib で 15.7ms → 8.4ms ほど。
binaryen は箱詰めや `call_indirect` を外せない (関数表の番号はクロージャの値から読むため)。
なお binaryen 132 の出力を Node 26 で読むには `--disable-custom-descriptors` が要る。

## 改善案 (効果の大きい順)

1. **キーで引く処理を線形探索でなくす** (型検査で最大 17 倍, コンパイラで 1.5 倍)。
   [pipeline-indexing.md](pipeline-indexing.md) の 3a で, definy で書いたマージソートと二分探索に置き換えたときは
   並べ替えのコストが上回って速くならなかった。そこで definy で並べ替えるのではなく, 次のどちらかがよい:
   - **文字列をキーにした辞書の組み込み** (`core.dict-from-list` / `core.dict-get` のようなもの) を足し, ランタイム関数として Wasm の中で
     ハッシュ表 (GC の配列) を作る。作るのが O(n), 引くのが O(1) で, definy 側の定数コストが掛からない
   - 組み込みが増えるのを避けるなら, 「レコードのリストからフィールドが key に等しい要素を探す」組み込みだけでも,
     1 要素ごとの `list-get` の確保・`record_get`・関数呼び出しが無くなり, 定数が 1 桁下がる見込み

   対象は `core.part-type-lookup` (型検査), `core.compile-find-part` (コンパイラ), それと pipeline-indexing.md の表にある
   `core.module-entry-lookup`, `core.visibility-*-find`, `definy.resolved-content-find` など。
   型チェッカーは型環境を 1 度作って何度も検査するので, 辞書を作るのは型環境を作るときの 1 回でよい

2. **コンパイラの数え直しをやめる** (コンパイラで約 2 割): `core.count-functions` を子ごとに呼び直さず,
   部分木の関数の数を 1 度の走査で返すようにする (関数の番号の付け方は変えない)。`max-local` と本体のコンパイルで
   2 度インライン化のための探索をしているのも 1 度にできる
3. **コード生成の改善** (数値計算で数倍, 実際のプログラムで最大 1.5 倍程度):
   - 数値・真偽値のリテラルを, 取り出す位置ではそのまま `i64.const` / `i32.const` にする (箱詰め → 取り出しの組を消す)
   - 関数のパーツへの呼び出し (呼ぶ関数がコンパイル時に分かるもの) は, クロージャを作らず `call` / `return_call` で直接呼ぶ
   - 演算の結果をすぐ別の演算に使うときは箱に入れない
4. **`list-append` で 1 つずつ積む書き方を避ける**: 2 万要素で 0.4 秒かかる。積むより分割統治で `list-concat` するか,
   長さの分かるリストを一度に作る組み込みを足す
5. **wasm-opt**: ビルド時に作る `wasm/type_checker.wasm` などにかけると 0〜1 割速くなるが, 依存が増えるわりに効果が小さいので後回しでよい

GC (5〜14%) と, ホストとの値の受け渡し (2 回目からは 10ms 以下) はボトルネックではない。

## 実装した改善

### 1. 探索の組み込み (2026-11-20)

改善案 1 を, 辞書の型を足すのではなく, 型を変えずに済む組み込み 3 つで入れた ([builtin-parts.md](builtin-parts.md)「探索の組み込み」):
`list_find_last_by_field` (ランタイムの中で末尾から線形探索) と, `list_hash_index` / `list_hash_index_find` (バケツのリストによるハッシュ索引)。
型環境 `core.type-env` の `parts` を索引にし, `core.part-type-lookup` が `list_hash_index_find` で引く。

| seed の全パーツの型検査 (検査の中央値)                      | 時間  |
| ----------------------------------------------------------- | ----- |
| 前 (definy の再帰で線形探索)                                | 618ms |
| `list_find_last_by_field` (値は `values_equal` で比較)      | 331ms |
| `list_find_last_by_field` (文字列は `string_eq` で直接比較) | 215ms |
| `list_hash_index_find` (今)                                 | 94ms  |

- ランタイムの中の線形探索にしても, 比べる回数 (参照ごとに型環境の半分) は変わらないので 3 倍どまりだった。
  比較の中身は `string_eq` 1 回 (パーツ ID は先頭の数バイトで違う) まで減っていたので, 回数を減らす索引にした
- コンパイラの自己コンパイル (93ms 前後) は変わらなかった。`core.compile-find-part` は全体の 1 割ほどで,
  残りは改善案 2 (関数の数え直し) と `list-concat`, GC

### 2. コンパイラのパーツ探索を索引に (2026-11-20)

`core.compile-to-wasm` が参照するパーツの一覧から `list_hash_index` で索引を 1 度作り, コンパイルの文脈 `ctx` の `part_index` に入れた。
`core.compile-find-part` と `core.compile-builtin-name` はそれを引く (`ctx` を受け取る 20 パーツの型に `part_index` を足した)。
stage1 で `core.compile-to-wasm` を自分自身でコンパイルする時間: 約 95ms → 68ms。

残りの重いところ (`core.compile-to-wasm` の中の割合):

- 関数の数え直し `core.count-functions` (約 27%)。関数の番号を決めるため, 子をコンパイルするたびに前の兄弟の部分木の関数を数え直す
  (部分木の深さぶん重複する)。数え直さないには, コンパイルの関数が命令列と一緒に関数の数を返すように型を変える必要があり,
  `core.compile-*` の 20 ほどのパーツに及ぶ
- `core.expression-children` (約 11%): 子のリストを毎回作る。数え直しをやめれば大半は消える
- GC 約 10%, `list-concat` 約 9%

### 3. 提出の探索を索引に, `list-fold` の 2 乗を直す (2026-11-20)

提出 (SubmitEvent) の経路の線形探索を `list_hash_index` に置き換えた。詳細と表は
[pipeline-indexing.md](pipeline-indexing.md)「ハッシュ索引による索引化」。
途中で `core.list-fold` / `core.list-map` が再帰のたびに関数をラムダ式で包み直していて, 呼び出しが要素数の 2 乗になっていたのも直した
(範囲を半分に分ける再帰に。[call-syntax.md](call-syntax.md))。`definy` 規模のコピー提出の wasm の時間は約 2.0 秒 → 約 1.0 秒。

- 提出の測り方: スクリプト `wasm-bench/submit.ts` (ワーカーをプロセス内で動かし, `DEFINY_PERF_TOKEN` の記録から wasm の時間を読む)。
  `wasm/*.wasm?module` を読むために `node --import ./bench-tmp/wasm-hook.mjs` で動かす。
  `named_service.ts` で `wasm/service.wasm` を name セクション付きに作り直せば `--cpu-prof` にパーツ名が出る
- 残りの最大はパーツ ID の導出の `core.sha256` (提出の wasm の 3 割前後)
