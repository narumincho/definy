アカウント作成やログインの画面はよく専用のページに遷移して、そこで処理が終わったら元のページに戻るというUIが採用されている.
しかし、definyではその画面内のダイアログで処理を完結させるUIにしたい.
そうすることによって,
ブラウザの戻るボタンを押してもログインのための履歴で汚れることはなくなる.
`<dialog>` 要素を使うことによって,
スマホで戻るジェスチャーをしてログインダイアログを閉じることもできる.

## ワークベンチ (IDE 風レイアウト)

画面全体は React 19 実装の [src/components/Workbench.tsx](../src/components/Workbench.tsx) で, VS Code のような IDE 風の構成にしている (旧 Rust 実装: `definy-ui/src/workbench.rs`).
詳細なアーキテクチャは [typescript-react-void-architecture.md](typescript-react-void-architecture.md) を参照.

| 領域               | 内容                                                                                | 旧 Rust 実装 (廃止)                 | React 19 実装                        |
| ------------------ | ----------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------ |
| タイトルバー       | エクスプローラーのドロワーを開くボタン (狭い画面だけ)・ロゴ・検索・言語・アカウント | `header.rs` の `HeaderView`         | `src/components/Header.tsx`          |
| アクティビティバー | イベント / パーツ / モジュール / アカウント / デプロイ / About / 設定 への切り替え  | `workbench.rs` の `ActivityBar`     | `src/components/ActivityBar.tsx`     |
| エクスプローラー   | モジュール → パーツの木構造. 開いているパーツ・モジュールを強調表示                 | `workbench.rs` の `ExplorerSidebar` | `src/components/ExplorerSidebar.tsx` |
| エディタ領域       | 現在のページのタブ・パンくずリストと, 各ページの本体. この領域だけがスクロールする  | `workbench.rs` の `EditorTabBar`    | `pages/` 各ページコンポーネント      |
| ステータスバー     | 接続状態・未送信ローカルイベント数・言語                                            | `header.rs` の `StatusBarView`      | `src/components/StatusBar.tsx`       |

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

Cmd/Ctrl+P または Cmd/Ctrl+K, タイトルバー中央のクリックで開く (`definy-ui/src/command_palette.rs`).
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
(`src/self_hosted_type_check.ts`. [self-hosting.md](self-hosting.md) の「definy 製型チェッカーの実行 (TypeScript 版)」).

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
(`definy_working_changes`, CBOR を base64 にしたもの) に記録しておき, 変更ページ (`/changes`) でまとめてコミットする.
実装は `definy-ui/src/working_changes.rs` (記録・適用) と `working_changes_view.rs` (変更ページ).

- パーツ詳細の編集は入力のたびに自動で記録する. コミット済みと同じ内容に戻すと記録から消える.
  `content_hash` は式から決まるので比較しない. 型は式との往復変換を通してから比べる
- 記録はパーツの定義全体 (`ModulePartEntry`) をパーツ ID (コミット済みの名前から導出) ごとに 1 つ持つ.
  新しいパーツの作成フォームの「変更に追加」からも記録できる (`is_new`)
- コミットはモジュールごとの `ModuleCommitEvent` なので, 複数のモジュールの変更はモジュールの数だけコミットになる.
  コミットのときにモジュールの最新のパーツ一覧へ変更を当てる (編集したパーツは同じ位置で差し替え, 新しいパーツは末尾).
  記録したあとに別のコミットが入ったモジュールには警告を出すが, そのまま最新に重ねてコミットできる
- 変更ページではチェックを外した変更をコミットから除ける (git add の代わり)
- localStorage は SSR の HTML と揃えるため, 初期化のときではなく `Workbench` の `use_effect` で読み込む.
  読み込みが終わる (`WORKING_CHANGES_LOADED`) までパーツ詳細は記録しない (空の編集で保存済みの変更を消さないため)
- 未コミットの変更があるパーツはエクスプローラーに `M` を出し, アクティビティバーの「変更」とステータスバーに件数を出す
- 変更ページはコミットする前に, サーバーと同じ検査をする (`self_hosted_type_check::check_module_changes`).
  コミットに含める変更をモジュールごとの `ModuleCommitEvent` にし (`build_module_commit`),
  サーバーが受け付けるときと同じ `definy_core::self_hosted_type_check::check_module_commit_parts` に渡す.
  型エラーがあればモジュールの下にパーツ名と理由を出し, コミットボタンを押せなくする
  - パーツ詳細の型検査はコミット済みの型環境で編集中のパーツだけを検査するので,
    パーツの型を変えたときに, それを参照する別のパーツ (式は変えていない) が壊れることは分からない.
    変更ページの検査は型が変わればモジュールの全パーツを検査するので, これも見つかる
  - 複数のモジュールにまたがるときは, 各モジュールを今の取得済みのイベントに対して検査する
    (先にコミットする別のモジュールの変更は型環境に入らない)
  - 変更・選択・取得済みのイベントの数・ログイン中のアカウントが変わったら 300ms 待ってから検査し直す.
    ログイン中のアカウントが core の所有者 (システムアカウント) なら, サーバーと同じく式の無い組み込みパーツを受け入れる
- 動作確認のノウハウ (2026-10 に変更ページのコミット前の検査を確かめたとき)
  - 作業中の変更は localStorage の `definy_working_changes` に `working_changes::encode` の結果を入れれば再現できる.
    `PartChange` を組み立てて `encode` を表示する使い捨ての example を `cargo run -p definy-ui --example ...` で動かし,
    その文字列をブラウザの `localStorage.setItem` で入れて `/changes` を開く
  - wasm の panic のバックトレースに関数名を出すには `dx serve` に `--keep-names` を付ける
- コミットがサーバーに拒否されたら, 理由 (`invalid_argument: part '...': type error: ...` など) を
  「変更のコミットに失敗しました」の後ろに出す (`LocalEventRecord::last_error`)

### ツリーエディタの選択肢

ノードを選ぶと出るメニュー (置換メニュー) の選択肢と並び順・操作.
実装は [src/tree_layout/ExpressionTreeEditor.tsx](../src/tree_layout/ExpressionTreeEditor.tsx),
選択肢と検索・ハイライトの規則は [src/tree_layout/selector_options.ts](../src/tree_layout/selector_options.ts) (単体テストあり).
旧 Rust 版 (`definy-ui/src/dropdown.rs` の `SearchableDropdownPanel`) の操作感に合わせている. キー操作は [key.md](key.md).

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

### パーツの型の行 (型のツリーエディタ)

パーツ詳細の `type` の行は, 旧 Rust 版と同じく型を式にして式のツリーエディタで編集する
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

`TypeList` は, 子の式をフィールドに持つ式として `mutation.ts` の `FIELD_STEPS` (パスの段とフィールド名の対応) で表示・取得・更新する.
`core.list-get` などの組み込みのパーツの呼び出しは, 他のパーツの呼び出し (`Call`) と同じく表示する.
`TypeUnion` はバリアントごとに行を分け, ペイロードの型を子の式にする (ペイロードのないバリアントを選ぶと union 全体を選ぶ).
表の対応がない式は, 子を持たないキーワード (式のキー名) として表示されるだけになるので, 新しい式の種類を足したら表にも足すこと

コンパイラ組み込みのパーツ (`core.string-concat` などの式 `{"Compiler": "string_concat"}`) は,
式の直下に組み込みが入っているものとして `builtin string-concat` と表示する (`ast_to_layout/literals.ts`).
表示は式の値 (`_` を `-` にしたもの) から作り, パーツ名は使わない. パーツ名を変えても表示は変わらず,
組み込みかどうかも式で決まる (システムアカウントなら名前を変えたコミットも受け付ける. `worker/type_check.test.ts`)

### 履歴グラフ

履歴ページ (`/history`) は VS Code の Git Graph 拡張のように, モジュールのコミットを枝分かれの線で一覧する.
計算は `definy-ui/src/commit_graph.rs`, 表示は `commit_graph_view.rs`.

- `ModuleCommitEvent` の親は `parent_commit_hash` の 1 つだけなのでマージは無い.
  同じ親から複数のコミットが作られたとき (オフラインでの編集など) だけ枝分かれし, 親の行で合流する
- 新しい順に並べ, レーンごとに「次に来るはずのコミット (親)」を覚えて上から置く.
  親が取得済みのイベントに無いときはレーンを閉じる. モジュールごとに別の木なので別のレーンになる
- 未コミットの変更は, そのモジュールの最新コミットから伸びる点線・中抜きの点としていちばん上に出す
- 行をクリックすると, 親コミットと比べたパーツの追加 (A)・変更 (M)・削除 (D) を出す.
  モジュール詳細の「グラフで見る」からは `?tab=<モジュールのハッシュ>` でそのモジュールに絞って開く

### ページの切り替えと読み込み

ページ全体を opacity: 0 からフェードインさせない. アニメーションが進まない環境 (非表示のタブ・プレビューなど) で
ページが透明・薄暗いまま残るため. 読み込み中はエディタ上端の細いバー (`.editor-loading-bar`) だけで示す.

### Dioxus のイベントハンドラでの注意

- ハンドラの中で同期的に `element.focus()` / `element.click()` を呼ばず, `crate::dom::focus_first` / `click_first`
  (内部で `crate::dom::defer` = マイクロタスク) を使う. その場で focus / click イベントが起きて処理が入れ子になるのを避けるため.
  setTimeout ではなくマイクロタスクなのは, 素早く続けて押された次のキーより先にフォーカスを移すため
- `if let Some(x) = *signal.peek() && ... { signal.set(..) }` のように, let チェーンの条件で `peek()` / `read()` すると
  借用が if の本体まで続き, 本体の `set` で `AlreadyBorrowed` の panic になる (wasm 全体が止まる).
  先に `let current = *signal.peek();` と取り出してから条件に使う

## SSR とハイドレーション (React 19 + Void 実装)

Void はページを SSR してからクライアントでハイドレーションするので, 初回レンダーの結果が SSR とクライアントで食い違うと
ハイドレーション不一致になる. そのため以下を守る.

- `localStorage` / `navigator` / `window.location` を `useState` の初期化やレンダー中に読まない.
  初回は SSR と同じ既定値でレンダーし, マウント後の `useEffect` で保存値を反映する
  (`src/state.tsx` の言語・作業中の変更, `pages/deployments.tsx` の Cloudflare 設定, `ExplorerSidebar` の幅)
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
