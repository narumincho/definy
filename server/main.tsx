import { App } from "../client/App.tsx";
import { verifyAndParseEvent } from "../event/signedEvent.ts";
import hash from "../generated/hash.json" with { type: "json" };
import { render } from "preact-render-to-string";
import { saveEvent } from "./database.ts";

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
                secretKey={null}
                onOpenCreateAccountDialog={() => {}}
                onOpenSigninDialog={() => {}}
                onLogout={() => {}}
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
      const body = new Uint8Array(await request.arrayBuffer());

      const { eventAsCbor, event } = await verifyAndParseEvent(
        new Uint8Array(body),
      );

      await saveEvent({ eventAsCbor, event });

      return new Response("OK", { status: 200 });
    }
    default:
      return new Response("Not Found", { status: 404 });
  }
});
