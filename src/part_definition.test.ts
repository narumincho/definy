import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { PartContent } from "./event_content.ts";
import {
  decodePartDefinition,
  definitionPartIdsOf,
  evaluatePartDefinition,
  literalExpression,
  partDefinitionExpression,
} from "./part_definition.ts";
import {
  loadSeedPartExpressions,
  resolvePartPlaceholders,
} from "./seed_parts.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
  evaluateCompiledWasm,
} from "./stage1_compiler.ts";

const compiler = createStage1Compiler(
  new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
);
const seedPartExpressions = await loadSeedPartExpressions();

/** seed のパーツの中身 (`{"$part": ...}` はパーツ ID にする) */
async function seedPartContent(
  moduleName: string,
  partName: string,
): Promise<PartContent> {
  const seed = JSON.parse(readFileSync(`seeds/${moduleName}.json`, "utf8")) as {
    readonly parts: ReadonlyArray<Readonly<Record<string, unknown>>>;
  };
  const part = seed.parts.find((p) => p.name === partName);
  if (part === undefined) {
    throw new Error(`no part ${moduleName}.${partName}`);
  }
  return {
    description: part.description as PartContent["description"],
    visibility: part.visibility === "private" ? "private" : "public",
    partType: await resolvePartPlaceholders(part.part_type ?? null),
    expression: await resolvePartPlaceholders(part.expression ?? null),
  };
}

/** 定義の式を stage1 でコンパイルして評価する */
async function evaluateWithStage1(definition: unknown): Promise<unknown> {
  const { parts, unresolved } = collectReferencedParts(definition, (id) =>
    seedPartExpressions.get(id),
  );
  expect(unresolved).toEqual([]);
  return await evaluateCompiledWasm(compiler.compile(definition, parts));
}

describe("パーツの定義の式", () => {
  it("型パーツは core.define-type, それ以外は core.define-part の呼び出しになり, 評価すると中身に戻る", () => {
    const typePart: PartContent = {
      description: [{ language: "ja", text: "色" }],
      visibility: "private",
      partType: { "#type": null },
      expression: {
        "#type_union": [
          { tag: "red", payload_type: { "#none": null } },
          { tag: "blue", payload_type: { "#none": null } },
        ],
      },
    };
    const valuePart: PartContent = {
      description: [],
      visibility: "public",
      partType: { "#number": null },
      expression: { "#number": 42 },
    };
    const emptyPart: PartContent = {
      description: [{ language: "en", text: "unfinished" }],
      visibility: "public",
      partType: null,
      expression: null,
    };
    const ids = definitionPartIdsOf();
    const callee = (definition: unknown) =>
      (definition as { "#call": { function: unknown } })["#call"].function;
    expect(callee(partDefinitionExpression(typePart))).toEqual({
      "#part_reference": { part_definition_event_hash: ids.defineType },
    });
    expect(callee(partDefinitionExpression(valuePart))).toEqual({
      "#part_reference": { part_definition_event_hash: ids.definePart },
    });
    for (const content of [typePart, valuePart, emptyPart]) {
      expect(decodePartDefinition(partDefinitionExpression(content))).toEqual(
        content,
      );
    }
  });

  it("定義の式に書けない形や, 評価しても core.part-content にならないものは読まない", () => {
    const ids = definitionPartIdsOf();
    const definePart = (args: Readonly<Record<string, unknown>>) => ({
      "#call": {
        function: {
          "#part_reference": { part_definition_event_hash: ids.definePart },
        },
        arguments: Object.entries(args).map(([name, value]) => ({
          name,
          value,
        })),
      },
    });
    const valid = {
      description: literalExpression([]),
      visibility: literalExpression({ "#public": null }),
      part_type: literalExpression({ "#none": null }),
      expression: literalExpression({ "#none": null }),
    };
    expect(decodePartDefinition(definePart(valid))).toEqual({
      description: [],
      visibility: "public",
      partType: null,
      expression: null,
    });
    // 以前の形 (core.part-content の値そのもの)
    expect(
      decodePartDefinition({
        description: [],
        visibility: { "#public": null },
        part_type: { "#none": null },
        expression: { "#none": null },
      }),
    ).toBeUndefined();
    // 引数が足りない
    const { expression: _, ...missing } = valid;
    expect(evaluatePartDefinition(definePart(missing))).toBeUndefined();
    // ここで評価しない式 (変数)
    expect(
      evaluatePartDefinition(
        definePart({
          ...valid,
          description: { "#variable": { variable_id: 0 } },
        }),
      ),
    ).toBeUndefined();
    // 評価はできるが, 式が core.expression の形でない
    expect(
      decodePartDefinition(
        definePart({
          ...valid,
          expression: literalExpression({ "#some": { "#nope": 1 } }),
        }),
      ),
    ).toBeUndefined();
  });

  it("ここでの評価は stage1 で定義の式を評価した結果と同じ", async () => {
    const samples: ReadonlyArray<readonly [string, string]> = [
      ["core", "visibility"],
      ["core", "option"],
      ["core", "plus"],
      ["core", "define-part"],
      ["core", "define-type"],
      ["core", "localized-text"],
    ];
    for (const [moduleName, partName] of samples) {
      const definition = partDefinitionExpression(
        await seedPartContent(moduleName, partName),
      );
      expect(await evaluateWithStage1(definition)).toEqual(
        evaluatePartDefinition(definition),
      );
    }
  });
});
