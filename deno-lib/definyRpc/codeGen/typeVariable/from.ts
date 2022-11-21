import {
  data,
  get,
  identifierFromString,
  objectLiteral,
  typeAssertion,
  variable,
} from "../../../jsTs/main.ts";
import {
  CodeGenContext,
  CollectedDefinyRpcType,
  Field,
} from "../../core/collectType.ts";
import { collectedDefinyRpcTypeToTsType } from "../type/use.ts";

export const createFromLambda = (
  type: CollectedDefinyRpcType,
  context: CodeGenContext,
):
  | data.LambdaExpr
  | undefined => {
  if (type.body.type !== "product") {
    return undefined;
  }
  return typeToFromLambda(type, type.body.fieldList, context);
};

const typeToFromLambda = (
  type: CollectedDefinyRpcType,
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
          arguments: [collectedDefinyRpcTypeToTsType(type, context), {
            _: "StringLiteral",
            string: blandMemberName(type.name),
          }],
        },
      },
    }],
    returnType: collectedDefinyRpcTypeToTsType(type, context),
    statementList: typeToFromLambdaProductStatement(
      type,
      fieldList,
      context,
    ),
    typeParameterList: [],
  };
};

const typeToFromLambdaProductStatement = (
  type: CollectedDefinyRpcType,
  fieldList: ReadonlyArray<Field>,
  context: CodeGenContext,
): ReadonlyArray<data.Statement> => {
  return [
    {
      _: "Return",
      tsExpr: typeAssertion({
        expr: objectLiteral(fieldList.map((field) => ({
          _: "KeyValue",
          keyValue: {
            key: field.name,
            value: get(
              variable(identifierFromString("obj")),
              field.name,
            ),
          },
        }))),
        type: collectedDefinyRpcTypeToTsType(type, context),
      }),
    },
  ];
};

export const blandMemberName = (typeName: string): string => {
  return "__" + typeName + "Bland";
};
