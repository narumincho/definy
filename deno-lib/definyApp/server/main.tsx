import React from "https://esm.sh/react@18.2.0?pin=v99";
import { renderToString } from "https://esm.sh/react-dom@18.2.0/server?pin=v99";
import { serve } from "https://deno.land/std@0.166.0/http/server.ts";
import { App } from "../editor/app.tsx";
import dist from "./dist.json" assert { type: "json" };
import { getRenderedCss, resetInsertedStyle } from "../../cssInJs/mod.ts";
import { stringArrayEqual } from "../../util.ts";
import { languageFromId } from "../../zodType.ts";
import { requestObjectToSimpleRequest } from "../../simpleRequestResponse/simpleRequest.ts";
import { clock24Title } from "../editor/pages/clock24.tsx";
import { createImageFromText } from "./ogpImage.tsx";
import { toBytes } from "https://deno.land/x/fast_base64@v0.1.7/mod.ts";
import { extractOgpUrl, toOgpImageUrl } from "./url.ts";

export const startEditorServer = (
  option: { readonly port: number | undefined },
): void => {
  serve(async (request) => {
    const simpleRequest = requestObjectToSimpleRequest(request);
    console.log(simpleRequest);
    if (stringArrayEqual(simpleRequest?.path ?? [], [dist.scriptHash])) {
      return new Response(dist.scriptContent, {
        headers: {
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    }
    if (stringArrayEqual(simpleRequest?.path ?? [], [dist.iconHash])) {
      return new Response(await toBytes(dist.iconContent), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    }
    if (stringArrayEqual(simpleRequest?.path ?? [], [dist.fontHash])) {
      return new Response(await toBytes(dist.fontContent), {
        headers: {
          "Content-Type": "font/woff2",
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    }
    const ogpUrl = extractOgpUrl(new URL(request.url));
    if (ogpUrl !== undefined) {
      const image = await createImageFromText(ogpUrl);
      if (image !== undefined) {
        return new Response(image, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=604800, immutable",
          },
        });
      }
    }

    resetInsertedStyle();

    const isClock24 = stringArrayEqual(simpleRequest?.path ?? [], ["clock24"]);
    const queryDate = new Date(simpleRequest?.query.get("date") ?? "");
    const body = renderToString(
      <App
        language={languageFromId(simpleRequest?.query.get("hl"))}
        isClock24={isClock24}
        date={Number.isNaN(queryDate.getTime()) ? undefined : queryDate}
        message={simpleRequest?.query.get("message") ?? ""}
      />,
    );
    const title = isClock24 ? clock24Title() : "definy editor";

    return new Response(
      `<!doctype html>
<html>
  <head>
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/png" href="/${dist.iconHash}">
    <meta name="description" content="${new Date().toISOString()}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${new Date().toISOString()}">
    <meta property="og:url" content="${request.url}">
    <meta property="og:site_name" content="definy">
    <meta name="twitter:card" content="summary_large_image">
    <meta property="og:image" content="${
        new URL(request.url).origin +
        (isClock24
          ? toOgpImageUrl(
            simpleRequest?.query ?? new Map(),
          )
          : dist.iconHash)
      }">
    <meta name="twitter:creator" content="@naru_mincho">
    <script type="module" src="/${dist.scriptHash}"></script>
    <style>${getRenderedCss()}</style>
    <style>
html, body, #root {
  height: 100%;
}

body {
  margin: 0;
}

/*
  Hack typeface https://github.com/source-foundry/Hack
  License: https://github.com/source-foundry/Hack/blob/master/LICENSE.md
*/
@font-face {
  font-family: "Hack";
  font-weight: 400;
  font-style: normal;
  src: url("/${dist.fontHash}") format("woff2");
}
    </style>
  </head>
  <body>
    <div id="root">${body}</div>
  </body>
</html>
`,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=5",
        },
      },
    );
  }, option.port === undefined ? {} : { port: option.port });
};
