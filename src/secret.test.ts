import { describe, expect, it } from "vitest";
import { findSecretUsages, secretLiteralOf } from "./secret.ts";
import type { PartSnapshot } from "./types.ts";

const part = (partId: string, expression: unknown): PartSnapshot => ({
  partId,
  moduleId: "m",
  moduleName: "m",
  name: partId,
  description: [],
  partType: null,
  contentHash: null,
  partIdHash: partId,
  expression,
  updatedAtMs: 0,
});

describe("シークレット", () => {
  const literal = {
    Secret: {
      id: "s1",
      label: "トークン",
      allowed_url_prefixes: ["https://a/"],
    },
  };

  it("シークレットリテラルの中身を読む", () => {
    expect(secretLiteralOf(literal)).toEqual({
      id: "s1",
      label: "トークン",
      allowed_url_prefixes: ["https://a/"],
    });
    expect(secretLiteralOf({ String: { value: "x" } })).toBeNull();
  });

  it("使用箇所はシークレットのパーツを参照しているパーツと, 同じ ID のリテラルを書いているパーツ", () => {
    const secretPart = part("token", literal);
    const usages = findSecretUsages(
      [
        secretPart,
        part("deploy", {
          Call: {
            function: { PartReference: { part_definition_event_hash: "x" } },
            arguments: [
              {
                name: "api_token",
                value: {
                  PartReference: { part_definition_event_hash: "token" },
                },
              },
            ],
          },
        }),
        part("copy", { Let: { bindings: [{ value: literal }] } }),
        part("other", { Number: { value: 1 } }),
      ],
      secretPart,
      "s1",
    );
    expect(usages.map((usage) => usage.partId)).toEqual(["deploy", "copy"]);
  });
});
