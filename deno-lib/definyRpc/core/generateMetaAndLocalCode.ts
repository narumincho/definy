import { groupBy } from "https://deno.land/std@0.167.0/collections/group_by.ts";
import { objectEntriesSameValue } from "../../objectEntriesSameValue.ts";
import { writeTextFileWithLog } from "../../writeFileAndLog.ts";
import { apiFunctionListToCode } from "../codeGen/main.ts";
import {
  fromFunctionNamespace,
  functionNamespaceToString,
} from "../codeGen/namespace.ts";
import { DefinyRpcParameter } from "../server/definyRpc.ts";
import { addDefinyRpcApiFunction } from "./builtInFunctions.ts";

export const generateMetaAndLocalCode = async (
  parameter: DefinyRpcParameter & {
    codeGenOutputFolderPath: URL;
  },
): Promise<void> => {
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
            parameter.codeGenOutputFolderPath,
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
};
