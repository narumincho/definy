import {
  DefinyRpcType,
  list,
  product,
  set,
  string,
  sum,
  TypeBody,
  unit,
} from "./type.ts";
import { clientBuildResult } from "./client.ts";
import * as base64 from "https://denopkg.com/chiefbiiko/base64@master/mod.ts";
import { lazyGet } from "./lazy.ts";
import { jsonParse } from "./typedJson.ts";

export * from "./type.ts";

const apiFunctionBlandSymbol = Symbol();

type ApiFunction<InputType, OutputType> = {
  readonly fullName: readonly [string, ...ReadonlyArray<string>];
  readonly input: DefinyRpcType<InputType>;
  readonly output: DefinyRpcType<OutputType>;
  readonly description: string;
  readonly isMutation: boolean;
  readonly resolve: (input: InputType) => Promise<OutputType> | OutputType;
  readonly [apiFunctionBlandSymbol]: typeof apiFunctionBlandSymbol;
};

export const createApiFunction = <InputType, OutputType>(
  parameter: Omit<
    ApiFunction<InputType, OutputType>,
    typeof apiFunctionBlandSymbol
  >
): ApiFunction<InputType, OutputType> => {
  return {
    ...parameter,
    [apiFunctionBlandSymbol]: apiFunctionBlandSymbol,
  };
};

export const createHttpServer = (parameter: {
  readonly name: string;
  readonly all: () => ReadonlyArray<ApiFunction<any, any>>;
}) => {
  const all = addDefinyRpcApiFunction(parameter.name, parameter.all);
  return (request: Request): Response => {
    const url = new URL(request.url);
    const pathList = url.pathname.slice(1).split("/");
    const paramJson = url.searchParams.get("param");
    const paramJsonParsed =
      (typeof paramJson === "string" ? jsonParse(paramJson) : null) ?? null;
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
    for (const func of all) {
      if (stringArrayEqual(pathList, func.fullName)) {
        // input が undefined の型以外の場合は, 入力の関数を省く
        return new Response(
          JSON.stringify(
            func.output.toJson(
              func.resolve(func.input.fromJson(paramJsonParsed))
            )
          ),
          {
            headers: { "content-type": "application/json" },
          }
        );
      }
    }
    return new Response(JSON.stringify("not found.."), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  };
};

type Type = {
  readonly fullName: ReadonlyArray<string>;
  readonly description: string;
  readonly parameters: ReadonlyArray<Type>;
};

const Type: DefinyRpcType<Type> = product<Type>({
  fullName: ["definyRpc", "Type"],
  description: "definyRpc で表現できる型",
  fieldList: {
    fullName: {
      type: list(string),
      description: "完全名",
    },
    description: {
      type: string,
      description: "",
    },
    parameters: {
      type: () => list(Type),
      description: "型パラメーター",
    },
  },
});

type FunctionDetail = {
  readonly name: ReadonlyArray<string>;
  readonly description: string;
  readonly input: Type;
  readonly output: Type;
};

const FunctionDetail = product<FunctionDetail>({
  fullName: ["definyRpc", "FunctionDetail"],
  description: "functionByNameの結果",
  fieldList: {
    name: {
      description: "名前空間付き, 関数名",
      type: list<string>(string),
    },
    description: { description: "関数の説明文", type: string },
    input: { description: "関数の入力の型", type: Type },
    output: { description: "関数の出力の型", type: Type },
  },
});

const addDefinyRpcApiFunction = (
  name: string,
  all: () => ReadonlyArray<ApiFunction<any, any>>
): ReadonlyArray<ApiFunction<any, any>> => {
  return [
    createApiFunction({
      fullName: ["definyRpc", "namespaceList"],
      description: "get namespace list",
      input: unit,
      output: set<ReadonlyArray<string>>(list<string>(string)),
      isMutation: false,
      resolve: () => {
        return new Set(
          [
            ...new Set(
              addDefinyRpcApiFunction(name, all).map((func) =>
                func.fullName.slice(0, -1).join(".")
              )
            ),
          ].map((e) => e.split("."))
        );
      },
    }),
    createApiFunction({
      fullName: ["definyRpc", "functionListByName"],
      description: "名前から関数を検索する",
      input: unit,
      output: list<FunctionDetail>(FunctionDetail),
      isMutation: false,
      resolve: () => {
        const allR = addDefinyRpcApiFunction(name, all);
        return allR.map<FunctionDetail>((f) => ({
          name: f.fullName,
          description: f.description,
          input: definyRpcTypeBodyToType(f.input),
          output: definyRpcTypeBodyToType(f.output),
        }));
      },
    }),
    ...all().map((func) => ({
      ...func,
      fullName: [name, ...func.fullName] as const,
    })),
  ];
};

const definyRpcTypeBodyToType = <t>(definyRpcType: DefinyRpcType<t>): Type => {
  return {
    fullName: definyRpcType.fullName,
    description: definyRpcType.description,
    parameters: definyRpcType.parameters.map(definyRpcTypeBodyToType),
  };
};

const stringArrayEqual = (
  a: ReadonlyArray<string>,
  b: ReadonlyArray<string>
): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  for (const [index, aItem] of a.entries()) {
    if (aItem !== b[index]) {
      return false;
    }
  }
  return true;
};
