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
  type PartTypeEntry,
  type PartToCheck,
} from "./self_hosted_type_check.ts";
import { createStage1Compiler } from "./stage1_compiler.ts";

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

describe("self-hosted type check (stage1)", () => {
  it("accepts every seed part except compiler builtins", async () => {
    const parts = await loadSeedParts();
    const byId = new Map(parts.map((part) => [part.id, part]));
    const typeCheckAgainst = parts.find(
      (part) => part.name === "core.type-check-against",
    );
    expect(typeCheckAgainst).toBeDefined();
    const env: ReadonlyArray<PartTypeEntry> = parts.map((part) => ({
      partId: part.id,
      partType: part.partType,
      typeDeclaration: part.partType === "type" ? part.expression : undefined,
    }));
    const targets = parts.filter(
      (part) => part.expression != null && part.partType != null,
    );
    const compileStarted = performance.now();
    const typeChecker = new WebAssembly.Module(
      compileTypeChecker({
        compiler: createStage1Compiler(
          new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
        ),
        core: { typeCheckAgainst: typeCheckAgainst?.id ?? "" },
        resolvePart: (id) => byId.get(id)?.expression ?? undefined,
      }) as unknown as BufferSource,
    );
    console.log(
      `compiled the type checker in ${Math.round(performance.now() - compileStarted)}ms`,
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
});
