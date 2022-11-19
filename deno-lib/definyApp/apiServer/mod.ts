import { definyRpc } from "../../definyRpc/server/mod.ts";
import { funcList } from "./funcList.ts";
import * as f from "../../typedFauna.ts";
import { requestObjectToSimpleRequest } from "../../simpleRequestResponse/simpleRequest.ts";
import { simpleResponseToResponse } from "../../simpleRequestResponse/simpleResponse.ts";
import { serve } from "https://deno.land/std@0.165.0/http/server.ts";

const devPortNumber = 2528;

export const main = (
  parameter: { readonly isDev: boolean; readonly faunaSecret: string },
): void => {
  const sampleDefinyRpcServerParameter: definyRpc.DefinyRpcParameter = {
    name: parameter.isDev ? "definyApiDev" : "definyApi",
    all: () =>
      funcList(
        f.crateFaunaClient({
          domain: "db.us.fauna.com",
          secret: parameter.faunaSecret,
        }),
      ),
    originHint: parameter.isDev ? `http://localhost:${devPortNumber}` : "",
    codeGenOutputFolderPath: parameter.isDev
      ? "./definyApp/apiClient"
      : undefined,
  };
  serve(
    async (request) => {
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
      const response = await simpleResponseToResponse(simpleResponse);

      response.headers.append(
        "access-control-allow-origin",
        request.headers.get("origin") ?? new URL(request.url).origin,
      );
      return response;
    },
    parameter.isDev ? { port: devPortNumber } : {},
  );
};
