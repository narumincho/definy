import { describe, expect, it } from "vitest";
import {
  findDefinitionTarget,
  goToDefinitionOption,
} from "./go_to_definition.ts";
import {
  callExpression,
  numberExpression,
  partReferenceExpression,
} from "./expression.ts";
import type { PathStep } from "./types.ts";

const variable = (id: number) => ({ "#variable": { variable_id: id } });

/**
 * ```
 * fn(n) => [n, sample.double(x: n), sample.pi, 1]
 * ```
 */
const expression = {
  "#function": {
    parameters: [{ parameter_id: 0, parameter_name: "n" }],
    body: {
      "#list": [
        variable(0),
        callExpression(partReferenceExpression("double-id"), [
          { name: "x", value: variable(0) },
        ]),
        partReferenceExpression("pi-id"),
        numberExpression(1),
      ],
    },
  },
};

const item = (index: number): ReadonlyArray<PathStep> => [
  "functionBody",
  { kind: "listItemValue", index },
];

describe("findDefinitionTarget", () => {
  it("変数は式の中の定義 (関数の引数名)", () => {
    expect(findDefinitionTarget(expression, item(0))).toEqual({
      kind: "variable",
      path: [{ kind: "functionParameter", index: 0 }],
    });
  });

  it("パーツの呼び出し・参照はそのパーツ", () => {
    expect(findDefinitionTarget(expression, item(1))).toEqual({
      kind: "part",
      partIdHash: "double-id",
    });
    expect(findDefinitionTarget(expression, item(2))).toEqual({
      kind: "part",
      partIdHash: "pi-id",
    });
  });

  it("リテラル・変数の名前は null", () => {
    expect(findDefinitionTarget(expression, item(3))).toBeNull();
    expect(
      findDefinitionTarget(expression, [
        { kind: "functionParameter", index: 0 },
      ]),
    ).toBeNull();
  });

  it("置換メニューの選択肢", () => {
    expect(goToDefinitionOption(expression, item(3))).toEqual([]);
    expect(goToDefinitionOption(expression, item(0))).toHaveLength(1);
    expect(goToDefinitionOption(expression, item(2))).toHaveLength(1);
  });
});
