import { InvalidSignedEventError, sha256EventHashId } from "./cbor.ts";
import { compilePartToWasm } from "./http_stream.ts";
import {
  deployWorkerToCloudflare,
  listWorkersFromCloudflare,
} from "./cloudflare_api.ts";
import { defaultStore, InvalidContentError, WorkerStore } from "./store.ts";
import { verifyRpcAuthorization } from "../src/rpc_auth.ts";
import type {
  CheckMissingHashesRequest,
  DeployCloudflareRequest,
  Env,
  GetContentRequest,
  GetEventRequest,
  GetEventsRequest,
  ListCloudflareWorkersRequest,
  ListDeploymentsRequest,
  SubmitEventRequest,
  UploadContentRequest,
} from "./types.ts";

export type { Env } from "./types.ts";
export { defaultStore, WorkerStore } from "./store.ts";

const WORKER_ROUTE_PREFIXES: ReadonlyArray<string> = [
  "/definy.v1.",
  "/virtual/",
  "/healthz",
];

const CORS_HEADERS: Readonly<Record<string, string>> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Connect-Protocol-Version, Connect-Timeout-Ms, Authorization",
};

/**
 * リクエストパスが Worker 内で直接処理する API / 動的エンドポイントかどうかを判定する
 */
export function isWorkerFirstPath(pathname: string): boolean {
  return WORKER_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

/**
 * 環境変数 `DEFINY_ADMIN_ACCOUNT_IDS`（カンマ・空白区切り）と照合し、
 * アカウントが管理者権限を持つか判定する。アカウント ID は Base64URL なので大文字小文字を区別する。
 * 未設定時は全員拒否する。
 */
export function isAdminAccount(
  accountId: string | undefined | null,
  env: Env,
): boolean {
  const normalized = accountId?.trim() ?? "";
  if (normalized.length === 0) {
    return false;
  }
  return (env.DEFINY_ADMIN_ACCOUNT_IDS ?? "")
    .split(/[,;\s]+/)
    .some((s) => s.length > 0 && s === normalized);
}

/**
 * ルートドメインを決定する
 */
export function getRootDomain(env: Env, requestUrl: URL): string {
  if (env.DEFINY_ROOT_DOMAIN && env.DEFINY_ROOT_DOMAIN.trim().length > 0) {
    return env.DEFINY_ROOT_DOMAIN.trim();
  }
  const hostname = requestUrl.hostname.toLowerCase();
  if (
    hostname === "definy.narumincho.com" ||
    hostname.endsWith("-definy.narumincho.com") ||
    hostname.endsWith(".definy.narumincho.com")
  ) {
    return "definy.narumincho.com";
  }
  return requestUrl.host || "definy.narumincho.com";
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
    },
  });
}

type ConnectErrorCode =
  | "invalid_argument"
  | "not_found"
  | "unauthenticated"
  | "permission_denied"
  | "unimplemented"
  | "internal";

const CONNECT_ERROR_STATUS: Readonly<Record<ConnectErrorCode, number>> = {
  invalid_argument: 400,
  unauthenticated: 401,
  permission_denied: 403,
  not_found: 404,
  unimplemented: 404,
  internal: 500,
};

/** Connect-RPC のエラーとしてクライアントに返す例外 */
class ConnectError extends Error {
  constructor(
    readonly code: ConnectErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function connectErrorResponse(error: ConnectError): Response {
  return jsonResponse(
    { code: error.code, message: error.message },
    CONNECT_ERROR_STATUS[error.code],
  );
}

function parseJsonBody<T>(text: string): T {
  if (text.trim().length === 0) {
    return {} as T;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ConnectError("invalid_argument", "request body must be JSON");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ConnectError(
      "invalid_argument",
      "request body must be an object",
    );
  }
  return parsed as T;
}

/**
 * `Authorization` ヘッダーの署名を検証し、管理者アカウントでなければ例外を投げる
 */
async function requireAdmin(
  request: Request,
  pathname: string,
  body: string,
  env: Env,
  reason: string,
): Promise<void> {
  let accountId: string | null;
  try {
    accountId = await verifyRpcAuthorization(
      request.headers.get("Authorization"),
      request.method,
      pathname,
      body,
    );
  } catch (e) {
    throw new ConnectError(
      "unauthenticated",
      e instanceof Error ? e.message : String(e),
    );
  }
  if (accountId === null) {
    throw new ConnectError(
      "unauthenticated",
      `${reason} requires an admin Authorization header`,
    );
  }
  if (!isAdminAccount(accountId, env)) {
    throw new ConnectError(
      "permission_denied",
      `${reason} is allowed only for admin accounts`,
    );
  }
}

/**
 * Worker リクエストハンドラー（テスト用にカスタム Store と Fetch 関数を注入可能）
 */
export async function handleWorkerRequest(
  request: Request,
  env: Env,
  store: WorkerStore = defaultStore,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const { pathname } = url;

  // Health check
  if (pathname === "/healthz") {
    return jsonResponse({
      status: "ok",
      runtime: "cloudflare-workers",
      storage: env.DB ? "cloudflare-d1" : "in-memory",
    });
  }

  // Static assets fallback (/healthz や静的アセット取得時には D1 シード処理を実行しない)
  if (!isWorkerFirstPath(pathname)) {
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not Found", { status: 404 });
  }

  await store.ensureSeeded(env, url.origin);

  // Virtual Wasm CAS endpoint: /virtual/wasm/:hash
  if (pathname.startsWith("/virtual/wasm/")) {
    return serveVirtualWasm(pathname, env, store, url.origin);
  }

  try {
    const body = await request.text();
    return await handleRpc(request, pathname, body, env, store, fetchFn);
  } catch (e) {
    if (e instanceof ConnectError) {
      return connectErrorResponse(e);
    }
    if (
      e instanceof InvalidSignedEventError ||
      e instanceof InvalidContentError
    ) {
      return connectErrorResponse(
        new ConnectError("invalid_argument", e.message),
      );
    }
    return connectErrorResponse(
      new ConnectError("internal", e instanceof Error ? e.message : String(e)),
    );
  }
}

async function serveVirtualWasm(
  pathname: string,
  env: Env,
  store: WorkerStore,
  origin: string,
): Promise<Response> {
  const rawHash = pathname
    .slice("/virtual/wasm/".length)
    .replace(/\.wasm$/, "");
  let bytes = await store.getRawContentBytes(rawHash, env);
  if (!bytes && rawHash === "stage1") {
    bytes = await store.getStage1WasmBytes(env, origin);
  }
  if (!bytes) {
    return new Response("Wasm binary not found in CAS", {
      status: 404,
      headers: CORS_HEADERS,
    });
  }
  // コンテンツハッシュで指定されたものだけ永続キャッシュする (`stage1` のような名前付きは更新されうる)
  const isContentAddressed = (await sha256EventHashId(bytes)) === rawHash;
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/wasm",
      "Cache-Control": isContentAddressed
        ? "public, max-age=31536000, immutable"
        : "public, max-age=0, must-revalidate",
      ...CORS_HEADERS,
    },
  });
}

async function handleRpc(
  request: Request,
  pathname: string,
  body: string,
  env: Env,
  store: WorkerStore,
  fetchFn: typeof fetch,
): Promise<Response> {
  switch (pathname) {
    case "/definy.v1.EventService/GetEvents": {
      const req = parseJsonBody<GetEventsRequest>(body);
      return jsonResponse({ events: await store.getEvents(req, env) });
    }

    case "/definy.v1.EventService/GetEvent": {
      const req = parseJsonBody<GetEventRequest>(body);
      const hash = req.eventHash?.trim() ?? "";
      if (!hash) {
        throw new ConnectError("invalid_argument", "eventHash is required");
      }
      const event = await store.getEvent(hash, env);
      if (!event) {
        throw new ConnectError("not_found", `Event '${hash}' not found`);
      }
      return jsonResponse({ event });
    }

    case "/definy.v1.EventService/SubmitEvent": {
      const req = parseJsonBody<SubmitEventRequest>(body);
      const rawEvent = req.signedEventBytes?.trim() ?? "";
      if (!rawEvent) {
        throw new ConnectError(
          "invalid_argument",
          "signedEventBytes is required",
        );
      }
      return jsonResponse(await store.submitEvent(rawEvent, env));
    }

    case "/definy.v1.EventService/CheckMissingHashes": {
      const req = parseJsonBody<CheckMissingHashesRequest>(body);
      const missing = await store.checkMissingHashes(
        req.contentHashes ?? [],
        env,
      );
      return jsonResponse({ missingContentHashes: missing });
    }

    case "/definy.v1.EventService/UploadContent": {
      const req = parseJsonBody<UploadContentRequest>(body);
      const stored = await store.uploadContent(req.items ?? [], env);
      return jsonResponse({ storedContentHashes: stored });
    }

    case "/definy.v1.EventService/GetContent": {
      const req = parseJsonBody<GetContentRequest>(body);
      const singleHash = req.contentHash?.trim();
      if (singleHash) {
        const item = await store.getContentItem(singleHash, env);
        if (!item) {
          throw new ConnectError(
            "not_found",
            `Content '${singleHash}' not found`,
          );
        }
        return jsonResponse({ item });
      }
      if (req.contentHashes) {
        const items = await store.getContentItems(req.contentHashes, env);
        return jsonResponse({ items });
      }
      throw new ConnectError(
        "invalid_argument",
        "contentHash or contentHashes is required",
      );
    }

    case "/definy.v1.DeployService/DeployCloudflare": {
      const req = parseJsonBody<DeployCloudflareRequest>(body);
      const usesServerToken = !req.apiToken?.trim();
      if (usesServerToken || req.seedD1) {
        await requireAdmin(
          request,
          pathname,
          body,
          env,
          usesServerToken ? "Deploying with the server token" : "seedD1",
        );
      }
      return jsonResponse(
        await deployCloudflare(req, usesServerToken, env, store, fetchFn),
      );
    }

    case "/definy.v1.DeployService/ListDeployments": {
      const req = parseJsonBody<ListDeploymentsRequest>(body);
      return jsonResponse({
        deployments: await store.listDeployments(req.limit, env),
      });
    }

    case "/definy.v1.DeployService/ListCloudflareWorkers": {
      const req = parseJsonBody<ListCloudflareWorkersRequest>(body);
      if (!req.apiToken?.trim()) {
        await requireAdmin(
          request,
          pathname,
          body,
          env,
          "Listing workers with the server token",
        );
      }
      return jsonResponse(await listWorkersFromCloudflare(req, env, fetchFn));
    }

    default:
      throw new ConnectError(
        "unimplemented",
        `Endpoint ${pathname} is not implemented`,
      );
  }
}

async function deployCloudflare(
  req: DeployCloudflareRequest,
  usesServerToken: boolean,
  env: Env,
  store: WorkerStore,
  fetchFn: typeof fetch,
) {
  if (req.seedD1 && env.DB) {
    await store.seedD1(env.DB);
  }
  const wasmHash = req.wasmHash?.trim();
  const partId = req.partId?.trim();
  let wasmBytes: Uint8Array | undefined;
  let effectiveReq: DeployCloudflareRequest = req;
  let evaluatedResult: string | null = null;

  if (wasmHash) {
    wasmBytes = await store.getRawContentBytes(wasmHash, env);
    if (!wasmBytes) {
      throw new ConnectError(
        "not_found",
        `Wasm content hash '${wasmHash}' not found in CAS`,
      );
    }
  } else if (partId) {
    const compiled = await compilePartToWasm(partId, store, env);
    wasmBytes = compiled.wasmBytes;
    evaluatedResult = compiled.evaluatedResult ?? null;
    effectiveReq = {
      ...req,
      scriptName: req.scriptName?.trim()
        ? req.scriptName
        : (compiled.cloudflareWorkerName ?? req.scriptName),
      // パーツが指定したトークンはサーバーのトークンを使える管理者のリクエストでのみ使う
      apiToken:
        usesServerToken && compiled.cloudflareToken
          ? compiled.cloudflareToken
          : req.apiToken,
    };
  }

  const res = await deployWorkerToCloudflare(
    effectiveReq,
    wasmBytes,
    env,
    fetchFn,
  );
  const finalRes =
    evaluatedResult && !res.evaluatedResult ? { ...res, evaluatedResult } : res;
  await store.recordDeployment(
    {
      machineId: `cf-${finalRes.scriptName}`,
      status: finalRes.status,
      url: finalRes.url,
      appUrl: finalRes.url,
      region: "cloudflare-edge",
      createdAtRfc3339: new Date().toISOString(),
      commitHash: req.commitHash ?? null,
      wasmHash: wasmHash ?? partId ?? null,
      provider: "cloudflare_workers",
    },
    env,
  );
  return finalRes;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleWorkerRequest(request, env);
  },
};
