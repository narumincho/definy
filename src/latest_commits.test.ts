import { describe, expect, it } from "vitest";
import {
  pickLatestCommitPerProject,
  type TimedProjectCommit,
} from "./latest_commits.ts";

type TestCommit = TimedProjectCommit & {
  readonly id: string;
};

describe("pickLatestCommitPerProject", () => {
  it("returns an empty map for empty commits", () => {
    const result = pickLatestCommitPerProject<TestCommit>([]);
    expect(result.size).toBe(0);
  });

  it("picks the commit with the latest timeMs for each project", () => {
    const commits: ReadonlyArray<TestCommit> = [
      { projectName: "modA", timeMs: 100, id: "c1" },
      { projectName: "modB", timeMs: 150, id: "c2" },
      { projectName: "modA", timeMs: 200, id: "c3" },
      { projectName: "modA", timeMs: 50, id: "c4" },
      { projectName: "modB", timeMs: 120, id: "c5" },
    ];

    const result = pickLatestCommitPerProject(commits);
    expect(result.size).toBe(2);
    expect(result.get("modA")).toEqual({
      projectName: "modA",
      timeMs: 200,
      id: "c3",
    });
    expect(result.get("modB")).toEqual({
      projectName: "modB",
      timeMs: 150,
      id: "c2",
    });
  });

  it("keeps the earlier commit when timeMs is equal", () => {
    const commits: ReadonlyArray<TestCommit> = [
      { projectName: "modA", timeMs: 100, id: "first" },
      { projectName: "modA", timeMs: 100, id: "second" },
    ];

    const result = pickLatestCommitPerProject(commits);
    expect(result.get("modA")?.id).toBe("first");
  });
});
