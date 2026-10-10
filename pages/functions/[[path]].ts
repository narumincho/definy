interface Env {
  readonly DEFINY_SERVER_URL?: string;
}

interface EventContext {
  readonly request: Request;
  readonly env: Env;
  readonly params: {
    readonly path?: ReadonlyArray<string>;
  };
  readonly next: () => Promise<Response>;
}

const DEFAULT_SERVER_URL = "https://definy.fly.dev";

const PROXY_PREFIXES: ReadonlyArray<string> = [
  "/definy.v1.",
  "/preview/",
  "/virtual/",
  "/swagger-ui",
  "/api-docs/",
];

const PROXY_EXACT_PATHS: ReadonlySet<string> = new Set([
  "/mcp",
  "/healthz",
]);

/**
 * リクエストパスがバックエンドサーバー（Fly.io 等）へのプロキシ対象かどうかを判定する
 */
export function shouldProxyToBackend(pathname: string): boolean {
  if (PROXY_EXACT_PATHS.has(pathname)) {
    return true;
  }
  for (const prefix of PROXY_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * バックエンドサーバーへリクエストを透過プロキシする
 */
export async function proxyToBackend(
  request: Request,
  backendBaseUrl: string,
): Promise<Response> {
  const originalUrl = new URL(request.url);
  const targetBase = backendBaseUrl.replace(/\/+$/, "");
  const targetUrl = new URL(
    `${targetBase}${originalUrl.pathname}${originalUrl.search}`,
  );

  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", originalUrl.host);
  headers.set("x-forwarded-proto", originalUrl.protocol.replace(":", ""));

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    headers.set("x-forwarded-for", cfConnectingIp);
  }

  const isBodyAllowed = request.method !== "GET" && request.method !== "HEAD";
  const proxyRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers,
    body: isBodyAllowed ? request.body : undefined,
    redirect: "manual",
  });

  try {
    return await fetch(proxyRequest);
  } catch (error) {
    const isConnectRpc = originalUrl.pathname.startsWith("/definy.v1.");
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (isConnectRpc) {
      return new Response(
        JSON.stringify({
          code: "unavailable",
          message: `Backend service unavailable: ${errorMessage}`,
        }),
        {
          status: 503,
          headers: {
            "content-type": "application/json",
            "connect-protocol-version": "1",
          },
        },
      );
    }

    return new Response(
      `Bad Gateway: unable to reach backend server (${errorMessage})`,
      {
        status: 502,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      },
    );
  }
}

/**
 * Cloudflare Pages Functions のエントリポイント
 */
export async function onRequest(context: EventContext): Promise<Response> {
  const url = new URL(context.request.url);

  if (shouldProxyToBackend(url.pathname)) {
    const backendUrl = context.env.DEFINY_SERVER_URL || DEFAULT_SERVER_URL;
    return await proxyToBackend(context.request, backendUrl);
  }

  return await context.next();
}
