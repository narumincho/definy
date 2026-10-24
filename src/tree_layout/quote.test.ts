import { describe, expect, it } from "vitest";
import { expressionToLayoutNode } from "./ast_to_layout.ts";
import { applySelection } from "./mutation.ts";
import { expressionToPartType, partTypeToExpression } from "./part_type.ts";
import { getExpressionAtPath, updateExpressionAtPath } from "./path.ts";
import { getOptionValueForExpression } from "./type_inference.ts";

describe("quote 式と Code<T> 型のツリーエディタ", () => {
  it("quote を選ぶと中が未入力の quote 式になり, 中の式をパスで辿れる", () => {
    const quote = applySelection({ Hole: {} }, [], "expr:quote");
    expect(quote).toEqual({ Quote: { expression: { Hole: {} } } });
    expect(getOptionValueForExpression(quote)).toBe("expr:quote");

    const filled = updateExpressionAtPath(quote, ["quoteExpression"], () => ({
      Number: { value: 1 },
    }));
    expect(filled).toEqual({ Quote: { expression: { Number: { value: 1 } } } });
    expect(getExpressionAtPath(filled, ["quoteExpression"])).toEqual({
      Number: { value: 1 },
    });

    const node = expressionToLayoutNode(filled, "root");
    expect(node.label).toBe("quote");
    expect(node.children?.[0]?.path).toEqual(["quoteExpression"]);
  });

  it("quote の中では外の変数の名前を出さない", () => {
    const node = expressionToLayoutNode(
      { Quote: { expression: { Variable: { variable_id: 0 } } } },
      "root",
      { scopeVariables: new Map([[0, "outer"]]) },
    );
    expect(JSON.stringify(node)).not.toContain("outer");
  });

  it("Code<T> の型は TypeCode の式と往復する", () => {
    const partType = { code: { list: "number" } };
    const expression = partTypeToExpression(partType);
    expect(expression).toEqual({
      TypeCode: { value_type: { TypeList: { item_type: "TypeNumber" } } },
    });
    expect(expressionToPartType(expression)).toEqual(partType);
    expect(getOptionValueForExpression(expression)).toBe("expr:type:code");
  });
});
