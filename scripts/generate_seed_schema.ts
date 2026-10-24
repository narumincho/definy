/**
 * seeds/schemas/module-seed.schema.json と seeds/schemas/event-types.json を seeds/core.json の型パーツの宣言から作り直す
 * (src/seed_schema.ts). `--check` を付けると書き込まずに, 今のファイルと同じかだけを確かめる
 */
import { readFile, writeFile } from "node:fs/promises";
import {
  buildEventTypeDeclarations,
  buildModuleSeedSchema,
  type SeedSchemaPart,
} from "../src/seed_schema.ts";

const core = JSON.parse(await readFile("seeds/core.json", "utf8")) as {
  readonly parts: ReadonlyArray<SeedSchemaPart>;
};

const outputs: ReadonlyArray<readonly [string, unknown]> = [
  ["seeds/schemas/module-seed.schema.json", buildModuleSeedSchema(core.parts)],
  ["seeds/schemas/event-types.json", buildEventTypeDeclarations(core.parts)],
];

let outdated = false;
for (const [path, value] of outputs) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    if ((await readFile(path, "utf8").catch(() => "")) !== text) {
      console.error(`${path} is out of date. Run npm run build:schema`);
      outdated = true;
    } else {
      console.log(`${path} is up to date`);
    }
  } else {
    await writeFile(path, text);
    console.log(`wrote ${path}`);
  }
}
if (outdated) {
  process.exit(1);
}
