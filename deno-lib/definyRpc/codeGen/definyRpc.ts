import {
  addition,
  call,
  callCatchMethod,
  callFetch,
  callMethod,
  callThenMethod,
  data,
  equal,
  get,
  identifierFromString,
  memberKeyValue,
  newURL,
  objectLiteral,
  promiseType,
  readonlyArrayType,
  responseType,
  stringLiteral,
  typeObject,
  typeUnion,
  urlType,
  variable,
} from "../../jsTs/main.ts";
import { definyRpcNamespace } from "../core/definyRpcNamespace.ts";
import {
  resultError,
  resultExportDefinition,
  resultOk,
  resultType,
} from "./result.ts";
import {
  rawJsonValueType,
  structuredJsonValueType,
  useRawJsonToStructuredJsonValue,
} from "./useTypedJson.ts";

const jsonValueIdentifier = identifierFromString("jsonValue");

const fetchThenExpr: data.LambdaExpr = {
  parameterList: [
    {
      name: jsonValueIdentifier,
      type: rawJsonValueType,
    },
  ],
  returnType: resultType(
    {
      _: "ScopeInFile",
      typeNameAndTypeParameter: {
        name: identifierFromString("T"),
        arguments: [],
      },
    },
    { _: "StringLiteral", string: "error" },
    [definyRpcNamespace],
  ),
  typeParameterList: [],
  statementList: [
    {
      _: "Return",
      tsExpr: resultOk(
        call({
          expr: get(
            variable(identifierFromString("parameter")),
            "fromStructuredJsonValue",
          ),
          parameterList: [useRawJsonToStructuredJsonValue({
            _: "Variable",
            tsIdentifier: jsonValueIdentifier,
          })],
        }),
      ),
    },
  ],
};

const requestQuery: data.ExportDefinition = {
  type: "function",
  function: {
    name: identifierFromString("requestQuery"),
    document: "",
    typeParameterList: [identifierFromString("T")],
    parameterList: [{
      name: identifierFromString("parameter"),
      document: "",
      type: typeObject([{
        name: { type: "string", value: "url" },
        document: "",
        required: true,
        type: urlType,
      }, {
        name: { type: "string", value: "fullName" },
        document: "",
        required: true,
        type: readonlyArrayType({ _: "String" }),
      }, {
        name: { type: "string", value: "fromStructuredJsonValue" },
        document: "",
        required: true,
        type: {
          _: "Function",
          functionType: {
            typeParameterList: [],
            parameterList: [structuredJsonValueType],
            return: {
              _: "ScopeInFile",
              typeNameAndTypeParameter: {
                name: identifierFromString("T"),
                arguments: [],
              },
            },
          },
        },
      }, {
        name: { type: "string", value: "accountToken" },
        required: false,
        document: "認証が必要な場合のみ付与して呼ぶ",
        type: typeUnion([{ _: "String" }, { _: "Undefined" }]),
      }, {
        name: { type: "string", value: "input" },
        required: false,
        document: "StructuredJson にした input",
        type: structuredJsonValueType,
      }]),
    }],
    returnType: promiseType(
      resultType(
        {
          _: "ScopeInFile",
          typeNameAndTypeParameter: {
            name: identifierFromString("T"),
            arguments: [],
          },
        },
        { _: "StringLiteral", string: "error" },
        [definyRpcNamespace],
      ),
    ),
    statementList: [{
      _: "VariableDefinition",
      variableDefinitionStatement: {
        isConst: true,
        name: identifierFromString("url"),
        type: urlType,
        expr: newURL(
          callMethod(
            get(variable(identifierFromString("parameter")), "url"),
            "toString",
            [],
          ),
        ),
      },
    }, {
      _: "Set",
      setStatement: {
        target: get(variable(identifierFromString("url")), "pathname"),
        operatorMaybe: undefined,
        expr: addition(
          get(variable(identifierFromString("url")), "pathname"),
          addition(
            stringLiteral("/"),
            callMethod(
              get(variable(identifierFromString("parameter")), "fullName"),
              "join",
              [stringLiteral("/")],
            ),
          ),
        ),
      },
    }, {
      _: "Return",
      tsExpr: callCatchMethod(
        callThenMethod(
          callThenMethod(
            callFetch(
              {
                _: "Variable",
                tsIdentifier: identifierFromString("url"),
              },
              objectLiteral([
                {
                  _: "Spread",
                  tsExpr: {
                    _: "ConditionalOperator",
                    conditionalOperatorExpr: {
                      condition: equal(
                        get(
                          variable(identifierFromString("parameter")),
                          "accountToken",
                        ),
                        { _: "UndefinedLiteral" },
                      ),
                      thenExpr: objectLiteral([]),
                      elseExpr: objectLiteral([
                        memberKeyValue(
                          "headers",
                          objectLiteral([
                            memberKeyValue(
                              "authorization",
                              get(
                                variable(identifierFromString("parameter")),
                                "accountToken",
                              ),
                            ),
                          ]),
                        ),
                      ]),
                    },
                  },
                },
              ]),
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
          fetchThenExpr,
        ),
        {
          parameterList: [],
          returnType: resultType(
            {
              _: "ScopeInFile",
              typeNameAndTypeParameter: {
                name: identifierFromString("T"),
                arguments: [],
              },
            },
            { _: "StringLiteral", string: "error" },
            [definyRpcNamespace],
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
    }],
  },
};

export const definyRpcExportDefinitionList: ReadonlyArray<
  data.ExportDefinition
> = [resultExportDefinition, requestQuery];
