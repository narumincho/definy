import * as tsInterface from "../jsTs/interface.ts";
import { getLast } from "../../../common/util.ts";
import { ApiFunction } from "../apiFunction.ts";
import { identifierFromString } from "../jsTs/identifier.ts";
import { LambdaExpr, Function, TsType } from "../jsTs/data.ts";
import { DefinyRpcType } from "../type.ts";
import { resultError, resultOk, resultType } from "./result.ts";

export const apiFuncToTsFunction = (
  func: ApiFunction,
  originHint: string
): Function => {
  const parameterIdentifier = identifierFromString("parameter");
  return {
    name: identifierFromString(getLast(func.fullName)),
    document: func.description,
    parameterList: [
      {
        name: parameterIdentifier,
        document: "",
        type: funcParameterType(func, originHint),
      },
    ],
    returnType: tsInterface.promiseType(
      resultType(definyRpcTypeToTsType(func.output), {
        _: "StringLiteral",
        string: "error",
      })
    ),
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
                returnType: tsInterface.promiseType({ _: "unknown" }),
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
            returnType: resultType(definyRpcTypeToTsType(func.output), {
              _: "StringLiteral",
              string: "error",
            }),
            typeParameterList: [],
            statementList: [
              {
                _: "Return",
                tsExpr: resultError({ _: "StringLiteral", string: "error" }),
              },
            ],
          }
        ),
      },
    ],
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
    returnType: resultType(definyRpcTypeToTsType(func.output), {
      _: "StringLiteral",
      string: "error",
    }),
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
              tsExpr: resultOk({
                _: "Variable",
                tsIdentifier: jsonValueIdentifier,
              }),
            },
          ],
        },
      },
      { _: "ThrowError", tsExpr: { _: "StringLiteral", string: "parseError" } },
    ],
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
