import type {
  CloudflareWorkerItem,
  DeployCloudflareRequest,
  DeployCloudflareResponse,
  Env,
  ListCloudflareWorkersRequest,
  ListCloudflareWorkersResponse,
} from "./types.ts";

const DEFAULT_API_BASE_URL = "https://api.cloudflare.com/client/v4";

type CloudflareApiErrorItem = {
  readonly code: number;
  readonly message: string;
};

type CloudflareApiResponse<T> = {
  readonly success: boolean;
  readonly errors?: ReadonlyArray<CloudflareApiErrorItem>;
  readonly result?: T;
};

type CloudflareAccountItem = {
  readonly id: string;
  readonly name: string;
};

type CloudflareSubdomainItem = {
  readonly subdomain: string;
};

type CloudflareWorkerSummary = {
  readonly id: string;
  readonly created_on?: string;
  readonly modified_on?: string;
};

/**
 * デプロイ先の Cloudflare Worker で動作するエッジ ES Module スクリプトを生成する。
 * `wasmBytes` がある場合は multipart の `app.wasm` (`application/wasm`) を ES Module として import し、
 * V8 のネイティブ WebAssembly ランタイムで実行する。
 */
export function buildDefaultWorkerScript(wasmBytes?: Uint8Array): string {
  const hasWasm = Boolean(wasmBytes && wasmBytes.byteLength > 0);
  if (!hasWasm) {
    return `export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/healthz") {
      return new Response(JSON.stringify({ status: "ok", runtime: "cloudflare-workers", has_wasm: false }), {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
    return new Response(
      JSON.stringify({
        service: "definy-cloudflare-workers",
        message: "Hello from Definy on Cloudflare Workers!",
        evaluatedResult: null,
        pathname: url.pathname,
        has_wasm: false,
      }),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  },
};
`;
  }

  return `import wasmModule from "./app.wasm";

function readDefinyValue(mem, ptr) {
  if (ptr < 0 || ptr >= mem.length) return null;
  const view = new DataView(mem.buffer, mem.byteOffset, mem.byteLength);
  const tag = mem[ptr];
  if (tag === 0) {
    return Number(view.getBigInt64(ptr + 8, true));
  }
  if (tag === 1) {
    return mem[ptr + 8] !== 0;
  }
  if (tag === 2) {
    const len = view.getUint32(ptr + 4, true);
    return new TextDecoder().decode(mem.subarray(ptr + 8, ptr + 8 + len));
  }
  if (tag === 3) {
    const count = view.getUint32(ptr + 4, true);
    const items = [];
    for (let i = 0; i < count; i++) {
      const elemPtr = view.getUint32(ptr + 8 + i * 4, true);
      items.push(readDefinyValue(mem, elemPtr));
    }
    return items;
  }
  if (tag === 4) {
    const count = view.getUint32(ptr + 4, true);
    const obj = { __ptr: ptr };
    for (let i = 0; i < count; i++) {
      const itemBase = ptr + 8 + i * 8;
      const keyPtr = view.getUint32(itemBase, true);
      const valPtr = view.getUint32(itemBase + 4, true);
      const keyStr = readDefinyValue(mem, keyPtr);
      if (typeof keyStr === "string") {
        obj[keyStr] = readDefinyValue(mem, valPtr);
      }
    }
    return obj;
  }
  if (tag === 5) {
    return {
      __closure: true,
      tableIdx: view.getUint32(ptr + 4, true),
      envPtr: view.getInt32(ptr + 8, true),
    };
  }
  if (tag === 6) {
    const tagPtr = view.getUint32(ptr + 4, true);
    const payloadPtr = view.getUint32(ptr + 8, true);
    const tagName = readDefinyValue(mem, tagPtr);
    const payloadVal = payloadPtr !== 0 ? readDefinyValue(mem, payloadPtr) : null;
    return { tag: tagName, payload: payloadVal };
  }
  return null;
}

function readRecordFieldPtr(mem, recordPtr, targetKey) {
  if (recordPtr < 0 || recordPtr >= mem.length || mem[recordPtr] !== 4) return null;
  const view = new DataView(mem.buffer, mem.byteOffset, mem.byteLength);
  const count = view.getUint32(recordPtr + 4, true);
  for (let i = 0; i < count; i++) {
    const itemBase = recordPtr + 8 + i * 8;
    const keyPtr = view.getUint32(itemBase, true);
    const valPtr = view.getUint32(itemBase + 4, true);
    if (readDefinyValue(mem, keyPtr) === targetKey) {
      return valPtr;
    }
  }
  return null;
}

function createMemoryAllocator(exports) {
  if (typeof exports.alloc === "function") {
    return (size) => exports.alloc((size + 7) & ~7);
  }
  const basePage = exports.memory.grow(16);
  let bump = (basePage + 15) * 65536;
  return (size) => {
    const aligned = (size + 7) & ~7;
    const ptr = bump;
    bump += aligned;
    return ptr;
  };
}

function writeHttpRequestToMemory(exports, alloc, request, bodyBytes) {
  const writeNumber = (n) => {
    const ptr = alloc(16);
    const mem = new Uint8Array(exports.memory.buffer);
    const view = new DataView(mem.buffer, mem.byteOffset, mem.byteLength);
    mem[ptr] = 0;
    view.setBigInt64(ptr + 8, BigInt(n), true);
    return ptr;
  };
  const writeString = (s) => {
    const bytes = new TextEncoder().encode(s);
    const ptr = alloc(8 + bytes.length);
    const mem = new Uint8Array(exports.memory.buffer);
    const view = new DataView(mem.buffer, mem.byteOffset, mem.byteLength);
    mem[ptr] = 2;
    view.setUint32(ptr + 4, bytes.length, true);
    mem.set(bytes, ptr + 8);
    return ptr;
  };
  const writeList = (ptrs) => {
    const ptr = alloc(8 + ptrs.length * 4);
    const mem = new Uint8Array(exports.memory.buffer);
    const view = new DataView(mem.buffer, mem.byteOffset, mem.byteLength);
    mem[ptr] = 3;
    view.setUint32(ptr + 4, ptrs.length, true);
    for (let i = 0; i < ptrs.length; i++) {
      view.setUint32(ptr + 8 + i * 4, ptrs[i], true);
    }
    return ptr;
  };
  const writeRecord = (entries) => {
    const ptr = alloc(8 + entries.length * 8);
    const mem = new Uint8Array(exports.memory.buffer);
    const view = new DataView(mem.buffer, mem.byteOffset, mem.byteLength);
    mem[ptr] = 4;
    view.setUint32(ptr + 4, entries.length, true);
    for (let i = 0; i < entries.length; i++) {
      view.setUint32(ptr + 8 + i * 8, entries[i][0], true);
      view.setUint32(ptr + 8 + i * 8 + 4, entries[i][1], true);
    }
    return ptr;
  };
  const writeClosure = (tableIdx, envPtr) => {
    const ptr = alloc(16);
    const mem = new Uint8Array(exports.memory.buffer);
    const view = new DataView(mem.buffer, mem.byteOffset, mem.byteLength);
    mem[ptr] = 5;
    view.setUint32(ptr + 4, tableIdx, true);
    view.setInt32(ptr + 8, envPtr, true);
    return ptr;
  };
  const writeVariant = (tagPtr, payloadPtr) => {
    const ptr = alloc(16);
    const mem = new Uint8Array(exports.memory.buffer);
    const view = new DataView(mem.buffer, mem.byteOffset, mem.byteLength);
    mem[ptr] = 6;
    view.setUint32(ptr + 4, tagPtr, true);
    view.setUint32(ptr + 8, payloadPtr, true);
    return ptr;
  };

  const headerPtrs = [];
  request.headers.forEach((value, name) => {
    headerPtrs.push(
      writeRecord([
        [writeString("name"), writeString(name)],
        [writeString("value"), writeString(value)],
      ])
    );
  });

  const rawBody = bodyBytes instanceof Uint8Array ? bodyBytes : new Uint8Array(0);
  const bytePtrs = new Array(rawBody.length);
  for (let i = 0; i < rawBody.length; i++) {
    bytePtrs[i] = writeNumber(rawBody[i]);
  }
  const bytesListPtr = writeList(bytePtrs);
  const bodyEntries = [
    [writeString("initialState"), writeNumber(0)],
    [writeString("bytes"), bytesListPtr],
    [writeString("text"), writeString(new TextDecoder().decode(rawBody))],
  ];

  const streamNextIdx =
    exports.stream_next_table_idx &&
    typeof exports.stream_next_table_idx.value === "number"
      ? exports.stream_next_table_idx.value
      : null;
  if (streamNextIdx !== null) {
    const donePtr = writeVariant(writeString("done"), 0);
    const step0Ptr =
      rawBody.length === 0
        ? donePtr
        : writeVariant(
            writeString("yield"),
            writeRecord([
              [writeString("chunk"), bytesListPtr],
              [writeString("nextState"), writeNumber(1)],
            ])
          );
    const envPtr = alloc(8);
    {
      const mem = new Uint8Array(exports.memory.buffer);
      const view = new DataView(mem.buffer, mem.byteOffset, mem.byteLength);
      view.setUint32(envPtr, step0Ptr, true);
      view.setUint32(envPtr + 4, donePtr, true);
    }
    bodyEntries.push([
      writeString("next"),
      writeClosure(streamNextIdx, envPtr),
    ]);
  }

  const bodyRecordPtr = writeRecord(bodyEntries);

  return writeRecord([
    [writeString("method"), writeString(request.method)],
    [writeString("url"), writeString(request.url)],
    [writeString("headers"), writeList(headerPtrs)],
    [writeString("body"), bodyRecordPtr],
  ]);
}

function createPullByteReadableStream(exports, alloc, bodyRecordPtr, nextClosure) {
  let statePtr = readRecordFieldPtr(
    new Uint8Array(exports.memory.buffer),
    bodyRecordPtr,
    "initialState"
  );
  const argsPtr = statePtr !== null ? alloc(8) : 0;
  const nextFn = exports.table.get(nextClosure.tableIdx);
  let steps = 0;

  return new ReadableStream({
    pull(controller) {
      if (statePtr === null) {
        controller.close();
        return;
      }
      while (steps < 10000) {
        steps++;
        {
          const mem = new Uint8Array(exports.memory.buffer);
          const view = new DataView(mem.buffer, mem.byteOffset, mem.byteLength);
          view.setUint32(argsPtr, statePtr, true);
        }
        const stepPtr = nextFn(nextClosure.envPtr, argsPtr);
        const mem = new Uint8Array(exports.memory.buffer);
        if (stepPtr < 0 || stepPtr >= mem.length || mem[stepPtr] !== 6) {
          statePtr = null;
          controller.close();
          return;
        }
        const view = new DataView(mem.buffer, mem.byteOffset, mem.byteLength);
        const tagPtr = view.getUint32(stepPtr + 4, true);
        const payloadPtr = view.getUint32(stepPtr + 8, true);
        const tag = readDefinyValue(mem, tagPtr);
        if (tag === "done" || payloadPtr === 0) {
          statePtr = null;
          controller.close();
          return;
        }
        if (tag === "yield") {
          const chunkPtr = readRecordFieldPtr(mem, payloadPtr, "chunk");
          const nextStatePtr = readRecordFieldPtr(mem, payloadPtr, "nextState");
          statePtr = nextStatePtr;
          if (chunkPtr !== null) {
            const listVal = readDefinyValue(mem, chunkPtr);
            if (Array.isArray(listVal) && listVal.length > 0) {
              const bytes = new Uint8Array(listVal.map((n) => Number(n) & 0xff));
              controller.enqueue(bytes);
              return;
            }
          }
          if (statePtr === null) {
            controller.close();
            return;
          }
        } else {
          statePtr = null;
          controller.close();
          return;
        }
      }
      statePtr = null;
      controller.close();
    },
  });
}

function stripInternalFields(val) {
  if (!val || typeof val !== "object") return val;
  if (Array.isArray(val)) return val.map(stripInternalFields);
  const copy = {};
  for (const [k, v] of Object.entries(val)) {
    if (k !== "__ptr") copy[k] = stripInternalFields(v);
  }
  return copy;
}

async function evaluateWasmRequest(request) {
  const instantiated = await WebAssembly.instantiate(wasmModule, {
    env: {
      print: (v) => console.log("wasm log:", v),
    },
  });
  const instance = instantiated.instance ?? instantiated;
  const exports = instance.exports;
  const entry =
    typeof exports.evaluate === "function"
      ? exports.evaluate
      : typeof exports.main === "function"
      ? exports.main
      : null;
  if (!entry) {
    return { evalResult: null, httpResponse: null };
  }

  let rawPtr = entry();
  if (!exports.memory) {
    return { evalResult: Number(rawPtr), httpResponse: null };
  }

  const alloc = createMemoryAllocator(exports);
  let mem = new Uint8Array(exports.memory.buffer);
  if (rawPtr >= 0 && rawPtr < mem.length && mem[rawPtr] === 5 && exports.table) {
    const view = new DataView(mem.buffer, mem.byteOffset, mem.byteLength);
    const tableIdx = view.getUint32(rawPtr + 4, true);
    const envPtr = view.getInt32(rawPtr + 8, true);
    const bodyBytes =
      request.body && request.method !== "GET" && request.method !== "HEAD"
        ? new Uint8Array(await request.clone().arrayBuffer())
        : new Uint8Array(0);
    const reqPtr = writeHttpRequestToMemory(exports, alloc, request, bodyBytes);
    const argsPtr = alloc(8);
    mem = new Uint8Array(exports.memory.buffer);
    new DataView(mem.buffer, mem.byteOffset, mem.byteLength).setUint32(
      argsPtr,
      reqPtr,
      true
    );
    const fn = exports.table.get(tableIdx);
    rawPtr = fn(envPtr, argsPtr);
  }

  mem = new Uint8Array(exports.memory.buffer);
  const rawVal = readDefinyValue(mem, rawPtr) ?? rawPtr;

  if (
    rawVal &&
    typeof rawVal === "object" &&
    !Array.isArray(rawVal) &&
    typeof rawVal.status === "number" &&
    "body" in rawVal
  ) {
    const headers = new Headers({ "access-control-allow-origin": "*" });
    if (Array.isArray(rawVal.headers)) {
      for (const h of rawVal.headers) {
        if (h && typeof h.name === "string" && typeof h.value === "string") {
          headers.set(h.name, h.value);
        }
      }
    }
    let bodyPayload = "";
    if (typeof rawVal.body === "string") {
      bodyPayload = rawVal.body;
    } else if (
      rawVal.body &&
      typeof rawVal.body === "object" &&
      rawVal.body.next &&
      rawVal.body.next.__closure &&
      exports.table
    ) {
      const bodyRecordPtr = rawVal.body.__ptr;
      bodyPayload = createPullByteReadableStream(
        exports,
        alloc,
        bodyRecordPtr,
        rawVal.body.next
      );
    }
    return {
      evalResult: stripInternalFields(rawVal),
      httpResponse: new Response(bodyPayload, {
        status: rawVal.status,
        headers,
      }),
    };
  }

  return { evalResult: stripInternalFields(rawVal), httpResponse: null };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    try {
      const { evalResult, httpResponse } = await evaluateWasmRequest(request);
      if (httpResponse) {
        return httpResponse;
      }
      if (url.pathname === "/healthz") {
        return new Response(JSON.stringify({ status: "ok", runtime: "cloudflare-workers", has_wasm: true }), {
          headers: { "Content-Type": "application/json; charset=utf-8" },
        });
      }
      return new Response(
        JSON.stringify({
          service: "definy-cloudflare-workers",
          message: "Hello from Definy on Cloudflare Workers!",
          evaluatedResult: evalResult,
          pathname: url.pathname,
          has_wasm: true,
        }),
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    } catch (e) {
      return new Response(
        JSON.stringify({ error: String(e) }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }
  },
};
`;
}

async function resolveAccountId(
  apiToken: string,
  explicitAccountId: string | undefined | null,
  apiBaseUrl: string,
  fetchFn: typeof fetch,
): Promise<string> {
  if (explicitAccountId && explicitAccountId.trim().length > 0) {
    return explicitAccountId.trim();
  }
  const res = await fetchFn(`${apiBaseUrl}/accounts`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Cloudflare accounts API failed (status ${res.status}): ${text}`,
    );
  }
  const parsed = (await res.json()) as CloudflareApiResponse<
    ReadonlyArray<CloudflareAccountItem>
  >;
  const first = parsed.result?.[0];
  if (!first) {
    throw new Error("No Cloudflare accounts found for the provided API token");
  }
  return first.id;
}

async function getSubdomain(
  apiToken: string,
  accountId: string,
  apiBaseUrl: string,
  fetchFn: typeof fetch,
): Promise<string> {
  const res = await fetchFn(
    `${apiBaseUrl}/accounts/${accountId}/workers/subdomain`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    },
  );
  if (!res.ok) {
    return "workers.dev";
  }
  const parsed =
    (await res.json()) as CloudflareApiResponse<CloudflareSubdomainItem>;
  return parsed.result?.subdomain || "workers.dev";
}

/** Cloudflare Workers のスクリプト名として許可する形式 */
const WORKER_SCRIPT_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Cloudflare REST API v4 を呼び出して Worker スクリプトをデプロイする
 */
export async function deployWorkerToCloudflare(
  req: DeployCloudflareRequest,
  wasmBytes: Uint8Array | undefined,
  env: Env,
  fetchFn: typeof fetch = fetch,
  apiBaseUrl: string = DEFAULT_API_BASE_URL,
): Promise<DeployCloudflareResponse> {
  const apiToken = (req.apiToken || env.CLOUDFLARE_API_TOKEN || "").trim();
  if (!apiToken) {
    throw new Error(
      "CLOUDFLARE_API_TOKEN is not configured and apiToken was not provided",
    );
  }

  const accountId = await resolveAccountId(
    apiToken,
    req.accountId || env.CLOUDFLARE_ACCOUNT_ID,
    apiBaseUrl,
    fetchFn,
  );

  const randomSuffix = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, "0");
  const rawName = req.scriptName?.trim();
  const scriptName =
    rawName && rawName.length > 0 ? rawName : `definy-worker-${randomSuffix}`;
  if (!WORKER_SCRIPT_NAME_PATTERN.test(scriptName)) {
    throw new Error(
      `Invalid scriptName '${scriptName}': use 1-63 lowercase letters, digits and hyphens`,
    );
  }

  const customScript = req.customScript;
  const scriptContent =
    customScript && customScript.trim().length > 0
      ? customScript
      : buildDefaultWorkerScript(wasmBytes);
  const metadata = JSON.stringify({ main_module: "worker.js" });

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([metadata], { type: "application/json" }),
    "metadata.json",
  );
  form.append(
    "worker.js",
    new Blob([scriptContent], { type: "application/javascript+module" }),
    "worker.js",
  );
  if (wasmBytes && wasmBytes.byteLength > 0) {
    form.append(
      "app.wasm",
      new Blob([new Uint8Array(wasmBytes)], { type: "application/wasm" }),
      "app.wasm",
    );
  }

  const putRes = await fetchFn(
    `${apiBaseUrl}/accounts/${accountId}/workers/scripts/${scriptName}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: form,
    },
  );

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(
      `Cloudflare script upload failed (status ${putRes.status}): ${errText}`,
    );
  }

  // Enable workers.dev subdomain
  await fetchFn(
    `${apiBaseUrl}/accounts/${accountId}/workers/scripts/${scriptName}/subdomain`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled: true }),
    },
  ).catch(() => undefined);

  const subdomain = await getSubdomain(
    apiToken,
    accountId,
    apiBaseUrl,
    fetchFn,
  );
  const publicUrl =
    subdomain === "workers.dev"
      ? `https://${scriptName}.workers.dev`
      : `https://${scriptName}.${subdomain}.workers.dev`;

  return {
    scriptName,
    status: "succeeded",
    url: publicUrl,
    evaluatedResult: null,
  };
}

/**
 * Cloudflare REST API v4 を呼び出してアカウント内の Worker スクリプト一覧を取得する
 */
export async function listWorkersFromCloudflare(
  req: ListCloudflareWorkersRequest,
  env: Env,
  fetchFn: typeof fetch = fetch,
  apiBaseUrl: string = DEFAULT_API_BASE_URL,
): Promise<ListCloudflareWorkersResponse> {
  const apiToken = (req.apiToken || env.CLOUDFLARE_API_TOKEN || "").trim();
  if (!apiToken) {
    return { workers: [] };
  }

  const accountId = await resolveAccountId(
    apiToken,
    req.accountId || env.CLOUDFLARE_ACCOUNT_ID,
    apiBaseUrl,
    fetchFn,
  );

  const res = await fetchFn(
    `${apiBaseUrl}/accounts/${accountId}/workers/scripts`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    },
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Cloudflare list workers failed (status ${res.status}): ${errText}`,
    );
  }

  const parsed = (await res.json()) as CloudflareApiResponse<
    ReadonlyArray<CloudflareWorkerSummary>
  >;
  const summaries = parsed.result ?? [];

  const workers: ReadonlyArray<CloudflareWorkerItem> = summaries.map((w) => ({
    id: w.id,
    createdOn: w.created_on,
    modifiedOn: w.modified_on,
  }));

  return { workers };
}
