アカウント作成やログインの画面はよく専用のページに遷移して、そこで処理が終わったら元のページに戻るというUIが採用されている.
しかし、definyではその画面内のダイアログで処理を完結させるUIにしたい.
そうすることによって,
ブラウザの戻るボタンを押してもログインのための履歴で汚れることはなくなる.
`<dialog>` 要素を使うことによって,
スマホで戻るジェスチャーをしてログインダイアログを閉じることもできる.

## ワークベンチ (IDE 風レイアウト)

画面全体は `definy-ui/src/workbench.rs` の `Workbench` で, VS Code のような IDE 風の構成にしている.

| 領域 | 内容 | 実装 |
| --- | --- | --- |
| タイトルバー | サイドバー開閉ボタン・ロゴ・現在のページ名・言語・アカウント | `header.rs` の `HeaderView` |
| アクティビティバー | イベント / パーツ / モジュール / アカウント / デプロイ / About / 設定 への切り替え | `workbench.rs` の `ActivityBar` |
| エクスプローラー | モジュール → パーツの木構造. 開いているパーツ・モジュールを強調表示 | `workbench.rs` の `ExplorerSidebar` |
| エディタ領域 | 現在のページのタブ・パンくずリストと, 各ページの本体. この領域だけがスクロールする | `workbench.rs` の `EditorTabBar` |
| ステータスバー | 接続状態 (クリックで強制オフライン切替)・未送信ローカルイベント数・ページ名・言語 | `header.rs` の `StatusBarView` |

- `body` はスクロールさせず, エディタ領域 (`.workbench-editor-scroll`) が独立してスクロールする.
  ページ側で `window` のスクロール位置に依存する処理は書かないこと
- エクスプローラーのモジュールの開閉は `<details>` を使い, 状態を持たない
- サイドバーの開閉状態は `SidebarToggle` (context) の 1 つの bool で持つ.
  幅の広い画面では `true` で隠し, 幅 760px 以下では `true` でドロワーとして表示する (既定は隠れた状態).
  狭い画面ではアクティビティバーが下部のタブバーになり, ステータスバーは隠れる
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
- 型エラーのあるパーツは赤い印, モジュールにはエラー件数を出す. 判定は definy 製の型チェッカー
  (下の「型エラー表示」)

### 型エラー表示

型エラーの判定は, サーバーや seed の検証と同じ definy 製の型チェッカー (`core.type-check-against`) で行う.
入口は `definy_core::self_hosted_type_check::check_parts` で, UI 側は `definy-ui/src/self_hosted_type_check.rs`.

- 取得済みイベントから `core.type-check-against` を持つ `core` モジュールを探し, 全パーツの型を型環境にして検査する.
  `core` がまだ無い (読み込み前) ときは何も表示しない
- 1 回の検査は式を Wasm にコンパイルして実行するので重い (ネイティブの release で 1 回 400ms ほど, 大半がコンパイル).
  そのため同期的に描画中に検査しない
  - エクスプローラー: 取得済みイベントの数が変わったら裏で 4 パーツずつ検査し, 合間に `setTimeout(0)` でブラウザへ処理を返す.
    結果は `PART_CHECK_RESULTS` (GlobalSignal) に入れ, 全パーツの型が変わらず式 (content hash) も同じパーツは検査し直さない
  - パーツ詳細: 編集中の式を, 編集が 500ms 止まってから検査し「型チェック (definy 製)」の行に出す
- 型エラーの中の型 (`core.type-ast`) は `List<user>` のように表示し, `reference` 型はパーツ名にする
- Rust 製の型チェッカー (`expression_editor::diagnostics`) は編集補助 (ノードごとの期待型・選択肢の絞り込み・
  ツリーエディタの件数表示) にだけ使う. 合否の正本は definy 製の型チェッカー

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
