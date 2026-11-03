import { describe, expect, it } from "vitest";
import {
  deserializeDraftStore,
  serializeDraftStore,
} from "./draft_commit_storage.ts";
import type { DraftCommit } from "./draft_commits.ts";
import type { PartChange, WorkingChanges } from "./types.ts";

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

const legacy: WorkingChanges = {
  parts: new Map([
    [
      "lib.b",
      {
        ...change("b"),
        moduleDefinitionEventHash: "lib",
        partDefinitionEventHash: "lib.b",
      },
    ],
  ]),
};

describe("draft_commit_storage", () => {
  it("ドラフトと旧下書きを往復できる", () => {
    const restored = deserializeDraftStore(
      serializeDraftStore({ drafts: [draft], legacy }),
    );
    expect(restored.drafts).toHaveLength(1);
    const d = restored.drafts[0]!;
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
    expect(restored.legacy?.parts.get("lib.b")?.name).toBe("b");
  });

  it("旧下書きが無ければ null", () => {
    const restored = deserializeDraftStore(
      serializeDraftStore({ drafts: [], legacy: null }),
    );
    expect(restored).toEqual({ drafts: [], legacy: null });
  });

  it("壊れた JSON は空になる", () => {
    expect(deserializeDraftStore("not json {")).toEqual({
      drafts: [],
      legacy: null,
    });
    expect(deserializeDraftStore("[]")).toEqual({ drafts: [], legacy: null });
  });

  it("キーが重なるドラフトは先のものだけ残る", () => {
    const restored = deserializeDraftStore(
      serializeDraftStore({
        drafts: [draft, { ...draft, message: "後" }],
        legacy: null,
      }),
    );
    expect(restored.drafts).toHaveLength(1);
    expect(restored.drafts[0]?.message).toBe("作業中");
  });
});
