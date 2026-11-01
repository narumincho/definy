import serviceModule from "../wasm/service.wasm?module";
import {
  readCommitCheckInput,
  readExternalPartDefinitions,
} from "./type_check.ts";
import { loadCommitSummaries } from "./commit_store.ts";
import {
  handleRequestInDefiny,
  type HttpFetchRequest,
  type HttpHeader,
  type ServiceResult,
} from "./service_io.ts";
import { defaultStore, InvalidContentError, WorkerStore } from "./store.ts";
import { verifyRpcAuthorization } from "../src/rpc_auth.ts";
import { base64ToBytes, bytesToBase64 } from "../src/base64.ts";
import { sha256EventHashId } from "../src/sha256.ts";
import type { ContentItem, Env } from "./types.ts";

export type { Env } from "./types.ts";
export { defaultStore, WorkerStore } from "./store.ts";

type ConnectErrorCode = "invalid_argument" | "internal";

const CONNECT_ERROR_STATUS: Readonly<Record<ConnectErrorCode, number>> = {
  invalid_argument: 400,
  internal: 500,
};

/**
 * ホストの能力 (ストアなど) が例外を投げたときのレスポンス. 処理が決めるレスポンスではないので, CORS のヘッダーだけ付ける.
 * 中身が不正なもの (ストアが保存のときに見つける) は `invalid_argument`, それ以外は `internal`
 */
function hostErrorResponse(error: unknown): Response {
  const code: ConnectErrorCode =
    error instanceof InvalidContentError ? "invalid_argument" : "internal";
  return new Response(
    JSON.stringify({
      code,
      message: error instanceof Error ? error.message : String(error),
    }),
    {
      status: CONNECT_ERROR_STATUS[code],
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

/** リクエストの本文を JSON のオブジェクトとして読む (空なら `{}`) */
function parseJsonObject(
  text: string,
): { readonly json: unknown } | { readonly invalid: string } {
  if (text.trim().length === 0) {
    return { json: {} };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { invalid: "request body must be JSON" };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { invalid: "request body must be an object" };
  }
  return { json: parsed };
}

/** `hashes` の順に, 見つかった中身 (無ければ `undefined`) */
function contentsInOrder(
  hashes: ReadonlyArray<string>,
  items: ReadonlyArray<ContentItem>,
): ReadonlyArray<ContentItem | undefined> {
  const byHash = new Map(items.map((item) => [item.contentHash, item]));
  return hashes.map((hash) => byHash.get(hash));
}

/** Ed25519 の署名を確かめる (`verify_ed25519`). 公開鍵として読めなければ `false` */
async function verifyEd25519(
  publicKey: Uint8Array,
  signature: Uint8Array,
  message: Uint8Array,
): Promise<boolean> {
  try {
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      await crypto.subtle.importKey(
        "raw",
        publicKey as Uint8Array<ArrayBuffer>,
        { name: "Ed25519" },
        false,
        ["verify"],
      ),
      signature as Uint8Array<ArrayBuffer>,
      message as Uint8Array<ArrayBuffer>,
    );
  } catch {
    return false;
  }
}

/** definy の決めたレスポンスを HTTP のレスポンスにする */
function toResponse(
  result: Extract<ServiceResult, { readonly type: "respond" }>,
): Response {
  const headers = new Headers();
  for (const header of result.headers) {
    headers.append(header.name, header.value);
  }
  const { body } = result;
  return new Response(
    body.type === "empty"
      ? null
      : body.type === "text"
        ? body.text
        : body.type === "json"
          ? JSON.stringify(body.json)
          : (base64ToBytes(body.base64) as unknown as BodyInit),
    { status: result.status, headers },
  );
}

/**
 * Worker のリクエストハンドラー. どう処理するか (ルーティング, `/healthz`, RPC, `/virtual/wasm/`) は definy の
 * `definy.handle-request` (`wasm/service.wasm`) が決め, ここはストア・署名・HTTP などの能力を渡すだけ (docs/service.md).
 * テスト用にストアと fetch を差し替えられる. `serveAsset` は静的アセットを返す
 * (省くと `env.ASSETS`. Void の middleware はページの処理を渡す)
 */
export async function handleWorkerRequest(
  request: Request,
  env: Env,
  store: WorkerStore = defaultStore,
  fetchFn: typeof fetch = fetch,
  serveAsset: (() => Promise<Response>) | undefined = env.ASSETS
    ? () => env.ASSETS!.fetch(request)
    : undefined,
): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;
  const headers: HttpHeader[] = [];
  request.headers.forEach((value, name) => {
    headers.push({ name, value });
  });
  // 本文は definy が読むと決めたときに 1 度だけ読む (静的アセットのリクエストは読まない)
  let bodyText: Promise<string> | undefined;
  const readBody = () => (bodyText ??= request.text());
  let result: ServiceResult;
  try {
    result = await handleRequestInDefiny(
      serviceModule,
      {
        method: request.method,
        path: pathname,
        headers,
        storage: env.DB ? "cloudflare-d1" : "in-memory",
        hasAssets: serveAsset !== undefined,
      },
      {
        readCommits: () => loadCommitSummaries(store, env),
        readEvents: (hashes) =>
          Promise.all(hashes.map((hash) => store.getEvent(hash, env))),
        readEventsPage: (page) => store.getEvents(page, env),
        readContents: async (hashes) =>
          contentsInOrder(hashes, await store.getContentItems(hashes, env)),
        // definy はコミットのパーツの content hash を重複を除かずに渡す
        readMissingContentHashes: (hashes) =>
          store.checkMissingHashes([...new Set(hashes)], env),
        verifyEd25519,
        now: Date.now,
        // 型チェッカー
        readCommitCheckInput: (signedEventBytes) =>
          readCommitCheckInput(signedEventBytes, store, env),
        readPartDefinitions: (partIds) =>
          readExternalPartDefinitions(partIds, store, env),
        writeEvent: (event) => store.writeEvent(event, env),
        hashContents: (contentsBytes) =>
          Promise.all(
            contentsBytes.map(async (contentBytes) => {
              try {
                return await sha256EventHashId(base64ToBytes(contentBytes));
              } catch {
                return undefined;
              }
            }),
          ),
        writeContents: (items) => store.uploadContent(items, env),
        readAuthorization: async () => {
          try {
            const accountId = await verifyRpcAuthorization(
              request.headers.get("Authorization"),
              request.method,
              pathname,
              await readBody(),
            );
            return accountId === null
              ? { type: "anonymous" }
              : { type: "account", accountId };
          } catch (e) {
            return {
              type: "invalid",
              message: e instanceof Error ? e.message : String(e),
            };
          }
        },
        readAdminAccountIds: () => env.DEFINY_ADMIN_ACCOUNT_IDS ?? "",
        httpFetch: (fetchRequest) => httpFetch(fetchRequest, fetchFn),
        ensureSeeded: () => store.ensureSeeded(env, url.origin),
        readRequestJson: async () => parseJsonObject(await readBody()),
        readRawContent: async (key) => {
          const bytes = await store.getRawContentBytes(key, env);
          return bytes
            ? {
                contentHash: await sha256EventHashId(bytes),
                bytesBase64: bytesToBase64(new Uint8Array(bytes)),
              }
            : undefined;
        },
      },
    );
  } catch (e) {
    return hostErrorResponse(e);
  }
  if (result.type === "serve_asset") {
    if (serveAsset === undefined) {
      throw new Error("definy.handle-request served an asset without assets");
    }
    return serveAsset();
  }
  return toResponse(result);
}

/**
 * definy の `http_fetch` の HTTP リクエストを送る. どのリクエストを送るか (URL の検査, 送らないヘッダー) は
 * definy (`definy.http-proxy-send`) が決める. 送れなかったときは理由を返す
 */
async function httpFetch(
  request: HttpFetchRequest,
  fetchFn: typeof fetch,
): Promise<
  | {
      readonly status: number;
      readonly headers: ReadonlyArray<HttpHeader>;
      readonly bodyBase64: string;
    }
  | { readonly failed: string }
> {
  try {
    const headers = new Headers();
    for (const header of request.headers) {
      headers.append(header.name, header.value);
    }
    const response = await fetchFn(request.url, {
      method: request.method,
      headers,
      body: (request.bodyBase64 === null
        ? null
        : base64ToBytes(request.bodyBase64)) as unknown as BodyInit | null,
      redirect: "manual",
    });
    const responseHeaders: HttpHeader[] = [];
    response.headers.forEach((value, name) => {
      responseHeaders.push({ name, value });
    });
    return {
      status: response.status,
      headers: responseHeaders,
      bodyBase64: bytesToBase64(new Uint8Array(await response.arrayBuffer())),
    };
  } catch (e) {
    return { failed: e instanceof Error ? e.message : String(e) };
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleWorkerRequest(request, env);
  },
};
