import { serve } from "https://deno.land/std@0.161.0/http/server.ts";
import { definyRpc } from "../server/mod.ts";
import { funcList } from "./exampleFunc.ts";

const portNumber = 2520;

const sampleDefinyRpcServerParameter: definyRpc.DefinyRpcParameter = {
  name: "exampleDev",
  all: funcList,
  originHint: `http://localhost:${portNumber}`,
  codeGenOutputFolderPath: "./deno-lib/definyRpc/client/generated",
};

serve(
  async (request) => {
    const simpleRequest = definyRpc.requestObjectToSimpleRequest(request);
    if (simpleRequest === undefined) {
      return new Response("simpleRequestに変換できなかった", { status: 400 });
    }
    const simpleResponse = definyRpc.handleRequest(
      sampleDefinyRpcServerParameter,
      simpleRequest
    );
    if (simpleResponse === undefined) {
      return new Response("特に処理すること必要がないリクエストだった", {
        status: 400,
      });
    }
    const response = await definyRpc.simpleResponseToResponse(simpleResponse);

    response.headers.append(
      "access-control-allow-origin",
      request.headers.get("origin") ?? new URL(request.url).origin
    );
    return response;
  },
  { port: portNumber }
);
