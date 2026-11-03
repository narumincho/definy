import { describe, expect, it } from "vitest";
import {
  combineActiveDraftChanges,
  countWorkingChanges,
  draftKey,
  emptyWorkingChanges,
  isEmptyWorkingChanges,
  type DraftCommit,
} from "./draft_commits.ts";
import type { PartChange, WorkingChanges } from "./types.ts";

function change(name: string): PartChange {
  return {
    moduleDefinitionEventHash: "app",
    partDefinitionEventHash: `app.${name}`,
    name,
    description: [],
    partType: null,
    expression: null,
  };
}

function changesWith(
  entries: ReadonlyArray<[string, PartChange]>,
): WorkingChanges {
  return { parts: new Map(entries) };
}

function draft(
  projectName: string,
  branch: string,
  changes: WorkingChanges,
  accountId = "alice",
): DraftCommit {
  return {
    accountId,
    projectName,
    branch,
    baseCommitHash: "base",
    changes,
    message: "",
    updatedAtMs: 1,
  };
}

describe("draftKey", () => {
  it("アカウント・プロジェクト・ブランチで変わる", () => {
    expect(draftKey("alice", "app", "main")).not.toBe(
      draftKey("alice", "app", "alice"),
    );
    expect(draftKey("alice", "app", "main")).not.toBe(
      draftKey("bob", "app", "main"),
    );
    expect(draftKey("alice", "app", "main")).not.toBe(
      draftKey("alice", "lib", "main"),
    );
  });
});

describe("isEmptyWorkingChanges / countWorkingChanges", () => {
  it("空と件数", () => {
    expect(isEmptyWorkingChanges(emptyWorkingChanges())).toBe(true);
    const changes = changesWith([["app.a", change("a")]]);
    expect(isEmptyWorkingChanges(changes)).toBe(false);
    expect(countWorkingChanges(changes)).toBe(1);
    expect(
      isEmptyWorkingChanges({
        parts: new Map(),
        merges: new Map([["app", "hash"]]),
      }),
    ).toBe(false);
  });
});

describe("combineActiveDraftChanges", () => {
  const drafts = [
    draft("app", "main", changesWith([["app.a", change("a")]])),
    draft("app", "alice", changesWith([["app.b", change("b")]])),
    draft("app", "main", changesWith([["app.c", change("c")]]), "bob"),
    draft("fresh", "main", changesWith([["fresh.x", change("x")]])),
  ];

  it("表示しているブランチの, 今のアカウントのドラフトだけが有効", () => {
    const displayed = new Map([["app", "alice"]]);
    const combined = combineActiveDraftChanges(drafts, "alice", displayed);
    // app/alice の b と, ブランチ未定の新しいプロジェクト fresh の x だけ
    expect([...combined.parts.keys()].sort()).toEqual(["app.b", "fresh.x"]);
  });

  it("ブランチを切り替えると有効なドラフトも切り替わる", () => {
    const displayed = new Map([["app", "main"]]);
    const combined = combineActiveDraftChanges(drafts, "alice", displayed);
    expect([...combined.parts.keys()].sort()).toEqual(["app.a", "fresh.x"]);
  });

  it("ログインしていなければ何も有効にならない", () => {
    const combined = combineActiveDraftChanges(drafts, null, new Map());
    expect(combined.parts.size).toBe(0);
  });
});
