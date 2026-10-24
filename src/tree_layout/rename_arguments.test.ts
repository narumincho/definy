import { describe, expect, it } from "vitest";
import {
  parameterRenames,
  renameCallArguments,
  renameCallersOf,
  renameRootParameters,
} from "./rename_arguments.ts";
import type { PartSnapshot } from "../types.ts";

const fnType = (...names: ReadonlyArray<string>) => ({
  "#function": {
    parameters: names.map((name) => ({ name, type: { "#number": null } })),
    return_type: { "#number": null },
  },
});

const call = (
  partId: string,
  args: ReadonlyArray<{ readonly name: string; readonly value: unknown }>,
) => ({
  "#call": {
    function: { "#part_reference": { part_definition_event_hash: partId } },
    arguments: args,
  },
});

describe("parameterRenames", () => {
  it("同じ位置の引数名が変わったものを変更とみなす", () => {
    expect(parameterRenames(fnType("a", "b"), fnType("a", "c"))).toEqual(
      new Map([["b", "c"]]),
    );
    // 名前の入れ替え
    expect(parameterRenames(fnType("a", "b"), fnType("b", "a"))).toEqual(
      new Map([
        ["a", "b"],
        ["b", "a"],
      ]),
    );
  });

  it("引数の数が変わった・関数でないときは変更なし", () => {
    expect(parameterRenames(fnType("a"), fnType("a", "b")).size).toBe(0);
    expect(parameterRenames({ "#number": null }, fnType("a")).size).toBe(0);
  });
});

describe("renameCallArguments", () => {
  const renames = new Map([
    ["a", "b"],
    ["b", "a"],
  ]);

  it("対象のパーツの呼び出しだけ, 入れ子の中も含めて引数名を変える", () => {
    const expression = call("other", [
      {
        name: "a",
        value: call("target", [
          { name: "a", value: { "#number": 1 } },
          {
            name: "b",
            value: call("target", [{ name: "a", value: { "#number": 2 } }]),
          },
        ]),
      },
    ]);
    expect(renameCallArguments(expression, "target", renames)).toEqual(
      call("other", [
        {
          name: "a",
          value: call("target", [
            { name: "b", value: { "#number": 1 } },
            {
              name: "a",
              value: call("target", [{ name: "b", value: { "#number": 2 } }]),
            },
          ]),
        },
      ]),
    );
  });

  it("呼び出していなければ同じ値を返す", () => {
    const expression = call("other", [{ name: "a", value: { "#number": 1 } }]);
    expect(renameCallArguments(expression, "target", renames)).toBe(expression);
  });
});

describe("renameCallersOf", () => {
  const snapshot = (partId: string, expression: unknown): PartSnapshot => ({
    partId,
    moduleId: "m",
    moduleName: "sample",
    name: partId,
    description: [],
    partType: { "#number": null },
    contentHash: null,
    partIdHash: partId,
    expression,
    updatedAtMs: 0,
  });

  it("呼び出している他のパーツの作業中の変更を作る. 作業中の変更があればその式を使う", () => {
    const parts = [
      snapshot(
        "target",
        call("target", [{ name: "a", value: { "#number": 0 } }]),
      ),
      snapshot(
        "caller",
        call("target", [{ name: "a", value: { "#number": 1 } }]),
      ),
      snapshot("edited", { "#number": 0 }),
      snapshot("unrelated", { "#number": 0 }),
    ];
    const editedChange = {
      moduleDefinitionEventHash: "m",
      partDefinitionEventHash: "edited",
      name: "edited2",
      description: [],
      partType: { "#number": null },
      expression: call("target", [{ name: "a", value: { "#number": 2 } }]),
    };
    const changes = renameCallersOf(
      parts,
      { parts: new Map([["edited", editedChange]]) },
      "target",
      new Map([["a", "x"]]),
      "target",
    );
    expect(changes).toEqual([
      {
        moduleDefinitionEventHash: "m",
        partDefinitionEventHash: "caller",
        name: "caller",
        description: [],
        partType: { "#number": null },
        expression: call("target", [{ name: "x", value: { "#number": 1 } }]),
      },
      {
        ...editedChange,
        expression: call("target", [{ name: "x", value: { "#number": 2 } }]),
      },
    ]);
  });
});

describe("renameRootParameters", () => {
  it("式の根の関数の引数名を変える", () => {
    const expression = {
      "#function": {
        parameters: [
          { parameter_id: 0, parameter_name: "a" },
          { parameter_id: 1, parameter_name: "c" },
        ],
        body: { "#variable": { variable_id: 0 } },
      },
    };
    expect(renameRootParameters(expression, new Map([["a", "x"]]))).toEqual({
      "#function": {
        parameters: [
          { parameter_id: 0, parameter_name: "x" },
          { parameter_id: 1, parameter_name: "c" },
        ],
        body: { "#variable": { variable_id: 0 } },
      },
    });
    expect(renameRootParameters(expression, new Map([["z", "x"]]))).toBe(
      expression,
    );
  });
});
