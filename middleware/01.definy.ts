import { defineMiddleware } from "void";
import { defaultStore, handleWorkerRequest } from "../worker/index.ts";
import type { Env } from "../worker/types.ts";
import {
  languageFromAcceptLanguage,
  parseLanguageCode,
  withLanguage,
} from "../src/language.ts";

// どのパスをサーバーが処理するかは definy の definy.handle-request が決め, ページ (静的アセット) は serveAsset で Void に返す
export default defineMiddleware((c, next) =>
  handleWorkerRequest(
    c.req.raw,
    c.env as unknown as Env,
    defaultStore,
    fetch,
    () => servePage(c, next),
  ),
);

async function servePage(
  c: Parameters<Parameters<typeof defineMiddleware>[0]>[0],
  next: () => Promise<void>,
): Promise<Response> {
  const url = new URL(c.req.url);
  // 表示言語は URL の ?lang= だけで決める. ブラウザでページを開いたのに ?lang= が無い (か不正な) ときは
  // Accept-Language から決めた言語の ?lang= を付けた URL にリダイレクトする
  const lang = parseLanguageCode(url.searchParams.get("lang"));
  if (
    lang === null &&
    c.req.method === "GET" &&
    (c.req.header("Accept") ?? "").includes("text/html")
  ) {
    const redirect = c.redirect(
      withLanguage(
        url.pathname + url.search + url.hash,
        languageFromAcceptLanguage(c.req.header("Accept-Language")),
      ),
      302,
    );
    redirect.headers.set("Vary", "Accept-Language");
    return redirect;
  }
  if (lang !== null) {
    c.set("headDefaults", { htmlAttrs: { lang } });
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
}
