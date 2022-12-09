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
import {
  CodeGenContext,
  collectedDefinyRpcTypeMapGet,
} from "../core/collectType.ts";
import { Namespace, Type } from "../core/coreType.ts";
import { fromFunctionNamespace } from "./namespace.ts";
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
  readonly context: CodeGenContext;
}): data.Function => {
  const parameterIdentifier = identifierFromString("parameter");
  const functionNamespace = parameter.func.namespace;
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
                (functionNamespace.type === "meta"
                  ? "meta"
                  : "api/" + functionNamespace.value.join("/")) +
                "/" +
                parameter.func.name,
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
                returnType: promiseType(rawJsonValueType(parameter.context)),
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
            fetchThenExpr(parameter.func, parameter.context),
          ),
          {
            parameterList: [],
            returnType: resultType(
              definyRpcTypeToTsType(parameter.func.output, parameter.context),
              { _: "StringLiteral", string: "error" },
              fromFunctionNamespace(parameter.func.namespace),
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

const fetchThenExpr = (
  func: ApiFunction,
  context: CodeGenContext,
): data.LambdaExpr => {
  const jsonValueIdentifier = identifierFromString("jsonValue");
  return {
    parameterList: [
      {
        name: jsonValueIdentifier,
        type: rawJsonValueType(context),
      },
    ],
    returnType: resultType(
      definyRpcTypeToTsType(func.output, context),
      { _: "StringLiteral", string: "error" },
      fromFunctionNamespace(func.namespace),
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
            }, context),
            context,
          ),
        ),
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
@default ${originHint}`,
        required: false,
        type: { _: "Union", tsTypeList: [{ _: "String" }, { _: "Undefined" }] },
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
