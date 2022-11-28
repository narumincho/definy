import { TsExpr } from "../../../jsTs/data.ts";
import {
  call,
  callMethod,
  data,
  get,
  identifierFromString,
  stringLiteral,
  variable,
} from "../../../jsTs/main.ts";
import { NonEmptyArray } from "../../../util.ts";
import {
  CollectedDefinyRpcTypeMap,
  collectedDefinyRpcTypeMapGet,
  CollectedDefinyRpcTypeUse,
} from "../../core/collectType.ts";

/**
 * product の表現の型の値を生成する
 */
export const useFrom = (
  namespace: NonEmptyArray<string>,
  typeName: string,
  map: CollectedDefinyRpcTypeMap,
  object: TsExpr,
): TsExpr => {
  const typeDetail = collectedDefinyRpcTypeMapGet(
    map,
    namespace,
    typeName,
  );
  if (typeDetail === undefined) {
    return stringLiteral("unknown type from function");
  }
  switch (typeDetail.body.type) {
    case "boolean":
    case "list":
    case "number":
    case "url":
      return object;
    case "product":
      return callMethod(
        {
          _: "Variable",
          tsIdentifier: identifierFromString(typeName),
        },
        "from",
        [object],
      );
    case "set":
    case "string":
      return object;
    case "stringMap":
      return object;
    case "sum":
      return callMethod(
        {
          _: "Variable",
          tsIdentifier: identifierFromString(typeName),
        },
        "from",
        [object],
      );
    case "unit":
      return { _: "UndefinedLiteral" };
  }
};

/**
 * `型名`.fromStructuredJsonValue を使用する
 * @param type 型
 * @param expr JSONの式
 */
export const useFromStructuredJsonValue = (
  type: CollectedDefinyRpcTypeUse,
  expr: data.TsExpr,
): data.TsExpr => {
  return call({
    expr: getStructuredJsonValueFunction(type),
    parameterList: [expr],
  });
};

const getStructuredJsonValueFunction = (
  type: CollectedDefinyRpcTypeUse,
): data.TsExpr => {
  if (type.parameters.length === 0) {
    return get(
      variable(identifierFromString(type.name)),
      "fromStructuredJsonValue",
    );
  }
  return callMethod(
    variable(identifierFromString(type.name)),
    "fromStructuredJsonValue",
    type.parameters.map(getStructuredJsonValueFunction),
  );
};
