/**
 * 評価器の適合テストを stage1 (`wasm/stage1.wasm`) でコンパイルして動かす。
 *
 * - 型検査を通る適合テストは definy のテストのパーツ (モジュール `conformance` の `test-*`, 型は Boolean)。
 *   definy 製の評価器 (`core.eval-value`) では MCP の `definy_run_tests` が動かす
 *   (`worker/mcp_endpoint.test.ts`)。ここではコンパイルした Wasm でも `true` になるかを確かめる
 * - 型検査を通らない式のテストは `conformance/eval_cases.json` に残してある
 *   (`src/eval_value_conformance.test.ts` も同じものを評価器で動かす)
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import cases from "../conformance/eval_cases.json" with { type: "json" };
import {
  loadSeedPartExpressions,
  loadSeedPartNames,
  resolvePartPlaceholders,
} from "./seed_parts.ts";
import { variant } from "./definy_value.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
  evaluateCompiledWasm,
} from "./stage1_compiler.ts";

const wasmBytes = readFileSync("wasm/stage1.wasm");
const compiler = createStage1Compiler(new WebAssembly.Module(wasmBytes));
const seedPartExpressions = await loadSeedPartExpressions();

const run = async (expression: unknown): Promise<unknown> => {
  const { parts, unresolved } = collectReferencedParts(expression, (id) =>
    seedPartExpressions.get(id),
  );
  expect(unresolved).toEqual([]);
  return evaluateCompiledWasm(compiler.compile(expression, parts));
};

const conformanceTests = [...(await loadSeedPartNames())]
  .filter(([, name]) => name.startsWith("conformance.test-"))
  .sort(([, a], [, b]) => a.localeCompare(b));

describe("eval conformance test parts (stage1.wasm)", () => {
  it("conformance のテストのパーツがある", () => {
    expect(conformanceTests.length).toBeGreaterThan(100);
  });
  for (const [id, name] of conformanceTests) {
    it(name, async () => {
      expect(
        await run(
          variant("part_reference", { part_definition_event_hash: id }),
        ),
      ).toBe(true);
    });
  }
});

describe("eval conformance (stage1.wasm)", () => {
  for (const testCase of cases.cases) {
    it(testCase.name, async () => {
      expect(
        await run(await resolvePartPlaceholders(testCase.expression)),
      ).toEqual(testCase.expected);
    });
  }
});
