import { describe, expect, it } from "vitest";
import { expressionToLayoutNode } from "./ast_to_layout.ts";

describe("expressionToLayoutNode", () => {
  it("コンパイラ組み込みは式の値から builtin と出す (パーツ名によらない)", () => {
    const node = expressionToLayoutNode(
      { "#builtin": "string_concat" },
      "root",
      {
        // パーツ名が変わっていても表示は変わらない
        partNames: new Map([["string-concat-id", "renamed-concat"]]),
      },
    );
    expect(node.label).toBe("builtin string-concat");
    expect(node.kind).toBe("keyword");
    expect(
      expressionToLayoutNode({ "#builtin": "less_than_or_equal" }).label,
    ).toBe("builtin less-than-or-equal");
  });
});
