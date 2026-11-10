/**
 * definy サーバーのストアから `seeds/store/` に書き出す (`npm run export:store`. docs/source-in-store.md).
 *
 *   node scripts/export_store.ts <baseUrl> [--account <アカウント ID>] [--projects definy,sample] [--out seeds/store]
 *
 * `--account` を省くと手元のサーバーの鍵 (`$DEFINY_HOME/account.json`, 無ければ `~/.definy/account.json`) のアカウント。
 * `--projects` を省くと, 今の `heads.json` のプロジェクト
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { readLocalAccountCredentials } from "../src/store_commit.ts";
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
  return (await readLocalAccountCredentials()).credentials.accountId;
}

async function defaultProjects(): Promise<ReadonlyArray<string>> {
  const heads = JSON.parse(
    await readFile(resolve(outDir, "heads.json"), "utf-8"),
  ) as StoreSeedHeads;
  return Object.keys(heads.projects);
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
