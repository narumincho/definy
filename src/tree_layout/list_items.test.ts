import { describe, expect, it } from "vitest";
import {
  LIST_APPEND_ITEM,
  LIST_DELETE_ITEM,
  LIST_INSERT_AFTER,
  LIST_INSERT_BEFORE,
  LIST_MOVE_EARLIER,
  LIST_MOVE_LATER,
  applyListAction,
  listItemSelectorOptions,
} from "./list_items.ts";
import type { PathStep } from "./types.ts";

const num = (value: number) => ({ "#number": value });
const HOLE = { "#hole": { probe: false } };
const list = (...items: ReadonlyArray<unknown>) => ({ "#list": items });

/** `[[1, 2, 3]]` の内側のリストを操作する */
const expression = list(list(num(1), num(2), num(3)));
const listPath: ReadonlyArray<PathStep> = [{ kind: "listItemValue", index: 0 }];
const item = (index: number): ReadonlyArray<PathStep> => [
  ...listPath,
  { kind: "listItemValue", index },
];

const innerItems = (expr: unknown) =>
  (expr as { "#list": ReadonlyArray<{ "#list": unknown }> })["#list"][0]?.[
    "#list"
  ];

const values = (path: ReadonlyArray<PathStep>) =>
  listItemSelectorOptions(expression, path).map((o) => o.value);

describe("listItemSelectorOptions", () => {
  it("リストそのものには末尾に足す操作だけ", () => {
    expect(values([])).toEqual([LIST_APPEND_ITEM]);
  });

  it("先頭の要素は前へ動かせない, 末尾の要素は後ろへ動かせない", () => {
    expect(values(item(0))).toEqual([
      LIST_INSERT_BEFORE,
      LIST_INSERT_AFTER,
      LIST_MOVE_LATER,
      LIST_DELETE_ITEM,
    ]);
    expect(values(item(2))).toEqual([
      LIST_INSERT_BEFORE,
      LIST_INSERT_AFTER,
      LIST_MOVE_EARLIER,
      LIST_DELETE_ITEM,
    ]);
  });

  it("リストの要素でもリストでもない式には何も出さない", () => {
    expect(listItemSelectorOptions(num(1), [])).toEqual([]);
  });
});

describe("applyListAction", () => {
  it("末尾に未入力の要素を足して選ぶ", () => {
    const result = applyListAction(list(), [], LIST_APPEND_ITEM);
    expect(result).toEqual({
      expression: list(HOLE),
      selectedPath: [{ kind: "listItemValue", index: 0 }],
    });
  });

  it("前後に足す", () => {
    const before = applyListAction(expression, item(1), LIST_INSERT_BEFORE);
    expect(innerItems(before?.expression)).toEqual([
      num(1),
      HOLE,
      num(2),
      num(3),
    ]);
    expect(before?.selectedPath).toEqual(item(1));
    const after = applyListAction(expression, item(1), LIST_INSERT_AFTER);
    expect(innerItems(after?.expression)).toEqual([
      num(1),
      num(2),
      HOLE,
      num(3),
    ]);
    expect(after?.selectedPath).toEqual(item(2));
  });

  it("前後へ動かし, 動かした要素を選ぶ", () => {
    const earlier = applyListAction(expression, item(1), LIST_MOVE_EARLIER);
    expect(innerItems(earlier?.expression)).toEqual([num(2), num(1), num(3)]);
    expect(earlier?.selectedPath).toEqual(item(0));
    const later = applyListAction(expression, item(1), LIST_MOVE_LATER);
    expect(innerItems(later?.expression)).toEqual([num(1), num(3), num(2)]);
    expect(later?.selectedPath).toEqual(item(2));
    expect(applyListAction(expression, item(0), LIST_MOVE_EARLIER)).toBeNull();
  });

  it("消すと隣の要素, 空になればリストを選ぶ", () => {
    const middle = applyListAction(expression, item(1), LIST_DELETE_ITEM);
    expect(innerItems(middle?.expression)).toEqual([num(1), num(3)]);
    expect(middle?.selectedPath).toEqual(item(1));
    const last = applyListAction(expression, item(2), LIST_DELETE_ITEM);
    expect(last?.selectedPath).toEqual(item(1));
    const only = applyListAction(
      list(num(1)),
      [{ kind: "listItemValue", index: 0 }],
      LIST_DELETE_ITEM,
    );
    expect(only).toEqual({ expression: list(), selectedPath: [] });
  });
});
