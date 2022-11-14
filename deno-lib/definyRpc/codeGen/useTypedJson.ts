import { data, identifierFromString } from "../../jsTs/main.ts";

const runtimeModuleName =
  "https://raw.githubusercontent.com/narumincho/definy/61351534fba3e0549319fe11feee7c3dc823d7c1/deno-lib/typedJson.ts";

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
  rawJsonExpr: data.TsExpr,
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
