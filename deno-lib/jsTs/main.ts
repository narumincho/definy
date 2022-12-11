import {
  createIdentifier,
  initialIdentifierIndex,
  TsIdentifier,
} from "./identifier.ts";
import { UsedNameAndModulePathSet } from "./interface.ts";
import { collectInCode } from "./collect.ts";
import { toString } from "./toString.ts";
import * as d from "./data.ts";
export * from "./identifier.ts";
export * from "./interface.ts";
export * as data from "./data.ts";

export const generateCodeAsString = (
  code: d.JsTsCode,
  codeType: d.CodeType,
): string => {
  // グローバル空間にある名前とimportしたモジュールのパスを集める
  const usedNameAndModulePath: UsedNameAndModulePathSet = collectInCode(code);

  return toString(
    code,
    {
      moduleMap: createImportedModuleName(usedNameAndModulePath),
      usedNameSet: usedNameAndModulePath.usedNameSet,
      codeType,
    },
  );
};

/**
 * 使われている名前, モジュールのパスから, モジュールのパスとnamed importの識別子のMapを生成する
 * @param usedNameAndModulePath
 */
const createImportedModuleName = (
  usedNameAndModulePath: UsedNameAndModulePathSet,
): ReadonlyMap<string, TsIdentifier> => {
  let identifierIndex = initialIdentifierIndex;
  const importedModuleNameMap = new Map<string, TsIdentifier>();
  for (const modulePath of usedNameAndModulePath.modulePathSet) {
    const identifierAndNextIdentifierIndex = createIdentifier(
      identifierIndex,
      usedNameAndModulePath.usedNameSet,
    );
    importedModuleNameMap.set(
      modulePath,
      identifierAndNextIdentifierIndex.identifier,
    );
    identifierIndex = identifierAndNextIdentifierIndex.nextIdentifierIndex;
  }
  return importedModuleNameMap;
};
