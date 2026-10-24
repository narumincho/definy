import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  loadSeedPartExpressions,
  resolvePartPlaceholders,
} from "./seed_parts.ts";
import { literalExpression, variant } from "./definy_value.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
  evaluateCompiledWasm,
} from "./stage1_compiler.ts";

const compiler = createStage1Compiler(
  new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
);
const seedPartExpressions = await loadSeedPartExpressions();

async function partReference(name: string): Promise<unknown> {
  return await resolvePartPlaceholders({
    "#part_reference": { part_definition_event_hash: { $part: name } },
  });
}

const stdAbs = await partReference("std.abs");
const stdAbsId = (await resolvePartPlaceholders({
  $part: "std.abs",
})) as string;

type TestPart = {
  readonly id: string;
  readonly partType: unknown;
  readonly expression: unknown;
};

/** `core.part-definition` の値 */
function partDefinition(part: TestPart): unknown {
  return {
    name: part.id,
    description: "",
    part_definition_event_hash: part.id,
    part_type: part.partType,
    expression: part.expression,
  };
}

/** `core.validate-module(mod_def, external)` を評価する */
async function validateModule(
  parts: ReadonlyArray<TestPart>,
  external: ReadonlyArray<{ readonly id: string; readonly partType: unknown }>,
): Promise<unknown> {
  const expression = {
    "#call": {
      function: await partReference("core.validate-module"),
      arguments: [
        {
          name: "mod_def",
          value: literalExpression({
            name: "test",
            description: "",
            parts: parts.map(partDefinition),
          }),
        },
        {
          name: "external",
          value: literalExpression(
            external.map((entry) => ({
              part_definition_event_hash: entry.id,
              part_type: entry.partType,
              type_declaration: variant("none"),
            })),
          ),
        },
      ],
    },
  };
  const { parts: referenced, unresolved } = collectReferencedParts(
    expression,
    (id) => seedPartExpressions.get(id),
  );
  expect(unresolved).toEqual([]);
  return await evaluateCompiledWasm(compiler.compile(expression, referenced));
}

const callAbs: TestPart = {
  id: "use-abs",
  partType: { "#number": null },
  expression: {
    "#call": {
      function: stdAbs,
      arguments: [{ name: "x", value: { "#number": -3 } }],
    },
  },
};
const stdAbsType = {
  "#function": {
    parameters: [{ name: "x", type: { "#number": null } }],
    return_type: { "#number": null },
  },
};

describe("core.validate-module", () => {
  it("外部のパーツ (他のモジュールのパーツ) を参照できる", async () => {
    expect(
      await validateModule([callAbs], [{ id: stdAbsId, partType: stdAbsType }]),
    ).toBe(true);
  });

  it("外部のパーツを渡さなければ参照できない", async () => {
    expect(await validateModule([callAbs], [])).toBe(false);
  });

  it("外部のパーツの引数の型まで検査する", async () => {
    expect(
      await validateModule(
        [
          {
            ...callAbs,
            expression: {
              "#call": {
                function: stdAbs,
                arguments: [{ name: "x", value: { "#string": "a" } }],
              },
            },
          },
        ],
        [{ id: stdAbsId, partType: stdAbsType }],
      ),
    ).toBe(false);
  });

  it("モジュールの型パーツの宣言した型で検査する", async () => {
    const point: TestPart = {
      id: "point",
      partType: { "#type": null },
      expression: {
        "#type_record": [{ key: "x", value: { "#type_number": null } }],
      },
    };
    const origin = (value: unknown): TestPart => ({
      id: "origin",
      partType: { "#reference": { part_hash: "point" } },
      expression: { "#record": [{ key: "x", value }] },
    });
    expect(await validateModule([point, origin({ "#number": 0 })], [])).toBe(
      true,
    );
    expect(await validateModule([point, origin({ "#string": "0" })], [])).toBe(
      false,
    );
  });
});
