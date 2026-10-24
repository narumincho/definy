import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import cases from "../conformance/eval_cases.json" with { type: "json" };
import {
  loadSeedPartExpressions,
  resolvePartPlaceholders,
} from "./seed_parts.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
  evaluateCompiledWasm,
} from "./stage1_compiler.ts";

const wasmBytes = readFileSync("wasm/stage1.wasm");
const compiler = createStage1Compiler(new WebAssembly.Module(wasmBytes));
const seedPartExpressions = await loadSeedPartExpressions();

describe("eval conformance (stage1.wasm)", () => {
  for (const testCase of cases.cases) {
    it(testCase.name, async () => {
      const expression = await resolvePartPlaceholders(testCase.expression);
      const { parts, unresolved } = collectReferencedParts(expression, (id) =>
        seedPartExpressions.get(id),
      );
      expect(unresolved).toEqual([]);
      const compiledWasm = compiler.compile(expression, parts);
      const rawValue = await evaluateCompiledWasm(compiledWasm);
      expect(rawValue).toEqual(testCase.expected);
    });
  }
});
