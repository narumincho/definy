import { DefinyRpcType } from "./type.ts";
import { clientBuildResult } from "./client.ts";
import * as base64 from "https://denopkg.com/chiefbiiko/base64@master/mod.ts";

export * from "./type.ts";

export type ApiFunctionObject = {
  readonly [key in string]: ApiFunction<any, any>;
};

type ApiFunction<InputType, OutputType> = {
  readonly input: DefinyRpcType<InputType>;
  readonly output: DefinyRpcType<OutputType>;
  readonly description: string;
  readonly isMutation: boolean;
  readonly resolve: (input: InputType) => Promise<OutputType> | OutputType;
  readonly __apiFunctionBland: typeof apiFunctionBlandSymbol;
};

const apiFunctionBlandSymbol = Symbol();

export const query = <InputType, OutputType>(parameter: {
  readonly input: DefinyRpcType<InputType>;
  readonly output: DefinyRpcType<OutputType>;
  readonly description: string;
  readonly resolve: (input: InputType) => Promise<OutputType> | OutputType;
}): ApiFunction<InputType, OutputType> => {
  return {
    input: parameter.input,
    output: parameter.output,
    description: parameter.description,
    isMutation: false,
    resolve: parameter.resolve,
    __apiFunctionBland: apiFunctionBlandSymbol,
  };
};

export const mutation = <InputType, OutputType>(parameter: {
  readonly input: DefinyRpcType<InputType>;
  readonly output: DefinyRpcType<OutputType>;
  readonly description: string;
  readonly resolve: (input: InputType) => Promise<OutputType> | OutputType;
}): ApiFunction<InputType, OutputType> => {
  return {
    input: parameter.input,
    output: parameter.output,
    description: parameter.description,
    isMutation: true,
    resolve: parameter.resolve,
    __apiFunctionBland: apiFunctionBlandSymbol,
  };
};

export const createHttpServer =
  (api: { [key in string]: ApiFunctionObject }) =>
  (request: Request): Response => {
    const url = new URL(request.url);
    const pathList = url.pathname.slice(1).split("/");
    if (url.pathname === "/") {
      return new Response(clientBuildResult.indexHtmlContent, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (url.pathname === clientBuildResult.iconPath) {
      return new Response(base64.toUint8Array(clientBuildResult.iconContent), {
        headers: { "content-type": "image/png" },
      });
    }
    if (url.pathname === clientBuildResult.scriptPath) {
      return new Response(clientBuildResult.scriptContent, {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      });
    }
    if (pathList[0] === "definyRpc" && pathList[1] === "namespaceList") {
      return new Response(JSON.stringify(Object.keys(api)), {
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify("not found.."), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  };
