import { describe, expect, it } from "vitest";
import { expressionToLayoutNode } from "./ast_to_layout.ts";
import { findHoverTarget } from "./hover_info.ts";
import { collectNodeIndex } from "./selection.ts";

const partIdHash = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";

const expression = {
  Function: {
    parameters: [{ parameter_id: 0, parameter_name: "n" }],
    body: {
      Call: {
        function: {
          PartReference: { part_definition_event_hash: partIdHash },
        },
        arguments: [{ name: "x", value: { Variable: { variable_id: 0 } } }],
      },
    },
  },
};

describe("findHoverTarget", () => {
  const layoutRoot = expressionToLayoutNode(expression);
  const targetOf = (id: string) => findHoverTarget(layoutRoot, expression, id);
  const ids = collectNodeIndex(layoutRoot).map((node) => node.id);

  it("変数は名前を出す", () => {
    const id = ids.find((nodeId) => nodeId.endsWith(".arg_0.val"));
    expect(id).toBeDefined();
    expect(targetOf(id ?? "")).toMatchObject({
      variableName: "n",
      partIdHash: null,
      path: ["functionBody", { kind: "callArgument", index: 0 }],
    });
  });

  it("引数名のノードは引数の式にする", () => {
    const id = ids.find((nodeId) => nodeId.endsWith(".arg_0"));
    expect(targetOf(id ?? "")).toMatchObject({
      nodeId: `${id}.val`,
      variableName: "n",
    });
  });

  it("パーツの呼び出しと呼び出す関数の名前は, 呼び出しとして呼び出すパーツの ID を出す", () => {
    const fnId = ids.find((nodeId) => nodeId.endsWith(".fn"));
    expect(targetOf(fnId ?? "")).toMatchObject({
      path: ["functionBody"],
      partIdHash,
    });
    const callId = fnId?.slice(0, -".fn".length) ?? "";
    expect(targetOf(callId)).toMatchObject({
      path: ["functionBody"],
      partIdHash,
    });
  });

  it("見つからなければ null", () => {
    expect(targetOf("nothing")).toBeNull();
  });
});
