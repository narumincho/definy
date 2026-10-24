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

結果の値はレコードやリストなら整形した JSON で出す (`formatRunValue`)。

## 実行履歴

- 実行するたびに新しい記録を先頭に足す。「再実行」も同じ式で新しい記録を足し, 前の記録は書き換えない (シェルの履歴と同じ)
- 「入力に戻す」で記録の式を入力欄に入れて, 直してから実行できる
- このブラウザの localStorage (`definy.run-history`) にだけ保存し, 100 件を超えたら古いものから消す。
  SSR と揃えるため, 描画した後に読み込む。実行中のままページを閉じた記録は, 読み込むときに `interrupted` のエラーにする

## ヘッダーの元に戻す・やり直す

実行ボタンの廃止と合わせて, パーツ詳細の元に戻す・やり直すボタンをヘッダーの definy のロゴの右に移した
([ui.md](ui.md) の「元に戻す (Undo) / やり直す (Redo)」)。
