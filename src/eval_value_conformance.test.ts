/**
 * definy 製の評価器 `core.eval-value` が, 評価器の適合テスト (`conformance/eval_cases.json`) を
 * stage1 でコンパイルした式 (`src/stage1_conformance.test.ts`) と同じ値に評価することを確かめる。
 *
 * テストの式 (`core.expression` の値) を, 式が参照するパーツと一緒に `core.eval-value` に渡す
 * `core.eval-value(expr, [], parts)` を stage1 でコンパイルして実行する
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import cases from "../conformance/eval_cases.json" with { type: "json" };
import {
  loadSeedPartExpressions,
  resolvePartPlaceholders,
} from "./seed_parts.ts";
import { literalExpression, variant, variantOf } from "./definy_value.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
  type DefinyValue,
  evaluateCompiledWasm,
  stage1PartsValue,
} from "./stage1_compiler.ts";

/** `core.value` を, それが表す値 (stage1 でコンパイルして評価した結果と同じ形) にする */
function coreValueToConformanceValue(value: unknown): unknown {
  const tagged = variantOf(value);
  if (tagged === undefined) {
    throw new Error(`Not a core.value: ${JSON.stringify(value)}`);
  }
  const payload = tagged.payload as DefinyValue;
  switch (tagged.tag) {
    case "number":
    case "float":
    case "string":
    case "boolean":
      return payload;
    case "list":
      return (payload as ReadonlyArray<DefinyValue>).map(
        coreValueToConformanceValue,
      );
    case "record":
      return Object.fromEntries(
        (
          payload as ReadonlyArray<{
            readonly key: string;
            readonly value: DefinyValue;
          }>
        ).map((item) => [item.key, coreValueToConformanceValue(item.value)]),
      );
    case "variant": {
      const inner = payload as {
        readonly tag: string;
        readonly payload: DefinyValue;
      };
      return variant(
        inner.tag,
        variantOf(inner.payload)?.tag === "unit"
          ? null
          : coreValueToConformanceValue(inner.payload),
      );
    }
    case "unit":
      return null;
  }
  throw new Error(`Unexpected core.value: ${JSON.stringify(value)}`);
}

const wasmBytes = readFileSync("wasm/stage1.wasm");
const compiler = createStage1Compiler(new WebAssembly.Module(wasmBytes));
const seedPartExpressions = await loadSeedPartExpressions();
const evalValueReference = await resolvePartPlaceholders(
  variant("part_reference", {
    part_definition_event_hash: { $part: "core.eval-value" },
  }),
);

describe("eval conformance (core.eval-value)", () => {
  for (const testCase of cases.cases) {
    it(testCase.name, async () => {
      const expression = await resolvePartPlaceholders(testCase.expression);
      const referenced = collectReferencedParts(expression, (id) =>
        seedPartExpressions.get(id),
      );
      expect(referenced.unresolved).toEqual([]);
      const evalExpression = variant("call", {
        function: evalValueReference,
        arguments: [
          { name: "expr", value: literalExpression(expression) },
          { name: "env", value: literalExpression([]) },
          {
            name: "parts",
            value: literalExpression(stage1PartsValue(referenced.parts)),
          },
        ],
      });
      const { parts, unresolved } = collectReferencedParts(
        evalExpression,
        (id) => seedPartExpressions.get(id),
      );
      expect(unresolved).toEqual([]);
      const rawValue = await evaluateCompiledWasm(
        compiler.compile(evalExpression, parts),
      );
      expect(coreValueToConformanceValue(rawValue)).toEqual(testCase.expected);
    });
  }
});
