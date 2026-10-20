import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import cases from "../conformance/eval_cases.json" with { type: "json" };
import {
  devSystemAccountBytes,
  loadSeedPartExpressions,
  resolvePartPlaceholders,
} from "./seed_parts.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
  evaluateCompiledWasm,
} from "./stage1_compiler.ts";

function normalizeToConformanceValue(val: unknown): unknown {
  if (
    val === null ||
    typeof val === "number" ||
    typeof val === "string" ||
    typeof val === "boolean"
  ) {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(normalizeToConformanceValue);
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if ("$variant" in obj) {
      return obj;
    }
    if ("$record" in obj) {
      return obj;
    }
    if ("__variant" in obj) {
      return {
        $variant: obj.__variant,
        payload: normalizeToConformanceValue(obj.payload ?? null),
      };
    }
    if ("tag" in obj && "payload" in obj) {
      return {
        $variant: obj.tag,
        payload: normalizeToConformanceValue(obj.payload ?? null),
      };
    }
    const entries = Object.entries(obj).map(([k, v]) => [
      k,
      normalizeToConformanceValue(v),
    ]);
    return { $record: entries };
  }
  return val;
}

const wasmBytes = readFileSync("wasm/stage1.wasm");
const compiler = createStage1Compiler(new WebAssembly.Module(wasmBytes));
const accountBytes = await devSystemAccountBytes();
const seedPartExpressions = await loadSeedPartExpressions(accountBytes);

describe("eval conformance (stage1.wasm)", () => {
  for (const testCase of cases.cases) {
    it(testCase.name, async () => {
      const expression = await resolvePartPlaceholders(
        testCase.expression,
        accountBytes,
      );
      const { parts, unresolved } = collectReferencedParts(expression, (id) =>
        seedPartExpressions.get(id),
      );
      expect(unresolved).toEqual([]);
      const compiledWasm = compiler.compile(expression, parts);
      const rawValue = await evaluateCompiledWasm(compiledWasm);
      const actualValue = normalizeToConformanceValue(rawValue);
      expect(actualValue).toEqual(testCase.expected);
    });
  }
});
