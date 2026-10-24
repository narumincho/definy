import { describe, expect, it } from "vitest";
import {
  applySelection,
  functionParameterTypes,
  nextVariableId,
  partParameters,
  renameFunctionParameter,
  variableParameters,
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
      ? [{ name: "left" }, { name: "right" }]
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
    expect(variableParameters(types.get(1))?.map((p) => p.name)).toEqual([
      "item",
    ]);
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
      (variableId) => variableParameters(types.get(variableId)),
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
        () => variableParameters({ "#number": null }),
      ),
    ).toEqual({ "#variable": { variable_id: 3 } });
  });
});

describe("partParameters", () => {
  it("関数の型のパーツは型の引数名", () => {
    expect(
      partParameters({
        partType: {
          "#function": {
            parameters: [{ name: "x", type: { "#number": null } }],
            return_type: { "#number": null },
          },
        },
        expression: null,
      }),
    ).toEqual([{ name: "x", type: { "#number": null } }]);
  });

  it("型の無いコンパイラ組み込みのパーツは組み込みの引数名", () => {
    expect(
      partParameters({
        partType: null,
        expression: { "#builtin": "list_get" },
      }),
    ).toEqual([{ name: "list" }, { name: "index" }]);
    expect(
      partParameters({
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

describe("関数の型を期待する位置で選ぶとラムダ式で包む", () => {
  const partHash = bytesToUrlSafeBase64NoPad(new Uint8Array(32).fill(9));
  const hole = { "#hole": { probe: false } };
  // (item: number) -> string
  const expected = {
    "#function": {
      parameters: [{ name: "item", type: { "#number": null } }],
      return_type: { "#string": null },
    },
  };
  // (n) => m(f: □) の f は (item: number) -> string を期待する
  const expression = {
    "#function": {
      parameters: [{ parameter_id: 0, parameter_name: "n" }],
      body: {
        "#call": {
          function: { "#part_reference": { part_definition_event_hash: "m" } },
          arguments: [{ name: "f", value: hole }],
        },
      },
    },
  };
  const path = ["functionBody", { kind: "callArgument", index: 0 }] as const;

  it("関数のパーツを選ぶと, 引数をラムダ式の引数にした呼び出しを本体にする", () => {
    const selected = applySelection(
      expression,
      path,
      `ref:part:${partHash}`,
      (hash) => (hash === partHash ? [{ name: "value" }] : undefined),
      () => undefined,
      expected,
    );
    expect(getExpressionAtPath(selected, path)).toEqual({
      "#function": {
        parameters: [{ parameter_id: 1, parameter_name: "item" }],
        body: {
          "#call": {
            function: {
              "#part_reference": { part_definition_event_hash: partHash },
            },
            arguments: [
              { name: "value", value: { "#variable": { variable_id: 1 } } },
            ],
          },
        },
      },
    });
  });

  it("同じ名前の引数があればその引数を入れる. 関数型の変数も同じく包む", () => {
    const selected = applySelection(
      expression,
      path,
      "ref:local:0",
      () => undefined,
      () => [{ name: "other" }, { name: "item" }],
      expected,
    );
    expect(getExpressionAtPath(selected, path)).toEqual({
      "#function": {
        parameters: [{ parameter_id: 1, parameter_name: "item" }],
        body: {
          "#call": {
            function: { "#variable": { variable_id: 0 } },
            arguments: [
              { name: "other", value: hole },
              { name: "item", value: { "#variable": { variable_id: 1 } } },
            ],
          },
        },
      },
    });
  });

  it("すでにラムダ式なら引数をそのまま使い, 本体だけを置き換える. リテラルも本体にする", () => {
    const lambda = applySelection(
      expression,
      path,
      "expr:string",
      () => undefined,
      () => undefined,
      expected,
    );
    expect(getExpressionAtPath(lambda, path)).toEqual({
      "#function": {
        parameters: [{ parameter_id: 1, parameter_name: "item" }],
        body: { "#string": "" },
      },
    });
    const replaced = applySelection(
      lambda,
      path,
      `ref:part:${partHash}`,
      () => [{ name: "item" }],
      () => undefined,
      expected,
    );
    expect(getExpressionAtPath(replaced, path)).toEqual({
      "#function": {
        parameters: [{ parameter_id: 1, parameter_name: "item" }],
        body: {
          "#call": {
            function: {
              "#part_reference": { part_definition_event_hash: partHash },
            },
            arguments: [
              { name: "item", value: { "#variable": { variable_id: 1 } } },
            ],
          },
        },
      },
    });
  });

  it("未入力を選ぶとラムダ式で包まない", () => {
    expect(
      getExpressionAtPath(
        applySelection(
          expression,
          path,
          "expr:hole",
          () => undefined,
          () => undefined,
          expected,
        ),
        path,
      ),
    ).toEqual(hole);
  });
});

describe("関数型の引数を持つパーツの呼び出し", () => {
  it("関数型の引数は本体を未入力にしたラムダ式にする", () => {
    const mapHash = bytesToUrlSafeBase64NoPad(new Uint8Array(32).fill(5));
    const itemToNumber = {
      "#function": {
        parameters: [{ name: "item", type: { "#number": null } }],
        return_type: { "#number": null },
      },
    };
    const expr = {
      "#function": {
        parameters: [{ parameter_id: 3, parameter_name: "xs" }],
        body: { "#hole": { probe: false } },
      },
    };
    expect(
      getExpressionAtPath(
        applySelection(expr, ["functionBody"], `ref:part:${mapHash}`, () => [
          { name: "f", type: itemToNumber },
          { name: "xs", type: { "#list": { item_type: { "#number": null } } } },
        ]),
        ["functionBody"],
      ),
    ).toEqual({
      "#call": {
        function: {
          "#part_reference": { part_definition_event_hash: mapHash },
        },
        arguments: [
          {
            name: "f",
            value: {
              "#function": {
                parameters: [{ parameter_id: 4, parameter_name: "item" }],
                body: { "#hole": { probe: false } },
              },
            },
          },
          { name: "xs", value: { "#hole": { probe: false } } },
        ],
      },
    });
  });
});
