import { compilePartToWasm } from "./http_stream.ts";
import {
  deployWorkerToCloudflare,
  listWorkersFromCloudflare,
} from "./cloudflare_api.ts";
import { defaultStore, WorkerStore } from "./store.ts";
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
  "/mcp",
  "/healthz",
  "/swagger-ui",
  "/api-docs/",
];

const CORS_HEADERS: Readonly<Record<string, string>> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
 * 環境変数 `DEFINY_ADMIN_ACCOUNT_ID`（または `DEFINY_ADMIN_ACCOUNT_IDS`）と照合し、
 * 要求元アカウントが管理者権限を持つか判定する。未設定時は全員拒否する。
 */
export function isAdminAccount(
  accountId: string | undefined | null,
  env: Env,
): boolean {
  if (!accountId) {
    return false;
  }
  const normalized = accountId.trim().toLowerCase();
  if (normalized.length === 0) {
    return false;
  }
  const adminEnv = env.DEFINY_ADMIN_ACCOUNT_ID ??
    env.DEFINY_ADMIN_ACCOUNT_IDS ?? "";
  const admins = adminEnv
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  return admins.includes(normalized);
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

function connectErrorResponse(
  code: string,
  message: string,
  status = 400,
): Response {
  return jsonResponse({ code, message }, status);
}

async function parseJsonRequest<T>(request: Request): Promise<T> {
  const text = await request.text();
  if (!text || text.trim().length === 0) {
    return {} as T;
  }
  return JSON.parse(text) as T;
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
    const rawHash = pathname.slice("/virtual/wasm/".length).replace(
      /\.wasm$/,
      "",
    );
    const bytes = await store.getRawContentBytes(rawHash, env);
    if (!bytes) {
      return new Response("Wasm binary not found in CAS", {
        status: 404,
        headers: CORS_HEADERS,
      });
    }
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return new Response(copy.buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/wasm",
        "Cache-Control": "public, max-age=31536000, immutable",
        ...CORS_HEADERS,
      },
    });
  }

  // Connect-RPC: EventService
  if (pathname === "/definy.v1.EventService/GetEvents") {
    const req = await parseJsonRequest<GetEventsRequest>(request);
    const events = await store.getEvents(req, env);
    return jsonResponse({ events });
  }

  if (pathname === "/definy.v1.EventService/GetEvent") {
    const req = await parseJsonRequest<GetEventRequest>(request);
    const hash = (req.eventHash ?? req.event_hash ?? "").trim();
    if (!hash) {
      return connectErrorResponse(
        "invalid_argument",
        "eventHash is required",
        400,
      );
    }
    const event = await store.getEvent(hash, env);
    if (!event) {
      return connectErrorResponse(
        "not_found",
        `Event '${hash}' not found`,
        404,
      );
    }
    return jsonResponse({ event });
  }

  if (pathname === "/definy.v1.EventService/SubmitEvent") {
    const req = await parseJsonRequest<SubmitEventRequest>(request);
    const rawEvent = req.signedEventBytes ?? req.signed_event_bytes ??
      req.event_binary;
    if (!rawEvent || rawEvent.trim().length === 0) {
      return connectErrorResponse(
        "invalid_argument",
        "signedEventBytes is required",
        400,
      );
    }
    const res = await store.submitEventWithStatus(
      rawEvent,
      "module_commit",
      env,
    );
    return jsonResponse(res);
  }

  if (pathname === "/definy.v1.EventService/CheckMissingHashes") {
    const req = await parseJsonRequest<CheckMissingHashesRequest>(request);
    const hashes = req.contentHashes ?? req.content_hashes ?? req.hashes ?? [];
    const missing = await store.checkMissingHashes(hashes, env);
    return jsonResponse({ missingContentHashes: missing });
  }

  if (pathname === "/definy.v1.EventService/UploadContent") {
    const req = await parseJsonRequest<UploadContentRequest>(request);
    const stored = await store.uploadContent(req.items ?? [], env);
    return jsonResponse({ storedContentHashes: stored });
  }

  if (pathname === "/definy.v1.EventService/GetContent") {
    const req = await parseJsonRequest<GetContentRequest>(request);
    const singleHash = req.contentHash ?? req.content_hash;
    if (singleHash) {
      const item = await store.getContentItem(singleHash.trim(), env);
      if (!item) {
        return connectErrorResponse(
          "not_found",
          `Content '${singleHash}' not found`,
          404,
        );
      }
      return jsonResponse({ item });
    }
    if (req.hashes) {
      const items = await store.getContentItems(req.hashes, env);
      return jsonResponse({ item: items[0], items });
    }
    return connectErrorResponse(
      "invalid_argument",
      "contentHash is required",
      400,
    );
  }

  // Connect-RPC: DeployService
  if (pathname === "/definy.v1.DeployService/DeployCloudflare") {
    try {
      const req = await parseJsonRequest<DeployCloudflareRequest>(request);
      const wasmHash = req.wasmHash ?? req.wasm_hash;
      const partId = req.partId ?? req.part_id;
      let wasmBytes: Uint8Array | undefined;
      let effectiveReq: DeployCloudflareRequest = req;
      let evaluatedResult: string | null = null;

      if (wasmHash && wasmHash.trim().length > 0) {
        wasmBytes = await store.getRawContentBytes(wasmHash.trim(), env);
        if (!wasmBytes) {
          return connectErrorResponse(
            "not_found",
            `Wasm content hash '${wasmHash}' not found in CAS`,
            404,
          );
        }
      } else if (partId && partId.trim().length > 0) {
        const compiled = await compilePartToWasm(partId.trim(), store, env);
        wasmBytes = compiled.wasmBytes;
        evaluatedResult = compiled.evaluatedResult ?? null;
        const hasScriptName = Boolean(
          (req.scriptName ?? req.script_name ?? req.worker_name ?? "").trim(),
        );
        const hasApiToken = Boolean(
          (req.apiToken ?? req.api_token ?? "").trim(),
        );
        effectiveReq = {
          ...req,
          scriptName: hasScriptName
            ? req.scriptName
            : (compiled.cloudflareWorkerName ?? req.scriptName),
          apiToken: hasApiToken
            ? req.apiToken
            : (compiled.cloudflareToken ?? req.apiToken),
        };
      }

      const res = await deployWorkerToCloudflare(
        effectiveReq,
        wasmBytes,
        env,
        fetchFn,
      );
      const finalRes = evaluatedResult && !res.evaluatedResult
        ? { ...res, evaluatedResult }
        : res;
      const nowIso = new Date().toISOString();
      await store.recordDeployment(
        {
          machineId: `cf-${finalRes.scriptName}`,
          status: finalRes.status,
          url: finalRes.url,
          appUrl: finalRes.url,
          region: "cloudflare-edge",
          createdAtRfc3339: nowIso,
          commitHash: req.commitHash ?? req.commit_hash ?? null,
          wasmHash: wasmHash ?? partId ?? null,
          provider: "cloudflare_workers",
        },
        env,
      );
      return jsonResponse(finalRes);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return connectErrorResponse("internal", message, 500);
    }
  }

  if (pathname === "/definy.v1.DeployService/ListDeployments") {
    const req = await parseJsonRequest<ListDeploymentsRequest>(request);
    const deployments = await store.listDeployments(req.limit, env);
    return jsonResponse({ deployments });
  }

  if (pathname === "/definy.v1.DeployService/ListCloudflareWorkers") {
    try {
      const req = await parseJsonRequest<ListCloudflareWorkersRequest>(request);
      const res = await listWorkersFromCloudflare(req, env, fetchFn);
      return jsonResponse(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return connectErrorResponse("internal", message, 500);
    }
  }

  if (isWorkerFirstPath(pathname)) {
    return connectErrorResponse(
      "unimplemented",
      `Endpoint ${pathname} is not implemented on Cloudflare Workers`,
      404,
    );
  }

  if (env.ASSETS) {
    return env.ASSETS.fetch(request);
  }

  return new Response("Not Found", { status: 404 });
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleWorkerRequest(request, env);
  },
};
