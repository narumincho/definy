import { describe, expect, it } from "vitest";
import { deserializeDrafts, serializeDrafts } from "./draft_commit_storage.ts";
import type { DraftCommit } from "./draft_commits.ts";
import type { PartChange } from "./types.ts";

function change(name: string): PartChange {
  return {
    moduleDefinitionEventHash: "app",
    partDefinitionEventHash: `app.${name}`,
    name,
    description: [],
    partType: null,
    expression: { "#number": 1 },
  };
}

const draft: DraftCommit = {
  accountId: "alice",
  projectName: "app",
  branch: "alice",
  baseCommitHash: "basehash",
  message: "作業中",
  updatedAtMs: 123,
  changes: {
    parts: new Map([["app.a", change("a")]]),
    merges: new Map([["app", "mergehash"]]),
    newModuleProjects: new Map([["fresh", "app"]]),
    moduleVisibilities: new Map([["app", "private"]]),
  },
};

describe("draft_commit_storage", () => {
  it("ドラフトを往復できる", () => {
    const restored = deserializeDrafts(serializeDrafts([draft]));
    expect(restored).toHaveLength(1);
    const d = restored[0]!;
    expect(d.accountId).toBe("alice");
    expect(d.projectName).toBe("app");
    expect(d.branch).toBe("alice");
    expect(d.baseCommitHash).toBe("basehash");
    expect(d.message).toBe("作業中");
    expect(d.updatedAtMs).toBe(123);
    expect(d.changes.parts.get("app.a")?.expression).toEqual({
      "#number": 1,
    });
    expect(d.changes.merges?.get("app")).toBe("mergehash");
    expect(d.changes.newModuleProjects?.get("fresh")).toBe("app");
    expect(d.changes.moduleVisibilities?.get("app")).toBe("private");
  });

  it("空なら空", () => {
    expect(deserializeDrafts(serializeDrafts([]))).toEqual([]);
  });

  it("壊れた JSON は空になる", () => {
    expect(deserializeDrafts("not json {")).toEqual([]);
    expect(deserializeDrafts("[]")).toEqual([]);
  });

  it("キーが重なるドラフトは先のものだけ残る", () => {
    const restored = deserializeDrafts(
      serializeDrafts([draft, { ...draft, message: "後" }]),
    );
    expect(restored).toHaveLength(1);
    expect(restored[0]?.message).toBe("作業中");
  });
});
