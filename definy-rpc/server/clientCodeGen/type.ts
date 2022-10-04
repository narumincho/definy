import { identifierFromString } from "../jsTs/identifier.ts";
import {
  LambdaExpr,
  Parameter,
  Statement,
  TsExpr,
  TsMember,
  TsType,
  TypeAlias,
  Variable,
} from "../jsTs/data.ts";
import * as tsInterface from "../jsTs/interface.ts";
import {
  CollectedDefinyRpcType,
  CollectedDefinyRpcTypeBody,
  CollectedDefinyRpcTypeMap,
  CollectedDefinyRpcTypeUse,
} from "../collectType.ts";
import { arrayFromLength } from "../../../common/util.ts";
import { structuredJsonValueType } from "./runtime.ts";

export const collectedTypeToTypeAlias = (
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
    namespace: [],
    name: identifierFromString(type.name),
    document: type.description,
    typeParameterList: arrayFromLength(type.parameterCount, (i) =>
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
    _: "ScopeInFile",
    typeNameAndTypeParameter: {
      name: identifierFromString(collectedDefinyRpcTypeUse.name),
      arguments: collectedDefinyRpcTypeUse.parameters.map((use) =>
        collectedDefinyRpcTypeUseToTsType(use, map)
      ),
    },
  };
};

const collectedDefinyRpcTypeToTsType = (
  collectedDefinyRpcType: CollectedDefinyRpcType,
  map: CollectedDefinyRpcTypeMap
): TsType => {
  const typeDetail = map.get(
    collectedDefinyRpcType.namespace.join(".") +
      "." +
      collectedDefinyRpcType.name
  );
  if (typeDetail === undefined) {
    throw new Error("型を集計できなかった " + collectedDefinyRpcType.name);
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
    return tsInterface.readonlyArrayType({
      _: "ScopeInFile",
      typeNameAndTypeParameter: {
        name: identifierFromString("p0"),
        arguments: [],
      },
    });
  }
  if (typeDetail.body.type === "set") {
    return tsInterface.readonlySetType({
      _: "ScopeInFile",
      typeNameAndTypeParameter: {
        name: identifierFromString("p0"),
        arguments: [],
      },
    });
  }
  return {
    _: "ScopeInFile",
    typeNameAndTypeParameter: {
      name: identifierFromString(collectedDefinyRpcType.name),
      arguments: arrayFromLength(
        collectedDefinyRpcType.parameterCount,
        (i) => ({
          _: "ScopeInFile",
          typeNameAndTypeParameter: {
            name: identifierFromString("p" + i),
            arguments: [],
          },
        })
      ),
    },
  };
};

export const typeToTypeVariable = (
  type: CollectedDefinyRpcType,
  map: CollectedDefinyRpcTypeMap
): Variable => {
  const fromJsonTypeMain: TsType = {
    _: "Function",
    functionType: {
      typeParameterList: [],
      parameterList: [structuredJsonValueType],
      return: collectedDefinyRpcTypeToTsType(type, map),
    },
  };
  return {
    name: identifierFromString(type.name),
    document: type.description,
    type: {
      _: "Object",
      tsMemberTypeList: [
        {
          name: "description",
          document: `${type.name} の説明文`,
          required: true,
          type: { _: "String" },
        },
        {
          name: "fromJson",
          document: `Jsonから${type.name}に変換する. 失敗した場合はエラー`,
          required: true,
          type:
            type.parameterCount === 0
              ? fromJsonTypeMain
              : {
                  _: "Function",
                  functionType: {
                    parameterList: arrayFromLength(
                      type.parameterCount,
                      (i): TsType => ({
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
                      })
                    ),
                    return: fromJsonTypeMain,
                    typeParameterList: arrayFromLength(
                      type.parameterCount,
                      (i) => identifierFromString("p" + i)
                    ),
                  },
                },
        },
      ],
    },
    expr: {
      _: "ObjectLiteral",
      tsMemberList: [
        {
          _: "KeyValue",
          keyValue: {
            key: "description",
            value: { _: "StringLiteral", string: type.description },
          },
        },
        {
          _: "KeyValue",
          keyValue: {
            key: "fromJson",
            value: {
              _: "Lambda",
              lambdaExpr: typeToFromJsonLambda(type, map),
            },
          },
        },
      ],
    },
  };
};

const typeToFromJsonLambda = (
  type: CollectedDefinyRpcType,
  map: CollectedDefinyRpcTypeMap
): LambdaExpr => {
  const main: LambdaExpr = {
    parameterList: [
      {
        name: identifierFromString("jsonValue"),
        type: structuredJsonValueType,
      },
    ],
    returnType: collectedDefinyRpcTypeToTsType(type, map),
    typeParameterList: [],
    statementList: typeToFromJsonStatementList(type),
  };
  if (type.parameterCount !== 0) {
    return {
      parameterList: arrayFromLength(
        type.parameterCount,
        (i): Parameter => ({
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
        })
      ),
      returnType: {
        _: "Function",
        functionType: {
          typeParameterList: [],
          parameterList: [structuredJsonValueType],
          return: collectedDefinyRpcTypeToTsType(type, map),
        },
      },
      statementList: [
        { _: "Return", tsExpr: { _: "Lambda", lambdaExpr: main } },
      ],
      typeParameterList: arrayFromLength(type.parameterCount, (i) =>
        identifierFromString("p" + i)
      ),
    };
  }
  return main;
};

const jsonValueVariable: TsExpr = {
  _: "Variable",
  tsIdentifier: identifierFromString("jsonValue"),
};

const jsonValueVariableType = tsInterface.get(jsonValueVariable, "type");

const jsonValueVariableValue = tsInterface.get(jsonValueVariable, "value");

const typeToFromJsonStatementList = (
  type: CollectedDefinyRpcType
): ReadonlyArray<Statement> => {
  switch (type.body.type) {
    case "unit":
      return [{ _: "Return", tsExpr: { _: "UndefinedLiteral" } }];
    case "number":
      return [
        {
          _: "If",
          ifStatement: {
            condition: tsInterface.equal(jsonValueVariableType, {
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
            condition: tsInterface.equal(jsonValueVariableType, {
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
    case "list":
      return [
        {
          _: "If",
          ifStatement: {
            condition: tsInterface.equal(jsonValueVariableType, {
              _: "StringLiteral",
              string: "array",
            }),
            thenStatementList: [
              {
                _: "Return",
                tsExpr: tsInterface.arrayMap(jsonValueVariableValue, {
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
            condition: tsInterface.equal(jsonValueVariableType, {
              _: "StringLiteral",
              string: "array",
            }),
            thenStatementList: [
              {
                _: "Return",
                tsExpr: tsInterface.newSet(
                  tsInterface.arrayMap(jsonValueVariableValue, {
                    _: "Variable",
                    tsIdentifier: identifierFromString("p0FromJson"),
                  })
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
    case "product":
      return [
        {
          _: "If",
          ifStatement: {
            condition: tsInterface.notEqual(jsonValueVariableType, {
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
          (field): readonly [Statement, Statement] => [
            {
              _: "VariableDefinition",
              variableDefinitionStatement: {
                name: identifierFromString(field.name),
                isConst: true,
                type: {
                  _: "Union",
                  tsTypeList: [structuredJsonValueType, { _: "Undefined" }],
                },
                expr: tsInterface.callMethod(jsonValueVariableValue, "get", [
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
                condition: tsInterface.equal(
                  {
                    _: "Variable",
                    tsIdentifier: identifierFromString(field.name),
                  },
                  { _: "UndefinedLiteral" }
                ),
                thenStatementList: [
                  {
                    _: "ThrowError",
                    tsExpr: {
                      _: "StringLiteral",
                      string: `expected ${field.name} field. in ${type.name}.fromJson`,
                    },
                  },
                ],
              },
            },
          ]
        ),
        {
          _: "Return",
          tsExpr: {
            _: "ObjectLiteral",
            tsMemberList: type.body.fieldList.map(
              (field): TsMember => ({
                _: "KeyValue",
                keyValue: {
                  key: field.name,
                  value: useFromJson(field.type, {
                    _: "Variable",
                    tsIdentifier: identifierFromString(field.name),
                  }),
                },
              })
            ),
          },
        },
      ];
    case "sum":
      return [
        {
          _: "If",
          ifStatement: {
            condition: tsInterface.notEqual(jsonValueVariableType, {
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
      ];
  }
};

/**
 * `型名`.fromJson を使用する
 * @param type 型
 * @param expr JSONの式
 */
export const useFromJson = (
  type: CollectedDefinyRpcTypeUse,
  expr: TsExpr
): TsExpr => {
  return {
    _: "Call",
    callExpr: { expr: getFromJsonFunction(type), parameterList: [expr] },
  };
};

const getFromJsonFunction = (type: CollectedDefinyRpcTypeUse): TsExpr => {
  if (type.parameters.length === 0) {
    return tsInterface.get(
      {
        _: "Variable",
        tsIdentifier: identifierFromString(type.name),
      },
      "fromJson"
    );
  }
  return tsInterface.callMethod(
    {
      _: "Variable",
      tsIdentifier: identifierFromString(type.name),
    },
    "fromJson",
    type.parameters.map(getFromJsonFunction)
  );
};
