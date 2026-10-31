import { describe, expect, it } from "vitest";
import {
  inferredTypeExpression,
  typeArgumentHoles,
  typeAstText,
} from "./type_argument_inference.ts";
import { collectNodeIndex } from "./selection.ts";
import { expressionToLayoutNode } from "./engine.ts";
import type { PathStep } from "./types.ts";
import { typeAstToExpression } from "../type_ast_expression.ts";

const T = { "#parameter": "T" };
const U = { "#parameter": "U" };
const NUMBER = { "#number": null };
const listOf = (item: unknown) => ({ "#list": { item_type: item } });

/** core.list-map: (T: type, U: type, f: (item: T) -> U, xs: List<T>) -> List<U> */
const listMapType = {
  "#function": {
    parameters: [
      { name: "T", type: { "#type": null } },
      { name: "U", type: { "#type": null } },
      {
        name: "f",
        type: {
          "#function": {
            parameters: [{ name: "item", type: T }],
            return_type: U,
          },
        },
      },
      { name: "xs", type: listOf(T) },
    ],
    return_type: listOf(U),
  },
};

const hole = { "#hole": { probe: false } };
const xs = { "#list": [{ "#number": 1 }, { "#number": 2 }] };
const f = {
  "#function": {
    parameters: [{ parameter_id: 0, parameter_name: "item" }],
    body: { "#variable": { variable_id: 0 } },
  },
};
const call = {
  "#call": {
    function: { "#part_reference": { part_definition_event_hash: "map" } },
    arguments: [
      { name: "T", value: hole },
      { name: "U", value: hole },
      { name: "f", value: f },
      { name: "xs", value: xs },
    ],
  },
};
const paths = collectNodeIndex(expressionToLayoutNode(call)).map(
  (entry) => entry.path,
);
// パーツの型は型の式で持つ (推論に使う型は型チェッカーの形 core.type-ast にそろえる)
const partTypeOf = (id: string) =>
  id === "map" ? typeAstToExpression(listMapType) : undefined;
const argument = (index: number): ReadonlyArray<PathStep> => [
  { kind: "callArgument", index },
];

describe("typeArgumentHoles", () => {
  it("未入力の型引数と, 推論に使う引数・戻り値の型を集める", () => {
    const holes = typeArgumentHoles(call, paths, partTypeOf);
    expect(holes).toEqual([
      {
        path: argument(0),
        parameterName: "T",
        callPath: [],
        sources: [
          {
            path: argument(2),
            parameterType: listMapType["#function"].parameters[2]?.type,
          },
          { path: argument(3), parameterType: listOf(T) },
        ],
      },
      {
        path: argument(1),
        parameterName: "U",
        callPath: [],
        sources: [
          {
            path: argument(2),
            parameterType: listMapType["#function"].parameters[2]?.type,
          },
        ],
        returnType: listOf(U),
      },
    ]);
  });

  it("書いた型引数は推論しない", () => {
    const written = {
      "#call": {
        ...call["#call"],
        arguments: call["#call"].arguments.map((arg) =>
          arg.name === "T" ? { ...arg, value: { "#type_number": null } } : arg,
        ),
      },
    };
    expect(
      typeArgumentHoles(written, paths, partTypeOf).map((h) => h.parameterName),
    ).toEqual(["U"]);
  });
});

describe("typeAstText", () => {
  it("型を短く書く", () => {
    const names = new Map([["opt", "core.option"]]);
    expect(typeAstText(listOf(NUMBER), names)).toBe("List<number>");
    expect(
      typeAstText(
        {
          "#apply": {
            part_hash: "opt",
            arguments: [{ name: "T", type: { "#string": null } }],
          },
        },
        names,
      ),
    ).toBe("core.option(T: string)");
  });
});

describe("inferredTypeExpression", () => {
  it("型の式にし, 型引数の参照はその位置の同じ名前の変数にする", () => {
    expect(inferredTypeExpression(listOf(T), new Map([[0, "T"]]))).toEqual({
      "#type_list": { item_type: { "#variable": { variable_id: 0 } } },
    });
    expect(inferredTypeExpression(NUMBER, undefined)).toEqual({
      "#type_number": null,
    });
  });
});

describe("typeArgumentHoles (パーツの型が型の式)", () => {
  it("型の式のパーツの型も型チェッカーの形にそろえて照らし合わせる", () => {
    const expressionType = {
      "#type_function": {
        parameters: [
          { name: "T", type: { "#type_type": null } },
          {
            name: "xs",
            type: { "#type_list": { item_type: { "#type_parameter": "T" } } },
          },
        ],
        return_type: { "#type_number": null },
      },
    };
    const holes = typeArgumentHoles(
      {
        "#call": {
          function: { "#part_reference": { part_definition_event_hash: "f" } },
          arguments: [
            { name: "T", value: hole },
            { name: "xs", value: xs },
          ],
        },
      },
      [[]],
      () => expressionType,
    );
    expect(holes.map((h) => h.sources[0]?.parameterType)).toEqual([listOf(T)]);
  });
});
