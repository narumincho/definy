import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  loadSeedModules,
  loadSeedModuleWithPlaceholders,
} from "./seed_parts.ts";
import {
  buildEventTypeDeclarations,
  conformsToTypeDeclaration,
} from "./seed_schema.ts";

const seeds = await Promise.all(
  (await loadSeedModules()).map(async (module) => ({
    module_name: module.name,
    parts: await loadSeedModuleWithPlaceholders(module.name),
  })),
);

const typeDeclarations = new Map<string, unknown>(
  seeds.flatMap((seed) =>
    seed.parts.map(
      (part) => [`${seed.module_name}.${part.name}`, part.expression] as const,
    ),
  ),
);
const resolveTypePart = (name: string): unknown => typeDeclarations.get(name);

describe("core の型パーツの宣言", () => {
  it("seeds/schemas/event-types.json は core の型パーツの宣言から作ったものと同じ", () => {
    const core = seeds.find((seed) => seed.module_name === "core");
    expect(
      JSON.parse(readFileSync("seeds/schemas/event-types.json", "utf8")),
    ).toEqual(buildEventTypeDeclarations(core?.parts ?? []));
  });

  it("seed の全パーツの式は core.expression, 型は core.type-ast の形", () => {
    const malformed = seeds.flatMap((seed) =>
      seed.parts.flatMap((part) => {
        const name = `${seed.module_name}.${part.name}`;
        return [
          ...(part.expression != null &&
          !conformsToTypeDeclaration(
            part.expression,
            resolveTypePart("core.expression"),
            resolveTypePart,
          )
            ? [`${name} expression`]
            : []),
          ...(part.part_type != null &&
          !conformsToTypeDeclaration(
            part.part_type,
            resolveTypePart("core.expression"),
            resolveTypePart,
          )
            ? [`${name} part_type`]
            : []),
        ];
      }),
    );
    expect(malformed).toEqual([]);
  });

  it("形の違う値を見つける", () => {
    const expression = resolveTypePart("core.expression");
    expect(
      conformsToTypeDeclaration({ "#number": 1 }, expression, resolveTypePart),
    ).toBe(true);
    expect(
      conformsToTypeDeclaration(
        { "#number": "1" },
        expression,
        resolveTypePart,
      ),
    ).toBe(false);
    expect(
      conformsToTypeDeclaration(
        { "#let": { variable_id: 0, value: { "#number": 1 } } },
        expression,
        resolveTypePart,
      ),
    ).toBe(false);
    expect(
      conformsToTypeDeclaration({ Number: 1 }, expression, resolveTypePart),
    ).toBe(false);
  });
});
