アカウント作成やログインの画面はよく専用のページに遷移して、そこで処理が終わったら元のページに戻るというUIが採用されている.
しかし、definyではその画面内のダイアログで処理を完結させるUIにしたい.
そうすることによって,
ブラウザの戻るボタンを押してもログインのための履歴で汚れることはなくなる.
`<dialog>` 要素を使うことによって,
スマホで戻るジェスチャーをしてログインダイアログを閉じることもできる.

## ワークベンチ (IDE 風レイアウト)

画面全体は React 19 実装の [src/components/Workbench.tsx](../src/components/Workbench.tsx) で, VS Code のような IDE 風の構成にしている.
詳細なアーキテクチャは [typescript-react-void-architecture.md](typescript-react-void-architecture.md) を参照.
UI でまだできない操作の一覧は [ui-missing-operations.md](ui-missing-operations.md).

| 領域               | 内容                                                                                          | 実装                                 |
| ------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------ |
| タイトルバー       | エクスプローラーのドロワーを開くボタン (狭い画面だけ)・ロゴ・検索・接続状態・言語・アカウント | `src/components/Header.tsx`          |
| アクティビティバー | イベント / プロジェクト / アカウント一覧 / 設定. 選んだものでサイドバーの欄が変わる           | `src/components/ActivityBar.tsx`     |
| サイドバー         | アクティビティバーで選んだ欄 (下の「サイドバーの欄」)                                         | `src/components/ExplorerSidebar.tsx` |
| エディタ領域       | 現在のページのタブ・パンくずリストと, 各ページの本体. この領域だけがスクロールする            | `pages/` 各ページコンポーネント      |

- 画面下部のステータスバーは置かない (Issue #747. VS Code に寄せすぎず definy に合った画面にするため).
  接続状態はタイトルバー右側の `src/components/ConnectionStatus.tsx` に出す.
  接続済みのときは緑の点だけ, 確認中 (黄) ・オフライン (赤) のときは文字でも知らせる.
  未コミット変更の件数はアクティビティバーの「プロジェクト」のバッジ, 言語はタイトルバーの言語切替で分かる
- 左から アクティビティバー → サイドバー → エディタ領域 の階層にする. アクティビティバーで選んだものでサイドバーの欄が変わる:

  | アクティビティバー | 開くページ  | サイドバーの欄                                                                           |
  | ------------------ | ----------- | ---------------------------------------------------------------------------------------- |
  | イベント           | `/`         | イベントの一覧 (新しい順. 押すとイベント詳細. `src/components/SidebarLists.tsx`)         |
  | プロジェクト       | `/modules`  | プロジェクト ▸ ブランチ ▸ コミット ▸ モジュール ▸ パーツ の木 (下の「エクスプローラー」) |
  | アカウント一覧     | `/accounts` | アカウントの一覧 (押すとアカウントのページ)                                              |
  | 設定               | `/settings` | 空                                                                                       |
  - 欄は今のページのパスで決める (`sidebarViewOf`, `src/sidebar_view.ts`). プロジェクト・モジュール・パーツ・パーツ一覧・履歴・新しいパーツのページはプロジェクト,
    アカウントのページはアカウント一覧, About とシークレット一覧 (`/settings/secrets`) は設定. 状態は `sidebarView` (`src/state/useUiState.ts`)
  - イベント詳細 (`/event/...`) はイベントの一覧からもプロジェクトの木のコミットからも開くので, 前の欄のままにする
    (最初に開いたページなら「イベント」). パーツ一覧 (`/parts`) とコミット履歴 (`/history`) はアクティビティバーから外したが,
    ページは残している (変更のページ `/parts?changes=only` は「コミットの追加」から, どちらもコマンドパレットから開ける)

- `body` はスクロールさせず, エディタ領域 (`.workbench-editor-scroll`) が独立してスクロールする.
  ページ側で `window` のスクロール位置に依存する処理は書かないこと
- 幅の広い画面ではエクスプローラーは常に出ている. 右端の境界 (`.sidebar-resizer`) をドラッグして幅を変えられる
  (矢印キーでも 16px ずつ変わる. ダブルクリック・Home で既定の幅に戻す). 幅は localStorage の `definy.sidebar.width` に保存する
  - 幅はワークベンチのグリッドの列 `--sidebar-width` をワークベンチの要素に直接書いて変える.
    エクスプローラーの要素だけに幅を書くとグリッドの列とずれてエディタ領域に重なる.
    ドラッグ中は React の state を変えない (エクスプローラーの大きな木を毎回描画し直さない) で, 離したときに保存する
- 幅 760px 以下 (スマホ) ではアクティビティバーが下部のタブバーになる.
  タブが多いと文字が小さく切れるので, アクティビティバーの項目は 4 つ (イベント / プロジェクト / アカウント一覧 / 設定) に抑える.
  About (`/about`) は設定のページのリンクから開く (開いているときは設定を強調表示する)
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
ページを開かずに処理を実行する候補 (コマンド) もあり, 今はショートカットキー一覧 (docs/key.md「ショートカットキー一覧」) を開くコマンドがある.

### 階層のパンくず

definy の中身は プロジェクト / ブランチ (コミット) / モジュール / パーツ という階層になっている ([project.md](project.md), [branch.md](branch.md)).
URL は `/project/{名前}`, `/module/{名前}`, `/part/{モジュール.パーツ}` と平らで, ブランチは URL に入らない (プロジェクトごとに localStorage で選ぶ) ので,
今どの階層のどこを見ているかは画面で示す ([src/components/HierarchyBreadcrumb.tsx](../src/components/HierarchyBreadcrumb.tsx)).

- プロジェクト・モジュール・パーツ・コミット (イベント詳細) のページの先頭に同じパンくずを出す.
  各段にアイコンと種類の小さな見出し (プロジェクト / ブランチ / コミット / モジュール / パーツ) を付け, 今のページの段 (`aria-current="page"`) を強調する
  - プロジェクト・モジュール・パーツのページ: `プロジェクト › ブランチ ▾ (最新のコミット) › モジュール › パーツ`
  - コミットのページ: `プロジェクト › ブランチ › コミット` (ブランチはそのコミットのもの. 押すとそのブランチを表示してプロジェクトのページを開く)
- ブランチの段は表示しているブランチの選択欄 (`#project-branch-select`) で, どのページからでも切り替えられる. 横の短いハッシュはそのブランチの最新のコミットへのリンク
- アイコンの色はエクスプローラーの木と揃える (プロジェクト: 青, ブランチ・コミット: 緑, モジュール: 黄, パーツ: 紫)
- 階層を URL に入れる (`/project/definy/main/core/plus` のような形) のは, パーツ ID での参照やリンクへの影響が大きいので今はしていない

### エクスプローラー

- プロジェクト ▸ ブランチ ▸ コミット ▸ モジュール ▸ パーツ の 5 段の木 (木は `src/explorer_tree.ts` の `buildExplorerTree` で作る).
  見出し (「エクスプローラー」) や見出しの `+` は置かない
  - 各行は左の `›` / `⌄` (`.sidebar-tree-toggle`) で開閉し, 名前はその段の詳細のページへの `<a href>`:
    プロジェクト → `/project/{名前}`, ブランチ → `/project/{名前}?branch={ブランチ}`, コミット → `/event/{ハッシュ}`, モジュール → `/module/{名前}`, パーツ → `/part/{id}`
  - コミットは各ブランチの最新のコミット (ブランチが今指しているもの) だけを出す. 古いコミットはプロジェクトのページのコミット履歴で見る
  - 表示しているブランチ (「表示中」) とその中は既定で開き, 他のブランチは閉じている. 他のブランチを開くと最新のコミットを読んで
    (`loadEvent`) そのモジュールとパーツを出す. 他のブランチの中のリンクを押すと, そのブランチを表示してから開く (`selectBranch`)
  - 作業中の変更・型エラーの印は表示しているブランチにだけ出す (変更はそのブランチに重ねているため)
  - コミットしていない新しいプロジェクトは `main` の「未コミット」のコミットの下に出す
  - VSCode の sticky scroll のように, スクロールしてもプロジェクト・ブランチ・コミット・モジュールの行は上端に重ねて残す
    (`position: sticky`. 行の高さ `--tree-row-height` を揃えて段ごとに `top` をずらす). 各段の行はその段のまとまり
    (`.sidebar-*-group`) の先頭の子なので, まとまりが画面から出ると次のまとまりの行に入れ替わる
  - 開いているページの行は, どの段でもパーツと同じく強調する (`.sidebar-tree-node[aria-current="page"]`).
    ブランチの行は `/project/{名前}?branch={ブランチ}` へのリンクで, プロジェクトのページは `?branch=` のブランチを表示する.
    そのときはプロジェクトではなくブランチの行を強調する
  - 開いているパーツのプロジェクト・ブランチ・コミット・モジュールが閉じていれば開く
- 各段の先頭に「+ ○○の追加」を出す (絞り込み中は出さない):

  | 行                 | 開くページ                                                                                  |
  | ------------------ | ------------------------------------------------------------------------------------------- |
  | プロジェクトの追加 | `/new-part` (新しいモジュールを新しいプロジェクトに作る)                                    |
  | ブランチの追加     | `/project/{名前}?add=branch` (新しいブランチの欄. [branch.md](branch.md)「ブランチの作成」) |
  | コミットの追加     | `/parts?changes=only` (作業中の変更をコミットする)                                          |
  | モジュールの追加   | `/new-part?project={名前}` (そのプロジェクトに新しいモジュールを作る)                       |
  | パーツの追加       | `/new-part?module={名前}`                                                                   |

  ブランチにコミットできるのは作成者だけなので, コミット・モジュール・パーツの追加は自分が作ったブランチ
  (とまだコミットの無い新しいプロジェクト) の中にだけ出す. ブランチの追加は他のアカウントのプロジェクトでも出す (誰でもブランチを作れる).
  ブランチの中の「追加」はそのブランチを表示してから開く

- 上部の欄でパーツ名 (`module.part` でも可) を絞り込める. 一致するパーツのある段だけを開いて出す.
  狭い画面ではドロワーを閉じる `×` をこの欄の右に出す
- コミットしていない新しいパーツ・モジュールもエクスプローラーに出る. 削除するパーツは取り消し線で出す
- 型エラーのあるパーツは赤い印 (title に理由), モジュールにはエラー件数を出す. 判定は definy 製の型チェッカー
  (下の「型エラー表示」)

### 型エラー表示

型エラーの判定は, サーバーの `SubmitEvent` と同じ definy 製の型チェッカー (`core.type-check-against`. 型環境も definy 製の `core.build-type-env` で作る) で行う
(`src/self_hosted_type_check.ts`. [self-hosting.md](self-hosting.md) の「definy 製型チェッカーの実行」).

- 型チェッカーは `npm run build:seeds` が作る `wasm/type_checker.wasm` を `src/type_checker_browser.ts` が
  ハッシュ付きアセットとして読み込んでコンパイルする (1 度だけ). サーバーと同じものなので, UI で通ればサーバーでも通る
- パーツ一覧の「変更のみ表示」 (`/parts?changes=only`, 以下「変更ページ」) はコミットする前に `checkCommitTypes` (`src/state.tsx`) で検査する.
  コミットと同じパーツ (プロジェクトの今の全モジュールのパーツに作業中の変更を重ねたもの, `buildCommitModules`) を,
  署名の正しいイベントから集めた全モジュールの最新のパーツを型環境にして `checkModuleCommitParts` に渡す.
  型エラーがあればパーツ名と理由を出し, コミットボタンを押せなくする
  - 変更・対象モジュール・取得済みのイベント・ログイン中のアカウントが変わったら 300ms 待ってから検査し直す
  - コンパイラ組み込みのパーツ (`isCompilerBuiltinPart`) を検査せずに受け入れ, それ以外の式・型の無いパーツや未入力を拒否するのは
    サーバーと同じ. 組み込みかどうかはパーツの定義で決まり, アカウントによらないので, ブラウザもサーバーと同じ結果になる
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
- 型エラーのあるコミットはサーバーが拒否する (署名や型を確かめずに保存する経路は無い). 表示を確かめるには下の localStorage の方法を使う
- 動作確認のノウハウ: 作業中の変更は localStorage の `definy.working_changes.v4` に
  `{"parts": {"myapp.bad": {"name": "bad", "partType": {"#number": null}, "expression": {"#string": "x"}, ...}}}`
  の形 (`src/working_changes_storage.ts`) で入れて `/parts?changes=only` を開けば再現できる

### 作業中の変更とまとめてコミット

git の作業ツリーのように, パーツの編集はすぐにはコミットせず, ブラウザの localStorage
(`definy.working_changes.v4`, JSON. 式と型は [value-encoding.md](value-encoding.md) の形のまま) に記録しておき, パーツ一覧の「変更のみ表示」 (`/parts?changes=only`) でまとめてコミットする.
実装は [src/state/useWorkingChanges.ts](../src/state/useWorkingChanges.ts) (記録・コミット),
[src/working_changes_storage.ts](../src/working_changes_storage.ts) (保存形式), [src/components/WorkingChanges.tsx](../src/components/WorkingChanges.tsx) (変更の一覧とコミット).

- 記録はパーツの定義全体 (`PartChange`) をパーツ ID ごとに 1 つ持つ
- コミットはプロジェクトごとの `project_commit` ([project.md](project.md)). プロジェクトの今の全モジュールのパーツに作業中の変更を重ねたもの
  (`buildCommitModules`) を, 表示しているブランチの最新コミットを親にして署名して送る. 受け付けられたらそのプロジェクトのモジュールの変更を記録から消す
- 未コミットの変更があるパーツはエクスプローラーに印を出し, アクティビティバーの「プロジェクト」に件数を出す
- 「変更」ページは置かず, パーツ一覧 (`pages/parts.tsx`) で見る. 一覧はコミット済みのパーツに作業中の変更を重ねて出し,
  新しいパーツは「新規」, 変えたパーツは「●」, 削除したパーツは取り消し線と「削除」のバッジ (`.part-card[data-status]`).
  「変更のみ表示」ボタンで `?changes=only` にすると, 変更の一覧 (破棄・すべて破棄) とコミットの欄 (`WorkingChanges`) になる.
  状態を URL に持つので, 取り込み (`MergeBranchPanel`) やコマンドパレットからは `CHANGES_ONLY_HREF` へリンクする
- コミット前の型検査は上の「型エラー表示」を参照
- パーツとモジュールの公開/非公開の変更も作業中の変更になる. 参照できないパーツへの参照はコミット前の検査で出し,
  式エディタの選択肢からも外す ([visibility.md](visibility.md))

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
- 文字列リテラルの改行 (#800): 文字列リテラルは空白・改行をそのまま見せる (`white-space: pre`).
  改行を含むと複数行のバッジになり, それを含む式は 1 行に並べず子を縦に並べる
  (`containsMultilineLabel`. 幅は一番長い行, 高さは行数分. [src/tree_layout/engine.ts](../src/tree_layout/engine.ts)).
  入力欄は textarea で, Shift + Enter で改行し, Enter / Escape でツリーに戻る (`useTreeKeyboard`).
  改行の入力で 1 行 ⇔ 複数行のレイアウトが変わると親の描画が変わって入力欄が作り直されるので,
  カーソルの位置を覚えておき (`editingStringCaret`), 作り直した入力欄では全選択せずその位置に戻す.
  `\r` は CSS で空白として扱われるので見た目には出ない
  複数行の式の枠は `max-width: 100%` にせず `min-width: max-content` にし, 長い行があっても背景を中身の幅まで広げる
  (はみ出した分は式のツリーの枠 `.expression-tree-container` を横にスクロールして見る)
- 関数のパーツの引数名の変更: 式の根の関数の引数名か, パーツの型の行の引数名を変えると, 型と式の根の関数の引数名を揃え,
  そのパーツを呼び出している式の引数名 (`f(x: ...)` の `x`) も合わせて変える. 呼び出しは引数を型の引数名で渡すので,
  直さないと呼び出し側が型エラーになるため.
  - 同じ位置の名前が変わったものだけを変更とみなす (引数の数が変わったときは何もしない. `parameterRenames`)
  - 自分自身の再帰呼び出しはこのパーツの変更に, 他のパーツの呼び出しはそのパーツの作業中の変更に入れる (`renameCallersOf`).
    作業中の変更がすでにあるパーツはその式を直す. 他のパーツの変更はこのページの Undo では戻らない
  - 実装は [src/tree_layout/rename_arguments.ts](../src/tree_layout/rename_arguments.ts) と `pages/part/[id].tsx` の `editPart`
- 関数の型を期待する位置 (`core.list-map` の `f:` など) で置換メニューから選んだ式は, その型の引数を持つラムダ式の本体にする
  (関数は値として書けないため. [call-syntax.md](call-syntax.md)). 例えば `f:` で `std.abs` を選ぶと `(item) => std.abs(x: item)` になる.
  - 期待する型は選んだ位置で型チェッカーに聞いた型を `applySelection` に渡す. 型が届く前に選択肢を選んだときは届くのを待ってから置き換える
    (`expectedTypeRef`. E2E で素早く選ぶと包まれないことがあった)
  - その位置がすでにラムダ式なら, 引数をそのまま使い本体だけを置き換える
  - 本体の呼び出しの未入力の引数には, 同じ名前のラムダ式の引数を, 無ければ残りの引数を順に入れる (`applySelectionInLambda`, `src/tree_layout/selection.ts`)
  - 未入力 (`hole`) を選んだときは包まない
- 関数型の引数を持つパーツ・関数型の変数を選んで呼び出しを作るときは, その引数を本体が未入力のラムダ式にしておく
  (`core.list-map` を選ぶと `core.list-map(T: □, U: □, f: (item) => □, xs: □)`. `partSelection`, `src/tree_layout/selection.ts`).
  引数の型はパーツの型・変数の型 (`partParameters`, `variableParameters`) から求める
- 定義への移動: 変数・パーツの参照 (とその呼び出し) を選んだときの `go-to-definition`, ツリーで F12,
  または名前を Ctrl / Cmd + クリック (VSCode などの IDE と同じ).
  変数ならその変数を定義している名前 (関数の引数名・let の変数名・match で束縛する変数の名前) を選び,
  パーツならそのパーツの詳細ページ (`/part/{id}`) を開く. 移動先は
  [src/tree_layout/go_to_definition.ts](../src/tree_layout/go_to_definition.ts) の `findDefinitionTarget` で決める.
  Ctrl / Cmd + クリックは子の無いノード (名前) だけが対象で, 移動先が無ければ普通のクリックと同じく選ぶ.
  Ctrl / Cmd を押している間は, ホバーしている名前が移動できるならバッジに下線を引く (`data-link="true"`).
  macOS の Ctrl + クリックはブラウザが右クリックとして扱うので, Mac では Cmd + クリックを使う.
  定義はルートから選んだ式までのパスを降りながら集め (`findVariableDefinitionPath`), 内側の定義が外側の同じ ID を隠す.
  let の束縛の値からはそれより前の束縛だけが見える. 定義が式の外 (未定義の変数) なら選択肢を出さない
- リストの要素の操作 ([src/tree_layout/list_items.ts](../src/tree_layout/list_items.ts)):
  リスト (`list`) を選ぶと `add-item` (末尾に未入力の要素を足す), 要素を選ぶと
  `insert-item-before` / `insert-item-after` / `move-item-earlier` / `move-item-later` / `delete-item`.
  足した要素・動かした要素を選び, 消したときは同じ位置の次の要素 (末尾なら前の要素, 空になればリスト) を選ぶ
- let の束縛の操作 ([src/tree_layout/let_bindings.ts](../src/tree_layout/let_bindings.ts)):
  let を選ぶと `add-binding` (末尾に足す), 束縛の値を選ぶと `insert-binding-before` / `insert-binding-after` /
  `move-binding-earlier` / `move-binding-later` / `delete-binding`. 新しい束縛は式全体で使われていない変数 ID
  (`nextVariableId`) と名前 (`x`, `x1`, ...) にし, 値を未入力にしてその値を選ぶ. 最後の束縛を消すと let をやめて本体だけにする.
  消した変数を参照している式・前へ動かして見えなくなった変数は, 型チェッカーが型エラーにする
- Variant (タグ付きの値) の作成 ([src/tree_layout/variant.ts](../src/tree_layout/variant.ts)):
  直和型の型パーツ (式が `type_union` の型パーツ) のタグを `sample.option-number.some` のような名前の選択肢に出す
  (`some` と打てば見つかる). 選ぶと型パーツを指定した Variant (`type_part: some(ID)`) にし,
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
- 型は文字列にせず, 式と同じツリー表示エンジンで描く (下の「型の表示」). コンパイラ組み込みの型は `builtin minus` と出す
- 型のツリーエディタ (`mode="type"`) では型は聞かず, 型パーツの参照の名前と説明だけ出す
- 置換メニューを開いている間は出さない. カードは `pointer-events: none` なのでクリックの邪魔をしない
- カードは `createPortal` で `document.body` に出し, popover (top layer, `popover="manual"`) の `position: fixed` にして
  位置は画面 (viewport) の座標で JS が決める (`hoverCardPosition`, `hover_info.ts`. 単体テストあり).
  式の下に収まらなければ式の上に出し, 左右は画面の中に収める. スクロール・リサイズでは位置を測り直す.
  以前はツリーの枠の中に `position: absolute` で置いていたので, 枠の `overflow-x: auto` (これがあると `overflow-y` も
  `auto` 扱いになる) のせいで, 下の方の式をホバーするとカードが切れたり枠の中に縦スクロールバーが出たりしていた (#751).
  枠の中に置くと, 枠の中の `.tree-badge` などを探すセレクター (E2E も) にカードの型のツリーが混ざるので body に出している

### 型の表示

期待する型や推論した型など, 型 (`core.type-ast` の値) を見せるところは文字列 (`formatTypeAst`) にせず,
式と同じツリー表示エンジン (`engine.ts` の `computeLayout` + `TreeLayoutRenderer`) で読み取り専用で描く
([src/tree_layout/TypeTreeView.tsx](../src/tree_layout/TypeTreeView.tsx)).
型は `partTypeToExpression` (`part_type.ts`) で型の式にしてから描くので, パーツの型の行のツリーエディタと同じ見た目になり,
長い型 (大きなレコード・直和型など) は式と同じく幅を超えると縦に並ぶ.

- 使っているところ: 式のホバーカードの型, 置換メニューの上の「期待する型」(`.dropdown-expected-type`)
- `data-node-id` は `type-view` で始めて, 式のツリーのノード ID (`root...`) と重ならないようにしている
- 型エラーの文言 (`outcomeErrorMessage`) と選択肢の横の短い型 (`partTypeText`) は 1 行のテキストのまま
- ホバーしているノードはツリーの枠の `mouseover` の `event.target` から `closest("[data-node-id]")` で決める.
  各ノードの `onMouseEnter` で決めると, ツリーの外から一度に複数の入れ子のノードに入ったときに
  React が外側のノードの mouseenter を後に呼ぶことがあり, いちばん外側 (ルート) のノードになってしまう

### 元に戻す (Undo) / やり直す (Redo)

パーツ詳細 (`pages/part/[id].tsx`) の編集は, ヘッダー (definy のロゴの右) のボタンか Ctrl / Cmd + Z で元に戻し,
Ctrl / Cmd + Shift + Z (Ctrl + Y) でやり直せる.
ヘッダーのボタンはページごとの履歴をつなぐだけで, ページが `useDefiny().setPageUndo` で `PageUndoControls` を渡す
(離れるときに `null` に戻す). 渡していないページではボタンを押せない. 履歴の計算は [src/undo_history.ts](../src/undo_history.ts) (単体テストあり).

- 履歴には, 変える前のそのパーツの作業中の変更 (`PartChange`. 変更が無ければ `undefined`) を積む.
  元に戻して変更が無い状態になれば作業中の変更も消える (`discardWorkingPart`). 「変更を破棄」も元に戻せる
- 名前・説明・式・型のどれを変えても同じ履歴に積む. 元に戻した後に別の変更をするとやり直しの履歴は消える
- 入力欄で続けて打った変更は 1 つにまとめる: 同じ `mergeKey` (名前 `name`, 説明 `description`,
  式の数値・文字列・変数名の入力欄は `text:<パス>`) の変更が 1 秒以内に続けば新しく積まない.
  `ExpressionTreeEditor` の `onChange` と `PartDefinitionTree` の `onExpressionChange` がキーを渡す
- 入力欄 (`input` / `textarea`) にフォーカスがあるときのショートカットはブラウザの入力欄の Undo に任せる
- 実行パネル (`.run-panel`) の中にフォーカスがあるときのショートカットはパーツの履歴に使わない (パネルの式はパーツではないため)
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
    "expression": { "#number": 5 },
    "freeVariables": [{ "id": 0, "name": "x" }]
  }
  ```

  - 式は [value-encoding.md](value-encoding.md) の形のまま (パーツ ID も文字列なので特別な書き方は無い)
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

- パーツの型 (`partType`) は seed や CAS と同じ型の式 (`core.expression` の `type_*` の値) のまま編集する。
  根が未入力 (`hole`) なら型指定なし (`null`) にする
  - 型チェッカーが返す型 (期待する型, ホバーの型) は `core.type-ast` なので, 表示するときに型の式にする
    ([src/type_ast_expression.ts](../src/type_ast_expression.ts). 対応は [part-type.md](part-type.md) の表)
- 型のメニューの候補は number / string / boolean / type / list / function / record / union と,
  型のパーツ (`partType` が `type_type` のパーツ, `part_reference` で参照する). 期待型の推論はしない
- 行の右端の × で型指定をなくす
- 変更は式と同じく作業中の変更 (`PartChange.partType`) に記録する. パーツ詳細は作業中の変更の型を優先して表示し,
  式のツリーの期待型の推論にもその型を使う
- ツリーでは `type_number` などは `number` のように型の名前で出す

### 定義の式の表示と編集

パーツ詳細の見出しの右の切り替えで, 中身を「項目ごと」(doc / type / value) と「定義の式」(def) のどちらで表示するか選べる
(定義の式は [part-definition.md](part-definition.md))。

- 定義の式の行は, 定義の式を `core.part-content` 型の式として式のツリーエディタで編集する
  (`PartDefinitionTree` の `view="definition"`, `partDefinitionType()`)。期待する型が分かるので, 根の選択肢には
  `core.define-part` / `core.define-type` やユーザーが作った定義のパーツが出る
- `core.define-part(...)` / `core.define-type(...)` の呼び出しはその場で評価し, 説明・型・式・公開/非公開にも入れる
- それ以外 (ユーザーが作った定義のパーツの呼び出し) は, ブラウザの評価器 (`wasm/definition_evaluator.wasm`) で評価して入れる。
  参照するパーツの式は作業中の変更 (新しいパーツも) を優先する (`workingExpressionResolver`)。
  評価できなければ「この定義の式は評価して core.part-content になりません」と出す
- 書いた定義の式は作業中の変更 (`PartChange.definition`) に入れ, コミットではそのまま CAS に預ける
  (`toContentAddressedParts`)。項目ごとの表示で説明・型・式・公開/非公開を変えると定義の式は捨て,
  コミットで `core.define-part(...)` の形になる (名前を変えても定義の式は残る)
- その場で評価できない定義の式で定義したパーツは, 最初から定義の式で表示する。項目ごとの表示ではその旨を出す
- 型エラー: ユーザーが作った定義のパーツの呼び出しは `core.part-content` 型の式として検査する。
  `core.define-part(...)` などは評価した型と式を検査し, エラーは定義の式の quote の中の同じ式に出す
  (型チェッカーは quote の中の関数の引数の型を推論できないため, 定義の式のまま検査すると関数でエラーになる)

### ツリーに表示する組み込みの式### ツリーに表示する組み込みの式

`type_list` / `type_code` (`Code<T>` の型) / `quote` (quote 式, [quote.md](quote.md)) は, 子の式をフィールド (quote はペイロードそのもの) に持つ式として `path.ts` の `FIELD_STEPS` (パスの段とフィールド名の対応) で表示・取得・更新する.
`quote` の中は外の変数を使えないので, 中の式にはスコープの変数を渡さない.
`core.list-get` などの組み込みのパーツの呼び出しは, 他のパーツの呼び出し (`call`) と同じく表示する.
`type_union` はバリアントごとに行を分け, ペイロードの型を子の式にする (ペイロードのないバリアントを選ぶと union 全体を選ぶ).
表の対応がない式は, 子を持たないキーワード (式のタグ) として表示されるだけになるので, 新しい式の種類を足したら表にも足すこと

コンパイラ組み込みのパーツ (`core.string-concat` などの式 `{"#builtin": "string_concat"}`) は,
式の直下に組み込みが入っているものとして `builtin string-concat` と表示する (`ast_to_layout/literals.ts`).
表示は式の値 (`_` を `-` にしたもの) から作り, パーツ名は使わない. パーツ名を変えても表示は変わらず,
組み込みかどうかも式で決まる (名前を変えたコミットも, どのアカウントのコミットも受け付ける. `worker/type_check.test.ts`)

### I/O をするプログラムの実行 (wasi.io)

実行パネル ([run-panel.md](run-panel.md)) で実行した結果が `wasi.io` の値なら, そのまま I/O をしながら最後まで動かし,
I/O の記録 (HTTP リクエストの URL と結果など) と `done` のメッセージを実行履歴に出す.
「CORS エラーのときサーバーで仲介する」は設定画面で決める ([wasi-io.md](wasi-io.md)).
式がシークレットリテラルのパーツのページには, 名前と送ってよい宛先の編集, 値の入力, 使用箇所, 使用履歴の欄を出す ([secret.md](secret.md)).

### 履歴

履歴ページ (`/history`, [pages/history.tsx](../pages/history.tsx)) はプロジェクトのコミットを新しい順に並べ, 各コミットのイベント詳細・プロジェクト・作成者へリンクする.
プロジェクトのページ (`/project/{プロジェクト名}`) にも, 表示しているブランチのコミットを新しい順に出す ([project.md](project.md)).
コミットの親は `parent_commit_hash` で, 取り込みのコミットは取り込んだコミットを `merged_commit_hash` に持つ ([branch.md](branch.md)).

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
- カード全体がイベント詳細へのリンク. その上に作成者 (アカウント)・モジュール名・パーツ (先頭 6 個のチップ) のリンクを重ねる.
  `<a>` の中に `<a>` は置けないので, カードは `<article>` にし, 種別名の `.event-card-link` の `::after` をカード全体に広げ,
  ほかのリンクは `position: relative; z-index: 1` で手前に出す. 日付の見出し (sticky) はそれより手前の `z-index: 2`.
  E2E でカードの空白 (時刻など) を押すときは, 上にリンクが重なっているので `click({ force: true })` にする
- フィルターのチップには種別ごとの件数を出す
- 幅 640px 以下ではマーカーと縦線を消してカードだけにする
- タイムラインの描画は [src/components/EventTimeline.tsx](../src/components/EventTimeline.tsx) にまとめ, アカウントのページでも使う

### イベント詳細とアカウントのページ

- イベント詳細 (`/event/{イベントハッシュ}`) は, 種別の色の見出し (要約), 詳細 (作成者・日時・署名の検証結果・ハッシュ・サイズ),
  中身の欄を出す. モジュールコミットはモジュール・親コミット・次のコミット (同じ親を持つコミット)・メッセージ全文・パーツ一覧
  (各パーツのページへのリンク), アカウント作成はアカウント名と ID. 見つからないときは読み込み中か「見つかりません」を出す
- アカウントのページ (`/account/{アカウント ID}`, [pages/account/[id].tsx](../pages/account/[id].tsx)) は, 名前・ID・作成日,
  イベント・コミット・モジュールの数, コミットしたモジュール, そのアカウントのイベントのタイムラインを出す.
  アカウント一覧のカードもこのページへのリンク
- アカウントへのリンクはどこでも `AccountLink` (頭文字のアバター + 名前, 名前が無ければ ID の先頭) を使う.
  パーツのページへのリンクは `/part/{モジュール名}.{パーツ名}`, モジュールは `/module/{モジュール名}`.
  パーツのページのパンくずのモジュール名もモジュールのページへのリンク
- ブラウザは全イベントを読まない (下の「読み込むイベント」). 読んでいないイベント (古い親コミットなど) は
  イベント詳細のページを開いたときに `GetEvent` で読む. 「次のコミット」は読んだコミットの中からだけ探す

### パーツの作成と削除

UI だけで definy の新しい関数を書けるようにする (#760). ロジックは [src/new_part.ts](../src/new_part.ts)。

- 作成: `/new-part?module=モジュール名` ([pages/new-part.tsx](../pages/new-part.tsx)). エクスプローラーの `+` と
  モジュールのページの「+ 新しいパーツ」から開く. モジュール名・パーツ名・種類を決める
  - 関数: 引数名 (カンマ区切り) を書く. 型は引数・戻り値とも数値で始め (型の行で変える), 式は引数付きのラムダ式 `(x) => □`
  - 値: 型無し, 式は未入力
  - 型: 型パーツ (`#type`), 宣言は未入力
- 名前は空にできず, `.` と空白を使えない. 同じモジュールの (作業中の変更を重ねた) パーツと名前が重なってはいけない
- 新しいパーツは作業中の変更 (キーは `モジュール名.パーツ名`) として作り, そのままパーツのページで編集する.
  まだ無いモジュール名ならコミットでモジュールができる (main ブランチ. [branch.md](branch.md))
- 削除: パーツのページの「パーツを削除」. 作業中の変更に `deleted: true` を付け, コミットでモジュールから外す.
  削除を取り消せる. 参照しているパーツがあれば先に確認する (`partsReferencing`). コミットしていない新しいパーツは作業中の変更を捨てる
- コミットするパーツは `overlayWorkingChanges` で作る: そのモジュールの変更だけを重ね, 名前を変えたパーツは元の名前を外す
  (以前は他のモジュールの変更も入り, 名前を変えると元の名前のパーツも残った)
- 変更のページの検査はサーバーと同じく, 未入力のあるコミットを拒否する (アカウントによらない).
  未入力のままではコミットボタンを押せない
- パーツのページは, イベントを読み込むまで読み込み中, 無ければ「パーツが見つかりません」を出す (#764).
  以前は読み込み前に仮のパーツ (型無し, 値 0) を編集でき, 本物のパーツを上書きする作業中の変更ができた

### 読み込むイベント

[src/state/useEvents.ts](../src/state/useEvents.ts) はモジュールの状態を全イベントからではなく, 次のものから作る (#761)。

- `GetProjectBranches`: 各プロジェクトの各ブランチの作成者・コミット数・最新のコミットのイベント。プロジェクト・モジュール・パーツ・型環境はこれだけで作れる ([project.md](project.md))
- `GetEvents` の最新の 100 件: タイムライン
- `GetEvents` (`eventType: "create_account"`) の全件: アカウント名 (小さいのでページングして全部読む)
- `loadEvent` (`GetEvent`) で読んだもの: イベント詳細のページ, モジュールのページのコミット履歴 (最新から親を 1 件ずつ, 50 件まで)
- `GetContent`: コミットのパーツの式 (CAS. [content-addressed.md](content-addressed.md)「差分ハッシュ・ネゴシエーション方式」)。
  イベントを足す前に読むので, 表示するときには式が埋まっている。読んだ式はページを開いている間使い回す

以前は最新の 100 件だけからモジュールを作っていたので, 新しいイベントが 100 件を超えると seed の core などが UI と型環境から消えた。
読んだイベントはどれも `verifyEventRecord` で検証する (同じイベントは 1 度だけ)。サーバーが返す作成者・コミット数は検証できない
(最初のコミットを読まないため) が, コミット先を決めるのに使うだけで, 規則はサーバーが確かめる。

### 大きなパーツの編集 (#762)

core の大きなパーツ (`core.compile-builtin-call` はバッジ約 1560 個) でも 1 回の変更で全部を描き直さない。
プロファイルでは, 1 回の変更にかかる時間の大半は React が式のツリー全体・置換メニューの候補・エクスプローラーの全行を描き直すことだった。

- `reuseUnchangedNodes` ([engine.ts](../src/tree_layout/engine.ts)): 式を変えて作り直したレイアウトの木のうち,
  前と同じ部分木は前のノード (同じオブジェクト) にする
- `TreeLayoutRenderer`: ノードごとに `memo` し, ノードが同じで, 選択・ホバー・型エラーなどがその部分木の中で変わっていなければ描画を飛ばす。
  ID もパスも親子で入れ子になるとは限らない (match のアーム, 表の行) ので, 部分木に入っているかは行きがけ順の番号の範囲で調べる。
  関数の props は最新のものを呼ぶ変わらない関数にする
- 置換メニューの候補 (`OptionItem`) とエクスプローラーのパーツの行 (`PartNode`) も `memo` する
- `Link` は表示言語だけのコンテキスト (`useLanguage`) を使う。`useDefiny()` は式を変えるたびに変わるので, それを使う部品は親を `memo` しても描き直される

本番ビルド・headless Chromium で数値を 1 つ書き換えたとき, 1 キーのイベント処理 (トレースの EventDispatch) は
`core.compile-builtin-call` で約 350ms から約 120ms, `core.type-check-against-unlocated` で約 170ms から約 90ms になった。
残りはブラウザの描画 (Layerize・Paint), 期待する型の問い合わせ (`findExpectedType`), レイアウトの作り直し。

### ページの切り替えと読み込み

ページ全体を opacity: 0 からフェードインさせない. アニメーションが進まない環境 (非表示のタブ・プレビューなど) で
ページが透明・薄暗いまま残るため. 読み込み中はエディタ上端の細いバー (`.editor-loading-bar`) だけで示す.

### ページタイトル

タブのタイトルは開いているページに合わせて `ページ名 | definy` にする (トップのイベントページは `definy` だけ).

- Void 標準のやり方で, 各ページの `.server.ts` から `export const head = titleHead(en, ja, eo)` (`src/page_head.ts`) を出す.
  表示言語は要求の URL の `?lang=` で決まるので, サーバーが返す HTML にも表示言語のタイトルが入り,
  クライアント側の遷移や言語の切り替えでも Void がタイトルを入れ替える
- 一覧ページの名前は見出しと同じ文言 (例: `パーツ一覧 | definy`), イベント詳細は `イベント <ハッシュ先頭 16 文字>` (URL から決まる)
- パーツ詳細 (`モジュール名.パーツ名`, 作業中の名前の変更も反映) とモジュール詳細 (モジュール名) は,
  名前がクライアントで取得するデータから決まるので head() では仮に `パーツ` / `モジュール` とし,
  コンポーネントで `usePageTitle(名前)` (`src/page_title.ts`) を呼んで置き換える
- Void はクライアント側の遷移で新しいページを描画したあとに head() のタイトルを `document.title` に入れ直すので,
  `usePageTitle` は `useNavigation().state` が `idle` に戻ったときにも設定し直す
- `void.json` の `titleTemplate` は使わない. 使うとトップの `definy` も `definy | definy` になる

## SSR とハイドレーション (React 19 + Void 実装)

Void はページを SSR してからクライアントでハイドレーションするので, 初回レンダーの結果が SSR とクライアントで食い違うと
ハイドレーション不一致になる. そのため以下を守る.

- `localStorage` / `navigator` / `window.location` を `useState` の初期化やレンダー中に読まない.
  初回は SSR と同じ既定値でレンダーし, マウント後の `useEffect` で保存値を反映する
  (`src/state.tsx` の作業中の変更, `src/wasi_io_browser.ts` のシークレットの値・使用履歴と CORS 仲介の設定, `ExplorerSidebar` の幅)
- URL は SSR でも `useRouter()` (`@void/react`) で読める. SSR では `createSsrRouter(リクエストの URL)` が使われ,
  `path` や `query` はクエリ文字列も含めてクライアントと一致する. 現在のパスは `window.location.pathname` ではなく
  `useRouter().path` を使う (`ActivityBar`)
- 作業中の変更 (`definy.working_changes.v2`) はマウント後に読み込むが, 保存するのはユーザー操作による
  `updateWorkingPart` などのときだけなので, 読み込み前の空の状態で保存済みの変更を消すことはない

### 表示言語の決め方

表示言語は URL クエリ `?lang=` (`en` / `ja` / `eo`) だけで決める. `localStorage` などには保存しない.

- ブラウザがページを開いた要求 (GET で Accept に `text/html` を含む) に `?lang=` が無い (か不正な) ときは,
  ミドルウェア (`middleware/01.definy.ts`) が `Accept-Language` から決めた言語 (`languageFromAcceptLanguage`, 対応言語が無ければ `en`)
  の `?lang=` を付けた URL に 302 でリダイレクトする
- `useUiState` は `useRouter().query` の `?lang=` から言語を読むだけ. SSR でもクライアントでも同じ値になるので, ちらつきもハイドレーション不一致も起きない
- サイト内のリンクは `@void/react` の `Link` を直接使わず, 今の言語の `?lang=` を付ける `src/components/Link.tsx` を使う.
  `router.visit` で移動するときは `withLanguage(パス, 言語)` を通す
- 言語を切り替えると `?lang=` を書き換えた URL へ `router.visit` (replace) する. head() も新しい言語で動くのでタイトルも変わる
- `<html lang>` もミドルウェアの `headDefaults` で `?lang=` に合わせる (SSR のみ)
