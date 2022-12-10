import { groupBy } from "https://deno.land/std@0.167.0/collections/group_by.ts";
import { objectEntriesSameValue } from "../../objectEntriesSameValue.ts";
import { writeTextFileWithLog } from "../../writeFileAndLog.ts";
import { apiFunctionListToCode } from "../codeGen/main.ts";
import {
  fromFunctionNamespace,
  functionNamespaceToString,
  namespaceToString,
} from "../codeGen/namespace.ts";
import { DefinyRpcParameter } from "../server/definyRpc.ts";
import { ApiFunction } from "./apiFunction.ts";
import { addDefinyRpcApiFunction } from "./builtInFunctions.ts";
import { DefinyRpcTypeInfo } from "./coreType.ts";

export const generateMetaAndLocalCode = async (
  parameter: DefinyRpcParameter & {
    codeGenOutputFolderPath: URL;
  },
): Promise<void> => {
  const allFuncAndType = addDefinyRpcApiFunction(parameter);

  await Promise.all(
    objectEntriesSameValue(
      groupBy(
        [
          ...allFuncAndType.functionsList.map((func): FunctionOrType => ({
            type: "function",
            value: func,
          })),
          ...allFuncAndType.typeList.map((t): FunctionOrType => ({
            type: "type",
            value: t,
          })),
        ],
        (funcOrType) => {
          switch (funcOrType.type) {
            case "function":
              return functionNamespaceToString(funcOrType.value.namespace);
            case "type":
              return namespaceToString(funcOrType.value.namespace);
          }
        },
      ),
    ).map(
      async ([_, funcOrTypeList]) => {
        if (funcOrTypeList === undefined) {
          return;
        }
        const firstFuncOrType = funcOrTypeList[0];
        if (firstFuncOrType === undefined) {
          return;
        }
        if (
          !(firstFuncOrType.value.namespace.type === "meta" ||
            firstFuncOrType.value.namespace.type === "local")
        ) {
          return;
        }
        await writeTextFileWithLog(
          new URL(
            (firstFuncOrType.value.namespace.type === "meta" ? "meta" : "api/" +
              firstFuncOrType.value.namespace.value.join("/")) + ".ts",
            parameter.codeGenOutputFolderPath,
          ),
          apiFunctionListToCode({
            apiFunctionList: funcOrTypeList.flatMap((funcOrType) =>
              funcOrType.type === "function" ? [funcOrType.value] : []
            ),
            originHint: parameter.originHint,
            pathPrefix: parameter.pathPrefix ?? [],
            usePrettier: true,
            namespace: firstFuncOrType.type === "function"
              ? fromFunctionNamespace(firstFuncOrType.value.namespace)
              : firstFuncOrType.value.namespace,
            typeList: allFuncAndType.typeList,
            // typeList: funcOrTypeList.flatMap((funcOrType) =>
            //   funcOrType.type === "type" ? [funcOrType.value] : []
            // ),
          }),
        );
      },
    ),
  );
};

type FunctionOrType =
  | { readonly type: "function"; readonly value: ApiFunction }
  | {
    readonly type: "type";
    readonly value: DefinyRpcTypeInfo;
  };
