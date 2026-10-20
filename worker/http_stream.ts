/**
 * Cloudflare Worker (`definy`) 内で D1 / インメモリストアからイベントと CAS コンテンツを集めて
 * `definy-worker-runtime` に渡し、パーツを `.wasm` バイナリにコンパイルする。
 */
import {
  base64ToBytes,
  bytesToBase64,
  type DefinyRuntime,
  getDefinyRuntime,
} from "./definy_runtime.ts";
import type { Env } from "./types.ts";

export type PartStoreReader = {
  readonly getEvents: (
    req: { readonly eventType?: string; readonly limit?: number },
    env?: Env,
  ) => Promise<
    ReadonlyArray<{
      readonly eventHash: string;
      readonly signedEventBytes: string;
    }>
  >;
  readonly getRawContentBytes: (
    hash: string,
    env?: Env,
  ) => Promise<Uint8Array | undefined>;
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

/** ストアのモジュールコミットと、それが参照する CAS コンテンツをランタイムに読み込む */
async function loadStoreIntoRuntime(
  runtime: DefinyRuntime,
  store: PartStoreReader,
  env?: Env,
): Promise<void> {
  const commitEvents = await store.getEvents(
    { eventType: "module_commit", limit: 500 },
    env,
  );
  const newEvents = commitEvents.filter(
    (ev) => !runtime.loadedEventHashes.has(ev.eventHash),
  );
  if (newEvents.length > 0) {
    runtime.callOrThrow({
      op: "loadEvents",
      events: newEvents.map((ev) => ev.signedEventBytes),
    });
    for (const ev of newEvents) {
      runtime.loadedEventHashes.add(ev.eventHash);
    }
  }

  const missing = runtime.callOrThrow({ op: "missingContents" });
  if (missing.type === "missingContents" && missing.hashes.length > 0) {
    const contents: Record<string, string> = {};
    for (const hash of missing.hashes) {
      const bytes = await store.getRawContentBytes(hash, env);
      if (bytes) {
        contents[hash] = bytesToBase64(bytes);
      }
    }
    if (Object.keys(contents).length > 0) {
      runtime.callOrThrow({ op: "loadContents", contents });
    }
  }
}

export type CompiledPartArtifact = {
  readonly wasmBytes: Uint8Array;
  readonly cloudflareWorkerName: string | null;
  readonly cloudflareToken: string | null;
  readonly evaluatedResult: string | null;
};

/**
 * 指定された `partId`（パーツ ID / `module.part` / パーツ名 / CAS のハッシュ）を
 * Cloudflare Workers にアップロードする `.wasm` バイナリにコンパイルする。
 */
export async function compilePartToWasm(
  partId: string,
  store: PartStoreReader,
  env?: Env,
): Promise<CompiledPartArtifact> {
  const trimmed = partId.trim();
  if (!trimmed) {
    throw new Error("partId is empty");
  }
  const directBytes = await store.getRawContentBytes(trimmed, env);
  if (directBytes && isWasmBinary(directBytes)) {
    return {
      wasmBytes: directBytes,
      cloudflareWorkerName: null,
      cloudflareToken: null,
      evaluatedResult: null,
    };
  }
  const runtime = await getDefinyRuntime();
  await loadStoreIntoRuntime(runtime, store, env);
  if (directBytes) {
    runtime.call({
      op: "loadContents",
      contents: { [trimmed]: bytesToBase64(directBytes) },
    });
  }
  const res = runtime.callOrThrow({
    op: "compilePart",
    partId: trimmed,
  });
  if (res.type !== "compiledPart") {
    throw new Error(`unexpected runtime response: ${res.type}`);
  }
  return {
    wasmBytes: base64ToBytes(res.wasm),
    cloudflareWorkerName: res.cloudflareWorkerName ?? null,
    cloudflareToken: res.cloudflareToken ?? null,
    evaluatedResult: res.evaluatedResult ?? null,
  };
}

export { base64ToBytes };
