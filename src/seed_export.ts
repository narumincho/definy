import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { importAccountCredentials } from "./auth.ts";
import {
  base64ToBytes,
  bytesToUrlSafeBase64NoPad,
  decodeCborItem,
  toUint8Array,
} from "./cbor.ts";
import { devSystemAccountBytes } from "./seed_parts.ts";
import { verifySignedEvent } from "./signed_event.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "../worker/cbor.ts";
import type { GetContentResponse, GetEventsResponse } from "../worker/types.ts";

/** ビルトインモジュールの名前一覧 (正本 seeds/*.json の対象) */
export const BUILTIN_MODULE_NAMES: ReadonlyArray<string> = [
  "definy",
  "core",
  "std",
  "wasi",
  "sample",
];

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
  readonly message: string;
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
    const moduleId = await deriveModuleIdBytes(accountBytes, seed.module_name);
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

type RawCommitPart = {
  readonly name?: unknown;
  readonly part_type?: unknown;
  readonly description?: unknown;
  readonly expression?: unknown;
  readonly content_hash?: unknown;
};

type RawModuleCommit = {
  readonly module_name?: unknown;
  readonly module_description?: unknown;
  readonly message?: unknown;
  readonly parts?: unknown;
};

type LatestCommitEntry = {
  readonly time: number;
  readonly commit: RawModuleCommit;
};

/**
 * サーバーから `GetEvents` をページングして取得し、モジュールごとにシステムアカウントの最新コミットを収集する
 */
async function fetchLatestSystemModuleCommits(
  fetchFn: typeof fetch,
  baseUrl: string,
  systemAccountId: string,
): Promise<ReadonlyMap<string, RawModuleCommit>> {
  const latest = new Map<string, LatestCommitEntry>();
  let offset = 0;

  while (true) {
    const response = await postConnectJson<GetEventsResponse>(
      fetchFn,
      baseUrl,
      "GetEvents",
      {
        eventType: "module_commit",
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

      let meta;
      try {
        meta = await verifySignedEvent(signedBytes);
      } catch {
        continue;
      }

      if (meta.accountId !== systemAccountId) {
        continue;
      }
      if (meta.eventType !== "module_commit") {
        continue;
      }

      let signedRaw: unknown;
      try {
        [signedRaw] = decodeCborItem(signedBytes);
      } catch {
        continue;
      }
      const eventBinaryField = (signedRaw as Record<string, unknown> | null)
        ?.event_binary as
        { readonly __tag?: unknown; readonly value?: unknown } | undefined;
      const innerBytes = toUint8Array(
        eventBinaryField?.value ?? eventBinaryField,
      );
      if (!innerBytes) {
        continue;
      }

      let innerRaw: unknown;
      try {
        [innerRaw] = decodeCborItem(innerBytes);
      } catch {
        continue;
      }
      if (!innerRaw || typeof innerRaw !== "object") {
        continue;
      }
      const innerObj = innerRaw as Record<string, unknown>;
      const contentObj = innerObj.content as
        Record<string, unknown> | undefined;
      if (!contentObj || !("ModuleCommit" in contentObj)) {
        continue;
      }
      const commit = contentObj.ModuleCommit as RawModuleCommit;
      const moduleName = String(commit.module_name ?? "");
      if (!moduleName) {
        continue;
      }

      const existing = latest.get(moduleName);
      if (!existing || existing.time < meta.timeMs) {
        latest.set(moduleName, { time: meta.timeMs, commit });
      }
    }

    if (count < PAGE_SIZE) {
      break;
    }
    offset += count;
  }

  const result = new Map<string, RawModuleCommit>();
  for (const [modName, entry] of latest) {
    result.set(modName, entry.commit);
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
  rawParts: ReadonlyArray<RawCommitPart>,
): Promise<ReadonlyArray<PartSeedData>> {
  const parts: Array<PartSeedData> = [];
  for (const raw of rawParts) {
    const name = String(raw.name ?? "");
    let expression: unknown = undefined;

    if (raw.expression != null) {
      expression = raw.expression;
    } else if (raw.content_hash != null) {
      const hashBytes = toUint8Array(raw.content_hash);
      const contentHash = hashBytes
        ? bytesToUrlSafeBase64NoPad(hashBytes)
        : String(raw.content_hash);

      const response = await postConnectJson<GetContentResponse>(
        fetchFn,
        baseUrl,
        "GetContent",
        { contentHash },
      );
      const item = response.item;
      if (!item) {
        throw new Error(
          `content ${contentHash} for part '${name}' was not found`,
        );
      }
      const contentBytes = base64ToBytes(item.contentBytes);
      const [decodedExpr] = decodeCborItem(contentBytes);
      expression = decodedExpr;
    }

    const partData: Record<string, unknown> = { name };
    if (raw.part_type !== undefined) {
      partData.part_type = raw.part_type;
    }
    if (raw.description !== undefined) {
      partData.description = raw.description;
    }
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
      message: String(parsed.message ?? ""),
      parts,
    };
  } catch {
    return undefined;
  }
}

/**
 * ModuleSeed を JSON 文字列にシリアライズする。
 * - トップレベルのキー順: `$schema`, `module_name`, `module_description`, `message`, `parts`
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
    message: seed.message,
    parts,
  };

  return JSON.stringify(outObj, null, 2);
}

/**
 * 稼働中の definy サーバーからビルトインモジュールの最新コミットを取得し、seed JSON として書き出す。
 * システムアカウントのコミットが見つからないモジュールのファイルは書き換えない。
 * `BUILTIN_MODULE_NAMES` 以外のモジュールは `npm run build:seeds` が読まないので書き出さない。
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

  // 1. サーバーからシステムアカウントのモジュールコミットを取得
  const latestCommits = await fetchLatestSystemModuleCommits(
    fetchFn,
    options.baseUrl,
    systemAccountId,
  );

  // 2. ディスク上の初期 seed を読み込み (outDir または seedsDir から)
  const currentSeedsMap = new Map<string, ModuleSeedData>();
  for (const name of BUILTIN_MODULE_NAMES) {
    const fromOutDir = await tryReadSeedFile(resolve(outDir, `${name}.json`));
    if (fromOutDir) {
      currentSeedsMap.set(name, fromOutDir);
      continue;
    }
    const fromSeedsDir = await tryReadSeedFile(
      resolve(seedsDir, `${name}.json`),
    );
    if (fromSeedsDir) {
      currentSeedsMap.set(name, fromSeedsDir);
    }
  }

  // 3. 最新コミットでモジュール seed を更新し、書き出すモジュールを決定
  const updatedSeedsMap = new Map<string, ModuleSeedData>(currentSeedsMap);
  const exportedList: Array<string> = [];

  for (const name of BUILTIN_MODULE_NAMES) {
    const commit = latestCommits.get(name);
    if (!commit) {
      continue;
    }
    const rawParts = Array.isArray(commit.parts)
      ? (commit.parts as ReadonlyArray<RawCommitPart>)
      : [];
    const hydratedParts = await hydrateCommitParts(
      fetchFn,
      options.baseUrl,
      rawParts,
    );
    updatedSeedsMap.set(name, {
      module_name: String(commit.module_name ?? name),
      module_description: commit.module_description,
      message: String(commit.message ?? ""),
      parts: hydratedParts,
    });
    exportedList.push(name);
  }

  // 4. 書き出し後の全モジュールからパーツ参照対応表を作成
  const allSeeds = Array.from(updatedSeedsMap.values());
  const table = await buildPartReferenceTable(accountBytes, allSeeds);

  // 5. 更新対象のモジュールのみディスクに書き出し (システムアカウントのコミットが見つからないものは書き換えない)
  await mkdir(outDir, { recursive: true });
  for (const name of exportedList) {
    const seed = updatedSeedsMap.get(name);
    if (!seed) continue;
    const json = moduleSeedToJson(seed, table);
    await writeFile(resolve(outDir, `${name}.json`), json, "utf-8");
  }

  return exportedList;
}
