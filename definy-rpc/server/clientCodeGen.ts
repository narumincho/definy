import { ApiFunction } from "./apiFunction.ts";
import { generateCodeAsString } from "./jsTs/main.ts";
import { identifierFromString } from "./jsTs/identifier.ts";
import {
  ExportDefinition,
  JsTsCode,
  LambdaExpr,
  TsExpr,
  TsMember,
  TsMemberType,
  TsType,
  TypeAlias,
} from "./jsTs/data.ts";
import * as tsInterface from "./jsTs/interface.ts";
import { DefinyRpcType } from "./type.ts";
import {
  collectDefinyRpcTypeFromFuncList,
  CollectedDefinyRpcType,
  CollectedDefinyRpcTypeBody,
  CollectedDefinyRpcTypeMap,
  CollectedDefinyRpcTypeUse,
} from "./collectType.ts";
import { nonEmptyArrayMap } from "./util.ts";
import { formatCode } from "./prettier.ts";

export const apiFunctionListToCode = (
  apiFunctionList: ReadonlyArray<ApiFunction>,
  originHint: string,
  /** deno fmt を使う. `--allow-run` が必要 */
  usePrettier: boolean
): string => {
  const code = generateCodeAsString(
    apiFunctionListToJsTsCode(apiFunctionList, originHint),
    "TypeScript"
  );
  if (usePrettier) {
    return formatCode(code);
  }
  return code;
};

export const apiFunctionListToJsTsCode = (
  apiFunctionList: ReadonlyArray<ApiFunction>,
  originHint: string
): JsTsCode => {
  const needAuthentication = apiFunctionList.some(
    (func) => func.needAuthentication
  );
  const collectedTypeMap = collectDefinyRpcTypeFromFuncList(apiFunctionList);
  return {
    exportDefinitionList: [
      resultExportDefinition,
      ...(needAuthentication ? [accountTokenExportDefinition] : []),
      ...[...collectedTypeMap.values()].flatMap(
        (type): ReadonlyArray<ExportDefinition> => {
          const typeAlias = collectedTypeToTypeAlias(type, collectedTypeMap);
          if (typeAlias === undefined) {
            return [];
          }
          return [{ type: "typeAlias", typeAlias }];
        }
      ),
      {
        type: "variable",
        variable: {
          name: identifierFromString("definyRpc"),
          document: "definyRpc の ApiFunctions を呼ぶ",
          type: {
            _: "Object",
            tsMemberTypeList: apiFunctionList.map(
              (func): TsMemberType => ({
                name: func.fullName.slice(1).join("_"),
                document: func.description,
                required: true,
                type: {
                  _: "Function",
                  functionType: {
                    typeParameterList: [],
                    parameterList: [funcParameterType(func, originHint)],
                    return: tsInterface.promiseType(
                      definyRpcTypeToTsType(func.output)
                    ),
                  },
                },
              })
            ),
          },
          expr: {
            _: "ObjectLiteral",
            tsMemberList: apiFunctionList.map(
              (func): TsMember => ({
                _: "KeyValue",
                keyValue: {
                  key: func.fullName.slice(1).join("_"),
                  value: funcExpr(func, originHint),
                },
              })
            ),
          },
        },
      },
    ],
    statementList: [],
  };
};

const definyRpcTypeToTsType = <t>(definyRpcType: DefinyRpcType<t>): TsType => {
  switch (definyRpcType.body.type) {
    case "string":
      return { _: "String" };
    case "number":
      return { _: "Number" };
    case "unit":
      return { _: "Undefined" };
    case "list":
      return tsInterface.readonlyArrayType({ _: "Undefined" });
    case "set":
      return tsInterface.setType({ _: "Undefined" });
    case "sum":
      return { _: "Undefined" };
    case "product":
      return { _: "Undefined" };
  }
};

const accountTokenExportDefinition: ExportDefinition = {
  type: "typeAlias",
  typeAlias: {
    namespace: [],
    name: identifierFromString("AccountToken"),
    document: "認証が必要なリクエストに使用する",
    typeParameterList: [],
    type: {
      _: "Intersection",
      intersectionType: {
        left: { _: "String" },
        right: {
          _: "Object",
          tsMemberTypeList: [
            {
              name: "__accountTokenBland",
              document: "",
              required: true,
              type: { _: "Never" },
            },
          ],
        },
      },
    },
  },
};

const resultTypeName = identifierFromString("Result");

const resultExportDefinition: ExportDefinition = {
  type: "typeAlias",
  typeAlias: {
    namespace: [],
    name: resultTypeName,
    document: "取得した結果",
    typeParameterList: [
      identifierFromString("ok"),
      identifierFromString("error"),
    ],
    type: {
      _: "Union",
      tsTypeList: [
        {
          _: "Object",
          tsMemberTypeList: [
            {
              name: "type",
              document: "",
              required: true,
              type: { _: "StringLiteral", string: "ok" },
            },
            {
              name: "ok",
              document: "",
              required: true,
              type: {
                _: "ScopeInFile",
                typeNameAndTypeParameter: {
                  name: identifierFromString("ok"),
                  arguments: [],
                },
              },
            },
          ],
        },
        {
          _: "Object",
          tsMemberTypeList: [
            {
              name: "type",
              document: "",
              required: true,
              type: { _: "StringLiteral", string: "error" },
            },
            {
              name: "error",
              document: "",
              required: true,
              type: {
                _: "ScopeInFile",
                typeNameAndTypeParameter: {
                  name: identifierFromString("error"),
                  arguments: [],
                },
              },
            },
          ],
        },
      ],
    },
  },
};

const resultType = (ok: TsType, error: TsType): TsType => ({
  _: "ScopeInFile",
  typeNameAndTypeParameter: {
    name: resultTypeName,
    arguments: [ok, error],
  },
});

const collectedTypeToTypeAlias = (
  type: CollectedDefinyRpcType,
  map: CollectedDefinyRpcTypeMap
): TypeAlias | undefined => {
  if (
    type.body.type === "string" ||
    type.body.type === "number" ||
    type.body.type === "unit" ||
    type.body.type === "list" ||
    type.body.type === "set"
  ) {
    return undefined;
  }
  return {
    namespace: type.namespace.map(identifierFromString),
    name: identifierFromString(type.name),
    document: type.description,
    typeParameterList: Array.from({ length: type.parameterCount }, (_, i) =>
      identifierFromString("p" + i)
    ),
    type: collectedDefinyRpcTypeBodyToTsType(type.body, map),
  };
};

const collectedDefinyRpcTypeBodyToTsType = (
  typeBody: CollectedDefinyRpcTypeBody,
  map: CollectedDefinyRpcTypeMap
): TsType => {
  switch (typeBody.type) {
    case "string":
      return { _: "String" };
    case "number":
      return { _: "Number" };
    case "unit":
      return { _: "Undefined" };
    case "list":
      return {
        _: "ScopeInGlobal",
        typeNameAndTypeParameter: {
          name: identifierFromString("ReadonlyArray"),
          arguments: [],
        },
      };
    case "set":
      return {
        _: "ScopeInGlobal",
        typeNameAndTypeParameter: {
          name: identifierFromString("ReadonlySet"),
          arguments: [],
        },
      };
    case "product":
      return {
        _: "Object",
        tsMemberTypeList: typeBody.fieldList.map((field) => ({
          name: field.name,
          document: field.description,
          required: true,
          type: collectedDefinyRpcTypeUseToTsType(field.type, map),
        })),
      };
    case "sum":
      return {
        _: "Union",
        tsTypeList: typeBody.patternList.map(
          (pattern): TsType => ({
            _: "Object",
            tsMemberTypeList: [
              {
                name: identifierFromString("type"),
                document: pattern.description,
                required: true,
                type: { _: "StringLiteral", string: pattern.name },
              },
              ...(pattern.parameter === undefined
                ? []
                : [
                    {
                      name: identifierFromString("value"),
                      document: pattern.description,
                      required: true,
                      type: collectedDefinyRpcTypeUseToTsType(
                        pattern.parameter,
                        map
                      ),
                    } as const,
                  ]),
            ],
          })
        ),
      };
  }
};

const collectedDefinyRpcTypeUseToTsType = (
  collectedDefinyRpcTypeUse: CollectedDefinyRpcTypeUse,
  map: CollectedDefinyRpcTypeMap
): TsType => {
  const typeDetail = map.get(
    collectedDefinyRpcTypeUse.namespace.join(".") +
      "." +
      collectedDefinyRpcTypeUse.name
  );
  if (typeDetail === undefined) {
    throw new Error("型を集計できなかった " + collectedDefinyRpcTypeUse.name);
  }
  if (typeDetail.body.type === "string") {
    return { _: "String" };
  }
  if (typeDetail.body.type === "number") {
    return { _: "Number" };
  }
  if (typeDetail.body.type === "unit") {
    return { _: "Undefined" };
  }
  if (typeDetail.body.type === "list") {
    const parameter = collectedDefinyRpcTypeUse.parameters[0];
    if (
      parameter === undefined ||
      collectedDefinyRpcTypeUse.parameters.length !== 1
    ) {
      throw new Error(
        "list need 1 parameters but got " +
          collectedDefinyRpcTypeUse.parameters.length
      );
    }
    return tsInterface.readonlyArrayType(
      collectedDefinyRpcTypeUseToTsType(parameter, map)
    );
  }
  if (typeDetail.body.type === "set") {
    const parameter = collectedDefinyRpcTypeUse.parameters[0];
    if (
      parameter === undefined ||
      collectedDefinyRpcTypeUse.parameters.length !== 1
    ) {
      throw new Error(
        "set need 1 parameters but got " +
          collectedDefinyRpcTypeUse.parameters.length
      );
    }
    return tsInterface.readonlySetType(
      collectedDefinyRpcTypeUseToTsType(parameter, map)
    );
  }
  return {
    _: "WithNamespace",
    namespace: nonEmptyArrayMap(
      collectedDefinyRpcTypeUse.namespace,
      identifierFromString
    ),
    typeNameAndTypeParameter: {
      name: identifierFromString(collectedDefinyRpcTypeUse.name),
      arguments: collectedDefinyRpcTypeUse.parameters.map((use) =>
        collectedDefinyRpcTypeUseToTsType(use, map)
      ),
    },
  };
};

const funcParameterType = (func: ApiFunction, originHint: string): TsType => {
  return {
    _: "Object",
    tsMemberTypeList: [
      {
        name: "origin",
        document: `api end point
  @default ${originHint}`,
        required: false,
        type: { _: "Union", tsTypeList: [{ _: "String" }, { _: "Undefined" }] },
      },
      ...(func.input.body.type === "unit"
        ? []
        : [
            {
              name: "input",
              document: "",
              required: true,
              type: definyRpcTypeToTsType(func.input),
            },
          ]),
      ...(func.needAuthentication
        ? [
            {
              name: "accountToken",
              document: "",
              required: true,
              type: {
                _: "ScopeInFile",
                typeNameAndTypeParameter: {
                  name: identifierFromString("AccountToken"),
                  arguments: [],
                },
              } as const,
            },
          ]
        : []),
    ],
  };
};

const funcExpr = (func: ApiFunction, originHint: string): TsExpr => {
  const parameterIdentifier = identifierFromString("parameter");
  return {
    _: "Lambda",
    lambdaExpr: {
      parameterList: [
        {
          name: parameterIdentifier,
          type: funcParameterType(func, originHint),
        },
      ],
      returnType: tsInterface.promiseType(definyRpcTypeToTsType(func.output)),
      typeParameterList: [],
      statementList: [
        {
          _: "VariableDefinition",
          variableDefinitionStatement: {
            name: identifierFromString("url"),
            expr: tsInterface.newURL(
              tsInterface.nullishCoalescing(
                tsInterface.get(
                  {
                    _: "Variable",
                    tsIdentifier: parameterIdentifier,
                  },
                  "origin"
                ),
                { _: "StringLiteral", string: originHint }
              )
            ),
            isConst: true,
            type: tsInterface.urlType,
          },
        },
        {
          _: "Set",
          setStatement: {
            target: tsInterface.get(
              {
                _: "Variable",
                tsIdentifier: identifierFromString("url"),
              },
              "pathname"
            ),
            operatorMaybe: undefined,
            expr: {
              _: "StringLiteral",
              string: "/" + func.fullName.join("/"),
            },
          },
        },
        {
          _: "Return",
          tsExpr: tsInterface.callCatchMethod(
            tsInterface.callThenMethod(
              tsInterface.callThenMethod(
                tsInterface.callFetch(
                  {
                    _: "Variable",
                    tsIdentifier: identifierFromString("url"),
                  },
                  func.needAuthentication
                    ? tsInterface.objectLiteral([
                        {
                          _: "KeyValue",
                          keyValue: {
                            key: "headers",
                            value: tsInterface.objectLiteral([
                              {
                                _: "KeyValue",
                                keyValue: {
                                  key: "authorization",
                                  value: tsInterface.get(
                                    {
                                      _: "Variable",
                                      tsIdentifier: parameterIdentifier,
                                    },
                                    "accountToken"
                                  ),
                                },
                              },
                            ]),
                          },
                        } as const,
                      ])
                    : undefined
                ),
                {
                  parameterList: [
                    {
                      name: identifierFromString("response"),
                      type: tsInterface.responseType,
                    },
                  ],
                  returnType: tsInterface.promiseType({ _: "String" }),
                  typeParameterList: [],
                  statementList: [
                    {
                      _: "Return",
                      tsExpr: tsInterface.callMethod(
                        {
                          _: "Variable",
                          tsIdentifier: identifierFromString("response"),
                        },
                        "json",
                        []
                      ),
                    },
                  ],
                }
              ),
              fetchThenExpr(func)
            ),
            {
              parameterList: [],
              returnType: tsInterface.promiseType(
                definyRpcTypeToTsType(func.output)
              ),
              typeParameterList: [],
              statementList: [],
            }
          ),
        },
      ],
    },
  };
};

const fetchThenExpr = (func: ApiFunction): LambdaExpr => {
  const jsonValueIdentifier = identifierFromString("jsonValue");
  return {
    parameterList: [
      {
        name: jsonValueIdentifier,
        type: { _: "unknown" },
      },
    ],
    returnType: definyRpcTypeToTsType(func.output),
    typeParameterList: [],
    statementList: [
      {
        _: "If",
        ifStatement: {
          condition: tsInterface.equal(
            tsInterface.typeofExpr({
              _: "Variable",
              tsIdentifier: jsonValueIdentifier,
            }),
            {
              _: "StringLiteral",
              string: "string",
            }
          ),
          thenStatementList: [
            {
              _: "Return",
              tsExpr: { _: "Variable", tsIdentifier: jsonValueIdentifier },
            },
          ],
        },
      },
      { _: "ThrowError", tsExpr: { _: "StringLiteral", string: "parseError" } },
    ],
  };
};
