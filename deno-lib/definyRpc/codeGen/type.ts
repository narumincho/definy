import {
  addition,
  arrayMap,
  call,
  callMethod,
  data,
  equal,
  get,
  identifierFromString,
  lambdaToType,
  logicalOr,
  memberKeyValue,
  newSet,
  notEqual,
  objectLiteral,
  readonlyArrayType,
  readonlyMapType,
  readonlySetType,
  stringLiteral,
  symbolToStringTag,
  typeAssertion,
  typeUnion,
  urlType,
  variable,
} from "../../jsTs/main.ts";
import {
  CodeGenContext,
  CollectedDefinyRpcType,
  CollectedDefinyRpcTypeBody,
  CollectedDefinyRpcTypeMap,
  collectedDefinyRpcTypeMapGet,
  CollectedDefinyRpcTypeUse,
} from "../core/collectType.ts";
import { arrayFromLength, NonEmptyArray } from "../../util.ts";
import { structuredJsonValueType } from "./useTypedJson.ts";
import { TsExpr } from "../../jsTs/data.ts";
import {
  createFromLambda,
  symbolToStringTagAndTypeName,
} from "./typeVariable/from.ts";
import { collectedDefinyRpcTypeToTsType } from "./type/use.ts";
import { createTagExprList } from "./typeVariable/tag.ts";

export const collectedTypeToTypeAlias = (
  type: CollectedDefinyRpcType,
  map: CollectedDefinyRpcTypeMap,
): data.TypeAlias | undefined => {
  if (
    type.body.type === "string" ||
    type.body.type === "number" ||
    type.body.type === "boolean" ||
    type.body.type === "unit" ||
    type.body.type === "list" ||
    type.body.type === "set"
  ) {
    return undefined;
  }
  return {
    namespace: [],
    name: identifierFromString(type.name),
    document: type.description,
    typeParameterList: arrayFromLength(
      type.parameterCount,
      (i) => identifierFromString("p" + i),
    ),
    type: collectedDefinyRpcTypeBodyToTsType(
      type.namespace,
      type.name,
      type.body,
      map,
    ),
  };
};

const collectedDefinyRpcTypeBodyToTsType = (
  namespace: ReadonlyArray<string>,
  typeName: string,
  typeBody: CollectedDefinyRpcTypeBody,
  map: CollectedDefinyRpcTypeMap,
): data.TsType => {
  switch (typeBody.type) {
    case "string":
      return { _: "String" };
    case "number":
      return { _: "Number" };
    case "boolean":
      return { _: "Boolean" };
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
    case "stringMap":
      return readonlyMapType(
        { _: "String" },
        collectedDefinyRpcTypeUseToTsType(typeBody.valueType, map),
      );
    case "product":
      return {
        _: "Object",
        tsMemberTypeList: [
          ...typeBody.fieldList.map((field) => ({
            name: { type: "string", value: field.name } as const,
            document: field.description,
            required: true,
            type: collectedDefinyRpcTypeUseToTsType(field.type, map),
          })),
          {
            name: {
              type: "symbolExpr",
              value: symbolToStringTag,
            },
            document: "",
            required: true,
            type: {
              _: "StringLiteral",
              string: symbolToStringTagAndTypeName(namespace, typeName),
            },
          },
        ],
      };
    case "sum":
      return {
        _: "Union",
        tsTypeList: typeBody.patternList.map(
          (pattern): data.TsType => ({
            _: "Object",
            tsMemberTypeList: [
              {
                name: {
                  type: "string",
                  value: identifierFromString("type"),
                },
                document: pattern.description,
                required: true,
                type: { _: "StringLiteral", string: pattern.name },
              },
              ...(pattern.parameter === undefined ? [] : [
                {
                  name: {
                    type: "string",
                    value: identifierFromString("value"),
                  },
                  document: pattern.description,
                  required: true,
                  type: collectedDefinyRpcTypeUseToTsType(
                    pattern.parameter,
                    map,
                  ),
                } as const,
              ]),
              {
                name: {
                  type: "symbolExpr",
                  value: symbolToStringTag,
                },
                document: "",
                required: true,
                type: {
                  _: "StringLiteral",
                  string: symbolToStringTagAndTypeName(namespace, typeName),
                },
              },
            ],
          }),
        ),
      };
    case "url":
      return urlType;
  }
};

const collectedDefinyRpcTypeUseToTsType = (
  collectedDefinyRpcTypeUse: CollectedDefinyRpcTypeUse,
  map: CollectedDefinyRpcTypeMap,
): data.TsType => {
  const typeDetail = collectedDefinyRpcTypeMapGet(
    map,
    collectedDefinyRpcTypeUse.namespace,
    collectedDefinyRpcTypeUse.name,
  );
  if (typeDetail === undefined) {
    throw new Error("型を集計できなかった " + collectedDefinyRpcTypeUse.name);
  }
  if (typeDetail.body.type === "string") {
    return { _: "String" };
  }
  if (typeDetail.body.type === "boolean") {
    return { _: "Boolean" };
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
          collectedDefinyRpcTypeUse.parameters.length,
      );
    }
    return readonlyArrayType(collectedDefinyRpcTypeUseToTsType(parameter, map));
  }
  if (typeDetail.body.type === "set") {
    const parameter = collectedDefinyRpcTypeUse.parameters[0];
    if (
      parameter === undefined ||
      collectedDefinyRpcTypeUse.parameters.length !== 1
    ) {
      throw new Error(
        "set need 1 parameters but got " +
          collectedDefinyRpcTypeUse.parameters.length,
      );
    }
    return readonlySetType(collectedDefinyRpcTypeUseToTsType(parameter, map));
  }
  return {
    _: "ScopeInFile",
    typeNameAndTypeParameter: {
      name: identifierFromString(collectedDefinyRpcTypeUse.name),
      arguments: collectedDefinyRpcTypeUse.parameters.map((use) =>
        collectedDefinyRpcTypeUseToTsType(use, map)
      ),
    },
  };
};

export const typeToTypeVariable = (
  type: CollectedDefinyRpcType,
  context: CodeGenContext,
): data.Variable => {
  const fromJsonTypeMain: data.TsType = {
    _: "Function",
    functionType: {
      typeParameterList: [],
      parameterList: [structuredJsonValueType],
      return: collectedDefinyRpcTypeToTsType(type, context),
    },
  };
  const fromLambda = createFromLambda(type, context);
  const tagList = createTagExprList(type, context) ?? [];
  return {
    name: identifierFromString(type.name),
    document: type.description,
    type: {
      _: "Object",
      tsMemberTypeList: [
        {
          name: { type: "string", value: "description" },
          document: `${type.name} の説明文`,
          required: true,
          type: { _: "String" },
        },
        ...(fromLambda === undefined ? [] : [{
          name: { type: "string", value: "from" } as const,
          document: "オブジェクトから作成する. 余計なフィールドがレスポンスに含まれてしまうのを防ぐ. 型のチェックはしない",
          required: true,
          type: lambdaToType(fromLambda),
        }]),
        {
          name: { type: "string", value: "fromStructuredJsonValue" },
          document: `Jsonから${type.name}に変換する. 失敗した場合はエラー`,
          required: true,
          type: type.parameterCount === 0 ? fromJsonTypeMain : {
            _: "Function",
            functionType: {
              parameterList: arrayFromLength(
                type.parameterCount,
                (i): data.TsType => ({
                  _: "Function",
                  functionType: {
                    parameterList: [structuredJsonValueType],
                    typeParameterList: [],
                    return: {
                      _: "ScopeInFile",
                      typeNameAndTypeParameter: {
                        name: identifierFromString("p" + i),
                        arguments: [],
                      },
                    },
                  },
                }),
              ),
              return: fromJsonTypeMain,
              typeParameterList: arrayFromLength(
                type.parameterCount,
                (i) => identifierFromString("p" + i),
              ),
            },
          },
        },
        ...tagList.map((tag) => tag.memberType),
      ],
    },
    expr: {
      _: "ObjectLiteral",
      tsMemberList: [
        memberKeyValue(
          "description",
          stringLiteral(type.description),
        ),
        ...(fromLambda === undefined ? [] : [
          memberKeyValue(
            "from",
            {
              _: "Lambda",
              lambdaExpr: fromLambda,
            },
          ),
        ]),
        memberKeyValue(
          "fromStructuredJsonValue",
          {
            _: "Lambda",
            lambdaExpr: typeToFromStructuredJsonValueLambda(type, context),
          },
        ),
        ...tagList.map((tag) => tag.member),
      ],
    },
  };
};

const typeToFromStructuredJsonValueLambda = (
  type: CollectedDefinyRpcType,
  context: CodeGenContext,
): data.LambdaExpr => {
  const main: data.LambdaExpr = {
    parameterList: [
      {
        name: identifierFromString("jsonValue"),
        type: structuredJsonValueType,
      },
    ],
    returnType: collectedDefinyRpcTypeToTsType(type, context),
    typeParameterList: [],
    statementList: typeToFromJsonStatementList(type, context),
  };
  if (type.parameterCount !== 0) {
    return {
      parameterList: arrayFromLength(
        type.parameterCount,
        (i): data.Parameter => ({
          name: identifierFromString("p" + i + "FromJson"),
          type: {
            _: "Function",
            functionType: {
              parameterList: [structuredJsonValueType],
              typeParameterList: [],
              return: {
                _: "ScopeInFile",
                typeNameAndTypeParameter: {
                  name: identifierFromString("p" + i),
                  arguments: [],
                },
              },
            },
          },
        }),
      ),
      returnType: {
        _: "Function",
        functionType: {
          typeParameterList: [],
          parameterList: [structuredJsonValueType],
          return: collectedDefinyRpcTypeToTsType(type, context),
        },
      },
      statementList: [
        { _: "Return", tsExpr: { _: "Lambda", lambdaExpr: main } },
      ],
      typeParameterList: arrayFromLength(
        type.parameterCount,
        (i) => identifierFromString("p" + i),
      ),
    };
  }
  return main;
};

const jsonValueVariable: data.TsExpr = {
  _: "Variable",
  tsIdentifier: identifierFromString("jsonValue"),
};

const jsonValueVariableType = get(jsonValueVariable, "type");

const jsonValueVariableValue = get(jsonValueVariable, "value");

const typeToFromJsonStatementList = (
  type: CollectedDefinyRpcType,
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
            string: "expected number in Number json fromJson",
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
            string: "expected string in String json fromJson",
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
            string: "expected boolean in boolean json fromJson",
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
            string: "expected array in List json fromJson",
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
            string: "expected array in Set json fromJson",
          },
        },
      ];
    case "stringMap": {
      return [
        {
          _: "ThrowError",
          tsExpr: {
            _: "StringLiteral",
            string: "expected stringMap in stringMap json fromJson",
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
                  string: `expected object in ${type.name}.fromJson`,
                },
              },
            ],
          },
        },
        ...type.body.fieldList.flatMap(
          (field): readonly [data.Statement, data.Statement] => [
            {
              _: "VariableDefinition",
              variableDefinitionStatement: {
                name: identifierFromString(field.name),
                isConst: true,
                type: {
                  _: "Union",
                  tsTypeList: [structuredJsonValueType, { _: "Undefined" }],
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
                        `expected ${field.name} field. in ${type.name}.fromJson`,
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
            context.map,
            {
              _: "ObjectLiteral",
              tsMemberList: type.body.fieldList.map(
                (field) =>
                  memberKeyValue(
                    field.name,
                    useFromStructuredJsonValue(field.type, {
                      _: "Variable",
                      tsIdentifier: identifierFromString(field.name),
                    }),
                  ),
              ),
            },
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
            type: typeUnion([structuredJsonValueType, { _: "Undefined" }]),
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
            patternList: type.body.patternList.map((
              pattern,
            ): data.TsPattern => ({
              caseString: pattern.name,
              statementList: pattern.parameter === undefined
                ? [{
                  _: "Return",
                  tsExpr: objectLiteral([
                    memberKeyValue("type", stringLiteral(pattern.name)),
                  ]),
                }]
                : [{
                  _: "VariableDefinition",
                  variableDefinitionStatement: {
                    isConst: true,
                    name: identifierFromString("value"),
                    type: typeUnion([structuredJsonValueType, {
                      _: "Undefined",
                    }]),
                    expr: callMethod(jsonValueVariableValue, "get", [
                      stringLiteral("value"),
                    ]),
                  },
                }, {
                  _: "If",
                  ifStatement: {
                    condition: equal(variable(identifierFromString("value")), {
                      _: "UndefinedLiteral",
                    }),
                    thenStatementList: [{
                      _: "ThrowError",
                      tsExpr: stringLiteral(
                        "expected value property in sum parameter",
                      ),
                    }],
                  },
                }, {
                  _: "Return",
                  tsExpr: typeAssertion({
                    expr: objectLiteral([
                      memberKeyValue("type", stringLiteral(pattern.name)),
                      memberKeyValue(
                        "value",
                        call({
                          expr: getStructuredJsonValueFunction(
                            pattern.parameter,
                          ),
                          parameterList: [
                            variable(identifierFromString("value")),
                          ],
                        }),
                      ),
                    ]),
                    type: collectedDefinyRpcTypeToTsType(type, context),
                  }),
                }],
            })),
          },
        },
        {
          _: "ThrowError",
          tsExpr: addition(
            stringLiteral(
              "unknown type value expected [" +
                type.body.patternList.map((pattern) => pattern.name).join(",") +
                "] but got ",
            ),
            get(variable(identifierFromString("type")), "value"),
          ),
        },
      ];
    case "url":
      return [{ _: "Return", tsExpr: stringLiteral("url wip") }];
  }
};

/**
 * `型名`.fromStructuredJsonValue を使用する
 * @param type 型
 * @param expr JSONの式
 */
export const useFromStructuredJsonValue = (
  type: CollectedDefinyRpcTypeUse,
  expr: data.TsExpr,
): data.TsExpr => {
  return {
    _: "Call",
    callExpr: {
      expr: getStructuredJsonValueFunction(type),
      parameterList: [expr],
    },
  };
};

const getStructuredJsonValueFunction = (
  type: CollectedDefinyRpcTypeUse,
): data.TsExpr => {
  if (type.parameters.length === 0) {
    return get(
      {
        _: "Variable",
        tsIdentifier: identifierFromString(type.name),
      },
      "fromStructuredJsonValue",
    );
  }
  return callMethod(
    {
      _: "Variable",
      tsIdentifier: identifierFromString(type.name),
    },
    "fromStructuredJsonValue",
    type.parameters.map(getStructuredJsonValueFunction),
  );
};

const useFrom = (
  namespace: NonEmptyArray<string>,
  typeName: string,
  map: CollectedDefinyRpcTypeMap,
  object: TsExpr,
): TsExpr => {
  const typeDetail = collectedDefinyRpcTypeMapGet(
    map,
    namespace,
    typeName,
  );
  if (typeDetail === undefined) {
    return stringLiteral("unknown type from function");
  }
  switch (typeDetail.body.type) {
    case "boolean":
    case "list":
    case "number":
    case "url":
      return object;
    case "product":
      return callMethod(
        {
          _: "Variable",
          tsIdentifier: identifierFromString(typeName),
        },
        "from",
        [object],
      );
    case "set":
    case "string":
      return object;
    case "stringMap":
      return object;
    case "sum":
      return callMethod(
        {
          _: "Variable",
          tsIdentifier: identifierFromString(typeName),
        },
        "from",
        [object],
      );
    case "unit":
      return { _: "UndefinedLiteral" };
  }
};
