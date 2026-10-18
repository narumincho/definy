import { defineMiddleware } from "void";
import { handleWorkerRequest, isWorkerFirstPath } from "../worker/index.ts";
import type { Env } from "../worker/types.ts";

export default defineMiddleware(async (c, next) => {
  const url = new URL(c.req.url);
  if (isWorkerFirstPath(url.pathname)) {
    return handleWorkerRequest(c.req.raw, c.env as unknown as Env);
  }
  await next();
  const res = c.res;
  const response = new Response(res.body, res);
  if (!response.headers.has("X-Content-Type-Options")) {
    response.headers.set("X-Content-Type-Options", "nosniff");
  }
  if (!response.headers.has("X-Frame-Options")) {
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
  }
  if (!response.headers.has("Referrer-Policy")) {
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }
  return response;
});
