/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.163.0/http/server.ts";
import React from "https://esm.sh/react@18.2.0";
import { renderToString } from "https://esm.sh/react-dom@18.2.0/server";
import { App } from "../editor/app.tsx";
import dist from "./dist.json" assert { type: "json" };
import { getRenderedCss, resetInsertedStyle } from "../../cssInJs/mod.ts";

export const startEditorServer = (
  option: { readonly port: number | undefined },
): void => {
  serve((request) => {
    if (new URL(request.url).pathname === "/" + dist.scriptHash) {
      return new Response(dist.scriptContent, {
        headers: {
          "Content-Type": "text/javascript; charset=utf-8",
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
    <script type="module" src=${"/" + dist.scriptHash}></script>
    <style>${getRenderedCss()}</style>
    <style>
html {
  height: 100%;
}

body {
  margin: 0;
  height: 100%;
}
    </style>
  </head>
  <body>
    ${body}
  </body>
  </html>,
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
