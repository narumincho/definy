import { writeTextFileWithLog } from "../../writeFileAndLog.ts";
import { generateCodeInNamespace } from "../codeGen/main.ts";
import { coreTypeInfoList } from "./coreTypeInfo.ts";
import { Namespace } from "./coreType.ts";
import { namespaceToString } from "../codeGen/namespace.ts";

/**
 * `./coreType.ts` を生成する
 */
export const generateCoreCode = async (): Promise<void> => {
  const code = generateCodeInNamespace({
    apiFunctionList: [],
    namespace: Namespace.coreType,
    originHint: "",
    pathPrefix: [],
    usePrettier: true,
    typeMap: new Map(coreTypeInfoList.map(
      (typeInfo) => [
        namespaceToString(typeInfo.namespace) + "." + typeInfo.name,
        typeInfo,
      ],
    )),
  });
  await writeTextFileWithLog(
    new URL(import.meta.resolve("./coreTypeNew.ts")),
    code,
  );
};
