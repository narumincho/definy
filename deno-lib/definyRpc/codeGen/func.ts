import { ArrayItem, TsExpr } from "../../jsTs/data.ts";
import {
  arrayLiteral,
  call,
  data,
  get,
  identifierFromString,
  memberKeyValue,
  newMap,
  newURL,
  nullishCoalescing,
  numberLiteral,
  objectLiteral,
  promiseType,
  readonlyArrayType,
  readonlyMapType,
  readonlySetType,
  stringLiteral,
  urlType,
  variable,
} from "../../jsTs/main.ts";
import { ApiFunction } from "../core/apiFunction.ts";
import {
  CodeGenContext,
  CollectedDefinyRpcTypeMap,
  collectedDefinyRpcTypeMapGet,
} from "../core/collectType.ts";
import { DefinyRpcTypeInfo, Namespace, Type } from "../core/coreType.ts";
import {
  fromFunctionNamespace,
  namespaceToString,
  toRequest,
} from "./namespace.ts";
import { resultType } from "./result.ts";
import { typeToTypeExpr, useFrom, useTag } from "./typeVariable/use.ts";
import {
  functionNamespaceToExpr,
  namespaceToNamespaceExpr,
} from "./useNamespace.ts";
import { just, nothing } from "./useMaybe.ts";

export const apiFuncToTsFunction = (parameter: {
  readonly func: ApiFunction;
  readonly originHint: string;
  readonly pathPrefix: ReadonlyArray<string>;
  readonly context: CodeGenContext;
}): data.Function => {
  const parameterIdentifier = identifierFromString("parameter");
  const inputTypeInfo = collectedDefinyRpcTypeMapGet(
    parameter.context.map,
    parameter.func.input.namespace,
    parameter.func.input.name,
  );

  const usedTypeSet: ReadonlySet<string> = new Set([
    ...collectUsedTypeInType(parameter.func.input, parameter.context.map),
    ...collectUsedTypeInType(parameter.func.output, parameter.context.map),
  ]);

  return {
    name: identifierFromString(parameter.func.name),
    document: parameter.func.description,
    parameterList: [
      {
        name: parameterIdentifier,
        document: "",
        type: funcParameterType(
          parameter.func,
          parameter.originHint,
          parameter.context,
        ),
      },
    ],
    returnType: promiseType(
      resultType(
        definyRpcTypeToTsType(parameter.func.output, parameter.context),
        { _: "StringLiteral", string: "error" },
        fromFunctionNamespace(parameter.func.namespace),
      ),
    ),
    typeParameterList: [],
    statementList: [
      {
        _: "Return",
        tsExpr: call({
          expr: {
            _: "ImportedVariable",
            importedVariable: {
              moduleName: toRequest(
                fromFunctionNamespace(parameter.func.namespace),
              ),
              name: parameter.func.isMutation
                ? identifierFromString("requestMutation")
                : identifierFromString("requestQuery"),
            },
          },
          parameterList: [
            objectLiteral([
              memberKeyValue(
                "url",
                nullishCoalescing(
                  get(variable(identifierFromString("parameter")), "url"),
                  newURL(stringLiteral(parameter.originHint)),
                ),
              ),
              memberKeyValue(
                "namespace",
                functionNamespaceToExpr(
                  parameter.func.namespace,
                  parameter.context,
                ),
              ),
              memberKeyValue("name", stringLiteral(parameter.func.name)),
              memberKeyValue(
                "inputType",
                typeToTypeExpr(parameter.func.input, parameter.context),
              ),
              memberKeyValue(
                "outputType",
                typeToTypeExpr(parameter.func.output, parameter.context),
              ),
              memberKeyValue(
                "input",
                inputTypeInfo.body.type === "unit"
                  ? { _: "UndefinedLiteral" }
                  : get(variable(identifierFromString("parameter")), "input"),
              ),
              memberKeyValue(
                "typeMap",
                newMap(
                  arrayLiteral(
                    [...parameter.context.map].flatMap(
                      ([typeId, typeInfo]): ReadonlyArray<ArrayItem> => {
                        if (usedTypeSet.has(typeId)) {
                          return [{
                            expr: arrayLiteral([{
                              expr: stringLiteral(typeId),
                              spread: false,
                            }, {
                              expr: typeInfoToExpr(typeInfo, parameter.context),
                              spread: false,
                            }]),
                            spread: false,
                          }];
                        }
                        return [];
                      },
                    ),
                  ),
                ),
              ),
              ...(parameter.func.needAuthentication
                ? [
                  memberKeyValue(
                    "accountToken",
                    get(
                      variable(identifierFromString("parameter")),
                      "accountToken",
                    ),
                  ),
                ]
                : []),
            ]),
          ],
        }),
      },
    ],
  };
};

const funcParameterType = (
  func: ApiFunction,
  originHint: string,
  context: CodeGenContext,
): data.TsType => {
  const inputTypeInfo = collectedDefinyRpcTypeMapGet(
    context.map,
    func.input.namespace,
    func.input.name,
  );
  return {
    _: "Object",
    tsMemberTypeList: [
      {
        name: { type: "string", value: "url" },
        document: `api end point
@default new URL("${originHint}")`,
        required: false,
        type: { _: "Union", tsTypeList: [urlType, { _: "Undefined" }] },
      },
      ...(inputTypeInfo.body.type === "unit" ? [] : [
        {
          name: { type: "string", value: "input" },
          document: "",
          required: true,
          type: definyRpcTypeToTsType(func.input, context),
        } as const,
      ]),
      ...(func.needAuthentication
        ? [
          {
            name: { type: "string", value: "accountToken" },
            document: "",
            required: true,
            type: {
              _: "ScopeInFile",
              typeNameAndTypeParameter: {
                name: identifierFromString("AccountToken"),
                arguments: [],
              },
            },
          } as const,
        ]
        : []),
    ],
  };
};

const definyRpcTypeToTsType = <t>(
  definyRpcType: Type<t>,
  context: CodeGenContext,
): data.TsType => {
  const typeInfo = collectedDefinyRpcTypeMapGet(
    context.map,
    definyRpcType.namespace,
    definyRpcType.name,
  );
  switch (typeInfo.body.type) {
    case "string":
      return { _: "String" };
    case "number":
      return { _: "Number" };
    case "boolean":
      return { _: "Boolean" };
    case "unit":
      return { _: "Undefined" };
    case "list": {
      const parameter = definyRpcType.parameters[0];
      if (parameter === undefined) {
        throw new Error("list need 1 parameter");
      }
      return readonlyArrayType(definyRpcTypeToTsType(parameter, context));
    }
    case "set": {
      const parameter = definyRpcType.parameters[0];
      if (parameter === undefined) {
        throw new Error("set need 1 parameter");
      }
      return readonlySetType(definyRpcTypeToTsType(parameter, context));
    }
    case "map": {
      const key = definyRpcType.parameters[0];
      const value = definyRpcType.parameters[1];
      if (key === undefined || value === undefined) {
        throw new Error("Map need 2 parameter");
      }
      return readonlyMapType(
        definyRpcTypeToTsType(key, context),
        definyRpcTypeToTsType(value, context),
      );
    }
    case "sum":
      return {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString(definyRpcType.name),
          arguments: definyRpcType.parameters.map(
            (parameter) => definyRpcTypeToTsType(parameter, context),
          ),
        },
      };
    case "product":
      return {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString(definyRpcType.name),
          arguments: definyRpcType.parameters.map((parameter) =>
            definyRpcTypeToTsType(parameter, context)
          ),
        },
      };
    case "url":
      return urlType;
  }
};

/**
 * 型の構造で使われている型の集合を返す
 */
const collectUsedTypeInType = <T>(
  type: Type<T>,
  map: CollectedDefinyRpcTypeMap,
): ReadonlySet<string> => {
  return new Set([
    namespaceToString(type.namespace) + "." + type.name,
    ...type.parameters.flatMap((
      parameter,
    ) => [...collectUsedTypeInType(parameter, map)]),
  ]);
};

const typeInfoToExpr = (
  typeInfo: DefinyRpcTypeInfo,
  context: CodeGenContext,
): TsExpr => {
  return useFrom(
    Namespace.coreType,
    "DefinyRpcTypeInfo",
    context,
    objectLiteral([
      memberKeyValue(
        "namespace",
        namespaceToNamespaceExpr(
          typeInfo.namespace,
          context,
        ),
      ),
      memberKeyValue("name", stringLiteral(typeInfo.name)),
      memberKeyValue("description", stringLiteral(typeInfo.description)),
      memberKeyValue("parameterCount", numberLiteral(typeInfo.parameterCount)),
      memberKeyValue(
        "attribute",
        typeInfo.attribute.type === "just"
          ? just(
            useTag(
              Namespace.coreType,
              "TypeAttribute",
              context,
              typeInfo.attribute.value.type,
              undefined,
            ),
          )
          : nothing,
      ),
      memberKeyValue(
        "body",
        useTag(
          Namespace.coreType,
          "TypeBody",
          context,
          typeInfo.body.type,
          typeInfo.body.type === "sum"
            ? arrayLiteral(
              typeInfo.body.value.map((pattern) => ({
                expr: useFrom(
                  Namespace.coreType,
                  "Pattern",
                  context,
                  objectLiteral([
                    memberKeyValue("name", stringLiteral(pattern.name)),
                    memberKeyValue(
                      "description",
                      stringLiteral(pattern.description),
                    ),
                    memberKeyValue(
                      "parameter",
                      pattern.parameter.type === "just"
                        ? just(
                          typeToTypeExpr(pattern.parameter.value, context),
                        )
                        : nothing,
                    ),
                  ]),
                ),
                spread: false,
              })),
            )
            : typeInfo.body.type === "product"
            ? arrayLiteral(
              typeInfo.body.value.map((field) => ({
                expr: useFrom(
                  Namespace.coreType,
                  "Field",
                  context,
                  objectLiteral([
                    memberKeyValue("name", stringLiteral(field.name)),
                    memberKeyValue(
                      "description",
                      stringLiteral(field.description),
                    ),
                    memberKeyValue(
                      "type",
                      typeToTypeExpr(field.type, context),
                    ),
                  ]),
                ),
                spread: false,
              })),
            )
            : undefined,
        ),
      ),
    ]),
  );
};
