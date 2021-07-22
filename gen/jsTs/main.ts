import * as d from "../../localData";
import { createIdentifer, initialIdentiferIndex } from "./identifer";
import { UsedNameAndModulePathSet } from "./interface";
import { collectInCode } from "./collect";
import { toString } from "./toString";

export * from "./identifer";
export * from "./interface";

export const generateCodeAsString = (
  code: d.JsTsCode,
  codeType: d.CodeType
): string => {
  // グローバル空間にある名前とimportしたモジュールのパスを集める
  const usedNameAndModulePath: UsedNameAndModulePathSet = collectInCode(code);

  return toString(
    code,
    createImportedModuleName(usedNameAndModulePath),
    codeType
  );
};

/**
 * 使われている名前, モジュールのパスから, モジュールのパスとnamed importの識別子のMapを生成する
 * @param usedNameAndModulePath
 */
const createImportedModuleName = (
  usedNameAndModulePath: UsedNameAndModulePathSet
): ReadonlyMap<string, d.TsIdentifer> => {
  let identiferIndex = initialIdentiferIndex;
  const importedModuleNameMap = new Map<string, d.TsIdentifer>();
  for (const modulePath of usedNameAndModulePath.modulePathSet) {
    const identiferAndNextIdentiferIndex = createIdentifer(
      identiferIndex,
      usedNameAndModulePath.usedNameSet
    );
    importedModuleNameMap.set(
      modulePath,
      identiferAndNextIdentiferIndex.identifer
    );
    identiferIndex = identiferAndNextIdentiferIndex.nextIdentiferIndex;
  }
  return importedModuleNameMap;
};
