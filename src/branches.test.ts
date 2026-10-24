import { describe, expect, it } from "vitest";
import {
  commitTarget,
  displayedBranch,
  sortBranches,
  summarizeBranches,
  type BranchCommit,
  type BranchSummary,
  unusedBranchName,
} from "./branches.ts";

const commits = [
  {
    accountId: "alice",
    moduleName: "app",
    branch: "main",
    eventHash: "m1",
    timeMs: 100,
  },
  {
    accountId: "alice",
    moduleName: "app",
    branch: "main",
    eventHash: "m2",
    timeMs: 300,
  },
  {
    accountId: "bob",
    moduleName: "app",
    branch: "bob",
    eventHash: "b1",
    timeMs: 200,
  },
  {
    accountId: "bob",
    moduleName: "app",
    branch: "bob",
    eventHash: "b2",
    timeMs: 400,
  },
  // 他のアカウントが bob のブランチに出したコミットは受け付けられないが, 作成者は最初のコミットで決まる
  {
    accountId: "carol",
    moduleName: "app",
    branch: "bob",
    eventHash: "c1",
    timeMs: 150,
  },
  {
    accountId: "alice",
    moduleName: "other",
    branch: "main",
    eventHash: "o1",
    timeMs: 50,
  },
];

/** モジュール `moduleName` のブランチ (main が先頭) */
function moduleBranches(
  commits: ReadonlyArray<BranchCommit>,
  moduleName: string,
): ReadonlyArray<BranchSummary> {
  return sortBranches(
    summarizeBranches(commits)
      .filter((branch) => branch.moduleName === moduleName)
      .map((branch) => ({
        name: branch.name,
        creatorAccountId: branch.creatorAccountId,
        latestEventHash: branch.latestEventHash,
        latestTimeMs: branch.latestTimeMs,
        commitCount: branch.commitCount,
      })),
  );
}

describe("summarizeBranches", () => {
  it("main を先頭にブランチをまとめ, 作成者は最初のコミットのアカウント", () => {
    expect(moduleBranches(commits, "app")).toEqual([
      {
        name: "main",
        creatorAccountId: "alice",
        latestEventHash: "m2",
        latestTimeMs: 300,
        commitCount: 2,
      },
      {
        name: "bob",
        creatorAccountId: "carol",
        latestEventHash: "b2",
        latestTimeMs: 400,
        commitCount: 3,
      },
    ]);
    expect(moduleBranches(commits, "none")).toEqual([]);
  });
});

describe("displayedBranch", () => {
  it("選んだブランチが無ければ main", () => {
    const branches = moduleBranches(commits, "app");
    expect(displayedBranch(branches, "bob")).toBe("bob");
    expect(displayedBranch(branches, "gone")).toBe("main");
    expect(displayedBranch(branches, undefined)).toBe("main");
  });
});

describe("commitTarget", () => {
  const branches = moduleBranches(commits.slice(0, 4), "app");

  it("コミットの無いモジュールは main に親無しで", () => {
    expect(commitTarget([], "main", "bob", "bob")).toEqual({
      kind: "new_module",
    });
  });

  it("自分のブランチにはその最新のコミットを親に", () => {
    expect(commitTarget(branches, "bob", "bob", "bob")).toEqual({
      kind: "own_branch",
      branch: "bob",
      parentCommitHash: "b2",
    });
  });

  it("他のアカウントのブランチからは新しいブランチを作る", () => {
    expect(commitTarget(branches, "main", "bob", "bob")).toEqual({
      kind: "new_branch",
      fromBranch: "main",
      parentCommitHash: "m2",
      suggestedName: "bob-2",
    });
  });
});

describe("unusedBranchName", () => {
  it("使われている名前には番号を付ける", () => {
    const branches = moduleBranches(commits.slice(0, 4), "app");
    expect(unusedBranchName(branches, "carol")).toBe("carol");
    expect(unusedBranchName(branches, "main")).toBe("main-2");
    expect(unusedBranchName(branches, " ")).toBe("branch");
  });
});
