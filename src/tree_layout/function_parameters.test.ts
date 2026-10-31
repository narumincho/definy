import { describe, expect, it } from "vitest";
import {
  PARAMETER_APPEND,
  PARAMETER_DELETE_PREFIX,
  applyParameterAction,
  functionParameterSelectorOptions,
  newParameterName,
  renameTypeFunctionParameter,
} from "./function_parameters.ts";

const valueFunction = {
  "#function": {
    parameters: [{ parameter_id: 0, parameter_name: "x" }],
    body: { "#variable": { variable_id: 0 } },
  },
};

const typeFunction = {
  "#type_function": {
    parameters: [
      { name: "x", type: { "#type_number": null } },
      { name: "y", type: { "#type_string": null } },
    ],
    return_type: { "#type_number": null },
  },
};

describe("newParameterName", () => {
  it("使われていない名前を x, y, z, x1, ... の順に選ぶ", () => {
    expect(newParameterName([])).toBe("x");
    expect(newParameterName(["x", "z"])).toBe("y");
    expect(newParameterName(["x", "y", "z", "x1"])).toBe("x2");
  });
});

describe("functionParameterSelectorOptions", () => {
  it("関数を選んだときに引数の追加と各引数の削除を出す", () => {
    expect(
      functionParameterSelectorOptions(typeFunction, []).map((o) => o.name),
    ).toEqual(["add-parameter", "delete-parameter x", "delete-parameter y"]);
    expect(functionParameterSelectorOptions({ "#number": 1 }, []).length).toBe(
      0,
    );
  });
});

describe("applyParameterAction", () => {
  it("値の関数に新しい変数 ID の引数を足し, その名前を選ぶ", () => {
    expect(applyParameterAction(valueFunction, [], PARAMETER_APPEND)).toEqual({
      expression: {
        "#function": {
          parameters: [
            { parameter_id: 0, parameter_name: "x" },
            { parameter_id: 1, parameter_name: "y" },
          ],
          body: { "#variable": { variable_id: 0 } },
        },
      },
      selectedPath: [{ kind: "functionParameter", index: 1 }],
    });
  });

  it("型の関数に number 型の引数を足す・引数を消す", () => {
    expect(
      applyParameterAction(typeFunction, [], PARAMETER_APPEND)?.expression,
    ).toEqual({
      "#type_function": {
        parameters: [
          { name: "x", type: { "#type_number": null } },
          { name: "y", type: { "#type_string": null } },
          { name: "z", type: { "#type_number": null } },
        ],
        return_type: { "#type_number": null },
      },
    });
    expect(
      applyParameterAction(typeFunction, [], `${PARAMETER_DELETE_PREFIX}0`)
        ?.expression,
    ).toEqual({
      "#type_function": {
        parameters: [{ name: "y", type: { "#type_string": null } }],
        return_type: { "#type_number": null },
      },
    });
    expect(
      applyParameterAction(typeFunction, [], `${PARAMETER_DELETE_PREFIX}5`),
    ).toBeNull();
  });
});

describe("renameTypeFunctionParameter", () => {
  it("型の関数の引数名を変える", () => {
    expect(
      renameTypeFunctionParameter(
        typeFunction,
        [{ kind: "typeFunctionParameterName", index: 1 }],
        "text",
      ),
    ).toEqual({
      "#type_function": {
        parameters: [
          { name: "x", type: { "#type_number": null } },
          { name: "text", type: { "#type_string": null } },
        ],
        return_type: { "#type_number": null },
      },
    });
  });
});
