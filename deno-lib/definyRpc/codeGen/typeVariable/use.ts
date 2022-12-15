import { TsExpr } from "../../../jsTs/data.ts";
import {
  arrayLiteral,
  call,
  callMethod,
  data,
  get,
  identifierFromString,
  memberKeyValue,
  objectLiteral,
  stringLiteral,
} from "../../../jsTs/main.ts";
import { isFirstLowerCase } from "../../../util.ts";
import {
  CodeGenContext,
  collectedDefinyRpcTypeMapGet,
} from "../../core/collectType.ts";
import { Namespace, Type } from "../../core/coreType.ts";
import { namespaceFromAndToToTypeScriptModuleName } from "../namespace.ts";
import { namespaceToNamespaceExpr } from "../useNamespace.ts";

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
    if (typeDetail.parameter.length === 0) {
      return get(getTypeVariable(namespace, typeName, context), tag);
    }
    return callMethod(getTypeVariable(namespace, typeName, context), tag, []);
  }
  return callMethod(getTypeVariable(namespace, typeName, context), tag, [
    value,
  ]);
};

export const typeToTypeExpr = (
  type: Type<unknown>,
  context: CodeGenContext,
): TsExpr => {
  if (isFirstLowerCase(type.name)) {
    return useFrom(
      Namespace.coreType,
      "Type",
      context,
      objectLiteral([
        memberKeyValue(
          "namespace",
          namespaceToNamespaceExpr(type.namespace, context),
        ),
        memberKeyValue("name", stringLiteral(type.name)),
        memberKeyValue(
          "parameters",
          arrayLiteral(
            type.parameters.map((t) => ({
              spread: false,
              expr: typeToTypeExpr(t, context),
            })),
          ),
        ),
      ]),
    );
  }
  return callMethod(
    getTypeVariable(type.namespace, type.name, context),
    "type",
    type.parameters.map((t) => typeToTypeExpr(t, context)),
  );
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
  type: Type<unknown>,
  expr: data.TsExpr,
  context: CodeGenContext,
): data.TsExpr => {
  return call({
    expr: getStructuredJsonValueFunction(type, context),
    parameterList: [expr],
  });
};

const getStructuredJsonValueFunction = (
  type: Type<unknown>,
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
