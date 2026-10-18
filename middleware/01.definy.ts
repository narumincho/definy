import { defineMiddleware } from "void";
import { handleWorkerRequest, isWorkerFirstPath } from "../worker/index.ts";
import type { Env } from "../worker/types.ts";

export default defineMiddleware(async (c, next) => {
  const url = new URL(c.req.url);
  if (isWorkerFirstPath(url.pathname)) {
    return handleWorkerRequest(c.req.raw, c.env as unknown as Env);
  }
  return await next();
});
