import {
  data,
  get,
  identifierFromString,
  memberKeyValue,
  objectLiteral,
  stringLiteral,
  symbolToStringTag,
  typeAssertion,
  variable,
} from "../../../jsTs/main.ts";
import { CodeGenContext } from "../../core/collectType.ts";
import { DefinyRpcTypeInfo, Field, Namespace } from "../../core/coreType.ts";
import { namespaceToString } from "../namespace.ts";
import { collectedDefinyRpcTypeToTsType } from "../type/use.ts";

export const createFromLambda = (
  type: DefinyRpcTypeInfo,
  context: CodeGenContext,
):
  | data.LambdaExpr
  | undefined => {
  if (type.body.type !== "product") {
    return undefined;
  }
  return typeToFromLambda(type, type.body.value, context);
};

const typeToFromLambda = (
  type: DefinyRpcTypeInfo,
  fieldList: ReadonlyArray<Field>,
  context: CodeGenContext,
): data.LambdaExpr => {
  return {
    parameterList: [{
      name: identifierFromString("obj"),
      type: {
        _: "ScopeInGlobal",
        typeNameAndTypeParameter: {
          name: identifierFromString("Omit"),
          arguments: type.namespace.type == "coreType" && type.name === "Type"
            ? [{
              _: "ScopeInFile",
              typeNameAndTypeParameter: {
                name: identifierFromString("Type"),
                arguments: [{
                  _: "ScopeInFile",
                  typeNameAndTypeParameter: {
                    name: identifierFromString("p0"),
                    arguments: [],
                  },
                }],
              },
            }, {
              _: "Union",
              tsTypeList: [{
                _: "typeof",
                expr: variable(identifierFromString("neverSymbol")),
              }, {
                _: "typeof",
                expr: symbolToStringTag,
              }],
            }]
            : [collectedDefinyRpcTypeToTsType(type, context), {
              _: "typeof",
              expr: symbolToStringTag,
            }],
        },
      },
    }],
    returnType: type.namespace.type == "coreType" && type.name === "Type"
      ? {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString("Type"),
          arguments: [{
            _: "ScopeInFile",
            typeNameAndTypeParameter: {
              name: identifierFromString("p0"),
              arguments: [],
            },
          }],
        },
      }
      : collectedDefinyRpcTypeToTsType(type, context),
    statementList: typeToFromLambdaProductStatement(
      type,
      fieldList,
    ),
    typeParameterList: type.namespace.type == "coreType" && type.name === "Type"
      ? [identifierFromString("p0")]
      : [],
  };
};

const typeToFromLambdaProductStatement = (
  type: DefinyRpcTypeInfo,
  fieldList: ReadonlyArray<Field>,
): ReadonlyArray<data.Statement> => {
  return [
    {
      _: "Return",
      tsExpr: objectLiteral([
        ...fieldList.map((field) =>
          memberKeyValue(
            field.name,
            get(
              variable(identifierFromString("obj")),
              field.name,
            ),
          )
        ),
        {
          _: "KeyValue",
          keyValue: {
            key: symbolToStringTag,
            value: stringLiteral(
              symbolToStringTagAndTypeName(type.namespace, type.name),
            ),
          },
        },
        ...(type.namespace.type == "coreType" && type.name === "Type"
          ? [
            {
              _: "KeyValue",
              keyValue: {
                key: variable(identifierFromString("neverSymbol")),
                value: typeAssertion({
                  expr: objectLiteral([]),
                  type: {
                    _: "ScopeInFile",
                    typeNameAndTypeParameter: {
                      name: identifierFromString("p0"),
                      arguments: [],
                    },
                  },
                }),
              },
            } as const,
          ]
          : []),
      ]),
    },
  ];
};

export const symbolToStringTagAndTypeName = (
  namespace: Namespace,
  typeName: string,
): string => {
  return namespaceToString(namespace) + "." + typeName;
};
