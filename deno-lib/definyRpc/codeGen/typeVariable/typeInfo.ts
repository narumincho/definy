import {
  arrayLiteral,
  callMethod,
  memberKeyValue,
  numberLiteral,
  objectLiteral,
  statementReturn,
  stringLiteral,
} from "../../../jsTs/interface.ts";
import { data } from "../../../jsTs/main.ts";
import { CodeGenContext } from "../../core/collectType.ts";
import { DefinyRpcTypeInfo, Namespace, Type } from "../../core/coreType.ts";
import { collectedDefinyRpcTypeUseToTsType } from "../type/use.ts";
import { typeToTypeExpr, useFrom, useTag } from "./use.ts";
import { namespaceToNamespaceExpr } from "../useNamespace.ts";
import { just, nothing } from "../useMaybe.ts";

export const createTypeInfo = (
  type: DefinyRpcTypeInfo,
  context: CodeGenContext,
): data.LambdaExpr => {
  return {
    parameterList: [],
    returnType: collectedDefinyRpcTypeUseToTsType(
      Type.from({
        namespace: Namespace.coreType,
        name: "DefinyRpcTypeInfo",
        parameters: [],
      }),
      context,
    ),
    typeParameterList: [],
    statementList: [statementReturn(useFrom(
      Namespace.coreType,
      "DefinyRpcTypeInfo",
      context,
      objectLiteral([
        memberKeyValue(
          "namespace",
          namespaceToNamespaceExpr(
            type.namespace,
            context,
          ),
        ),
        memberKeyValue("name", stringLiteral(type.name)),
        memberKeyValue("description", stringLiteral(type.description)),
        memberKeyValue("parameterCount", numberLiteral(type.parameterCount)),
        memberKeyValue(
          "body",
          useTag(
            Namespace.coreType,
            "TypeBody",
            context,
            type.body.type,
            type.body.type === "sum"
              ? arrayLiteral(
                type.body.value.map((pattern) => ({
                  expr: useFrom(
                    Namespace.coreType,
                    "Pattern",
                    context,
                    objectLiteral([
                      memberKeyValue("name", stringLiteral(pattern.name)),
                      memberKeyValue(
                        "description",
                        stringLiteral(pattern.description),
                      ),
                      memberKeyValue(
                        "parameter",
                        pattern.parameter.type === "just"
                          ? just(
                            typeToTypeExpr(pattern.parameter.value, context),
                          )
                          : nothing,
                      ),
                    ]),
                  ),
                  spread: false,
                })),
              )
              : type.body.type === "product"
              ? arrayLiteral(
                type.body.value.map((field) => ({
                  expr: useFrom(
                    Namespace.coreType,
                    "Field",
                    context,
                    objectLiteral([
                      memberKeyValue("name", stringLiteral(field.name)),
                      memberKeyValue(
                        "description",
                        stringLiteral(field.description),
                      ),
                      memberKeyValue(
                        "type",
                        typeToTypeExpr(field.type, context),
                      ),
                    ]),
                  ),
                  spread: false,
                })),
              )
              : undefined,
          ),
        ),
      ]),
    ))],
  };
};
