/**
 * `SubmitEvent` で受け取ったプロジェクトのコミットを definy 製の型チェッカーで検査する.
 *
 * 型チェッカーは `npm run build:seeds` が seed の `core.type-check-against` を stage1 でコンパイルした
 * `wasm/type_checker.wasm` を `?module` で取り込んで使う (Cloudflare Workers は実行時に Wasm をコンパイルできない).
 * そのため本番で `core` の型チェッカーを編集しても, seed に書き戻してデプロイするまでサーバーの検査には反映されない
 */
import typeCheckerModule from "../wasm/type_checker.wasm?module";
import {
  base64ToBytes,
  bytesToUrlSafeBase64NoPad,
  decodeCborItem,
} from "../src/cbor.ts";
import {
  checkModuleCommitParts,
  isTypePartType,
  outcomeErrorMessage,
  type LatestPart,
} from "../src/self_hosted_type_check.ts";
import { pickLatestCommitPerProject } from "../src/latest_commits.ts";
import {
  summarizeBranches,
  type ProjectBranchSummary,
} from "../src/branches.ts";
import { compilerBuiltinName } from "../src/stage1_compiler.ts";
import { decodeVerifiedSignedEvent } from "../src/signed_event.ts";
import {
  checkReferenceVisibility,
  visibilityViolationMessage,
  type VisibilityTarget,
} from "../src/visibility.ts";
import {
  DEFAULT_VISIBILITY,
  decodePartContent,
  MAIN_BRANCH,
  type CommitModule,
  type PartContent,
} from "../src/event_content.ts";
import type { ContentItem } from "../src/content_store.ts";
import type { EventCheckState } from "../src/event_check.ts";
import { devSystemAccountBytes } from "../src/system_account.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "./cbor.ts";
import type { Env, EventItem, GetEventsRequest } from "./types.ts";

/** 型検査でストアから読むもの */
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

/** システムアカウントの公開鍵. 未設定なら seed と同じ開発用の鍵 */
async function systemAccountBytes(env: Env | undefined): Promise<Uint8Array> {
  const publicKey = env?.DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY?.trim();
  return publicKey ? base64ToBytes(publicKey) : await devSystemAccountBytes();
}

const EVENTS_PAGE_SIZE = 500;

/** 型環境に使う形のプロジェクトのコミットのパーツ. 公開/非公開の検査 (docs/visibility.md) に使う情報も持つ */
type CommitLatestPart = LatestPart &
  Omit<VisibilityTarget, "projectName" | "name"> & {
    readonly contentHash: string;
  };

/** コミットのパーツのうち, 中身 (`core.part-content`) を読まなくても分かるもの */
type CommitPartRef = Omit<
  CommitLatestPart,
  "visibility" | "partType" | "expression" | "expressionKey"
>;

/** パーツの中身の CBOR (Base64) を読む. 形が `core.part-content` でなければ `undefined` */
function decodePartContentBytes(contentBytes: string): PartContent | undefined {
  try {
    return decodePartContent(decodeCborItem(base64ToBytes(contentBytes))[0]);
  } catch {
    return undefined;
  }
}

/** CAS から読むときの 1 回の content hash の数 */
const CONTENT_CHUNK_SIZE = 200;

/** CAS からパーツの中身を読む (キーは content hash). 無いものや形の違うものは入らない */
async function readPartContents(
  hashes: ReadonlyArray<string>,
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyMap<string, PartContent>> {
  const result = new Map<string, PartContent>();
  const unique = [...new Set(hashes)];
  for (let i = 0; i < unique.length; i += CONTENT_CHUNK_SIZE) {
    for (const item of await store.getContentItems(
      unique.slice(i, i + CONTENT_CHUNK_SIZE),
      env,
    )) {
      const content = decodePartContentBytes(item.contentBytes);
      if (content !== undefined) {
        result.set(item.contentHash, content);
      }
    }
  }
  return result;
}

/**
 * content hash ごとの, 型環境に使う形のパーツの中身 (CAS に無いか形が違えば `null`).
 * 中身は変わらないので isolate の中で使い回す. 式は型パーツの宣言式とコンパイラ組み込みのもの (小さい) だけ持つ (メモリを節約する)
 */
const environmentContentCache = new Map<string, PartContent | null>();

async function environmentContents(
  hashes: ReadonlyArray<string>,
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyMap<string, PartContent | null>> {
  const missing = hashes.filter((hash) => !environmentContentCache.has(hash));
  if (missing.length > 0) {
    const read = await readPartContents(missing, store, env);
    for (const hash of missing) {
      const content = read.get(hash);
      environmentContentCache.set(
        hash,
        content === undefined
          ? null
          : isTypePartType(content.partType) ||
              compilerBuiltinName(content.expression) !== undefined
            ? { ...content, description: [] }
            : { ...content, description: [], expression: null },
      );
    }
  }
  return new Map(
    hashes.map((hash) => [hash, environmentContentCache.get(hash) ?? null]),
  );
}

/** パーツに中身を合わせる. 式が変わっていないかは中身の content hash で比べる */
function withContent(
  part: CommitPartRef,
  content: PartContent | null,
): CommitLatestPart {
  return {
    ...part,
    visibility: content?.visibility ?? DEFAULT_VISIBILITY,
    partType: content?.partType ?? null,
    expression: content?.expression ?? null,
    expressionKey: part.contentHash,
  };
}

/**
 * プロジェクトのコミットのモジュールのパーツ (中身は読まない).
 * `name` は型エラーのメッセージに使うので `モジュール名.パーツ名` にする
 */
async function moduleParts(
  module: CommitModule,
): Promise<ReadonlyArray<CommitPartRef>> {
  const moduleIdBytes = await deriveModuleIdBytes(module.name);
  const moduleId = bytesToUrlSafeBase64NoPad(moduleIdBytes);
  const parts = [];
  for (const part of module.parts) {
    parts.push({
      partId: await deriveModulePartId(moduleIdBytes, part.name),
      moduleId,
      name: `${module.name}.${part.name}`,
      moduleName: module.name,
      moduleVisibility: module.visibility ?? DEFAULT_VISIBILITY,
      contentHash: part.contentHash ?? "",
    });
  }
  return parts;
}

/** コミットの全モジュールのパーツ */
async function commitParts(
  modules: ReadonlyArray<CommitModule>,
): Promise<ReadonlyArray<CommitPartRef>> {
  return (await Promise.all(modules.map(moduleParts))).flat();
}

type CachedCommit = {
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
const commitCache = new Map<string, CachedCommit | null>();

async function decodeCommit(item: {
  readonly eventHash: string;
  readonly signedEventBytes: string;
}): Promise<CachedCommit | null> {
  const cached = commitCache.get(item.eventHash);
  if (cached !== undefined) {
    return cached;
  }
  const decoded = await decodeVerifiedSignedEvent(
    base64ToBytes(item.signedEventBytes),
  ).catch(() => undefined);
  let result: CachedCommit | null = null;
  if (decoded?.content.type === "project_commit") {
    const { commit } = decoded.content;
    result = {
      eventHash: item.eventHash,
      accountId: decoded.meta.accountId,
      projectName: commit.projectName,
      moduleNames: commit.modules.map((module) => module.name),
      moduleIds: await Promise.all(
        commit.modules.map(async (module) =>
          bytesToUrlSafeBase64NoPad(await deriveModuleIdBytes(module.name)),
        ),
      ),
      branch: commit.branch,
      timeMs: decoded.meta.timeMs,
      parts: await commitParts(commit.modules),
    };
  }
  commitCache.set(item.eventHash, result);
  return result;
}

/** ストアの署名の正しいプロジェクトのコミットすべて */
async function loadCommits(
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyArray<CachedCommit>> {
  const commits: Array<CachedCommit> = [];
  for (let offset = 0; ; offset += EVENTS_PAGE_SIZE) {
    const page = await store.getEvents(
      { eventType: "project_commit", limit: EVENTS_PAGE_SIZE, offset },
      env,
    );
    for (const item of page) {
      const commit = await decodeCommit(item);
      if (commit !== null) {
        commits.push(commit);
      }
    }
    if (page.length < EVENTS_PAGE_SIZE) {
      break;
    }
  }
  return commits;
}

/** ストアの全プロジェクトの全ブランチ (`GetProjectBranches`). ブラウザはこれでプロジェクトの今の状態を知る (全イベントを読まなくてよい) */
export async function loadProjectBranchHeads(
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyArray<ProjectBranchSummary>> {
  return summarizeBranches(await loadCommits(store, env));
}

/** プロジェクトごとの main ブランチの最新のコミット (キーはプロジェクト名) */
async function loadLatestMainCommits(
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyMap<string, CachedCommit>> {
  return pickLatestCommitPerProject(
    (await loadCommits(store, env)).filter(
      (commit) => commit.branch === MAIN_BRANCH,
    ),
  );
}

/** プロジェクト `projectName` のブランチ (既定は main) の最新のコミットのイベントハッシュ. コミットが無ければ `null` */
export async function latestCommitHashOf(
  projectName: string,
  store: PartStoreReader,
  env: Env | undefined,
  branch: string = MAIN_BRANCH,
): Promise<string | null> {
  return (
    latestOnBranch(
      (await loadCommits(store, env)).filter(
        (commit) => commit.projectName === projectName,
      ),
      branch,
    )?.eventHash ?? null
  );
}

function latestOnBranch(
  projectCommits: ReadonlyArray<CachedCommit>,
  branch: string,
): CachedCommit | undefined {
  let latest: CachedCommit | undefined;
  for (const commit of projectCommits) {
    if (
      commit.branch === branch &&
      (latest === undefined || latest.timeMs < commit.timeMs)
    ) {
      latest = commit;
    }
  }
  return latest;
}

/**
 * プロジェクト `projectName` のブランチ `branch` に, アカウント `accountId` が `parentCommitHash` を親にして
 * モジュール `moduleNames` をコミットするときの, 規則 (`core.check-event`) が使う状態.
 * ブランチの作成者はブランチの最初の (時刻が最小の) コミットのアカウント.
 * 他のプロジェクトのモジュールは, 他のプロジェクトの各ブランチの最新のコミットにあるモジュール (docs/project.md)
 */
export async function branchStateOf(
  projectName: string,
  branch: string,
  accountId: string,
  parentCommitHash: string | null,
  mergedCommitHash: string | null,
  moduleNames: ReadonlyArray<string>,
  store: PartStoreReader,
  env: Env | undefined,
): Promise<Omit<EventCheckState, "accountCreated">> {
  const commits = await loadCommits(store, env);
  const projectCommits = commits.filter(
    (commit) => commit.projectName === projectName,
  );
  let first: CachedCommit | undefined;
  for (const commit of projectCommits) {
    if (
      commit.branch === branch &&
      (first === undefined || commit.timeMs < first.timeMs)
    ) {
      first = commit;
    }
  }
  const otherProjectModules = new Set<string>();
  for (const head of summarizeBranches(
    commits.filter((commit) => commit.projectName !== projectName),
  )) {
    const latest = commits.find(
      (commit) => commit.eventHash === head.latestEventHash,
    );
    for (const name of latest?.moduleNames ?? []) {
      otherProjectModules.add(name);
    }
  }
  return {
    branchLatestCommitHash:
      latestOnBranch(projectCommits, branch)?.eventHash ?? null,
    isBranchCreator: first?.accountId === accountId,
    mergedInProject:
      mergedCommitHash !== null &&
      projectCommits.some((commit) => commit.eventHash === mergedCommitHash),
    modulesInOtherProjects: moduleNames.filter((name) =>
      otherProjectModules.has(name),
    ),
    parentInProject:
      parentCommitHash !== null &&
      projectCommits.some((commit) => commit.eventHash === parentCommitHash),
    projectHasCommits: projectCommits.length > 0,
  };
}

/**
 * ストアの署名の正しいプロジェクトのコミットから, プロジェクトごとに main ブランチの最新のコミットのパーツを集める (キーはパーツ ID).
 * 型パーツ以外の式は持たない. ブランチへのコミットも, 他のプロジェクトは main のパーツで検査する (docs/branch.md).
 * `projectModuleIds` は各プロジェクトの main の最新のコミットのモジュールの ID
 */
async function loadLatestParts(
  store: PartStoreReader,
  env: Env | undefined,
): Promise<{
  readonly parts: ReadonlyMap<string, CommitLatestPart>;
  readonly projectModuleIds: ReadonlyMap<string, ReadonlyArray<string>>;
  /** 参照されるパーツとしての公開/非公開 (キーはパーツ ID) */
  readonly visibilityTargets: ReadonlyMap<string, VisibilityTarget>;
}> {
  const latestCommits = await loadLatestMainCommits(store, env);
  const contents = await environmentContents(
    [...latestCommits.values()].flatMap((commit) =>
      commit.parts.map((part) => part.contentHash),
    ),
    store,
    env,
  );
  const parts = new Map<string, CommitLatestPart>();
  const projectModuleIds = new Map<string, ReadonlyArray<string>>();
  const visibilityTargets = new Map<string, VisibilityTarget>();
  for (const [projectName, commit] of latestCommits) {
    projectModuleIds.set(projectName, commit.moduleIds);
    for (const ref of commit.parts) {
      const part = withContent(ref, contents.get(ref.contentHash) ?? null);
      parts.set(part.partId, part);
      visibilityTargets.set(part.partId, { ...part, projectName });
    }
  }
  return { parts, projectModuleIds, visibilityTargets };
}

/**
 * `SubmitEvent` で受け取ったイベント (Base64) がプロジェクトのコミットなら型チェッカーで検査し,
 * 型エラーなどの理由を 1 パーツ 1 行で返す. 問題なければ空.
 * プロジェクトのコミット以外・署名や形式が不正なもの (`submitEvent` が拒否する)・CAS に足りない内容があるもの
 * (式を読めないので検査できない. `submitEvent` が `missing_content` を返し, 内容を送ってから出し直してもらう) は検査しない
 */
export async function checkSubmittedProjectCommit(
  signedEventBase64: string,
  store: PartStoreReader & {
    readonly checkMissingHashes: (
      hashes: ReadonlyArray<string>,
      env?: Env,
    ) => Promise<ReadonlyArray<string>>;
  },
  env: Env | undefined,
): Promise<ReadonlyArray<string>> {
  let decoded: Awaited<ReturnType<typeof decodeVerifiedSignedEvent>>;
  try {
    decoded = await decodeVerifiedSignedEvent(base64ToBytes(signedEventBase64));
  } catch {
    return [];
  }
  if (decoded.content.type !== "project_commit") {
    return [];
  }
  const { commit } = decoded.content;
  if (
    (await store.checkMissingHashes(decoded.meta.referencedContentHashes, env))
      .length > 0
  ) {
    return [];
  }
  const refs = await commitParts(commit.modules);
  const contents = await readPartContents(
    refs.map((part) => part.contentHash),
    store,
    env,
  );
  // CAS に預けた中身は (イベントの形の検査を通らないので) ここで `core.part-content` の形か確かめる
  const malformed = refs.flatMap((part) =>
    contents.has(part.contentHash)
      ? []
      : [
          `${part.name}: the content ${part.contentHash} is not a core.part-content`,
        ],
  );
  if (malformed.length > 0) {
    return malformed;
  }
  const committed = refs.map((part) =>
    withContent(part, contents.get(part.contentHash) ?? null),
  );
  const latest = await loadLatestParts(store, env);
  const latestParts: ReadonlyMap<string, LatestPart> = latest.parts;
  // コンパイラ組み込みのパーツを置けるのはシステムアカウントのモジュールだけ
  const allowBuiltinParts =
    bytesToUrlSafeBase64NoPad(decoded.accountIdBytes) ===
    bytesToUrlSafeBase64NoPad(await systemAccountBytes(env));
  // 参照できない (非公開の) パーツへの参照は, 型を検査する前に拒否する (docs/visibility.md)
  const violations = checkReferenceVisibility({
    projectName: commit.projectName,
    committed,
    environment: latest.visibilityTargets,
  });
  if (violations.length > 0) {
    return violations.map(visibilityViolationMessage);
  }
  return checkModuleCommitParts({
    typeChecker: typeCheckerModule,
    // プロジェクトの今の (main の) モジュールも, コミットのモジュールで置き換える (無くなったモジュールのパーツは型環境から外れる)
    replacedModuleIds: new Set([
      ...committed.map((part) => part.moduleId),
      ...(latest.projectModuleIds.get(commit.projectName) ?? []),
    ]),
    committed,
    latestParts,
    allowBuiltinParts,
  }).flatMap(({ name, outcome }) => {
    const message = outcomeErrorMessage(name, outcome);
    return message === null ? [] : [message];
  });
}
