import { App } from "../client/app.tsx";
import hash from "../generated/hash.json" with { type: "json" };
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.html(
    <html>
      <head>
        <script type="module" src={`/script-${hash.clientScriptHash}`} />
      </head>
      <body>
        <App
          state={0}
          setState={() => {}}
          onOpenCreateAccountDialog={() => {}}
          onOpenSigninDialog={() => {}}
        />
      </body>
    </html>,
  );
}).get(
  `script-${hash.clientScriptHash}`,
  async (c) => {
    // Deno Deploy で Raw imports がサポートされるまで
    const clientScript = await Deno.readTextFile(
      "./generated/clientScript.js",
    );
    return c.text(clientScript, 200, {
      "Content-Type": "application/javascript; charset=utf-8",
    });
  },
);

Deno.serve(app.fetch);
