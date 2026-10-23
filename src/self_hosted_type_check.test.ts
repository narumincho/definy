import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deriveModuleIdBytes, deriveModulePartId } from "../worker/cbor.ts";
import {
  devSystemAccountBytes,
  resolvePartPlaceholders,
} from "./seed_parts.ts";
import {
  checkParts,
  compileTypeChecker,
  formatTypeAst,
  outcomeErrorMessage,
  type PartTypeEntry,
  type PartToCheck,
} from "./self_hosted_type_check.ts";
import { createStage1Compiler } from "./stage1_compiler.ts";
import { expressionToLayoutNode } from "./tree_layout/ast_to_layout.ts";
import {
  expressionToSelfHostedValue,
  findTypeErrorPath,
} from "./tree_layout/type_error_location.ts";

type SeedPart = {
  readonly id: string;
  readonly name: string;
  readonly partType: unknown;
  readonly expression: unknown;
};

async function loadSeedParts(): Promise<ReadonlyArray<SeedPart>> {
  const account = await devSystemAccountBytes();
  const parts: SeedPart[] = [];
  for (const file of readdirSync("seeds")) {
    if (!file.endsWith(".json") || file.startsWith("seed_bundle")) {
      continue;
    }
    const seed = JSON.parse(readFileSync(`seeds/${file}`, "utf8")) as {
      readonly module_name: string;
      readonly parts: ReadonlyArray<Readonly<Record<string, unknown>>>;
    };
    const moduleId = await deriveModuleIdBytes(account, seed.module_name);
    for (const part of seed.parts) {
      const name = String(part.name);
      parts.push({
        id: await deriveModulePartId(moduleId, name),
        name: `${seed.module_name}.${name}`,
        partType: await resolvePartPlaceholders(
          part.part_type ?? null,
          account,
        ),
        expression: await resolvePartPlaceholders(
          part.expression ?? null,
          account,
        ),
      });
    }
  }
  return parts;
}

/** seed の `core.type-checker` を stage1 でコンパイルし, seed の全パーツを型環境にする */
function compileSeedTypeChecker(parts: ReadonlyArray<SeedPart>): {
  readonly typeChecker: WebAssembly.Module;
  readonly env: ReadonlyArray<PartTypeEntry>;
} {
  const byId = new Map(parts.map((part) => [part.id, part]));
  const typeCheckerPart = parts.find(
    (part) => part.name === "core.type-checker",
  );
  expect(typeCheckerPart).toBeDefined();
  const env: ReadonlyArray<PartTypeEntry> = parts.map((part) => ({
    partId: part.id,
    partType: part.partType,
    typeDeclaration: part.partType === "type" ? part.expression : undefined,
  }));
  const compileStarted = performance.now();
  const typeChecker = new WebAssembly.Module(
    compileTypeChecker({
      compiler: createStage1Compiler(
        new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
      ),
      core: { typeChecker: typeCheckerPart?.id ?? "" },
      resolvePart: (id) => byId.get(id)?.expression ?? undefined,
    }) as unknown as BufferSource,
  );
  console.log(
    `compiled the type checker in ${Math.round(performance.now() - compileStarted)}ms`,
  );
  return { typeChecker, env };
}

describe("self-hosted type check (stage1)", () => {
  it("accepts every seed part except compiler builtins", async () => {
    const parts = await loadSeedParts();
    const { typeChecker, env } = compileSeedTypeChecker(parts);
    const targets = parts.filter(
      (part) => part.expression != null && part.partType != null,
    );
    const started = performance.now();
    const outcomes = checkParts({
      typeChecker,
      parts: targets.map((part): PartToCheck => ({
        expression: part.expression,
        partType: part.partType,
      })),
      env,
    });
    console.log(
      `checked ${targets.length} parts in ${Math.round(performance.now() - started)}ms`,
    );
    const failures = targets
      .map((part, i) => ({ name: part.name, outcome: outcomes[i] }))
      .filter(({ outcome }) => outcome?.kind !== "ok");
    console.log(JSON.stringify(failures.slice(0, 20), null, 1));
    expect(
      failures.filter(({ outcome }) => outcome?.kind !== "unsupported"),
    ).toEqual([]);
  }, 600_000);

  it("型エラーにエラーを見つけた一番内側の式を付ける", async () => {
    const { typeChecker, env } = compileSeedTypeChecker(await loadSeedParts());
    const bad = { String: { value: "x" } };
    const expression = {
      Function: {
        parameters: [{ parameter_id: 0, parameter_name: "n" }],
        body: {
          Add: {
            left: { Variable: { variable_id: 0 } },
            right: { Multiply: { left: { Number: { value: 2 } }, right: bad } },
          },
        },
      },
    };
    const [outcome] = checkParts({
      typeChecker,
      parts: [
        {
          expression,
          partType: {
            function: {
              parameters: [{ name: "n", type: "number" }],
              return_type: "number",
            },
          },
        },
      ],
      env,
    });
    expect(outcome).toMatchObject({
      kind: "type_error",
      tag: "type_mismatch",
      expression: expressionToSelfHostedValue(bad),
    });
    expect(
      outcome?.kind === "type_error"
        ? findTypeErrorPath(
            expressionToLayoutNode(expression),
            expression,
            outcome.expression,
          )
        : null,
    ).toEqual(["functionBody", "right", "right"]);
  }, 600_000);

  it("型エラーの型を読める形にする", () => {
    const number = { tag: "number", payload: null };
    const listOfUser = {
      tag: "list",
      payload: {
        item_type: { tag: "reference", payload: { part_hash: "user-id" } },
      },
    };
    expect(
      formatTypeAst(listOfUser, (id) =>
        id === "user-id" ? "app.user" : undefined,
      ),
    ).toBe("List<app.user>");
    expect(
      formatTypeAst({
        tag: "function",
        payload: {
          parameters: [{ name: "n", type: number }],
          return_type: {
            tag: "union",
            payload: [
              { tag: "none", payload_type: { tag: "none", payload: null } },
              { tag: "some", payload_type: { tag: "some", payload: number } },
            ],
          },
        },
      }),
    ).toBe("(n: number) -> none | some(number)");
    expect(
      outcomeErrorMessage("bad", {
        kind: "type_error",
        tag: "type_mismatch",
        detail: { expected: number, actual: { tag: "string", payload: null } },
        expression: null,
      }),
    ).toBe(
      "part 'bad': type error: type_mismatch (expected: number, actual: string)",
    );
  });
});
