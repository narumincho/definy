import { describe, expect, it } from "vitest";
import { collectNodeIndex, findExpressionNode } from "./selection.ts";
import type { LayoutNode } from "./types.ts";

describe("selection helpers", () => {
  const sampleTree: LayoutNode = {
    id: "root",
    path: [],
    kind: "table",
    label: "",
    layoutMode: "inline",
    computedWidth: 100,
    computedHeight: 20,
    scopeVariables: new Map(),
    children: [
      {
        id: "child-1",
        path: ["left"],
        kind: "literalNumber",
        layoutMode: "inline",
        computedWidth: 40,
        computedHeight: 20,
        label: "1",
        scopeVariables: new Map([[1, "x"]]),
        children: [],
      },
      {
        id: "child-2",
        path: ["right"],
        kind: "literalNumber",
        layoutMode: "inline",
        computedWidth: 40,
        computedHeight: 20,
        label: "2",
        children: [],
      },
    ],
  };

  it("collectNodeIndex collects all nodes in preorder", () => {
    const index = collectNodeIndex(sampleTree);
    expect(index).toEqual([
      { id: "root", path: [] },
      { id: "child-1", path: ["left"] },
      { id: "child-2", path: ["right"] },
    ]);
  });

  it("findExpressionNode finds expression node with scopeVariables", () => {
    const found = findExpressionNode(sampleTree, ["left"]);
    expect(found?.id).toBe("child-1");
  });

  it("findExpressionNode returns null for non-expression node or missing path", () => {
    const missing = findExpressionNode(sampleTree, ["condition"]);
    expect(missing).toBeNull();
  });
});
