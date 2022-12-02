import {
  arrayLiteral,
  data,
  identifierFromString,
  memberKeyValue,
  objectLiteral,
  statementReturn,
  stringLiteral,
  variable,
} from "../../../jsTs/main.ts";
import { arrayFromLength } from "../../../util.ts";
import { CodeGenContext } from "../../core/collectType.ts";
import { DefinyRpcTypeInfo, Namespace, Type } from "../../core/coreType.ts";
import { collectedDefinyRpcTypeUseToTsType } from "../type/use.ts";
import { namespaceToNamespaceExpr } from "../useNamespace.ts";
import { useFrom } from "./use.ts";

export const createTypeLambda = (
  type: DefinyRpcTypeInfo,
  context: CodeGenContext,
): data.LambdaExpr => {
  const typeType = collectedDefinyRpcTypeUseToTsType(
    Type.from({
      namespace: Namespace.coreType,
      name: "Type",
      parameters: [],
    }),
    context,
  );

  return {
    parameterList: arrayFromLength(
      type.parameterCount,
      (index) => ({ name: identifierFromString("p" + index), type: typeType }),
    ),
    returnType: typeType,
    typeParameterList: [],
    statementList: [
      statementReturn(
        useFrom(
          Namespace.coreType,
          "Type",
          context,
          objectLiteral([
            memberKeyValue(
              "namespace",
              namespaceToNamespaceExpr(type.namespace, context),
            ),
            memberKeyValue("name", stringLiteral(type.name)),
            memberKeyValue(
              "parameters",
              arrayLiteral(arrayFromLength(
                type.parameterCount,
                (index) => ({
                  expr: variable(identifierFromString("p" + index)),
                  spread: false,
                }),
              )),
            ),
          ]),
        ),
      ),
    ],
  };
};
