import { describe, expect, it } from "vitest";
import {
  LET_APPEND_BINDING,
  LET_DELETE_BINDING,
  LET_INSERT_AFTER,
  LET_INSERT_BEFORE,
  LET_MOVE_EARLIER,
  LET_MOVE_LATER,
  applyLetAction,
  letBindingSelectorOptions,
} from "./let_bindings.ts";
import type { PathStep } from "./types.ts";

const binding = (id: number, name: string, value: number) => ({
  variable_id: id,
  variable_name: name,
  value: { Number: { value } },
});

/** `let a = 1, b = 2 in b` */
const expression = {
  Let: {
    bindings: [binding(1, "a", 1), binding(2, "b", 2)],
    body: { Variable: { variable_id: 2 } },
  },
};
const value = (index: number): ReadonlyArray<PathStep> => [
  { kind: "letBindingValue", index },
];
const bindingsOf = (expr: unknown) =>
  (expr as { Let: { bindings: ReadonlyArray<unknown> } }).Let.bindings;

describe("letBindingSelectorOptions", () => {
  it("let そのものには末尾に足す操作だけ", () => {
    expect(
      letBindingSelectorOptions(expression, []).map((o) => o.value),
    ).toEqual([LET_APPEND_BINDING]);
  });

  it("束縛の値には前後への追加・移動・削除", () => {
    expect(
      letBindingSelectorOptions(expression, value(0)).map((o) => o.value),
    ).toEqual([
      LET_INSERT_BEFORE,
      LET_INSERT_AFTER,
      LET_MOVE_LATER,
      LET_DELETE_BINDING,
    ]);
    expect(
      letBindingSelectorOptions(expression, value(1)).map((o) => o.value),
    ).toEqual([
      LET_INSERT_BEFORE,
      LET_INSERT_AFTER,
      LET_MOVE_EARLIER,
      LET_DELETE_BINDING,
    ]);
  });
});

describe("applyLetAction", () => {
  it("新しい束縛は使われていない ID と名前で, 値を未入力にして選ぶ", () => {
    const result = applyLetAction(expression, [], LET_APPEND_BINDING);
    expect(bindingsOf(result?.expression)[2]).toEqual({
      variable_id: 3,
      variable_name: "x",
      value: { Hole: {} },
    });
    expect(result?.selectedPath).toEqual(value(2));
    const before = applyLetAction(expression, value(1), LET_INSERT_BEFORE);
    expect(
      bindingsOf(before?.expression).map(
        (b) => (b as { variable_name: string }).variable_name,
      ),
    ).toEqual(["a", "x", "b"]);
    expect(before?.selectedPath).toEqual(value(1));
    const after = applyLetAction(expression, value(0), LET_INSERT_AFTER);
    expect(after?.selectedPath).toEqual(value(1));
  });

  it("名前が使われていれば x1, x2 ...", () => {
    const withX = {
      Let: { bindings: [binding(0, "x", 0)], body: { Hole: {} } },
    };
    expect(
      bindingsOf(applyLetAction(withX, [], LET_APPEND_BINDING)?.expression)[1],
    ).toMatchObject({ variable_id: 1, variable_name: "x1" });
  });

  it("前後へ動かし, 動かした束縛を選ぶ", () => {
    const later = applyLetAction(expression, value(0), LET_MOVE_LATER);
    expect(bindingsOf(later?.expression)).toEqual([
      binding(2, "b", 2),
      binding(1, "a", 1),
    ]);
    expect(later?.selectedPath).toEqual(value(1));
    expect(applyLetAction(expression, value(0), LET_MOVE_EARLIER)).toBeNull();
  });

  it("消すと隣の束縛を選び, 最後の束縛を消すと本体だけにする", () => {
    const deleted = applyLetAction(expression, value(1), LET_DELETE_BINDING);
    expect(bindingsOf(deleted?.expression)).toEqual([binding(1, "a", 1)]);
    expect(deleted?.selectedPath).toEqual(value(0));
    const only = applyLetAction(
      deleted?.expression,
      value(0),
      LET_DELETE_BINDING,
    );
    expect(only).toEqual({
      expression: { Variable: { variable_id: 2 } },
      selectedPath: [],
    });
  });
});
