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
  collectedDefinyRpcTypeMapGet,
} from "../../core/collectType.ts";
import { DefinyRpcTypeInfo, Namespace, Type } from "../../core/coreType.ts";
import { namespaceFromAndToToTypeScriptModuleName } from "../namespace.ts";

/**
 * パラメーターは p0, p1 ... というように勝手に指定される
 */
export const collectedDefinyRpcTypeToTsType = (
  collectedDefinyRpcType: DefinyRpcTypeInfo,
  context: CodeGenContext,
): data.TsType => {
  if (
    context.currentModule.type == "coreType" &&
    collectedDefinyRpcType.name === "Type"
  ) {
    const moduleName = namespaceFromAndToToTypeScriptModuleName(
      context.currentModule,
      Namespace.coreType,
    );
    if (moduleName === undefined) {
      return {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString("Type"),
          arguments: [{ _: "unknown" }],
        },
      };
    }
    return {
      _: "ImportedType",
      importedType: {
        moduleName,
        nameAndArguments: {
          name: identifierFromString("Type"),
          arguments: [{ _: "unknown" }],
        },
      },
    };
  }

  const typeDetail = collectedDefinyRpcTypeMapGet(
    context.map,
    collectedDefinyRpcType.namespace,
    collectedDefinyRpcType.name,
  );
  if (typeDetail === undefined) {
    throw new Error(
      "型を集計できなかった " + collectedDefinyRpcType.name +
        " in collectedDefinyRpcTypeToTsType",
    );
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
  type: Type,
  context: CodeGenContext,
): data.TsType => {
  if (type.namespace.type == "maybe") {
    const moduleName = namespaceFromAndToToTypeScriptModuleName(
      context.currentModule,
      Namespace.maybe,
    );
    if (moduleName === undefined) {
      throw new Error("maybe はコード生成できない");
    }
    return {
      _: "ImportedType",
      importedType: {
        moduleName,
        nameAndArguments: {
          name: identifierFromString(type.name),
          arguments: type.parameters.map((p) =>
            collectedDefinyRpcTypeUseToTsType(p, context)
          ),
        },
      },
    };
  }
  if (type.namespace.type == "coreType" && type.name === "Type") {
    const moduleName = namespaceFromAndToToTypeScriptModuleName(
      context.currentModule,
      Namespace.coreType,
    );
    if (moduleName === undefined) {
      return {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString(type.name),
          arguments: [{ _: "unknown" }],
        },
      };
    }
    return {
      _: "ImportedType",
      importedType: {
        moduleName,
        nameAndArguments: {
          name: identifierFromString(type.name),
          arguments: [{ _: "unknown" }],
        },
      },
    };
  }

  const typeDetail = collectedDefinyRpcTypeMapGet(
    context.map,
    type.namespace,
    type.name,
  );
  if (typeDetail === undefined) {
    throw new Error(
      "型を集計できなかった " + type.name + " in collectedDefinyRpcTypeUseToTsType",
    );
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
