# プロジェクト

モジュールをまとめる単位 (issue #624)。コミット・ブランチ・取り込みはモジュールではなくプロジェクトを単位にする。

- プロジェクトは名前で決まり, モジュールをいくつか持つ。プロジェクトのコミットはその時点のプロジェクトの全モジュールと全パーツを持つ
  (`core.project-commit`. [event.md](event.md))。
- ブランチはプロジェクトにある ([branch.md](branch.md))。プロジェクトの最初のコミットは `main` に入り, そのアカウントが `main` の作成者になる。
- モジュール名は (今までどおり) 全体で一意。モジュール ID はモジュール名だけで決まり (`deriveModuleIdBytes`), パーツ ID も変わらない。
  1 つのモジュールは 1 つのプロジェクトにだけ入る: 他のプロジェクトの各ブランチの最新のコミットにあるモジュールの名前は使えない
  (`core.check-event` の `module_in_other_project`)。
- モジュールとパーツには公開/非公開がある ([visibility.md](visibility.md))。
- コミットからモジュールを外すと, そのモジュールはプロジェクトから無くなる (他のプロジェクトが同じ名前を使えるのは, そのモジュールが
  どのブランチの最新のコミットにも無くなってから)。

## 受け付ける規則

`core.check-event` ([event.md](event.md)「受け付ける規則」) のうちプロジェクトに関わるもの:

| 規則                                               | 理由 (`core.event-rejection`)                  |
| :------------------------------------------------- | :--------------------------------------------- |
| プロジェクト名は空にできない                       | `empty_project_name`                           |
| モジュール名は空にできない                         | `empty_module_name`                            |
| モジュール名はコミットの中で重複できない           | `duplicate_module_name(name)`                  |
| 他のプロジェクトのモジュールの名前は使えない       | `module_in_other_project(name)`                |
| パーツ名は空にできず, モジュールの中で重複できない | `empty_part_name`, `duplicate_part_name(name)` |

- モジュール名の規則は definy 製の `core.check-event-module-names` (各モジュールのパーツ名は `core.check-event-part-names`)。
- 他のプロジェクトのモジュールはサーバーが集めて `core.event-check-state` の `modules_in_other_projects` に入れる
  (コミットのモジュール名のうち, 他のプロジェクトの各ブランチの最新のコミットにあるもの. `branchStateOf`, `worker/type_check.ts`)。
- モジュールの無いプロジェクトのコミットも受け付ける。

## 型検査

- サーバーはプロジェクトのコミットの全モジュールのパーツをまとめて検査する (`checkSubmittedProjectCommit`, `worker/type_check.ts`)。
  型環境は各プロジェクトの `main` の最新のコミットのパーツに, このコミットのパーツを重ねたもの。このプロジェクトの今のモジュール
  (`main` の最新のコミットのもの) は型環境から外し, コミットのモジュールで置き換える (無くなったモジュールのパーツは見えなくなる)。
- 型チェッカー (`core.type-checker`) は 1 つのモジュールへのコミットとして検査するので, 置き換えるモジュールのパーツを
  1 つのモジュール (`#replaced`) のものとして渡す (`checkModuleCommitParts` の `replacedModuleIds`, `src/self_hosted_type_check.ts`)。
  型が 1 つも変わっていなければ, 式の変わったパーツだけを検査するのは今までどおり。
- 型エラーのメッセージのパーツ名は `モジュール名.パーツ名`。
- UI のコミット前の検査 (`checkCommitTypes`) は, 作業中の変更の無いモジュールのパーツを型環境のパーツと同じキーにして,
  型が変わらなければ検査しない (コミットには core など大きなモジュールも入るため)。

## seed

- ビルトインのプロジェクトは `seeds/projects/*.json` (`project_name`, `project_description`, `message`, `modules`)。
  各モジュールの正本は今までどおり `seeds/<モジュール名>.json` (コミットのメッセージはプロジェクトのほうに移した)。
- 今のビルトインのプロジェクト:
  - `definy`: `definy`, `core`, `std`, `wasi`, `wasm`
  - `sample`: `sample`
- `npm run build:seeds` はプロジェクトごとに 1 つのコミット (システムアカウントの `main`) を作る (`scripts/generate_seed_bundle.ts`, `src/seed_projects.ts`)。
- `npm run export:seeds` はビルトインのプロジェクトのシステムアカウントの `main` の最新のコミットを, プロジェクトの seed と
  各モジュールの seed に書き戻す ([seed-export.md](seed-export.md))。

## UI

- プロジェクトのページ (`/project/{プロジェクト名}`, `pages/project/[id].tsx`): モジュールの一覧, ブランチの切り替え,
  他のブランチの取り込み, コミット履歴。モジュールのページはプロジェクトへのリンクと表示しているブランチを出す。
- モジュールの一覧 (`/modules`) はプロジェクトごとにまとめる。
- 変更のページは変更のあるモジュールの入っているプロジェクトを選んでコミットする。コミットにはプロジェクトの全モジュールが入る
  (変更の無いモジュールは今のまま)。他のプロジェクトの変更は別にコミットする。
- 新しいモジュールを作るとき (新しいパーツのページでまだ無いモジュール名を入れたとき) は, 入れるプロジェクトを選ぶ。
  既定はモジュール名と同じ名前のプロジェクトで, まだ無いプロジェクトならコミットでできる
  (`WorkingChanges.newModuleProjects`)。
- 取り込みはプロジェクトの全パーツを `モジュール名.パーツ名` で並べて 3 方向マージする ([branch.md](branch.md)「取り込み」)。
  取り込むブランチにだけあるモジュールは, このプロジェクトの新しいモジュールになる。モジュールの説明は取り込まない。

## 変えたこと (2026-10-25)

- 以前はモジュールごとにコミット (`module_commit`) し, ブランチもモジュールにあった。以前の形のイベントは読めない
  (`core.event-content` の形の検査で拒否される)。seed のイベントは指紋が変わるので新しいものに入れ替わる。
- `GetModuleBranches` は `GetProjectBranches` (プロジェクト名とブランチ) にした。
- localStorage の作業中の変更 (`definy.working_changes.v5`) と表示するブランチ (`definy.selected_branches.v2`) のキーを変えた。

## 今後

- プロジェクトの説明の編集, モジュールを他のプロジェクトへ移す操作。
- プロジェクトに作成者以外もコミットできるようにする (共同編集者. [branch.md](branch.md)「今後」)。
