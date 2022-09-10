import { serve } from "https://deno.land/std@0.154.0/http/server.ts";

serve(
  (request: Request) => {
    console.log(request.url);
    return new Response(
      [
        "url: " + request.url,
        "headers:" + JSON.stringify([...request.headers]),
        new Date().toISOString(),
      ].join("\n")
    );
  },
  { port: 2520 }
);
