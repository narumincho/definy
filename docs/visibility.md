# モジュールとパーツの公開/非公開

issue #624 の後半。モジュールとパーツは公開 (`public`) か非公開 (`private`) のどちらかになる (`core.visibility`)。
既定は公開。

## 決まり

| 参照される側                          | 参照できるパーツ                                     |
| :------------------------------------ | :--------------------------------------------------- |
| 公開のモジュールの公開のパーツ        | どこからでも                                         |
| 非公開のモジュールの公開のパーツ      | 同じプロジェクト ([project.md](project.md)) のパーツ |
| 非公開のパーツ (モジュールによらない) | 同じモジュールのパーツ                               |

- 「参照」は式と型の中のパーツ参照のこと。式の `#part_reference` (型パーツの宣言 `#type_record` などと `#quote` の中を含む) と,
  パーツの型 (`core.type-ast`) の `#reference`。
- イベントは誰でも読めるので, 中身を隠すものではない。どのパーツから使ってよいかの決まり。
- 決まりは definy 製の `core.check-reference-visibility` (1 つの参照は `core.reference-violation`)。
  `npm run build:seeds` が stage1 で `wasm/visibility_checker.wasm` (コミットしない) にコンパイルし,
  `src/visibility.ts` の `checkReferenceVisibility` がそれを呼ぶ。
- エディタがパーツの候補を絞る (`ExpressionTreeEditor`) のは同じ決まりの TypeScript 版 `referenceViolation`。

## イベントの形

- `core.project-commit-module` と, パーツの中身 `core.part-content` (CAS に預ける) に `visibility: core.visibility` がある ([event.md](event.md))。
- TypeScript では `Visibility = "public" | "private"` (`src/event_content.ts`)。`CommitPart` / `CommitModule` で省くと公開。
- seed (`seeds/<モジュール名>.json`) は非公開のときだけモジュールに `"module_visibility": "private"`,
  パーツに `"visibility": "private"` を書く (省くと公開)。`npm run export:seeds` も非公開のときだけ書く。

## 検査

- サーバー: `SubmitEvent` は, プロジェクトのコミットの全パーツの参照を型検査の前に確かめ, 参照できないパーツを参照していれば
  `400` で拒否する (`definy.check-commit-input` が `core.check-reference-visibility` を呼ぶ. [service.md](service.md))。参照される側は, このコミットのパーツと,
  他のプロジェクトの `main` の最新のコミットのパーツ。
  - メッセージ: `part 'app.a': cannot reference the private part 'lib.secret'` /
    `part 'app.b': cannot reference 'internal.helper' of a private module in another project`
- 変更を含めて全パーツを毎回確かめる。同じプロジェクトの別のモジュールが参照しているパーツを非公開にするコミットも拒否する。
- 他のプロジェクトが参照しているパーツを非公開にしても, そのコミットは拒否しない (パーツの削除と同じ)。参照している側は,
  次のコミットで直すまで拒否される。
- UI: 変更ページのコミット前の検査 (`checkCommitTypes`, `src/state/useTypeCheck.ts`) も同じ Wasm で確かめ, 型エラーと同じ所に出す
  (`src/wasm_browser.ts` が読み込む)。参照される側は表示しているブランチのパーツ (`visibilityTargets`, `src/state/useEvents.ts`)。
- `core.check-event` はイベントから式を除いたものを見るので, 式の中の参照はこの検査 (式と型を渡す) で見る。
- (2026-10-26) TypeScript から definy に移した。そのとき, パーツの型 (`core.type-ast`) の参照 (`#reference`) も見るようにした
  (以前は式の `#part_reference` だけを見ていた)。379 パーツのコミットで 200ms ほど。

## UI

- パーツのページの右上の選択 (`#part-visibility-select`) で変える。作業中の変更 (`PartChange.visibility`) になり,
  省いたままの変更はコミット済みの公開/非公開を保つ。
- モジュールのページの選択 (`#module-visibility-select`) で変える。作業中の変更 (`WorkingChanges.moduleVisibilities`) になり,
  変更のページにモジュールの変更として出る。
- モジュールのページのパーツには非公開の印を出す。
- 式エディタのパーツの選択肢から, 編集しているパーツのモジュールから参照できないパーツを外す (`ExpressionTreeEditor` の `moduleName`)。
- 取り込み ([branch.md](branch.md)「取り込み」) ではパーツの公開/非公開もパーツの定義の一部として 3 方向マージする。
  モジュールの公開/非公開は (説明と同じく) 取り込まない。
