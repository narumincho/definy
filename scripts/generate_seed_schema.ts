/**
 * seeds/schemas/module-seed.schema.json を seeds/core.json の型パーツの宣言から作り直す (src/seed_schema.ts).
 * `--check` を付けると書き込まずに, 今のファイルと同じかだけを確かめる
 */
import { readFile, writeFile } from "node:fs/promises";
import {
  buildModuleSeedSchema,
  type SeedSchemaPart,
} from "../src/seed_schema.ts";

const SCHEMA_PATH = "seeds/schemas/module-seed.schema.json";

const core = JSON.parse(await readFile("seeds/core.json", "utf8")) as {
  readonly parts: ReadonlyArray<SeedSchemaPart>;
};
const text = `${JSON.stringify(buildModuleSeedSchema(core.parts), null, 2)}\n`;

if (process.argv.includes("--check")) {
  if ((await readFile(SCHEMA_PATH, "utf8")) !== text) {
    console.error(`${SCHEMA_PATH} is out of date. Run npm run build:schema`);
    process.exit(1);
  }
  console.log(`${SCHEMA_PATH} is up to date`);
} else {
  await writeFile(SCHEMA_PATH, text);
  console.log(`wrote ${SCHEMA_PATH}`);
}
