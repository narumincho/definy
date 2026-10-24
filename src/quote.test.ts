/**
 * quote 式 (コードそのものを値にする式) を stage1 でコンパイルして確かめる.
 * 値は core.code ({ expression, parts }) で, そのまま definy 製の core.compile-to-wasm に渡せる (docs/quote.md)
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  devSystemAccountBytes,
  loadSeedPartExpressions,
  resolvePartPlaceholders,
} from "./seed_parts.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
  evaluateCompiledWasm,
  partReferenceId,
  stage1PartsExpression,
} from "./stage1_compiler.ts";

const compiler = createStage1Compiler(
  new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
);
const accountBytes = await devSystemAccountBytes();
const seedPartExpressions = await loadSeedPartExpressions(accountBytes);

async function seedExpression(expression: unknown): Promise<unknown> {
  return await resolvePartPlaceholders(expression, accountBytes);
}

async function evaluate(expression: unknown): Promise<unknown> {
  const { parts, unresolved } = collectReferencedParts(expression, (id) =>
    seedPartExpressions.get(id),
  );
  expect(unresolved).toEqual([]);
  return await evaluateCompiledWasm(compiler.compile(expression, parts));
}

const absOfMinus3 = {
  Call: {
    function: {
      PartReference: { part_definition_event_hash: { $part: "std.abs" } },
    },
    arguments: [{ name: "x", value: { Number: { value: -3 } } }],
  },
};

describe("quote", () => {
  it("式と参照しているパーツを core.code の値にする", async () => {
    const value = (await evaluate(
      await seedExpression({ Quote: { expression: absOfMinus3 } }),
    )) as {
      readonly expression: { readonly tag: string };
      readonly part_ids: ReadonlyArray<string>;
    };
    const absId = partReferenceId(await seedExpression({ $part: "std.abs" }));
    expect(value.expression.tag).toBe("call");
    expect(value.part_ids).toContain(absId);
    // std.abs が参照する core のパーツもたどって入る
    expect(value.part_ids.length).toBeGreaterThan(1);
  });

  it("quote した値を definy 製の core.compile-to-wasm でコンパイルして実行できる", async () => {
    const quoted = await seedExpression({ Quote: { expression: absOfMinus3 } });
    const { part_ids: partIds } = (await evaluate(quoted)) as {
      readonly part_ids: ReadonlyArray<string>;
    };
    const bytes = (await evaluate(
      await seedExpression({
        Call: {
          function: {
            PartReference: {
              part_definition_event_hash: { $part: "core.compile-to-wasm" },
            },
          },
          arguments: [
            {
              name: "expr",
              value: { RecordGet: { record: quoted, key: "expression" } },
            },
            {
              name: "parts",
              value: stage1PartsExpression(
                partIds.map((id) => ({
                  id,
                  expression: seedPartExpressions.get(id),
                })),
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
      Quote: {
        expression: { Quote: { expression: { Number: { value: 1 } } } },
      },
    })) as { readonly expression: { readonly tag: string } };
    expect(value.expression.tag).toBe("quote");
  });
});
