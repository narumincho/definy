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
  ServiceIoHost,
} from "./service_io.ts";
import { instantiateCompiledFunction } from "../src/stage1_compiler.ts";
import type { LatestPart } from "../src/self_hosted_type_check.ts";
import type { Env, EventItem, GetEventsRequest } from "./types.ts";

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

/** {@link definyCommitCache} を読み書きする能力 */
export const commitCacheHost: Pick<
  ServiceIoHost,
  "readCachedCommits" | "writeCachedCommits"
> = {
  readCachedCommits: (eventHashes) =>
    Promise.resolve(
      eventHashes.flatMap((eventHash) => {
        const entry = definyCommitCache.get(eventHash);
        return entry === undefined ? [] : [entry];
      }),
    ),
  writeCachedCommits: (entries) => {
    for (const entry of entries) {
      definyCommitCache.set(entry.event_hash, entry);
    }
    return Promise.resolve();
  },
};

/**
 * definy (`definy.read-definitions`) が CAS の中身を定義の式として読んだもの (キーは content hash).
 * 中身は変わらないので isolate の中で使い回す (`read_cached_definitions` / `write_cached_definitions`)
 */
const definyDefinitionCache = new Map<string, DefinitionCacheEntry>();

/** {@link definyDefinitionCache} を読み書きする能力 */
export const definitionCacheHost: Pick<
  ServiceIoHost,
  "readCachedDefinitions" | "writeCachedDefinitions"
> = {
  readCachedDefinitions: (contentHashes) =>
    Promise.resolve(
      contentHashes.flatMap((contentHash) => {
        const entry = definyDefinitionCache.get(contentHash);
        return entry === undefined ? [] : [entry];
      }),
    ),
  writeCachedDefinitions: (entries) => {
    for (const entry of entries) {
      definyDefinitionCache.set(entry.content_hash, entry);
    }
    return Promise.resolve();
  },
};
