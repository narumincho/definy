import { describe, expect, it } from "vitest";
import {
  deployTargetExpression,
  detectDeployInExpression,
  stage1OutputCacheKey,
} from "./deploy_target.ts";

const handler = {
  Function: { parameters: [], body: { String: { value: "ok" } } },
};

function deployRecord(workerName: string) {
  return {
    TypeLiteral: {
      items: [
        { key: "cloudflareToken", value: { String: { value: "token" } } },
        {
          key: "cloudflareWorkerName",
          value: { String: { value: workerName } },
        },
        { key: "handler", value: handler },
      ],
    },
  };
}

describe("detectDeployInExpression", () => {
  it("definy.deploy({ config }) の引数のレコードから設定を読む", () => {
    const expression = {
      Call: {
        function: { PartReference: { part_definition_event_hash: "deploy" } },
        arguments: [{ name: "config", value: deployRecord(" my-app ") }],
      },
    };
    expect(detectDeployInExpression(expression)).toEqual({
      cloudflareToken: "token",
      cloudflareWorkerName: "my-app",
      handler,
    });
    expect(deployTargetExpression(expression).target).toBe(handler);
  });

  it("let の本体や束縛の中も探す", () => {
    const expression = {
      Let: {
        bindings: [
          { variable_id: 1, variable_name: "x", value: deployRecord("in-let") },
        ],
        body: { Number: { value: 1 } },
      },
    };
    expect(detectDeployInExpression(expression)?.cloudflareWorkerName).toBe(
      "in-let",
    );
  });

  it("worker 名の無いレコードはデプロイ設定ではないので, 式全体をコンパイルする", () => {
    const expression = {
      TypeLiteral: {
        items: [{ key: "handler", value: handler }],
      },
    };
    expect(detectDeployInExpression(expression)).toBeUndefined();
    expect(deployTargetExpression(expression)).toEqual({
      target: expression,
      deploy: undefined,
    });
  });
});

describe("stage1OutputCacheKey", () => {
  it("式と参照パーツが同じなら同じキーになる", async () => {
    const parts = [{ id: "a", expression: { Number: { value: 1 } } }];
    const key = await stage1OutputCacheKey(handler, parts);
    expect(key).toBe(await stage1OutputCacheKey(handler, parts));
    expect(key).not.toBe(await stage1OutputCacheKey(handler, []));
  });
});
