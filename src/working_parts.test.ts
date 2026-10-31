import { describe, expect, it } from "vitest";
import {
  partIdHashOf,
  workingLatestParts,
  workingPartsView,
  workingTypeEnvSignature,
} from "./working_parts.ts";
import type { LatestPart } from "./self_hosted_type_check.ts";
import type { PartChange, PartSnapshot, WorkingChanges } from "./types.ts";

function committedPart(moduleName: string, name: string): PartSnapshot {
  return {
    partId: `${moduleName}.${name}`,
    moduleId: moduleName,
    moduleName,
    name,
    description: [],
    visibility: "public",
    partType: { "#type_number": null },
    contentHash: "content",
    partIdHash: partIdHashOf(moduleName, name),
    expression: { "#number": 1 },
    updatedAtMs: 5,
  };
}

function change(name: string, fields: Partial<PartChange> = {}): PartChange {
  return {
    moduleDefinitionEventHash: "app",
    partDefinitionEventHash: `app.${name}`,
    name,
    description: [],
    partType: { "#type_number": null },
    expression: { "#number": 2 },
    ...fields,
  };
}

function working(entries: ReadonlyArray<[string, PartChange]>): WorkingChanges {
  return { parts: new Map(entries) };
}

const committed = (() => {
  const a = committedPart("app", "a");
  return {
    parts: [a],
    partsByIdHash: new Map([[a.partIdHash ?? "", a]]),
    partNames: new Map([[a.partIdHash ?? "", "app.a"]]),
  };
})();

describe("workingPartsView", () => {
  it("returns the committed parts as they are without changes", () => {
    expect(workingPartsView(committed, working([]))).toBe(committed);
  });

  it("adds a new part with the ID derived from its module and name", () => {
    const view = workingPartsView(committed, working([["app.b", change("b")]]));
    const id = partIdHashOf("app", "b");
    expect(view.partsByIdHash.get(id)?.expression).toEqual({ "#number": 2 });
    expect(view.partNames.get(id)).toBe("app.b");
    expect(view.parts.map((p) => p.partId)).toEqual(["app.a", "app.b"]);
  });

  it("moves a renamed part to the ID of the new name and drops deleted parts", () => {
    const renamed = workingPartsView(
      committed,
      working([["app.a", change("c")]]),
    );
    expect(renamed.partsByIdHash.has(partIdHashOf("app", "a"))).toBe(false);
    expect(renamed.partsByIdHash.get(partIdHashOf("app", "c"))?.name).toBe("c");
    expect(renamed.parts[0]?.partId).toBe("app.a");

    const deleted = workingPartsView(
      committed,
      working([["app.a", change("a", { deleted: true })]]),
    );
    expect(deleted.parts).toEqual([]);
    expect(deleted.partsByIdHash.size).toBe(0);
  });
});

describe("workingLatestParts", () => {
  const latest: ReadonlyMap<string, LatestPart> = new Map([
    [
      partIdHashOf("app", "a"),
      {
        partId: partIdHashOf("app", "a"),
        moduleId: "m",
        name: "a",
        partType: { "#type_number": null },
        expression: { "#number": 1 },
        expressionKey: "k",
      },
    ],
  ]);

  it("overlays changed and new parts and removes renamed ones", () => {
    const parts = workingLatestParts(
      latest,
      working([
        ["app.a", change("renamed")],
        ["app.b", change("b", { partType: { "#type_string": null } })],
      ]),
    );
    expect(parts.has(partIdHashOf("app", "a"))).toBe(false);
    expect(parts.get(partIdHashOf("app", "renamed"))?.expressionKey).toBe(null);
    expect(parts.get(partIdHashOf("app", "b"))?.partType).toEqual({
      "#type_string": null,
    });
  });
});

describe("workingTypeEnvSignature", () => {
  it("does not change when only the expression of a value part changes", () => {
    expect(workingTypeEnvSignature(working([["app.b", change("b")]]))).toBe(
      workingTypeEnvSignature(
        working([["app.b", change("b", { expression: { "#number": 3 } })]]),
      ),
    );
  });

  it("changes when the type or the name changes", () => {
    const base = workingTypeEnvSignature(working([["app.b", change("b")]]));
    expect(
      workingTypeEnvSignature(
        working([
          ["app.b", change("b", { partType: { "#type_string": null } })],
        ]),
      ),
    ).not.toBe(base);
    expect(workingTypeEnvSignature(working([["app.b", change("c")]]))).not.toBe(
      base,
    );
  });
});
