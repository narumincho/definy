import { readFile } from "node:fs/promises";
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

const summarizer = new WebAssembly.Module(
  await readFile("wasm/branch_summarizer.wasm"),
);

const commits = [
  {
    accountId: "alice",
    projectName: "app",
    branch: "main",
    eventHash: "m1",
    timeMs: 100,
  },
  {
    accountId: "alice",
    projectName: "app",
    branch: "main",
    eventHash: "m2",
    timeMs: 300,
  },
  {
    accountId: "bob",
    projectName: "app",
    branch: "bob",
    eventHash: "b1",
    timeMs: 200,
  },
  {
    accountId: "bob",
    projectName: "app",
    branch: "bob",
    eventHash: "b2",
    timeMs: 400,
  },
  // 他のアカウントが bob のブランチに出したコミットは受け付けられないが, 作成者は最初のコミットで決まる
  {
    accountId: "carol",
    projectName: "app",
    branch: "bob",
    eventHash: "c1",
    timeMs: 150,
  },
  {
    accountId: "alice",
    projectName: "other",
    branch: "main",
    eventHash: "o1",
    timeMs: 50,
  },
];

/** プロジェクト `projectName` のブランチ (main が先頭) */
function projectBranches(
  commits: ReadonlyArray<BranchCommit>,
  projectName: string,
): ReadonlyArray<BranchSummary> {
  return sortBranches(
    summarizeBranches(summarizer, commits)
      .filter((branch) => branch.projectName === projectName)
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
    expect(projectBranches(commits, "app")).toEqual([
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
    expect(projectBranches(commits, "none")).toEqual([]);
  });

  it("ブランチは最初に現れた順. 同じ時刻なら先のコミットを最新・作成者にする", () => {
    const tied = [
      { ...commits[5]!, eventHash: "o2", accountId: "dave" },
      ...commits,
    ];
    expect(
      summarizeBranches(summarizer, tied).map((branch) => [
        branch.projectName,
        branch.name,
        branch.creatorAccountId,
        branch.latestEventHash,
        branch.commitCount,
      ]),
    ).toEqual([
      ["other", "main", "dave", "o2", 2],
      ["app", "main", "alice", "m2", 2],
      ["app", "bob", "carol", "b2", 3],
    ]);
    expect(summarizeBranches(summarizer, [])).toEqual([]);
  });
});

describe("displayedBranch", () => {
  it("選んだブランチが無ければ main", () => {
    const branches = projectBranches(commits, "app");
    expect(displayedBranch(branches, "bob")).toBe("bob");
    expect(displayedBranch(branches, "gone")).toBe("main");
    expect(displayedBranch(branches, undefined)).toBe("main");
  });
});

describe("commitTarget", () => {
  const branches = projectBranches(commits.slice(0, 4), "app");

  it("コミットの無いプロジェクトは main に親無しで", () => {
    expect(commitTarget([], "main", "bob", "bob")).toEqual({
      kind: "new_project",
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
    const branches = projectBranches(commits.slice(0, 4), "app");
    expect(unusedBranchName(branches, "carol")).toBe("carol");
    expect(unusedBranchName(branches, "main")).toBe("main-2");
    expect(unusedBranchName(branches, " ")).toBe("branch");
  });
});
