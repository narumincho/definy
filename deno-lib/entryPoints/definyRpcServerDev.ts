import {
  DefinyRpcParameter,
  handleRequest,
} from "../definyRpc/server/definyRpc.ts";
import { funcList } from "../definyRpc/exampleFunc.ts";
import { requestObjectToSimpleRequest } from "../simpleRequestResponse/simpleRequest.ts";
import { simpleResponseToResponse } from "../simpleRequestResponse/simpleResponse.ts";
import { serve } from "https://deno.land/std@0.165.0/http/server.ts";
import { fromFileUrl } from "https://deno.land/std@0.156.0/path/mod.ts";

const portNumber = 2520;

const sampleDefinyRpcServerParameter: DefinyRpcParameter = {
  name: "exampleDev",
  all: funcList,
  originHint: `http://localhost:${portNumber}`,
  codeGenOutputFolderPath: fromFileUrl(
    import.meta.resolve("../definyRpc/generated"),
  ),
};

serve(
  async (request) => {
    const simpleRequest = requestObjectToSimpleRequest(request);
    if (simpleRequest === undefined) {
      return new Response("simpleRequestに変換できなかった", { status: 400 });
    }
    const simpleResponse = handleRequest(
      sampleDefinyRpcServerParameter,
      simpleRequest,
    );
    if (simpleResponse === undefined) {
      return new Response("特に処理すること必要がないリクエストだった", {
        status: 400,
      });
    }
    const response = await simpleResponseToResponse(simpleResponse);

    response.headers.append(
      "access-control-allow-origin",
      request.headers.get("origin") ?? new URL(request.url).origin,
    );
    return response;
  },
  { port: portNumber },
);
