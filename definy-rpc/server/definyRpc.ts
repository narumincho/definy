import { DefinyRpcType, list, product, set, string, sum } from "./type.ts";
import { clientBuildResult } from "./client.ts";
import * as base64 from "https://denopkg.com/chiefbiiko/base64@master/mod.ts";

export * from "./type.ts";

const apiFunctionBlandSymbol = Symbol();

type ApiFunction<InputType, OutputType> = {
  readonly name: string;
  readonly namespace: ReadonlyArray<string>;
  readonly input: DefinyRpcType<InputType>;
  readonly output: DefinyRpcType<OutputType>;
  readonly description: string;
  readonly isMutation: boolean;
  readonly resolve: (input: InputType) => Promise<OutputType> | OutputType;
  readonly [apiFunctionBlandSymbol]: typeof apiFunctionBlandSymbol;
};

type E = { [apiFunctionBlandSymbol]: "" };

export const createApiFunction = <InputType, OutputType>(
  parameter: Omit<ApiFunction<InputType, OutputType>, "__apiFunctionBland">
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
        // input が undefined の型以外の場合は, 入力の関数を省く
        return new Response(
          JSON.stringify(
            definyRpcTypeValueToSafeJsonValue(
              func.output,
              func.resolve(jsonValueToDefinyRpcTypeValue(func.input, ""))
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

type Type =
  | {
      readonly type: "string";
    }
  | {
      readonly type: "number";
    }
  | {
      readonly type: "unit";
    }
  | {
      readonly type: "list";
      readonly value: Type;
    };

const Type = (): DefinyRpcType<Type> =>
  sum<Type>({
    fullName: ["definyRpc", "Type"],
    description: "definyRpc で表現できる型",
    patternList: {
      string: {
        description: "string. 文字列",
        parameter: undefined,
      },
      number: {
        description: "number. 数値",
        parameter: undefined,
      },
      unit: {
        description: "unit. 1つの値 (undefined) しか取れない型",
        parameter: undefined,
      },
      list: {
        description: "リスト",
        parameter: () => Type(),
      },
    },
  });

type FunctionDetail = {
  readonly name: ReadonlyArray<string>;
  readonly description: string;
  readonly input: Type;
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
    input: { description: "関数の説明文", type: Type },
  },
});

const addDefinyRpcApiFunction = (
  name: string,
  all: () => ReadonlyArray<ApiFunction<any, any>>
): ReadonlyArray<ApiFunction<any, any>> => {
  return [
    createApiFunction({
      namespace: ["definyRpc"] as const,
      name: "namespaceList",
      description: "get namespace list",
      input: unit,
      output: set<ReadonlyArray<string>>(list<string>(string)),
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
    createApiFunction<string, ReadonlyArray<FunctionDetail>>({
      namespace: ["definyRpc"],
      name: "functionListByName",
      description: "名前から関数を検索する",
      input: string,
      output: list<FunctionDetail>(FunctionDetail),
      isMutation: false,
      resolve: (_searchTerm) => {
        const allR = addDefinyRpcApiFunction(name, all);
        return allR.map((f) => ({
          name: [...f.namespace, f.name],
          description: f.description,
        }));
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

const definyRpcTypeValueToSafeJsonValue = <T>(
  type: DefinyRpcType<T>,
  value: T
): T => {
  // 下の型に合わせて分岐をする
  switch (type.type) {
    case "string": {
      if (typeof value !== "string") {
        throw new Error("expect string");
      }
      return value;
    }
    case "number": {
      if (typeof value !== "number") {
        throw new Error("expect number");
      }
      return value;
    }
    case "unit": {
      if (value !== undefined) {
        throw new Error("expect undefined");
      }
      return null as unknown as T;
    }
    case "list": {
      if (value instanceof Array) {
        return value.map((e) =>
          definyRpcTypeValueToSafeJsonValue(type.element, e)
        ) as unknown as T;
      }
      throw new Error("expect array");
    }
    case "set": {
      if (value instanceof Set) {
        return [...value].map((e) =>
          definyRpcTypeValueToSafeJsonValue(type.element, e)
        ) as unknown as T;
      }
      throw new Error("expect set");
    }
    case "product": {
      if (typeof value === "object" && value !== null) {
        return Object.fromEntries(
          Object.entries(type.fields).map(([fieldName, fieldValue]) => [
            fieldName,
            definyRpcTypeValueToSafeJsonValue<any>(
              fieldValue.type,
              (value as { [key in string]: unknown })[fieldName]
            ),
          ])
        ) as unknown as T;
      }
      throw new Error("expect object in product");
    }
    case "sum": {
      if (typeof value === "object" && value !== null) {
        const objValue: { readonly type?: unknown; readonly value?: unknown } =
          value;
        if ("type" in objValue) {
          if (typeof objValue.type !== "string") {
            throw new Error("expect string type filed in sum");
          }
          const pattern = type.patterns[objValue.type];
          if (pattern === undefined) {
            throw new Error("unknown pattern in sum");
          }
          return {
            type: objValue.type,
            ...(pattern.type === undefined
              ? {}
              : {
                  value: definyRpcTypeValueToSafeJsonValue(
                    pattern.type,
                    objValue.value
                  ),
                }),
          } as unknown as T;
        }
      }
      throw new Error("expect object in sum");
    }
  }
};

const jsonValueToDefinyRpcTypeValue = <T>(
  type: DefinyRpcType<T>,
  value: unknown
): T => {
  switch (type.type) {
    case "string": {
      if (typeof value === "string") {
        return value as unknown as T;
      }
      throw new Error("expect string in string");
    }
    case "number": {
      if (typeof value === "number") {
        return value as unknown as T;
      }
      throw new Error("expect number in number");
    }
    case "unit": {
      return undefined as unknown as T;
    }
    case "list": {
      if (value instanceof Array) {
        return value.map((e) =>
          jsonValueToDefinyRpcTypeValue(type.element, e)
        ) as unknown as T;
      }
      throw new Error("expect array in array");
    }
    case "set": {
      if (value instanceof Array) {
        return new Set(
          value.map((e) => jsonValueToDefinyRpcTypeValue(type.element, e))
        ) as unknown as T;
      }
      throw new Error("expect array in set");
    }
    case "product": {
      if (typeof value === "object" && value !== null) {
        return Object.fromEntries(
          Object.entries(type.fields).map(([fieldName, fieldValue]) => [
            fieldName,
            jsonValueToDefinyRpcTypeValue(
              fieldValue.type,
              (value as any)[fieldName]
            ),
          ])
        ) as unknown as T;
      }
      throw new Error("expect object in product");
    }
    case "sum": {
      if (value === null) {
        throw new Error("expect object in sum. but got null");
      }
      if (typeof value !== "object") {
        throw new Error("expect object in sum");
      }
      const objValue: { readonly type?: unknown; readonly value?: unknown } =
        value;
      if ("type" in objValue) {
        if (typeof objValue.type !== "string") {
          throw new Error("expect string type filed in sum");
        }
        const pattern = type.patterns[objValue.type];
        if (pattern === undefined) {
          throw new Error("unknown pattern in sum");
        }
        return {
          type: objValue.type,
          ...(pattern.type === undefined
            ? {}
            : {
                value: jsonValueToDefinyRpcTypeValue(
                  pattern.type,
                  objValue.value
                ),
              }),
        } as unknown as T;
      }
      throw new Error("expect type field in sum");
    }
  }
};
