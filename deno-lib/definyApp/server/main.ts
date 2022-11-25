import * as definyRpc from "../../definyRpc/server/definyRpc.ts";
import { funcList } from "./funcList.ts";
import * as f from "../../typedFauna.ts";
import { requestObjectToSimpleRequest } from "../../simpleRequestResponse/simpleRequest.ts";
import { simpleResponseToResponse } from "../../simpleRequestResponse/simpleResponse.ts";
import { serve } from "https://deno.land/std@0.166.0/http/server.ts";
import { fromFileUrl } from "https://deno.land/std@0.156.0/path/mod.ts";
import { Mode } from "./mode.ts";

export const startDefinyServer = (
  parameter: {
    /** 開発モードかどうか */
    readonly mode: Mode;
    /** データベースのfaunaのシークレットキー */
    readonly faunaSecret: string;
    /**
     * Google でログイン のクライアントシークレット
     * Google Cloud Console の設定画面で 起動するオリジン+ /definyApi/logInCallback
     * のコールバックURLを許可する必要あり
     */
    readonly googleLogInClientSecret: string;
  },
): void => {
  const sampleDefinyRpcServerParameter: definyRpc.DefinyRpcParameter = {
    name: "definyApi",
    all: () =>
      funcList(
        f.crateFaunaClient({
          domain: "db.us.fauna.com",
          secret: parameter.faunaSecret,
        }),
        parameter.mode,
      ),
    originHint: parameter.mode.type === "dev"
      ? `http://localhost:${parameter.mode.port}`
      // Deno Deploy で 現在の環境のオリジンを取得することができれば...
      // https://github.com/denoland/deploy_feedback/issues/245
      : "https://definy-api.deno.dev",
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
      const simpleResponse = await definyRpc.handleRequest(
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
    parameter.mode.type === "dev" ? { port: parameter.mode.port } : {},
  );
};
