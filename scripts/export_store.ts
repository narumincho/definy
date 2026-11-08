/**
 * definy サーバーのストアから `seeds/store/` に書き出す (`npm run export:store`. docs/source-in-store.md).
 *
 *   node scripts/export_store.ts <baseUrl> [--account <アカウント ID>] [--projects definy,sample] [--out seeds/store]
 *
 * `--account` を省くと手元のサーバーの鍵 (`$DEFINY_HOME/account.json`, 無ければ `~/.definy/account.json`) のアカウント。
 * `--projects` を省くと, 今の `heads.json` のプロジェクト (無ければ `seeds/projects/*.json` のもの)
 */
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { importAccountCredentials } from "../src/auth.ts";
import { loadProjectSeeds } from "../src/seed_projects.ts";
import { exportStoreSeed } from "../src/store_export.ts";
import {
  STORE_SEED_DIR,
  type StoreSeedHeads,
  writeStoreSeed,
} from "../src/store_seed.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    account: { type: "string" },
    projects: { type: "string" },
    out: { type: "string", default: STORE_SEED_DIR },
  },
});
const baseUrl = positionals[0];
if (baseUrl === undefined) {
  console.error(
    "usage: node scripts/export_store.ts <baseUrl> [--account <id>] [--projects a,b] [--out seeds/store]",
  );
  process.exit(1);
}
const outDir = values.out ?? STORE_SEED_DIR;

async function defaultAccountId(): Promise<string> {
  const dataDir = process.env["DEFINY_HOME"] ?? join(homedir(), ".definy");
  const saved = JSON.parse(
    await readFile(join(dataDir, "account.json"), "utf-8"),
  ) as { readonly accountName: string; readonly secretKeyBase64: string };
  return (
    await importAccountCredentials(saved.secretKeyBase64, saved.accountName)
  ).accountId;
}

async function defaultProjects(): Promise<ReadonlyArray<string>> {
  try {
    const heads = JSON.parse(
      await readFile(resolve(outDir, "heads.json"), "utf-8"),
    ) as StoreSeedHeads;
    return Object.keys(heads.projects);
  } catch {
    return loadProjectSeeds().map((project) => project.project_name);
  }
}

const data = await exportStoreSeed({
  baseUrl,
  accountId: values.account ?? (await defaultAccountId()),
  projects: values.projects?.split(",") ?? (await defaultProjects()),
});
await writeStoreSeed(outDir, data);
console.log(
  `Exported ${data.events.length} events and ${data.contents.length} contents to ${outDir}: ${Object.entries(
    data.heads.projects,
  )
    .map(([name, hash]) => `${name} ${hash}`)
    .join(", ")}`,
);
