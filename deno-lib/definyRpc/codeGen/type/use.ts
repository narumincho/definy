import {
  data,
  identifierFromString,
  readonlyArrayType,
  readonlyMapType,
  readonlySetType,
  urlType,
} from "../../../jsTs/main.ts";
import { arrayFromLength } from "../../../util.ts";
import {
  CodeGenContext,
  CollectedDefinyRpcType,
  collectedDefinyRpcTypeMapGet,
  CollectedDefinyRpcTypeUse,
} from "../../core/collectType.ts";
import { namespaceFromAndToToTypeScriptModuleName } from "../namespace.ts";

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
    case "map":
      return readonlyMapType({
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString("p0"),
          arguments: [],
        },
      }, {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString("p1"),
          arguments: [],
        },
      });
    case "product":
    case "sum": {
      const moduleName = namespaceFromAndToToTypeScriptModuleName(
        context.currentModule,
        collectedDefinyRpcType.namespace,
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
    case "url":
      return urlType;
  }
};

export const collectedDefinyRpcTypeUseToTsType = (
  type: CollectedDefinyRpcTypeUse,
  context: CodeGenContext,
): data.TsType => {
  const typeDetail = collectedDefinyRpcTypeMapGet(
    context.map,
    type.namespace,
    type.name,
  );
  if (typeDetail === undefined) {
    throw new Error("型を集計できなかった " + type.name);
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
    case "list": {
      const parameter = type.parameters[0];
      if (parameter === undefined) {
        throw new Error("listには型パラメーターを指定する必要があります");
      }
      return readonlyArrayType(collectedDefinyRpcTypeUseToTsType(
        parameter,
        context,
      ));
    }
    case "set": {
      const parameter = type.parameters[0];
      if (parameter === undefined) {
        throw new Error("setには型パラメーターを指定する必要があります");
      }
      return readonlySetType(collectedDefinyRpcTypeUseToTsType(
        parameter,
        context,
      ));
    }
    case "map": {
      const key = type.parameters[0];
      const value = type.parameters[1];
      if (key === undefined || value === undefined) {
        throw new Error("Mapには型パラメーターを2つ指定する必要があります");
      }
      return readonlyMapType(
        collectedDefinyRpcTypeUseToTsType(
          key,
          context,
        ),
        collectedDefinyRpcTypeUseToTsType(
          value,
          context,
        ),
      );
    }
    case "product":
    case "sum": {
      const moduleName = namespaceFromAndToToTypeScriptModuleName(
        context.currentModule,
        type.namespace,
      );
      if (moduleName === undefined) {
        return {
          _: "ScopeInFile",
          typeNameAndTypeParameter: {
            name: identifierFromString(type.name),
            arguments: type.parameters.map((parameter) =>
              collectedDefinyRpcTypeUseToTsType(parameter, context)
            ),
          },
        };
      }
      return {
        _: "ImportedType",
        importedType: {
          moduleName: moduleName,
          nameAndArguments: {
            name: identifierFromString(type.name),
            arguments: type.parameters.map((parameter) =>
              collectedDefinyRpcTypeUseToTsType(parameter, context)
            ),
          },
        },
      };
    }
    case "url":
      return urlType;
  }
};
