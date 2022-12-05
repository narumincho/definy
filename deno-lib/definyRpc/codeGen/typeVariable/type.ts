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
import { DefinyRpcTypeInfo, Namespace } from "../../core/coreType.ts";
import { namespaceFromAndToToTypeScriptModuleName } from "../namespace.ts";
import { collectedDefinyRpcTypeToTsType } from "../type/use.ts";
import { namespaceToNamespaceExpr } from "../useNamespace.ts";
import { useFrom } from "./use.ts";

export const createTypeLambda = (
  type: DefinyRpcTypeInfo,
  context: CodeGenContext,
): data.LambdaExpr => {
  const typeWithParameters: data.TsType =
    context.currentModule.type === "coreType" && type.name === "Type"
      ? {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString("Type"),
          arguments: [{ _: "unknown" }],
        },
      }
      : collectedDefinyRpcTypeToTsType(
        type,
        context,
      );
  const typeModuleName = namespaceFromAndToToTypeScriptModuleName(
    context.currentModule,
    Namespace.coreType,
  );
  const returnType: data.TsType = typeModuleName === undefined
    ? {
      _: "ScopeInFile",
      typeNameAndTypeParameter: {
        name: identifierFromString("Type"),
        arguments: [typeWithParameters],
      },
    }
    : {
      _: "ImportedType",
      importedType: {
        moduleName: typeModuleName,
        nameAndArguments: {
          name: identifierFromString("Type"),
          arguments: [typeWithParameters],
        },
      },
    };

  return {
    parameterList:
      context.currentModule.type === "coreType" && type.name === "Type"
        ? []
        : arrayFromLength(
          type.parameterCount,
          (index): data.Parameter => {
            return {
              name: identifierFromString("p" + index),
              type: typeModuleName === undefined
                ? {
                  _: "ScopeInFile",
                  typeNameAndTypeParameter: {
                    name: identifierFromString("Type"),
                    arguments: [{
                      _: "ScopeInFile",
                      typeNameAndTypeParameter: {
                        name: identifierFromString("p" + index),
                        arguments: [],
                      },
                    }],
                  },
                }
                : {
                  _: "ImportedType",
                  importedType: {
                    moduleName: typeModuleName,
                    nameAndArguments: {
                      name: identifierFromString("Type"),
                      arguments: [{
                        _: "ScopeInFile",
                        typeNameAndTypeParameter: {
                          name: identifierFromString("p" + index),
                          arguments: [],
                        },
                      }],
                    },
                  },
                },
            };
          },
        ),
    returnType: returnType,
    typeParameterList:
      context.currentModule.type === "coreType" && type.name === "Type"
        ? []
        : arrayFromLength(
          type.parameterCount,
          (index) => identifierFromString("p" + index),
        ),
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
