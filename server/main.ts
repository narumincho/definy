import dist from "../dist.json" with { type: "json" };
import { h } from "https://esm.sh/preact@10.19.3";
import { renderToString } from "https://esm.sh/preact-render-to-string@6.3.1";
import { App } from "../app/App.ts";
import {
  locationFromPathAndQuery,
  locationToPathAndQuery,
  pathAndQueryFromUrl,
  pathAndQueryToPathAndQueryString,
} from "../app/location.ts";
import { printSchema } from "npm:graphql";
import { createHandler } from "npm:graphql-http/lib/use/fetch";
import { Context, createContext } from "./context.ts";
import { schema } from "./schema.ts";
import { decodeBase64 } from "https://deno.land/std@0.211.0/encoding/base64.ts";

const globalStyle = `
/*
  Hack typeface https://github.com/source-foundry/Hack
  License: https://github.com/source-foundry/Hack/blob/master/LICENSE.md
*/

@font-face {
  font-family: "Hack";
  font-weight: 400;
  font-style: normal;
  src: url("/file/${dist.font.hash}") format("woff2");
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: #080808;
  color: #f0f0f0;
}

* {
  box-sizing: border-box;
  color: white;
}

#app {
  width: 100%;
  height: 100%;
}
`;

export const startDefinyServer = () => {
  Deno.serve(async (request) => {
    console.log(request.url);
    const url = new URL(request.url);
    const location = locationFromPathAndQuery(pathAndQueryFromUrl(url));
    if (location === undefined) {
      return new Response("Not Found", { status: 404 });
    }
    const normalizedPathAndQuery = pathAndQueryToPathAndQueryString(
      locationToPathAndQuery(location),
    );
    if (
      url.pathname + url.search !==
        normalizedPathAndQuery
    ) {
      return Response.redirect(new URL(normalizedPathAndQuery, request.url));
    }
    if (location.type === "file") {
      if (location.hash === dist.clientJs.hash) {
        return new Response(dist.clientJs.code, {
          headers: {
            "Content-Type": "text/javascript",
            "Cache-Control": "public, max-age=604800, immutable",
          },
        });
      }
      if (location.hash === dist.icon.hash) {
        return new Response(decodeBase64(dist.icon.base64), {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=604800, immutable",
          },
        });
      }
      if (location.hash === dist.font.hash) {
        return new Response(decodeBase64(dist.font.base64), {
          headers: {
            "Content-Type": "font/woff2",
            "Cache-Control": "public, max-age=604800, immutable",
          },
        });
      }
      return new Response("file Not Found", { status: 404 });
    }
    if (location.type === "graphql") {
      // エディタを返す
      if (request.headers.get("accept")?.includes("html")) {
        return new Response(apolloStudioEmbeddedHtml(printSchema(schema)), {
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        });
      }

      // GraphQL の処理をする
      return await createHandler<Context>({
        schema,
        context: () =>
          createContext({
            authHeaderValue: request.headers.get("authorization") ?? undefined,
          }),
      })(request);
    }

    return new Response(
      "<!doctype html>" + renderToString(h("html", {}, [
        h("head", {}, [
          h("meta", { charset: "utf-8" }),
          h("meta", {
            name: "viewport",
            content: "width=device-width, initial-scale=1.0",
          }),
          h("title", {}, "definy"),
          h("link", {
            rel: "icon",
            href: pathAndQueryToPathAndQueryString(
              locationToPathAndQuery({
                type: "file",
                hash: dist.icon.hash,
              }),
            ),
          }),
          h("script", {
            type: "module",
            src: pathAndQueryToPathAndQueryString(
              locationToPathAndQuery({
                type: "file",
                hash: dist.clientJs.hash,
              }),
            ),
          }),
          h("style", {}, globalStyle),
        ]),
        h("body", {}, [
          h("div", { id: "app", "data-props": JSON.stringify({ location }) }, [
            h(App, {
              location,
              logInState: { type: "guest" },
              languageDropdownIsOpen: false,
              onClickCreateIdea: () => {},
              onLocationMove: () => {},
              onSetLanguageDropdownIsOpen: () => {},
            }),
          ]),
        ]),
      ])),
      {
        headers: {
          "Content-Type": "text/html",
        },
      },
    );
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
