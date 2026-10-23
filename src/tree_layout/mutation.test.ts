import { describe, expect, it } from "vitest";
import {
  applySelection,
  nextVariableId,
  partParameterNames,
  renameFunctionParameter,
} from "./mutation.ts";
import { expressionToLayoutNode } from "./ast_to_layout.ts";
import { getOptionValueForExpression } from "./type_inference.ts";
import { base64ToBytes, bytesToUrlSafeBase64NoPad } from "../cbor.ts";

describe("tree layout mutation and selection", () => {
  it("applies part reference selection with 32-byte Uint8Array hash and resolves option value", () => {
    const rawBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      rawBytes[i] = (i * 7 + 11) & 0xff;
    }
    const b64 = bytesToUrlSafeBase64NoPad(rawBytes);
    const selectionValue = `ref:part:${b64}`;

    const holeExpr = { Hole: {} };
    const updated = applySelection(holeExpr, [], selectionValue);

    expect(updated).not.toBeNull();
    const partRefNode = updated as {
      readonly PartReference?: {
        readonly part_definition_event_hash?: unknown;
      };
    };
    expect(partRefNode.PartReference).toBeDefined();

    const hash = partRefNode.PartReference?.part_definition_event_hash;
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash).toEqual(rawBytes);
    expect((hash as Uint8Array).length).toBe(32);

    const resolvedOptionValue = getOptionValueForExpression(updated);
    expect(resolvedOptionValue).toBe(selectionValue);
  });
});

describe("applySelection", () => {
  const plusHash = bytesToUrlSafeBase64NoPad(new Uint8Array(32).fill(1));
  const lessThanHash = bytesToUrlSafeBase64NoPad(new Uint8Array(32).fill(2));
  const lessThanOrEqualHash = bytesToUrlSafeBase64NoPad(
    new Uint8Array(32).fill(3),
  );
  const reference = (hash: string) => ({
    PartReference: { part_definition_event_hash: base64ToBytes(hash) },
  });
  const parameterNamesOf = (hash: string) =>
    hash === plusHash || hash === lessThanHash || hash === lessThanOrEqualHash
      ? ["left", "right"]
      : undefined;

  it("関数のパーツを選ぶと, 引数が未入力のパーツの呼び出しにする", () => {
    expect(
      applySelection(
        { Number: { value: 5 } },
        [],
        `ref:part:${plusHash}`,
        parameterNamesOf,
      ),
    ).toEqual({
      Call: {
        function: reference(plusHash),
        arguments: [
          { name: "left", value: { Hole: {} } },
          { name: "right", value: { Hole: {} } },
        ],
      },
    });
  });

  it("パーツの呼び出しを別のパーツに差し替えるときは同じ名前の引数の式を引き継ぐ", () => {
    const expr = {
      Call: {
        function: reference(lessThanHash),
        arguments: [
          { name: "left", value: { Variable: { variable_id: 3 } } },
          { name: "right", value: { Number: { value: 0 } } },
        ],
      },
    };
    const expected = {
      Call: {
        function: reference(lessThanOrEqualHash),
        arguments: expr.Call.arguments,
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
    // 呼び出しの関数の位置で選んだときは参照だけを置き換える
    expect(
      applySelection(
        expr,
        ["callFunction"],
        `ref:part:${lessThanOrEqualHash}`,
        parameterNamesOf,
      ),
    ).toEqual(expected);
  });

  it("let は式全体で使われていない変数 ID で作る", () => {
    const expr = {
      Function: {
        parameters: [{ parameter_id: 4, parameter_name: "a" }],
        body: { Hole: {} },
      },
    };
    expect(nextVariableId(expr)).toBe(5);
    expect(applySelection(expr, ["functionBody"], "expr:let")).toEqual({
      Function: {
        parameters: [{ parameter_id: 4, parameter_name: "a" }],
        body: {
          Let: {
            bindings: [
              {
                variable_id: 5,
                variable_name: "x",
                value: { Number: { value: 0 } },
              },
            ],
            body: { Variable: { variable_id: 5 } },
          },
        },
      },
    });
  });
});

describe("partParameterNames", () => {
  it("関数の型のパーツは型の引数名", () => {
    expect(
      partParameterNames({
        partType: {
          function: {
            parameters: [{ name: "x", type: "number" }],
            return_type: "number",
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
        expression: { Compiler: "list_get" },
      }),
    ).toEqual(["list", "index"]);
    expect(
      partParameterNames({
        partType: "number",
        expression: { Number: { value: 1 } },
      }),
    ).toBeUndefined();
  });
});

describe("パーツの呼び出しの表示", () => {
  it("呼び出すパーツと引数名ごとの式を子に持つ", () => {
    const node = expressionToLayoutNode({
      Call: {
        function: {
          PartReference: {
            part_definition_event_hash: { $part: "core.list-get" },
          },
        },
        arguments: [
          { name: "list", value: { Variable: { variable_id: 0 } } },
          { name: "index", value: { Number: { value: 2 } } },
        ],
      },
    });
    expect(node.children.map((c) => c.label)).toEqual([
      "core.list-get",
      "list:",
      "index:",
    ]);
    expect(node.children.map((c) => c.path)).toEqual([
      ["callFunction"],
      [{ kind: "callArgument", index: 0 }],
      [{ kind: "callArgument", index: 1 }],
    ]);
  });
});

describe("関数の引数名を変える", () => {
  it("functionParameter のパスで引数の名前だけを変える (本体は ID で参照するのでそのまま)", () => {
    const expression = {
      Function: {
        parameters: [
          { parameter_id: 0, parameter_name: "x" },
          { parameter_id: 1, parameter_name: "y" },
        ],
        body: { Variable: { variable_id: 1 } },
      },
    };
    const layout = expressionToLayoutNode(expression);
    const parameterNode = layout.children[1];
    expect(parameterNode?.kind).toBe("parameterName");
    expect(
      renameFunctionParameter(expression, parameterNode?.path ?? [], "count"),
    ).toEqual({
      Function: {
        parameters: [
          { parameter_id: 0, parameter_name: "x" },
          { parameter_id: 1, parameter_name: "count" },
        ],
        body: { Variable: { variable_id: 1 } },
      },
    });
    expect(
      expressionToLayoutNode(
        renameFunctionParameter(expression, parameterNode?.path ?? [], "count"),
      ).children[2]?.label,
    ).toBe("count");
  });
});
