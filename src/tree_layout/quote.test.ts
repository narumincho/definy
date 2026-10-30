import { describe, expect, it } from "vitest";
import { expressionToLayoutNode } from "./ast_to_layout.ts";
import { applySelection } from "./mutation.ts";
import { expressionToTypeAst, typeAstToExpression } from "./part_type.ts";
import { getExpressionAtPath, updateExpressionAtPath } from "./path.ts";
import { getOptionValueForExpression } from "./type_inference.ts";

describe("quote 式と Code<T> 型のツリーエディタ", () => {
  it("quote を選ぶと中が未入力の quote 式になり, 中の式をパスで辿れる", () => {
    const quote = applySelection(
      { "#hole": { probe: false } },
      [],
      "expr:quote",
    );
    expect(quote).toEqual({ "#quote": { "#hole": { probe: false } } });
    expect(getOptionValueForExpression(quote)).toBe("expr:quote");

    const filled = updateExpressionAtPath(quote, ["quoteExpression"], () => ({
      "#number": 1,
    }));
    expect(filled).toEqual({ "#quote": { "#number": 1 } });
    expect(getExpressionAtPath(filled, ["quoteExpression"])).toEqual({
      "#number": 1,
    });

    const node = expressionToLayoutNode(filled, "root");
    expect(node.label).toBe("quote");
    expect(node.children?.[0]?.path).toEqual(["quoteExpression"]);
  });

  it("quote の中では外の変数の名前を出さない", () => {
    const node = expressionToLayoutNode(
      { "#quote": { "#variable": { variable_id: 0 } } },
      "root",
      { scopeVariables: new Map([[0, "outer"]]) },
    );
    expect(JSON.stringify(node)).not.toContain("outer");
  });

  it("Code<T> の型は type_code の式と往復する", () => {
    const partType = {
      "#code": { "#list": { item_type: { "#number": null } } },
    };
    const expression = typeAstToExpression(partType);
    expect(expression).toEqual({
      "#type_code": {
        value_type: { "#type_list": { item_type: { "#type_number": null } } },
      },
    });
    expect(expressionToTypeAst(expression)).toEqual(partType);
    expect(getOptionValueForExpression(expression)).toBe("expr:type:code");
  });
});

describe("シークレットリテラルのツリーエディタ", () => {
  it("secret を選ぶとランダムな ID のシークレットリテラルになり, 名前だけ表示する", () => {
    const first = applySelection(
      { "#hole": { probe: false } },
      [],
      "expr:secret",
    ) as {
      readonly "#secret": { readonly id: string; readonly label: string };
    };
    const second = applySelection(
      { "#hole": { probe: false } },
      [],
      "expr:secret",
    ) as {
      readonly "#secret": { readonly id: string };
    };
    expect(first["#secret"].id).not.toBe(second["#secret"].id);
    expect(first["#secret"]).toMatchObject({
      label: "secret",
      allowed_url_prefixes: [],
    });
    expect(getOptionValueForExpression(first)).toBe("expr:secret");
    expect(expressionToLayoutNode(first, "root").label).toBe("secret secret");
  });

  it("Secret 型は type_secret の式と往復する", () => {
    expect(typeAstToExpression({ "#secret": null })).toEqual({
      "#type_secret": null,
    });
    expect(expressionToTypeAst({ "#type_secret": null })).toEqual({
      "#secret": null,
    });
  });
});
