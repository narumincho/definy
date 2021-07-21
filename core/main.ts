import * as data from "../localData";
import * as hexString from "./kernelType/hexString";
import * as typeAlias from "./typeAlias";
import { evalExpr, evaluateSuggestionExpr } from "./evaluation";
import { generateElmCode, generateElmCodeAsString } from "./elm";
import { checkTypePartListValidation } from "./validation";
import { exprToDebugString } from "./toDebugString";
import { jsTs } from "../gen/main";
import { typePartMapToVariable } from "./variable/main";

export const stringToValidUserName = (userName: string): string | null => {
  const normalized = normalizeOneLineString(userName);
  const { length } = [...normalized];
  if (length <= 0 || length > 50) {
    return null;
  }
  return normalized;
};

export const stringToValidProjectName = (
  projectName: string
): string | null => {
  const normalized = normalizeOneLineString(projectName);
  const { length } = [...normalized];
  if (length <= 0 || length > 50) {
    return null;
  }
  return normalized;
};

export const stringToValidIdeaName = (ideaName: string): string | null => {
  const normalized = normalizeOneLineString(ideaName);
  const { length } = [...normalized];
  if (length <= 0 || length > 100) {
    return null;
  }
  return normalized;
};

export const stringToValidComment = (comment: string): string | null => {
  const normalized = normalizeMultiLineString(comment);
  const { length } = [...normalized];
  if (length <= 0 || length > 1500) {
    return null;
  }
  return normalized;
};

/**
 * NFKCで正規化して, 改行をLFのみにする
 */
const normalizeMultiLineString = (text: string): string => {
  const normalized = text.normalize("NFKC");
  let result = "";
  for (const char of normalized) {
    const codePoint = char.codePointAt(0);
    if (
      codePoint !== undefined &&
      (codePoint === 0x0a ||
        (codePoint > 0x1f && codePoint < 0x7f) ||
        codePoint > 0xa0)
    ) {
      result += char;
    }
  }
  return result;
};

/**
 * NFKCで正規化して, 先頭末尾の空白をなくし, 空白の連続を1つの空白にまとめ, 改行を取り除く
 */
export const normalizeOneLineString = (text: string): string => {
  const normalized = text.normalize("NFKC").trim();
  let result = "";
  let beforeSpace = false;
  for (const char of normalized) {
    const codePoint = char.codePointAt(0);
    // 制御文字
    if (
      codePoint !== undefined &&
      ((codePoint > 0x1f && codePoint < 0x7f) || codePoint > 0xa0)
    ) {
      if (!(beforeSpace && char === " ")) {
        result += char;
        beforeSpace = char === " ";
      }
    }
  }
  return result;
};

export const generateTypeScriptCodeAsString = (
  typePartMap: ReadonlyMap<data.TypePartId, data.TypePart>
): string => {
  return jsTs.generateCodeAsString(
    generateTypeScriptCode(typePartMap),
    "TypeScript"
  );
};

export const generateJavaScriptCodeAsString = (
  typePartMap: ReadonlyMap<data.TypePartId, data.TypePart>
): string => {
  return jsTs.generateCodeAsString(
    generateTypeScriptCode(typePartMap),
    "JavaScript"
  );
};

export const generateTypeScriptCode = (
  typePartMap: ReadonlyMap<data.TypePartId, data.TypePart>
): data.JsTsCode => {
  // 型パラメータも含めた辞書
  const typePartDataMap = checkTypePartListValidation(typePartMap);
  return {
    exportDefinitionList: [
      data.ExportDefinition.Function(hexString.encodeIdFunction),
      data.ExportDefinition.Function(hexString.idDecodeFunction),
      data.ExportDefinition.Function(hexString.tokenEncodeFunction),
      data.ExportDefinition.Function(hexString.decodeTokenFunction),
      ...typeAlias
        .typePartMapToTypeAlias(typePartDataMap)
        .map(data.ExportDefinition.TypeAlias),
      ...typePartMapToVariable(typePartDataMap).map(
        data.ExportDefinition.Variable
      ),
    ],
    statementList: [],
  };
};

export {
  exprToDebugString,
  evalExpr,
  evaluateSuggestionExpr,
  generateElmCodeAsString,
  generateElmCode,
};
