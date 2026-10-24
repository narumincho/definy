import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  loadSeedPartExpressions,
  resolvePartPlaceholders,
} from "./seed_parts.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
  evaluateCompiledWasm,
  stage1PartsValue,
} from "./stage1_compiler.ts";
import { literalExpression } from "./definy_value.ts";

const compiler = createStage1Compiler(
  new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
);
const seedPartExpressions = await loadSeedPartExpressions();

async function seedExpression(expression: unknown): Promise<unknown> {
  return await resolvePartPlaceholders(expression);
}

async function evaluate(expression: unknown): Promise<unknown> {
  const { parts, unresolved } = collectReferencedParts(expression, (id) =>
    seedPartExpressions.get(id),
  );
  expect(unresolved).toEqual([]);
  return await evaluateCompiledWasm(compiler.compile(expression, parts));
}

const absOfMinus3 = {
  "#call": {
    function: {
      "#part_reference": { part_definition_event_hash: { $part: "std.abs" } },
    },
    arguments: [{ name: "x", value: { "#number": -3 } }],
  },
};

describe("quote", () => {
  it("式と参照しているパーツを core.code の値にする", async () => {
    const value = (await evaluate(
      await seedExpression({ "#quote": absOfMinus3 }),
    )) as {
      readonly expression: object;
      readonly part_ids: ReadonlyArray<string>;
    };
    const absId = await seedExpression({ $part: "std.abs" });
    expect(Object.keys(value.expression)).toEqual(["#call"]);
    expect(value.part_ids).toContain(absId);
    // std.abs が参照する core のパーツもたどって入る
    expect(value.part_ids.length).toBeGreaterThan(1);
  });

  it("quote した値を definy 製の core.compile-to-wasm でコンパイルして実行できる", async () => {
    const quoted = await seedExpression({ "#quote": absOfMinus3 });
    const { part_ids: partIds } = (await evaluate(quoted)) as {
      readonly part_ids: ReadonlyArray<string>;
    };
    const bytes = (await evaluate(
      await seedExpression({
        "#call": {
          function: {
            "#part_reference": {
              part_definition_event_hash: { $part: "core.compile-to-wasm" },
            },
          },
          arguments: [
            {
              name: "expr",
              value: { "#record_get": { record: quoted, key: "expression" } },
            },
            {
              name: "parts",
              value: literalExpression(
                stage1PartsValue(
                  partIds.map((id) => ({
                    id,
                    expression: seedPartExpressions.get(id),
                  })),
                ),
              ),
            },
          ],
        },
      }),
    )) as ReadonlyArray<number>;
    expect(await evaluateCompiledWasm(new Uint8Array(bytes))).toBe(3);
  }, 120_000);

  it("quote の中の quote も値になる", async () => {
    const value = (await evaluate({
      "#quote": { "#quote": { "#number": 1 } },
    })) as { readonly expression: unknown };
    expect(value.expression).toEqual({ "#quote": { "#number": 1 } });
  });
});
