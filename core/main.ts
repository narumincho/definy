import * as data from "../localData";
import * as hexString from "./kernelType/hexString";
import * as typeAlias from "./typeAlias";
import * as variable from "./variable";
import { generateElmCode, generateElmCodeAsString } from "./elm";
import { checkTypePartListValidation } from "./validation";
import { jsTs } from "../gen/main";

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

export type EvaluationResult = data.Result<
  data.EvaluatedExpr,
  ReadonlyArray<data.EvaluateExprError>
>;

type SourceAndCache = {
  /** 型パーツ */
  typePartMap: ReadonlyMap<data.TypePartId, data.TypePart>;
  /** パーツ */
  partMap: ReadonlyMap<data.PartId, data.Part>;
  /** 評価されたパーツ (キャッシュ) */
  evaluatedPartMap: Map<data.PartId, data.EvaluatedExpr>;
  /** 評価されたSuggestion内での作ったパーツ (キャッシュ) */
  evaluatedSuggestionPartMap: Map<number, data.EvaluatedExpr>;
};

type EvalParameter = {
  typePartList: ReadonlyArray<data.TypePart>;
  partList: ReadonlyArray<data.Part>;
  expr: data.Expr;
};

/**
 * Elmから送られてきたデータを元にして式を評価する
 */
export const evalExpr = (evalParameter: EvalParameter): EvaluationResult =>
  evaluateSuggestionExpr(
    {
      partMap: new Map(evalParameter.partList.map((part) => [part.id, part])),
      typePartMap: new Map(
        evalParameter.typePartList.map((typePart) => [typePart.id, typePart])
      ),
      evaluatedPartMap: new Map(),
      evaluatedSuggestionPartMap: new Map(),
    },
    evalParameter.expr
  );

export const evaluateSuggestionExpr = (
  sourceAndCache: SourceAndCache,
  expr: data.Expr
): EvaluationResult => {
  switch (expr._) {
    case "Kernel":
      return data.Result.Ok(data.EvaluatedExpr.Kernel(expr.kernelExpr));
    case "Int32Literal":
      return data.Result.Ok(data.EvaluatedExpr.Int32(expr.int32));
    case "PartReference":
      return evaluatePartReference(sourceAndCache, expr.partId);
    case "TagReference":
      return data.Result.Ok(data.EvaluatedExpr.TagReference(expr.tagReference));
    case "FunctionCall":
      return evaluateSuggestionFunctionCall(sourceAndCache, expr.functionCall);
  }
};

const evaluatePartReference = (
  sourceAndCache: SourceAndCache,
  partId: data.PartId
): EvaluationResult => {
  const evaluatedPart = sourceAndCache.evaluatedPartMap.get(partId);
  if (evaluatedPart !== undefined) {
    return data.Result.Ok(evaluatedPart);
  }
  const part = sourceAndCache.partMap.get(partId);
  if (part === undefined) {
    return data.Result.Error([
      data.EvaluateExprError.NeedPartDefinition(partId),
    ]);
  }
  const result = evaluateSuggestionExpr(sourceAndCache, part.expr);
  if (result._ === "Ok") {
    sourceAndCache.evaluatedPartMap.set(partId, result.ok);
  }
  return result;
};

const evaluateSuggestionFunctionCall = (
  sourceAndCache: SourceAndCache,
  functionCall: data.FunctionCall
): EvaluationResult => {
  const functionResult = evaluateSuggestionExpr(
    sourceAndCache,
    functionCall.function
  );
  const parameterResult = evaluateSuggestionExpr(
    sourceAndCache,
    functionCall.parameter
  );
  switch (functionResult._) {
    case "Ok":
      switch (parameterResult._) {
        case "Ok": {
          return evaluateFunctionCallResultOk(
            functionResult.ok,
            parameterResult.ok
          );
        }
        case "Error":
          return parameterResult;
      }
      break;

    case "Error":
      return data.Result.Error(
        functionResult.error.concat(
          parameterResult._ === "Error" ? parameterResult.error : []
        )
      );
  }
};

const evaluateFunctionCallResultOk = (
  functionExpr: data.EvaluatedExpr,
  parameter: data.EvaluatedExpr
): data.Result<data.EvaluatedExpr, ReadonlyArray<data.EvaluateExprError>> => {
  switch (functionExpr._) {
    case "Kernel": {
      return data.Result.Ok(
        data.EvaluatedExpr.KernelCall({
          kernel: functionExpr.kernelExpr,
          expr: parameter,
        })
      );
    }
    case "KernelCall": {
      switch (functionExpr.kernelCall.kernel) {
        case "Int32Add":
          return int32Add(functionExpr.kernelCall.expr, parameter);
        case "Int32Mul":
          return int32Mul(functionExpr.kernelCall.expr, parameter);
        case "Int32Sub":
          return int32Sub(functionExpr.kernelCall.expr, parameter);
      }
    }
  }
  return data.Result.Error([
    data.EvaluateExprError.TypeError(
      "関数のところにkernel,kernelCall以外が来てしまった"
    ),
  ]);
};

const int32Add = (
  parameterA: data.EvaluatedExpr,
  parameterB: data.EvaluatedExpr
): data.Result<data.EvaluatedExpr, ReadonlyArray<data.EvaluateExprError>> => {
  switch (parameterA._) {
    case "Int32":
      switch (parameterB._) {
        case "Int32": {
          const parameterAInt: number = parameterA.int32;
          const parameterBInt: number = parameterB.int32;
          return data.Result.Ok(
            data.EvaluatedExpr.Int32((parameterAInt + parameterBInt) | 0)
          );
        }
      }
  }
  return data.Result.Error([
    data.EvaluateExprError.TypeError("int32Addで整数が渡されなかった"),
  ]);
};

const int32Mul = (
  parameterA: data.EvaluatedExpr,
  parameterB: data.EvaluatedExpr
): data.Result<data.EvaluatedExpr, ReadonlyArray<data.EvaluateExprError>> => {
  switch (parameterA._) {
    case "Int32":
      switch (parameterB._) {
        case "Int32": {
          const parameterAInt: number = parameterA.int32;
          const parameterBInt: number = parameterB.int32;
          return data.Result.Ok(
            data.EvaluatedExpr.Int32((parameterAInt * parameterBInt) | 0)
          );
        }
      }
  }
  return data.Result.Error([
    data.EvaluateExprError.TypeError("int33Mulで整数が渡されなかった"),
  ]);
};

const int32Sub = (
  parameterA: data.EvaluatedExpr,
  parameterB: data.EvaluatedExpr
): data.Result<data.EvaluatedExpr, ReadonlyArray<data.EvaluateExprError>> => {
  switch (parameterA._) {
    case "Int32":
      switch (parameterB._) {
        case "Int32": {
          const parameterAInt: number = parameterA.int32;
          const parameterBInt: number = parameterB.int32;
          return data.Result.Ok(
            data.EvaluatedExpr.Int32((parameterAInt - parameterBInt) | 0)
          );
        }
      }
  }
  return data.Result.Error([
    data.EvaluateExprError.TypeError("int33Subで整数が渡されなかった"),
  ]);
};

export const exprToDebugString = (expr: data.Expr): string => {
  switch (expr._) {
    case "Kernel":
      return kernelToString(expr.kernelExpr);
    case "Int32Literal":
      return expr.int32.toString();
    case "PartReference":
      return "[part " + (expr.partId as string) + "]";
    case "TagReference":
      return "[tag " + JSON.stringify(expr.tagReference) + "]";
    case "FunctionCall":
      return (
        "(" +
        exprToDebugString(expr.functionCall.function) +
        " " +
        exprToDebugString(expr.functionCall.parameter)
      );
  }
};

const kernelToString = (kernelExpr: data.KernelExpr): string => {
  switch (kernelExpr) {
    case "Int32Add":
      return "+";
    case "Int32Sub":
      return "-";
    case "Int32Mul":
      return "*";
  }
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
      ...variable
        .typePartMapToVariable(typePartDataMap)
        .map(data.ExportDefinition.Variable),
    ],
    statementList: [],
  };
};

export { generateElmCodeAsString, generateElmCode };
