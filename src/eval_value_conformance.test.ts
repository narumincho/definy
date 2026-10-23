/**
 * definy 製の評価器 `core.eval-value` が, 評価器の適合テスト (`conformance/eval_cases.json`) を
 * stage1 でコンパイルした式 (`src/stage1_conformance.test.ts`) と同じ値に評価することを確かめる。
 *
 * テストの式を `core.expression` の値にして, 式が参照するパーツと一緒に `core.eval-value` に渡す
 * `core.eval-value(expr, [], parts)` を stage1 でコンパイルして実行する
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import cases from "../conformance/eval_cases.json" with { type: "json" };
import {
  devSystemAccountBytes,
  loadSeedPartExpressions,
  resolvePartPlaceholders,
} from "./seed_parts.ts";
import { selfHostedList } from "./self_hosted_ast.ts";
import {
  builtinResolverOf,
  collectReferencedParts,
  createStage1Compiler,
  type DefinyValue,
  definyAstToSelfHostedAst,
  evaluateCompiledWasm,
  stage1PartsExpression,
} from "./stage1_compiler.ts";

/** `core.value` を適合テストの正規化表現にする */
function coreValueToConformanceValue(value: DefinyValue): unknown {
  if (value === null || typeof value !== "object" || !("tag" in value)) {
    throw new Error(`Not a core.value: ${JSON.stringify(value)}`);
  }
  const { tag, payload } = value as {
    readonly tag: string;
    readonly payload: DefinyValue;
  };
  switch (tag) {
    case "number":
    case "string":
    case "boolean":
      return payload;
    case "list":
      return (payload as ReadonlyArray<DefinyValue>).map(
        coreValueToConformanceValue,
      );
    case "record":
      return {
        $record: (
          payload as ReadonlyArray<{
            readonly key: string;
            readonly value: DefinyValue;
          }>
        ).map((field) => [field.key, coreValueToConformanceValue(field.value)]),
      };
    case "variant": {
      const variant = payload as {
        readonly tag: string;
        readonly payload: DefinyValue;
      };
      const inner = variant.payload as { readonly tag?: string } | null;
      return {
        $variant: variant.tag,
        payload:
          inner?.tag === "unit"
            ? null
            : coreValueToConformanceValue(variant.payload),
      };
    }
    case "unit":
      return null;
  }
  throw new Error(`Unexpected core.value: ${JSON.stringify(value)}`);
}

const wasmBytes = readFileSync("wasm/stage1.wasm");
const compiler = createStage1Compiler(new WebAssembly.Module(wasmBytes));
const accountBytes = await devSystemAccountBytes();
const seedPartExpressions = await loadSeedPartExpressions(accountBytes);
const evalValueReference = await resolvePartPlaceholders(
  {
    PartReference: { part_definition_event_hash: { $part: "core.eval-value" } },
  },
  accountBytes,
);

describe("eval conformance (core.eval-value)", () => {
  for (const testCase of cases.cases) {
    it(testCase.name, async () => {
      const expression = await resolvePartPlaceholders(
        testCase.expression,
        accountBytes,
      );
      const referenced = collectReferencedParts(expression, (id) =>
        seedPartExpressions.get(id),
      );
      expect(referenced.unresolved).toEqual([]);
      const evalExpression = {
        Call: {
          function: evalValueReference,
          arguments: [
            {
              name: "expr",
              value: definyAstToSelfHostedAst(
                expression,
                builtinResolverOf(referenced.parts),
              ),
            },
            { name: "env", value: selfHostedList([]) },
            {
              name: "parts",
              value: stage1PartsExpression(referenced.parts),
            },
          ],
        },
      };
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
