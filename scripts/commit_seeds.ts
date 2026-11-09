/**
 * `seeds/*.json` の変更を, `seeds/store/` のコミットの続きとして署名し `seeds/store/` に書く
 * (`npm run commit:seeds`. docs/source-in-store.md の移行の途中だけ使う. seeds/*.json を消したら消す).
 *
 *   node scripts/commit_seeds.ts [--message "..."]
 *
 * 鍵は手元のサーバーと同じ `$DEFINY_HOME/account.json` (無ければ `~/.definy/account.json`)。
 * `heads.json` のコミットの作者の鍵でないとコミットできない (main は作成者だけがコミットできる. docs/branch.md)
 */
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  createSignedProjectCommitEvent,
  importAccountCredentials,
} from "../src/auth.ts";
import { base64ToBytes } from "../src/base64.ts";
import { toContentAddressedParts } from "../src/content_store.ts";
import type { DecodedPart } from "../src/decoded_event.ts";
import {
  DEFAULT_VISIBILITY,
  type LocalizedText,
  type Visibility,
} from "../src/event_content.ts";
import {
  resolvePartPlaceholders,
  resolveSeedPartType,
} from "../src/seed_parts.ts";
import { loadProjectSeeds } from "../src/seed_projects.ts";
import {
  readStoreSeed,
  STORE_SEED_DIR,
  writeStoreSeed,
} from "../src/store_seed.ts";

type ModuleSeed = {
  readonly module_name: string;
  readonly module_description: LocalizedText;
  readonly module_visibility?: Visibility;
  readonly parts: ReadonlyArray<Record<string, unknown>>;
};

const { values } = parseArgs({
  options: { message: { type: "string" } },
});

const dataDir = process.env["DEFINY_HOME"] ?? join(homedir(), ".definy");
const saved = JSON.parse(
  await readFile(join(dataDir, "account.json"), "utf-8"),
) as { readonly accountName: string; readonly secretKeyBase64: string };
const credentials = await importAccountCredentials(
  saved.secretKeyBase64,
  saved.accountName,
);

const store = await readStoreSeed();
const authorOf = new Map(
  store.bundle.events.map((event) => [event.eventHash, event.accountId]),
);

/** seeds/<name>.json をコミットのモジュールにする */
async function loadModule(name: string) {
  const seed = JSON.parse(
    await readFile(`seeds/${name}.json`, "utf-8"),
  ) as ModuleSeed;
  const parts: ReadonlyArray<DecodedPart> = await Promise.all(
    seed.parts.map(async (part) => ({
      name: String(part.name),
      description: part.description as LocalizedText,
      visibility:
        part.visibility === "private" ? "private" : DEFAULT_VISIBILITY,
      partType: await resolveSeedPartType(part.part_type),
      expression:
        part.expression == null
          ? null
          : await resolvePartPlaceholders(part.expression),
    })),
  );
  return {
    name: seed.module_name,
    description: seed.module_description,
    visibility: seed.module_visibility ?? DEFAULT_VISIBILITY,
    parts,
  };
}

/** コミットの中身を比べるための形 (パーツは content hash) */
function shape(
  description: LocalizedText,
  modules: ReadonlyArray<{
    readonly name: string;
    readonly description: LocalizedText;
    readonly visibility?: Visibility;
    readonly parts: ReadonlyArray<{
      readonly name: string;
      readonly contentHash: string | null;
    }>;
  }>,
): string {
  return JSON.stringify({
    description,
    modules: modules.map((module) => ({
      name: module.name,
      description: module.description,
      visibility: module.visibility ?? DEFAULT_VISIBILITY,
      parts: module.parts.map((part) => [part.name, part.contentHash]),
    })),
  });
}

const events: Array<Uint8Array> = [];
const contents: Array<Uint8Array> = [];
const heads: Record<string, string> = { ...store.heads.projects };
const timeSeconds = Math.floor(Date.now() / 1000);
for (const project of loadProjectSeeds()) {
  const modules = await Promise.all(project.modules.map(loadModule));
  const head = store.projects.find(
    (p) => p.commit.projectName === project.project_name,
  );
  const next = shape(
    project.project_description,
    modules.map((module) => ({
      ...module,
      parts: toContentAddressedParts(module.parts).parts,
    })),
  );
  if (
    head !== undefined &&
    shape(head.commit.projectDescription, head.commit.modules) === next
  ) {
    continue;
  }
  if (
    head !== undefined &&
    authorOf.get(head.commitHash) !== credentials.accountId
  ) {
    throw new Error(
      `${project.project_name}: the main commit is by ${String(authorOf.get(head.commitHash))}, not by ${credentials.accountId} (${join(dataDir, "account.json")})`,
    );
  }
  const commit = await createSignedProjectCommitEvent(
    {
      credentials,
      projectName: project.project_name,
      projectDescription: project.project_description,
      message: values.message ?? project.message,
      parentCommitHash: head?.commitHash ?? null,
      modules,
    },
    timeSeconds,
  );
  events.push(base64ToBytes(commit.signedEventBytes));
  for (const item of commit.contents.values()) {
    contents.push(base64ToBytes(item.contentBytes));
  }
  heads[project.project_name] = commit.eventHash;
  console.log(`${project.project_name}: ${commit.eventHash}`);
}

if (events.length === 0) {
  console.log("seeds/*.json is the same as seeds/store");
} else {
  await writeStoreSeed(STORE_SEED_DIR, {
    events,
    contents,
    heads: { projects: heads },
  });
}
