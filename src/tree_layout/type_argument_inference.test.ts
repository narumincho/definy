import { describe, expect, it } from "vitest";
import {
  argumentProbeTarget,
  inferredTypeExpression,
  inferTypeArguments,
  matchTypeParameter,
  typeArgumentHoles,
  typeAstText,
} from "./type_argument_inference.ts";
import { collectNodeIndex } from "./selection.ts";
import { expressionToLayoutNode } from "./engine.ts";
import type { PathStep } from "./types.ts";

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
const partTypeOf = (id: string) => (id === "map" ? listMapType : undefined);
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

describe("matchTypeParameter", () => {
  it("引数の型の parameter(T) の位置の型を取り出す", () => {
    expect(matchTypeParameter(listOf(T), listOf(NUMBER), "T")).toEqual(NUMBER);
    expect(matchTypeParameter(listOf(T), NUMBER, "T")).toBeUndefined();
    expect(matchTypeParameter(listOf(U), listOf(NUMBER), "T")).toBeUndefined();
  });
});

describe("inferTypeArguments", () => {
  it("引数の推論された型から, 分からなければ期待する型と戻り値の型から求める", async () => {
    const holes = typeArgumentHoles(call, paths, partTypeOf);
    const result = await inferTypeArguments(
      call,
      holes,
      (expression, path) => {
        // 呼び出しを引数の値に置き換えた式で聞く
        expect(path).toEqual([]);
        return Promise.resolve(expression === xs ? listOf(NUMBER) : null);
      },
      () => Promise.resolve(listOf({ "#string": null })),
    );
    expect(result).toEqual(
      new Map<string, unknown>([
        ["callArgument:0", NUMBER],
        ["callArgument:1", { "#string": null }],
      ]),
    );
  });

  it("引数の値の型は, 呼び出しをその値に置き換えて聞く", () => {
    expect(argumentProbeTarget(call, [], argument(3))).toEqual({
      expression: xs,
      path: [],
    });
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
