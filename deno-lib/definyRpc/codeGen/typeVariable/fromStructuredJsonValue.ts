import {
  addition,
  arrayMap,
  callMethod,
  data,
  equal,
  get,
  identifierFromString,
  logicalOr,
  memberKeyValue,
  newSet,
  newURL,
  notEqual,
  objectLiteral,
  statementReturn,
  stringLiteral,
  typeUnion,
  variable,
} from "../../../jsTs/main.ts";
import { CodeGenContext } from "../../core/collectType.ts";
import { DefinyRpcTypeInfo } from "../../core/coreType.ts";
import { collectedDefinyRpcTypeToTsType } from "../type/use.ts";
import { structuredJsonValueType } from "../useTypedJson.ts";
import { useFrom, useFromStructuredJsonValue, useTag } from "./use.ts";

const jsonValueVariable: data.TsExpr = {
  _: "Variable",
  tsIdentifier: identifierFromString("jsonValue"),
};

const jsonValueVariableType = get(jsonValueVariable, "type");

const jsonValueVariableValue = get(jsonValueVariable, "value");

export const createFromStructuredJsonValueLambda = (
  type: DefinyRpcTypeInfo,
  context: CodeGenContext,
): data.LambdaExpr => {
  const main: data.LambdaExpr = {
    parameterList: [
      {
        name: identifierFromString("jsonValue"),
        type: structuredJsonValueType(context),
      },
    ],
    returnType: collectedDefinyRpcTypeToTsType(type, context),
    typeParameterList: [],
    statementList: typeToFromJsonStatementList(type, context),
  };
  if (type.parameter.length !== 0) {
    return {
      parameterList: type.parameter.map((parameter): data.Parameter => ({
        name: identifierFromString(parameter.name + "FromJson"),
        type: {
          _: "Function",
          functionType: {
            parameterList: [structuredJsonValueType(context)],
            typeParameterList: [],
            return: {
              _: "ScopeInFile",
              typeNameAndTypeParameter: {
                name: identifierFromString(parameter.name),
                arguments: [],
              },
            },
          },
        },
      })),
      returnType: {
        _: "Function",
        functionType: {
          typeParameterList: [],
          parameterList: [structuredJsonValueType(context)],
          return: collectedDefinyRpcTypeToTsType(type, context),
        },
      },
      statementList: [
        { _: "Return", tsExpr: { _: "Lambda", lambdaExpr: main } },
      ],
      typeParameterList: type.parameter.map((parameter) =>
        identifierFromString(parameter.name)
      ),
    };
  }
  return main;
};

const typeToFromJsonStatementList = (
  type: DefinyRpcTypeInfo,
  context: CodeGenContext,
): ReadonlyArray<data.Statement> => {
  switch (type.body.type) {
    case "unit":
      return [{ _: "Return", tsExpr: { _: "UndefinedLiteral" } }];
    case "number":
      return [
        {
          _: "If",
          ifStatement: {
            condition: equal(jsonValueVariableType, {
              _: "StringLiteral",
              string: "number",
            }),
            thenStatementList: [
              {
                _: "Return",
                tsExpr: jsonValueVariableValue,
              },
            ],
          },
        },
        {
          _: "ThrowError",
          tsExpr: {
            _: "StringLiteral",
            string: `expected number in ${type.name}.fromStructuredJsonValue`,
          },
        },
      ];
    case "string":
      return [
        {
          _: "If",
          ifStatement: {
            condition: equal(jsonValueVariableType, {
              _: "StringLiteral",
              string: "string",
            }),
            thenStatementList: [
              {
                _: "Return",
                tsExpr: jsonValueVariableValue,
              },
            ],
          },
        },
        {
          _: "ThrowError",
          tsExpr: {
            _: "StringLiteral",
            string: `expected string in ${type.name}.fromStructuredJsonValue`,
          },
        },
      ];
    case "boolean":
      return [
        {
          _: "If",
          ifStatement: {
            condition: equal(jsonValueVariableType, {
              _: "StringLiteral",
              string: "boolean",
            }),
            thenStatementList: [
              {
                _: "Return",
                tsExpr: jsonValueVariableValue,
              },
            ],
          },
        },
        {
          _: "ThrowError",
          tsExpr: {
            _: "StringLiteral",
            string: `expected boolean in ${type.name}.fromStructuredJsonValue`,
          },
        },
      ];
    case "list":
      return [
        {
          _: "If",
          ifStatement: {
            condition: equal(jsonValueVariableType, {
              _: "StringLiteral",
              string: "array",
            }),
            thenStatementList: [
              {
                _: "Return",
                tsExpr: arrayMap(jsonValueVariableValue, {
                  _: "Variable",
                  tsIdentifier: identifierFromString("p0FromJson"),
                }),
              },
            ],
          },
        },
        {
          _: "ThrowError",
          tsExpr: {
            _: "StringLiteral",
            string: `expected array in ${type.name}.fromStructuredJsonValue`,
          },
        },
      ];
    case "set":
      return [
        {
          _: "If",
          ifStatement: {
            condition: equal(jsonValueVariableType, {
              _: "StringLiteral",
              string: "array",
            }),
            thenStatementList: [
              {
                _: "Return",
                tsExpr: newSet(
                  arrayMap(jsonValueVariableValue, {
                    _: "Variable",
                    tsIdentifier: identifierFromString("p0FromJson"),
                  }),
                ),
              },
            ],
          },
        },
        {
          _: "ThrowError",
          tsExpr: {
            _: "StringLiteral",
            string: `expected array in ${type.name}.fromStructuredJsonValue`,
          },
        },
      ];
    case "map": {
      return [
        {
          _: "ThrowError",
          tsExpr: {
            _: "StringLiteral",
            string:
              `expected stringMap in ${type.name}.fromStructuredJsonValue`,
          },
        },
      ];
    }
    case "product":
      return [
        {
          _: "If",
          ifStatement: {
            condition: notEqual(jsonValueVariableType, {
              _: "StringLiteral",
              string: "object",
            }),
            thenStatementList: [
              {
                _: "ThrowError",
                tsExpr: {
                  _: "StringLiteral",
                  string:
                    `expected object in ${type.name}.fromStructuredJsonValue`,
                },
              },
            ],
          },
        },
        ...type.body.value.flatMap(
          (field): readonly [data.Statement, data.Statement] => [
            {
              _: "VariableDefinition",
              variableDefinitionStatement: {
                name: identifierFromString(field.name),
                isConst: true,
                type: {
                  _: "Union",
                  tsTypeList: [structuredJsonValueType(context), {
                    _: "Undefined",
                  }],
                },
                expr: callMethod(jsonValueVariableValue, "get", [
                  {
                    _: "StringLiteral",
                    string: field.name,
                  },
                ]),
              },
            },
            {
              _: "If",
              ifStatement: {
                condition: equal(
                  {
                    _: "Variable",
                    tsIdentifier: identifierFromString(field.name),
                  },
                  { _: "UndefinedLiteral" },
                ),
                thenStatementList: [
                  {
                    _: "ThrowError",
                    tsExpr: {
                      _: "StringLiteral",
                      string:
                        `expected ${field.name} field. in ${type.name}.fromStructuredJsonValue`,
                    },
                  },
                ],
              },
            },
          ],
        ),
        {
          _: "Return",
          tsExpr: useFrom(
            type.namespace,
            type.name,
            context,
            objectLiteral(
              type.body.value.map(
                (field) =>
                  memberKeyValue(
                    field.name,
                    useFromStructuredJsonValue(field.type, {
                      _: "Variable",
                      tsIdentifier: identifierFromString(field.name),
                    }, context),
                  ),
              ),
            ),
          ),
        },
      ];
    case "sum":
      return [
        {
          _: "If",
          ifStatement: {
            condition: notEqual(jsonValueVariableType, stringLiteral("object")),
            thenStatementList: [
              {
                _: "ThrowError",
                tsExpr: stringLiteral(
                  `expected object in ${type.name}.fromJson`,
                ),
              },
            ],
          },
        },
        {
          _: "VariableDefinition",
          variableDefinitionStatement: {
            isConst: true,
            name: identifierFromString("type"),
            type: typeUnion([structuredJsonValueType(context), {
              _: "Undefined",
            }]),
            expr: callMethod(jsonValueVariableValue, "get", [
              stringLiteral("type"),
            ]),
          },
        },
        {
          _: "If",
          ifStatement: {
            condition: logicalOr(
              equal({
                _: "Variable",
                tsIdentifier: identifierFromString("type"),
              }, { _: "UndefinedLiteral" }),
              notEqual(
                get({
                  _: "Variable",
                  tsIdentifier: identifierFromString("type"),
                }, "type"),
                stringLiteral("string"),
              ),
            ),
            thenStatementList: [
              {
                _: "ThrowError",
                tsExpr: stringLiteral(
                  `expected type property type is string`,
                ),
              },
            ],
          },
        },
        {
          _: "Switch",
          switchStatement: {
            expr: get(variable(identifierFromString("type")), "value"),
            patternList: type.body.value.map((
              pattern,
            ): data.TsPattern => ({
              caseString: pattern.name,
              statementList: pattern.parameter.type === "nothing"
                ? [{
                  _: "Return",
                  tsExpr: useTag(
                    type.namespace,
                    type.name,
                    context,
                    pattern.name,
                    undefined,
                  ),
                }]
                : [
                  {
                    _: "VariableDefinition",
                    variableDefinitionStatement: {
                      isConst: true,
                      name: identifierFromString("value"),
                      type: typeUnion([structuredJsonValueType(context), {
                        _: "Undefined",
                      }]),
                      expr: callMethod(jsonValueVariableValue, "get", [
                        stringLiteral("value"),
                      ]),
                    },
                  },
                  {
                    _: "If",
                    ifStatement: {
                      condition: equal(
                        variable(identifierFromString("value")),
                        {
                          _: "UndefinedLiteral",
                        },
                      ),
                      thenStatementList: [{
                        _: "ThrowError",
                        tsExpr: stringLiteral(
                          "expected value property in sum parameter",
                        ),
                      }],
                    },
                  },
                  statementReturn(useTag(
                    type.namespace,
                    type.name,
                    context,
                    pattern.name,
                    useFromStructuredJsonValue(
                      pattern.parameter.value,
                      variable(identifierFromString("value")),
                      context,
                    ),
                  )),
                ],
            })),
          },
        },
        {
          _: "ThrowError",
          tsExpr: addition(
            stringLiteral(
              "unknown type value expected [" +
                type.body.value.map((pattern) => pattern.name).join(",") +
                "] but got ",
            ),
            get(variable(identifierFromString("type")), "value"),
          ),
        },
      ];
    case "url":
      return [{
        _: "If",
        ifStatement: {
          condition: equal(jsonValueVariableType, {
            _: "StringLiteral",
            string: "string",
          }),
          thenStatementList: [
            statementReturn(
              newURL(jsonValueVariableValue),
            ),
          ],
        },
      }, {
        _: "ThrowError",
        tsExpr: {
          _: "StringLiteral",
          string: `expected string in ${type.name}.fromStructuredJsonValue`,
        },
      }];
  }
};
