import { printSchema } from "npm:graphql";
import { createHandler } from "npm:graphql-http/lib/use/fetch";
import { Context, createContext } from "./context.ts";
import { schema } from "./schema.ts";

export const startDefinyServer = () => {
  Deno.serve(async (request) => {
    const cors = supportCrossOriginResourceSharing(request);
    if (cors.type === "skipMainProcess") {
      return cors.response;
    }

    if (request.headers.get("accept")?.includes("html")) {
      return new Response(apolloStudioEmbeddedHtml(printSchema(schema)), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          ...cors.headers,
        },
      });
    }

    // GraphQL の処理をする
    const response = await createHandler<Context>({
      schema,
      context: () =>
        createContext({
          authHeaderValue: request.headers.get("authorization") ?? undefined,
        }),
    })(request);
    for (const [key, value] of cors.headers.entries()) {
      response.headers.set(key, value);
    }
    return response;
  });
};

const apolloStudioEmbeddedHtml = (schemaAsString: string) => `
<!doctype html>
<html style="height: 100%; overflow: hidden;">
<head></head>
<body style="height: 100%; margin: 0;">
  <div style="width: 100%; height: 100%;" id="embedded-explorer"></div>
  <script src="https://embeddable-explorer.cdn.apollographql.com/_latest/embeddable-explorer.umd.production.min.js"></script> 
  <script>
    new window.EmbeddedExplorer({
      target: "#embedded-explorer",
      endpointUrl: location.href,
      schema: \`${
  schemaAsString.replace(/<\/script>/gu, "<\\/script>").replace(/`/gu, "\\`")
}\`,
      includeCookies: false,
    });
  </script>
</body>
</html>
`;

/**
 * CrossOriginResourceSharing (CORS) の 処理をする
 */
const supportCrossOriginResourceSharing = (
  request: Request,
):
  | { readonly type: "needMainProcess"; readonly headers: Headers }
  | { readonly type: "skipMainProcess"; readonly response: Response } => {
  const headers = new Headers({
    "access-control-allow-origin": allowOrigin(request.headers.get("origin")),
    vary: "Origin",
  });

  if (request.method === "OPTIONS") {
    headers.set("access-control-allow-methods", "POST, GET, OPTIONS");
    headers.set("access-control-allow-headers", "content-type,authorization");
    return {
      type: "skipMainProcess",
      response: new Response(undefined, { status: 200, headers }),
    };
  }
  return {
    type: "needMainProcess",
    headers,
  };
};

const allowOrigin = (httpHeaderOrigin: unknown): string => {
  if (
    typeof httpHeaderOrigin === "string" &&
    (httpHeaderOrigin === "https://studio.apollographql.com" ||
      httpHeaderOrigin ===
        "https://embeddable-explorer.cdn.apollographql.com" ||
      httpHeaderOrigin === "https://altair-gql.sirmuel.design" ||
      httpHeaderOrigin === "https://graphiql-online.com" ||
      httpHeaderOrigin.startsWith("http://localhost") ||
      httpHeaderOrigin.startsWith("http://127.0.0.1") ||
      httpHeaderOrigin.startsWith("http://[::1]") ||
      httpHeaderOrigin.match(/^https:\/\/[^.]+\.definy\.pages\.dev$/))
  ) {
    return httpHeaderOrigin;
  }
  return "https://definy.pages.dev";
};
