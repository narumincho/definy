/**
 * プレビューアプリなど、HTTP サーバーとして動く definy のパーツを Worker で実行する。
 *
 * 式の評価は `definy-worker-runtime`（Rust の Wasm コンパイラ + wasmi）が行う。
 * ここでは D1 / インメモリストアからイベントと CAS コンテンツを集めてランタイムに渡し、
 * 結果を Web 標準の `Response`（本文は Pull 型の `ReadableStream`）にするだけ。
 */
import {
  base64ToBytes,
  bytesToBase64,
  type DefinyRuntime,
  getDefinyRuntime,
} from "./definy_runtime.ts";
import type { Env } from "./types.ts";

export interface PartStoreReader {
  getEvents(
    req: { readonly eventType?: string; readonly limit?: number },
    env?: Env,
  ): Promise<
    ReadonlyArray<{
      readonly eventHash: string;
      readonly signedEventBytes: string;
    }>
  >;
  getRawContentBytes(hash: string, env?: Env): Promise<Uint8Array | undefined>;
}

function isWasmBinary(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x61 &&
    bytes[2] === 0x73 && bytes[3] === 0x6d;
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
  const newEvents = commitEvents.filter((ev) =>
    !runtime.loadedEventHashes.has(ev.eventHash)
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

/**
 * 指定された `partId`（パーツ ID / `module.part` / パーツ名 / CAS のハッシュ）を
 * 純粋な HTTP リクエスト `{ method, url, headers, body }` に対して実行し、`Response` を返す。
 * ホスト側での URL パス・クエリの事前分割は行わず、利用者側の純粋関数 (`std.url-path` / `std.url-query`) に委ねる。
 */
export async function runPartAsHttpServer(
  partId: string,
  request: Request,
  store: PartStoreReader,
  env: Env | undefined,
  options: {
    readonly overrideUrl?: string;
    readonly appId: string;
    readonly extraHeaders: Readonly<Record<string, string>>;
  },
): Promise<Response | undefined> {
  const trimmed = partId.trim();
  if (!trimmed) {
    return undefined;
  }
  const runtime = await getDefinyRuntime();

  // CAS に Wasm バイナリまたは式 CBOR として直接登録されている場合
  const directBytes = await store.getRawContentBytes(trimmed, env);
  let started;
  if (directBytes && isWasmBinary(directBytes)) {
    started = runtime.callOrThrow({
      op: "httpStartWasm",
      wasm: bytesToBase64(directBytes),
    });
  } else {
    await loadStoreIntoRuntime(runtime, store, env);
    if (directBytes) {
      // 式 CBOR として読み込めれば、ハッシュで参照できるようにする（式でなければ無視）
      runtime.call({
        op: "loadContents",
        contents: { [trimmed]: bytesToBase64(directBytes) },
      });
    }
    const headers: Array<[string, string]> = [];
    request.headers.forEach((value, name) => {
      headers.push([name, value]);
    });
    const body = request.body && request.method !== "GET" &&
        request.method !== "HEAD"
      ? new Uint8Array(await request.clone().arrayBuffer())
      : new Uint8Array(0);
    started = runtime.call({
      op: "httpStart",
      partId: trimmed,
      method: request.method,
      url: options.overrideUrl ?? request.url,
      headers,
      body: bytesToBase64(body),
    });
  }
  if (started.type === "error") {
    // 登録されたパーツが見つからない場合は、呼び出し側の案内ページにフォールバックする
    if (started.message.startsWith("Part not found")) {
      return undefined;
    }
    throw new Error(started.message);
  }
  if (started.type !== "httpStarted") {
    throw new Error(`unexpected runtime response: ${started.type}`);
  }

  const responseHeaders = new Headers({
    "X-Definy-Preview-App": options.appId,
    ...options.extraHeaders,
  });
  for (const [name, value] of started.headers) {
    if (name.trim().length > 0) {
      responseHeaders.append(name.trim(), value);
    }
  }
  const status = started.status >= 100 && started.status <= 599
    ? started.status
    : 200;
  return new Response(runtime.bodyStream(started.handle), {
    status,
    headers: responseHeaders,
  });
}

export interface CompiledPartArtifact {
  readonly wasmBytes: Uint8Array;
  readonly cloudflareWorkerName?: string | null;
  readonly cloudflareToken?: string | null;
  readonly evaluatedResult?: string | null;
}

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
    return { wasmBytes: directBytes };
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
    cloudflareWorkerName: res.cloudflareWorkerName,
    cloudflareToken: res.cloudflareToken,
    evaluatedResult: res.evaluatedResult,
  };
}

export { base64ToBytes };
