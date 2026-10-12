import {
  definyValueToHttpResponse,
  evaluatePartForHttpRequest,
} from "./cbor_eval.ts";
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
  ListPreviewAppsRequest,
  PreviewAppItem,
  RegisterPreviewAppRequest,
  StopPreviewAppRequest,
  SubmitEventRequest,
  UploadContentRequest,
} from "./types.ts";

export type { Env } from "./types.ts";
export { defaultStore, WorkerStore } from "./store.ts";

const WORKER_ROUTE_PREFIXES: ReadonlyArray<string> = [
  "/definy.v1.",
  "/preview/",
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

/**
 * Host ヘッダーからプレビュー用サブドメインを抽出する。
 * `https://{sub}-definy.narumincho.com` のようなハイフン連結形式（1階層ワイルドカード SSL 用）と
 * `https://{sub}.definy.workers.dev` / `http://{sub}.localhost:8000` のドット区切り形式の両方に対応する。
 */
export function extractSubdomainFromHost(
  host: string,
  rootDomain: string,
): string | undefined {
  const cleanHost = host.split(":")[0].trim().toLowerCase();
  const cleanRoot = rootDomain.split(":")[0].trim().toLowerCase();
  if (!cleanHost || !cleanRoot || cleanHost === cleanRoot) {
    return undefined;
  }

  // 1. {sub}-{rootDomain} 形式 (例: my-app-definy.narumincho.com)
  const hyphenSuffix = `-${cleanRoot}`;
  if (cleanHost.endsWith(hyphenSuffix)) {
    const sub = cleanHost.slice(0, cleanHost.length - hyphenSuffix.length);
    if (sub.length > 0 && !sub.includes(".")) {
      return sub;
    }
  }

  // 2. {sub}.{rootDomain} 形式 (例: my-app.definy.workers.dev, my-app.localhost)
  const dotSuffix = `.${cleanRoot}`;
  if (cleanHost.endsWith(dotSuffix)) {
    const sub = cleanHost.slice(0, cleanHost.length - dotSuffix.length);
    if (sub.length > 0 && !sub.includes(".")) {
      return sub;
    }
  }

  return undefined;
}

/**
 * プレビューアプリのサブドメイン URL を構築する。
 * `definy.narumincho.com` のようなカスタムサブドメイン（2つ以上のドットを含み `.workers.dev` でない）では、
 * Cloudflare Universal SSL の1階層ワイルドカード（`*.narumincho.com`）でカバーできるよう
 * `https://{appId}-{rootDomain}`（例: `https://my-app-definy.narumincho.com`）を返す。
 */
export function buildPreviewUrl(appId: string, rootDomain: string): string {
  const protocol = rootDomain.startsWith("localhost") ||
      rootDomain.includes("127.0.0.1")
    ? "http"
    : "https";
  const cleanRoot = rootDomain.split(":")[0].trim().toLowerCase();
  const useHyphenSubdomain = !cleanRoot.endsWith(".workers.dev") &&
    cleanRoot.split(".").length >= 3;
  return useHyphenSubdomain
    ? `${protocol}://${appId}-${rootDomain}`
    : `${protocol}://${appId}.${rootDomain}`;
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

async function renderPreviewResponse(
  app: PreviewAppItem,
  request: Request,
  subpath: string,
  store: WorkerStore,
  env: Env,
  isSameOriginPathFallback = false,
): Promise<Response> {
  const extraSecurityHeaders: Record<string, string> = isSameOriginPathFallback
    ? { "Content-Security-Policy": "sandbox allow-scripts allow-forms" }
    : {};

  if (app.partId && app.partId.trim().length > 0) {
    try {
      const effectiveUrl = new URL(request.url);
      effectiveUrl.pathname = subpath;
      const evaluated = await evaluatePartForHttpRequest(
        app.partId.trim(),
        request,
        store,
        env,
        effectiveUrl.toString(),
      );
      if (evaluated !== undefined) {
        return definyValueToHttpResponse(evaluated, app.appId, {
          ...CORS_HEADERS,
          ...extraSecurityHeaders,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(
        `Error evaluating part '${app.partId}' for app '${app.appId}': ${msg}`,
        {
          status: 500,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Definy-Preview-App": app.appId,
            ...CORS_HEADERS,
            ...extraSecurityHeaders,
          },
        },
      );
    }
  }

  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("application/json")) {
    return new Response(
      JSON.stringify({
        appId: app.appId,
        displayName: app.displayName,
        partId: app.partId,
        status: app.status,
        path: subpath,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Definy-Preview-App": app.appId,
          ...CORS_HEADERS,
          ...extraSecurityHeaders,
        },
      },
    );
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${app.displayName} - definy preview</title>
</head>
<body>
  <main data-preview-app="${app.appId}">
    <h1>${app.displayName}</h1>
    <p>App ID: ${app.appId}</p>
    <p>Part ID: ${app.partId}</p>
    <p>Path: ${subpath}</p>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Definy-Preview-App": app.appId,
      ...CORS_HEADERS,
      ...extraSecurityHeaders,
    },
  });
}

async function resolvePreviewAppOrDefault(
  appId: string,
  rootDomain: string,
  store: WorkerStore,
  env: Env,
): Promise<PreviewAppItem | undefined> {
  const existing = await store.getPreviewApp(appId, env);
  if (existing) {
    return existing;
  }
  if (appId === "self-definy") {
    const protocol = rootDomain.startsWith("localhost") ||
        rootDomain.includes("127.0.0.1")
      ? "http"
      : "https";
    return {
      appId: "self-definy",
      displayName: "Self-Hosted definy Studio (definy in definy)",
      partId: "sample.self-hosted-definy-server",
      ownerAccountId: "system",
      previewUrl: buildPreviewUrl("self-definy", rootDomain),
      pathUrl: `${protocol}://${rootDomain}/preview/self-definy/`,
      status: "running",
      createdAtRfc3339: "2026-01-01T00:00:00Z",
      subdomain: "self-definy",
    };
  }
  return undefined;
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
  await store.ensureSeeded(env, url.origin);

  const { pathname } = url;

  // Subdomain preview routing
  const rootDomain = getRootDomain(env, url);
  const hostHeader = request.headers.get("host") ?? url.host;
  const subdomain = extractSubdomainFromHost(hostHeader, rootDomain);
  if (subdomain && !pathname.startsWith("/definy.v1.")) {
    const app = await resolvePreviewAppOrDefault(
      subdomain,
      rootDomain,
      store,
      env,
    );
    if (!app) {
      return new Response(`Preview app '${subdomain}' is not running`, {
        status: 404,
        headers: CORS_HEADERS,
      });
    }
    return renderPreviewResponse(app, request, pathname, store, env, false);
  }

  // Health check
  if (pathname === "/healthz") {
    return jsonResponse({
      status: "ok",
      runtime: "cloudflare-workers",
      storage: env.DB ? "cloudflare-d1" : "in-memory",
    });
  }

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

  // Path-based preview endpoint: /preview/:app_id or /preview/:app_id/*
  if (pathname.startsWith("/preview/")) {
    const rest = pathname.slice("/preview/".length);
    const slashIdx = rest.indexOf("/");
    const appId = (slashIdx === -1 ? rest : rest.slice(0, slashIdx)).trim();
    const subpath = slashIdx === -1 ? "/" : rest.slice(slashIdx);
    const app = await resolvePreviewAppOrDefault(appId, rootDomain, store, env);
    if (!app) {
      return new Response(`Preview app '${appId}' is not running`, {
        status: 404,
        headers: CORS_HEADERS,
      });
    }
    return renderPreviewResponse(app, request, subpath, store, env, true);
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
      let wasmBytes: Uint8Array | undefined;
      if (wasmHash && wasmHash.trim().length > 0) {
        wasmBytes = await store.getRawContentBytes(wasmHash.trim(), env);
        if (!wasmBytes) {
          return connectErrorResponse(
            "not_found",
            `Wasm content hash '${wasmHash}' not found in CAS`,
            404,
          );
        }
      }
      const res = await deployWorkerToCloudflare(
        req,
        wasmBytes,
        env,
        fetchFn,
      );
      const nowIso = new Date().toISOString();
      await store.recordDeployment(
        {
          machineId: `cf-${res.scriptName}`,
          status: res.status,
          url: res.url,
          appUrl: res.url,
          region: "cloudflare-edge",
          createdAtRfc3339: nowIso,
          commitHash: req.commitHash ?? req.commit_hash ?? null,
          wasmHash: wasmHash ?? null,
          provider: "cloudflare_workers",
        },
        env,
      );
      return jsonResponse(res);
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

  // Connect-RPC: PreviewService
  if (pathname === "/definy.v1.PreviewService/RegisterPreviewApp") {
    const req = await parseJsonRequest<RegisterPreviewAppRequest>(request);
    const accountId = req.accountId ?? req.account_id;
    if (!isAdminAccount(accountId, env)) {
      return connectErrorResponse(
        "permission_denied",
        "Only administrator accounts configured in DEFINY_ADMIN_ACCOUNT_ID are allowed to register preview apps",
        403,
      );
    }
    const appId = (req.appId ?? req.app_id ?? "").trim().toLowerCase();
    if (!appId) {
      return connectErrorResponse(
        "invalid_argument",
        "appId is required",
        400,
      );
    }
    const protocol = rootDomain.startsWith("localhost") ||
        rootDomain.includes("127.0.0.1")
      ? "http"
      : "https";
    const previewUrl = buildPreviewUrl(appId, rootDomain);
    const pathUrl = `${protocol}://${rootDomain}/preview/${appId}/`;
    const createdAtRfc3339 = new Date().toISOString();
    const resolvedPartId =
      (req.partId ?? req.part_id ?? req.wasmHash ?? req.wasm_hash ?? "").trim();

    const item: PreviewAppItem = {
      appId,
      displayName: req.displayName ?? req.display_name ?? appId,
      partId: resolvedPartId,
      ownerAccountId: accountId ?? "",
      previewUrl,
      pathUrl,
      status: "running",
      createdAtRfc3339,
      subdomain: appId,
    };
    await store.registerPreviewApp(item, env);

    return jsonResponse({
      appId: item.appId,
      previewUrl: item.previewUrl,
      pathUrl: item.pathUrl,
      status: item.status,
      subdomain: item.subdomain,
    });
  }

  if (pathname === "/definy.v1.PreviewService/ListPreviewApps") {
    const req = await parseJsonRequest<ListPreviewAppsRequest>(request);
    const apps = await store.listPreviewApps(
      req.accountId ?? req.account_id,
      env,
    );
    return jsonResponse({ apps });
  }

  if (pathname === "/definy.v1.PreviewService/StopPreviewApp") {
    const req = await parseJsonRequest<StopPreviewAppRequest>(request);
    const accountId = req.accountId ?? req.account_id;
    if (!isAdminAccount(accountId, env)) {
      return connectErrorResponse(
        "permission_denied",
        "Only administrator accounts configured in DEFINY_ADMIN_ACCOUNT_ID are allowed to stop preview apps",
        403,
      );
    }
    const appId = (req.appId ?? req.app_id ?? "").trim().toLowerCase();
    const success = await store.stopPreviewApp(appId, env);
    return jsonResponse({
      success,
      message: success
        ? `Preview app '${appId}' stopped`
        : `Preview app '${appId}' not found`,
    });
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
