/**
 * `seeds/store/` (definy のストアから書き出した, 署名済みのイベントとパーツの中身) の読み書き (docs/source-in-store.md).
 *
 * - `events/<イベントのハッシュ>.cbor`: 署名済みの `SignedEvent` の CBOR そのもの
 * - `contents/<中身のハッシュ>.cbor`: パーツの定義の式の CBOR (CAS の中身. docs/content-addressed.md)
 * - `heads.json`: プロジェクト名 → ビルドに使う `main` のコミットのイベントのハッシュ
 *
 * ファイル名はハッシュで, 中身はそのハッシュと一致しなければ読まない。手では書かない
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { base64ToBytes, bytesToBase64 } from "./base64.ts";
import { decodeCborItem } from "./cbor.ts";
import type {
  CommitModule,
  PartContent,
  ProjectCommitContent,
} from "./event_content.ts";
import { decodePartDefinition } from "./part_definition.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "./part_ids.ts";
import { seedBundleFingerprint } from "./seed_fingerprint.ts";
import { sha256EventHashIdSync } from "./sha256.ts";
import {
  decodeVerifiedSignedEvent,
  parseSignedEventMetadata,
} from "./signed_event.ts";
import type {
  SeedBundle,
  SeedContentEntry,
  SeedEventEntry,
} from "../worker/types.ts";

/** リポジトリの中の置き場所 */
export const STORE_SEED_DIR = "seeds/store";

const EVENTS_DIR = "events";
const CONTENTS_DIR = "contents";
const HEADS_FILE = "heads.json";
const FILE_EXTENSION = ".cbor";

/** `heads.json` の中身 */
export type StoreSeedHeads = {
  /** プロジェクト名 → ビルドに使う `main` のコミットのイベントのハッシュ */
  readonly projects: Readonly<Record<string, string>>;
};

/** 書き出すもの */
export type StoreSeedData = {
  /** 署名済みの `SignedEvent` の CBOR */
  readonly events: ReadonlyArray<Uint8Array>;
  /** パーツの定義の式の CBOR */
  readonly contents: ReadonlyArray<Uint8Array>;
  readonly heads: StoreSeedHeads;
};

/** 中身を読み終えたパーツ */
export type StoreSeedPart = PartContent & {
  readonly name: string;
  readonly contentHash: string;
};

/** 中身を読み終えたモジュール */
export type StoreSeedModule = Omit<CommitModule, "parts"> & {
  readonly parts: ReadonlyArray<StoreSeedPart>;
};

/** `heads.json` のコミット */
export type StoreSeedProject = {
  readonly commitHash: string;
  readonly commit: Omit<ProjectCommitContent, "modules"> & {
    readonly modules: ReadonlyArray<StoreSeedModule>;
  };
};

export type StoreSeed = {
  /** サーバーが検査せずにストアに入れる seed バンドル (worker/store.ts の `seedD1`) */
  readonly bundle: SeedBundle;
  readonly heads: StoreSeedHeads;
  /** `heads.json` の順のプロジェクトのコミット */
  readonly projects: ReadonlyArray<StoreSeedProject>;
};

/** `dir` に書き出す. 同じハッシュのファイルは書き直さない (前のものは消さない) */
export async function writeStoreSeed(
  dir: string,
  data: StoreSeedData,
): Promise<void> {
  const write = async (sub: string, items: ReadonlyArray<Uint8Array>) => {
    const target = resolve(dir, sub);
    await mkdir(target, { recursive: true });
    const existing = new Set(await readdir(target));
    for (const bytes of items) {
      const name = `${sha256EventHashIdSync(bytes)}${FILE_EXTENSION}`;
      if (!existing.has(name)) {
        await writeFile(join(target, name), bytes);
        existing.add(name);
      }
    }
  };
  await write(EVENTS_DIR, data.events);
  await write(CONTENTS_DIR, data.contents);
  await writeFile(
    resolve(dir, HEADS_FILE),
    `${JSON.stringify(data.heads, null, 2)}\n`,
    "utf-8",
  );
}

/** `dir` のハッシュ → 中身 (ファイル名のハッシュと中身が合わなければ例外) */
async function readHashedFiles(
  dir: string,
): Promise<ReadonlyMap<string, Uint8Array>> {
  const files = (await readdir(dir).catch(() => [] as Array<string>))
    .filter((name) => name.endsWith(FILE_EXTENSION))
    .sort();
  const result = new Map<string, Uint8Array>();
  for (const name of files) {
    const hash = name.slice(0, -FILE_EXTENSION.length);
    const bytes = new Uint8Array(await readFile(join(dir, name)));
    if (sha256EventHashIdSync(bytes) !== hash) {
      throw new Error(`${join(dir, name)}: the hash does not match the file`);
    }
    result.set(hash, bytes);
  }
  return result;
}

/** `dir` (既定は {@link STORE_SEED_DIR}) を読み, 署名を確かめ, `heads.json` のコミットのパーツの中身を求める */
export async function readStoreSeed(
  dir: string = STORE_SEED_DIR,
): Promise<StoreSeed> {
  const heads = JSON.parse(
    await readFile(resolve(dir, HEADS_FILE), "utf-8"),
  ) as StoreSeedHeads;
  const eventFiles = await readHashedFiles(resolve(dir, EVENTS_DIR));
  const contentFiles = await readHashedFiles(resolve(dir, CONTENTS_DIR));

  const events: Array<SeedEventEntry> = [];
  for (const [eventHash, bytes] of eventFiles) {
    const meta = parseSignedEventMetadata(bytes);
    events.push({
      eventHash,
      signedEventBytes: bytesToBase64(bytes),
      accountId: meta.accountId,
      eventType: meta.eventType,
      createdAtRfc3339: meta.createdAtRfc3339,
      timeMs: meta.timeMs,
    });
  }
  // GetEvents と同じく新しい順 (同じ時刻はハッシュの順)
  events.sort(
    (a, b) =>
      b.timeMs - a.timeMs ||
      (a.eventHash < b.eventHash ? -1 : a.eventHash > b.eventHash ? 1 : 0),
  );
  const contents: Array<SeedContentEntry> = [...contentFiles].map(
    ([contentHash, bytes]) => ({
      contentHash,
      contentBytes: bytesToBase64(bytes),
    }),
  );

  const projects: Array<StoreSeedProject> = [];
  for (const [projectName, commitHash] of Object.entries(heads.projects)) {
    const bytes = eventFiles.get(commitHash);
    if (bytes === undefined) {
      throw new Error(`${projectName}: the commit ${commitHash} is missing`);
    }
    const { content } = await decodeVerifiedSignedEvent(bytes);
    if (content.type !== "project_commit") {
      throw new Error(`${projectName}: ${commitHash} is not a commit`);
    }
    const commit = content.commit;
    if (commit.projectName !== projectName) {
      throw new Error(
        `${projectName}: ${commitHash} is a commit of ${commit.projectName}`,
      );
    }
    projects.push({
      commitHash,
      commit: {
        ...commit,
        modules: commit.modules.map((module) => ({
          ...module,
          parts: module.parts.map((part) => {
            const contentHash = part.contentHash;
            const contentBytes =
              contentHash === null ? undefined : contentFiles.get(contentHash);
            const decoded =
              contentBytes === undefined
                ? undefined
                : decodePartDefinition(decodeCborItem(contentBytes)[0]);
            if (contentHash === null || decoded === undefined) {
              throw new Error(
                `${module.name}.${part.name}: the content ${String(contentHash)} is missing or not a literal definition`,
              );
            }
            return { ...decoded, name: part.name, contentHash };
          }),
        })),
      },
    });
  }

  return {
    bundle: {
      fingerprint: await seedBundleFingerprint({ events, contents }),
      events,
      contents,
    },
    heads,
    projects,
  };
}

/** `heads.json` のコミットの全パーツの式を, パーツ ID (URL-safe Base64) から引けるようにする */
export function storeSeedPartExpressions(
  seed: StoreSeed,
): ReadonlyMap<string, unknown> {
  const map = new Map<string, unknown>();
  for (const project of seed.projects) {
    for (const module of project.commit.modules) {
      const moduleId = deriveModuleIdBytes(module.name);
      for (const part of module.parts) {
        map.set(
          deriveModulePartId(moduleId, part.name),
          part.expression ?? undefined,
        );
      }
    }
  }
  return map;
}

/** seed バンドル (`public/__definy_seed_bundle.json` の形) を {@link StoreSeedData} にする */
export function storeSeedDataFromBundle(
  bundle: SeedBundle,
  heads: StoreSeedHeads,
): StoreSeedData {
  return {
    events: bundle.events.map((event) => base64ToBytes(event.signedEventBytes)),
    contents: bundle.contents.map((content) =>
      base64ToBytes(content.contentBytes),
    ),
    heads,
  };
}
