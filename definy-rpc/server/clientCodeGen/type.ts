import { identifierFromString } from "../jsTs/identifier.ts";
import {
  LambdaExpr,
  Parameter,
  Statement,
  TsExpr,
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

const runtimeModuleName = "./runtime";

const structuredJsonValueType: TsType = {
  _: "ImportedType",
  importedType: {
    moduleName: runtimeModuleName,
    nameAndArguments: {
      name: identifierFromString("StructuredJsonValue"),
      arguments: [],
    },
  },
};

export const typeToTypeVariable = (
  type: CollectedDefinyRpcType,
  map: CollectedDefinyRpcTypeMap
): Variable => {
  return {
    name: identifierFromString(type.name),
    document: type.description,
    type: { _: "unknown" },
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
    statementList: typeToFromJsonStatementList(type, map),
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

const typeToFromJsonStatementList = (
  type: CollectedDefinyRpcType,
  map: CollectedDefinyRpcTypeMap
): ReadonlyArray<Statement> => {
  const jsonValueVariable: TsExpr = {
    _: "Variable",
    tsIdentifier: identifierFromString("jsonValue"),
  };
  switch (type.body.type) {
    case "unit":
      return [{ _: "Return", tsExpr: { _: "UndefinedLiteral" } }];
    case "number":
      return [
        {
          _: "If",
          ifStatement: {
            condition: tsInterface.equal(
              tsInterface.get(jsonValueVariable, "type"),
              { _: "StringLiteral", string: "number" }
            ),
            thenStatementList: [
              {
                _: "Return",
                tsExpr: tsInterface.get(jsonValueVariable, "value"),
              },
            ],
          },
        },
        {
          _: "ThrowError",
          tsExpr: {
            _: "StringLiteral",
            string: "expected number in Number json parse",
          },
        },
      ];
    case "string":
      return [
        {
          _: "If",
          ifStatement: {
            condition: tsInterface.equal(
              tsInterface.get(jsonValueVariable, "type"),
              { _: "StringLiteral", string: "string" }
            ),
            thenStatementList: [
              {
                _: "Return",
                tsExpr: tsInterface.get(jsonValueVariable, "value"),
              },
            ],
          },
        },
        {
          _: "ThrowError",
          tsExpr: {
            _: "StringLiteral",
            string: "expected string in String json parse",
          },
        },
      ];
    case "list":
      return [
        {
          _: "If",
          ifStatement: {
            condition: tsInterface.equal(
              tsInterface.get(jsonValueVariable, "type"),
              { _: "StringLiteral", string: "array" }
            ),
            thenStatementList: [
              {
                _: "Return",
                tsExpr: tsInterface.arrayMap(
                  tsInterface.get(jsonValueVariable, "value"),
                  {
                    _: "Variable",
                    tsIdentifier: identifierFromString("p0FromJson"),
                  }
                ),
              },
            ],
          },
        },
        {
          _: "ThrowError",
          tsExpr: {
            _: "StringLiteral",
            string: "expected array in List json parse",
          },
        },
      ];
    case "set":
      return [
        {
          _: "If",
          ifStatement: {
            condition: tsInterface.equal(
              tsInterface.get(jsonValueVariable, "type"),
              { _: "StringLiteral", string: "array" }
            ),
            thenStatementList: [
              {
                _: "Return",
                tsExpr: tsInterface.newSet(
                  tsInterface.arrayMap(
                    tsInterface.get(jsonValueVariable, "value"),
                    {
                      _: "Variable",
                      tsIdentifier: identifierFromString("p0FromJson"),
                    }
                  )
                ),
              },
            ],
          },
        },
        {
          _: "ThrowError",
          tsExpr: {
            _: "StringLiteral",
            string: "expected array in Set json parse",
          },
        },
      ];
  }
  return [];
};
