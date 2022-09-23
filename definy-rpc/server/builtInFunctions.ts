import { ApiFunction, createApiFunction } from "./apiFunction.ts";
import { apiFunctionListToCode } from "./clientCodeGen/main.ts";
import type { DefinyRpcParameter } from "./definyRpc.ts";
import { set, string, unit, list, DefinyRpcType, product } from "./type.ts";
import { ensureFile } from "https://deno.land/std@0.157.0/fs/mod.ts";

const definyRpcNamespace = "definyRpc";

type Type = {
  readonly fullName: ReadonlyArray<string>;
  readonly description: string;
  readonly parameters: ReadonlyArray<Type>;
};

const Type: DefinyRpcType<Type> = product<Type>({
  namespace: [definyRpcNamespace],
  name: "Type",
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
  namespace: [definyRpcNamespace],
  name: "FunctionDetail",
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
  parameter: DefinyRpcParameter
): ReadonlyArray<ApiFunction> => {
  return [
    ...builtInFunctions(parameter),
    ...parameter.all().map((func) => ({
      ...func,
      fullName: [parameter.name, ...func.fullName] as const,
    })),
  ];
};

const builtInFunctions = (parameter: DefinyRpcParameter) => {
  return [
    createApiFunction({
      fullName: [definyRpcNamespace, "name"],
      description: "サーバー名の取得",
      input: unit,
      output: string,
      needAuthentication: false,
      isMutation: false,
      resolve: () => {
        return parameter.name;
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
              addDefinyRpcApiFunction(parameter).map((func) =>
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
        const allFunc = addDefinyRpcApiFunction(parameter);
        return allFunc.map<FunctionDetail>((f) => ({
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
        const allFunc = addDefinyRpcApiFunction(parameter);
        return allFunc.map<FunctionDetail>((f) => ({
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
        const allFunc = addDefinyRpcApiFunction(parameter).filter(
          (f) => f.fullName[0] === definyRpcNamespace
        );
        return apiFunctionListToCode(allFunc, parameter.originHint, true);
      },
    }),
    ...(parameter.codeGenOutputFolderPath === undefined
      ? []
      : [
          createApiFunction({
            fullName: [
              definyRpcNamespace,
              "generateCodeAndWriteAsFileInServer",
            ],
            description:
              "サーバーが実行している環境でコードを生成し, ファイルとして保存する",
            input: unit,
            output: unit,
            isMutation: false,
            needAuthentication: false,
            resolve: async () => {
              const allFunc = addDefinyRpcApiFunction(parameter).filter(
                (f) => f.fullName[0] === definyRpcNamespace
              );

              const path =
                parameter.codeGenOutputFolderPath + "/" + "definyRpc.ts";
              await ensureFile(path);
              await Deno.writeTextFile(
                path,
                await apiFunctionListToCode(allFunc, parameter.originHint, true)
              );
              return undefined;
            },
          }),
        ]),
  ];
};

const definyRpcTypeBodyToType = <t>(definyRpcType: DefinyRpcType<t>): Type => {
  return {
    fullName: [...definyRpcType.namespace, definyRpcType.name],
    description: definyRpcType.description,
    parameters: definyRpcType.parameters.map(definyRpcTypeBodyToType),
  };
};
