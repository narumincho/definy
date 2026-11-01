# プロジェクトのブランチ

definy には GitHub のフォークは無く, ブランチだけで編集を分ける (2026-10-24 の決定, issue #765)。

- ブランチはプロジェクトごとにある ([project.md](project.md). 2026-10-24 まではモジュールごとだった)。プロジェクトの最初のコミットは
  `main` ブランチに入り, そのアカウントが `main` の作成者になる (seed の definy, sample プロジェクトはシステムアカウント)。
- 誰でも新しいブランチを作れる。ブランチにコミットできるのはそのブランチを作ったアカウントだけ。
- 他のアカウントのプロジェクトを変えたいときは, そのプロジェクトに自分のブランチを作ってコミットする。

## ID

モジュール ID はモジュール名だけで決まる (`deriveModuleIdBytes(moduleName)`, `src/part_ids.ts`)。
パーツ ID は `H(モジュール ID, ":part:", パーツ名)` なので, プロジェクトのどのブランチでも同じパーツは同じ ID になる。
以前はモジュール ID がアカウントとモジュール名で決まり, 同じ名前のモジュールでもアカウントごとに別のモジュールだった。

## コミット

`core.project-commit` に `branch: string` がある ([event.md](event.md))。規則は definy 製の `core.check-event-branch`
(`core.check-event` から呼ぶ) が決める:

| 状況                                          | 受け付けるコミット                                         | 理由 (`core.event-rejection`)                         |
| :-------------------------------------------- | :--------------------------------------------------------- | :---------------------------------------------------- |
| ブランチ名が空                                | 受け付けない                                               | `empty_branch_name`                                   |
| プロジェクトにまだコミットが無い              | `main` に親無し                                            | `first_branch_must_be_main`, `parent_commit_mismatch` |
| ブランチがある                                | ブランチの作成者だけが, ブランチの最新のコミットを親にする | `not_branch_creator`, `parent_commit_mismatch`        |
| ブランチが無い (プロジェクトにコミットがある) | 誰でも, 同じプロジェクトのどれかのコミットを親にする       | `parent_commit_mismatch`                              |

- ブランチの作成者は, そのブランチの最初の (時刻が最小の) コミットのアカウント。
- ブランチの最新は時刻が最大のコミット。同じ時刻のコミットは先のものが最新のままになる (`core.branch-latest-commit`)。
- 規則が使う状態 (`core.event-check-state`) はサーバーがストアから集める (definy の `definy.submit-event`):
  `branch_latest_commit_hash`, `is_branch_creator`, `project_has_commits`, `parent_in_project`, `merged_in_project`, `modules_in_other_projects`。

## サーバーの型検査

コミットを型検査するとき, コミットするプロジェクト以外のパーツは各プロジェクトの `main` の最新のコミットのものを使う
(`loadLatestMainCommits`)。ブランチのパーツは他のプロジェクトから見えない。
どれが最新かは, 下の `core.project-branches` のまとめの `main` の `latest_event_hash`。

## UI

- ブランチの一覧はサーバーの `GetProjectBranches` から受け取る (ブラウザは全イベントを読まない. [ui.md](ui.md)「読み込むイベント」)。
  `GetProjectBranches` は definy 製の `definy.get-project-branches` が処理する ([service.md](service.md))。
  ブランチの集計は definy 製の `core.project-branches`。サーバーの `summarizeBranches` (`src/branches.ts`) も
  `npm run build:seeds` のコンパイルした `wasm/branch_summarizer.wasm` (コミットしない) でこれを呼ぶ。ブランチは最初に現れた順で,
  作成者・最新のコミット・コミットの数は規則 (`core.branch-first-commit`, `core.branch-latest-commit`) と同じ求め方。
  テストの `latestCommitHashOf` (`worker/commit_store.ts`) もこれを使う
- 表示するブランチはプロジェクトごとに選ぶ (各ページの階層のパンくずの「ブランチ」. 既定は `main`, localStorage `definy.selected_branches.v2`)。
  モジュール・パーツの一覧, パーツの詳細, 型環境 (`committedParts`) は各プロジェクトの表示しているブランチのものになる
  (`useEvents`)。モジュールのページは, そのモジュールの入っているプロジェクトの表示しているブランチを出す。
- コミット履歴は表示しているブランチの最新のコミットから親をたどる (読んでいないコミットは 1 件ずつ読む, 50 件まで)。ブランチを作る前の `main` のコミットも入る。
- 作業中の変更は表示しているブランチに重ねる。コミット先は `commitTarget` (`src/branches.ts`) が決める:
  - プロジェクトにコミットが無い → `main` に親無し (新しいプロジェクト)
  - 表示しているブランチを自分が作った → そのブランチに, その最新のコミットを親に
  - 他のアカウントのブランチ → そこから新しいブランチを作る。名前は変更のページで決める (既定はアカウント名. 使われていれば `-2`, `-3`, ...)。
    コミットすると新しいブランチを表示する
- 注意: UI の型検査は表示しているブランチで型環境を作るが, サーバーは他のプロジェクトを `main` で検査する。
  他のプロジェクトのブランチを表示したままコミットすると, UI では通ってもサーバーで型エラーになることがある。

## ブランチの作成

エクスプローラーの「ブランチの追加」 (`/project/{名前}?add=branch`) から, プロジェクトのページの「新しいブランチ」の欄 (`src/components/NewBranchForm.tsx`) で作る。

- 表示しているブランチの最新のコミットを親にして, 同じ中身 (とこのプロジェクトの作業中の変更) を新しいブランチ名でコミットする。
  規則の「ブランチが無い (プロジェクトにコミットがある) → 誰でも, 同じプロジェクトのどれかのコミットを親にする」に当たる
- 自分のブランチを表示しているときも新しいブランチを作る (`commitWorkingChanges` の `createBranch`)。作ると新しいブランチを表示する
- 名前の既定はアカウント名 (使われていれば `-2`, `-3`, ...)。すでにあるブランチの名前は使えない

## 取り込み

他のブランチの変更を main に入れる (GitHub のプルリクエストのマージにあたる)。

- `core.project-commit` の `merged_commit_hash: option<string>` に取り込んだコミットを持つ。親 (`parent_commit_hash`) は今までどおり
  コミット先のブランチの最新のコミット。規則は `core.check-event-merge`: 取り込むのは同じプロジェクトのコミット
  (`merged_commit_not_in_project`. 状態 `merged_in_project` はサーバーが集める)。取り込むコミットを選べるのはコミット先のブランチの作成者だけ
  (ブランチの規則と同じ)
- UI: main を作ったアカウントがプロジェクトのページで他のブランチを表示すると「… を main に取り込む」が出る
  (`src/components/MergeBranchPanel.tsx`)。押すと
  1. 共通の祖先 (取り込みの基準) を探す (`findMergeBase`, `src/merge.ts`)。親と取り込んだコミットをたどり, 読んでいないコミットは `GetEvent` で読む
  2. パーツごとの 3 方向マージ (`mergeParts`. プロジェクトの全パーツを `モジュール名.パーツ名` で並べる): 片方だけが変えたパーツはその変更を使う。
     両方が違うように変えたパーツ (衝突) は取り込む側を使い, プロジェクトのページに知らせる。無いパーツは削除として扱う。
     取り込むブランチにだけあるモジュールはこのプロジェクトの新しいモジュールになる
  3. main のパーツとの差を作業中の変更にし (`mergeToWorkingChanges`. 無くなったパーツは `deleted`), 取り込むコミットを
     `WorkingChanges.merges` に入れ, main を表示する。変更のページで確かめ (型検査も), コミットすると `merged_commit_hash` が入る
- 取り込む前にそのプロジェクトの作業中の変更があれば取り込まない (先にコミットか破棄)。取り込みをやめると作業中の変更も捨てる
- 取り込むものが無ければ (main にもう入っている) 何もしない
- プロジェクトのページのコミット履歴は, 取り込みのコミットに取り込んだコミットへのリンクを出す (履歴は親だけをたどる)

## seed の書き戻し

`export:seeds` はシステムアカウントの `main` のコミットだけを書き出す (`src/seed_export.ts`)。
他のアカウントのブランチは seed に入らない。

## 今後

- 取り込みの衝突をパーツごとに選べるようにする (今は取り込む側を使い, 作業中の変更として直す)。式の中まで見たマージ。
- main 以外の自分のブランチへの取り込み, 取り込みの依頼 (プルリクエストにあたるもの)。
- ブランチに作成者以外もコミットできるようにする (共同編集者)。
- ブランチの削除・名前の変更。
- サーバーの型検査も, 他のプロジェクトのブランチを指定できるようにするか。
