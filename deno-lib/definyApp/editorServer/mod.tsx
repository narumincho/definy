/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.163.0/http/server.ts";
import React from "https://esm.sh/react@18.2.0";
import { renderToString } from "https://esm.sh/react-dom@18.2.0/server";
import { App } from "../editor/app.tsx";
import dist from "./dist.json" assert { type: "json" };
import { getRenderedCss, resetInsertedStyle } from "../../cssInJs/mod.ts";
import { requestObjectToSimpleRequest } from "../../definyRpc/server/simpleRequest.ts";
import { stringArrayEqual } from "../../util.ts";

export const startEditorServer = (
  option: { readonly port: number | undefined },
): void => {
  serve((request) => {
    const simpleRequest = requestObjectToSimpleRequest(request);
    if (stringArrayEqual(simpleRequest?.path ?? [], [dist.scriptHash])) {
      return new Response(dist.scriptContent, {
        headers: {
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    }
    if (stringArrayEqual(simpleRequest?.path ?? [], [dist.iconHash])) {
      return new Response(dist.iconContent, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    }
    if (stringArrayEqual(simpleRequest?.path ?? [], [dist.fontHash])) {
      return new Response(dist.iconContent, {
        headers: {
          "Content-Type": "font/woff2",
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    }

    resetInsertedStyle();
    const body = renderToString(<App />);
    return new Response(
      `<!doctype html>
<html>
  <head>
    <title>definy editor</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/png" href="/${dist.iconHash}" />
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
