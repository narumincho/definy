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
import { literalExpression, variant } from "./definy_value.ts";
import { coreValueToValue } from "./definition_evaluator.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
  evaluateCompiledWasm,
  stage1PartsValue,
} from "./stage1_compiler.ts";

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
      expect(coreValueToValue(rawValue)).toEqual(testCase.expected);
    });
  }
});
