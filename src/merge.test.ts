import { describe, expect, it } from "vitest";
import {
  findMergeBase,
  hasWorkingChangesIn,
  mergeParts,
  mergeToWorkingChanges,
  type MergeCommit,
  type MergePart,
} from "./merge.ts";

const part = (name: string, value: number): MergePart => ({
  name,
  description: [],
  partType: { "#number": null },
  expression: { "#number": value },
});

describe("findMergeBase", () => {
  // m1 ← m2 ← m3 (main), m1 ← b1 ← b2 (branch), m3 は b1 を取り込んだ
  const commits = new Map<string, MergeCommit>(
    (
      [
        ["m1", null, null],
        ["m2", "m1", null],
        ["b1", "m1", null],
        ["b2", "b1", null],
        ["m3", "m2", "b1"],
      ] as const
    ).map(([eventHash, parentCommitHash, mergedCommitHash]) => [
      eventHash,
      { eventHash, parentCommitHash, mergedCommitHash, parts: [] },
    ]),
  );
  const getCommit = (hash: string) =>
    Promise.resolve(commits.get(hash) ?? null);

  it("共通の祖先のうち近いもの. 取り込んだコミットもたどる", async () => {
    expect((await findMergeBase("m2", "b2", getCommit))?.eventHash).toBe("m1");
    expect((await findMergeBase("m3", "b2", getCommit))?.eventHash).toBe("b1");
    // 早送り・取り込み済み
    expect((await findMergeBase("m1", "b2", getCommit))?.eventHash).toBe("m1");
    expect((await findMergeBase("m3", "b1", getCommit))?.eventHash).toBe("b1");
  });

  it("共通の祖先が無ければ null", async () => {
    expect(await findMergeBase("m2", "x", getCommit)).toBeNull();
  });
});

describe("mergeParts", () => {
  it("片方だけの変更・追加・削除を取り込み, 両方で違う変更は衝突として取り込む側を使う", () => {
    const base = [
      part("same", 1),
      part("ours", 1),
      part("theirs", 1),
      part("both", 1),
      part("gone", 1),
    ];
    const ours = [
      part("same", 1),
      part("ours", 2),
      part("theirs", 1),
      part("both", 2),
      part("gone", 1),
      part("mine", 1),
    ];
    const theirs = [
      part("same", 1),
      part("ours", 1),
      part("theirs", 3),
      part("both", 3),
      part("new", 1),
    ];
    const result = mergeParts(base, ours, theirs);
    expect(
      Object.fromEntries(
        result.parts.map((p) => [
          p.name,
          (p.expression as { "#number": number })["#number"],
        ]),
      ),
    ).toEqual({ same: 1, ours: 2, theirs: 3, both: 3, mine: 1, new: 1 });
    expect(result.conflicts).toEqual(["both"]);
  });
});

describe("mergeToWorkingChanges", () => {
  it("変わったパーツ・増えたパーツを変更に, 無くなったパーツを削除にする", () => {
    const changes = mergeToWorkingChanges(
      "app",
      [part("keep", 1), part("edit", 1), part("drop", 1)],
      [part("keep", 1), part("edit", 2), part("add", 1)],
    );
    expect([...changes.keys()]).toEqual(["app.edit", "app.drop", "app.add"]);
    expect(changes.get("app.drop")?.deleted).toBe(true);
    expect(changes.get("app.edit")?.expression).toEqual({ "#number": 2 });
  });
});

describe("hasWorkingChangesIn", () => {
  it("そのモジュールのパーツの変更か取り込みがあるか", () => {
    expect(
      hasWorkingChangesIn("app", {
        parts: new Map([
          [
            "other.x",
            {
              ...part("x", 1),
              expression: { "#number": 1 },
              moduleDefinitionEventHash: "other",
              partDefinitionEventHash: "other.x",
            },
          ],
        ]),
      }),
    ).toBe(false);
    expect(
      hasWorkingChangesIn("app", {
        parts: new Map(),
        merges: new Map([["app", "h"]]),
      }),
    ).toBe(true);
  });
});
