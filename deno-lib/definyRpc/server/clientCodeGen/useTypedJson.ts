import { identifierFromString, data } from "../../../jsTs/main.ts";

const runtimeModuleName =
  "https://raw.githubusercontent.com/narumincho/definy/4983eef4d98387d8843f4085f799ad22aee5993c/deno-lib/typedJson.ts";

export const structuredJsonValueType: data.TsType = {
  _: "ImportedType",
  importedType: {
    moduleName: runtimeModuleName,
    nameAndArguments: {
      name: identifierFromString("StructuredJsonValue"),
      arguments: [],
    },
  },
};

export const rawJsonValueType: data.TsType = {
  _: "ImportedType",
  importedType: {
    moduleName: runtimeModuleName,
    nameAndArguments: {
      name: identifierFromString("RawJsonValue"),
      arguments: [],
    },
  },
};

export const useRawJsonToStructuredJsonValue = (
  rawJsonExpr: data.TsExpr
): data.TsExpr => ({
  _: "Call",
  callExpr: {
    expr: {
      _: "ImportedVariable",
      importedVariable: {
        moduleName: runtimeModuleName,
        name: identifierFromString("rawJsonToStructuredJsonValue"),
      },
    },
    parameterList: [rawJsonExpr],
  },
});
