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
});

serve(sampleDefinyRpcServer);
