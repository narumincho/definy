import { data, identifierFromString, variable } from "../../jsTs/main.ts";
import { CodeGenContext } from "../core/collectType.ts";
import { namespaceFromAndToToTypeScriptModuleName } from "./namespace.ts";

export const structuredJsonValueType = (
  context: CodeGenContext,
): data.TsType => {
  const moduleName = namespaceFromAndToToTypeScriptModuleName(
    context.currentModule,
    {
      type: "typedJson",
    },
  );
  if (moduleName === undefined) {
    return {
      _: "ScopeInGlobal",
      typeNameAndTypeParameter: {
        name: identifierFromString("StructuredJsonValue"),
        arguments: [],
      },
    };
  }
  return {
    _: "ImportedType",
    importedType: {
      moduleName: moduleName,
      nameAndArguments: {
        name: identifierFromString("StructuredJsonValue"),
        arguments: [],
      },
    },
  };
};

export const rawJsonValueType = (
  context: CodeGenContext,
): data.TsType => {
  const moduleName = namespaceFromAndToToTypeScriptModuleName(
    context.currentModule,
    {
      type: "typedJson",
    },
  );
  if (moduleName === undefined) {
    return {
      _: "ScopeInGlobal",
      typeNameAndTypeParameter: {
        name: identifierFromString("RawJsonValue"),
        arguments: [],
      },
    };
  }
  return {
    _: "ImportedType",
    importedType: {
      moduleName,
      nameAndArguments: {
        name: identifierFromString("RawJsonValue"),
        arguments: [],
      },
    },
  };
};

export const useRawJsonToStructuredJsonValue = (
  rawJsonExpr: data.TsExpr,
  context: CodeGenContext,
): data.TsExpr => {
  const moduleName = namespaceFromAndToToTypeScriptModuleName(
    context.currentModule,
    {
      type: "typedJson",
    },
  );
  if (moduleName === undefined) {
    return {
      _: "Call",
      callExpr: {
        expr: variable(identifierFromString("rawJsonToStructuredJsonValue")),
        parameterList: [rawJsonExpr],
      },
    };
  }
  return {
    _: "Call",
    callExpr: {
      expr: {
        _: "ImportedVariable",
        importedVariable: {
          moduleName: moduleName,
          name: identifierFromString("rawJsonToStructuredJsonValue"),
        },
      },
      parameterList: [rawJsonExpr],
    },
  };
};
