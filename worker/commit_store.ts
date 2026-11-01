/**
 * ストアのイベントを読む. 受け付けたプロジェクトのコミットを読んで (署名を確かめ, isolate の中で使い回す),
 * ブランチの最新のコミットを definy 製の `core.project-branches` (`wasm/branch_summarizer.wasm`) で求める.
 * `SubmitEvent` の検査 (worker/type_check.ts, worker/event_check.ts) が使う
 */
import branchSummarizerModule from "../wasm/branch_summarizer.wasm?module";
import partIdDeriverModule from "../wasm/part_id_deriver.wasm?module";
import { base64ToBytes } from "../src/base64.ts";
import { summarizeBranches } from "../src/branches.ts";
import { decodeVerifiedSignedEvent } from "../src/signed_event.ts";
import type { VisibilityTarget } from "../src/visibility.ts";
import {
  DEFAULT_VISIBILITY,
  MAIN_BRANCH,
  type CommitModule,
} from "../src/event_content.ts";
import type { ContentItem } from "../src/content_store.ts";
import type { CommitSummary } from "../src/event_check.ts";
import { derivePartIds } from "../src/part_ids.ts";
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
export type CommitPartRef = Omit<
  CommitLatestPart,
  "visibility" | "partType" | "expression" | "expressionKey"
>;

/**
 * プロジェクトのコミットの全モジュールのパーツ (中身は読まない).
 * ID は definy 製の `core.module-part-ids` で求める (src/part_ids.ts).
 * `name` は型エラーのメッセージに使うので `モジュール名.パーツ名` にする
 */
export function commitParts(
  modules: ReadonlyArray<CommitModule>,
): ReadonlyArray<CommitPartRef> {
  const ids = derivePartIds(
    partIdDeriverModule,
    modules.map((module) => ({
      moduleName: module.name,
      partNames: module.parts.map((part) => part.name),
    })),
  );
  return modules.flatMap((module, i) =>
    module.parts.map((part, j) => ({
      partId: ids[i]!.partIds[j]!,
      moduleId: ids[i]!.moduleId,
      name: `${module.name}.${part.name}`,
      moduleName: module.name,
      moduleVisibility: module.visibility ?? DEFAULT_VISIBILITY,
      contentHash: part.contentHash ?? "",
    })),
  );
}

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

/**
 * イベントハッシュごとの, 署名を検証してデコードしたプロジェクトのコミット (プロジェクトのコミットでなければ `null`).
 * イベントは変わらないので isolate の中で使い回す
 */
const commitCache = new Map<string, StoredCommit | null>();

async function decodeCommit(item: {
  readonly eventHash: string;
  readonly signedEventBytes: string;
}): Promise<StoredCommit | null> {
  const cached = commitCache.get(item.eventHash);
  if (cached !== undefined) {
    return cached;
  }
  const decoded = await decodeVerifiedSignedEvent(
    base64ToBytes(item.signedEventBytes),
  ).catch(() => undefined);
  let result: StoredCommit | null = null;
  if (decoded?.content.type === "project_commit") {
    const { commit } = decoded.content;
    result = {
      eventHash: item.eventHash,
      accountId: decoded.meta.accountId,
      projectName: commit.projectName,
      moduleNames: commit.modules.map((module) => module.name),
      moduleIds: derivePartIds(
        partIdDeriverModule,
        commit.modules.map((module) => ({
          moduleName: module.name,
          partNames: [],
        })),
      ).map((ids) => ids.moduleId),
      branch: commit.branch,
      timeMs: decoded.meta.timeMs,
      parts: commitParts(commit.modules),
    };
  }
  commitCache.set(item.eventHash, result);
  return result;
}

/** ストアの署名の正しいプロジェクトのコミットすべて */
export async function loadCommits(
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyArray<StoredCommit>> {
  const commits: Array<StoredCommit> = [];
  for await (const item of storeEvents(store, "project_commit", env)) {
    const commit = await decodeCommit(item);
    if (commit !== null) {
      commits.push(commit);
    }
  }
  return commits;
}

/** プロジェクトごとの main ブランチの最新のコミット (キーはプロジェクト名). どれが最新かは definy の `core.project-branches` が決める */
export async function loadLatestMainCommits(
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyMap<string, StoredCommit>> {
  const commits = await loadCommits(store, env);
  const byHash = new Map(commits.map((commit) => [commit.eventHash, commit]));
  const latest = new Map<string, StoredCommit>();
  for (const branch of summarizeBranches(branchSummarizerModule, commits)) {
    const commit = byHash.get(branch.latestEventHash);
    if (branch.name === MAIN_BRANCH && commit !== undefined) {
      latest.set(branch.projectName, commit);
    }
  }
  return latest;
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

/** ストアの署名の正しいプロジェクトのコミット (ストアの順). 規則 (`core.check-event`) に渡す事実 */
export async function loadCommitSummaries(
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyArray<CommitSummary>> {
  return (await loadCommits(store, env)).map((commit) => ({
    eventHash: commit.eventHash,
    accountId: commit.accountId,
    projectName: commit.projectName,
    branch: commit.branch,
    timeMs: commit.timeMs,
    moduleNames: commit.moduleNames,
  }));
}
