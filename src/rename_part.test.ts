import { describe, expect, it } from "vitest";
import {
  replacePartId,
  retargetPartChange,
  retargetReferencesOf,
} from "./rename_part.ts";
import type { PartChange, PartSnapshot } from "./types.ts";

const reference = (id: string): unknown => ({
  "#part_reference": { part_definition_event_hash: id },
});

function committedPart(name: string, expression: unknown): PartSnapshot {
  return {
    partId: `app.${name}`,
    moduleId: "app",
    moduleName: "app",
    name,
    description: [],
    visibility: "public",
    partType: { "#type_number": null },
    contentHash: null,
    partIdHash: `id-${name}`,
    expression,
    updatedAtMs: 0,
  };
}

describe("replacePartId", () => {
  it("replaces only strings equal to the ID and keeps unchanged values", () => {
    const value = { a: [reference("old"), "other"], b: 1 };
    expect(replacePartId(value, "old", "new")).toEqual({
      a: [reference("new"), "other"],
      b: 1,
    });
    expect(replacePartId(value, "missing", "new")).toBe(value);
  });
});

describe("retargetPartChange", () => {
  it("retargets the type, the expression and the definition", () => {
    const change: PartChange = {
      moduleDefinitionEventHash: "app",
      partDefinitionEventHash: "app.f",
      name: "f",
      description: [],
      partType: reference("old"),
      expression: reference("old"),
      definition: [reference("old")],
    };
    const next = retargetPartChange(change, "old", "new");
    expect(next.partType).toEqual(reference("new"));
    expect(next.expression).toEqual(reference("new"));
    expect(next.definition).toEqual([reference("new")]);
    expect(retargetPartChange(change, "x", "y")).toBe(change);
  });
});

describe("retargetReferencesOf", () => {
  it("makes working changes for committed and new parts that refer to the renamed part", () => {
    const parts = [
      committedPart("target", { "#number": 1 }),
      committedPart("user", reference("old")),
      committedPart("other", { "#number": 2 }),
    ];
    const newPart: PartChange = {
      moduleDefinitionEventHash: "app",
      partDefinitionEventHash: "app.fresh",
      name: "fresh",
      description: [],
      partType: null,
      expression: reference("old"),
    };
    const result = retargetReferencesOf(
      parts,
      { parts: new Map([["app.fresh", newPart]]) },
      "old",
      "new",
      "app.target",
    );
    expect(result.map(([key]) => key)).toEqual(["app.user", "app.fresh"]);
    expect(result.every(([, c]) => c.expression !== null)).toBe(true);
    expect(result[0]?.[1].expression).toEqual(reference("new"));
    expect(result[0]?.[1].name).toBe("user");
  });

  it("skips deleted parts", () => {
    const deleted: PartChange = {
      moduleDefinitionEventHash: "app",
      partDefinitionEventHash: "app.user",
      name: "user",
      description: [],
      partType: null,
      expression: reference("old"),
      deleted: true,
    };
    expect(
      retargetReferencesOf(
        [committedPart("user", reference("old"))],
        { parts: new Map([["app.user", deleted]]) },
        "old",
        "new",
        "app.target",
      ),
    ).toEqual([]);
  });
});
