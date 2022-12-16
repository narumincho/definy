import { DefinyRpcParameter, handleRequest } from "../server/definyRpc.ts";
import { functionAndTypeList } from "./exampleFunc.ts";
import { requestObjectToSimpleRequest } from "../../simpleRequestResponse/simpleRequest.ts";
import { simpleResponseToResponse } from "../../simpleRequestResponse/simpleResponse.ts";
import { serve } from "https://deno.land/std@0.167.0/http/server.ts";

export const startExampleServer = (
  parameter: {
    readonly portNumber?: number;
    readonly codeGenOutputFolderPath?: URL;
  },
): void => {
  serve(
    async (request) => {
      const sampleDefinyRpcServerParameter: DefinyRpcParameter = {
        name: "example",
        all: functionAndTypeList,
        originHint: new URL(request.url).origin,
        codeGenOutputFolderPath: parameter?.codeGenOutputFolderPath,
      };
      const simpleRequest = await requestObjectToSimpleRequest(request);
      if (simpleRequest === undefined) {
        return new Response("simpleRequestに変換できなかった", { status: 400 });
      }
      const simpleResponse = await handleRequest(
        sampleDefinyRpcServerParameter,
        simpleRequest,
      );
      if (simpleResponse === undefined) {
        return new Response("特に処理すること必要がないリクエストだった", {
          status: 400,
        });
      }
      const response = simpleResponseToResponse(simpleResponse);

      response.headers.append(
        "access-control-allow-origin",
        request.headers.get("origin") ?? new URL(request.url).origin,
      );
      return response;
    },
    parameter.portNumber === undefined ? {} : { port: parameter.portNumber },
  );
};
