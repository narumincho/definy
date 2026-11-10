/**
 * `seeds/store/` の `heads.json` のコミットの続きのコミットを, 手元のサーバーと同じ鍵 (`$DEFINY_HOME/account.json`) で
 * 署名して `seeds/store/` に書く (docs/source-in-store.md の「サーバーを通さない変更」).
 *
 * サーバーの型検査を通さないので, 型パーツから機械的に作るパーツ (scripts/generate_value_decoders.ts) や,
 * 今のサーバーの型チェッカーでは通らない言語の変更に使う。ふつうの変更は手元のサーバーの `definy_commit_parts`
 */
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  type AccountCredentials,
  createSignedProjectCommitEvent,
  importAccountCredentials,
} from "./auth.ts";
import { base64ToBytes } from "./base64.ts";
import type { DecodedPart } from "./decoded_event.ts";
import { toContentAddressedParts } from "./content_store.ts";
import {
  DEFAULT_VISIBILITY,
  type LocalizedText,
  type Visibility,
} from "./event_content.ts";
import {
  readStoreSeed,
  STORE_SEED_DIR,
  type StoreSeed,
  writeStoreSeed,
} from "./store_seed.ts";

/** コミットするモジュール */
export type StoreCommitModule = {
  readonly name: string;
  readonly description: LocalizedText;
  readonly visibility?: Visibility;
  readonly parts: ReadonlyArray<DecodedPart>;
};

/** 手元のサーバーの鍵 (`$DEFINY_HOME/account.json`, 無ければ `~/.definy/account.json`) */
export async function readLocalAccountCredentials(): Promise<{
  readonly credentials: AccountCredentials;
  readonly path: string;
}> {
  const dataDir = process.env["DEFINY_HOME"] ?? join(homedir(), ".definy");
  const path = join(dataDir, "account.json");
  const saved = JSON.parse(await readFile(path, "utf-8")) as {
    readonly accountName: string;
    readonly secretKeyBase64: string;
  };
  return {
    credentials: await importAccountCredentials(
      saved.secretKeyBase64,
      saved.accountName,
    ),
    path,
  };
}

/** コミットの中身を比べるための形 (パーツは content hash) */
function commitShape(
  description: LocalizedText,
  modules: ReadonlyArray<{
    readonly name: string;
    readonly description: LocalizedText;
    readonly visibility?: Visibility;
    readonly parts: ReadonlyArray<{
      readonly name: string;
      readonly contentHash?: string | null;
    }>;
  }>,
): string {
  return JSON.stringify({
    description,
    modules: modules.map((module) => ({
      name: module.name,
      description: module.description,
      visibility: module.visibility ?? DEFAULT_VISIBILITY,
      parts: module.parts.map((part) => [part.name, part.contentHash ?? null]),
    })),
  });
}

/**
 * プロジェクト `projectName` の `heads.json` のコミットのモジュールを `update` で変えてコミットする.
 * 何も変わらなければコミットせず `undefined`。変わればコミットのイベントのハッシュ
 */
export async function commitStoreSeedProject(options: {
  readonly projectName: string;
  readonly message: string;
  readonly update: (
    modules: StoreSeed["projects"][number]["commit"]["modules"],
  ) =>
    | ReadonlyArray<StoreCommitModule>
    | Promise<ReadonlyArray<StoreCommitModule>>;
  readonly dir?: string;
  readonly credentials?: AccountCredentials;
  readonly timeSeconds?: number;
}): Promise<string | undefined> {
  const dir = options.dir ?? STORE_SEED_DIR;
  const store = await readStoreSeed(dir);
  const head = store.projects.find(
    (project) => project.commit.projectName === options.projectName,
  );
  if (head === undefined) {
    throw new Error(`${options.projectName} is not in ${dir}/heads.json`);
  }
  const modules = await options.update(head.commit.modules);
  const unchanged =
    commitShape(head.commit.projectDescription, head.commit.modules) ===
    commitShape(
      head.commit.projectDescription,
      modules.map((module) => ({
        ...module,
        parts: toContentAddressedParts(module.parts).parts,
      })),
    );
  if (unchanged) {
    return undefined;
  }
  const local =
    options.credentials === undefined
      ? await readLocalAccountCredentials()
      : { credentials: options.credentials, path: "(credentials)" };
  const author = store.bundle.events.find(
    (event) => event.eventHash === head.commitHash,
  )?.accountId;
  if (author !== local.credentials.accountId) {
    throw new Error(
      `${options.projectName}: the main commit is by ${String(author)}, not by ${local.credentials.accountId} (${local.path})`,
    );
  }
  // 親のコミットより後の時刻にする (docs/mcp.md の definy_commit_parts)
  const timeSeconds = Math.max(
    options.timeSeconds ?? Math.floor(Date.now() / 1000),
    Math.floor(
      (store.bundle.events.find((event) => event.eventHash === head.commitHash)
        ?.timeMs ?? 0) / 1000,
    ) + 1,
  );
  const commit = await createSignedProjectCommitEvent(
    {
      credentials: local.credentials,
      projectName: options.projectName,
      projectDescription: head.commit.projectDescription,
      message: options.message,
      parentCommitHash: head.commitHash,
      modules,
    },
    timeSeconds,
  );
  await writeStoreSeed(dir, {
    events: [base64ToBytes(commit.signedEventBytes)],
    contents: [...commit.contents.values()].map((item) =>
      base64ToBytes(item.contentBytes),
    ),
    heads: {
      projects: {
        ...store.heads.projects,
        [options.projectName]: commit.eventHash,
      },
    },
  });
  return commit.eventHash;
}
