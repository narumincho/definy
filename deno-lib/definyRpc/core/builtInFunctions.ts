import {
  ApiFunction,
  createApiFunction,
  FunctionAndTypeList,
} from "./apiFunction.ts";
import { apiFunctionListToCode } from "../codeGen/main.ts";
import type { DefinyRpcParameter } from "../server/definyRpc.ts";
import { writeTextFileWithLog } from "../../writeFileAndLog.ts";
import { objectEntriesSameValue } from "../../objectEntriesSameValue.ts";
import { groupBy } from "https://deno.land/std@0.167.0/collections/group_by.ts";
import {
  FunctionDetail,
  FunctionNamespace,
  List,
  Namespace,
  String,
  Unit,
} from "./coreType.ts";
import {
  fromFunctionNamespace,
  functionNamespaceToString,
} from "../codeGen/namespace.ts";
import { coreTypeInfoList } from "./coreTypeInfo.ts";

export const addDefinyRpcApiFunction = (
  parameter: DefinyRpcParameter,
): FunctionAndTypeList => {
  const all = parameter.all();
  return {
    functionsList: [
      ...builtInFunctions(parameter),
      ...all.functionsList,
    ],
    typeList: [
      ...all.typeList,
      ...coreTypeInfoList,
    ],
  };
};

const builtInFunctions = (
  parameter: DefinyRpcParameter,
): ReadonlyArray<ApiFunction> => {
  const codeGenOutputFolderPath = parameter.codeGenOutputFolderPath;
  return [
    createApiFunction({
      namespace: FunctionNamespace.meta,
      name: "name",
      description: "サーバー名の取得",
      input: Unit.type(),
      output: String.type(),
      needAuthentication: false,
      isMutation: false,
      resolve: () => {
        return parameter.name;
      },
    }),
    createApiFunction({
      namespace: FunctionNamespace.meta,
      name: "namespaceList",
      description:
        "get namespace list. namespace は API の公開非公開, コード生成のモジュールを分けるチャンク. JavaScriptのSetの仕様上, オブジェクトのSetはうまく扱えないので List にしている",
      input: Unit.type(),
      output: List.type(FunctionNamespace.type()),
      needAuthentication: false,
      isMutation: false,
      resolve: () => {
        return [...new Map(
          addDefinyRpcApiFunction(parameter).functionsList.map((
            func,
          ) => [
            functionNamespaceToString(func.namespace),
            func.namespace,
          ]),
        ).values()];
      },
    }),
    createApiFunction({
      namespace: FunctionNamespace.meta,
      name: "functionListByName",
      description: "名前から関数を検索する (公開APIのみ)",
      input: Unit.type(),
      output: List.type(FunctionDetail.type()),
      isMutation: false,
      needAuthentication: false,
      resolve: () => {
        const allFunc = addDefinyRpcApiFunction(parameter);
        return allFunc.functionsList.map<FunctionDetail>((f) =>
          FunctionDetail.from({
            namespace: f.namespace,
            name: f.name,
            description: f.description,
            input: f.input,
            output: f.output,
            isMutation: f.isMutation,
            needAuthentication: f.needAuthentication,
          })
        );
      },
    }),
    createApiFunction({
      namespace: FunctionNamespace.meta,
      name: "functionListByNamePrivate",
      description: "名前から関数を検索する (非公開API)",
      input: Unit.type(),
      output: List.type(FunctionDetail.type()),
      isMutation: false,
      needAuthentication: true,
      resolve: (_, _accountToken) => {
        const allFunc = addDefinyRpcApiFunction(parameter);
        return allFunc.functionsList.map<FunctionDetail>((f) =>
          FunctionDetail.from({
            namespace: f.namespace,
            name: f.name,
            description: f.description,
            input: f.input,
            output: f.output,
            isMutation: f.isMutation,
            needAuthentication: f.needAuthentication,
          })
        );
      },
    }),
    createApiFunction({
      namespace: FunctionNamespace.meta,
      name: "generateCallDefinyRpcTypeScriptCode",
      description: "名前空間「definyRpc」のApiFunctionを呼ぶ TypeScript のコードを生成する",
      input: Unit.type(),
      output: String.type(),
      isMutation: false,
      needAuthentication: false,
      resolve: () => {
        const allFunc = addDefinyRpcApiFunction(parameter).functionsList.filter(
          (f) => f.namespace.type === "meta",
        );
        return apiFunctionListToCode({
          apiFunctionList: allFunc,
          originHint: parameter.originHint,
          pathPrefix: parameter.pathPrefix ?? [],
          usePrettier: true,
          namespace: Namespace.meta,
          typeList: [],
        });
      },
    }),
    ...(codeGenOutputFolderPath === undefined ? [] : [
      createApiFunction({
        namespace: FunctionNamespace.meta,
        name: "generateCodeAndWriteAsFileInServer",
        description: "サーバーが実行している環境でコードを生成し, ファイルとして保存する. \n 保存先:" +
          codeGenOutputFolderPath.toString(),
        input: Unit.type(),
        output: Unit.type(),
        isMutation: false,
        needAuthentication: false,
        resolve: async () => {
          const allFunc = addDefinyRpcApiFunction(parameter).functionsList;

          await Promise.all(
            objectEntriesSameValue(
              groupBy(allFunc, (f) => functionNamespaceToString(f.namespace)),
            ).map(
              async ([_, funcList]) => {
                if (funcList === undefined) {
                  return;
                }
                const firstFunc = funcList[0];
                if (firstFunc === undefined) {
                  return;
                }
                await writeTextFileWithLog(
                  new URL(
                    (firstFunc.namespace.type === "meta"
                      ? "meta"
                      : parameter.name + "/" +
                        firstFunc.namespace.value.join("/")) + ".ts",
                    codeGenOutputFolderPath,
                  ),
                  apiFunctionListToCode({
                    apiFunctionList: funcList,
                    originHint: parameter.originHint,
                    pathPrefix: parameter.pathPrefix ?? [],
                    usePrettier: true,
                    namespace: fromFunctionNamespace(firstFunc.namespace),
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
