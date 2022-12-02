import { TsExpr } from "../../../jsTs/data.ts";
import {
  call,
  callMethod,
  data,
  get,
  identifierFromString,
} from "../../../jsTs/main.ts";
import {
  CodeGenContext,
  collectedDefinyRpcTypeMapGet,
} from "../../core/collectType.ts";
import { Namespace, Type } from "../../core/coreType.ts";
import { namespaceFromAndToToTypeScriptModuleName } from "../namespace.ts";

/**
 * product の表現の型の値を生成する
 */
export const useFrom = (
  namespace: Namespace,
  typeName: string,
  context: CodeGenContext,
  object: TsExpr,
): TsExpr => {
  return callMethod(getTypeVariable(namespace, typeName, context), "from", [
    object,
  ]);
};

export const useTag = (
  namespace: Namespace,
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
  namespace: Namespace,
  typeName: string,
  context: CodeGenContext,
): TsExpr => {
  const moduleName = namespaceFromAndToToTypeScriptModuleName(
    context.currentModule,
    namespace,
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
  type: Type,
  expr: data.TsExpr,
  context: CodeGenContext,
): data.TsExpr => {
  return call({
    expr: getStructuredJsonValueFunction(type, context),
    parameterList: [expr],
  });
};

const getStructuredJsonValueFunction = (
  type: Type,
  context: CodeGenContext,
): data.TsExpr => {
  if (type.parameters.length === 0) {
    return get(
      getTypeVariable(type.namespace, type.name, context),
      "fromStructuredJsonValue",
    );
  }
  return callMethod(
    getTypeVariable(type.namespace, type.name, context),
    "fromStructuredJsonValue",
    type.parameters.map((t) => getStructuredJsonValueFunction(t, context)),
  );
};
