import * as tsInterface from "../jsTs/interface.ts";
import { getLast } from "../../../common/util.ts";
import { ApiFunction } from "../apiFunction.ts";
import { identifierFromString } from "../jsTs/identifier.ts";
import { LambdaExpr, Function, TsType } from "../jsTs/data.ts";
import { DefinyRpcType } from "../type.ts";
import { resultError, resultOk, resultType } from "./result.ts";
import { useFromJson } from "./type.ts";
import {
  rawJsonValueType,
  useRawJsonToStructuredJsonValue,
} from "./runtime.ts";

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
                returnType: tsInterface.promiseType(rawJsonValueType),
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
        type: rawJsonValueType,
      },
    ],
    returnType: resultType(definyRpcTypeToTsType(func.output), {
      _: "StringLiteral",
      string: "error",
    }),
    typeParameterList: [],
    statementList: [
      {
        _: "Return",
        tsExpr: resultOk(
          useFromJson(
            func.output,
            useRawJsonToStructuredJsonValue({
              _: "Variable",
              tsIdentifier: jsonValueIdentifier,
            })
          )
        ),
      },
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
    case "list": {
      const parameter = definyRpcType.parameters[0];
      if (parameter === undefined) {
        throw new Error("list need one parameter");
      }
      return tsInterface.readonlyArrayType(definyRpcTypeToTsType(parameter));
    }
    case "set": {
      const parameter = definyRpcType.parameters[0];
      if (parameter === undefined) {
        throw new Error("set need one parameter");
      }
      return tsInterface.readonlySetType(definyRpcTypeToTsType(parameter));
    }
    case "sum":
      return {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString(definyRpcType.name),
          arguments: definyRpcType.parameters.map(definyRpcTypeToTsType),
        },
      };
    case "product":
      return {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString(definyRpcType.name),
          arguments: definyRpcType.parameters.map(definyRpcTypeToTsType),
        },
      };
  }
};
