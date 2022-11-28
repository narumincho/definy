import { TsExpr } from "../../../jsTs/data.ts";
import {
  call,
  callMethod,
  data,
  get,
  identifierFromString,
  variable,
} from "../../../jsTs/main.ts";
import { NonEmptyArray } from "../../../util.ts";
import {
  CodeGenContext,
  collectedDefinyRpcTypeMapGet,
  CollectedDefinyRpcTypeUse,
} from "../../core/collectType.ts";
import {
  namespaceRelative,
  relativeNamespaceToTypeScriptModuleName,
} from "../namespace.ts";

/**
 * product の表現の型の値を生成する
 */
export const useFrom = (
  namespace: NonEmptyArray<string>,
  typeName: string,
  context: CodeGenContext,
  object: TsExpr,
): TsExpr => {
  return callMethod(getTypeVariable(namespace, typeName, context), "from", [
    object,
  ]);
};

export const useTag = (
  namespace: NonEmptyArray<string>,
  typeName: string,
  context: CodeGenContext,
  tag: string,
  value: TsExpr | undefined,
): TsExpr => {
  if (value === undefined) {
    const typeDetail = collectedDefinyRpcTypeMapGet(
      context.map,
      namespace,
      typeName,
    );
    if (typeDetail?.parameterCount === 0) {
      return get(getTypeVariable(namespace, typeName, context), tag);
    }
    return callMethod(getTypeVariable(namespace, typeName, context), tag, []);
  }
  return callMethod(getTypeVariable(namespace, typeName, context), tag, [
    value,
  ]);
};

const getTypeVariable = (
  namespace: NonEmptyArray<string>,
  typeName: string,
  context: CodeGenContext,
): TsExpr => {
  const moduleName = relativeNamespaceToTypeScriptModuleName(
    namespaceRelative(
      context.currentModule,
      namespace,
    ),
  );
  if (moduleName === undefined) {
    return {
      _: "Variable",
      tsIdentifier: identifierFromString(typeName),
    };
  }
  return {
    _: "ImportedVariable",
    importedVariable: {
      moduleName: moduleName,
      name: identifierFromString(typeName),
    },
  };
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
