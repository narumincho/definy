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
import {
  list,
  product,
  set,
  string,
  structuredJsonValue,
  sum,
  unit,
} from "./builtInType.ts";
import { definyRpcNamespace } from "./definyRpcNamespace.ts";
import { StructuredJsonValue } from "../../typedJson.ts";
import { objectEntriesSameValue } from "../../objectEntriesSameValue.ts";
import { join } from "https://deno.land/std@0.156.0/path/mod.ts";
import { groupBy } from "https://deno.land/std@0.165.0/collections/group_by.ts";

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

/**
 * ApiFunction で指定されていない型
 */
const builtInTypes: ReadonlyArray<DefinyRpcType<any>> = [
  sum({
    namespace: [definyRpcNamespace],
    name: "ResultImpl",
    description: "",
    // パラメーターを考慮していない!
    patternList: {
      ok: {
        description: "okってこと",
        parameter: undefined,
      },
      error: {
        description: "errorってこと",
        parameter: undefined,
      },
    },
  }),
];

export const addDefinyRpcApiFunction = (
  parameter: DefinyRpcParameter,
): FunctionAndTypeList => {
  const all = parameter.all();
  return {
    functionsList: [
      ...builtInFunctions(parameter),
      ...all.functionsList.map((func) => ({
        ...func,
        fullName: [parameter.name, ...func.fullName] as const,
      })),
    ],
    typeList: [
      ...builtInTypes,
      ...all.typeList.map((type) => ({
        ...type,
        namespace: [parameter.name, ...type.namespace] as const,
      })),
    ],
  };
};

const builtInFunctions = (
  parameter: DefinyRpcParameter,
): ReadonlyArray<ApiFunction> => {
  const codeGenOutputFolderPath = parameter.codeGenOutputFolderPath;
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
              addDefinyRpcApiFunction(parameter).functionsList.map((func) =>
                func.fullName.slice(0, -1).join(".")
              ),
            ),
          ].map((e) => e.split(".")),
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
        return allFunc.functionsList.map<FunctionDetail>((f) => ({
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
        return allFunc.functionsList.map<FunctionDetail>((f) => ({
          name: f.fullName,
          description: f.description,
          input: definyRpcTypeBodyToType(f.input),
          output: definyRpcTypeBodyToType(f.output),
        }));
      },
    }),
    createApiFunction({
      fullName: [definyRpcNamespace, "generateCallDefinyRpcTypeScriptCode"],
      description: "名前空間「definyRpc」のApiFunctionを呼ぶ TypeScript のコードを生成する",
      input: unit,
      output: string,
      isMutation: false,
      needAuthentication: false,
      resolve: () => {
        const allFunc = addDefinyRpcApiFunction(parameter).functionsList.filter(
          (f) => stringArrayEqual(f.fullName, [definyRpcNamespace]),
        );
        return apiFunctionListToCode({
          apiFunctionList: allFunc,
          originHint: parameter.originHint,
          pathPrefix: parameter.pathPrefix ?? [],
          usePrettier: true,
          namespace: [definyRpcNamespace],
        });
      },
    }),
    createApiFunction({
      fullName: [definyRpcNamespace, "callQuery"],
      description: "指定した名前の関数を呼ぶ",
      input: list(string),
      output: structuredJsonValue,
      isMutation: false,
      needAuthentication: false,
      resolve: async (input): Promise<StructuredJsonValue> => {
        for (const func of addDefinyRpcApiFunction(parameter).functionsList) {
          if (stringArrayEqual(func.fullName, input)) {
            if (
              func.input.name !== "unit"
            ) {
              return { type: "string", value: "need input parameter" };
            }
            return (func.output.toStructuredJsonValue(
              await func.resolve(undefined, undefined),
            ));
          }
        }
        return { type: "string", value: "error: not found" };
      },
    }),
    ...(codeGenOutputFolderPath === undefined ? [] : [
      createApiFunction({
        fullName: [
          definyRpcNamespace,
          "generateCodeAndWriteAsFileInServer",
        ],
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
              groupBy(allFunc, (f) => f.fullName.slice(0, -1).join("/")),
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
                    ...firstFunc.fullName.slice(0, -2),
                    firstFunc.fullName.at(-2) + ".ts",
                  ),
                  apiFunctionListToCode({
                    apiFunctionList: funcList,
                    originHint: parameter.originHint,
                    pathPrefix: parameter.pathPrefix ?? [],
                    usePrettier: true,
                    namespace: namespace.split("/"),
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
    fullName: [...definyRpcType.namespace, definyRpcType.name],
    description: definyRpcType.description,
    parameters: definyRpcType.parameters.map(definyRpcTypeBodyToType),
  };
};
