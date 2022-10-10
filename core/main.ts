import * as d from "../localData";
import * as hexString from "./kernelType/hexString";
import * as typeAlias from "./typeAlias";
import { evalExpr, evaluateSuggestionExpr } from "./evaluation";
import { generateElmCode, generateElmCodeAsString } from "./elm";
import type { TypePartIdAndMessage } from "./TypePartIdAndMessage";
import { checkTypePartListValidation } from "./validation";
import { exprToDebugString } from "./toDebugString";
import { jsTs } from "../deno-lib/npm";
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
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.Result<string, ReadonlyArray<TypePartIdAndMessage>> => {
  const code = generateTypeScriptCode(typePartMap);
  if (code._ === "Error") {
    return d.Result.Error(code.error);
  }
  return d.Result.Ok(jsTs.generateCodeAsString(code.ok, "TypeScript"));
};

export const generateJavaScriptCodeAsString = (
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.Result<string, ReadonlyArray<TypePartIdAndMessage>> => {
  const code = generateTypeScriptCode(typePartMap);
  if (code._ === "Error") {
    return d.Result.Error(code.error);
  }
  return d.Result.Ok(jsTs.generateCodeAsString(code.ok, "JavaScript"));
};

export const generateTypeScriptCode = (
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.Result<jsTs.data.JsTsCode, ReadonlyArray<TypePartIdAndMessage>> => {
  // バリデーション
  const validationResult = checkTypePartListValidation(typePartMap);
  if (validationResult.length !== 0) {
    return d.Result.Error(validationResult);
  }

  const typeAliasResult = typeAlias.typePartMapToTypeAlias(typePartMap);
  if (typeAliasResult._ === "Error") {
    return d.Result.Error(typeAliasResult.error);
  }

  return d.Result.Ok<jsTs.data.JsTsCode, ReadonlyArray<TypePartIdAndMessage>>({
    exportDefinitionList: [
      { type: "function", function: hexString.encodeIdFunction },
      { type: "function", function: hexString.idDecodeFunction },
      { type: "function", function: hexString.tokenEncodeFunction },
      { type: "function", function: hexString.decodeTokenFunction },
      ...typeAliasResult.ok.map(
        (t): jsTs.data.ExportDefinition => ({
          type: "typeAlias",
          typeAlias: t,
        })
      ),
      ...typePartMapToVariable(typePartMap).map(
        (variable): jsTs.data.ExportDefinition => ({
          type: "variable",
          variable,
        })
      ),
    ],
    statementList: [],
  });
};

export {
  exprToDebugString,
  evalExpr,
  evaluateSuggestionExpr,
  generateElmCodeAsString,
  generateElmCode,
};
