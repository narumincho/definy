import * as collect from "./collect";
import * as d from "../../data";
import * as identifer from "./identifer";
import * as toString from "./toString";
import * as util from "./util";

export { d, identifer, util };

export const generateCodeAsString = (
  code: d.JsTsCode,
  codeType: d.CodeType
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
): ReadonlyMap<string, d.TsIdentifer> => {
  let identiferIndex = identifer.initialIdentiferIndex;
  const importedModuleNameMap = new Map<string, d.TsIdentifer>();
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
