/**
 * `SubmitEvent` で受け取ったモジュールのコミットを definy 製の型チェッカーで検査する.
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
  encodeCborItem,
  sha256Bytes,
} from "../src/cbor.ts";
import { variant } from "../src/definy_value.ts";
import {
  checkModuleCommitParts,
  isTypePartType,
  outcomeErrorMessage,
  type LatestPart,
} from "../src/self_hosted_type_check.ts";
import { pickLatestCommitPerModule } from "../src/latest_commits.ts";
import {
  summarizeBranches,
  type ModuleBranchSummary,
} from "../src/branches.ts";
import {
  BUILTIN_PARAMETERS,
  compilerBuiltinName,
} from "../src/stage1_compiler.ts";
import { decodeVerifiedSignedEvent } from "../src/signed_event.ts";
import {
  MAIN_BRANCH,
  type CommitPart,
  type ModuleCommitContent,
} from "../src/event_content.ts";
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
  readonly getRawContentBytes: (
    hash: string,
    env?: Env,
  ) => Promise<Uint8Array | undefined>;
};

/** システムアカウントの公開鍵. 未設定なら seed と同じ開発用の鍵 */
async function systemAccountBytes(env: Env | undefined): Promise<Uint8Array> {
  const publicKey = env?.DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY?.trim();
  return publicKey ? base64ToBytes(publicKey) : await devSystemAccountBytes();
}

const EVENTS_PAGE_SIZE = 500;

/** 式を CAS に預けているパーツの content hash. 式を持っていれば `null` */
function partContentHash(part: CommitPart): string | null {
  return part.expression === null ? part.contentHash : null;
}

/** 式の CBOR の SHA-256 (URL-safe Base64, CAS の content hash と同じ). ネイティブの非同期 SHA-256 を使う */
async function expressionContentHashAsync(
  expression: unknown,
): Promise<string> {
  return bytesToUrlSafeBase64NoPad(
    await sha256Bytes(encodeCborItem(expression)),
  );
}

let builtinExpressionsPromise:
  Promise<ReadonlyMap<string, unknown>> | undefined;

/**
 * コンパイラ組み込みの式 (`{"#builtin": "plus"}` など) の content hash から式を引く表.
 * 型環境では組み込みのパーツの型を `builtin` にする (型チェッカーが呼び出しを名前で検査する) ので, パーツが組み込みかを知る必要がある.
 * CAS に預けた組み込みのパーツの式を読まなくても content hash で分かるようにする
 */
function builtinExpressionsByContentHash(): Promise<
  ReadonlyMap<string, unknown>
> {
  builtinExpressionsPromise ??= (async () =>
    new Map(
      await Promise.all(
        [
          ...BUILTIN_PARAMETERS.keys(),
          // 引数名の表に無い (definy 側でまだ扱っていない) 組み込み
          "let",
          "number_literal",
          "bit_and",
          "bit_or",
          "bit_xor",
          "shift_left",
          "shift_right",
        ].map(async (name): Promise<readonly [string, unknown]> => {
          const expression = variant("builtin", name);
          return [await expressionContentHashAsync(expression), expression];
        }),
      ),
    ))();
  return builtinExpressionsPromise;
}

/** モジュールのコミットのパーツを `LatestPart` にする (CAS に預けた式はまだ読まない. コンパイラ組み込みの式は埋める) */
async function commitParts(
  commit: ModuleCommitContent,
  moduleIdBytes: Uint8Array,
): Promise<
  ReadonlyArray<LatestPart & { readonly contentHash: string | null }>
> {
  const moduleId = bytesToUrlSafeBase64NoPad(moduleIdBytes);
  const parts = [];
  for (const part of commit.parts) {
    const contentHash = partContentHash(part);
    const expression =
      part.expression ??
      (contentHash === null
        ? null
        : ((await builtinExpressionsByContentHash()).get(contentHash) ?? null));
    parts.push({
      partId: await deriveModulePartId(moduleIdBytes, part.name),
      moduleId,
      name: part.name,
      partType: part.partType,
      expression,
      expressionKey:
        contentHash ??
        (expression === null
          ? null
          : await expressionContentHashAsync(expression)),
      contentHash,
    });
  }
  return parts;
}

type CachedCommit = {
  readonly eventHash: string;
  readonly accountId: string;
  readonly moduleId: string;
  readonly moduleName: string;
  readonly branch: string;
  readonly timeMs: number;
  /** 型環境に使う形のパーツ. 式は型パーツとコンパイラ組み込みのものだけ持つ (メモリを節約する) */
  readonly parts: ReadonlyArray<
    LatestPart & { readonly contentHash: string | null }
  >;
};

/**
 * イベントハッシュごとの, 署名を検証してデコードしたモジュールコミット (モジュールコミットでなければ `null`).
 * イベントは変わらないので isolate の中で使い回す (seed の core のコミットは数 MB あり, 毎回デコード・ハッシュすると重い)
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
  if (decoded?.content.type === "module_commit") {
    const { commit } = decoded.content;
    const moduleIdBytes = await deriveModuleIdBytes(commit.moduleName);
    result = {
      eventHash: item.eventHash,
      accountId: decoded.meta.accountId,
      moduleId: bytesToUrlSafeBase64NoPad(moduleIdBytes),
      moduleName: commit.moduleName,
      branch: commit.branch,
      timeMs: decoded.meta.timeMs,
      // 型パーツの宣言式と, コンパイラ組み込みの式 (小さい) だけ持つ
      parts: (await commitParts(commit, moduleIdBytes)).map((part) =>
        isTypePartType(part.partType) ||
        compilerBuiltinName(part.expression) !== undefined
          ? part
          : { ...part, expression: null },
      ),
    };
  }
  commitCache.set(item.eventHash, result);
  return result;
}

/** ストアの署名の正しいモジュールコミットすべて */
async function loadCommits(
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyArray<CachedCommit>> {
  const commits: Array<CachedCommit> = [];
  for (let offset = 0; ; offset += EVENTS_PAGE_SIZE) {
    const page = await store.getEvents(
      { eventType: "module_commit", limit: EVENTS_PAGE_SIZE, offset },
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

/** ストアの全モジュールの全ブランチ (`GetModuleBranches`). ブラウザはこれでモジュールの今の状態を知る (全イベントを読まなくてよい) */
export async function loadModuleBranchHeads(
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyArray<ModuleBranchSummary>> {
  return summarizeBranches(await loadCommits(store, env));
}

/** モジュールごとの main ブランチの最新のコミット (キーはモジュール ID) */
async function loadLatestMainCommits(
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyMap<string, CachedCommit>> {
  return pickLatestCommitPerModule(
    (await loadCommits(store, env)).filter(
      (commit) => commit.branch === MAIN_BRANCH,
    ),
  );
}

/** モジュール (`moduleIdBytes`) のブランチ (既定は main) の最新のコミットのイベントハッシュ. コミットが無ければ `null` */
export async function latestCommitHashOf(
  moduleIdBytes: Uint8Array,
  store: PartStoreReader,
  env: Env | undefined,
  branch: string = MAIN_BRANCH,
): Promise<string | null> {
  const moduleId = bytesToUrlSafeBase64NoPad(moduleIdBytes);
  return (
    latestOnBranch(
      (await loadCommits(store, env)).filter(
        (commit) => commit.moduleId === moduleId,
      ),
      branch,
    )?.eventHash ?? null
  );
}

function latestOnBranch(
  moduleCommits: ReadonlyArray<CachedCommit>,
  branch: string,
): CachedCommit | undefined {
  let latest: CachedCommit | undefined;
  for (const commit of moduleCommits) {
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
 * モジュール (`moduleIdBytes`) のブランチ `branch` に, アカウント `accountId` が `parentCommitHash` を親にしてコミットするときの,
 * ブランチの規則 (`core.check-event-branch`) が使う状態. ブランチの作成者はブランチの最初の (時刻が最小の) コミットのアカウント
 */
export async function branchStateOf(
  moduleIdBytes: Uint8Array,
  branch: string,
  accountId: string,
  parentCommitHash: string | null,
  store: PartStoreReader,
  env: Env | undefined,
): Promise<Omit<EventCheckState, "accountCreated">> {
  const moduleId = bytesToUrlSafeBase64NoPad(moduleIdBytes);
  const moduleCommits = (await loadCommits(store, env)).filter(
    (commit) => commit.moduleId === moduleId,
  );
  let first: CachedCommit | undefined;
  for (const commit of moduleCommits) {
    if (
      commit.branch === branch &&
      (first === undefined || commit.timeMs < first.timeMs)
    ) {
      first = commit;
    }
  }
  return {
    branchLatestCommitHash:
      latestOnBranch(moduleCommits, branch)?.eventHash ?? null,
    isBranchCreator: first?.accountId === accountId,
    moduleHasCommits: moduleCommits.length > 0,
    parentInModule:
      parentCommitHash !== null &&
      moduleCommits.some((commit) => commit.eventHash === parentCommitHash),
  };
}

/**
 * ストアの署名の正しいモジュールコミットから, モジュールごとに main ブランチの最新のコミットのパーツを集める (キーはパーツ ID).
 * 型パーツ以外の式は持たない. ブランチへのコミットも, 他のモジュールは main のパーツで検査する (docs/branch.md)
 */
async function loadLatestParts(
  store: PartStoreReader,
  env: Env | undefined,
): Promise<
  ReadonlyMap<string, LatestPart & { readonly contentHash: string | null }>
> {
  const latestCommits = await loadLatestMainCommits(store, env);
  const parts = new Map<
    string,
    LatestPart & { readonly contentHash: string | null }
  >();
  for (const commit of latestCommits.values()) {
    for (const part of commit.parts) {
      parts.set(part.partId, part);
    }
  }
  return parts;
}

/** CAS に預けた式を読んで埋める. 読めなければ `expression` は `null` のまま */
async function withExpression(
  part: LatestPart & { readonly contentHash: string | null },
  store: PartStoreReader,
  env: Env | undefined,
): Promise<LatestPart> {
  if (part.expression != null || part.contentHash === null) {
    return part;
  }
  const bytes = await store.getRawContentBytes(part.contentHash, env);
  return bytes === undefined
    ? part
    : { ...part, expression: decodeCborItem(bytes)[0] };
}

/**
 * `SubmitEvent` で受け取ったイベント (Base64) がモジュールのコミットなら型チェッカーで検査し,
 * 型エラーなどの理由を 1 パーツ 1 行で返す. 問題なければ空.
 * モジュールコミット以外・署名や形式が不正なもの (`submitEvent` が拒否する)・CAS に足りない内容があるもの
 * (式を読めないので検査できない. `submitEvent` が `missing_content` を返し, 内容を送ってから出し直してもらう) は検査しない
 */
export async function checkSubmittedModuleCommit(
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
  if (decoded.content.type !== "module_commit") {
    return [];
  }
  const { commit } = decoded.content;
  if (
    (await store.checkMissingHashes(decoded.meta.referencedContentHashes, env))
      .length > 0
  ) {
    return [];
  }
  const moduleIdBytes = await deriveModuleIdBytes(commit.moduleName);
  const committed = await Promise.all(
    (await commitParts(commit, moduleIdBytes)).map((part) =>
      withExpression(part, store, env),
    ),
  );
  const latestParts = new Map<string, LatestPart>();
  for (const [partId, part] of await loadLatestParts(store, env)) {
    // 型環境で中身を使うのは型パーツの宣言式だけ
    latestParts.set(
      partId,
      isTypePartType(part.partType)
        ? await withExpression(part, store, env)
        : part,
    );
  }
  // コンパイラ組み込みのパーツを置けるのはシステムアカウントのモジュールだけ
  const allowBuiltinParts =
    bytesToUrlSafeBase64NoPad(decoded.accountIdBytes) ===
    bytesToUrlSafeBase64NoPad(await systemAccountBytes(env));
  return checkModuleCommitParts({
    typeChecker: typeCheckerModule,
    moduleId: bytesToUrlSafeBase64NoPad(moduleIdBytes),
    committed,
    latestParts,
    allowBuiltinParts,
  }).flatMap(({ name, outcome }) => {
    const message = outcomeErrorMessage(name, outcome);
    return message === null ? [] : [message];
  });
}
