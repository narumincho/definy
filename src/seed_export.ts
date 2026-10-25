import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { importAccountCredentials } from "./auth.ts";
import {
  base64ToBytes,
  bytesToUrlSafeBase64NoPad,
  decodeCborItem,
} from "./cbor.ts";
import { devSystemAccountBytes } from "./seed_parts.ts";
import {
  MAIN_BRANCH,
  type CommitPart,
  type ProjectCommitContent,
} from "./event_content.ts";
import {
  loadProjectSeeds,
  PROJECT_SEEDS_DIR,
  projectSeedToJson,
  type ProjectSeedData,
} from "./seed_projects.ts";
import { decodeVerifiedSignedEvent } from "./signed_event.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "../worker/cbor.ts";
import type { GetContentResponse, GetEventsResponse } from "../worker/types.ts";

const PAGE_SIZE = 500;

export type PartSeedData = {
  readonly name: string;
  readonly part_type?: unknown;
  readonly description?: unknown;
  readonly expression?: unknown;
};

export type ModuleSeedData = {
  readonly module_name: string;
  readonly module_description: unknown;
  readonly parts: ReadonlyArray<PartSeedData>;
};

export type ExportSeedsOptions = {
  /** definy サーバーのベース URL (例: `http://localhost:8787`) */
  readonly baseUrl: string;
  /** テスト用の fetch 関数。未指定の場合はグローバルの fetch */
  readonly fetchFn?: typeof fetch;
  /** seed JSON の書き出し先ディレクトリ。未指定の場合は `"seeds"` */
  readonly outDir?: string;
  /** システムアカウントの公開鍵（32 バイト）。未指定の場合は環境変数または開発用鍵から解決 */
  readonly systemAccountBytes?: Uint8Array;
  /** 既存の seed JSON を読み込むディレクトリ。未指定の場合は `"seeds"` */
  readonly seedsDir?: string;
};

/**
 * システムアカウントの公開鍵（32 バイト）を優先順位に従って導出する:
 * 1. 引数の overrideBytes
 * 2. 環境変数 `DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY`
 * 3. 環境変数 `DEFINY_SYSTEM_ACCOUNT_SECRET_KEY` から導出
 * 4. どちらも無ければ開発用鍵 (`devSystemAccountBytes`)
 */
export async function resolveSystemAccountBytes(
  overrideBytes?: Uint8Array,
): Promise<Uint8Array> {
  if (overrideBytes) {
    return overrideBytes;
  }
  const publicKeyEnv = process.env.DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY;
  if (publicKeyEnv && publicKeyEnv.trim().length > 0) {
    return base64ToBytes(publicKeyEnv.trim());
  }
  const secretKeyEnv = process.env.DEFINY_SYSTEM_ACCOUNT_SECRET_KEY;
  if (secretKeyEnv && secretKeyEnv.trim().length > 0) {
    const creds = await importAccountCredentials(secretKeyEnv.trim(), "definy");
    return base64ToBytes(creds.accountId);
  }
  return await devSystemAccountBytes();
}

/**
 * 全モジュールの最新パーツ定義から「パーツ ID (URL-safe Base64) → `module.name`」の対応表を作成する。
 * ID の導出は `deriveModuleIdBytes` / `deriveModulePartId` を使う。
 */
export async function buildPartReferenceTable(
  accountBytes: Uint8Array,
  seeds: ReadonlyArray<ModuleSeedData>,
): Promise<ReadonlyMap<string, string>> {
  const table = new Map<string, string>();
  for (const seed of seeds) {
    const moduleId = await deriveModuleIdBytes(seed.module_name);
    for (const part of seed.parts) {
      table.set(
        await deriveModulePartId(moduleId, part.name),
        `${seed.module_name}.${part.name}`,
      );
    }
  }
  return table;
}

/**
 * 式または型の中のパーツ ID の文字列を対応表に基づいて `{"$part": "module.name"}` に置き換える。
 * CBOR デコード時の特殊表現 (`{__float64: ...}`, `{__tag: ...}`) を seed の素の JSON に戻す。
 */
export function symbolizePartReferences(
  value: unknown,
  table: ReadonlyMap<string, string>,
): unknown {
  if (value == null) {
    return value;
  }
  if (typeof value === "string") {
    const name = table.get(value);
    return name === undefined ? value : { $part: name };
  }
  if (Array.isArray(value)) {
    return value.map((item) => symbolizePartReferences(item, table));
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.$part === "string") {
      return obj;
    }
    if ("__float64" in obj && typeof obj.__float64 === "number") {
      return obj.__float64;
    }
    if ("__tag" in obj && "value" in obj) {
      return symbolizePartReferences(obj.value, table);
    }
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = symbolizePartReferences(v, table);
    }
    return result;
  }
  return value;
}

async function postConnectJson<T>(
  fetchFn: typeof fetch,
  baseUrl: string,
  methodName: string,
  requestBody: unknown,
): Promise<T> {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
  const url = `${cleanBaseUrl}/definy.v1.EventService/${methodName}`;
  const response = await fetchFn(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Connect-Protocol-Version": "1",
    },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`${url} returned ${response.status}: ${bodyText}`);
  }
  return (await response.json()) as T;
}

type LatestCommitEntry = {
  readonly time: number;
  readonly commit: ProjectCommitContent;
};

/**
 * サーバーから `GetEvents` をページングして取得し、プロジェクトごとにシステムアカウントの main ブランチの最新コミットを収集する
 */
async function fetchLatestSystemProjectCommits(
  fetchFn: typeof fetch,
  baseUrl: string,
  systemAccountId: string,
): Promise<ReadonlyMap<string, ProjectCommitContent>> {
  const latest = new Map<string, LatestCommitEntry>();
  let offset = 0;

  while (true) {
    const response = await postConnectJson<GetEventsResponse>(
      fetchFn,
      baseUrl,
      "GetEvents",
      {
        eventType: "project_commit",
        limit: PAGE_SIZE,
        offset,
      },
    );
    const count = response.events.length;
    for (const item of response.events) {
      let signedBytes: Uint8Array;
      try {
        signedBytes = base64ToBytes(item.signedEventBytes);
      } catch {
        continue;
      }

      let decoded;
      try {
        decoded = await decodeVerifiedSignedEvent(signedBytes);
      } catch {
        continue;
      }
      const { meta, content } = decoded;
      if (meta.accountId !== systemAccountId) {
        continue;
      }
      // seed に書き戻すのはシステムアカウントの main ブランチだけ (docs/branch.md)
      if (
        content.type !== "project_commit" ||
        content.commit.branch !== MAIN_BRANCH
      ) {
        continue;
      }
      const { commit } = content;
      const projectName = commit.projectName;
      if (!projectName) {
        continue;
      }

      const existing = latest.get(projectName);
      if (!existing || existing.time < meta.timeMs) {
        latest.set(projectName, { time: meta.timeMs, commit });
      }
    }

    if (count < PAGE_SIZE) {
      break;
    }
    offset += count;
  }

  const result = new Map<string, ProjectCommitContent>();
  for (const [projectName, entry] of latest) {
    result.set(projectName, entry.commit);
  }
  return result;
}

/**
 * content hash だけを持つパーツの式を `GetContent` から取得して復元する。
 * 式を持つパーツの `content_hash` は書き出さない。
 */
async function hydrateCommitParts(
  fetchFn: typeof fetch,
  baseUrl: string,
  commitParts: ReadonlyArray<CommitPart>,
): Promise<ReadonlyArray<PartSeedData>> {
  const parts: Array<PartSeedData> = [];
  for (const part of commitParts) {
    let expression: unknown = part.expression ?? undefined;
    if (expression === undefined && part.contentHash !== null) {
      const response = await postConnectJson<GetContentResponse>(
        fetchFn,
        baseUrl,
        "GetContent",
        { contentHash: part.contentHash },
      );
      const item = response.item;
      if (!item) {
        throw new Error(
          `content ${part.contentHash} for part '${part.name}' was not found`,
        );
      }
      const contentBytes = base64ToBytes(item.contentBytes);
      const [decodedExpr] = decodeCborItem(contentBytes);
      expression = decodedExpr;
    }

    const partData: Record<string, unknown> = { name: part.name };
    if (part.partType !== null) {
      partData.part_type = part.partType;
    }
    partData.description = part.description;
    if (expression !== undefined) {
      partData.expression = expression;
    }
    parts.push(partData as PartSeedData);
  }
  return parts;
}

/**
 * ディスク上の既存 seed ファイルを読み込む（存在しない場合は undefined）
 */
async function tryReadSeedFile(
  path: string,
): Promise<ModuleSeedData | undefined> {
  try {
    const text = await readFile(path, "utf-8");
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const rawParts =
      (parsed.parts as ReadonlyArray<Record<string, unknown>>) ?? [];
    const parts: ReadonlyArray<PartSeedData> = rawParts.map((p) => {
      const partObj: Record<string, unknown> = {
        name: String(p.name ?? ""),
      };
      if (p.part_type !== undefined) {
        partObj.part_type = p.part_type;
      }
      if (p.description !== undefined) {
        partObj.description = p.description;
      }
      if (p.expression !== undefined) {
        partObj.expression = p.expression;
      }
      return partObj as PartSeedData;
    });

    return {
      module_name: String(parsed.module_name ?? ""),
      module_description: parsed.module_description,
      parts,
    };
  } catch {
    return undefined;
  }
}

/**
 * ModuleSeed を JSON 文字列にシリアライズする。
 * - トップレベルのキー順: `$schema`, `module_name`, `module_description`, `parts`
 * - パーツのキー順: `name`, `part_type` (ある場合), `description`, `expression` (ある場合)
 * - インデント 2、末尾改行なし
 */
export function moduleSeedToJson(
  seed: ModuleSeedData,
  table: ReadonlyMap<string, string>,
): string {
  const parts = seed.parts.map((p) => {
    const partObj: Record<string, unknown> = {
      name: p.name,
    };
    if (p.part_type !== undefined) {
      partObj.part_type = symbolizePartReferences(p.part_type, table);
    }
    if (p.description !== undefined) {
      partObj.description = symbolizePartReferences(p.description, table);
    }
    if (p.expression !== undefined) {
      partObj.expression = symbolizePartReferences(p.expression, table);
    }
    return partObj;
  });

  const outObj = {
    $schema: "./schemas/module-seed.schema.json",
    module_name: seed.module_name,
    module_description: seed.module_description,
    parts,
  };

  return JSON.stringify(outObj, null, 2);
}

/**
 * 稼働中の definy サーバーからビルトインのプロジェクト (seeds/projects/*.json) の最新コミットを取得し、
 * プロジェクトの seed (seeds/projects/<プロジェクト名>.json) と各モジュールの seed (seeds/<モジュール名>.json) として書き出す。
 * システムアカウントのコミットが見つからないプロジェクトのファイルは書き換えない。
 * ビルトイン以外のプロジェクトは `npm run build:seeds` が読まないので書き出さない。
 *
 * @returns 書き出したモジュール名の一覧
 */
export async function exportSeeds(
  options: ExportSeedsOptions,
): Promise<ReadonlyArray<string>> {
  const fetchFn = options.fetchFn ?? fetch;
  const outDir = options.outDir ?? "seeds";
  const seedsDir = options.seedsDir ?? "seeds";
  const accountBytes = await resolveSystemAccountBytes(
    options.systemAccountBytes,
  );
  const systemAccountId = bytesToUrlSafeBase64NoPad(accountBytes);

  // 1. サーバーからシステムアカウントのプロジェクトのコミットを取得
  const latestCommits = await fetchLatestSystemProjectCommits(
    fetchFn,
    options.baseUrl,
    systemAccountId,
  );

  // 2. ディスク上の初期 seed を読み込み (seedsDir のプロジェクトと, outDir または seedsDir のモジュール)
  const projectSeeds = loadProjectSeeds(seedsDir);
  const currentSeedsMap = new Map<string, ModuleSeedData>();
  for (const name of projectSeeds.flatMap((project) => project.modules)) {
    const seed =
      (await tryReadSeedFile(resolve(outDir, `${name}.json`))) ??
      (await tryReadSeedFile(resolve(seedsDir, `${name}.json`)));
    if (seed) {
      currentSeedsMap.set(name, seed);
    }
  }

  // 3. 最新コミットでプロジェクトとモジュールの seed を更新し、書き出すものを決定
  const updatedSeedsMap = new Map<string, ModuleSeedData>(currentSeedsMap);
  const exportedProjects: Array<ProjectSeedData> = [];
  const exportedList: Array<string> = [];

  for (const projectSeed of projectSeeds) {
    const commit = latestCommits.get(projectSeed.project_name);
    if (!commit) {
      continue;
    }
    for (const module of commit.modules) {
      updatedSeedsMap.set(module.name, {
        module_name: module.name,
        module_description: module.description,
        parts: await hydrateCommitParts(fetchFn, options.baseUrl, module.parts),
      });
      exportedList.push(module.name);
    }
    exportedProjects.push({
      project_name: commit.projectName,
      project_description: commit.projectDescription,
      message: commit.message,
      modules: commit.modules.map((module) => module.name),
    });
  }

  // 4. 書き出し後の全モジュールからパーツ参照対応表を作成
  const allSeeds = Array.from(updatedSeedsMap.values());
  const table = await buildPartReferenceTable(accountBytes, allSeeds);

  // 5. 更新対象のプロジェクトとモジュールのみディスクに書き出し (システムアカウントのコミットが見つからないものは書き換えない)
  await mkdir(resolve(outDir, PROJECT_SEEDS_DIR), { recursive: true });
  for (const project of exportedProjects) {
    await writeFile(
      resolve(outDir, PROJECT_SEEDS_DIR, `${project.project_name}.json`),
      projectSeedToJson(project),
      "utf-8",
    );
  }
  for (const name of exportedList) {
    const seed = updatedSeedsMap.get(name);
    if (!seed) continue;
    const json = moduleSeedToJson(seed, table);
    await writeFile(resolve(outDir, `${name}.json`), json, "utf-8");
  }

  return exportedList;
}
