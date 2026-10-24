import { describe, expect, it } from "vitest";
import {
  applySelection,
  functionParameterTypes,
  nextVariableId,
  partParameterNames,
  renameFunctionParameter,
  variableParameterNames,
} from "./mutation.ts";
import { expressionToLayoutNode } from "./ast_to_layout.ts";
import { getOptionValueForExpression } from "./type_inference.ts";
import { getExpressionAtPath } from "./path.ts";
import { bytesToUrlSafeBase64NoPad } from "../cbor.ts";

describe("tree layout mutation and selection", () => {
  it("パーツの参照を選ぶとパーツ ID の文字列で参照し, 選択肢の値に戻せる", () => {
    const rawBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      rawBytes[i] = (i * 7 + 11) & 0xff;
    }
    const b64 = bytesToUrlSafeBase64NoPad(rawBytes);
    const selectionValue = `ref:part:${b64}`;

    const updated = applySelection(
      { "#hole": { probe: false } },
      [],
      selectionValue,
    );
    expect(updated).toEqual({
      "#part_reference": { part_definition_event_hash: b64 },
    });
    expect(getOptionValueForExpression(updated)).toBe(selectionValue);
  });
});

describe("applySelection", () => {
  const plusHash = bytesToUrlSafeBase64NoPad(new Uint8Array(32).fill(1));
  const lessThanHash = bytesToUrlSafeBase64NoPad(new Uint8Array(32).fill(2));
  const lessThanOrEqualHash = bytesToUrlSafeBase64NoPad(
    new Uint8Array(32).fill(3),
  );
  const reference = (hash: string) => ({
    "#part_reference": { part_definition_event_hash: hash },
  });
  const parameterNamesOf = (hash: string) =>
    hash === plusHash || hash === lessThanHash || hash === lessThanOrEqualHash
      ? ["left", "right"]
      : undefined;

  it("関数のパーツを選ぶと, 引数が未入力のパーツの呼び出しにする", () => {
    expect(
      applySelection(
        { "#number": 5 },
        [],
        `ref:part:${plusHash}`,
        parameterNamesOf,
      ),
    ).toEqual({
      "#call": {
        function: reference(plusHash),
        arguments: [
          { name: "left", value: { "#hole": { probe: false } } },
          { name: "right", value: { "#hole": { probe: false } } },
        ],
      },
    });
  });

  it("パーツの呼び出しを別のパーツに差し替えるときは同じ名前の引数の式を引き継ぐ", () => {
    const expr = {
      "#call": {
        function: reference(lessThanHash),
        arguments: [
          { name: "left", value: { "#variable": { variable_id: 3 } } },
          { name: "right", value: { "#number": 0 } },
        ],
      },
    };
    const expected = {
      "#call": {
        function: reference(lessThanOrEqualHash),
        arguments: expr["#call"].arguments,
      },
    };
    expect(getOptionValueForExpression(expr)).toBe(`ref:part:${lessThanHash}`);
    expect(
      applySelection(
        expr,
        [],
        `ref:part:${lessThanOrEqualHash}`,
        parameterNamesOf,
      ),
    ).toEqual(expected);
  });

  it("let は式全体で使われていない変数 ID で作る", () => {
    const expr = {
      "#function": {
        parameters: [{ parameter_id: 4, parameter_name: "a" }],
        body: { "#hole": { probe: false } },
      },
    };
    expect(nextVariableId(expr)).toBe(5);
    expect(applySelection(expr, ["functionBody"], "expr:let")).toEqual({
      "#function": {
        parameters: [{ parameter_id: 4, parameter_name: "a" }],
        body: {
          "#let": {
            variable_id: 5,
            variable_name: "x",
            value: { "#number": 0 },
            body: { "#variable": { variable_id: 5 } },
          },
        },
      },
    });
  });
});

describe("関数型の変数を選ぶ", () => {
  const mapHash = bytesToUrlSafeBase64NoPad(new Uint8Array(32).fill(7));
  const itemToNumber = {
    "#function": {
      parameters: [{ name: "item", type: { "#number": null } }],
      return_type: { "#number": null },
    },
  };
  // (f: (item: number) -> number) => map(g: (x) => □, xs: □)
  const partType = {
    "#function": {
      parameters: [{ name: "f", type: itemToNumber }],
      return_type: { "#number": null },
    },
  };
  const expression = {
    "#function": {
      parameters: [{ parameter_id: 0, parameter_name: "f" }],
      body: {
        "#call": {
          function: {
            "#part_reference": {
              part_definition_event_hash: mapHash,
            },
          },
          arguments: [
            {
              name: "g",
              value: {
                "#function": {
                  parameters: [{ parameter_id: 1, parameter_name: "x" }],
                  body: { "#hole": { probe: false } },
                },
              },
            },
          ],
        },
      },
    },
  };
  const types = functionParameterTypes(expression, partType, (hash) =>
    hash === mapHash
      ? {
          "#function": {
            parameters: [
              {
                name: "g",
                type: {
                  "#function": {
                    parameters: [{ name: "x", type: itemToNumber }],
                    return_type: { "#number": null },
                  },
                },
              },
            ],
            return_type: { "#number": null },
          },
        }
      : undefined,
  );

  it("パーツの型と呼び出すパーツの引数の型から, 関数の引数の型を求める", () => {
    expect(types.get(0)).toEqual(itemToNumber);
    // 呼び出しの引数に書いたラムダ式の引数は, 呼び出すパーツのその引数の型
    expect(types.get(1)).toEqual(itemToNumber);
    expect(variableParameterNames(types.get(1))).toEqual(["item"]);
  });

  it("関数型の変数を選ぶと, 引数名を入れたその変数の呼び出しにする", () => {
    const bodyPath = [
      "functionBody",
      { kind: "callArgument", index: 0 },
      "functionBody",
    ] as const;
    const selected = applySelection(
      expression,
      bodyPath,
      "ref:local:0",
      () => undefined,
      (variableId) => variableParameterNames(types.get(variableId)),
    ) as typeof expression;
    const call = {
      "#call": {
        function: { "#variable": { variable_id: 0 } },
        arguments: [{ name: "item", value: { "#hole": { probe: false } } }],
      },
    };
    expect(getExpressionAtPath(selected, bodyPath)).toEqual(call);
    expect(getOptionValueForExpression(call)).toBe("ref:local:0");
    // 関数でない変数はそのまま変数にする
    expect(
      applySelection(
        { "#hole": { probe: false } },
        [],
        "ref:local:3",
        () => undefined,
        () => variableParameterNames({ "#number": null }),
      ),
    ).toEqual({ "#variable": { variable_id: 3 } });
  });
});

describe("partParameterNames", () => {
  it("関数の型のパーツは型の引数名", () => {
    expect(
      partParameterNames({
        partType: {
          "#function": {
            parameters: [{ name: "x", type: { "#number": null } }],
            return_type: { "#number": null },
          },
        },
        expression: null,
      }),
    ).toEqual(["x"]);
  });

  it("型の無いコンパイラ組み込みのパーツは組み込みの引数名", () => {
    expect(
      partParameterNames({
        partType: null,
        expression: { "#builtin": "list_get" },
      }),
    ).toEqual(["list", "index"]);
    expect(
      partParameterNames({
        partType: { "#number": null },
        expression: { "#number": 1 },
      }),
    ).toBeUndefined();
  });
});

describe("パーツの呼び出しの表示", () => {
  it("呼び出すパーツの名前と引数名ごとの式を子に持つ. 名前は呼び出しと同じパス (式ではない)", () => {
    const node = expressionToLayoutNode({
      "#call": {
        function: {
          "#part_reference": {
            part_definition_event_hash: { $part: "core.list-get" },
          },
        },
        arguments: [
          { name: "list", value: { "#variable": { variable_id: 0 } } },
          { name: "index", value: { "#number": 2 } },
        ],
      },
    });
    expect(node.children.map((c) => c.label)).toEqual([
      "core.list-get",
      "list:",
      "index:",
    ]);
    expect(node.children.map((c) => c.path)).toEqual([
      [],
      [{ kind: "callArgument", index: 0 }],
      [{ kind: "callArgument", index: 1 }],
    ]);
    expect(node.children[0]?.scopeVariables).toBeUndefined();
  });

  it("関数型の引数の呼び出し・レコードの関数のフィールドの呼び出しは名前で出す", () => {
    const node = expressionToLayoutNode({
      "#function": {
        parameters: [
          { parameter_id: 0, parameter_name: "f" },
          { parameter_id: 1, parameter_name: "clock" },
        ],
        body: {
          "#list": [
            {
              "#call": {
                function: { "#variable": { variable_id: 0 } },
                arguments: [],
              },
            },
            {
              "#call": {
                function: {
                  "#record_get": {
                    record: { "#variable": { variable_id: 1 } },
                    key: "now",
                  },
                },
                arguments: [],
              },
            },
          ],
        },
      },
    });
    const labels: Array<string> = [];
    const walk = (n: typeof node): void => {
      if (n.id.endsWith(".fn")) labels.push(n.label);
      n.children.forEach(walk);
    };
    walk(node);
    expect(labels).toEqual(["f", "clock.now"]);
  });
});

describe("関数の引数名を変える", () => {
  it("functionParameter のパスで引数の名前だけを変える (本体は ID で参照するのでそのまま)", () => {
    const expression = {
      "#function": {
        parameters: [
          { parameter_id: 0, parameter_name: "x" },
          { parameter_id: 1, parameter_name: "y" },
        ],
        body: { "#variable": { variable_id: 1 } },
      },
    };
    const layout = expressionToLayoutNode(expression);
    const parameterNode = layout.children[1];
    expect(parameterNode?.kind).toBe("parameterName");
    expect(
      renameFunctionParameter(expression, parameterNode?.path ?? [], "count"),
    ).toEqual({
      "#function": {
        parameters: [
          { parameter_id: 0, parameter_name: "x" },
          { parameter_id: 1, parameter_name: "count" },
        ],
        body: { "#variable": { variable_id: 1 } },
      },
    });
    expect(
      expressionToLayoutNode(
        renameFunctionParameter(expression, parameterNode?.path ?? [], "count"),
      ).children[2]?.label,
    ).toBe("count");
  });
});
