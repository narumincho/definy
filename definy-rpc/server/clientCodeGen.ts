import { ApiFunction } from "./apiFunction.ts";
import { generateCodeAsString } from "./jsTs/main.ts";
import { identifierFromString } from "./jsTs/identifier.ts";
import {
  ExportDefinition,
  LambdaExpr,
  TsExpr,
  TsMember,
  TsMemberType,
  TsType,
} from "./jsTs/data.ts";
import * as tsInterface from "./jsTs/interface.ts";
import { DefinyRpcType } from "./type.ts";

export const apiFunctionListToCode = <input, output>(
  apiFunctionList: ReadonlyArray<ApiFunction<input, output, boolean>>,
  originHint: string
): string => {
  const needAuthentication = apiFunctionList.some(
    (func) => func.needAuthentication
  );
  return generateCodeAsString(
    {
      exportDefinitionList: [
        resultExportDefinition,
        ...(needAuthentication ? [accountTokenExportDefinition] : []),
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
    },
    "TypeScript"
  );
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
                tsIdentifier: identifierFromString("ok"),
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
                tsIdentifier: identifierFromString("error"),
              },
            },
          ],
        },
      ],
    },
  },
};

const resultType = (ok: TsType, error: TsType): TsType => ({
  _: "WithTypeParameter",
  tsTypeWithTypeParameter: {
    type: { _: "ScopeInFile", tsIdentifier: resultTypeName },
    typeParameterList: [ok, error],
  },
});

const funcParameterType = <input, output>(
  func: ApiFunction<input, output, boolean>,
  originHint: string
): TsType => {
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
                tsIdentifier: identifierFromString("AccountToken"),
              } as const,
            },
          ]
        : []),
    ],
  };
};

const funcExpr = <input, output>(
  func: ApiFunction<input, output, boolean>,
  originHint: string
): TsExpr => {
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

const fetchThenExpr = <input, output>(
  func: ApiFunction<input, output, boolean>
): LambdaExpr => {
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
