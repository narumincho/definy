import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  bytesToBase64,
  deriveModuleIdBytesSync,
  deriveModulePartIdSync,
  encodeCborItem,
  sha256EventHashIdSync,
  type DecodedPart,
} from "./cbor.ts";
import {
  hasPendingDefinitions,
  loadContents,
  missingContentHashes,
  toContentAddressedParts,
  withEvaluatedDefinitions,
} from "./content_store.ts";
import { evaluateDefinition } from "./definition_evaluator.ts";
import type { DefinitionEvaluator } from "./part_definition.ts";
import { loadSeedPartExpressions } from "./seed_parts.ts";

/** コミットの外のパーツの式 (seed の core など) */
const seedExpressions = await loadSeedPartExpressions();
const external = (id: string) => seedExpressions.get(id) ?? undefined;

const evaluator = new WebAssembly.Module(
  readFileSync("wasm/definition_evaluator.wasm"),
);
const evaluate: DefinitionEvaluator = (definition, resolve) =>
  evaluateDefinition(evaluator, definition, resolve);

const partId = (moduleName: string, name: string) =>
  deriveModulePartIdSync(deriveModuleIdBytesSync(moduleName), name);
const reference = (id: string) => ({
  "#part_reference": { part_definition_event_hash: id },
});
const tagged = (tag: string, payload?: unknown, typePart?: string) => ({
  "#variant": {
    tag,
    payload: payload === undefined ? { "#none": null } : { "#some": payload },
    type_part:
      typePart === undefined ? { "#none": null } : { "#some": typePart },
  },
});

/** app.define-number(value): 型が number で式が value の数のリテラルのパーツを定義する */
const defineNumberId = partId("app", "define-number");
const defineNumber: DecodedPart = {
  name: "define-number",
  description: [],
  partType: null,
  partIdHash: defineNumberId,
  expression: {
    "#function": {
      parameters: [{ parameter_id: 0, parameter_name: "value" }],
      body: {
        "#call": {
          function: reference(partId("core", "define-part")),
          arguments: [
            { name: "description", value: { "#list": [] } },
            { name: "visibility", value: tagged("public") },
            {
              name: "part_type",
              value: tagged("some", {
                "#record_get": {
                  record: { "#quote": { "#type_number": null } },
                  key: "expression",
                },
              }),
            },
            {
              name: "expression",
              value: tagged(
                "some",
                tagged(
                  "number",
                  { "#variable": { variable_id: 0 } },
                  partId("core", "expression"),
                ),
              ),
            },
          ],
        },
      },
    },
  },
};

describe("ユーザーが作った定義のパーツ (docs/part-definition.md)", () => {
  it("その場で評価できない定義の式は読んでおき, コミットの中で評価して埋める", async () => {
    const definition = {
      "#call": {
        function: reference(defineNumberId),
        arguments: [{ name: "value", value: { "#number": 42 } }],
      },
    };
    const bytes = encodeCborItem(definition);
    const contentHash = sha256EventHashIdSync(bytes);
    const answer: DecodedPart = {
      name: "answer",
      description: [],
      partType: null,
      expression: null,
      partIdHash: partId("app", "answer"),
      contentHash,
      unresolved: true,
    };
    expect(
      await loadContents([contentHash], () =>
        Promise.resolve({
          items: [{ contentHash, contentBytes: bytesToBase64(bytes) }],
        }),
      ),
    ).toBe(true);
    expect(hasPendingDefinitions()).toBe(true);
    // 読んだ定義の式は読み直さない
    expect(missingContentHashes([answer])).toEqual([]);

    const parts = [defineNumber, answer];
    // 評価器が無ければそのまま
    expect(
      withEvaluatedDefinitions("commit", parts, () => undefined, undefined),
    ).toBe(parts);
    const resolved = withEvaluatedDefinitions(
      "commit",
      parts,
      external,
      evaluate,
    );
    expect(resolved[1]).toEqual({
      name: "answer",
      description: [],
      visibility: "public",
      partType: { "#number": null },
      expression: { "#number": 42 },
      partIdHash: partId("app", "answer"),
      contentHash,
    });
    // 中身を変えずにコミットし直すと定義の式のまま. 変えれば core.define-part の定義の式にする
    const [kept] = toContentAddressedParts([resolved[1] as DecodedPart]).parts;
    expect(kept?.contentHash).toBe(contentHash);
    const [changed] = toContentAddressedParts([
      { ...(resolved[1] as DecodedPart), expression: { "#number": 43 } },
    ]).parts;
    expect(changed?.contentHash).not.toBe(contentHash);
    // 定義のパーツが無いコミットでは評価できない
    expect(
      withEvaluatedDefinitions("other", [answer], external, evaluate),
    ).toEqual([answer]);
  });
});
