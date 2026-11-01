/**
 * プロジェクトのブランチ (docs/branch.md). サーバーの規則 (`core.check-event-branch`) と同じ考え方で,
 * ブラウザが表示するブランチとコミット先を決める純粋関数
 */
import { MAIN_BRANCH } from "./event_content.ts";
import { instantiateCompiledFunction } from "./stage1_compiler.ts";

/** ブランチを調べるのに使うコミット */
export type BranchCommit = {
  readonly accountId: string;
  readonly projectName: string;
  readonly branch: string;
  readonly eventHash: string;
  readonly timeMs: number;
};

/** プロジェクトの 1 つのブランチ */
export type BranchSummary = {
  readonly name: string;
  /** ブランチを作ったアカウント (ブランチの最初の, 時刻が最小のコミットのアカウント). このアカウントだけがコミットできる */
  readonly creatorAccountId: string;
  /** ブランチの最新の (時刻が最大の) コミット. 同じ時刻なら先のもの */
  readonly latestEventHash: string;
  readonly latestTimeMs: number;
  readonly commitCount: number;
};

/** プロジェクト名付きのブランチ */
type ProjectBranchSummary = BranchSummary & {
  readonly projectName: string;
};

/**
 * コミット (ストアの順) を全プロジェクトのブランチに, 最初に現れた順でまとめる. サーバーがコミットを受け付けるときに
 * main やブランチの最新のコミットを求めるのに使う (テストの latestCommitHashOf. worker/commit_store.ts). `GetProjectBranches` は definy の
 * `definy.handle-rpc` が同じ `core.project-branches` を呼ぶ (docs/service.md). ブラウザは全コミットを読まず, その結果を受け取る.
 * まとめ方は definy 製の `core.project-branches` で, `npm run build:seeds` がコンパイルした `wasm/branch_summarizer.wasm` を `summarizer` に渡す
 */
export function summarizeBranches(
  summarizer: WebAssembly.Module,
  commits: ReadonlyArray<BranchCommit>,
): ReadonlyArray<ProjectBranchSummary> {
  const instance = instantiateCompiledFunction(summarizer);
  const result = instance.read(
    instance.call({
      commits: instance.writeArgument(
        commits.map((commit) => ({
          event_hash: commit.eventHash,
          account_id: commit.accountId,
          project_name: commit.projectName,
          branch: commit.branch,
          time: commit.timeMs,
          module_names: [],
        })),
      ),
    }),
  );
  if (!Array.isArray(result)) {
    throw new Error("core.project-branches returned a non-list value");
  }
  return result.map((item) => {
    const branch = item as {
      readonly project_name: string;
      readonly name: string;
      readonly creator_account_id: string;
      readonly latest_event_hash: string;
      readonly latest_time: number;
      readonly commit_count: number;
    };
    return {
      projectName: branch.project_name,
      name: branch.name,
      creatorAccountId: branch.creator_account_id,
      latestEventHash: branch.latest_event_hash,
      latestTimeMs: branch.latest_time,
      commitCount: branch.commit_count,
    };
  });
}

/** main を先頭に, 残りを名前順に並べる */
export function sortBranches<T extends BranchSummary>(
  branches: Iterable<T>,
): ReadonlyArray<T> {
  return [...branches].sort((a, b) =>
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
  /** プロジェクトにまだコミットが無い. main に親無しでコミットする */
  | { readonly kind: "new_project" }
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
    return { kind: "new_project" };
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
