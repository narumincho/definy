import { definyRpc } from "./server/mod.ts";
import { funcList } from "./exampleFunc.ts";
import { requestObjectToSimpleRequest } from "../simpleRequestResponse/simpleRequest.ts";
import { simpleResponseToResponse } from "../simpleRequestResponse/simpleResponse.ts";
import { server } from "../deps.ts";

const portNumber = 2520;

const sampleDefinyRpcServerParameter: definyRpc.DefinyRpcParameter = {
  name: "example",
  all: funcList,
  originHint: `https://narumincho-definy.deno.dev`,
  codeGenOutputFolderPath: undefined,
};

server.serve(
  (request) => {
    const simpleRequest = requestObjectToSimpleRequest(request);
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
    return simpleResponseToResponse(simpleResponse);
  },
  { port: portNumber },
);
