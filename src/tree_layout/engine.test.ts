import { describe, expect, it } from "vitest";
import {
  computeLayout,
  expressionToLayoutNode,
  reuseUnchangedNodes,
} from "./engine.ts";

const layout = (expression: unknown) =>
  computeLayout(
    expressionToLayoutNode(expression, "root", { partNames: new Map() }),
  );

const list = (...items: ReadonlyArray<number>) => ({
  "#list": items.map((value) => ({ "#number": value })),
});

describe("reuseUnchangedNodes", () => {
  it("変わっていない部分木は前のノードを使い, 変わった部分とその祖先だけを新しくする", () => {
    const before = layout(list(1, 2, 3));
    const after = reuseUnchangedNodes(before, layout(list(1, 20, 3)));
    expect(after).not.toBe(before);
    expect(after).toEqual(layout(list(1, 20, 3)));
    const items = (node: typeof before) =>
      node.children.filter((child) => /^\d+$/.test(child.label));
    expect(items(after).map((item) => item.label)).toEqual(["1", "20", "3"]);
    const [one, twenty, three] = items(after);
    const [oldOne, oldTwo, oldThree] = items(before);
    expect(one).toBe(oldOne);
    expect(three).toBe(oldThree);
    expect(twenty).not.toBe(oldTwo);
  });

  it("全く同じなら前の木をそのまま使う", () => {
    const before = layout(list(1, 2, 3));
    expect(reuseUnchangedNodes(before, layout(list(1, 2, 3)))).toBe(before);
    expect(reuseUnchangedNodes(null, before)).toBe(before);
  });
});
