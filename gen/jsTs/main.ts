import * as collect from "./collect";
import * as identifer from "./identifer";
import * as toString from "./toString";
import * as util from "./util";
import { CodeType, Identifer, JsTsCode } from "./data";

export const generateCodeAsString = (
  code: JsTsCode,
  codeType: CodeType
): string => {
  // グローバル空間にある名前とimportしたモジュールのパスを集める
  const usedNameAndModulePath: util.UsedNameAndModulePathSet = collect.collectInCode(
    code
  );

  return toString.toString(
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
  usedNameAndModulePath: util.UsedNameAndModulePathSet
): ReadonlyMap<string, Identifer> => {
  let identiferIndex = identifer.initialIdentiferIndex;
  const importedModuleNameMap = new Map<string, Identifer>();
  for (const modulePath of usedNameAndModulePath.modulePathSet) {
    const identiferAndNextIdentiferIndex = identifer.createIdentifer(
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
