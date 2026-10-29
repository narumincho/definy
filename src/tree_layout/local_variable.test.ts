import { describe, expect, it } from "vitest";
import { expressionToLayoutNode } from "./ast_to_layout.ts";
import {
  findVariableDefinitionPath,
  isVariableNamePath,
  renameVariableAt,
} from "./local_variable.ts";
import { findSelectedNode } from "./selection.ts";
import type { PathStep } from "./types.ts";
import { letChain, letChainOf } from "./expression.ts";

const variable = (id: number) => ({ "#variable": { variable_id: id } });

/**
 * ```
 * fn(n) =>
 *   let a = n
 *       b = a
 *   in match b { some(v) => [v, a, n], none => f(x: n) }
 * ```
 */
const expression = {
  "#function": {
    parameters: [{ parameter_id: 0, parameter_name: "n" }],
    body: letChain(
      [
        { variable_id: 1, variable_name: "a", value: variable(0) },
        { variable_id: 2, variable_name: "b", value: variable(1) },
      ],
      {
        "#match": {
          target: variable(2),
          arms: [
            {
              pattern: {
                "#variant": {
                  tag: "some",
                  payload: { "#bind": { variable_id: 3, variable_name: "v" } },
                },
              },
              body: { "#list": [variable(3), variable(1), variable(0)] },
            },
            {
              pattern: {
                "#variant": { tag: "none", payload: { "#any": null } },
              },
              body: {
                "#call": {
                  function: variable(0),
                  arguments: [{ name: "x", value: variable(0) }],
                },
              },
            },
          ],
        },
      },
    ),
  },
};

const letPath: ReadonlyArray<PathStep> = ["functionBody"];
const matchPath: ReadonlyArray<PathStep> = [...letPath, "letBody"];
const listPath: ReadonlyArray<PathStep> = [
  ...matchPath,
  { kind: "matchArmBody", index: 0 },
];
const item = (index: number): ReadonlyArray<PathStep> => [
  ...listPath,
  { kind: "listItemValue", index },
];

describe("let の変数名の変更", () => {
  const namePath: ReadonlyArray<PathStep> = [
    ...letPath,
    { kind: "letBindingName", index: 1 },
  ];

  it("変数名のノードは名前の入力欄になる", () => {
    const root = expressionToLayoutNode(expression, "root", {});
    const node = findSelectedNode(root, namePath);
    expect(node?.kind).toBe("parameterName");
    expect(node?.label).toBe("b");
    expect(isVariableNamePath(namePath)).toBe(true);
  });

  it("名前だけを変え, 参照する側の式 (ID) は変えない", () => {
    const renamed = renameVariableAt(expression, namePath, "count") as {
      "#function": { body: unknown };
    };
    expect(letChainOf(renamed["#function"].body)?.bindings).toEqual([
      { variable_id: 1, variable_name: "a", value: variable(0) },
      { variable_id: 2, variable_name: "count", value: variable(1) },
    ]);
    const root = expressionToLayoutNode(renamed, "root", {});
    expect(
      findSelectedNode(root, [
        ...matchPath,
        "matchTarget",
      ])?.scopeVariables?.get(2),
    ).toBe("count");
  });
});

describe("findVariableDefinitionPath", () => {
  it("関数の引数", () => {
    expect(findVariableDefinitionPath(expression, item(2))).toEqual([
      { kind: "functionParameter", index: 0 },
    ]);
  });

  it("let の束縛 (本体から)", () => {
    expect(findVariableDefinitionPath(expression, item(1))).toEqual([
      ...letPath,
      { kind: "letBindingName", index: 0 },
    ]);
    expect(
      findVariableDefinitionPath(expression, [...matchPath, "matchTarget"]),
    ).toEqual([...letPath, { kind: "letBindingName", index: 1 }]);
  });

  it("let の束縛 (後の束縛の値から)", () => {
    expect(
      findVariableDefinitionPath(expression, [
        ...letPath,
        { kind: "letBindingValue", index: 1 },
      ]),
    ).toEqual([...letPath, { kind: "letBindingName", index: 0 }]);
  });

  it("match のアームの束縛", () => {
    expect(findVariableDefinitionPath(expression, item(0))).toEqual([
      ...matchPath,
      { kind: "matchArmVariable", index: 0 },
    ]);
  });

  it("関数型の変数の呼び出しは, 呼び出す変数の定義", () => {
    expect(
      findVariableDefinitionPath(expression, [
        ...matchPath,
        { kind: "matchArmBody", index: 1 },
      ]),
    ).toEqual([{ kind: "functionParameter", index: 0 }]);
  });

  it("変数でない式・定義が式の中に無い変数は null", () => {
    expect(findVariableDefinitionPath(expression, listPath)).toBeNull();
    expect(findVariableDefinitionPath(variable(9), [])).toBeNull();
  });

  it("内側の定義が外側の同じ ID の定義を隠す", () => {
    const shadowed = letChain(
      [{ variable_id: 0, variable_name: "x", value: variable(5) }],
      {
        "#function": {
          parameters: [{ parameter_id: 0, parameter_name: "x" }],
          body: variable(0),
        },
      },
    );
    expect(
      findVariableDefinitionPath(shadowed, ["letBody", "functionBody"]),
    ).toEqual(["letBody", { kind: "functionParameter", index: 0 }]);
  });
});
