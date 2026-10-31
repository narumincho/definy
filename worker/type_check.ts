/**
 * `SubmitEvent` で受け取ったプロジェクトのコミットの検査で, definy の `definy.check-commit` (docs/service.md) が使う能力.
 * 何をどの順に確かめるか, 定義の式の評価, 型検査は definy (`wasm/service.wasm`) が行い, ここはストアと CAS を読んで
 * 検査の入力を作ることと, 評価した値 (`core.value`) を `core.part-content` にすることだけをする.
 * 型環境 (各プロジェクトの main の最新のコミット) の中身を求めるのはまだここ (`commitContents`)
 */
import shapeCheckerModule from "../wasm/shape_checker.wasm?module";
import branchSummarizerModule from "../wasm/branch_summarizer.wasm?module";
import definitionEvaluatorModule from "../wasm/definition_evaluator.wasm?module";
import partIdDeriverModule from "../wasm/part_id_deriver.wasm?module";
import { base64ToBytes, decodeCborItem } from "../src/cbor.ts";
import {
  isTypePartType,
  latestPartsToModuleEntries,
  type LatestPart,
} from "../src/self_hosted_type_check.ts";
import { none, some, variant } from "../src/definy_value.ts";
import { summarizeBranches } from "../src/branches.ts";
import { compilerBuiltinName } from "../src/stage1_compiler.ts";
import { decodeVerifiedSignedEvent } from "../src/signed_event.ts";
import {
  visibilityTargetValues,
  type VisibilityTarget,
} from "../src/visibility.ts";
import {
  DEFAULT_VISIBILITY,
  encodePartContent,
  partContentFromValue,
  MAIN_BRANCH,
  type CommitModule,
  type PartContent,
} from "../src/event_content.ts";
import type { ContentItem } from "../src/content_store.ts";
import {
  evaluatePartDefinition,
  resolveDefinitionsInCommit,
} from "../src/part_definition.ts";
import {
  coreValueToValue,
  evaluateDefinition,
  evaluatedPartReferenceIds,
} from "../src/definition_evaluator.ts";
import { conformsInDefiny, type CommitSummary } from "../src/event_check.ts";
import { derivePartIds } from "../src/part_ids.ts";
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

/**
 * パーツの中身の CBOR (Base64) を読む. 中身は定義の式で, 評価して `core.part-content` の形でなければ `undefined`
 * (docs/part-definition.md). `trusted` (受け付けたコミットが参照している中身. 受け付けたときに確かめた) でなければ,
 * 評価した値の形を definy 製の `core.value-conforms` で確かめる (docs/event.md)
 */
function decodePartContentBytes(
  contentBytes: string,
  trusted: boolean,
): PartContent | undefined {
  try {
    const value = evaluatePartDefinition(
      decodeCborItem(base64ToBytes(contentBytes))[0],
    );
    return value !== undefined &&
      (trusted ||
        conformsInDefiny(shapeCheckerModule, value, "core.part-content"))
      ? partContentFromValue(value)
      : undefined;
  } catch {
    return undefined;
  }
}

/** CAS から読むときの 1 回の content hash の数 */
const CONTENT_CHUNK_SIZE = 200;

/** CAS からパーツの中身を読む (キーは content hash). 無いものや形の違うものは入らない. `trusted` は形を確かめなくてよい中身 */
async function readPartContents(
  hashes: ReadonlyArray<string>,
  store: PartStoreReader,
  env: Env | undefined,
  trusted: (hash: string) => boolean,
): Promise<ReadonlyMap<string, PartContent>> {
  const result = new Map<string, PartContent>();
  const unique = [...new Set(hashes)];
  for (let i = 0; i < unique.length; i += CONTENT_CHUNK_SIZE) {
    for (const item of await store.getContentItems(
      unique.slice(i, i + CONTENT_CHUNK_SIZE),
      env,
    )) {
      const content = decodePartContentBytes(
        item.contentBytes,
        trusted(item.contentHash),
      );
      if (content !== undefined) {
        result.set(item.contentHash, content);
      }
    }
  }
  return result;
}

/**
 * CAS からパーツの定義の式を読む (キーは content hash). 無いもの・CBOR として読めないものは入らない.
 * `trusted` を渡すと, それが偽の中身は `core.expression` の形か definy 製の `core.value-conforms` で確かめ, 違えば入れない
 */
async function readPartDefinitions(
  hashes: ReadonlyArray<string>,
  store: PartStoreReader,
  env: Env | undefined,
  trusted?: (hash: string) => boolean,
): Promise<ReadonlyMap<string, unknown>> {
  const result = new Map<string, unknown>();
  const unique = [...new Set(hashes)];
  for (let i = 0; i < unique.length; i += CONTENT_CHUNK_SIZE) {
    for (const item of await store.getContentItems(
      unique.slice(i, i + CONTENT_CHUNK_SIZE),
      env,
    )) {
      try {
        const definition = decodeCborItem(base64ToBytes(item.contentBytes))[0];
        if (
          trusted === undefined ||
          trusted(item.contentHash) ||
          conformsInDefiny(shapeCheckerModule, definition, "core.expression")
        ) {
          result.set(item.contentHash, definition);
        }
      } catch {
        // CBOR でないものは定義の式ではない
      }
    }
  }
  return result;
}

/**
 * コミットのパーツの中身を, 定義の式をそのコミットの中で評価して求める (キーはパーツ ID. docs/part-definition.md).
 * ユーザーが作った定義のパーツの呼び出しは definy 製の評価器 (`core.eval-value`) で評価し, 評価で参照する
 * コミットの外のパーツの式は `externalContentHash` の中身を CAS から読む (その場で評価できる定義のものだけ).
 * `evaluated` は評価器で評価したパーツ (定義の式を型検査する)
 */
async function commitContents(options: {
  readonly parts: ReadonlyArray<CommitPartRef>;
  /** content hash → 定義の式 */
  readonly definitions: ReadonlyMap<string, unknown>;
  readonly externalContentHash: (partId: string) => string | undefined;
  readonly conforms: (part: CommitPartRef, value: unknown) => boolean;
  readonly store: PartStoreReader;
  readonly env: Env | undefined;
}): Promise<{
  readonly contents: ReadonlyMap<string, PartContent>;
  readonly evaluated: ReadonlySet<string>;
}> {
  const byId = new Map(options.parts.map((part) => [part.partId, part]));
  const definitions = new Map(
    options.parts.flatMap((part) =>
      options.definitions.has(part.contentHash)
        ? [[part.partId, options.definitions.get(part.contentHash)] as const]
        : [],
    ),
  );
  const conforms = (id: string, value: unknown): boolean => {
    const part = byId.get(id);
    return part !== undefined && options.conforms(part, value);
  };
  const immediate = resolveDefinitionsInCommit({
    definitions,
    external: () => undefined,
    evaluate: undefined,
    conforms,
  });
  const pending = [...definitions].filter(
    ([id, definition]) =>
      !immediate.has(id) && evaluatePartDefinition(definition) === undefined,
  );
  if (pending.length === 0) {
    return { contents: immediate, evaluated: new Set() };
  }
  // 評価で参照するコミットの外のパーツの式を, 参照をたどって読んでおく
  const external = new Map<string, unknown>();
  const seen = new Set<string>();
  let frontier = pending.flatMap(([, definition]) =>
    evaluatedPartReferenceIds(definition),
  );
  while (frontier.length > 0) {
    const next: string[] = [];
    const toRead = new Map<string, string>();
    for (const id of frontier) {
      if (seen.has(id)) continue;
      seen.add(id);
      if (definitions.has(id)) {
        const expression = immediate.get(id)?.expression;
        next.push(
          ...evaluatedPartReferenceIds(
            expression ?? definitions.get(id) ?? null,
          ),
        );
        continue;
      }
      const hash = options.externalContentHash(id);
      if (hash !== undefined) toRead.set(id, hash);
    }
    const read = await readPartDefinitions(
      [...toRead.values()],
      options.store,
      options.env,
    );
    for (const [id, hash] of toRead) {
      const value = evaluatePartDefinition(read.get(hash) ?? null);
      const expression =
        value === undefined
          ? undefined
          : partContentFromValue(value).expression;
      if (expression != null) {
        external.set(id, expression);
        next.push(...evaluatedPartReferenceIds(expression));
      }
    }
    frontier = next;
  }
  const contents = resolveDefinitionsInCommit({
    definitions,
    external: (id) => external.get(id),
    evaluate: (definition, resolve) =>
      evaluateDefinition(definitionEvaluatorModule, definition, resolve),
    conforms,
  });
  return {
    contents,
    evaluated: new Set(
      pending.map(([id]) => id).filter((id) => contents.has(id)),
    ),
  };
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
    // 型環境の中身は受け付けたコミットのものなので, 形は確かめてある
    const read = await readPartContents(missing, store, env, () => true);
    for (const hash of missing) {
      const content = read.get(hash);
      environmentContentCache.set(
        hash,
        content === undefined ? null : environmentContent(content),
      );
    }
  }
  return new Map(
    hashes.map((hash) => [hash, environmentContentCache.get(hash) ?? null]),
  );
}

/** 型環境に入れる形にする (説明を除き, 式は型パーツの宣言式とコンパイラ組み込みのものだけ持つ) */
function environmentContent(content: PartContent): PartContent {
  return isTypePartType(content.partType) ||
    compilerBuiltinName(content.expression) !== undefined
    ? { ...content, description: [] }
    : { ...content, description: [], expression: null };
}

/**
 * イベントハッシュごとの, 受け付けたコミットのパーツのうち評価器で評価して求めた中身 (型環境の形. キーはパーツ ID).
 * 中身はコミットで決まり, コミットは変わらないので isolate の中で使い回す
 */
const evaluatedEnvironmentCache = new Map<
  string,
  ReadonlyMap<string, PartContent>
>();

/** 受け付けたコミットの, その場で評価できない定義のパーツの中身をコミットの中で評価する */
async function evaluatedEnvironmentContents(
  commit: CachedCommit,
  externalContentHash: (partId: string) => string | undefined,
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyMap<string, PartContent>> {
  const cached = evaluatedEnvironmentCache.get(commit.eventHash);
  if (cached !== undefined) {
    return cached;
  }
  const { contents, evaluated } = await commitContents({
    parts: commit.parts,
    definitions: await readPartDefinitions(
      commit.parts.map((part) => part.contentHash),
      store,
      env,
    ),
    externalContentHash,
    // 受け付けたコミットなので, 形は確かめてある
    conforms: () => true,
    store,
    env,
  });
  const result = new Map(
    [...evaluated].flatMap((id) => {
      const content = contents.get(id);
      return content === undefined
        ? []
        : [[id, environmentContent(content)] as const];
    }),
  );
  evaluatedEnvironmentCache.set(commit.eventHash, result);
  return result;
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
 * プロジェクトのコミットの全モジュールのパーツ (中身は読まない).
 * ID は definy 製の `core.module-part-ids` で求める (src/part_ids.ts).
 * `name` は型エラーのメッセージに使うので `モジュール名.パーツ名` にする
 */
function commitParts(
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

/** プロジェクトごとの main ブランチの最新のコミット (キーはプロジェクト名). どれが最新かは definy の `core.project-branches` が決める */
async function loadLatestMainCommits(
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyMap<string, CachedCommit>> {
  const commits = await loadCommits(store, env);
  const byHash = new Map(commits.map((commit) => [commit.eventHash, commit]));
  const latest = new Map<string, CachedCommit>();
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
  const latestContentHashes = new Map(
    [...latestCommits.values()].flatMap((commit) =>
      commit.parts.map((part) => [part.partId, part.contentHash] as const),
    ),
  );
  for (const [projectName, commit] of latestCommits) {
    projectModuleIds.set(projectName, commit.moduleIds);
    // その場で評価できない定義 (ユーザーが作った定義のパーツの呼び出し) はコミットの中で評価する
    const evaluated = commit.parts.some(
      (ref) => contents.get(ref.contentHash) == null,
    )
      ? await evaluatedEnvironmentContents(
          commit,
          (id) => latestContentHashes.get(id),
          store,
          env,
        )
      : new Map<string, PartContent>();
    for (const ref of commit.parts) {
      const part = withContent(
        ref,
        contents.get(ref.contentHash) ?? evaluated.get(ref.partId) ?? null,
      );
      parts.set(part.partId, part);
      visibilityTargets.set(part.partId, { ...part, projectName });
    }
  }
  return { parts, projectModuleIds, visibilityTargets };
}

/**
 * `SubmitEvent` で受け取ったイベント (Base64) がプロジェクトのコミットなら, definy の `definy.check-commit` が検査に使うもの
 * (`definy.commit-check-input` の値) を読む (`read_commit_check_input`. docs/service.md).
 * コミットのパーツの中身は, 定義の式をそのコミットの中で評価して求める (評価できなければ `content` は `none`).
 * プロジェクトのコミット以外・署名や形式が不正なもの・CAS に足りない内容があるもの
 * (式を読めないので検査できない. `definy.submit-event` が先に `missing_content` を返す) は `null`
 */
export async function readCommitCheckInput(
  signedEventBase64: string,
  store: PartStoreReader & {
    readonly checkMissingHashes: (
      hashes: ReadonlyArray<string>,
      env?: Env,
    ) => Promise<ReadonlyArray<string>>;
  },
  env: Env | undefined,
): Promise<unknown> {
  let decoded: Awaited<ReturnType<typeof decodeVerifiedSignedEvent>>;
  try {
    decoded = await decodeVerifiedSignedEvent(base64ToBytes(signedEventBase64));
  } catch {
    return null;
  }
  if (decoded.content.type !== "project_commit") {
    return null;
  }
  const { commit } = decoded.content;
  if (
    (await store.checkMissingHashes(decoded.meta.referencedContentHashes, env))
      .length > 0
  ) {
    return null;
  }
  const refs = commitParts(commit.modules);
  const latest = await loadLatestParts(store, env);
  // 受け付けたコミットが参照している中身は, そのときに形を確かめてある
  const accepted = new Set(
    (await loadCommits(store, env)).flatMap((cached) =>
      cached.parts.map((part) => part.contentHash),
    ),
  );
  // 定義の式の評価と, 中身が core.part-content になるかは definy (definy.resolve-commit-contents) が見る.
  // CAS に預けた式は (イベントの形の検査を通らないので) ここで core.expression の形か確かめる
  const definitions = await readPartDefinitions(
    refs.map((part) => part.contentHash),
    store,
    env,
    (hash) => accepted.has(hash),
  );
  return {
    project_name: commit.projectName,
    parts: refs.map((part) => {
      const definition = definitions.get(part.contentHash);
      return {
        id: part.partId,
        name: part.name,
        module_name: part.moduleName,
        module_id: part.moduleId,
        module_visibility: variant(part.moduleVisibility),
        content_hash: part.contentHash,
        definition: definition === undefined ? none() : some(definition),
      };
    }),
    environment: visibilityTargetValues(latest.visibilityTargets),
    latest: latestPartsToModuleEntries(latest.parts.values()),
    project_module_ids: latest.projectModuleIds.get(commit.projectName) ?? [],
  };
}

/**
 * コミットの外のパーツ (各プロジェクトの `main` の最新) の定義の式を CAS から読む (`read_part_definitions`).
 * 評価器が参照するパーツの式を definy が求めるのに使う. 無いパーツは `undefined`
 */
export async function readExternalPartDefinitions(
  partIds: ReadonlyArray<string>,
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyArray<unknown>> {
  const latest = await loadLatestParts(store, env);
  const hashes = partIds.map((id) => latest.parts.get(id)?.contentHash);
  const definitions = await readPartDefinitions(
    hashes.filter((hash) => hash !== undefined),
    store,
    env,
  );
  return hashes.map((hash) =>
    hash === undefined ? undefined : definitions.get(hash),
  );
}

/**
 * 評価器 (`core.eval-value`) で評価した定義の値 (`core.value`) を, 形を definy 製の `core.value-conforms` で確かめて
 * `core.part-content` の値にする (`decode_part_contents`). 形が違えば `undefined`
 */
export function decodeEvaluatedPartContents(
  values: ReadonlyArray<unknown>,
): ReadonlyArray<unknown> {
  return values.map((coreValue) => {
    try {
      const value = coreValueToValue(coreValue);
      return conformsInDefiny(shapeCheckerModule, value, "core.part-content")
        ? encodePartContent(partContentFromValue(value))
        : undefined;
    } catch {
      return undefined;
    }
  });
}
