/**
 * モジュールのブランチ (docs/branch.md). サーバーの規則 (`core.check-event-branch`) と同じ考え方で,
 * ブラウザが表示するブランチとコミット先を決める純粋関数
 */
import { MAIN_BRANCH } from "./event_content.ts";

/** ブランチを調べるのに使うコミット */
export type BranchCommit = {
  readonly accountId: string;
  readonly moduleName: string;
  readonly branch: string;
  readonly eventHash: string;
  readonly timeMs: number;
};

/** モジュールの 1 つのブランチ */
export type BranchSummary = {
  readonly name: string;
  /** ブランチを作ったアカウント (ブランチの最初の, 時刻が最小のコミットのアカウント). このアカウントだけがコミットできる */
  readonly creatorAccountId: string;
  /** ブランチの最新の (時刻が最大の) コミット. 同じ時刻なら先のもの */
  readonly latestEventHash: string;
  readonly latestTimeMs: number;
  readonly commitCount: number;
};

/** モジュール `moduleName` のブランチ. main が先頭, 残りは名前順 */
export function moduleBranches(
  commits: Iterable<BranchCommit>,
  moduleName: string,
): ReadonlyArray<BranchSummary> {
  const branches = new Map<
    string,
    {
      first: BranchCommit;
      latest: BranchCommit;
      count: number;
    }
  >();
  for (const commit of commits) {
    if (commit.moduleName !== moduleName) {
      continue;
    }
    const existing = branches.get(commit.branch);
    if (existing === undefined) {
      branches.set(commit.branch, { first: commit, latest: commit, count: 1 });
      continue;
    }
    branches.set(commit.branch, {
      first: commit.timeMs < existing.first.timeMs ? commit : existing.first,
      latest: existing.latest.timeMs < commit.timeMs ? commit : existing.latest,
      count: existing.count + 1,
    });
  }
  return Array.from(branches, ([name, { first, latest, count }]) => ({
    name,
    creatorAccountId: first.accountId,
    latestEventHash: latest.eventHash,
    latestTimeMs: latest.timeMs,
    commitCount: count,
  })).sort((a, b) =>
    a.name === MAIN_BRANCH
      ? -1
      : b.name === MAIN_BRANCH
        ? 1
        : a.name.localeCompare(b.name),
  );
}

/** 表示するブランチ. 選んだブランチが無ければ main */
export function displayedBranch(
  branches: ReadonlyArray<BranchSummary>,
  selected: string | undefined,
): string {
  return selected !== undefined &&
    branches.some((branch) => branch.name === selected)
    ? selected
    : MAIN_BRANCH;
}

/** 作業中の変更をどこへコミットするか */
export type CommitTarget =
  /** モジュールにまだコミットが無い. main に親無しでコミットする */
  | { readonly kind: "new_module" }
  /** 表示しているブランチは自分が作ったもの. その最新のコミットを親にする */
  | {
      readonly kind: "own_branch";
      readonly branch: string;
      readonly parentCommitHash: string;
    }
  /** 表示しているブランチは他のアカウントのもの. その最新のコミットを親に新しいブランチを作る */
  | {
      readonly kind: "new_branch";
      readonly fromBranch: string;
      readonly parentCommitHash: string;
      readonly suggestedName: string;
    };

/** アカウント `accountId` が, 表示しているブランチ `displayed` に重ねた変更をコミットする先 */
export function commitTarget(
  branches: ReadonlyArray<BranchSummary>,
  displayed: string,
  accountId: string,
  accountName: string,
): CommitTarget {
  const current = branches.find((branch) => branch.name === displayed);
  if (current === undefined) {
    return { kind: "new_module" };
  }
  if (current.creatorAccountId === accountId) {
    return {
      kind: "own_branch",
      branch: current.name,
      parentCommitHash: current.latestEventHash,
    };
  }
  return {
    kind: "new_branch",
    fromBranch: current.name,
    parentCommitHash: current.latestEventHash,
    suggestedName: unusedBranchName(branches, accountName),
  };
}

/** `base` (空なら "branch") か, 使われていなければ `base-2`, `base-3`, ... */
export function unusedBranchName(
  branches: ReadonlyArray<BranchSummary>,
  base: string,
): string {
  const name = base.trim() === "" ? "branch" : base.trim();
  const used = new Set(branches.map((branch) => branch.name));
  if (!used.has(name)) {
    return name;
  }
  for (let i = 2; ; i += 1) {
    if (!used.has(`${name}-${i}`)) {
      return `${name}-${i}`;
    }
  }
}
