import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  expressionToPartType,
  partTypeToExpression,
  syncPartTypeParameterNames,
} from "./part_type.ts";

const SEED_MODULES = ["core", "std", "sample", "definy", "wasi"];

describe("partType と型の式の相互変換", () => {
  it("seed の全パーツの型が往復で変わらない", () => {
    for (const module of SEED_MODULES) {
      const seed = JSON.parse(
        readFileSync(
          new URL(`../../seeds/${module}.json`, import.meta.url),
          "utf8",
        ),
      ) as { parts: ReadonlyArray<{ part_type?: unknown }> };
      for (const part of seed.parts) {
        const partType = part.part_type ?? null;
        expect(expressionToPartType(partTypeToExpression(partType))).toEqual(
          partType,
        );
      }
    }
  });

  it("関数の型を式にする", () => {
    expect(
      partTypeToExpression({
        function: {
          parameters: [{ name: "x", type: { list: "number" } }],
          return_type: "string",
        },
      }),
    ).toEqual({
      TypeFunction: {
        parameters: [
          { name: "x", type: { TypeList: { item_type: "TypeNumber" } } },
        ],
        return_type: "TypeString",
      },
    });
  });

  it("未入力は型指定なしに戻す", () => {
    expect(expressionToPartType({ Hole: {} })).toBeNull();
    expect(
      expressionToPartType({ TypeList: { item_type: { Hole: {} } } }),
    ).toEqual({ list: null });
  });
});

describe("syncPartTypeParameterNames", () => {
  const fn = (names: ReadonlyArray<string>): unknown => ({
    Function: {
      parameters: names.map((name, i) => ({
        parameter_id: i,
        parameter_name: name,
      })),
      body: { Variable: { variable_id: 0 } },
    },
  });
  const partType = {
    function: {
      parameters: [
        { name: "a", type: "number" },
        { name: "b", type: "string" },
      ],
      return_type: "number",
    },
  };

  it("式の根の関数の引数名を変えたら型の引数名も変える", () => {
    expect(
      syncPartTypeParameterNames(partType, fn(["a", "b"]), fn(["a", "text"])),
    ).toEqual({
      function: {
        parameters: [
          { name: "a", type: "number" },
          { name: "text", type: "string" },
        ],
        return_type: "number",
      },
    });
  });

  it("引数名が変わっていなければ undefined", () => {
    expect(
      syncPartTypeParameterNames(partType, fn(["a", "b"]), fn(["a", "b"])),
    ).toBeUndefined();
    expect(
      syncPartTypeParameterNames(
        "number",
        { Number: { value: 1 } },
        {
          Number: { value: 2 },
        },
      ),
    ).toBeUndefined();
  });
});
