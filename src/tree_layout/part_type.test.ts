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
        "#function": {
          parameters: [
            {
              name: "x",
              type: { "#list": { item_type: { "#number": null } } },
            },
          ],
          return_type: { "#string": null },
        },
      }),
    ).toEqual({
      "#type_function": {
        parameters: [
          {
            name: "x",
            type: { "#type_list": { item_type: { "#type_number": null } } },
          },
        ],
        return_type: { "#type_string": null },
      },
    });
  });

  it("未入力は型指定なしに戻す", () => {
    expect(expressionToPartType({ "#hole": { probe: false } })).toBeNull();
    expect(
      expressionToPartType({
        "#type_list": { item_type: { "#hole": { probe: false } } },
      }),
    ).toEqual({ "#list": { item_type: null } });
  });
});

describe("syncPartTypeParameterNames", () => {
  const fn = (names: ReadonlyArray<string>): unknown => ({
    "#function": {
      parameters: names.map((name, i) => ({
        parameter_id: i,
        parameter_name: name,
      })),
      body: { "#variable": { variable_id: 0 } },
    },
  });
  const partType = {
    "#function": {
      parameters: [
        { name: "a", type: { "#number": null } },
        { name: "b", type: { "#string": null } },
      ],
      return_type: { "#number": null },
    },
  };

  it("式の根の関数の引数名を変えたら型の引数名も変える", () => {
    expect(
      syncPartTypeParameterNames(partType, fn(["a", "b"]), fn(["a", "text"])),
    ).toEqual({
      "#function": {
        parameters: [
          { name: "a", type: { "#number": null } },
          { name: "text", type: { "#string": null } },
        ],
        return_type: { "#number": null },
      },
    });
  });

  it("引数名が変わっていなければ undefined", () => {
    expect(
      syncPartTypeParameterNames(partType, fn(["a", "b"]), fn(["a", "b"])),
    ).toBeUndefined();
    expect(
      syncPartTypeParameterNames(
        { "#number": null },
        { "#number": 1 },
        { "#number": 2 },
      ),
    ).toBeUndefined();
  });
});
