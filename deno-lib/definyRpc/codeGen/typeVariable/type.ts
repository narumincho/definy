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
  const typeWithParameters: data.TsType = type.attribute.type === "just" &&
      type.attribute.value.type === "asType"
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
    parameterList: type.attribute.type === "just" &&
        type.attribute.value.type === "asType"
      ? []
      : type.parameter.map((parameter) => {
        return {
          name: identifierFromString(parameter.name),
          type: typeModuleName === undefined
            ? {
              _: "ScopeInFile",
              typeNameAndTypeParameter: {
                name: identifierFromString("Type"),
                arguments: [{
                  _: "ScopeInFile",
                  typeNameAndTypeParameter: {
                    name: identifierFromString(parameter.name),
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
                      name: identifierFromString(parameter.name),
                      arguments: [],
                    },
                  }],
                },
              },
            },
        };
      }),

    returnType: returnType,
    typeParameterList:
      context.currentModule.type === "coreType" && type.name === "Type"
        ? []
        : type.parameter.map((parameter) =>
          identifierFromString(parameter.name)
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
              arrayLiteral(
                type.parameter.map((parameter) => ({
                  expr: variable(identifierFromString(parameter.name)),
                  spread: false,
                })),
              ),
            ),
          ]),
        ),
      ),
    ],
  };
};
