/**
 * definy 製の `core.validate-module` (モジュールの全パーツを, モジュールのパーツと外部のパーツから
 * `core.build-type-env` で作った型環境のもとで検査する) を stage1 でコンパイルして確かめる
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  devSystemAccountBytes,
  loadSeedPartExpressions,
  resolvePartPlaceholders,
} from "./seed_parts.ts";
import { list, record, string, variant } from "./self_hosted_ast.ts";
import {
  partTypeToSelfHostedAst,
  typeDeclarationToSelfHostedAst,
} from "./self_hosted_type_check.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
  definyAstToSelfHostedAst,
  evaluateCompiledWasm,
  partReferenceId,
} from "./stage1_compiler.ts";

const compiler = createStage1Compiler(
  new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
);
const accountBytes = await devSystemAccountBytes();
const seedPartExpressions = await loadSeedPartExpressions(accountBytes);

async function partReference(name: string): Promise<{
  readonly PartReference: { readonly part_definition_event_hash: unknown };
}> {
  return (await resolvePartPlaceholders(
    { PartReference: { part_definition_event_hash: { $part: name } } },
    accountBytes,
  )) as {
    readonly PartReference: { readonly part_definition_event_hash: unknown };
  };
}

const stdAbs = await partReference("std.abs");
const stdAbsId = partReferenceId(
  stdAbs.PartReference.part_definition_event_hash,
);

type TestPart = {
  readonly id: string;
  readonly partType: unknown;
  readonly expression: unknown;
};

/** `core.part-definition` の値を作る式 */
function partDefinition(part: TestPart): unknown {
  return record([
    ["name", string(part.id)],
    ["description", string("")],
    ["part_definition_event_hash", string(part.id)],
    ["part_type", partTypeToSelfHostedAst(part.partType)],
    [
      "expression",
      part.partType === "type"
        ? typeDeclarationToSelfHostedAst(part.expression)
        : definyAstToSelfHostedAst(part.expression),
    ],
  ]);
}

/** `core.validate-module(mod_def, external)` を評価する */
async function validateModule(
  parts: ReadonlyArray<TestPart>,
  external: ReadonlyArray<{ readonly id: string; readonly partType: unknown }>,
): Promise<unknown> {
  const expression = {
    Call: {
      function: await partReference("core.validate-module"),
      arguments: [
        {
          name: "mod_def",
          value: record([
            ["name", string("test")],
            ["description", string("")],
            ["parts", list(parts.map(partDefinition))],
          ]),
        },
        {
          name: "external",
          value: list(
            external.map((entry) =>
              record([
                ["part_definition_event_hash", string(entry.id)],
                ["part_type", partTypeToSelfHostedAst(entry.partType)],
                ["type_declaration", variant("none")],
              ]),
            ),
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
  partType: "number",
  expression: {
    Call: {
      function: stdAbs,
      arguments: [{ name: "x", value: { Number: { value: -3 } } }],
    },
  },
};
const stdAbsType = {
  function: {
    parameters: [{ name: "x", type: "number" }],
    return_type: "number",
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
              Call: {
                function: stdAbs,
                arguments: [{ name: "x", value: { String: { value: "a" } } }],
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
      partType: "type",
      expression: {
        TypeLiteral: { items: [{ key: "x", value: "TypeNumber" }] },
      },
    };
    const origin = (value: unknown): TestPart => ({
      id: "origin",
      partType: { type_part: "point" },
      expression: { TypeLiteral: { items: [{ key: "x", value }] } },
    });
    expect(
      await validateModule([point, origin({ Number: { value: 0 } })], []),
    ).toBe(true);
    expect(
      await validateModule([point, origin({ String: { value: "0" } })], []),
    ).toBe(false);
  });
});
