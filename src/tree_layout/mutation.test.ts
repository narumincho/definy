import { describe, expect, it } from "vitest";
import {
  applySelection,
  getExpressionAtPath,
  nextVariableId,
  renameFunctionParameter,
  updateExpressionAtPath,
} from "./mutation.ts";
import { expressionToLayoutNode } from "./ast_to_layout.ts";
import { getOptionValueForExpression } from "./type_inference.ts";
import { bytesToUrlSafeBase64NoPad } from "../cbor.ts";

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

describe("applySelection の旧版の挙動", () => {
  it("二項演算を別の二項演算に差し替えるときは左右の式を引き継ぐ", () => {
    const expr = {
      LessThan: {
        left: { Variable: { variable_id: 3 } },
        right: { Number: { value: 0 } },
      },
    };
    expect(applySelection(expr, [], "expr:less_than_or_equal")).toEqual({
      LessThanOrEqual: {
        left: { Variable: { variable_id: 3 } },
        right: { Number: { value: 0 } },
      },
    });
  });

  it("二項演算でない式から選んだときは既定の左右の式にする", () => {
    expect(applySelection({ Number: { value: 5 } }, [], "expr:add")).toEqual({
      Add: { left: { Number: { value: 0 } }, right: { Number: { value: 0 } } },
    });
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

describe("list-get などの子の式", () => {
  const listGet = {
    ListGet: {
      list: { Variable: { variable_id: 0 } },
      index: { Number: { value: 2 } },
    },
  };

  it("パスで取得・更新できる", () => {
    expect(getExpressionAtPath(listGet, ["index"])).toEqual({
      Number: { value: 2 },
    });
    expect(
      updateExpressionAtPath(listGet, ["left"], () => ({ Hole: {} })),
    ).toEqual({
      ListGet: { list: { Hole: {} }, index: { Number: { value: 2 } } },
    });
  });

  it("ツリーに子の式として表示する", () => {
    const node = expressionToLayoutNode(listGet);
    expect(node.label).toBe("list-get");
    expect(node.children.map((c) => c.path)).toEqual([["left"], ["index"]]);
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
