import { DefinyRpcType, list, product, set, string, unit } from "./type.ts";
import { clientBuildResult } from "./client.ts";
import * as base64 from "https://denopkg.com/chiefbiiko/base64@master/mod.ts";
import { jsonParse } from "./typedJson.ts";

export * from "./type.ts";

type ApiFunction<InputType, OutputType, NeedAuthentication extends boolean> = {
  readonly fullName: readonly [string, ...ReadonlyArray<string>];
  readonly input: DefinyRpcType<InputType>;
  readonly output: DefinyRpcType<OutputType>;
  /**
   * 認証が必要かどうか
   * https://narumincho.notion.site/c5cbc02963c24733abe93fcd2fab2b73?v=3ec614a2ca0046c9bae9efbf8c0ea4e3
   */
  readonly needAuthentication: NeedAuthentication;
  readonly description: string;
  readonly isMutation: boolean;
  readonly resolve: (
    input: InputType,
    accountToken: NeedAuthentication extends true ? AccountToken : undefined
  ) => Promise<OutputType> | OutputType;
  readonly [Symbol.toStringTag]: "ApiFunction";
};

export type AccountToken = string & { __accountToken: never };

export const createApiFunction = <
  InputType,
  OutputType,
  NeedAuthentication extends boolean
>(
  parameter: Omit<
    ApiFunction<InputType, OutputType, NeedAuthentication>,
    typeof Symbol.toStringTag
  >
): ApiFunction<InputType, OutputType, NeedAuthentication> => {
  return {
    ...parameter,
    [Symbol.toStringTag]: "ApiFunction",
  };
};

export const createHttpServer = (parameter: {
  readonly name: string;
  // deno-lint-ignore no-explicit-any
  readonly all: () => ReadonlyArray<ApiFunction<any, any, boolean>>;
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
    console.log(pathList);
    for (const func of all) {
      if (stringArrayEqual(pathList, func.fullName)) {
        // input が undefined の型以外の場合は, 入力の関数を省く
        return new Response(
          JSON.stringify(
            func.output.toJson(
              func.resolve(
                func.input.fromJson(paramJsonParsed),
                getAuthorization(
                  func.needAuthentication,
                  request.headers.get("authorization") ?? undefined
                )
              )
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

const getAuthorization = (
  needAuthentication: boolean,
  authorizationHeaderValue: string | undefined
): AccountToken | undefined => {
  if (needAuthentication) {
    if (typeof authorizationHeaderValue === "string") {
      return authorizationHeaderValue as AccountToken;
    }
    throw new Error("need authentication header value");
  }
  return undefined;
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
  // deno-lint-ignore no-explicit-any
  all: () => ReadonlyArray<ApiFunction<any, any, boolean>>
  // deno-lint-ignore no-explicit-any
): ReadonlyArray<ApiFunction<any, any, boolean>> => {
  return [
    ...builtInFunctions(name, all),
    ...all().map((func) => ({
      ...func,
      fullName: [name, ...func.fullName] as const,
    })),
  ];
};

const builtInFunctions = (
  name: string,
  // deno-lint-ignore no-explicit-any
  all: () => ReadonlyArray<ApiFunction<any, any, boolean>>
) => {
  return [
    createApiFunction({
      fullName: ["definyRpc", "name"],
      description: "サーバー名の取得",
      input: unit,
      output: string,
      needAuthentication: false,
      isMutation: false,
      resolve: () => {
        return name;
      },
    }),
    createApiFunction({
      fullName: ["definyRpc", "namespaceList"],
      description:
        "get namespace list. namespace は API の公開非公開, コード生成のモジュールを分けるチャンク",
      input: unit,
      output: set<ReadonlyArray<string>>(list<string>(string)),
      needAuthentication: false,
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
      description: "名前から関数を検索する (公開APIのみ)",
      input: unit,
      output: list<FunctionDetail>(FunctionDetail),
      isMutation: false,
      needAuthentication: false,
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
    createApiFunction({
      fullName: ["definyRpc", "functionListByNamePrivate"],
      description: "名前から関数を検索する (非公開API)",
      input: unit,
      output: list<FunctionDetail>(FunctionDetail),
      isMutation: false,
      needAuthentication: true,
      resolve: (_, _accountToken) => {
        const allR = addDefinyRpcApiFunction(name, all);
        return allR.map<FunctionDetail>((f) => ({
          name: f.fullName,
          description: f.description,
          input: definyRpcTypeBodyToType(f.input),
          output: definyRpcTypeBodyToType(f.output),
        }));
      },
    }),
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
