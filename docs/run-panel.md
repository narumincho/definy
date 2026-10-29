# 実行パネル

式を入力して実行するための, ターミナルのようなパネル (issue #752)。
パーツ詳細画面の「式を評価 (Wasm)」ボタンは廃止し, 実行はこのパネルでする。

- 実装: [src/components/RunPanel.tsx](../src/components/RunPanel.tsx) (画面),
  [src/run_expression.ts](../src/run_expression.ts) (コンパイルと実行),
  [src/run_history.ts](../src/run_history.ts) (実行履歴)
- 開閉: ヘッダー右のターミナルのアイコンか Ctrl / Cmd + \`。開閉の状態は `useDefiny().runPanelOpen`
- パネルはエディタ領域 (`.workbench-editor`) の下にあり, ページを移っても出したままになる。
  閉じても `hidden` にするだけでアンマウントしないので, 実行中の式は閉じても最後まで動く

## 入力

- 入力欄は式のツリーエディタ (`ExpressionTreeEditor`) で, パーツの式と同じ操作で書く。文字列では入力しない
- 型を指定しないので, 期待する型による選択肢の絞り込みはしない (`partType` を渡さない)
- 「実行」ボタンか Ctrl / Cmd + Enter (パネルの中にフォーカスがあるとき) で実行する。未入力 (`hole`) だけのときは押せない
- パーツ詳細を開いているときは「`module.name` を入力」ボタンを出す。
  関数のパーツは引数を未入力にした呼び出しにする (置換メニューでパーツを選んだときと同じ `partSelection`)

## 実行

`runExpression` (`src/run_expression.ts`) が

1. `collectReferencedParts` で式が参照するパーツを集める。
   パーツの式は作業中の変更があればそちらを使う (表示中, つまり `module.name` ごとに最新のパーツの変更だけ)。
   見つからない・式が無い・コンパイラ組み込みのパーツがあれば実行せず `unresolved_parts` を返す
2. `stage1.wasm` (`loadStage1Compiler`) で Wasm にコンパイルして評価する
3. 結果が `wasi.io` の値なら `runWasiIo` で `done` まで動かす ([wasi-io.md](wasi-io.md))。
   I/O のたびに途中経過を履歴に出す。途中で失敗したら, そこまでの記録とエラーを残す

結果の値は, 入力と同じ式のツリー (`ExpressionTreeEditor` の `editable={false}`) で出す (issue #801)。
`runValueExpression` が値をそれに評価される式 (リテラル・`list`・`record`・`variant`) にする。

- 整数でない数は浮動小数のリテラル (`1.5`) にする。stage1 から受け取る値は JavaScript の数なので,
  整数の値の浮動小数 (`2.0`) は整数のリテラル `2` と同じに見える
- タグ付きの値は `type_part` を `none` にした `variant` の式にする
- 式で書けない値 (関数のクロージャ, `null`, NaN・±Infinity) を含むときだけ, 前と同じ整形した JSON の文字列で出す (`formatRunValue`)

## コンパイラを作り直す

実行パネルの上の「コンパイラを作り直す」で, definy の中で definy のコンパイラを直して使える
(`src/components/CompilerRebuild.tsx`, `src/compiler_rebuild.ts`)。

1. 表示中のパーツ (作業中の変更を含む. 実行と同じ `resolvePart`) の `core.compile-to-wasm` を, 今のコンパイラでコンパイルする
2. できたコンパイラでもう 1 度コンパイルし, 同じバイト列になる (不動点) まで最大 5 回繰り返す (`selfCompile`.
   `npm run build:stage1 -- --bootstrap` と同じ処理)。不動点にならなければ使わない
3. できたコンパイラで `core.type-checker` もコンパイルし, 2 つをこのブラウザの localStorage (`definy.rebuilt-compiler`) に保存する
   (`src/rebuilt_compiler.ts`)。以後, 実行パネルの実行と UI の型検査は同梱の `wasm/stage1.wasm` / `wasm/type_checker.wasm`
   の代わりにこちらを使う (`loadStage1Compiler`, `loadTypeChecker`)。型検査の結果は捨てて検査し直す
4. 「ダウンロード」でできたコンパイラを `stage1.wasm` として保存できる (リポジトリの `wasm/stage1.wasm` にできる)。
   「同梱のものに戻す」で保存したものを消す

作り直しはメインスレッドで 2〜3 秒かかる。サーバー (Cloudflare Workers) は実行時に Wasm をコンパイルできないので,
サーバーの型検査は今も同梱の型チェッカー (ビルド時に作る) を使う。

## 実行履歴

- 実行するたびに新しい記録を先頭に足す。「再実行」も同じ式で新しい記録を足し, 前の記録は書き換えない (シェルの履歴と同じ)
- 「入力に戻す」で記録の式を入力欄に入れて, 直してから実行できる
- このブラウザの localStorage (`definy.run-history`) にだけ保存し, 100 件を超えたら古いものから消す。
  SSR と揃えるため, 描画した後に読み込む。実行中のままページを閉じた記録は, 読み込むときに `interrupted` のエラーにする

## ヘッダーの元に戻す・やり直す

実行ボタンの廃止と合わせて, パーツ詳細の元に戻す・やり直すボタンをヘッダーの definy のロゴの右に移した
([ui.md](ui.md) の「元に戻す (Undo) / やり直す (Redo)」)。
