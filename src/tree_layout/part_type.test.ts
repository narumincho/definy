import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  expressionToTypeAst,
  typeAstToExpression,
  syncPartTypeParameterNames,
} from "./part_type.ts";

const SEED_MODULES = ["core", "std", "sample", "definy", "wasi", "wasm"];

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
        // seed のパーツの型は型の式
        const expression = part.part_type ?? null;
        expect(typeAstToExpression(expressionToTypeAst(expression))).toEqual(
          expression,
        );
      }
    }
  });

  it("関数の型を式にする", () => {
    expect(
      typeAstToExpression({
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

  it("型引数と, 型引数を取る型パーツの適用を式にする", () => {
    // (T: type, x: T) -> option(T: T)
    const partType = {
      "#function": {
        parameters: [
          { name: "T", type: { "#type": null } },
          { name: "x", type: { "#parameter": "T" } },
        ],
        return_type: {
          "#apply": {
            part_hash: "option-id",
            arguments: [{ name: "T", type: { "#parameter": "T" } }],
          },
        },
      },
    };
    const expression = typeAstToExpression(partType);
    expect(expression).toEqual({
      "#type_function": {
        parameters: [
          { name: "T", type: { "#type_type": null } },
          { name: "x", type: { "#type_parameter": "T" } },
        ],
        return_type: {
          "#call": {
            function: {
              "#part_reference": { part_definition_event_hash: "option-id" },
            },
            arguments: [{ name: "T", value: { "#type_parameter": "T" } }],
          },
        },
      },
    });
    expect(expressionToTypeAst(expression)).toEqual(partType);
  });

  it("組み込みの関数の型 (型チェッカーが返す) も往復できる", () => {
    const builtin = { "#builtin": "less_than" };
    expect(typeAstToExpression(builtin)).toEqual({ "#builtin": "less_than" });
    expect(expressionToTypeAst(typeAstToExpression(builtin))).toEqual(builtin);
  });

  it("未入力は型指定なしに戻す", () => {
    expect(expressionToTypeAst({ "#hole": { probe: false } })).toBeNull();
    expect(
      expressionToTypeAst({
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
    "#type_function": {
      parameters: [
        { name: "a", type: { "#type_number": null } },
        { name: "b", type: { "#type_string": null } },
      ],
      return_type: { "#type_number": null },
    },
  };

  it("式の根の関数の引数名を変えたら型の引数名も変える", () => {
    expect(
      syncPartTypeParameterNames(partType, fn(["a", "b"]), fn(["a", "text"])),
    ).toEqual({
      "#type_function": {
        parameters: [
          { name: "a", type: { "#type_number": null } },
          { name: "text", type: { "#type_string": null } },
        ],
        return_type: { "#type_number": null },
      },
    });
  });

  it("引数名が変わっていなければ undefined", () => {
    expect(
      syncPartTypeParameterNames(partType, fn(["a", "b"]), fn(["a", "b"])),
    ).toBeUndefined();
    expect(
      syncPartTypeParameterNames(
        { "#type_number": null },
        { "#number": 1 },
        { "#number": 2 },
      ),
    ).toBeUndefined();
  });

  it("式の根の関数の引数を足した・消したら, 型の引数も変数 ID で引き継いで揃える", () => {
    const fnWith = (
      parameters: ReadonlyArray<readonly [number, string]>,
    ): unknown => ({
      "#function": {
        parameters: parameters.map(([id, name]) => ({
          parameter_id: id,
          parameter_name: name,
        })),
        body: { "#variable": { variable_id: 0 } },
      },
    });
    const before = fnWith([
      [0, "a"],
      [1, "b"],
    ]);
    // 足す
    expect(
      syncPartTypeParameterNames(
        partType,
        before,
        fnWith([
          [0, "a"],
          [1, "b"],
          [2, "c"],
        ]),
      ),
    ).toEqual({
      "#type_function": {
        parameters: [
          { name: "a", type: { "#type_number": null } },
          { name: "b", type: { "#type_string": null } },
          { name: "c", type: { "#type_number": null } },
        ],
        return_type: { "#type_number": null },
      },
    });
    // 先頭を消す
    expect(
      syncPartTypeParameterNames(partType, before, fnWith([[1, "b"]])),
    ).toEqual({
      "#type_function": {
        parameters: [{ name: "b", type: { "#type_string": null } }],
        return_type: { "#type_number": null },
      },
    });
  });

  it("変更前の式と型の引数の数が合わなければ undefined", () => {
    expect(
      syncPartTypeParameterNames(partType, fn(["a"]), fn(["a", "b", "c"])),
    ).toBeUndefined();
  });
});
