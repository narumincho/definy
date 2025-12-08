import { App } from "../client/App.tsx";
import hash from "../generated/hash.json" with { type: "json" };
import { render } from "preact-render-to-string";
import { decodeCreateAccountEvent } from "../event/main.ts";

// Deno Deploy で Raw imports がサポートされるまで
const clientScript = await Deno.readTextFile(
  "./generated/clientScript.js",
);

Deno.serve(async (request): Promise<Response> => {
  const url = new URL(request.url);
  switch (url.pathname) {
    case "/":
      return new Response(
        render(
          <html>
            <head>
              <script type="module" src={`/script-${hash.clientScriptHash}`} />
            </head>
            <body>
              <App
                state={0}
                setState={() => {}}
                accountId={null}
                onOpenCreateAccountDialog={() => {}}
                onOpenSigninDialog={() => {}}
              />
            </body>
          </html>,
        ),
        {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        },
      );
    case `/script-${hash.clientScriptHash}`: {
      return new Response(clientScript, {
        status: 200,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
        },
      });
    }
    case "/events": {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }
      const body = decodeCreateAccountEvent(
        new Uint8Array(await request.arrayBuffer()),
      );
      console.log(body);
      return new Response("OK", { status: 200 });
    }
    default:
      return new Response("Not Found", { status: 404 });
  }
});
