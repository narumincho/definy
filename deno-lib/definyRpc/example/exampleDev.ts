import { serve } from "https://deno.land/std@0.160.0/http/server.ts";
import { definyRpc } from "../server/mod.ts";
import { funcList } from "./exampleFunc.ts";

const portNumber = 2520;

const sampleDefinyRpcServer = definyRpc.createHttpServer({
  name: "exampleDev",
  all: funcList,
  originHint: `http://localhost:${portNumber}`,
  codeGenOutputFolderPath: "./definy-rpc/browserClient/src/generated",
});

serve(
  async (request) => {
    const response = await sampleDefinyRpcServer(request);

    response.headers.append(
      "access-control-allow-origin",
      request.headers.get("origin") ?? new URL(request.url).origin
    );
    return response;
  },
  { port: portNumber }
);
