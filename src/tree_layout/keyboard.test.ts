import { describe, expect, it } from "vitest";
import {
  navigate,
  navKeyFromEvent,
  type NavNode,
  type Rect,
} from "./keyboard.ts";

function rect(left: number, top: number, right: number, bottom: number): Rect {
  return { left, top, right, bottom };
}

/**
 * `add(1, mul(2, 3))` を 1 行に並べた配置
 * root:        [0, 0]-[300, 20]
 * left (1):    [10, 0]-[30, 20]
 * right (mul): [40, 0]-[290, 20]
 * right.left:  [50, 0]-[70, 20]
 * right.right: [80, 0]-[100, 20]
 */
const inlineNodes: ReadonlyArray<NavNode> = [
  { path: [], rect: rect(0, 0, 300, 20) },
  { path: ["left"], rect: rect(10, 0, 30, 20) },
  { path: ["right"], rect: rect(40, 0, 290, 20) },
  { path: ["right", "left"], rect: rect(50, 0, 70, 20) },
  { path: ["right", "right"], rect: rect(80, 0, 100, 20) },
];

describe("navigate", () => {
  it("未選択ならルートを選ぶ", () => {
    expect(navigate(inlineNodes, null, "right")).toEqual([]);
    expect(navigate(inlineNodes, null, "firstChild")).toEqual([]);
  });

  it("親とルートへ移動する", () => {
    expect(navigate(inlineNodes, ["right", "left"], "parent")).toEqual([
      "right",
    ]);
    expect(navigate(inlineNodes, ["right", "left"], "root")).toEqual([]);
    expect(navigate(inlineNodes, [], "parent")).toBeNull();
    expect(navigate(inlineNodes, [], "root")).toBeNull();
  });

  it("画面上の式がない中間のパスは飛ばして親へ移動する", () => {
    const nodes: ReadonlyArray<NavNode> = [
      { path: [], rect: rect(0, 0, 100, 40) },
      { path: ["left", "right"], rect: rect(10, 0, 30, 20) },
    ];
    expect(navigate(nodes, ["left", "right"], "parent")).toEqual([]);
  });

  it("子の先頭と末尾へ移動する", () => {
    expect(navigate(inlineNodes, [], "firstChild")).toEqual(["left"]);
    expect(navigate(inlineNodes, [], "lastChild")).toEqual(["right"]);
    expect(navigate(inlineNodes, ["left"], "firstChild")).toBeNull();
  });

  it("オブジェクトのパスの子も比較できる", () => {
    const nodes: ReadonlyArray<NavNode> = [
      { path: [], rect: rect(0, 0, 100, 20) },
      { path: [{ kind: "callArgument", index: 0 }], rect: rect(10, 0, 30, 20) },
      { path: [{ kind: "callArgument", index: 1 }], rect: rect(40, 0, 60, 20) },
    ];
    expect(
      navigate(nodes, [{ kind: "callArgument", index: 0 }], "right"),
    ).toEqual([{ kind: "callArgument", index: 1 }]);
    expect(navigate(nodes, [], "lastChild")).toEqual([
      { kind: "callArgument", index: 1 },
    ]);
  });

  it("左右の移動は兄弟を優先する", () => {
    expect(navigate(inlineNodes, ["left"], "right")).toEqual(["right"]);
    expect(navigate(inlineNodes, ["right", "left"], "right")).toEqual([
      "right",
      "right",
    ]);
    // 兄弟が左になければ, 画面上で左にある別の式へ移る
    expect(navigate(inlineNodes, ["right", "left"], "left")).toEqual(["left"]);
    expect(navigate(inlineNodes, ["left"], "left")).toBeNull();
  });

  it("上下の移動は行をたどる", () => {
    // 複数行に展開された配置: left が 1 行目, right が 2 行目
    const nodes: ReadonlyArray<NavNode> = [
      { path: [], rect: rect(0, 0, 200, 60) },
      { path: ["left"], rect: rect(20, 5, 120, 25) },
      { path: ["right"], rect: rect(20, 35, 80, 55) },
    ];
    expect(navigate(nodes, ["left"], "down")).toEqual(["right"]);
    expect(navigate(nodes, ["right"], "up")).toEqual(["left"]);
    expect(navigate(nodes, ["right"], "down")).toBeNull();
  });
});

describe("navKeyFromEvent", () => {
  const key = (
    k: string,
    mods: Partial<{ shiftKey: boolean; metaKey: boolean }> = {},
  ) => ({
    key: k,
    shiftKey: mods.shiftKey ?? false,
    ctrlKey: false,
    metaKey: mods.metaKey ?? false,
    altKey: false,
  });

  it("docs/key.md のキー割り当てに従う", () => {
    expect(navKeyFromEvent(key("w"))).toBe("up");
    expect(navKeyFromEvent(key("a"))).toBe("left");
    expect(navKeyFromEvent(key("s"))).toBe("down");
    expect(navKeyFromEvent(key("d"))).toBe("right");
    expect(navKeyFromEvent(key("ArrowUp"))).toBe("up");
    expect(navKeyFromEvent(key("q"))).toBe("parent");
    expect(navKeyFromEvent(key("Q", { shiftKey: true }))).toBe("root");
    expect(navKeyFromEvent(key("e"))).toBe("firstChild");
    expect(navKeyFromEvent(key("E", { shiftKey: true }))).toBe("lastChild");
    expect(navKeyFromEvent(key("s", { metaKey: true }))).toBeNull();
    expect(navKeyFromEvent(key("x"))).toBeNull();
  });
});
