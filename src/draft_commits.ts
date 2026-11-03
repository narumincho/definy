/**
 * ドラフトコミット (docs/branch.md「ドラフトコミット」).
 * 編集はブランチに属する下書きとして持ち, 作業場所 (ブラウザ) とブランチを多対多にしない.
 * ドラフトはアカウント × プロジェクト × ブランチに最大 1 つで, ブランチを切り替えると
 * そのブランチのドラフトだけが有効になり, 他のブランチのドラフトは保留されたまま残る
 */
import type { Visibility } from "./event_content.ts";
import type { PartChange, WorkingChanges } from "./types.ts";

/** ブランチに属する, まだサーバーへ送っていないコミットの下書き */
export type DraftCommit = {
  /** 下書きを持つアカウント. アカウントごとに下書きは分かれる */
  readonly accountId: string;
  readonly projectName: string;
  readonly branch: string;
  /**
   * 下書きを始めた時点のブランチの最新コミット. 新しいプロジェクト (まだコミットが無い) では `null`.
   * コミットするときは現在の最新コミットに変更を重ねる (パーツ単位で上書き. docs/branch.md)
   */
  readonly baseCommitHash: string | null;
  readonly changes: WorkingChanges;
  /** コミットメッセージの下書き */
  readonly message: string;
  readonly updatedAtMs: number;
};

/** ドラフトを一意に決めるキー (アカウント × プロジェクト × ブランチ) */
export function draftKey(
  accountId: string,
  projectName: string,
  branch: string,
): string {
  return JSON.stringify([accountId, projectName, branch]);
}

export function emptyWorkingChanges(): WorkingChanges {
  return { parts: new Map() };
}

/** 変更が空か (パーツ・取り込み・新しいモジュール・公開範囲のどれも無い) */
export function isEmptyWorkingChanges(changes: WorkingChanges): boolean {
  return (
    changes.parts.size === 0 &&
    (changes.merges?.size ?? 0) === 0 &&
    (changes.newModuleProjects?.size ?? 0) === 0 &&
    (changes.moduleVisibilities?.size ?? 0) === 0
  );
}

/** 変更の件数 (パーツとモジュールの公開範囲. UI のバッジ用) */
export function countWorkingChanges(changes: WorkingChanges): number {
  return changes.parts.size + (changes.moduleVisibilities?.size ?? 0);
}

/** ドラフトに中身があるか (変更かメッセージがある) */
export function hasDraftContent(draft: DraftCommit): boolean {
  return !isEmptyWorkingChanges(draft.changes) || draft.message !== "";
}

/**
 * 有効なドラフトの変更を 1 つの `WorkingChanges` に合成する.
 * 有効なのは, 今のアカウントの, 各プロジェクトで表示しているブランチのドラフトだけ.
 * 表示するブランチがまだ決まっていないプロジェクト (新しいプロジェクト) のドラフトも有効とする
 */
export function combineActiveDraftChanges(
  drafts: Iterable<DraftCommit>,
  accountId: string | null,
  displayedBranches: ReadonlyMap<string, string>,
): WorkingChanges {
  const parts = new Map<string, PartChange>();
  const merges = new Map<string, string>();
  const newModuleProjects = new Map<string, string>();
  const moduleVisibilities = new Map<string, Visibility>();
  if (accountId !== null) {
    for (const draft of drafts) {
      if (draft.accountId !== accountId) continue;
      const displayed = displayedBranches.get(draft.projectName);
      if (displayed !== undefined && displayed !== draft.branch) continue;
      for (const [k, v] of draft.changes.parts) parts.set(k, v);
      for (const [k, v] of draft.changes.merges ?? []) merges.set(k, v);
      for (const [k, v] of draft.changes.newModuleProjects ?? [])
        newModuleProjects.set(k, v);
      for (const [k, v] of draft.changes.moduleVisibilities ?? [])
        moduleVisibilities.set(k, v);
    }
  }
  return { parts, merges, newModuleProjects, moduleVisibilities };
}

/** ドラフトが有効 (今のアカウントの, 表示しているブランチのもの) か */
export function isActiveDraft(
  draft: DraftCommit,
  accountId: string | null,
  displayedBranches: ReadonlyMap<string, string>,
): boolean {
  if (accountId === null || draft.accountId !== accountId) return false;
  const displayed = displayedBranches.get(draft.projectName);
  return displayed === undefined || displayed === draft.branch;
}
