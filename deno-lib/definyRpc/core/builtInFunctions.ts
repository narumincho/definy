import {
  ApiFunction,
  createApiFunction,
  FunctionAndTypeList,
} from "./apiFunction.ts";
import { generateCodeInNamespace } from "../codeGen/main.ts";
import type { DefinyRpcParameter } from "../server/definyRpc.ts";
import {
  DefinyRpcTypeInfo,
  FunctionDetail,
  FunctionNamespace,
  List,
  Namespace,
  String,
  Unit,
} from "./coreType.ts";
import {
  functionNamespaceToString,
  namespaceToString,
} from "../codeGen/namespace.ts";
import { coreTypeInfoList } from "./coreTypeInfo.ts";
import { generateMetaAndLocalCode } from "./generateMetaAndLocalCode.ts";

export const addMetaFunctionAndCoreType = (
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
          addMetaFunctionAndCoreType(parameter).functionsList.map((
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
        const allFunc = addMetaFunctionAndCoreType(parameter);
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
        const allFunc = addMetaFunctionAndCoreType(parameter);
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
      name: "typeList",
      description: "型のリストを返す",
      input: Unit.type(),
      output: List.type(DefinyRpcTypeInfo.type()),
      isMutation: false,
      needAuthentication: false,
      resolve: () => {
        const allFuncAndType = addMetaFunctionAndCoreType(parameter);
        return allFuncAndType.typeList;
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
        const added = addMetaFunctionAndCoreType(parameter);
        return generateCodeInNamespace({
          apiFunctionList: added.functionsList,
          originHint: parameter.originHint,
          pathPrefix: parameter.pathPrefix ?? [],
          usePrettier: true,
          namespace: Namespace.meta,
          typeMap: new Map(
            added.typeList.map((
              type,
            ) => [namespaceToString(type.namespace) + "." + type.name, type]),
          ),
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
          await generateMetaAndLocalCode({
            ...parameter,
            codeGenOutputFolderPath,
          });
        },
      }),
    ]),
  ];
};
