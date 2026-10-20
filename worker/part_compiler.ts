/**
 * ストアのモジュールコミットからパーツの式を集め, 自己記述コンパイラ (`wasm/stage1.wasm`) で
 * Cloudflare Workers にアップロードする `.wasm` バイナリにコンパイルする.
 *
 * Cloudflare Workers は実行時にバイト列から Wasm をコンパイルできないので, stage1 はバンドル時にコンパイル済みの
 * `WebAssembly.Module` として import する (`?module`. Vitest では `vitest.config.ts` のプラグインで同じ形にする).
 * seed のデプロイするパーツは `npm run build:seeds` で事前にコンパイルして seed バンドルの CAS に入れてあるので,
 * 入力 (式と参照パーツ) のハッシュ (`stage1OutputCacheKey`) で見つかればコンパイルを省く
 */
import stage1Module from "../wasm/stage1.wasm?module";
import {
  base64ToBytes,
  bytesToUrlSafeBase64NoPad,
  decodeCborItem,
  toUint8Array,
} from "../src/cbor.ts";
import {
  deployTargetExpression,
  stage1OutputCacheKey,
} from "../src/deploy_target.ts";
import { devSystemAccountBytes } from "../src/system_account.ts";
import { decodeVerifiedSignedEvent } from "../src/signed_event.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
  type Stage1ReferencedPart,
} from "../src/stage1_compiler.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "./cbor.ts";
import type { Env, EventItem, GetEventsRequest } from "./types.ts";

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

export type CompiledPartArtifact = {
  readonly wasmBytes: Uint8Array;
  readonly cloudflareWorkerName: string | null;
  readonly cloudflareToken: string | null;
};

/** パーツをコンパイルできなかった理由. `worker/index.ts` で Connect-RPC のエラーにする */
export class PartCompileError extends Error {
  override readonly name = "PartCompileError";
  constructor(
    readonly code: "invalid_argument" | "not_found" | "resource_exhausted",
    message: string,
  ) {
    super(message);
  }
}

const EVENTS_PAGE_SIZE = 500;

/** パーツ ID ごとの最新の定義. 式を持たないパーツは CAS の content hash を持つ */
type PartEntry = {
  readonly name: string;
  readonly timeMs: number;
  readonly expression: unknown;
  readonly contentHash: string | null;
};

function isWasmBinary(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x61 &&
    bytes[2] === 0x73 &&
    bytes[3] === 0x6d
  );
}

/** ストアの全モジュールコミットのうち署名の正しいものから, パーツ ID ごとに最新の定義を集める */
async function loadPartEntries(
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyMap<string, PartEntry>> {
  const entries = new Map<string, PartEntry>();
  for (let offset = 0; ; offset += EVENTS_PAGE_SIZE) {
    const page = await store.getEvents(
      { eventType: "module_commit", limit: EVENTS_PAGE_SIZE, offset },
      env,
    );
    for (const item of page) {
      // ストアには署名が不正なイベントもある (seed の署名が不正なサンプルなど) ので, 検証できたものだけ使う
      const decoded = await decodeVerifiedSignedEvent(
        base64ToBytes(item.signedEventBytes),
      ).catch(() => undefined);
      if (decoded === undefined) {
        continue;
      }
      const { accountIdBytes, content, meta } = decoded;
      const commit = content.ModuleCommit as
        | {
            readonly module_name?: unknown;
            readonly parts?: ReadonlyArray<Readonly<Record<string, unknown>>>;
          }
        | undefined;
      if (commit === undefined || typeof commit.module_name !== "string") {
        continue;
      }
      const moduleId = await deriveModuleIdBytes(
        accountIdBytes,
        commit.module_name,
      );
      for (const part of commit.parts ?? []) {
        if (typeof part.name !== "string") {
          continue;
        }
        const partId = await deriveModulePartId(moduleId, part.name);
        const existing = entries.get(partId);
        if (existing !== undefined && existing.timeMs >= meta.timeMs) {
          continue;
        }
        const hashBytes = toUint8Array(part.content_hash);
        entries.set(partId, {
          name: `${commit.module_name}.${part.name}`,
          timeMs: meta.timeMs,
          expression: part.expression ?? null,
          contentHash: hashBytes ? bytesToUrlSafeBase64NoPad(hashBytes) : null,
        });
      }
    }
    if (page.length < EVENTS_PAGE_SIZE) {
      return entries;
    }
  }
}

/** システムアカウントの公開鍵. 未設定なら seed と同じ開発用の鍵 */
async function systemAccountBytes(env: Env | undefined): Promise<Uint8Array> {
  const publicKey = env?.DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY?.trim();
  return publicKey ? base64ToBytes(publicKey) : await devSystemAccountBytes();
}

/**
 * `partId` をパーツ ID に解決する. `module.part` の形はシステムアカウントのモジュールのパーツとして扱う
 * (他のアカウントが同じ名前のモジュールを作っても乗っ取れないように)
 */
async function resolvePartId(
  partId: string,
  entries: ReadonlyMap<string, PartEntry>,
  env: Env | undefined,
): Promise<string | undefined> {
  if (entries.has(partId)) {
    return partId;
  }
  const dot = partId.indexOf(".");
  if (dot <= 0) {
    return undefined;
  }
  const moduleId = await deriveModuleIdBytes(
    await systemAccountBytes(env),
    partId.slice(0, dot),
  );
  const derived = await deriveModulePartId(moduleId, partId.slice(dot + 1));
  return entries.has(derived) ? derived : undefined;
}

/** パーツの式. 式を持たないパーツは CAS から CBOR を読む. 見つからなければ `undefined` */
async function partExpression(
  entry: PartEntry,
  store: PartStoreReader,
  env: Env | undefined,
): Promise<unknown> {
  if (entry.expression != null) {
    return entry.expression;
  }
  if (entry.contentHash === null) {
    return undefined;
  }
  const bytes = await store.getRawContentBytes(entry.contentHash, env);
  return bytes === undefined ? undefined : decodeCborItem(bytes)[0];
}

/**
 * 式が参照するパーツを集める. CAS にしか式が無いパーツは読み込んでから集め直す
 * (`collectReferencedParts` は同期なので, 読み込みが進まなくなるまで繰り返す)
 */
async function collectParts(
  expression: unknown,
  entries: ReadonlyMap<string, PartEntry>,
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyArray<Stage1ReferencedPart>> {
  const loaded = new Map<string, unknown>();
  for (;;) {
    const { parts, unresolved } = collectReferencedParts(expression, (id) => {
      const entry = entries.get(id);
      return loaded.get(id) ?? entry?.expression ?? undefined;
    });
    const loadable = unresolved.filter(
      (id) => !loaded.has(id) && entries.get(id)?.contentHash != null,
    );
    if (loadable.length === 0) {
      if (unresolved.length > 0) {
        throw new PartCompileError(
          "invalid_argument",
          `参照しているパーツが見つからないか, 式が無いか, コンパイラ組み込みのためコンパイルできません: ${unresolved
            .map((id) => entries.get(id)?.name ?? id)
            .join(", ")}`,
        );
      }
      return parts;
    }
    for (const id of loadable) {
      const entry = entries.get(id);
      loaded.set(
        id,
        entry === undefined ? null : await partExpression(entry, store, env),
      );
    }
  }
}

/**
 * `partId` (パーツ ID / システムアカウントの `module.part` / CAS の content hash) を
 * Cloudflare Workers にアップロードする `.wasm` バイナリにコンパイルする.
 * 式に `definy.deploy({ cloudflareWorkerName, cloudflareToken, handler })` があれば `handler` をコンパイルし,
 * worker 名とトークンも返す. 式が深すぎてスタックが足りないときは `resource_exhausted`
 */
export async function compilePartToWasm(
  partId: string,
  store: PartStoreReader,
  env?: Env,
): Promise<CompiledPartArtifact> {
  try {
    return await compilePart(partId, store, env);
  } catch (e) {
    if (e instanceof RangeError) {
      throw new PartCompileError(
        "resource_exhausted",
        `パーツ '${partId.trim()}' は深すぎてこのサーバーのスタックではコンパイルできません (${e.message})`,
      );
    }
    throw e;
  }
}

async function compilePart(
  partId: string,
  store: PartStoreReader,
  env?: Env,
): Promise<CompiledPartArtifact> {
  const trimmed = partId.trim();
  if (!trimmed) {
    throw new PartCompileError("invalid_argument", "partId is empty");
  }

  const directBytes = await store.getRawContentBytes(trimmed, env);
  if (directBytes && isWasmBinary(directBytes)) {
    return {
      wasmBytes: directBytes,
      cloudflareWorkerName: null,
      cloudflareToken: null,
    };
  }

  const entries = await loadPartEntries(store, env);
  const expression = await (async () => {
    if (directBytes) {
      return decodeCborItem(directBytes)[0];
    }
    const resolvedId = await resolvePartId(trimmed, entries, env);
    const entry =
      resolvedId === undefined ? undefined : entries.get(resolvedId);
    return entry === undefined
      ? undefined
      : await partExpression(entry, store, env);
  })();
  if (expression == null) {
    throw new PartCompileError(
      "not_found",
      `パーツ '${trimmed}' が見つからないか, 式がありません`,
    );
  }

  const { target, deploy } = deployTargetExpression(expression);
  const parts = await collectParts(target, entries, store, env);
  const cached = await store.getRawContentBytes(
    await stage1OutputCacheKey(target, parts),
    env,
  );
  const wasmBytes =
    cached !== undefined && isWasmBinary(cached)
      ? cached
      : createStage1Compiler(stage1Module).compile(target, parts);
  return {
    wasmBytes,
    cloudflareWorkerName: deploy?.cloudflareWorkerName ?? null,
    cloudflareToken: deploy?.cloudflareToken ?? null,
  };
}
