import { DefinyRpcType } from "./type.ts";
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
