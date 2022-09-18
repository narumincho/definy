import { ApiFunction, createApiFunction } from "./apiFunction.ts";
import { set, string, unit, list, DefinyRpcType, product } from "./type.ts";

const definyRpcNamespace = "definyRpc";

type Type = {
  readonly fullName: ReadonlyArray<string>;
  readonly description: string;
  readonly parameters: ReadonlyArray<Type>;
};

const Type: DefinyRpcType<Type> = product<Type>({
  fullName: [definyRpcNamespace, "Type"],
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
  fullName: [definyRpcNamespace, "FunctionDetail"],
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

export const addDefinyRpcApiFunction = (
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
      fullName: [definyRpcNamespace, "name"],
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
      fullName: [definyRpcNamespace, "namespaceList"],
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
      fullName: [definyRpcNamespace, "functionListByName"],
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
      fullName: [definyRpcNamespace, "functionListByNamePrivate"],
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
    createApiFunction({
      fullName: [definyRpcNamespace, "generateCallDefinyRpcTypeScriptCode"],
      description:
        "名前空間「definyRpc」のApiFunctionを呼ぶ TypeScript のコードを生成する",
      input: unit,
      output: string,
      isMutation: false,
      needAuthentication: false,
      resolve: () => {
        const allR = addDefinyRpcApiFunction(name, all).filter(
          (f) => f.fullName[0] === definyRpcNamespace
        );
        return allR.map((f) => f.fullName.join(".")).join("/");
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
