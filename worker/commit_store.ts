/**
 * ストアのイベントを読む. 受け付けたプロジェクトのコミットを definy 製の `definy.decode-stored-commit`
 * (`wasm/commit_decoder.wasm`) で読んで (isolate の中で使い回す),
 * ブランチの最新のコミットを definy 製の `core.project-branches` (`wasm/branch_summarizer.wasm`) で求める.
 * テストがブランチの最新のコミットを求めるのに使う ({@link latestCommitHashOf}).
 * definy の `definy.read-commits` / `definy.read-definitions` が読んだものを覚える能力もここ
 */
import branchSummarizerModule from "../wasm/branch_summarizer.wasm?module";
import commitDecoderModule from "../wasm/commit_decoder.wasm?module";
import { summarizeBranches } from "../src/branches.ts";
import { variantOf } from "../src/definy_value.ts";
import type { VisibilityTarget } from "../src/visibility.ts";
import { MAIN_BRANCH, type Visibility } from "../src/event_content.ts";
import type { ContentItem } from "../src/content_store.ts";
import type {
  CommitCacheEntry,
  DefinitionCacheEntry,
  ResolutionCacheEntry,
  ServiceIoHost,
} from "./service_io.ts";
import { instantiateCompiledFunction } from "../src/stage1_compiler.ts";
import type { LatestPart } from "../src/self_hosted_type_check.ts";
import type { D1Database, Env, EventItem, GetEventsRequest } from "./types.ts";

/** `SubmitEvent` の検査でストアから読むもの */
export type PartStoreReader = {
  readonly getEvents: (
    req: GetEventsRequest,
    env?: Env,
  ) => Promise<ReadonlyArray<EventItem>>;
  readonly getContentItems: (
    hashes: ReadonlyArray<string>,
    env?: Env,
  ) => Promise<ReadonlyArray<ContentItem>>;
};

const EVENTS_PAGE_SIZE = 500;

/** ストアの種類 `eventType` のイベントを, ストアの順に 500 件ずつ読みながら 1 つずつ返す */
export async function* storeEvents(
  store: PartStoreReader,
  eventType: NonNullable<GetEventsRequest["eventType"]>,
  env: Env | undefined,
): AsyncGenerator<EventItem> {
  for (let offset = 0; ; offset += EVENTS_PAGE_SIZE) {
    const page = await store.getEvents(
      { eventType, limit: EVENTS_PAGE_SIZE, offset },
      env,
    );
    yield* page;
    if (page.length < EVENTS_PAGE_SIZE) {
      return;
    }
  }
}

/** 型環境に使う形のプロジェクトのコミットのパーツ. 公開/非公開の検査 (docs/visibility.md) に使う情報も持つ */
export type CommitLatestPart = LatestPart &
  Omit<VisibilityTarget, "projectName" | "name"> & {
    readonly contentHash: string;
  };

/** コミットのパーツのうち, 中身 (`core.part-content`) を読まなくても分かるもの */
type CommitPartRef = Omit<
  CommitLatestPart,
  "visibility" | "partType" | "expression" | "expressionKey"
>;

export type StoredCommit = {
  readonly eventHash: string;
  readonly accountId: string;
  readonly projectName: string;
  /** コミットのモジュールの名前 */
  readonly moduleNames: ReadonlyArray<string>;
  /** コミットのモジュールの ID */
  readonly moduleIds: ReadonlyArray<string>;
  readonly branch: string;
  readonly timeMs: number;
  /** パーツ. 中身は使うときに CAS から読む */
  readonly parts: ReadonlyArray<CommitPartRef>;
};

/** `definy.stored-commit` (`definy.decode-stored-commit` の結果) */
type DefinyStoredCommit = {
  readonly account_id: string;
  readonly project_name: string;
  readonly branch: string;
  readonly time_ms: number;
  readonly modules: ReadonlyArray<{
    readonly name: string;
    readonly id: string;
    readonly parts: ReadonlyArray<{
      readonly id: string;
      readonly name: string;
      readonly module_name: string;
      readonly module_id: string;
      readonly module_visibility: unknown;
      readonly content_hash: string;
    }>;
  }>;
};

/**
 * SignedEvent (Base64) を definy の `definy.decode-stored-commit` でプロジェクトのコミットとして読む.
 * 署名は確かめない (ストアのイベントと, definy が確かめた後の受け取ったイベントにだけ使う). プロジェクトのコミットでなければ `null`
 */
export function decodeStoredCommit(
  signedEventBytes: string,
): Omit<StoredCommit, "eventHash"> | null {
  const instance = instantiateCompiledFunction(commitDecoderModule);
  const result = variantOf(
    instance.read(
      instance.call({
        signed_event_bytes: instance.writeArgument(signedEventBytes),
      }),
    ),
  );
  if (result?.tag !== "some") {
    return null;
  }
  const commit = result.payload as DefinyStoredCommit;
  return {
    accountId: commit.account_id,
    projectName: commit.project_name,
    moduleNames: commit.modules.map((module) => module.name),
    moduleIds: commit.modules.map((module) => module.id),
    branch: commit.branch,
    timeMs: commit.time_ms,
    parts: commit.modules.flatMap((module) =>
      module.parts.map((part) => ({
        partId: part.id,
        moduleId: part.module_id,
        name: part.name,
        moduleName: part.module_name,
        moduleVisibility: (variantOf(part.module_visibility)?.tag ??
          "public") as Visibility,
        contentHash: part.content_hash,
      })),
    ),
  };
}

/**
 * イベントハッシュごとの, 読んだプロジェクトのコミット (プロジェクトのコミットでなければ `null`).
 * イベントは変わらないので isolate の中で使い回す
 */
const commitCache = new Map<string, StoredCommit | null>();

function decodeCommit(item: {
  readonly eventHash: string;
  readonly signedEventBytes: string;
}): StoredCommit | null {
  const cached = commitCache.get(item.eventHash);
  if (cached !== undefined) {
    return cached;
  }
  const decoded = decodeStoredCommit(item.signedEventBytes);
  const result =
    decoded === null ? null : { eventHash: item.eventHash, ...decoded };
  commitCache.set(item.eventHash, result);
  return result;
}

/** ストアのプロジェクトのコミットすべて (ストアには definy が署名を確かめたイベントしか入れない) */
async function loadCommits(
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyArray<StoredCommit>> {
  const commits: Array<StoredCommit> = [];
  for await (const item of storeEvents(store, "project_commit", env)) {
    const commit = decodeCommit(item);
    if (commit !== null) {
      commits.push(commit);
    }
  }
  return commits;
}

/** プロジェクト `projectName` のブランチ (既定は main) の最新のコミットのイベントハッシュ. コミットが無ければ `null` */
export async function latestCommitHashOf(
  projectName: string,
  store: PartStoreReader,
  env: Env | undefined,
  branch: string = MAIN_BRANCH,
): Promise<string | null> {
  return (
    summarizeBranches(
      branchSummarizerModule,
      (await loadCommits(store, env)).filter(
        (commit) => commit.projectName === projectName,
      ),
    ).find((summary) => summary.name === branch)?.latestEventHash ?? null
  );
}

/**
 * definy (`definy.read-commits`) がイベントをプロジェクトのコミットとして読んだもの (キーはイベントハッシュ).
 * 中身は変わらないので isolate の中で使い回す (`read_cached_commits` / `write_cached_commits`)
 */
const definyCommitCache = new Map<string, CommitCacheEntry>();

/**
 * definy (`definy.read-definitions`) が CAS の中身を定義の式として読んだもの (キーは content hash).
 * 中身は変わらないので isolate の中で使い回す (`read_cached_definitions` / `write_cached_definitions`)
 */
const definyDefinitionCache = new Map<string, DefinitionCacheEntry>();

/**
 * definy が中身を解決した結果 (キーは content hash)。解決済みの中身も型検査エントリも
 * 中身そのものから決まるので、定義のキャッシュと同じく使い回せる
 * (`read_cached_resolutions` / `write_cached_resolutions`)
 */
const definyResolutionCache = new Map<string, ResolutionCacheEntry>();

/*
 * 上の 2 つのキャッシュは中身が不変 (イベントも CAS も書き換わらない) なので、
 * D1 にも保存して isolate をまたいで使い回せるようにする (永続キャッシュ)。
 * 冷たい isolate でも、コミットのデコードと定義の CBOR 読み直し (型環境の約 860 件) を省ける。
 * D1 が無い・失敗したときはメモリだけで動く (キャッシュは最適化で、壊れてもリクエストは失敗させない)
 */

/** D1 に保存済みのキー (isolate ごと。再保存を省く) */
const persistedCommitHashes = new Set<string>();
const persistedDefinitionHashes = new Set<string>();
const persistedResolutionHashes = new Set<string>();

/** テーブルを作った D1 (isolate ごと) */
const tablesReady = new WeakMap<D1Database, Promise<void>>();

function ensureCacheTables(db: D1Database): Promise<void> {
  let ready = tablesReady.get(db);
  if (ready === undefined) {
    ready = (async () => {
      await db.exec(
        "CREATE TABLE IF NOT EXISTS host_commit_cache (event_hash TEXT PRIMARY KEY, entry_json TEXT NOT NULL);" +
          "CREATE TABLE IF NOT EXISTS host_definition_cache (content_hash TEXT PRIMARY KEY, entry_json TEXT NOT NULL);" +
          "CREATE TABLE IF NOT EXISTS host_resolution_cache (content_hash TEXT PRIMARY KEY, entry_json TEXT NOT NULL)",
      );
    })();
    tablesReady.set(db, ready);
  }
  return ready;
}

const D1_LOOKUP_CHUNK = 100;

async function readPersistedEntries(
  db: D1Database,
  table:
    "host_commit_cache" | "host_definition_cache" | "host_resolution_cache",
  hashColumn: "event_hash" | "content_hash",
  hashes: ReadonlyArray<string>,
): Promise<Array<{ hash: string; entry: unknown }>> {
  const found: Array<{ hash: string; entry: unknown }> = [];
  try {
    await ensureCacheTables(db);
    for (let i = 0; i < hashes.length; i += D1_LOOKUP_CHUNK) {
      const chunk = hashes.slice(i, i + D1_LOOKUP_CHUNK);
      const placeholders = chunk.map(() => "?").join(", ");
      const res = await db
        .prepare(
          `SELECT ${hashColumn} AS hash, entry_json FROM ${table} WHERE ${hashColumn} IN (${placeholders})`,
        )
        .bind(...chunk)
        .all<{ hash: string; entry_json: string }>();
      for (const row of res.results) {
        try {
          found.push({
            hash: row.hash,
            entry: JSON.parse(row.entry_json) as unknown,
          });
        } catch {
          // 壊れた行は無いものとして扱う (definy が読み直す)
        }
      }
    }
  } catch {
    // D1 が使えなければメモリだけで続ける
  }
  return found;
}

async function persistEntries(
  db: D1Database,
  table:
    "host_commit_cache" | "host_definition_cache" | "host_resolution_cache",
  hashColumn: "event_hash" | "content_hash",
  entries: ReadonlyArray<{ hash: string; json: string }>,
): Promise<void> {
  try {
    await ensureCacheTables(db);
    for (let i = 0; i < entries.length; i += D1_LOOKUP_CHUNK) {
      const chunk = entries.slice(i, i + D1_LOOKUP_CHUNK);
      await db.batch(
        chunk.map((entry) =>
          db
            .prepare(
              `INSERT OR REPLACE INTO ${table} (${hashColumn}, entry_json) VALUES (?, ?)`,
            )
            .bind(entry.hash, entry.json),
        ),
      );
    }
  } catch {
    // 保存できなくてもメモリには残っている
  }
}

/**
 * {@link definyCommitCache} を読み書きする能力。`db` を渡すと D1 にも保存し、
 * メモリに無いものは D1 から読む。`memory` はテスト用 (isolate を模す)
 */
export function createCommitCacheHost(
  db?: D1Database,
  memory: Map<string, CommitCacheEntry> = definyCommitCache,
): Pick<ServiceIoHost, "readCachedCommits" | "writeCachedCommits"> {
  return {
    readCachedCommits: async (eventHashes) => {
      const missing: Array<string> = [];
      const result: Array<CommitCacheEntry> = [];
      for (const eventHash of eventHashes) {
        const entry = memory.get(eventHash);
        if (entry === undefined) missing.push(eventHash);
        else result.push(entry);
      }
      if (db !== undefined && missing.length > 0) {
        const persisted = await readPersistedEntries(
          db,
          "host_commit_cache",
          "event_hash",
          missing,
        );
        for (const { hash, entry } of persisted) {
          const cacheEntry = entry as CommitCacheEntry;
          if (cacheEntry.event_hash === hash) {
            memory.set(hash, cacheEntry);
            persistedCommitHashes.add(hash);
            result.push(cacheEntry);
          }
        }
      }
      return result;
    },
    writeCachedCommits: async (entries) => {
      for (const entry of entries) {
        memory.set(entry.event_hash, entry);
      }
      if (db === undefined) return;
      const fresh: Array<{ hash: string; json: string }> = [];
      for (const entry of entries) {
        if (persistedCommitHashes.has(entry.event_hash)) continue;
        try {
          fresh.push({
            hash: entry.event_hash,
            json: JSON.stringify(entry),
          });
          persistedCommitHashes.add(entry.event_hash);
        } catch {
          // JSON にできない値はメモリだけに残す
        }
      }
      if (fresh.length > 0) {
        await persistEntries(db, "host_commit_cache", "event_hash", fresh);
      }
    },
  };
}

/**
 * {@link definyDefinitionCache} を読み書きする能力。`db` を渡すと D1 にも保存し、
 * メモリに無いものは D1 から読む。`memory` はテスト用 (isolate を模す)
 */
export function createDefinitionCacheHost(
  db?: D1Database,
  memory: Map<string, DefinitionCacheEntry> = definyDefinitionCache,
): Pick<ServiceIoHost, "readCachedDefinitions" | "writeCachedDefinitions"> {
  return {
    readCachedDefinitions: async (contentHashes) => {
      const missing: Array<string> = [];
      const result: Array<DefinitionCacheEntry> = [];
      for (const contentHash of contentHashes) {
        const entry = memory.get(contentHash);
        if (entry === undefined) missing.push(contentHash);
        else result.push(entry);
      }
      if (db !== undefined && missing.length > 0) {
        const persisted = await readPersistedEntries(
          db,
          "host_definition_cache",
          "content_hash",
          missing,
        );
        for (const { hash, entry } of persisted) {
          const cacheEntry = entry as DefinitionCacheEntry;
          if (cacheEntry.content_hash === hash) {
            memory.set(hash, cacheEntry);
            persistedDefinitionHashes.add(hash);
            result.push(cacheEntry);
          }
        }
      }
      return result;
    },
    writeCachedDefinitions: async (entries) => {
      for (const entry of entries) {
        memory.set(entry.content_hash, entry);
      }
      if (db === undefined) return;
      const fresh: Array<{ hash: string; json: string }> = [];
      for (const entry of entries) {
        if (persistedDefinitionHashes.has(entry.content_hash)) continue;
        try {
          fresh.push({
            hash: entry.content_hash,
            json: JSON.stringify(entry),
          });
          persistedDefinitionHashes.add(entry.content_hash);
        } catch {
          // JSON にできない値はメモリだけに残す
        }
      }
      if (fresh.length > 0) {
        await persistEntries(
          db,
          "host_definition_cache",
          "content_hash",
          fresh,
        );
      }
    },
  };
}

/**
 * {@link definyResolutionCache} を読み書きする能力。`db` を渡すと D1 にも保存し、
 * メモリに無いものは D1 から読む。`memory` はテスト用 (isolate を模す)
 */
export function createResolutionCacheHost(
  db?: D1Database,
  memory: Map<string, ResolutionCacheEntry> = definyResolutionCache,
): Pick<ServiceIoHost, "readCachedResolutions" | "writeCachedResolutions"> {
  return {
    readCachedResolutions: async (contentHashes) => {
      const missing: Array<string> = [];
      const result: Array<ResolutionCacheEntry> = [];
      for (const contentHash of contentHashes) {
        const entry = memory.get(contentHash);
        if (entry === undefined) missing.push(contentHash);
        else result.push(entry);
      }
      if (db !== undefined && missing.length > 0) {
        const persisted = await readPersistedEntries(
          db,
          "host_resolution_cache",
          "content_hash",
          missing,
        );
        for (const { hash, entry } of persisted) {
          const cacheEntry = entry as ResolutionCacheEntry;
          if (cacheEntry.content_hash === hash) {
            memory.set(hash, cacheEntry);
            persistedResolutionHashes.add(hash);
            result.push(cacheEntry);
          }
        }
      }
      return result;
    },
    writeCachedResolutions: async (entries) => {
      for (const entry of entries) {
        memory.set(entry.content_hash, entry);
      }
      if (db === undefined) return;
      const fresh: Array<{ hash: string; json: string }> = [];
      for (const entry of entries) {
        if (persistedResolutionHashes.has(entry.content_hash)) continue;
        try {
          fresh.push({
            hash: entry.content_hash,
            json: JSON.stringify(entry),
          });
          persistedResolutionHashes.add(entry.content_hash);
        } catch {
          // JSON にできない値はメモリだけに残す
        }
      }
      if (fresh.length > 0) {
        await persistEntries(
          db,
          "host_resolution_cache",
          "content_hash",
          fresh,
        );
      }
    },
  };
}

/** {@link definyResolutionCache} を読み書きする能力 (メモリのみ) */
export const resolutionCacheHost: Pick<
  ServiceIoHost,
  "readCachedResolutions" | "writeCachedResolutions"
> = createResolutionCacheHost();

/** {@link definyCommitCache} を読み書きする能力 (メモリのみ) */
export const commitCacheHost: Pick<
  ServiceIoHost,
  "readCachedCommits" | "writeCachedCommits"
> = createCommitCacheHost();

/** {@link definyDefinitionCache} を読み書きする能力 (メモリのみ) */
export const definitionCacheHost: Pick<
  ServiceIoHost,
  "readCachedDefinitions" | "writeCachedDefinitions"
> = createDefinitionCacheHost();
