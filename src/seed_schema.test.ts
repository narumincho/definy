import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildModuleSeedSchema,
  conformsToTypeDeclaration,
  type SeedSchemaPart,
} from "./seed_schema.ts";

type Seed = {
  readonly module_name: string;
  readonly parts: ReadonlyArray<SeedSchemaPart>;
};

const seeds: ReadonlyArray<Seed> = readdirSync("seeds")
  .filter((file) => file.endsWith(".json") && !file.startsWith("seed_bundle"))
  .map((file) => JSON.parse(readFileSync(`seeds/${file}`, "utf8")) as Seed);

const typeDeclarations = new Map<string, unknown>(
  seeds.flatMap((seed) =>
    seed.parts.map(
      (part) => [`${seed.module_name}.${part.name}`, part.expression] as const,
    ),
  ),
);
const resolveTypePart = (name: string): unknown => typeDeclarations.get(name);

describe("seeds の JSON Schema", () => {
  it("seeds/schemas/module-seed.schema.json は core の型パーツの宣言から作ったものと同じ", () => {
    const core = seeds.find((seed) => seed.module_name === "core");
    expect(
      JSON.parse(readFileSync("seeds/schemas/module-seed.schema.json", "utf8")),
    ).toEqual(buildModuleSeedSchema(core?.parts ?? []));
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
            resolveTypePart("core.type-ast"),
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
