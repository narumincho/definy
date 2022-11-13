import { serve } from "https://deno.land/std@0.163.0/http/server.ts";
import React from "https://esm.sh/react@18.2.0";
import { renderToReadableStream } from "https://esm.sh/react-dom@18.2.0/server";
import { App } from "../editor/app.tsx";
import dist from "./dist.json" assert { type: "json" };

export const startEditorServer = (
  option: { readonly port: number | undefined },
): void => {
  serve(async (request) => {
    if (new URL(request.url).pathname === "/" + dist.scriptHash) {
      return new Response(dist.scriptContent, {
        headers: {
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    }
    const stream = await renderToReadableStream(
      <html>
        <head>
          <title>definy editor</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script type="module" src={"/" + dist.scriptHash} />
        </head>
        <body>
          <App />
        </body>
      </html>,
    );
    return new Response(stream, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=5",
      },
    });
  }, option.port === undefined ? {} : { port: option.port });
};
