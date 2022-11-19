import * as definyRpc from "../../definyRpc/server/definyRpc.ts";
import { funcList } from "./funcList.ts";
import * as f from "../../typedFauna.ts";
import { requestObjectToSimpleRequest } from "../../simpleRequestResponse/simpleRequest.ts";
import { simpleResponseToResponse } from "../../simpleRequestResponse/simpleResponse.ts";
import { serve } from "https://deno.land/std@0.165.0/http/server.ts";
import { fromFileUrl } from "https://deno.land/std@0.156.0/path/mod.ts";

export const startDefinyApiServer = (
  parameter: {
    /** 開発モードかどうか */
    readonly mode:
      | { readonly type: "dev"; readonly port: number }
      | { readonly type: "denoDeploy" };
    /** データベースのfaunaのシークレットキー */
    readonly faunaSecret: string;
  },
): void => {
  const sampleDefinyRpcServerParameter: definyRpc.DefinyRpcParameter = {
    name: parameter.mode.type === "dev" ? "definyApiDev" : "definyApi",
    all: () =>
      funcList(
        f.crateFaunaClient({
          domain: "db.us.fauna.com",
          secret: parameter.faunaSecret,
        }),
      ),
    originHint: parameter.mode.type === "dev"
      ? `http://localhost:${parameter.mode.port}`
      : "",
    codeGenOutputFolderPath: parameter.mode.type === "dev"
      ? fromFileUrl(import.meta.resolve("../apiClient"))
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
    parameter.mode.type === "dev" ? { port: parameter.mode.port } : {},
  );
};
