import { serve } from "https://deno.land/std@0.154.0/http/server.ts";
import { definyRpc } from "./mod.ts";

const sampleDefinyRpcServer = definyRpc.createHttpServer({
  sample: {
    hello: definyRpc.query({
      input: definyRpc.number,
      output: definyRpc.string,
      description: "",
      resolve: (input) => {
        return "ok".repeat(input);
      },
    }),
  },
  dynamicA: {},
  dynamicB: {},
  dynamicC: {},
});

serve(
  (request) => {
    const response = sampleDefinyRpcServer(request);

    response.headers.append(
      "access-control-allow-origin",
      request.headers.get("origin") ?? new URL(request.url).origin
    );
    return response;
  },
  { port: 2520 }
);
