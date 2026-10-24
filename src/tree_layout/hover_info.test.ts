import { describe, expect, it } from "vitest";
import { expressionToLayoutNode } from "./ast_to_layout.ts";
import { findHoverTarget, hoverCardPosition } from "./hover_info.ts";
import { collectNodeIndex } from "./selection.ts";

const partIdHash = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";

const expression = {
  "#function": {
    parameters: [{ parameter_id: 0, parameter_name: "n" }],
    body: {
      "#call": {
        function: {
          "#part_reference": { part_definition_event_hash: partIdHash },
        },
        arguments: [{ name: "x", value: { "#variable": { variable_id: 0 } } }],
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

describe("hoverCardPosition", () => {
  const viewport = { width: 1000, height: 800 };
  const card = { width: 300, height: 100 };

  it("収まるときは式の下に左端を揃えて出す", () => {
    expect(
      hoverCardPosition({ top: 100, bottom: 120, left: 50 }, card, viewport),
    ).toEqual({ top: 124, left: 50 });
  });

  it("画面の下端に収まらないときは式の上に出す", () => {
    expect(
      hoverCardPosition({ top: 740, bottom: 760, left: 50 }, card, viewport),
    ).toEqual({ top: 636, left: 50 });
  });

  it("右端からはみ出すときは左にずらす", () => {
    expect(
      hoverCardPosition({ top: 100, bottom: 120, left: 900 }, card, viewport),
    ).toEqual({ top: 124, left: 692 });
  });

  it("上にも下にも収まらないときは画面の中に収める", () => {
    expect(
      hoverCardPosition(
        { top: 50, bottom: 70, left: 0 },
        { width: 300, height: 760 },
        viewport,
      ),
    ).toEqual({ top: 32, left: 8 });
  });
});
