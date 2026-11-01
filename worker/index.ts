import { InvalidSignedEventError } from "../src/signed_event.ts";
import { verifySubmittedEvent } from "./event_check.ts";
import serviceModule from "../wasm/service.wasm?module";
import {
  readCommitCheckInput,
  readExternalPartDefinitions,
} from "./type_check.ts";
import { loadCommitSummaries } from "./commit_store.ts";
import { handleRpcInDefiny } from "./service_io.ts";
import { defaultStore, InvalidContentError, WorkerStore } from "./store.ts";
import { verifyRpcAuthorization } from "../src/rpc_auth.ts";
import { base64ToBytes, bytesToBase64 } from "../src/base64.ts";
import { sha256EventHashId } from "../src/sha256.ts";
import type {
  ContentItem,
  Env,
  HttpProxyFetchRequest,
  HttpProxyFetchResponse,
  HttpProxyHeader,
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

/** カンマ・空白区切りのアカウント ID の一覧に含まれるか. アカウント ID は Base64URL なので大文字小文字を区別する */
function isListedAccount(
  accountId: string | undefined | null,
  list: string | undefined,
): boolean {
  const normalized = accountId?.trim() ?? "";
  if (normalized.length === 0) {
    return false;
  }
  return (list ?? "")
    .split(/[,;\s]+/)
    .some((s) => s.length > 0 && s === normalized);
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
  return isListedAccount(accountId, env.DEFINY_ADMIN_ACCOUNT_IDS);
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
  | "resource_exhausted"
  | "internal";

const CONNECT_ERROR_STATUS: Readonly<Record<ConnectErrorCode, number>> = {
  invalid_argument: 400,
  unauthenticated: 401,
  permission_denied: 403,
  not_found: 404,
  unimplemented: 404,
  resource_exhausted: 429,
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
 * `Authorization` ヘッダーの署名を検証し、`isAllowed` が許すアカウントでなければ例外を投げる
 */
async function requireAccount(
  request: Request,
  pathname: string,
  body: string,
  reason: string,
  isAllowed: (accountId: string) => boolean,
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
      `${reason} requires an Authorization header`,
    );
  }
  if (!isAllowed(accountId)) {
    throw new ConnectError(
      "permission_denied",
      `${reason} is not allowed for this account`,
    );
  }
}

export type ClientIpVersion = "ipv4" | "ipv6" | "unknown";

/**
 * Cloudflare が付ける接続元 IP ヘッダーから、クライアントが IPv4 / IPv6 のどちらで接続してきたかを判定する。
 * Pseudo IPv4 が有効なゾーンでは `CF-Connecting-IP` が IPv4 に書き換わり、元の IPv6 は `Cf-Connecting-IPv6` に入る。
 * ローカルの dev サーバーなどヘッダーが無い場合は `unknown`。
 */
export function clientIpVersion(request: Request): ClientIpVersion {
  if (request.headers.get("Cf-Connecting-IPv6")) {
    return "ipv6";
  }
  const ip = request.headers.get("CF-Connecting-IP") ?? "";
  if (ip.includes(":")) {
    return "ipv6";
  }
  if (ip.includes(".")) {
    return "ipv4";
  }
  return "unknown";
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
      // IP アドレスそのものは返さず、IPv4 / IPv6 のどちらかだけを返す
      ipVersion: clientIpVersion(request),
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
    return serveVirtualWasm(pathname, env, store);
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
): Promise<Response> {
  const rawHash = pathname
    .slice("/virtual/wasm/".length)
    .replace(/\.wasm$/, "");
  const bytes = await store.getRawContentBytes(rawHash, env);
  if (!bytes) {
    return new Response("Wasm binary not found in CAS", {
      status: 404,
      headers: CORS_HEADERS,
    });
  }
  // コンテンツハッシュで指定されたものだけ永続キャッシュする (名前付きのキーは更新されうる)
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

const EVENT_SERVICE_PREFIX = "/definy.v1.EventService/";

/** `hashes` の順に, 見つかった中身 (無ければ `undefined`) */
function contentsInOrder(
  hashes: ReadonlyArray<string>,
  items: ReadonlyArray<ContentItem>,
): ReadonlyArray<ContentItem | undefined> {
  const byHash = new Map(items.map((item) => [item.contentHash, item]));
  return hashes.map((hash) => byHash.get(hash));
}

async function handleRpc(
  request: Request,
  pathname: string,
  body: string,
  env: Env,
  store: WorkerStore,
  fetchFn: typeof fetch,
): Promise<Response> {
  // definy 製の処理 (`definy.handle-rpc`) があるメソッドはそれで処理する (docs/service.md)
  if (pathname.startsWith(EVENT_SERVICE_PREFIX)) {
    const response = await handleRpcInDefiny(
      serviceModule,
      pathname.slice(EVENT_SERVICE_PREFIX.length),
      () => parseJsonBody<unknown>(body),
      {
        readCommits: () => loadCommitSummaries(store, env),
        readEvents: (hashes) =>
          Promise.all(hashes.map((hash) => store.getEvent(hash, env))),
        readEventsPage: (page) => store.getEvents(page, env),
        readContents: async (hashes) =>
          contentsInOrder(hashes, await store.getContentItems(hashes, env)),
        readMissingContentHashes: (hashes) =>
          store.checkMissingHashes(hashes, env),
        // 署名と中身の形を確かめる. 規則 (core.check-event) は definy.submit-event の中で呼ぶ
        verifySignedEvent: verifySubmittedEvent,
        // 型チェッカー
        readCommitCheckInput: (signedEventBytes) =>
          readCommitCheckInput(signedEventBytes, store, env),
        readPartDefinitions: (partIds) =>
          readExternalPartDefinitions(partIds, store, env),
        writeEvent: async (signedEventBytes) =>
          (await store.submitEvent(signedEventBytes, env)).eventHash,
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
      },
    );
    if (response !== null) {
      return jsonResponse(response.body, response.status);
    }
  }
  switch (pathname) {
    case "/definy.v1.HttpProxyService/Fetch": {
      await requireAccount(
        request,
        pathname,
        body,
        "HttpProxyService/Fetch",
        (accountId) => isAdminAccount(accountId, env),
      );
      return jsonResponse(
        await proxyFetch(parseJsonBody<HttpProxyFetchRequest>(body), fetchFn),
      );
    }

    default:
      throw new ConnectError(
        "unimplemented",
        `Endpoint ${pathname} is not implemented`,
      );
  }
}

/** 仲介で送らないヘッダー (送り先とのつなぎ方は Worker の fetch が決める) */
const PROXY_DROPPED_REQUEST_HEADERS: ReadonlySet<string> = new Set([
  "host",
  "content-length",
  "connection",
  "transfer-encoding",
]);

/**
 * ブラウザから CORS で直接送れない HTTP リクエストを Worker から送り, レスポンスをそのまま返す.
 * 送れなかったときは `internal` のエラーにする
 */
async function proxyFetch(
  req: HttpProxyFetchRequest,
  fetchFn: typeof fetch,
): Promise<HttpProxyFetchResponse> {
  const rawUrl = req.url?.trim() ?? "";
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ConnectError("invalid_argument", `invalid url '${rawUrl}'`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ConnectError(
      "invalid_argument",
      "only http and https urls can be fetched",
    );
  }
  const method = (req.method?.trim() || "GET").toUpperCase();
  const headers = new Headers();
  for (const header of req.headers ?? []) {
    if (!PROXY_DROPPED_REQUEST_HEADERS.has(header.name.toLowerCase())) {
      headers.append(header.name, header.value);
    }
  }
  const body =
    method === "GET" || method === "HEAD" || !req.bodyBase64
      ? null
      : base64ToBytes(req.bodyBase64);
  const response = await fetchFn(url.toString(), {
    method,
    headers,
    body: body as unknown as BodyInit | null,
    redirect: "manual",
  });
  const responseHeaders: HttpProxyHeader[] = [];
  response.headers.forEach((value, name) => {
    responseHeaders.push({ name, value });
  });
  return {
    status: response.status,
    headers: responseHeaders,
    bodyBase64: bytesToBase64(new Uint8Array(await response.arrayBuffer())),
  };
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleWorkerRequest(request, env);
  },
};
