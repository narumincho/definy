import { describe, expect, it } from "vitest";
import { findSecretUsages, listSecrets, secretLiteralOf } from "./secret.ts";
import type { PartSnapshot } from "./types.ts";

const part = (partId: string, expression: unknown): PartSnapshot => ({
  partId,
  moduleId: "m",
  moduleName: "m",
  name: partId,
  description: [],
  visibility: "public",
  partType: null,
  contentHash: null,
  partIdHash: partId,
  expression,
  updatedAtMs: 0,
});

describe("シークレット", () => {
  const literal = {
    "#secret": {
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
    expect(secretLiteralOf({ "#string": "x" })).toBeNull();
  });

  it("使用箇所はシークレットのパーツを参照しているパーツと, 同じ ID のリテラルを書いているパーツ", () => {
    const secretPart = part("token", literal);
    const usages = findSecretUsages(
      [
        secretPart,
        part("deploy", {
          "#call": {
            function: {
              "#part_reference": { part_definition_event_hash: "x" },
            },
            arguments: [
              {
                name: "api_token",
                value: {
                  "#part_reference": { part_definition_event_hash: "token" },
                },
              },
            ],
          },
        }),
        part("copy", {
          "#let": {
            variable_id: 0,
            variable_name: "t",
            value: literal,
            body: { "#variable": { variable_id: 0 } },
          },
        }),
        part("other", { "#number": 1 }),
      ],
      secretPart,
      "s1",
    );
    expect(usages.map((usage) => usage.partId)).toEqual(["deploy", "copy"]);
  });
});

describe("シークレットの一覧", () => {
  const secretPart = (partId: string, id: string, label: string) =>
    part(partId, {
      "#secret": { id, label, allowed_url_prefixes: ["https://a/"] },
    });

  it("シークレットのパーツと, 値を入れてあるシークレットを ID ごとにまとめて名前順に並べる", () => {
    const items = listSecrets(
      [
        secretPart("b-token", "s-b", "B トークン"),
        secretPart("a-token", "s-a", "A トークン"),
        secretPart("a-token-copy", "s-a", "A トークン"),
        part("other", { "#string": "x" }),
      ],
      {
        "s-a": { label: "A トークン", value: "v" },
        "s-gone": { label: "消えたパーツ", value: "w" },
      },
    );
    expect(
      items.map((item) => ({
        id: item.id,
        label: item.label,
        parts: item.parts.map((p) => p.partId),
        stored: item.stored?.value,
      })),
    ).toEqual([
      {
        id: "s-a",
        label: "A トークン",
        parts: ["a-token", "a-token-copy"],
        stored: "v",
      },
      { id: "s-b", label: "B トークン", parts: ["b-token"], stored: undefined },
      { id: "s-gone", label: "消えたパーツ", parts: [], stored: "w" },
    ]);
  });
});
