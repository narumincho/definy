import { serve } from "https://deno.land/std@0.186.0/http/server.ts";
import {
  DefinyRpcTypeInfo,
  Maybe,
  Namespace,
  Pattern,
  TypeBody,
} from "../definyRpc/core/coreType.ts";
import {
  DefinyRpcParameter,
  handleRequest,
} from "../definyRpc/server/definyRpc.ts";
import { requestObjectToSimpleRequest } from "../simpleRequestResponse/simpleRequest.ts";
import { simpleResponseToResponse } from "../simpleRequestResponse/simpleResponse.ts";

const typeList: ReadonlyArray<DefinyRpcTypeInfo> = [
  DefinyRpcTypeInfo.from({
    name: "Operator",
    description: "Dart の演算子",
    attribute: Maybe.nothing(),
    namespace: Namespace.local(["dart"]),
    parameter: [],
    body: TypeBody.sum([
      Pattern.from({
        name: "nullishCoalescing",
        description: "??",
        parameter: Maybe.nothing(),
      }),
      Pattern.from({
        name: "notEqual",
        description: "!=",
        parameter: Maybe.nothing(),
      }),
      Pattern.from({
        name: "equal",
        description: "==",
        parameter: Maybe.nothing(),
      }),
    ]),
  }),
];

export const startDartGenTypeServer = async (): Promise<void> => {
  await serve(
    async (request) => {
      const sampleDefinyRpcServerParameter: DefinyRpcParameter = {
        name: "dartGen",
        all: () => ({
          functionsList: [],
          typeList,
        }),
        originHint: new URL(request.url).origin,
        codeGenOutputFolderPath: new URL("./out/", import.meta.url),
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
    { port: 2403 },
  );
};
