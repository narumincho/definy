import {
  data,
  get,
  identifierFromString,
  memberKeyValue,
  objectLiteral,
  stringLiteral,
  symbolToStringTag,
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
          arguments: [collectedDefinyRpcTypeToTsType(type, context), {
            _: "typeof",
            expr: symbolToStringTag,
          }],
        },
      },
    }],
    returnType: collectedDefinyRpcTypeToTsType(type, context),
    statementList: typeToFromLambdaProductStatement(
      type,
      fieldList,
    ),
    typeParameterList: [],
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
