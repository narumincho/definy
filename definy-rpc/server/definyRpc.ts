import { Type, TypeToTsType } from "./type.ts";
export * from "./type.ts";

export type Api = {
  readonly [key in string]: ApiFunction<Type, Type>;
};

type ApiFunction<InputType extends Type, OutputType extends Type> = {
  readonly input: InputType;
  readonly output: OutputType;
  readonly description: string;
  readonly isMutation: boolean;
  readonly resolve: (
    input: TypeToTsType<InputType>
  ) => Promise<TypeToTsType<Type>> | TypeToTsType<Type>;
  readonly __apiFunctionBland: typeof apiFunctionBlandSymbol;
};

const apiFunctionBlandSymbol = Symbol();

export const query = <
  InputType extends Type,
  OutputType extends Type
>(parameter: {
  readonly input: InputType;
  readonly output: OutputType;
  readonly description: string;
  readonly resolve: (
    input: TypeToTsType<InputType>
  ) => Promise<TypeToTsType<Type>> | TypeToTsType<Type>;
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

export const mutation = <
  InputType extends Type,
  OutputType extends Type
>(parameter: {
  readonly input: InputType;
  readonly output: OutputType;
  readonly description: string;
  readonly resolve: (
    input: TypeToTsType<InputType>
  ) => Promise<TypeToTsType<Type>> | TypeToTsType<Type>;
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
  (api: Api) =>
  (request: Request): Response => {
    console.log("definyRpc called");
    console.log(Object.keys(api));
    return new Response(JSON.stringify(Object.keys(api)), {
      headers: { "content-type": "application/json" },
    });
  };
