import {
  addition,
  callCatchMethod,
  callFetch,
  callMethod,
  callThenMethod,
  data,
  get,
  identifierFromString,
  memberKeyValue,
  newURL,
  nullishCoalescing,
  objectLiteral,
  promiseType,
  readonlyArrayType,
  readonlyMapType,
  readonlySetType,
  responseType,
  stringLiteral,
  urlType,
} from "../../jsTs/main.ts";
import { ApiFunction } from "../core/apiFunction.ts";
import { DefinyRpcType } from "../core/type.ts";
import { resultError, resultOk, resultType } from "./result.ts";
import { useFromStructuredJsonValue } from "./typeVariable/use.ts";
import {
  rawJsonValueType,
  useRawJsonToStructuredJsonValue,
} from "./useTypedJson.ts";

export const apiFuncToTsFunction = (parameter: {
  readonly func: ApiFunction;
  readonly originHint: string;
  readonly pathPrefix: ReadonlyArray<string>;
}): data.Function => {
  const parameterIdentifier = identifierFromString("parameter");
  return {
    name: identifierFromString(parameter.func.name),
    document: parameter.func.description,
    parameterList: [
      {
        name: parameterIdentifier,
        document: "",
        type: funcParameterType(parameter.func, parameter.originHint),
      },
    ],
    returnType: promiseType(
      resultType(
        definyRpcTypeToTsType(parameter.func.output),
        { _: "StringLiteral", string: "error" },
        { type: "local", path: parameter.func.namespace },
      ),
    ),
    typeParameterList: [],
    statementList: [
      {
        _: "VariableDefinition",
        variableDefinitionStatement: {
          name: identifierFromString("url"),
          expr: newURL(
            nullishCoalescing(
              get(
                {
                  _: "Variable",
                  tsIdentifier: parameterIdentifier,
                },
                "url",
              ),
              stringLiteral(parameter.originHint),
            ),
          ),
          isConst: true,
          type: urlType,
        },
      },
      {
        _: "Set",
        setStatement: {
          target: get(
            {
              _: "Variable",
              tsIdentifier: identifierFromString("url"),
            },
            "pathname",
          ),
          operatorMaybe: undefined,
          expr: addition(
            get(
              {
                _: "Variable",
                tsIdentifier: identifierFromString("url"),
              },
              "pathname",
            ),
            {
              _: "StringLiteral",
              string: "/" +
                (parameter.pathPrefix.length === 0
                  ? ""
                  : parameter.pathPrefix.join("/") + "/") +
                parameter.func.namespace.join("/") + "/" + parameter.func.name,
            },
          ),
        },
      },
      {
        _: "Return",
        tsExpr: callCatchMethod(
          callThenMethod(
            callThenMethod(
              callFetch(
                {
                  _: "Variable",
                  tsIdentifier: identifierFromString("url"),
                },
                parameter.func.needAuthentication
                  ? objectLiteral([
                    memberKeyValue(
                      "headers",
                      objectLiteral([
                        memberKeyValue(
                          "authorization",
                          get(
                            {
                              _: "Variable",
                              tsIdentifier: parameterIdentifier,
                            },
                            "accountToken",
                          ),
                        ),
                      ]),
                    ),
                  ])
                  : undefined,
              ),
              {
                parameterList: [
                  {
                    name: identifierFromString("response"),
                    type: responseType,
                  },
                ],
                returnType: promiseType(rawJsonValueType),
                typeParameterList: [],
                statementList: [
                  {
                    _: "Return",
                    tsExpr: callMethod(
                      {
                        _: "Variable",
                        tsIdentifier: identifierFromString("response"),
                      },
                      "json",
                      [],
                    ),
                  },
                ],
              },
            ),
            fetchThenExpr(parameter.func),
          ),
          {
            parameterList: [],
            returnType: resultType(
              definyRpcTypeToTsType(parameter.func.output),
              { _: "StringLiteral", string: "error" },
              { type: "local", path: parameter.func.namespace },
            ),
            typeParameterList: [],
            statementList: [
              {
                _: "Return",
                tsExpr: resultError({ _: "StringLiteral", string: "error" }),
              },
            ],
          },
        ),
      },
    ],
  };
};

const fetchThenExpr = (func: ApiFunction): data.LambdaExpr => {
  const jsonValueIdentifier = identifierFromString("jsonValue");
  return {
    parameterList: [
      {
        name: jsonValueIdentifier,
        type: rawJsonValueType,
      },
    ],
    returnType: resultType(
      definyRpcTypeToTsType(func.output),
      { _: "StringLiteral", string: "error" },
      { type: "local", path: func.namespace },
    ),
    typeParameterList: [],
    statementList: [
      {
        _: "Return",
        tsExpr: resultOk(
          useFromStructuredJsonValue(
            func.output,
            useRawJsonToStructuredJsonValue({
              _: "Variable",
              tsIdentifier: jsonValueIdentifier,
            }),
          ),
        ),
      },
    ],
  };
};

const funcParameterType = (
  func: ApiFunction,
  originHint: string,
): data.TsType => {
  return {
    _: "Object",
    tsMemberTypeList: [
      {
        name: { type: "string", value: "url" },
        document: `api end point
@default ${originHint}`,
        required: false,
        type: { _: "Union", tsTypeList: [{ _: "String" }, { _: "Undefined" }] },
      },
      ...(func.input.body.type === "unit" ? [] : [
        {
          name: { type: "string", value: "input" },
          document: "",
          required: true,
          type: definyRpcTypeToTsType(func.input),
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
  definyRpcType: DefinyRpcType<t>,
): data.TsType => {
  switch (definyRpcType.body.type) {
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
        throw new Error("list need one parameter");
      }
      return readonlyArrayType(definyRpcTypeToTsType(parameter));
    }
    case "set": {
      const parameter = definyRpcType.parameters[0];
      if (parameter === undefined) {
        throw new Error("set need one parameter");
      }
      return readonlySetType(definyRpcTypeToTsType(parameter));
    }
    case "stringMap": {
      const parameter = definyRpcType.parameters[0];
      if (parameter === undefined) {
        throw new Error("stringMap need one parameter");
      }
      return readonlyMapType({ _: "String" }, definyRpcTypeToTsType(parameter));
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
    case "url":
      return urlType;
  }
};
