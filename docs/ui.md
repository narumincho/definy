アカウント作成やログインの画面はよく専用のページに遷移して、そこで処理が終わったら元のページに戻るというUIが採用されている.
しかし、definyではその画面内のダイアログで処理を完結させるUIにしたい.
そうすることによって,
ブラウザの戻るボタンを押してもログインのための履歴で汚れることはなくなる.
`<dialog>` 要素を使うことによって,
スマホで戻るジェスチャーをしてログインダイアログを閉じることもできる.

## ワークベンチ (IDE 風レイアウト)

画面全体は React 19 実装の [src/components/Workbench.tsx](../src/components/Workbench.tsx) で, VS Code のような IDE 風の構成にしている.
詳細なアーキテクチャは [typescript-react-void-architecture.md](typescript-react-void-architecture.md) を参照.

| 領域               | 内容                                                                                | 実装                                 |
| ------------------ | ----------------------------------------------------------------------------------- | ------------------------------------ |
| タイトルバー       | エクスプローラーのドロワーを開くボタン (狭い画面だけ)・ロゴ・検索・言語・アカウント | `src/components/Header.tsx`          |
| アクティビティバー | イベント / パーツ / モジュール / アカウント / デプロイ / About / 設定 への切り替え  | `src/components/ActivityBar.tsx`     |
| エクスプローラー   | モジュール → パーツの木構造. 開いているパーツ・モジュールを強調表示                 | `src/components/ExplorerSidebar.tsx` |
| エディタ領域       | 現在のページのタブ・パンくずリストと, 各ページの本体. この領域だけがスクロールする  | `pages/` 各ページコンポーネント      |
| ステータスバー     | 接続状態・未送信ローカルイベント数・言語                                            | `src/components/StatusBar.tsx`       |

- `body` はスクロールさせず, エディタ領域 (`.workbench-editor-scroll`) が独立してスクロールする.
  ページ側で `window` のスクロール位置に依存する処理は書かないこと
- エクスプローラーのモジュールの開閉は `<details>` を使い, 状態を持たない
- 幅の広い画面ではエクスプローラーは常に出ている. 右端の境界 (`.sidebar-resizer`) をドラッグして幅を変えられる
  (矢印キーでも 16px ずつ変わる. ダブルクリック・Home で既定の幅に戻す). 幅は localStorage の `definy.sidebar.width` に保存する
  - 幅はワークベンチのグリッドの列 `--sidebar-width` をワークベンチの要素に直接書いて変える.
    エクスプローラーの要素だけに幅を書くとグリッドの列とずれてエディタ領域に重なる.
    ドラッグ中は React の state を変えない (エクスプローラーの大きな木を毎回描画し直さない) で, 離したときに保存する
- 幅 760px 以下 (スマホ) ではアクティビティバーが下部のタブバーになり, ステータスバーは隠れる.
  エクスプローラーはタイトルバー左のボタンで開くドロワーになり, パーツを選ぶか外側を押すと閉じる.
  開閉は `sidebarOpen` (`src/state/useUiState.ts`) で持ち, SSR と揃えるため閉じた状態から始める
- スマホのレイアウトには `<meta name="viewport">` が必要 (無いと幅 980px で描画され `@media (max-width: 760px)` が効かない).
  `void.json` の `head` を書くと Void の既定の head が置き換わるので, `head.meta` に `charset` と `viewport` も書いておくこと
- 配色はフラットなダークテーマで, 影やガラス効果を使わず境界線で面を区切る.
  色・角丸は `main.css` の `:root` のトークンで定義しているので, ページ側のインラインスタイルでもなるべくトークンを使う

### 色の指定

ページのインラインスタイルや SVG の `fill` / `stroke` でも色を直書きせず, `main.css` の `:root` のトークンを使う.

- 面・文字・境界線: `--surface`, `--bg-inset` (コードや値を表示する一段沈んだ面), `--overlay-1..3` (面に重ねる明るさ),
  `--text`, `--text-secondary`, `--text-muted`, `--border`, `--border-strong`
- 意味の区別 (図のレーン, ステータスなど): `--blue` `--green` `--yellow` `--orange` `--red` `--purple` `--pink` の色相ごとに
  `--{色}` (本体), `--{色}-text` (明るい文字), `--{色}-bg`, `--{色}-bg-strong`, `--{色}-border` の 5 段がある
- 塗りつぶしのボタンは `--primary-solid` + `--primary-content` を使う (`--primary` は文字・アイコン向けの明るい青)
- SVG の表示属性 (`fill: "var(--blue)"`) でも `var()` は解決される

### 状態に応じた見た目はクラスや data 属性で切り替える

選択・ホバー・エラーなどの状態によって `style` 属性の文字列を組み替えると,
再描画のときに前の状態のプロパティ (box-shadow など) が残ったり, `var()` を含む一括指定 (border, background) が
反映されなかったりすることがある. 状態は `data-state` 属性やクラスで表し, 見た目は `main.css` 側で付ける.
例: 式のツリーのノード (`.tree-capsule` / `.tree-badge` / `.tree-table` の `[data-state]`)

### コマンドパレット

Cmd/Ctrl+P または Cmd/Ctrl+K, タイトルバー中央のクリックで開く ([src/components/CommandPalette.tsx](../src/components/CommandPalette.tsx)).
パーツ (`module.part`)・モジュール・各ページを名前で探して開く. 並び順は
名前全体の一致 > 先頭一致 > 区切り (`.` `-` `_`) の直後からの一致 > 途中の一致 > 文字の順の一致 (あいまい).
Enter は結果の `<a>` をクリックして開くので, 通常のリンクと同じくクライアント側のルーティングを通る.

### エクスプローラー

- 上部の欄でパーツ名 (`module.part` でも可) を絞り込める. Escape で解除
- 見出しの `+` で新しいパーツを作成する (`/parts?tab=new`).
  モジュール行のホバーで出る `+` からは, そのモジュールを選んだ状態で作成フォームを開く (`tab=new:<モジュールのハッシュ>`)
- 型エラーのあるパーツは赤い印 (title に理由), モジュールにはエラー件数を出す. 判定は definy 製の型チェッカー
  (下の「型エラー表示」)

### 型エラー表示

型エラーの判定は, サーバーの `SubmitEvent` と同じ definy 製の型チェッカー (`core.type-check-against`. 型環境も definy 製の `core.build-type-env` で作る) で行う
(`src/self_hosted_type_check.ts`. [self-hosting.md](self-hosting.md) の「definy 製型チェッカーの実行」).

- 型チェッカーは `npm run build:seeds` が作る `wasm/type_checker.wasm` を `src/type_checker_browser.ts` が
  ハッシュ付きアセットとして読み込んでコンパイルする (1 度だけ). サーバーと同じものなので, UI で通ればサーバーでも通る
- 変更ページ (`/changes`) はコミットする前に `checkCommitTypes` (`src/state.tsx`) で検査する.
  コミットと同じパーツ (今のモジュールのパーツに作業中の変更を重ねたもの, `buildCommitParts`) を,
  署名の正しいイベントから集めた全モジュールの最新のパーツを型環境にして `checkModuleCommitParts` に渡す.
  型エラーがあればパーツ名と理由を出し, コミットボタンを押せなくする
  - 変更・対象モジュール・取得済みのイベント・ログイン中のアカウントが変わったら 300ms 待ってから検査し直す
  - 式の無いパーツ・コンパイラ組み込みを受け入れるか (システムアカウントか) はサーバーが決める
    (本番のシステムアカウントの公開鍵をブラウザは知らない) ので, 変更ページは型エラーと型チェッカーの失敗だけを出す
- 型エラーの中の型 (`core.type-ast`) は `formatTypeAst` で `List<app.user>` のように表示し, `reference` 型はパーツ名にする
- エクスプローラー: `partTypeCheckResults` (`src/state.tsx`) に, コミット済みの全パーツを裏で検査した結果を入れる.
  取得済みのイベントが変わったら 300ms 待ってから始め, 30ms ずつ検査しては `MessageChannel` でブラウザに処理を返す
  (`setTimeout(0)` は裏のタブで 1 秒ほどに間引かれる). 結果はコンテキストを使う全コンポーネントを描画し直すので最後に 1 度だけ反映する.
  型環境 (`typeEnvKey`: 全パーツの型と型パーツの定義) と定義 (`expressionKey`) が前と同じパーツは前の結果を使う.
  式の無いパーツ・コンパイラ組み込み (`unsupported`) には印を出さない
- パーツ詳細のページ (`pages/part/[id].tsx`) は URL の `id` を `key` にして中身を作り直す.
  void のルーティングは別のパーツへ移ってもページのコンポーネントを使い回すので, そのままだと
  選択中の行・式・置換メニュー・評価結果が前のパーツから残ってしまう
- パーツ詳細: 編集中の式と型を, 編集が 500ms 止まってから `checkPartType` で検査し, 型エラーはエラーのある式の横に
  警告 (`TreeLayoutRenderer` の `.tree-type-error`, 式のバッジは赤枠と波線) で出す. エラーのある式は型チェッカーが返す
  `core.type-error` の `located` から求め, 見つからない (型チェッカーの失敗など) ときはルートの式に出す.
  検査できない式 (未入力・コンパイラ組み込み) には何も出さない. 検査した後に式を編集したら, 検査し直すまで警告を消す.
  型環境はコミット済みのもの (このパーツだけ編集中の型と式に置き換える) なので, パーツの型を変えたときに,
  それを参照する別のパーツ (式は変えていない) が壊れることは分からない. 変更ページの検査はモジュールの全パーツを検査するので見つかる
- 速さの目安: 1 パーツ 2〜4ms. ブラウザの `expressionKey` は式のハッシュではなく「定義したイベントとパーツ名」にしている
  (seed の core だけで式が数 MB あり, 毎回 JavaScript の SHA-256 で計算すると読み込みのたびに重い).
  モジュールコミットのデコード (`extractModuleCommit`) も `decodedCommits` で 1 度だけにしている
- 型エラーのあるコミットはサーバーが拒否するので, 表示を確かめるには `DEFINY_ALLOW_UNVERIFIED_EVENTS=true` の dev サーバーで
  `DebugService/SubmitUnverifiedEvent` (型検査をしない) に, 正しく署名した型エラーのあるコミットを送る
- 動作確認のノウハウ: 作業中の変更は localStorage の `definy.working_changes.v3` に
  `{"parts": {"myapp.bad": {"name": "bad", "partType": "number", "expression": {"String": {"value": "x"}}, ...}}}`
  の形 (`src/working_changes_storage.ts`) で入れて `/changes` を開けば再現できる

### 作業中の変更とまとめてコミット

git の作業ツリーのように, パーツの編集はすぐにはコミットせず, ブラウザの localStorage
(`definy.working_changes.v3`, JSON. バイト列は `{"$bytes": "<Base64URL>"}`) に記録しておき, 変更ページ (`/changes`) でまとめてコミットする.
実装は [src/state/useWorkingChanges.ts](../src/state/useWorkingChanges.ts) (記録・コミット),
[src/working_changes_storage.ts](../src/working_changes_storage.ts) (保存形式), [pages/changes.tsx](../pages/changes.tsx) (変更ページ).

- 記録はパーツの定義全体 (`PartChange`) をパーツ ID ごとに 1 つ持つ
- コミットはモジュールごとの `ModuleCommitEvent`. 今のモジュールのパーツに作業中の変更を重ねたもの (`buildCommitParts`) を,
  モジュールの最新コミットを親にして署名して送る. 受け付けられたらそのモジュールの変更を記録から消す
- 未コミットの変更があるパーツはエクスプローラーに印を出し, アクティビティバーの「変更」とステータスバーに件数を出す
- コミット前の型検査は上の「型エラー表示」を参照

### ツリーエディタの選択肢

ノードを選ぶと出るメニュー (置換メニュー) の選択肢と並び順・操作.
実装は [src/tree_layout/ExpressionTreeEditor.tsx](../src/tree_layout/ExpressionTreeEditor.tsx),
選択肢と検索・ハイライトの規則は [src/tree_layout/selector_options.ts](../src/tree_layout/selector_options.ts) (単体テストあり).
キー操作は [key.md](key.md).

- 開くと検索欄に選択中の式の名前 (`core.eval-ast`, `core.plus` など) が全選択で入る. 打てば置き換わり, 打つまでは絞り込まずに全部の選択肢を出す.
  現在の選択肢には ✓ を付け, リストの中央に来るようにスクロールする. 未入力にした直後は検索欄を空にする
- 見出しに選択中の式の名前と期待する型を出す. ⌫ で未入力に, ✕ で選択解除
- その位置から参照できる変数 (関数のパラメーター, let の束縛, match のアームの束縛) を先頭に出す.
  変数は `ast_to_layout.ts` が式 1 つ分のレイアウトのノードに付ける `scopeVariables` から作る
- 検索語を打つと, 名前が一致するもの, 名前 (または `module.` を除いた名前) が検索語で始まるもの, 名前に含むもの,
  補足・分類に含むものの順に並べる. `index` と打てば変数 `index` がパーツ `std.string-index-of` より先に来る.
  期待型に合わない選択肢は一致度に関わらず「その他 (型が合わない)」の区切りの下に薄く出す
- パーツの選択肢の右端の ↗ はそのパーツのページ (`/part/<module>.<name>`) へのリンク. クリックするとメニューを閉じて移動する
- ↑ / ↓ で選び, Enter で適用する. 開いた直後の Enter (現在値を示しているだけ) では式を置き換えずにツリーに戻る.
  現在と同じ選択肢を選び直しても式を作り直さない (中身が初期値に戻ってしまうため)
- 適用・Escape のあとはツリーの枠にフォーカスが戻り, 選択を残したまま続けて WASD で移動できる.
  ツリーの外をクリックするとメニューを閉じる
- 参照しているパーツ ID と選択肢の ID (`partIdHash`) が違う場合 (同じ名前のモジュールを別のアカウントがコミットしたときなど) でも,
  `partNames` で名前に直して現在の選択肢とみなす
- 演算子の候補は無い. `core.plus` `core.less-than` `core.list-get` などはパーツの候補として出し,
  関数のパーツを選ぶと引数を未入力にした呼び出しにする. `core.less-than` を `core.less-than-or-equal` にするなど,
  呼び出しを別のパーツに差し替えるときは同じ名前の引数の式を引き継ぐ ([builtin-parts.md](builtin-parts.md))
- 構文の候補として `let` (式全体で使われていない変数 ID で `x = 0` の束縛を作り, 本体はその変数) と
  `match (true / false)` を出す
- パーツの候補には型 (`number`, `function → number` など) を名前の横に出す
- 式を置き換える選択肢より先に, その位置でできる操作の選択肢を出す (下の「式エディタの操作」)

### 式エディタの操作

置換メニューで式を置き換える以外の操作. 式を置き換える選択肢と同じく置換メニューに出し, 検索もできる
(match のアームの追加・削除と同じやり方). 操作の後はツリーにフォーカスを戻し, 操作した位置を選ぶ.

- 変数の名前の変更: 関数の引数名・let の変数名・match で束縛する変数の名前を選ぶと, その場で名前を変える入力欄になる
  (置換メニューは出さない). 変数は ID で参照しているので, 名前だけを変えれば参照する側の式は変えなくてよい.
  let の変数名は束縛の値とは別のパス `letBindingName` (式ではない) にしている.
  実装は [src/tree_layout/local_variable.ts](../src/tree_layout/local_variable.ts) の `renameVariableAt`
- 定義への移動: 変数 (と関数型の変数の呼び出し) を選んだときの `go-to-definition`, またはツリーで F12.
  その変数を定義している名前 (関数の引数名・let の変数名・match で束縛する変数の名前) を選ぶ.
  定義はルートから選んだ式までのパスを降りながら集め (`findVariableDefinitionPath`), 内側の定義が外側の同じ ID を隠す.
  let の束縛の値からはそれより前の束縛だけが見える. 定義が式の外 (未定義の変数) なら選択肢を出さない
- リストの要素の操作 ([src/tree_layout/list_items.ts](../src/tree_layout/list_items.ts)):
  リスト (`ListLiteral`) を選ぶと `add-item` (末尾に未入力の要素を足す), 要素を選ぶと
  `insert-item-before` / `insert-item-after` / `move-item-earlier` / `move-item-later` / `delete-item`.
  足した要素・動かした要素を選び, 消したときは同じ位置の次の要素 (末尾なら前の要素, 空になればリスト) を選ぶ
- let の束縛の操作 ([src/tree_layout/let_bindings.ts](../src/tree_layout/let_bindings.ts)):
  let を選ぶと `add-binding` (末尾に足す), 束縛の値を選ぶと `insert-binding-before` / `insert-binding-after` /
  `move-binding-earlier` / `move-binding-later` / `delete-binding`. 新しい束縛は式全体で使われていない変数 ID
  (`nextVariableId`) と名前 (`x`, `x1`, ...) にし, 値を未入力にしてその値を選ぶ. 最後の束縛を消すと let をやめて本体だけにする.
  消した変数を参照している式・前へ動かして見えなくなった変数は, 型チェッカーが型エラーにする
- Variant (タグ付きの値) の作成 ([src/tree_layout/variant.ts](../src/tree_layout/variant.ts)):
  直和型の型パーツ (式が `TypeUnion` の型パーツ) のタグを `sample.option-number.some` のような名前の選択肢に出す
  (`some` と打てば見つかる). 選ぶと型パーツを指定した Variant (`type_part_definition_event_hash`) にし,
  値を持つタグなら値を未入力にする. 値を持つタグ同士で変えると値を引き継ぐ.
  期待する型が型パーツならそのタグを先に並べ, 型パーツでない直和型ならそのタグ (型パーツなし) も出す.
  関数リテラルは選択肢に出さない (期待する型が関数なら関数リテラルにする方針)
- 型パーツの値を作る式は型パーツを指定した Variant だけにした. 以前あった `Constructor` (`new:型パーツ(値)`) は
  definy 製の型チェッカー・コンパイラ・評価器のどれも扱えなかったので AST から消した (2026-10-24)

### 式のホバー表示

式のツリーの式にマウスを 350ms 置くと, 式の下にその式の型とパーツのドキュメントを出す (VS Code のホバーのようなもの).
実装は [src/tree_layout/ExpressionHoverCard.tsx](../src/tree_layout/ExpressionHoverCard.tsx) (表示) と
[src/tree_layout/hover_info.ts](../src/tree_layout/hover_info.ts) (ホバーした式を探す. 単体テストあり).

- ホバーしたノードを含むいちばん内側の式に出す. 記号・match のパターンなど式でないノードはそれを含む式,
  呼び出しの引数名 (`x:`) は引数の式
- パーツの参照・パーツの呼び出しは, パーツ名 (`module.name`) と説明 (表示言語の `description`) を出す.
  呼び出す関数 (`core.minus` など) は呼び出しの一部なので, カプセル (枠) と同じく呼び出しの結果の型になる
- 変数は名前を出す
- 型は definy 製の型チェッカーに聞く (`findExpressionTypeAt`, `src/tree_layout/type_inference.ts`).
  式 `t` を `let _ = [t, probe] in t` に置き換えて推論した型を聞き, 推論できない式 (引数の型を書かない関数・未入力など) は
  その位置で期待する型を「期待する型」として出す ([self-hosting.md](self-hosting.md) の「未入力 (`hole`) と期待する型」)
- コンパイラ組み込みの型は引数の型を持たないので `builtin minus(left, right)` のように引数名だけ出す (`formatTypeAst`)
- 型のツリーエディタ (`mode="type"`) では型は聞かず, 型パーツの参照の名前と説明だけ出す
- 置換メニューを開いている間は出さない. カードは `pointer-events: none` なのでクリックの邪魔をしない
- ホバーしているノードはツリーの枠の `mouseover` の `event.target` から `closest("[data-node-id]")` で決める.
  各ノードの `onMouseEnter` で決めると, ツリーの外から一度に複数の入れ子のノードに入ったときに
  React が外側のノードの mouseenter を後に呼ぶことがあり, いちばん外側 (ルート) のノードになってしまう

### 元に戻す (Undo) / やり直す (Redo)

パーツ詳細 (`pages/part/[id].tsx`) の編集は, ヘッダーのボタンか Ctrl / Cmd + Z で元に戻し,
Ctrl / Cmd + Shift + Z (Ctrl + Y) でやり直せる. 履歴の計算は [src/undo_history.ts](../src/undo_history.ts) (単体テストあり).

- 履歴には, 変える前のそのパーツの作業中の変更 (`PartChange`. 変更が無ければ `undefined`) を積む.
  元に戻して変更が無い状態になれば作業中の変更も消える (`discardWorkingPart`). 「変更を破棄」も元に戻せる
- 名前・説明・式・型のどれを変えても同じ履歴に積む. 元に戻した後に別の変更をするとやり直しの履歴は消える
- 入力欄で続けて打った変更は 1 つにまとめる: 同じ `mergeKey` (名前 `name`, 説明 `description`,
  式の数値・文字列・変数名の入力欄は `text:<パス>`) の変更が 1 秒以内に続けば新しく積まない.
  `ExpressionTreeEditor` の `onChange` と `PartDefinitionTree` の `onExpressionChange` がキーを渡す
- 入力欄 (`input` / `textarea`) にフォーカスがあるときのショートカットはブラウザの入力欄の Undo に任せる
- 履歴はパーツ詳細を開いている間だけ持つ. 別のパーツへ移ると消える (ページを `key` で作り直すため)
- 上限は 200 件. 超えたら古いものから捨てる

### コピー・切り取り・貼り付け

式のツリーエディタ (パーツの型の行の型のツリーエディタも) で選んだ式を, OS のクリップボードでコピー・切り取り・貼り付けできる
(`src/tree_layout/clipboard.ts`). 別のブラウザ・別の端末の definy にも貼り付けられる.

- Ctrl/Cmd + C でコピー, Ctrl/Cmd + X で切り取り (未入力 `□` にする), Ctrl/Cmd + V で選んだ式を置き換えて貼り付け.
  置換メニューの `copy` / `cut` / `paste` (カテゴリ `Clipboard`) でも同じことができる
- クリップボードには `text/plain` で次の JSON を書く. カスタムの MIME タイプはブラウザ間で扱いが揃っていないため使わない

  ```json
  {
    "format": "definy.expression",
    "version": 1,
    "mode": "expression",
    "expression": { "Number": { "value": 5 } },
    "freeVariables": [{ "id": 0, "name": "x" }]
  }
  ```

  - パーツ ID などのバイト列 (`Uint8Array`) は `{"$bytes": "<Base64URL>"}` にする
  - `mode` は `expression` (式) か `type` (パーツの型). 違う種類のツリーには貼り付けない
  - `freeVariables` はコピーした式の中で定義されずに参照している変数 (外側の let・関数の引数・match の束縛) の ID と名前

- 貼り付けるときは変数 ID を貼り付け先に合わせる: 式の中で定義する変数は貼り付け先の式全体で使われていない ID に振り直し,
  外の変数は貼り付け先から参照できる同じ名前の変数に付け替える. 見つからなければ未入力にする (その変数の呼び出しなら呼び出しごと未入力)
- キー操作は `copy` / `cut` / `paste` の DOM イベントを document で受けて, ツリーにフォーカスがあるときだけ扱う.
  入力欄が無い要素にフォーカスがあるとこれらのイベントは body に届くため, ツリーの要素には付けられない.
  `clipboardData` は権限の確認なしに読み書きできるので, Safari・Firefox でも確認が出ない
  (置換メニューからの貼り付けは `navigator.clipboard.readText()` を使うので, ブラウザが確認を出すことがある)
- 置換メニューの検索欄にフォーカスがあるときも, 文字を範囲選択していなければ選んだ式をコピーする (式を押すとすぐ検索欄にフォーカスが移るため).
  貼り付けは, 文字列が definy の式なら数値・文字列・検索の入力欄ではなく選んだ式に貼り付ける. そうでなければ入力欄に任せる
- E2E では `clipboard-read` / `clipboard-write` の権限を付けたコンテキストで `navigator.clipboard.readText()` を使って中身を確かめ,
  別のコンテキスト (別のブラウザに相当) で `writeText` してから Ctrl+V で貼り付けている

### パーツの型の行 (型のツリーエディタ)

パーツ詳細の `type` の行は, 型を式にして式のツリーエディタで編集する
(`ExpressionTreeEditor` の `mode="type"`).

- パーツの型 (`partType`, seeds/schemas の `PartType`) と型の式の相互変換は
  [src/tree_layout/part_type.ts](../src/tree_layout/part_type.ts). seed の全パーツの型が往復で変わらないことをテストしている
  - `"number"` ↔ `"TypeNumber"`, `{ list: T }` ↔ `{ TypeList: { item_type } }`, `{ function }` ↔ `{ TypeFunction }`,
    `{ record }` ↔ `{ TypeLiteral }`, `{ union }` ↔ `{ TypeUnion }`, `{ type_part: ID }` ↔ `{ PartReference }`, 型指定なし ↔ `null`
  - `"type"` (型そのもの) は内部だけの `"TypeType"` にする. 未入力 (`Hole`) は `null` に戻す
- 型のメニューの候補は number / string / boolean / type / list / function / record / union / 型指定なしと,
  型のパーツ (`partType` が `type` のパーツ, `{ type_part: ID }` で参照する). 期待型の推論はしない
- 行の右端の × で型指定をなくす
- 変更は式と同じく作業中の変更 (`PartChange.partType`) に記録する. パーツ詳細は作業中の変更の型を優先して表示し,
  式のツリーの期待型の推論にもその型を使う
- ツリーでは `TypeNumber` などは `number` のように型の名前で出す

### ツリーに表示する組み込みの式

`TypeList` / `TypeCode` (`Code<T>` の型) / `Quote` (quote 式, [quote.md](quote.md)) は, 子の式をフィールドに持つ式として `mutation.ts` の `FIELD_STEPS` (パスの段とフィールド名の対応) で表示・取得・更新する.
`Quote` の中は外の変数を使えないので, 中の式にはスコープの変数を渡さない.
`core.list-get` などの組み込みのパーツの呼び出しは, 他のパーツの呼び出し (`Call`) と同じく表示する.
`TypeUnion` はバリアントごとに行を分け, ペイロードの型を子の式にする (ペイロードのないバリアントを選ぶと union 全体を選ぶ).
表の対応がない式は, 子を持たないキーワード (式のキー名) として表示されるだけになるので, 新しい式の種類を足したら表にも足すこと

コンパイラ組み込みのパーツ (`core.string-concat` などの式 `{"Compiler": "string_concat"}`) は,
式の直下に組み込みが入っているものとして `builtin string-concat` と表示する (`ast_to_layout/literals.ts`).
表示は式の値 (`_` を `-` にしたもの) から作り, パーツ名は使わない. パーツ名を変えても表示は変わらず,
組み込みかどうかも式で決まる (システムアカウントなら名前を変えたコミットも受け付ける. `worker/type_check.test.ts`)

### I/O をするプログラムの実行 (wasi.io)

パーツ詳細画面で「式を評価」した結果が `wasi.io` の値なら, そのまま I/O をしながら最後まで動かし,
I/O の記録 (HTTP リクエストの URL と結果など) と `done` のメッセージを評価結果の下に出す.
「CORS エラーのときサーバーで仲介する」は設定画面で決める ([wasi-io.md](wasi-io.md)).
式がシークレットリテラルのパーツのページには, 名前と送ってよい宛先の編集, 値の入力, 使用箇所, 使用履歴の欄を出す ([secret.md](secret.md)).

### 履歴

履歴ページ (`/history`, [pages/history.tsx](../pages/history.tsx)) はモジュールのコミットを新しい順に並べ, 各コミットのイベント詳細へリンクする.
`ModuleCommitEvent` の親は `parent_commit_hash` の 1 つだけなので, 枝分かれ (同じ親から複数のコミット) はあってもマージは無い.

### イベントタイムライン

トップページ (`/`, `pages/index.tsx`) は取得したイベントを新しい順 (サーバーの返した順) に, 日付ごとの見出しの下へ縦線でつないで並べる.

- 種別は `data-event-type` 属性で表し, マーカーと種別名の色は `main.css` の `.timeline-item[data-event-type=...]` で
  `--event-color` 系の変数を切り替えて付ける (コミット = 青, アカウント作成 = 緑, プロファイル変更 = 黄, 署名が不正 = 赤).
  E2E も種別はバッジの文字ではなく `data-event-type` で確かめる
- カードには生の ID ではなく要約を出す. モジュールコミットはモジュール名・コミットメッセージ (2 行まで)・パーツ数,
  アカウント作成はアカウント名. 作成者はアカウント名 (`accountNames`, 無ければ ID の先頭) で出す.
  モジュールコミットの中身は `useEvents` が 1 度だけデコードした `decodedCommits` をコンテキストから使い回す
  (core は数 MB あるので描画ごとにデコードしない)
- 署名が不正なイベントは中身を信用しないので要約は出さず, 検証に失敗した理由だけを出す
- カード全体がイベント詳細へのリンク. フィルターのチップには種別ごとの件数を出す
- 幅 640px 以下ではマーカーと縦線を消してカードだけにする

### ページの切り替えと読み込み

ページ全体を opacity: 0 からフェードインさせない. アニメーションが進まない環境 (非表示のタブ・プレビューなど) で
ページが透明・薄暗いまま残るため. 読み込み中はエディタ上端の細いバー (`.editor-loading-bar`) だけで示す.

## SSR とハイドレーション (React 19 + Void 実装)

Void はページを SSR してからクライアントでハイドレーションするので, 初回レンダーの結果が SSR とクライアントで食い違うと
ハイドレーション不一致になる. そのため以下を守る.

- `localStorage` / `navigator` / `window.location` を `useState` の初期化やレンダー中に読まない.
  初回は SSR と同じ既定値でレンダーし, マウント後の `useEffect` で保存値を反映する
  (`src/state.tsx` の言語・作業中の変更, `src/wasi_io_browser.ts` のシークレットの値・使用履歴と CORS 仲介の設定, `ExplorerSidebar` の幅)
- URL は SSR でも `useRouter()` (`@void/react`) で読める. SSR では `createSsrRouter(リクエストの URL)` が使われ,
  `path` や `query` はクエリ文字列も含めてクライアントと一致する. 現在のパスは `window.location.pathname` ではなく
  `useRouter().path` を使う (`ActivityBar`)
- 作業中の変更 (`definy.working_changes.v2`) はマウント後に読み込むが, 保存するのはユーザー操作による
  `updateWorkingPart` などのときだけなので, 読み込み前の空の状態で保存済みの変更を消すことはない

### 表示言語の決め方

優先順位は URL クエリ `?lang=` > `localStorage` の `definy.language` > `navigator.language` (`ja` / `eo` で始まるか) > `en`.

- `?lang=` は `useRouter().query` から読んで `useState` の初期値にする. SSR も同じ言語で HTML を出すので, ちらつきも不一致も起きない
- `?lang=` が無いときは SSR では `en` で出し, マウント後に `localStorage` / `navigator.language` から決めた言語に切り替える
- 言語を切り替えると `localStorage` に保存し, `history.replaceState` で URL の `?lang=` も書き換える
- 動作確認は `localStorage.setItem("definy.language", "ja")` を入れてから `/parts?lang=en` を開き,
  英語で表示されコンソールに `Hydration` の警告が出ないことを見る
