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
  return requestUrl.host || "definy.workers.dev";
}

/**
 * Host ヘッダーからプレビュー用サブドメインを抽出する
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
  const suffix = `.${cleanRoot}`;
  if (cleanHost.endsWith(suffix)) {
    const sub = cleanHost.slice(0, cleanHost.length - suffix.length);
    if (sub.length > 0 && !sub.includes(".")) {
      return sub;
    }
  }
  return undefined;
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

function renderPreviewResponse(
  app: PreviewAppItem,
  request: Request,
  subpath: string,
): Response {
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
    },
  });
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
    const app = store.getPreviewApp(subdomain);
    if (!app) {
      return new Response(`Preview app '${subdomain}' is not running`, {
        status: 404,
        headers: CORS_HEADERS,
      });
    }
    return renderPreviewResponse(app, request, pathname);
  }

  // Health check
  if (pathname === "/healthz") {
    return jsonResponse({ status: "ok", runtime: "cloudflare-workers" });
  }

  // Virtual Wasm CAS endpoint: /virtual/wasm/:hash
  if (pathname.startsWith("/virtual/wasm/")) {
    const rawHash = pathname.slice("/virtual/wasm/".length).replace(
      /\.wasm$/,
      "",
    );
    const bytes = store.getRawContentBytes(rawHash);
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
    const app = store.getPreviewApp(appId);
    if (!app) {
      return new Response(`Preview app '${appId}' is not running`, {
        status: 404,
        headers: CORS_HEADERS,
      });
    }
    return renderPreviewResponse(app, request, subpath);
  }

  // Connect-RPC: EventService
  if (pathname === "/definy.v1.EventService/GetEvents") {
    const req = await parseJsonRequest<GetEventsRequest>(request);
    const events = store.getEvents(req);
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
    const event = store.getEvent(hash);
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
    const eventHash = await store.submitEvent(rawEvent);
    return jsonResponse({
      eventHash,
      status: "accepted",
      missingContentHashes: [],
    });
  }

  if (pathname === "/definy.v1.EventService/CheckMissingHashes") {
    const req = await parseJsonRequest<CheckMissingHashesRequest>(request);
    const hashes = req.contentHashes ?? req.content_hashes ?? req.hashes ?? [];
    const missing = store.checkMissingHashes(hashes);
    return jsonResponse({ missingContentHashes: missing });
  }

  if (pathname === "/definy.v1.EventService/UploadContent") {
    const req = await parseJsonRequest<UploadContentRequest>(request);
    const stored = store.uploadContent(req.items ?? []);
    return jsonResponse({ storedContentHashes: stored });
  }

  if (pathname === "/definy.v1.EventService/GetContent") {
    const req = await parseJsonRequest<GetContentRequest>(request);
    const singleHash = req.contentHash ?? req.content_hash;
    if (singleHash) {
      const item = store.getContentItem(singleHash.trim());
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
      const items = store.getContentItems(req.hashes);
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
        wasmBytes = store.getRawContentBytes(wasmHash.trim());
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
      store.recordDeployment({
        machineId: `cf-${res.scriptName}`,
        status: res.status,
        url: res.url,
        appUrl: res.url,
        region: "cloudflare-edge",
        createdAtRfc3339: nowIso,
        commitHash: req.commitHash ?? req.commit_hash ?? null,
        wasmHash: wasmHash ?? null,
        provider: "cloudflare_workers",
      });
      return jsonResponse(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return connectErrorResponse("internal", message, 500);
    }
  }

  if (pathname === "/definy.v1.DeployService/ListDeployments") {
    const req = await parseJsonRequest<ListDeploymentsRequest>(request);
    const deployments = store.listDeployments(req.limit);
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
    const previewUrl = `${protocol}://${appId}.${rootDomain}`;
    const pathUrl = `${protocol}://${rootDomain}/preview/${appId}/`;
    const createdAtRfc3339 = new Date().toISOString();

    const item: PreviewAppItem = {
      appId,
      displayName: req.displayName ?? req.display_name ?? appId,
      partId: req.partId ?? req.part_id ?? "",
      ownerAccountId: accountId ?? "",
      previewUrl,
      pathUrl,
      status: "running",
      createdAtRfc3339,
      subdomain: appId,
    };
    store.registerPreviewApp(item);

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
    const apps = store.listPreviewApps(req.accountId ?? req.account_id);
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
    const success = store.stopPreviewApp(appId);
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
