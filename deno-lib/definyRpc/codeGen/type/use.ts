import {
  data,
  identifierFromString,
  readonlyArrayType,
  readonlyMapType,
  readonlySetType,
} from "../../../jsTs/main.ts";
import { arrayFromLength } from "../../../util.ts";
import {
  CodeGenContext,
  CollectedDefinyRpcType,
  collectedDefinyRpcTypeMapGet,
} from "../../core/collectType.ts";
import {
  namespaceRelative,
  relativeNamespaceToTypeScriptModuleName,
} from "../namespace.ts";

/**
 * パラメーターは p0, p1 ... というように勝手に指定される
 */
export const collectedDefinyRpcTypeToTsType = (
  collectedDefinyRpcType: CollectedDefinyRpcType,
  context: CodeGenContext,
): data.TsType => {
  const typeDetail = collectedDefinyRpcTypeMapGet(
    context.map,
    collectedDefinyRpcType.namespace,
    collectedDefinyRpcType.name,
  );
  if (typeDetail === undefined) {
    throw new Error("型を集計できなかった " + collectedDefinyRpcType.name);
  }
  switch (typeDetail.body.type) {
    case "string":
      return { _: "String" };
    case "number":
      return { _: "Number" };
    case "boolean":
      return { _: "Boolean" };
    case "unit":
      return { _: "Undefined" };
    case "list":
      return readonlyArrayType({
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString("p0"),
          arguments: [],
        },
      });
    case "set":
      return readonlySetType({
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString("p0"),
          arguments: [],
        },
      });
    case "stringMap":
      return readonlyMapType({
        _: "String",
      }, {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString("p0"),
          arguments: [],
        },
      });
    case "product":
    case "sum": {
      const moduleName = relativeNamespaceToTypeScriptModuleName(
        namespaceRelative(
          context.currentModule,
          collectedDefinyRpcType.namespace,
        ),
      );
      if (moduleName === undefined) {
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
              }),
            ),
          },
        };
      }
      return {
        _: "ImportedType",
        importedType: {
          moduleName: moduleName,
          nameAndArguments: {
            name: identifierFromString(collectedDefinyRpcType.name),
            arguments: arrayFromLength(
              collectedDefinyRpcType.parameterCount,
              (i) => ({
                _: "ScopeInFile",
                typeNameAndTypeParameter: {
                  name: identifierFromString("p" + i),
                  arguments: [],
                },
              }),
            ),
          },
        },
      };
    }
  }
};
