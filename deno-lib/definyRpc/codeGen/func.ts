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
  objectLiteral,
  promiseType,
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
import { collectedDefinyRpcTypeUseToTsType } from "./type/use.ts";

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
        collectedDefinyRpcTypeUseToTsType(
          parameter.func.output,
          parameter.context,
        ),
        { _: "String" },
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
          type: collectedDefinyRpcTypeUseToTsType(func.input, context),
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
      memberKeyValue(
        "parameter",
        arrayLiteral(
          typeInfo.parameter.map((parameter) => ({
            expr: useFrom(
              Namespace.coreType,
              "TypeParameterInfo",
              context,
              objectLiteral([
                memberKeyValue("name", stringLiteral(parameter.name)),
                memberKeyValue(
                  "description",
                  stringLiteral(parameter.description),
                ),
              ]),
            ),
            spread: false,
          })),
        ),
      ),
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
            context,
          )
          : nothing(context),
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
                          context,
                        )
                        : nothing(context),
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
