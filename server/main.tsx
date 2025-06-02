import { App } from "../client/app.tsx";
import dist from "../dist.json" with { type: "json" };
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.html(
    <html>
      <head>
        <script type="module" src={`/script-${dist.clientJavaScriptHash}`} />
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
  `script-${dist.clientJavaScriptHash}`,
  (c) =>
    c.text(dist.clientJavaScript, 200, {
      "Content-Type": "application/javascript; charset=utf-8",
    }),
);

export type app = typeof app;

Deno.serve(app.fetch);
