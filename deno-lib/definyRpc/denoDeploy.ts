import { serve } from "https://deno.land/std@0.163.0/http/server.ts";
import { definyRpc } from "./server/mod.ts";
import { funcList } from "./exampleFunc.ts";

const portNumber = 2520;

const sampleDefinyRpcServerParameter: definyRpc.DefinyRpcParameter = {
  name: "example",
  all: funcList,
  originHint: `https://narumincho-definy.deno.dev`,
  codeGenOutputFolderPath: undefined,
};

serve(
  (request) => {
    const simpleRequest = definyRpc.requestObjectToSimpleRequest(request);
    if (simpleRequest === undefined) {
      return new Response("simpleRequestに変換できなかった", { status: 400 });
    }
    const simpleResponse = definyRpc.handleRequest(
      sampleDefinyRpcServerParameter,
      simpleRequest,
    );
    if (simpleResponse === undefined) {
      return new Response("特に処理すること必要がないリクエストだった", {
        status: 400,
      });
    }
    return definyRpc.simpleResponseToResponse(simpleResponse);
  },
  { port: portNumber },
);
