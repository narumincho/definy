/**
 * 手元の definy サーバー (`definy serve`) のリクエストの検査.
 * 127.0.0.1 で待ち受けていても, ブラウザで開いた他のサイトからのリクエスト (DNS rebinding や CSRF) は届くので,
 * Host と Origin を確かめ, `/mcp` には起動時のトークンを求める (docs/local-server.md)
 */

/** 受け付ける Host (`127.0.0.1:port` と `localhost:port`) */
export function allowedHosts(port: number): ReadonlySet<string> {
  return new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
}

/** 文字列を長さに関係なく同じ時間で比べる */
function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

function reject(status: number, message: string): Response {
  return new Response(JSON.stringify({ code: "forbidden", message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/**
 * 受け付けないリクエストならそのエラーのレスポンス, 受け付けるなら undefined
 * @param request 届いたリクエスト
 * @param options.port 待ち受けているポート
 * @param options.token `/mcp` の Authorization: Bearer に求めるトークン
 */
export function checkLocalRequest(
  request: Request,
  options: { readonly port: number; readonly token: string },
): Response | undefined {
  const hosts = allowedHosts(options.port);
  const host = request.headers.get("Host") ?? "";
  if (!hosts.has(host)) {
    return reject(403, `host ${JSON.stringify(host)} is not allowed`);
  }
  const origin = request.headers.get("Origin");
  if (origin !== null) {
    let originHost: string | undefined;
    try {
      const url = new URL(origin);
      originHost = url.protocol === "http:" ? url.host : undefined;
    } catch {
      originHost = undefined;
    }
    if (originHost === undefined || !hosts.has(originHost)) {
      return reject(403, `origin ${JSON.stringify(origin)} is not allowed`);
    }
  }
  const { pathname } = new URL(request.url);
  if (pathname === "/mcp" || pathname.startsWith("/mcp/")) {
    const authorization = request.headers.get("Authorization") ?? "";
    if (!timingSafeEqual(authorization, `Bearer ${options.token}`)) {
      return reject(401, "the Authorization header must be Bearer <token>");
    }
  }
  return undefined;
}
