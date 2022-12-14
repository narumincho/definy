import { TsType } from "../../../jsTs/data.ts";
import {
  data,
  identifierFromString,
  readonlyArrayType,
  readonlyMapType,
  readonlySetType,
  urlType,
} from "../../../jsTs/main.ts";
import {
  CodeGenContext,
  collectedDefinyRpcTypeMapGet,
} from "../../core/collectType.ts";
import {
  DefinyRpcTypeInfo,
  Namespace,
  Type,
  TypeAttribute,
} from "../../core/coreType.ts";
import { namespaceFromAndToToTypeScriptModuleName } from "../namespace.ts";

/**
 * パラメーターは p0, p1 ... というように勝手に指定される
 */
export const collectedDefinyRpcTypeToTsType = (
  typeInfo: DefinyRpcTypeInfo,
  context: CodeGenContext,
): data.TsType => {
  if (
    typeInfo.attribute.type === "just" &&
    typeInfo.attribute.value.type === TypeAttribute.asType.type
  ) {
    const moduleName = namespaceFromAndToToTypeScriptModuleName(
      context.currentModule,
      Namespace.coreType,
    );
    if (moduleName === undefined) {
      return {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString(typeInfo.name),
          arguments: [{ _: "unknown" }],
        },
      };
    }
    return {
      _: "ImportedType",
      importedType: {
        moduleName,
        nameAndArguments: {
          name: identifierFromString(typeInfo.name),
          arguments: [{ _: "unknown" }],
        },
      },
    };
  }

  const typeDetail = collectedDefinyRpcTypeMapGet(
    context.map,
    typeInfo.namespace,
    typeInfo.name,
  );
  if (typeDetail === undefined) {
    throw new Error(
      "型を集計できなかった " + typeInfo.name +
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
    case "list": {
      const elementType = typeDetail.parameter[0];
      if (elementType === undefined) {
        throw new Error("list には 1つの型パラメータが必要です");
      }
      return readonlyArrayType({
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString(elementType.name),
          arguments: [],
        },
      });
    }
    case "set": {
      const elementType = typeDetail.parameter[0];
      if (elementType === undefined) {
        throw new Error("set には 1つの型パラメータが必要です");
      }
      return readonlySetType({
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString(elementType.name),
          arguments: [],
        },
      });
    }
    case "map": {
      const [keyType, valueType] = typeDetail.parameter;
      if (keyType === undefined || valueType === undefined) {
        throw new Error("map には 2つの型パラメータが必要です");
      }
      return readonlyMapType({
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString(keyType.name),
          arguments: [],
        },
      }, {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString(valueType.name),
          arguments: [],
        },
      });
    }
    case "product":
    case "sum": {
      const moduleName = namespaceFromAndToToTypeScriptModuleName(
        context.currentModule,
        typeInfo.namespace,
      );
      if (moduleName === undefined) {
        return {
          _: "ScopeInFile",
          typeNameAndTypeParameter: {
            name: identifierFromString(typeInfo.name),
            arguments: typeInfo.parameter.map(
              (parameter) => ({
                _: "ScopeInFile",
                typeNameAndTypeParameter: {
                  name: identifierFromString(parameter.name),
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
            name: identifierFromString(typeInfo.name),
            arguments: typeInfo.parameter.map(
              (parameter) => ({
                _: "ScopeInFile",
                typeNameAndTypeParameter: {
                  name: identifierFromString(parameter.name),
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
  type: Type<unknown>,
  context: CodeGenContext,
): data.TsType => {
  if (type.name[0]?.toLocaleLowerCase() === type.name[0]) {
    return useType(type, context);
  }

  const typeInfo = collectedDefinyRpcTypeMapGet(
    context.map,
    type.namespace,
    type.name,
  );
  if (typeInfo === undefined) {
    throw new Error(
      "型を集計できなかった " + type.name + " in collectedDefinyRpcTypeUseToTsType",
    );
  }
  if (
    typeInfo.attribute.type === "just" &&
    typeInfo.attribute.value.type === TypeAttribute.asType.type
  ) {
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

  switch (typeInfo.body.type) {
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
    case "sum":
      return useType(type, context);

    case "url":
      return urlType;
  }
};

const useType = <T>(type: Type<T>, context: CodeGenContext): TsType => {
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
};

export const typeVariableMemberName = "__typeVariable";
