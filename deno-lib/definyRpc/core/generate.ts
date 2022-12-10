import { writeTextFileWithLog } from "../../writeFileAndLog.ts";
import { apiFunctionListToCode } from "../codeGen/main.ts";
import { coreTypeInfoList } from "./coreTypeInfo.ts";
import { Namespace } from "./coreType.ts";

/**
 * `./coreType.ts` を生成する
 */
export const generateCoreCode = async (): Promise<void> => {
  const code = apiFunctionListToCode({
    apiFunctionList: [],
    namespace: Namespace.coreType,
    originHint: "",
    pathPrefix: [],
    usePrettier: true,
    typeList: coreTypeInfoList,
  });
  await writeTextFileWithLog(
    new URL(import.meta.resolve("./coreTypeNew.ts")),
    code,
  );
};
