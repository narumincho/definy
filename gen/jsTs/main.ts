import * as d from "../../localData";
import { createIdentifier, initialIdentifierIndex } from "./identifier";
import { UsedNameAndModulePathSet } from "./interface";
import { collectInCode } from "./collect";
import { toString } from "./toString";

export * from "./identifier";
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
): ReadonlyMap<string, d.TsIdentifier> => {
  let identifierIndex = initialIdentifierIndex;
  const importedModuleNameMap = new Map<string, d.TsIdentifier>();
  for (const modulePath of usedNameAndModulePath.modulePathSet) {
    const identifierAndNextIdentifierIndex = createIdentifier(
      identifierIndex,
      usedNameAndModulePath.usedNameSet
    );
    importedModuleNameMap.set(
      modulePath,
      identifierAndNextIdentifierIndex.identifier
    );
    identifierIndex = identifierAndNextIdentifierIndex.nextIdentifierIndex;
  }
  return importedModuleNameMap;
};
