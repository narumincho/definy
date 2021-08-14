import * as d from "../localData";

/**
 * 評価結果
 */
export type EvaluationResult = d.Result<
  d.EvaluatedExpr,
  ReadonlyArray<d.EvaluateExprError>
>;

type SourceAndCache = {
  /** 型パーツ */
  readonly typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>;
  /** パーツ */
  readonly partMap: ReadonlyMap<d.PartId, d.Part>;
  /** 評価されたパーツ (キャッシュ) */
  readonly evaluatedPartMap: Map<d.PartId, d.EvaluatedExpr>;
  /** 評価されたSuggestion内での作ったパーツ (キャッシュ) */
  readonly evaluatedSuggestionPartMap: Map<number, d.EvaluatedExpr>;
};

type EvalParameter = {
  readonly typePartList: ReadonlyArray<d.TypePart>;
  readonly partList: ReadonlyArray<d.Part>;
  readonly expr: d.Expr;
};

/**
 * コードを生成せずに内部で式を評価する
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

/**
 * コードを生成せずに内部で式を評価する
 */
export const evaluateSuggestionExpr = (
  sourceAndCache: SourceAndCache,
  expr: d.Expr
): EvaluationResult => {
  switch (expr._) {
    case "Kernel":
      return d.Result.Ok(d.EvaluatedExpr.Kernel(expr.kernelExpr));
    case "Int32Literal":
      return d.Result.Ok(d.EvaluatedExpr.Int32(expr.int32));
    case "PartReference":
      return evaluatePartReference(sourceAndCache, expr.partId);
    case "TagReference":
      return d.Result.Ok(d.EvaluatedExpr.TagReference(expr.tagReference));
    case "FunctionCall":
      return evaluateSuggestionFunctionCall(sourceAndCache, expr.functionCall);
  }
};

const evaluatePartReference = (
  sourceAndCache: SourceAndCache,
  partId: d.PartId
): EvaluationResult => {
  const evaluatedPart = sourceAndCache.evaluatedPartMap.get(partId);
  if (evaluatedPart !== undefined) {
    return d.Result.Ok(evaluatedPart);
  }
  const part = sourceAndCache.partMap.get(partId);
  if (part === undefined) {
    return d.Result.Error([d.EvaluateExprError.NeedPartDefinition(partId)]);
  }
  const result = evaluateSuggestionExpr(sourceAndCache, part.expr);
  if (result._ === "Ok") {
    sourceAndCache.evaluatedPartMap.set(partId, result.ok);
  }
  return result;
};

const evaluateSuggestionFunctionCall = (
  sourceAndCache: SourceAndCache,
  functionCall: d.FunctionCall
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
      return d.Result.Error(
        functionResult.error.concat(
          parameterResult._ === "Error" ? parameterResult.error : []
        )
      );
  }
};

const evaluateFunctionCallResultOk = (
  functionExpr: d.EvaluatedExpr,
  parameter: d.EvaluatedExpr
): d.Result<d.EvaluatedExpr, ReadonlyArray<d.EvaluateExprError>> => {
  switch (functionExpr._) {
    case "Kernel": {
      return d.Result.Ok(
        d.EvaluatedExpr.KernelCall({
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
  return d.Result.Error([
    d.EvaluateExprError.TypeError(
      "関数のところにkernel,kernelCall以外が来てしまった"
    ),
  ]);
};

const int32Add = (
  parameterA: d.EvaluatedExpr,
  parameterB: d.EvaluatedExpr
): d.Result<d.EvaluatedExpr, ReadonlyArray<d.EvaluateExprError>> => {
  switch (parameterA._) {
    case "Int32":
      switch (parameterB._) {
        case "Int32": {
          const parameterAInt: number = parameterA.int32;
          const parameterBInt: number = parameterB.int32;
          return d.Result.Ok(
            d.EvaluatedExpr.Int32((parameterAInt + parameterBInt) | 0)
          );
        }
      }
  }
  return d.Result.Error([
    d.EvaluateExprError.TypeError("int32Addで整数が渡されなかった"),
  ]);
};

const int32Mul = (
  parameterA: d.EvaluatedExpr,
  parameterB: d.EvaluatedExpr
): d.Result<d.EvaluatedExpr, ReadonlyArray<d.EvaluateExprError>> => {
  switch (parameterA._) {
    case "Int32":
      switch (parameterB._) {
        case "Int32": {
          const parameterAInt: number = parameterA.int32;
          const parameterBInt: number = parameterB.int32;
          return d.Result.Ok(
            d.EvaluatedExpr.Int32((parameterAInt * parameterBInt) | 0)
          );
        }
      }
  }
  return d.Result.Error([
    d.EvaluateExprError.TypeError("int33Mulで整数が渡されなかった"),
  ]);
};

const int32Sub = (
  parameterA: d.EvaluatedExpr,
  parameterB: d.EvaluatedExpr
): d.Result<d.EvaluatedExpr, ReadonlyArray<d.EvaluateExprError>> => {
  switch (parameterA._) {
    case "Int32":
      switch (parameterB._) {
        case "Int32": {
          const parameterAInt: number = parameterA.int32;
          const parameterBInt: number = parameterB.int32;
          return d.Result.Ok(
            d.EvaluatedExpr.Int32((parameterAInt - parameterBInt) | 0)
          );
        }
      }
  }
  return d.Result.Error([
    d.EvaluateExprError.TypeError("int33Subで整数が渡されなかった"),
  ]);
};
