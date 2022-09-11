import { DefinyRpcType, list, set, string, unit } from "./type.ts";
import { clientBuildResult } from "./client.ts";
import * as base64 from "https://denopkg.com/chiefbiiko/base64@master/mod.ts";

export * from "./type.ts";

type ApiFunction<InputType, OutputType> = {
  readonly name: string;
  readonly namespace: ReadonlyArray<string>;
  readonly input: DefinyRpcType<InputType>;
  readonly output: DefinyRpcType<OutputType>;
  readonly description: string;
  readonly isMutation: boolean;
  readonly resolve: (input: InputType) => Promise<OutputType> | OutputType;
  readonly __apiFunctionBland: typeof apiFunctionBlandSymbol;
};

const apiFunctionBlandSymbol = Symbol();

export const createApiFunction = <InputType, OutputType>(
  parameter: Omit<ApiFunction<InputType, OutputType>, "__apiFunctionBland">
): ApiFunction<InputType, OutputType> => {
  return {
    ...parameter,
    __apiFunctionBland: apiFunctionBlandSymbol,
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
      if (stringArrayEqual(pathList, [...func.namespace, func.name])) {
        return new Response(
          JSON.stringify(
            definyRpcTypeValueToSafeJsonValue(func.resolve("これから追加する"))
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

const addDefinyRpcApiFunction = (
  name: string,
  all: () => ReadonlyArray<ApiFunction<any, any>>
): ReadonlyArray<ApiFunction<any, any>> => {
  return [
    createApiFunction({
      namespace: ["definyRpc"],
      name: "namespaceList",
      description: "get namespace list",
      input: unit,
      output: set(list(string)),
      isMutation: false,
      resolve: () => {
        return new Set(
          [
            ...new Set(
              addDefinyRpcApiFunction(name, all).map((func) =>
                func.namespace.join(".")
              )
            ),
          ].map((e) => e.split("."))
        );
      },
    }),
    createApiFunction({
      namespace: ["definyRpc"],
      name: "functionByName",
      description: "名前から関数を検索する",
      input: string,
      output: list(list(string)),
      isMutation: false,
      resolve: (_searchTerm) => {
        const allR = addDefinyRpcApiFunction(name, all);
        return allR.map((f) => [...f.namespace, f.name]);
      },
    }),
    ...all().map((func) => ({ ...func, namespace: [name, ...func.namespace] })),
  ];
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

const definyRpcTypeValueToSafeJsonValue = (value: unknown): unknown => {
  if (value instanceof Set) {
    return [...value].map(definyRpcTypeValueToSafeJsonValue);
  }
  if (value instanceof Map) {
    return Object.fromEntries(
      [...value.entries()].map(([k, v]) => [
        k,
        definyRpcTypeValueToSafeJsonValue(v),
      ])
    );
  }
  if (value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return value;
  }
  if (value instanceof Array) {
    return value.map(definyRpcTypeValueToSafeJsonValue);
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).map(([k, v]) => [
      k,
      definyRpcTypeValueToSafeJsonValue(v),
    ]);
  }
  return value;
};
