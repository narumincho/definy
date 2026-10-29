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

describe("改行を含む文字列リテラル", () => {
  const text = (value: string) => ({ "#string": value });

  it("一番長い行の幅と行数分の高さになる", () => {
    // 見た目は `"abcdef` `ab` `abc"` の 3 行なので, 一番長い行は `"abcde"` と同じ 7 文字
    const single = layout(text("abcde"));
    const multi = layout(text("abcdef\nab\nabc"));
    expect(multi.computedWidth).toBe(single.computedWidth);
    expect(multi.computedHeight).toBe(single.computedHeight * 3);
  });

  it("含む式は 1 行に並べない", () => {
    const listOf = (...items: ReadonlyArray<unknown>) => ({ "#list": items });
    expect(layout(listOf(text("a"), text("b"))).layoutMode).toBe("inline");
    expect(layout(listOf(text("a\nb"), text("c"))).layoutMode).toBe(
      "multiline",
    );
  });
});
