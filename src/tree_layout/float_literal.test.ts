import { describe, expect, it } from "vitest";
import { expressionToLayoutNode } from "./ast_to_layout.ts";
import {
  floatExpression,
  floatExpressionFromNumber,
  formatFloatLiteral,
} from "./expression.ts";
import { setNumberValue } from "./path.ts";
import { applySelection } from "./selection.ts";

describe("浮動小数のリテラル", () => {
  it("数を最短の 10 進表記の仮数と指数にする", () => {
    expect(floatExpressionFromNumber(1.5)).toEqual(floatExpression(15, -1));
    expect(floatExpressionFromNumber(0.1)).toEqual(floatExpression(1, -1));
    expect(floatExpressionFromNumber(-2)).toEqual(floatExpression(-2, 0));
    expect(floatExpressionFromNumber(1e25)).toEqual(floatExpression(1, 25));
    expect(floatExpressionFromNumber(1.5e-7)).toEqual(floatExpression(15, -8));
    expect(floatExpressionFromNumber(Number.NaN)).toBeNull();
  });

  it("整数でも小数点を付けて表示する", () => {
    expect(formatFloatLiteral({ mantissa: 15, exponent: -1 })).toBe("1.5");
    expect(formatFloatLiteral({ mantissa: 2, exponent: 0 })).toBe("2.0");
    expect(formatFloatLiteral({ mantissa: 25, exponent: 2 })).toBe("2500.0");
    expect(formatFloatLiteral({ mantissa: 1, exponent: 25 })).toBe("1e+25");
    expect(expressionToLayoutNode(floatExpression(15, -1)).label).toBe("1.5");
  });

  it("置換メニューの float で 0.0 を作り, 数を打つと浮動小数のリテラルのまま変える", () => {
    const created = applySelection(
      { "#hole": { probe: false } },
      [],
      "expr:float",
    );
    expect(created).toEqual(floatExpression(0, 0));
    expect(setNumberValue(created, [], 3)).toEqual(floatExpression(3, 0));
    // 整数のリテラルに小数を打つと浮動小数のリテラルにする
    expect(setNumberValue({ "#number": 1 }, [], 2.5)).toEqual(
      floatExpression(25, -1),
    );
    expect(setNumberValue({ "#number": 1 }, [], 7)).toEqual({ "#number": 7 });
  });
});
