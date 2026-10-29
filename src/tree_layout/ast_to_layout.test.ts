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

  it("呼び出しの引数はデータ上の順番によらず, 呼び出すパーツの引数の宣言の順に表示する", () => {
    const node = expressionToLayoutNode(
      {
        "#call": {
          function: {
            "#part_reference": { part_definition_event_hash: "minus-id" },
          },
          arguments: [
            { name: "right", value: { "#number": 1 } },
            { name: "left", value: { "#number": 10 } },
          ],
        },
      },
      "root",
      {
        partNames: new Map([["minus-id", "minus"]]),
        callParameterNames: new Map([["minus-id", ["left", "right"]]]),
      },
    );
    const args = node.children.slice(1);
    expect(args.map((arg) => arg.label)).toEqual(["left:", "right:"]);
    // パスはデータ上の位置のまま
    expect(args.map((arg) => arg.path)).toEqual([
      [{ kind: "callArgument", index: 1 }],
      [{ kind: "callArgument", index: 0 }],
    ]);
  });
});
