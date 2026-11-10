/**
 * seeds/schemas/event-types.json を `seeds/store/` の core の型パーツの宣言から作り直す
 * (src/seed_schema.ts). `--check` を付けると書き込まずに, 今のファイルと同じかだけを確かめる
 */
import { readFile, writeFile } from "node:fs/promises";
import { loadSeedModuleWithPlaceholders } from "../src/seed_parts.ts";
import { buildEventTypeDeclarations } from "../src/seed_schema.ts";

const PATH = "seeds/schemas/event-types.json";
const text = `${JSON.stringify(
  buildEventTypeDeclarations(await loadSeedModuleWithPlaceholders("core")),
  null,
  2,
)}\n`;
if (process.argv.includes("--check")) {
  if ((await readFile(PATH, "utf8").catch(() => "")) !== text) {
    console.error(`${PATH} is out of date. Run npm run build:schema`);
    process.exit(1);
  }
  console.log(`${PATH} is up to date`);
} else {
  await writeFile(PATH, text);
  console.log(`wrote ${PATH}`);
}
