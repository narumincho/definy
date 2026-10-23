import { describe, expect, it } from "vitest";
import {
  isTextInput,
  navigate,
  navKeyFromEvent,
  TREE_INTERCEPT_KEYS,
  type NavNode,
  type Rect,
} from "./keyboard.ts";

function rect(left: number, top: number, right: number, bottom: number): Rect {
  return { left, top, right, bottom };
}

/** 呼び出しの 1 番目の引数 */
const L = { kind: "callArgument", index: 0 } as const;
/** 呼び出しの 2 番目の引数 */
const R = { kind: "callArgument", index: 1 } as const;

/**
 * `core.plus(left: 1, right: core.multiply(left: 2, right: 3))` を 1 行に並べた配置
 * root:       [0, 0]-[300, 20]
 * L (1):      [10, 0]-[30, 20]
 * R (multiply): [40, 0]-[290, 20]
 * R.L:        [50, 0]-[70, 20]
 * R.R:        [80, 0]-[100, 20]
 */
const inlineNodes: ReadonlyArray<NavNode> = [
  { path: [], rect: rect(0, 0, 300, 20) },
  { path: [L], rect: rect(10, 0, 30, 20) },
  { path: [R], rect: rect(40, 0, 290, 20) },
  { path: [R, L], rect: rect(50, 0, 70, 20) },
  { path: [R, R], rect: rect(80, 0, 100, 20) },
];

describe("navigate", () => {
  it("未選択ならルートを選ぶ", () => {
    expect(navigate(inlineNodes, null, "right")).toEqual([]);
    expect(navigate(inlineNodes, null, "firstChild")).toEqual([]);
  });

  it("親とルートへ移動する", () => {
    expect(navigate(inlineNodes, [R, L], "parent")).toEqual([R]);
    expect(navigate(inlineNodes, [R, L], "root")).toEqual([]);
    expect(navigate(inlineNodes, [], "parent")).toBeNull();
    expect(navigate(inlineNodes, [], "root")).toBeNull();
  });

  it("画面上の式がない中間のパスは飛ばして親へ移動する", () => {
    const nodes: ReadonlyArray<NavNode> = [
      { path: [], rect: rect(0, 0, 100, 40) },
      { path: [L, R], rect: rect(10, 0, 30, 20) },
    ];
    expect(navigate(nodes, [L, R], "parent")).toEqual([]);
  });

  it("子の先頭と末尾へ移動する", () => {
    expect(navigate(inlineNodes, [], "firstChild")).toEqual([L]);
    expect(navigate(inlineNodes, [], "lastChild")).toEqual([R]);
    expect(navigate(inlineNodes, [L], "firstChild")).toBeNull();
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
    expect(navigate(inlineNodes, [L], "right")).toEqual([R]);
    expect(navigate(inlineNodes, [R, L], "right")).toEqual([R, R]);
    // 兄弟が左になければ, 画面上で左にある別の式へ移る
    expect(navigate(inlineNodes, [R, L], "left")).toEqual([L]);
    expect(navigate(inlineNodes, [L], "left")).toBeNull();
  });

  it("上下の移動は行をたどる", () => {
    // 複数行に展開された配置: L が 1 行目, R が 2 行目
    const nodes: ReadonlyArray<NavNode> = [
      { path: [], rect: rect(0, 0, 200, 60) },
      { path: [L], rect: rect(20, 5, 120, 25) },
      { path: [R], rect: rect(20, 35, 80, 55) },
    ];
    expect(navigate(nodes, [L], "down")).toEqual([R]);
    expect(navigate(nodes, [R], "up")).toEqual([L]);
    expect(navigate(nodes, [R], "down")).toBeNull();
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

  it("TREE_INTERCEPT_KEYS contains expected keys", () => {
    expect(TREE_INTERCEPT_KEYS.has("Enter")).toBe(true);
    expect(TREE_INTERCEPT_KEYS.has("Escape")).toBe(true);
    expect(TREE_INTERCEPT_KEYS.has("Delete")).toBe(true);
    expect(TREE_INTERCEPT_KEYS.has("Backspace")).toBe(true);
    expect(TREE_INTERCEPT_KEYS.has("ArrowUp")).toBe(false);
  });

  it("isTextInput handles null gracefully", () => {
    expect(isTextInput(null)).toBe(false);
  });
});
