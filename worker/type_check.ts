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
  toUint8Array,
} from "../src/cbor.ts";
import {
  checkModuleCommitParts,
  expressionContentHash,
  outcomeErrorMessage,
  type LatestPart,
} from "../src/self_hosted_type_check.ts";
import { decodeVerifiedSignedEvent } from "../src/signed_event.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "./cbor.ts";
import { systemAccountBytes, type PartStoreReader } from "./part_compiler.ts";
import type { Env } from "./types.ts";

const EVENTS_PAGE_SIZE = 500;

type ModuleCommitContent = {
  readonly module_name?: unknown;
  readonly parts?: ReadonlyArray<Readonly<Record<string, unknown>>>;
};

/** 式を CAS に預けているパーツの content hash. 式を持っていれば `null` */
function partContentHash(
  part: Readonly<Record<string, unknown>>,
): string | null {
  if (part.expression != null) {
    return null;
  }
  const bytes = toUint8Array(part.content_hash);
  return bytes ? bytesToUrlSafeBase64NoPad(bytes) : null;
}

/** モジュールのコミットのパーツを `LatestPart` にする (CAS に預けた式はまだ読まない) */
async function commitParts(
  commit: ModuleCommitContent,
  moduleIdBytes: Uint8Array,
): Promise<
  ReadonlyArray<LatestPart & { readonly contentHash: string | null }>
> {
  const moduleId = bytesToUrlSafeBase64NoPad(moduleIdBytes);
  const parts = [];
  for (const part of commit.parts ?? []) {
    if (typeof part.name !== "string") {
      continue;
    }
    const contentHash = partContentHash(part);
    const expression = part.expression ?? null;
    parts.push({
      partId: await deriveModulePartId(moduleIdBytes, part.name),
      moduleId,
      name: part.name,
      partType: part.part_type ?? null,
      expression,
      expressionKey:
        contentHash ??
        (expression === null ? null : expressionContentHash(expression)),
      contentHash,
    });
  }
  return parts;
}

/**
 * ストアの署名の正しいモジュールコミットから, モジュールごとに最新のコミットのパーツを集める (キーはパーツ ID)
 */
async function loadLatestParts(
  store: PartStoreReader,
  env: Env | undefined,
): Promise<
  ReadonlyMap<string, LatestPart & { readonly contentHash: string | null }>
> {
  const latestCommits = new Map<
    string,
    {
      readonly timeMs: number;
      readonly moduleIdBytes: Uint8Array;
      readonly commit: ModuleCommitContent;
    }
  >();
  for (let offset = 0; ; offset += EVENTS_PAGE_SIZE) {
    const page = await store.getEvents(
      { eventType: "module_commit", limit: EVENTS_PAGE_SIZE, offset },
      env,
    );
    for (const item of page) {
      const decoded = await decodeVerifiedSignedEvent(
        base64ToBytes(item.signedEventBytes),
      ).catch(() => undefined);
      const commit = decoded?.content.ModuleCommit as
        ModuleCommitContent | undefined;
      if (
        decoded === undefined ||
        commit === undefined ||
        typeof commit.module_name !== "string"
      ) {
        continue;
      }
      const moduleIdBytes = await deriveModuleIdBytes(
        decoded.accountIdBytes,
        commit.module_name,
      );
      const moduleId = bytesToUrlSafeBase64NoPad(moduleIdBytes);
      const existing = latestCommits.get(moduleId);
      if (existing === undefined || existing.timeMs < decoded.meta.timeMs) {
        latestCommits.set(moduleId, {
          timeMs: decoded.meta.timeMs,
          moduleIdBytes,
          commit,
        });
      }
    }
    if (page.length < EVENTS_PAGE_SIZE) {
      break;
    }
  }
  const parts = new Map<
    string,
    LatestPart & { readonly contentHash: string | null }
  >();
  for (const { moduleIdBytes, commit } of latestCommits.values()) {
    for (const part of await commitParts(commit, moduleIdBytes)) {
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
  const commit = decoded.content.ModuleCommit as
    ModuleCommitContent | undefined;
  if (commit === undefined || typeof commit.module_name !== "string") {
    return [];
  }
  if (
    (await store.checkMissingHashes(decoded.meta.referencedContentHashes, env))
      .length > 0
  ) {
    return [];
  }
  const moduleIdBytes = await deriveModuleIdBytes(
    decoded.accountIdBytes,
    commit.module_name,
  );
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
      part.partType === "type" ? await withExpression(part, store, env) : part,
    );
  }
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
