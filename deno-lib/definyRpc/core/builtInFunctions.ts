import {
  ApiFunction,
  createApiFunction,
  FunctionAndTypeList,
} from "./apiFunction.ts";
import { apiFunctionListToCode } from "../codeGen/main.ts";
import type { DefinyRpcParameter } from "../server/definyRpc.ts";
import { DefinyRpcType } from "./type.ts";
import { writeTextFileWithLog } from "../../writeFileAndLog.ts";
import { stringArrayEqual } from "../../util.ts";
import { list, product, set, string, unit } from "./builtInType.ts";
import { definyRpcNamespace } from "./definyRpcNamespace.ts";
import { objectEntriesSameValue } from "../../objectEntriesSameValue.ts";
import { join } from "https://deno.land/std@0.156.0/path/mod.ts";
import { groupBy } from "https://deno.land/std@0.166.0/collections/group_by.ts";
import { StructuredJsonValue } from "./coreType.ts";

type Type = {
  readonly namespace: ReadonlyArray<string>;
  readonly name: string;
  readonly description: string;
  readonly parameters: ReadonlyArray<Type>;
};

const Type: DefinyRpcType<Type> = product<Type>({
  namespace: [definyRpcNamespace],
  name: "Type",
  description: "definyRpc で表現できる型",
  fieldList: {
    namespace: {
      type: list(string),
      description: "名前空間",
    },
    name: {
      type: string,
      description: "型の名前",
    },
    description: {
      type: string,
      description: "説明文",
    },
    parameters: {
      type: () => list(Type),
      description: "型パラメーター",
    },
  },
});

type FunctionDetail = {
  readonly namespace: ReadonlyArray<string>;
  readonly name: string;
  readonly description: string;
  readonly input: Type;
  readonly output: Type;
};

const FunctionDetail = product<FunctionDetail>({
  namespace: [definyRpcNamespace],
  name: "FunctionDetail",
  description: "functionByNameの結果",
  fieldList: {
    namespace: {
      description: "名前空間",
      type: list<string>(string),
    },
    name: {
      description: "関数名",
      type: string,
    },
    description: { description: "関数の説明文", type: string },
    input: { description: "関数の入力の型", type: Type },
    output: { description: "関数の出力の型", type: Type },
  },
});

export const addDefinyRpcApiFunction = (
  parameter: DefinyRpcParameter,
): FunctionAndTypeList => {
  const all = parameter.all();
  return {
    functionsList: [
      ...builtInFunctions(parameter),
      ...all.functionsList,
    ],
    typeList: all.typeList,
  };
};

const builtInFunctions = (
  parameter: DefinyRpcParameter,
): ReadonlyArray<ApiFunction> => {
  const codeGenOutputFolderPath = parameter.codeGenOutputFolderPath;
  return [
    createApiFunction({
      namespace: [definyRpcNamespace],
      name: "name",
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
      namespace: [definyRpcNamespace],
      name: "namespaceList",
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
              addDefinyRpcApiFunction(parameter).functionsList.map((func) =>
                func.namespace.join(".")
              ),
            ),
          ].map((e) => e.split(".")),
        );
      },
    }),
    createApiFunction({
      namespace: [definyRpcNamespace],
      name: "functionListByName",
      description: "名前から関数を検索する (公開APIのみ)",
      input: unit,
      output: list<FunctionDetail>(FunctionDetail),
      isMutation: false,
      needAuthentication: false,
      resolve: () => {
        const allFunc = addDefinyRpcApiFunction(parameter);
        return allFunc.functionsList.map<FunctionDetail>((f) => ({
          namespace: f.namespace,
          name: f.name,
          description: f.description,
          input: definyRpcTypeBodyToType(f.input),
          output: definyRpcTypeBodyToType(f.output),
        }));
      },
    }),
    createApiFunction({
      namespace: [definyRpcNamespace],
      name: "functionListByNamePrivate",
      description: "名前から関数を検索する (非公開API)",
      input: unit,
      output: list<FunctionDetail>(FunctionDetail),
      isMutation: false,
      needAuthentication: true,
      resolve: (_, _accountToken) => {
        const allFunc = addDefinyRpcApiFunction(parameter);
        return allFunc.functionsList.map<FunctionDetail>((f) => ({
          namespace: f.namespace,
          name: f.name,
          description: f.description,
          input: definyRpcTypeBodyToType(f.input),
          output: definyRpcTypeBodyToType(f.output),
        }));
      },
    }),
    createApiFunction({
      namespace: [definyRpcNamespace],
      name: "generateCallDefinyRpcTypeScriptCode",
      description: "名前空間「definyRpc」のApiFunctionを呼ぶ TypeScript のコードを生成する",
      input: unit,
      output: string,
      isMutation: false,
      needAuthentication: false,
      resolve: () => {
        const allFunc = addDefinyRpcApiFunction(parameter).functionsList.filter(
          (f) => stringArrayEqual(f.namespace, [definyRpcNamespace]),
        );
        return apiFunctionListToCode({
          apiFunctionList: allFunc,
          originHint: parameter.originHint,
          pathPrefix: parameter.pathPrefix ?? [],
          usePrettier: true,
          namespace: { type: "local", path: [definyRpcNamespace] },
          typeList: [],
        });
      },
    }),
    createApiFunction({
      namespace: [definyRpcNamespace],
      name: "callQuery",
      description: "指定した名前の関数を呼ぶ",
      input: list(string),
      output: structuredJsonValue,
      isMutation: false,
      needAuthentication: false,
      resolve: async (input): Promise<StructuredJsonValue> => {
        for (const func of addDefinyRpcApiFunction(parameter).functionsList) {
          if (stringArrayEqual([...func.namespace, func.name], input)) {
            if (
              func.input.name !== "unit"
            ) {
              return StructuredJsonValue.string(
                "need input parameter. まだサポートしてない",
              );
            }
            return (func.output.toStructuredJsonValue(
              await func.resolve(undefined, undefined),
            ));
          }
        }
        return StructuredJsonValue.string("error: not found");
      },
    }),
    ...(codeGenOutputFolderPath === undefined ? [] : [
      createApiFunction({
        namespace: [definyRpcNamespace],
        name: "generateCodeAndWriteAsFileInServer",
        description: "サーバーが実行している環境でコードを生成し, ファイルとして保存する. \n 保存先:" +
          codeGenOutputFolderPath,
        input: unit,
        output: unit,
        isMutation: false,
        needAuthentication: false,
        resolve: async () => {
          const allFunc = addDefinyRpcApiFunction(parameter).functionsList;

          await Promise.all(
            objectEntriesSameValue(
              groupBy(allFunc, (f) => f.namespace.join(".")),
            ).map(
              async ([namespace, funcList]) => {
                if (funcList === undefined) {
                  return;
                }
                const firstFunc = funcList[0];
                if (firstFunc === undefined) {
                  return;
                }
                await writeTextFileWithLog(
                  join(
                    codeGenOutputFolderPath,
                    ...firstFunc.namespace.slice(0, -1),
                    firstFunc.namespace.at(-1) + ".ts",
                  ),
                  apiFunctionListToCode({
                    apiFunctionList: funcList,
                    originHint: parameter.originHint,
                    pathPrefix: parameter.pathPrefix ?? [],
                    usePrettier: true,
                    namespace: { type: "local", path: namespace.split(".") },
                    typeList: [],
                  }),
                );
              },
            ),
          );

          return undefined;
        },
      }),
    ]),
  ];
};

const definyRpcTypeBodyToType = <t>(definyRpcType: DefinyRpcType<t>): Type => {
  return {
    namespace: definyRpcType.namespace,
    name: definyRpcType.name,
    description: definyRpcType.description,
    parameters: definyRpcType.parameters.map(definyRpcTypeBodyToType),
  };
};
